const express = require('express');
const mongoose = require('mongoose');
const crypto = require('crypto');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const User = require('../models/User');
const JobApplication = require('../models/JobApplication');
const CareerAssessment = require('../models/CareerAssessment');
const CareerAssessmentSession = require('../models/CareerAssessmentSession');
const CareerRoadmap = require('../models/CareerRoadmap');
const DailyPlan = require('../models/DailyPlan');
const DailyPlanGenerationLock = require('../models/DailyPlanGenerationLock');
const Interview = require('../models/Interview');
const CodeSubmission = require('../models/CodeSubmission');
const CodingProblem = require('../models/CodingProblem');
const CareerConversation = require('../models/CareerConversation');
const SkillGapAnalysis = require('../models/SkillGapAnalysis');
const ResumeAnalysis = require('../models/ResumeAnalysis');
const JobDescriptionAnalysis = require('../models/JobDescriptionAnalysis');
const {
    fetchLiveJobs,
    calculateJobMatch,
    safeHttpsUrl,
    ARBEITNOW_SOURCE
} = require('../utils/jobProvider');
const {
    chatCareerAssistant,
    getCareerAssistantStatus,
    getGeminiConfiguration,
    getGroqConfiguration,
    getOpenRouterConfiguration,
    getCuratedAssessmentOptions,
    evaluateAssessmentQuestionSet,
    ASSESSMENT_TOPICS,
    generateAssessmentInsights,
    generateMcqQuestions,
    generateSkillGapAdvice,
    generateJobDescriptionAdvice,
    getApprovedDataProcessingStatus,
    generateCareerRecommendationAdvice,
    recommendLearningResources,
    explainJobFit
} = require('../utils/aiService');
const { validateProfileUpdate } = require('../utils/profileValidation');
const { resolveTargetRole, targetRoleRequiredResponse } = require('../utils/roleResolution');
const { providerErrorMessage } = require('../utils/providerErrors');
const { getOrGenerateDailyPlan } = require('../utils/dailyPlanGeneration');
const {
    analyzeJobDescriptionLocally,
    buildDailyPreparationTasks,
    buildCareerRoadmapLocally
} = require('../utils/localCareerAnalysis');

const APPLICATION_STATUSES = [
    'Saved', 'Application Started', 'Applied', 'Shortlisted',
    'Assessment', 'Interview', 'Final Round', 'Offer',
    'Rejected', 'Withdrawn', 'Selected'
];

const ASSESSMENT_CATEGORIES = ['Mixed', ...ASSESSMENT_TOPICS];
const SUPPORTED_AI_PROVIDERS = new Set(['openrouter', 'gemini', 'groq']);
const ASSISTANT_CODING_EVIDENCE_MIN_ATTEMPTS = 3;
const roadmapGenerationInFlight = new Map();
const dailyPlanGenerationInFlight = new Map();
const assessmentGenerationInFlight = new Map();
const skillGapAdviceInFlight = new Map();

async function runDeduplicated(inFlight, key, operation) {
    if (inFlight.has(key)) return inFlight.get(key);
    const pending = Promise.resolve().then(operation);
    inFlight.set(key, pending);
    try {
        return await pending;
    } finally {
        if (inFlight.get(key) === pending) inFlight.delete(key);
    }
}

function getAssessmentProviderStatus() {
    const feature = 'assessment_question_generation';
    const configuredProvider = process.env.AI_PROVIDER?.trim().toLowerCase() || 'openrouter';
    if (configuredProvider === 'gemini') {
        const configuration = getGeminiConfiguration(feature);
        return {
            provider: 'Gemini',
            model: configuration.model,
            configured: configuration.primaryConfigured,
            reason: configuration.configurationIssue,
            requiredConfiguration: configuration.requiredConfiguration
        };
    }

    const groq = getGroqConfiguration(feature);
    if (groq.primaryEnabled) {
        return {
            provider: 'Groq',
            model: groq.model,
            configured: groq.primaryConfigured,
            reason: !groq.apiKeyConfigured || !groq.model
                ? 'provider_configuration_missing'
                : null,
            requiredConfiguration: ['GROQ_API_KEY', 'GROQ_MODEL', 'GROQ_PRIMARY_FEATURES']
        };
    }

    const openRouter = getOpenRouterConfiguration(feature);
    return {
        provider: openRouter.providerSupported ? 'OpenRouter' : null,
        model: openRouter.model,
        configured: openRouter.providerSupported && openRouter.apiKeyConfigured,
        reason: !openRouter.providerSupported || !openRouter.apiKeyConfigured
            ? 'provider_configuration_missing'
            : null,
        requiredConfiguration: openRouter.requiredConfiguration
    };
}

function normalizeMilestoneTitle(value) {
    return String(value || '').trim().toLocaleLowerCase().replace(/\s+/g, ' ');
}

async function generateAndSaveRoadmap({ user, userId, targetRole, previousRoadmap = null }) {
    const key = `${String(userId)}:${targetRole}`;
    if (roadmapGenerationInFlight.has(key)) return roadmapGenerationInFlight.get(key);

    const generation = (async () => {
        const [latestAssessment, latestSkillGap] = await Promise.all([
            CareerAssessment.findOne({ userId: String(userId) }).sort({ date: -1 }).select('scores'),
            SkillGapAnalysis.findOne({ userId: String(userId) }).sort({ generatedAt: -1 }).select('missingSkills')
        ]);
        const generated = buildCareerRoadmapLocally({
            profile: user?.toObject?.() || user || {},
            targetRole,
            assessmentScores: latestAssessment?.scores || null,
            missingSkills: (latestSkillGap?.missingSkills || []).map(item =>
                typeof item === 'string' ? item : item.skill).filter(Boolean)
        });

        const completedByTitle = new Map();
        const completedMilestones = [];
        for (const phase of previousRoadmap?.phases || []) {
            for (const milestone of phase.milestones || []) {
                if (!milestone.completed) continue;
                const titleKey = normalizeMilestoneTitle(milestone.title);
                if (titleKey) completedByTitle.set(titleKey, milestone);
                completedMilestones.push({ phaseNumber: phase.phaseNumber, milestone });
            }
        }

        const phases = generated.phases.map((phase, phaseIndex) => ({
            ...phase,
            phaseNumber: phaseIndex + 1,
            status: 'pending',
            milestones: phase.milestones.map((milestone, milestoneIndex) => ({
                ...milestone,
                id: `local-p${phaseIndex + 1}-m${milestoneIndex + 1}`,
                completed: completedByTitle.has(normalizeMilestoneTitle(milestone.title))
            }))
        }));
        const generatedTitles = new Set(phases.flatMap(phase =>
            phase.milestones.map(milestone => normalizeMilestoneTitle(milestone.title))));
        for (const { phaseNumber, milestone } of completedMilestones) {
            if (generatedTitles.has(normalizeMilestoneTitle(milestone.title))) continue;
            const phase = phases.find(item => item.phaseNumber === phaseNumber) || phases[phases.length - 1];
            if (!phase) continue;
            phase.milestones.push({
                id: `preserved-${String(milestone.id || phase.milestones.length).slice(0, 100)}`,
                title: milestone.title,
                completionCriteria: milestone.completionCriteria,
                estimatedHours: milestone.estimatedHours,
                completed: true
            });
            generatedTitles.add(normalizeMilestoneTitle(milestone.title));
        }

        let totalMilestones = 0;
        let completedCount = 0;
        for (const phase of phases) {
            totalMilestones += phase.milestones.length;
            completedCount += phase.milestones.filter(milestone => milestone.completed).length;
            const allDone = phase.milestones.length > 0 && phase.milestones.every(milestone => milestone.completed);
            const anyDone = phase.milestones.some(milestone => milestone.completed);
            phase.status = allDone ? 'completed' : anyDone ? 'in-progress' : 'pending';
        }
        const roadmap = new CareerRoadmap({
            userId,
            targetRole,
            progressPercentage: Math.round(completedCount / (totalMilestones || 1) * 100),
            generationSource: generated.source,
            generationModel: generated.model,
            fallbackUsed: Boolean(generated.fallbackUsed),
            aiGenerationStatus: 'not_applicable',
            phases
        });
        await roadmap.save();
        if (previousRoadmap) {
            previousRoadmap.archivedAt = new Date();
            await previousRoadmap.save();
        }
        return roadmap;
    })();

    roadmapGenerationInFlight.set(key, generation);
    try {
        return await generation;
    } finally {
        if (roadmapGenerationInFlight.get(key) === generation) {
            roadmapGenerationInFlight.delete(key);
        }
    }
}

async function buildCareerAssistantContext(user) {
    const userId = String(user._id || user.id);
    const [assessment, skillGap, roadmap, dailyPlan, resume, interviews, attempts, recentAccepted] = await Promise.all([
        CareerAssessment.findOne({ userId }).sort({ date: -1 }).select('targetRole scores weaknesses skillGaps recommendedSkills date'),
        SkillGapAnalysis.findOne({ userId }).sort({ generatedAt: -1 }).select('targetRole matchPercentage matchedSkills missingSkills generatedAt'),
        CareerRoadmap.findOne({ userId, archivedAt: null }).sort({ updatedAt: -1 }).select('targetRole progressPercentage phases updatedAt'),
        DailyPlan.findOne({ userId }).sort({ date: -1 }).select('targetRole date completionPercentage tasks generationSource'),
        ResumeAnalysis.findOne({ userId }).sort({ createdAt: -1 }).select('targetRole score atsCompatibility detectedSkills missingSkills recommendations createdAt analysisMethod'),
        Interview.find({ userId: user._id }).sort({ date: -1 }).limit(5).select('role interviewType totalScore date answers'),
        CodeSubmission.find({ userId: user._id }).sort({ submittedAt: -1 }).limit(300).select('problemId status submittedAt'),
        CodeSubmission.find({ userId: user._id, status: 'accepted' }).sort({ submittedAt: -1 }).limit(5).select('problemId submittedAt')
    ]);

    const completedProblemIds = new Set((user.completedCodingProblems || []).map(String));
    for (const attempt of attempts) {
        if (attempt.status === 'accepted') completedProblemIds.add(String(attempt.problemId));
    }
    const problemIds = [...new Set([
        ...completedProblemIds,
        ...attempts.map(item => String(item.problemId)),
        ...recentAccepted.map(item => String(item.problemId))
    ])];
    const problems = problemIds.length
        ? await CodingProblem.find({ _id: { $in: problemIds } }).select('title difficulty category')
        : [];
    const problemById = new Map(problems.map(problem => [String(problem._id), problem]));

    const difficultyCounts = { easy: 0, medium: 0, hard: 0 };
    const acceptedTopics = new Map();
    const attemptsByTopic = new Map();
    for (const id of completedProblemIds) {
        const problem = problemById.get(id);
        const difficulty = String(problem?.difficulty || '').toLowerCase();
        if (Object.hasOwn(difficultyCounts, difficulty)) difficultyCounts[difficulty]++;
        if (problem?.category) acceptedTopics.set(problem.category, (acceptedTopics.get(problem.category) || 0) + 1);
    }
    for (const attempt of attempts) {
        const topic = problemById.get(String(attempt.problemId))?.category;
        if (!topic) continue;
        const progress = attemptsByTopic.get(topic) || { attempts: 0, accepted: 0 };
        progress.attempts++;
        if (attempt.status === 'accepted') progress.accepted++;
        attemptsByTopic.set(topic, progress);
    }
    const practiceTopics = [...attemptsByTopic].map(([topic, progress]) => ({
        topic,
        attempts: progress.attempts,
        accepted: progress.accepted,
        acceptanceRate: Math.round(progress.accepted / progress.attempts * 100),
        evidenceSufficient: progress.attempts >= ASSISTANT_CODING_EVIDENCE_MIN_ATTEMPTS,
        needsPractice: progress.attempts >= ASSISTANT_CODING_EVIDENCE_MIN_ATTEMPTS &&
            progress.accepted / progress.attempts < 0.5
    }));

    const cleanList = (items, max = 8) => Array.isArray(items)
        ? items.slice(0, max).map(item => typeof item === 'string' ? item.slice(0, 180) : '').filter(Boolean)
        : [];
    return {
        assessment: assessment ? {
            targetRole: assessment.targetRole,
            overallReadiness: assessment.scores?.overallReadiness ?? null,
            weaknesses: cleanList(assessment.weaknesses),
            skillGaps: cleanList(assessment.skillGaps),
            recommendedSkills: cleanList(assessment.recommendedSkills),
            date: assessment.date
        } : null,
        skillGap: skillGap ? {
            targetRole: skillGap.targetRole,
            matchPercentage: skillGap.matchPercentage,
            matchedSkills: cleanList(skillGap.matchedSkills),
            missingSkills: cleanList(skillGap.missingSkills)
        } : null,
        roadmap: roadmap ? {
            targetRole: roadmap.targetRole,
            progressPercentage: roadmap.progressPercentage,
            phases: (roadmap.phases || []).slice(0, 5).map(phase => ({
                title: phase.title,
                status: phase.status,
                incompleteMilestones: (phase.milestones || []).filter(milestone => !milestone.completed)
                    .slice(0, 4).map(milestone => milestone.title)
            }))
        } : null,
        dailyPlan: dailyPlan ? {
            targetRole: dailyPlan.targetRole,
            date: dailyPlan.date,
            completionPercentage: dailyPlan.completionPercentage,
            tasks: (dailyPlan.tasks || []).slice(0, 8).map(task => ({
                title: task.title,
                category: task.category,
                completed: Boolean(task.completed)
            }))
        } : null,
        resume: resume ? {
            targetRole: resume.targetRole,
            score: resume.score,
            atsCompatibility: resume.atsCompatibility,
            detectedSkills: cleanList(resume.detectedSkills),
            missingSkills: cleanList(resume.missingSkills),
            recommendations: cleanList(resume.recommendations, 4),
            analysisMethod: resume.analysisMethod,
            createdAt: resume.createdAt
        } : null,
        interviews: interviews.map(interview => ({
            role: interview.role,
            interviewType: interview.interviewType,
            score: interview.totalScore,
            date: interview.date,
            evaluatedAnswers: (interview.answers || []).length
        })),
        codingPractice: {
            source: 'CareerHub coding practice; not LeetCode synchronization',
            solvedProblems: completedProblemIds.size,
            solvedByDifficulty: difficultyCounts,
            solvedByTopic: Object.fromEntries(acceptedTopics),
            recentAccepted: recentAccepted.map(item => {
                const problem = problemById.get(String(item.problemId));
                return problem ? {
                    title: problem.title,
                    difficulty: problem.difficulty,
                    topic: problem.category,
                    submittedAt: item.submittedAt
                } : null;
            }).filter(Boolean),
            topicEvidence: practiceTopics,
            leetCodeSync: {
                status: 'unavailable',
                reason: 'No verified LeetCode synchronization is configured for this account.'
            },
            attemptsIncluded: attempts.length,
            attemptWindowCapped: attempts.length === 300
        }
    };
}

function optionalAuth(req, res, next) {
    return authMiddleware(req, res, next);
}

// Calculate Profile Completion Percentage and Missing Fields
function calculateProfileCompletion(user) {
    const checks = [
        { field: 'degree', label: 'Degree', weight: 5, valid: !!(user.degree && user.degree.trim()) },
        { field: 'branch', label: 'Branch / Specialization', weight: 5, valid: !!(user.branch && user.branch.trim()) },
        { field: 'college', label: 'College / University', weight: 5, valid: !!(user.college && user.college.trim()) },
        { field: 'graduationYear', label: 'Graduation Year', weight: 5, valid: !!(user.graduationYear && user.graduationYear.trim()) },
        { field: 'cgpa', label: 'CGPA / Percentage', weight: 5, valid: !!(user.cgpa && user.cgpa.trim()) },
        { field: 'technicalSkills', label: 'Technical Skills (at least 3)', weight: 20, valid: Array.isArray(user.technicalSkills) && user.technicalSkills.length >= 3 },
        { field: 'softSkills', label: 'Soft Skills (at least 2)', weight: 10, valid: Array.isArray(user.softSkills) && user.softSkills.length >= 2 },
        { field: 'certifications', label: 'Certifications', weight: 10, valid: Array.isArray(user.certifications) && user.certifications.length > 0 },
        { field: 'projects', label: 'Portfolio Projects (at least 1)', weight: 15, valid: Array.isArray(user.projects) && user.projects.length > 0 },
        { field: 'experience', label: 'Internships / Experience', weight: 10, valid: Array.isArray(user.experience) && user.experience.length > 0 },
        { field: 'targetRole', label: 'Target Career Role', weight: 5, valid: !!(user.targetRole && user.targetRole.trim()) },
        { field: 'careerGoals', label: 'Career Goals', weight: 5, valid: !!(user.careerGoals && user.careerGoals.trim()) }
    ];

    let totalScore = 0;
    const missingFields = [];
    checks.forEach(c => {
        if (c.valid) {
            totalScore += c.weight;
        } else {
            missingFields.push(c.label);
        }
    });

    return {
        completionPercentage: Math.min(100, Math.max(0, totalScore)),
        missingFields,
        checks
    };
}

// Compute live match between Candidate Profile and Opportunity
function computeOpportunityMatch(user, opp) {
    const userSkills = (user.technicalSkills || []).map(s => s.toLowerCase());
    const requiredSkills = (opp.requiredSkills || []).map(s => s.toLowerCase());

    const matchedSkills = [];
    const missingSkills = [];

    requiredSkills.forEach(reqSkill => {
        const found = userSkills.some(userSkill => userSkill.includes(reqSkill) || reqSkill.includes(userSkill));
        if (found) {
            matchedSkills.push(reqSkill);
        } else {
            missingSkills.push(reqSkill);
        }
    });

    const skillsScore = userSkills.length > 0 && requiredSkills.length > 0
        ? Math.round((matchedSkills.length / requiredSkills.length) * 100)
        : null;

    // Education Match
    const eduText = (opp.eligibility || "").toLowerCase();
    const userDegree = (user.degree || "").toLowerCase();
    const educationScore = userDegree
        ? eduText.includes(userDegree)
            ? 100
            : /b\.tech|engineering|all/.test(eduText)
                ? 75
                : 0
        : null;

    // Role Match
    const targetRole = (user.targetRole || user.preferredRoles?.[0] || "").toLowerCase();
    const oppRole = (opp.title || "").toLowerCase();
    const roleScore = targetRole
        ? (oppRole.includes(targetRole) || targetRole.includes(oppRole))
            ? 100
            : /software|developer|engineer/.test(oppRole)
                ? 60
                : 20
        : null;

    // Location Match
    const userLocs = (user.preferredLocations || []).map(l => l.toLowerCase());
    const oppLoc = (opp.location || "").toLowerCase();
    const locationScore = userLocs.length > 0
        ? (oppLoc.includes('remote') || userLocs.some(l => oppLoc.includes(l)) ? 100 : 0)
        : null;
    const dimensions = [
        { score: skillsScore, weight: 0.55 },
        { score: roleScore, weight: 0.25 },
        { score: educationScore, weight: 0.15 },
        { score: locationScore, weight: 0.05 }
    ].filter(dimension => dimension.score !== null);
    const totalWeight = dimensions.reduce((sum, dimension) => sum + dimension.weight, 0);
    const overallMatch = totalWeight > 0
        ? Math.round(dimensions.reduce((sum, dimension) => sum + dimension.score * dimension.weight, 0) / totalWeight)
        : null;

    return {
        overallMatch,
        skillsMatch: skillsScore,
        educationMatch: educationScore,
        roleMatch: roleScore,
        experienceMatch: null,
        locationMatch: locationScore,
        matchedSkills: matchedSkills.map(s => s.charAt(0).toUpperCase() + s.slice(1)),
        missingSkills: missingSkills.map(s => s.charAt(0).toUpperCase() + s.slice(1)),
        matchReason: `High synergy in ${matchedSkills.slice(0, 3).join(', ') || 'software development'} with ${opp.organization}.`
    };
}

// ----------------------------------------------------
// 0. CAREERHUB DASHBOARD OVERVIEW
// ----------------------------------------------------
router.get('/overview', optionalAuth, async (req, res) => {
    try {
        const userId = req.user._id || req.user.id;
        const user = await User.findById(userId) || req.user;
        const completion = calculateProfileCompletion(user);

        // Use the most recent recorded assessment when available.
        const assessments = await CareerAssessment.find({ userId }).sort({ date: -1 });
        const latestAssessment = assessments[0];
        const readinessScore = latestAssessment
            ? latestAssessment.scores?.overallReadiness ?? 0
            : (user.careerReadinessScore ?? 0);

        // Fetch application stats
        const applications = await JobApplication.find({ userId }) || [];
        const stats = {
            applied: applications.filter(a => a.status === 'Applied').length,
            shortlisted: applications.filter(a => a.status === 'Shortlisted').length,
            assessment: applications.filter(a => a.status === 'Assessment').length,
            interview: applications.filter(a => a.status === 'Interview').length,
            selected: applications.filter(a => a.status === 'Selected').length,
            rejected: applications.filter(a => a.status === 'Rejected').length
        };

        res.json({
            candidate: {
                name: user.name || "Candidate",
                targetRole: user.targetRole || "Not set",
                email: user.email || ""
            },
            readinessScore,
            profileCompletion: {
                completionPercentage: completion.completionPercentage,
                missingFields: completion.missingFields
            },
            applicationsSummary: {
                activeCount: applications.length,
                pipeline: stats
            }
        });
    } catch (err) {
        console.error('Overview fetch error:', err);
        res.status(500).json({ message: "Failed to fetch overview metrics." });
    }
});

// ----------------------------------------------------
// 1. AI CAREER ASSISTANT
// ----------------------------------------------------
router.get('/assistant/status', optionalAuth, (req, res) => {
    const status = getCareerAssistantStatus();
    res.json({
        configured: status.configured,
        verified: status.verified,
        ready: status.configured && status.verified && !status.quotaBlocked,
        quotaBlocked: Boolean(status.quotaBlocked),
        retryAfter: status.retryAfter || null,
        provider: status.provider,
        model: status.model,
        dataProcessingApproval: status.dataProcessingApproval,
        assistantMode: status.assistantMode,
        geminiPrimaryEnabled: status.geminiPrimaryEnabled,
        geminiPrimaryConfigured: status.geminiPrimaryConfigured,
        geminiPrimaryQuotaBlocked: status.geminiPrimaryQuotaBlocked,
        geminiPrimaryModel: status.geminiPrimaryModel,
        geminiConfigurationIssue: status.geminiConfigurationIssue,
        geminiEnabledFeatures: status.geminiEnabledFeatures,
        groqPrimaryEnabled: status.groqPrimaryEnabled,
        groqPrimaryConfigured: status.groqPrimaryConfigured,
        groqPrimaryQuotaBlocked: status.groqPrimaryQuotaBlocked,
        groqFallbackConfigured: status.groqFallbackConfigured,
        fallbackConfigured: status.fallbackConfigured,
        fallbackModel: status.fallbackModel,
        fallbackActivationCount: status.fallbackActivationCount,
        fallbackRecoveryCount: status.fallbackRecoveryCount,
        requiredConfiguration: status.requiredConfiguration
    });
});

router.get('/assistant/history', optionalAuth, async (req, res) => {
    try {
        const userId = String(req.user._id || req.user.id);
        const conversation = await CareerConversation.findOne({ userId });
        res.json({
            messages: (conversation?.messages || []).map(message =>
                typeof message.toObject === 'function' ? message.toObject() : message
            )
        });
    } catch (err) {
        console.error('Career Assistant history fetch failed:', err);
        res.status(500).json({ message: 'Failed to load conversation history.' });
    }
});

router.delete('/assistant/history', optionalAuth, async (req, res) => {
    try {
        const userId = String(req.user._id || req.user.id);
        const conversation = await CareerConversation.findOne({ userId });
        if (conversation) await CareerConversation.findByIdAndDelete(conversation._id);
        res.json({ message: 'Conversation history cleared.' });
    } catch (err) {
        console.error('Career Assistant history clear failed:', err);
        res.status(500).json({ message: 'Failed to clear conversation history.' });
    }
});

router.post('/assistant', optionalAuth, async (req, res) => {
    try {
        const message = typeof req.body.message === 'string' ? req.body.message.trim() : '';
        if (!message) {
            return res.status(400).json({ code: 'EMPTY_MESSAGE', message: 'Message cannot be empty.' });
        }
        if (message.length > 4000) {
            return res.status(413).json({ code: 'MESSAGE_TOO_LONG', message: 'Message must be 4000 characters or fewer.' });
        }

        const userId = String(req.user._id || req.user.id);
        const conversation = await CareerConversation.findOne({ userId });
        const history = (conversation?.messages || []).slice(-20).map(item => ({
            role: item.role,
            content: item.content
        }));
        const careerContext = await buildCareerAssistantContext(req.user);
        const result = await chatCareerAssistant(message, history, req.user, careerContext);
        const messages = [
            ...history,
            { role: 'user', content: message, timestamp: new Date() },
            {
                role: 'assistant',
                content: result.reply,
                timestamp: new Date(),
                source: result.source,
                model: result.model,
                fallbackUsed: Boolean(result.fallbackUsed)
            }
        ].slice(-40);
        const record = conversation || new CareerConversation({ userId });
        record.messages = messages;
        record.updatedAt = new Date();
        try {
            await record.save();
        } catch (saveError) {
            if (saveError.code !== 11000 || conversation) throw saveError;
            const concurrentConversation = await CareerConversation.findOne({ userId });
            if (!concurrentConversation) throw saveError;
            concurrentConversation.messages = messages;
            concurrentConversation.updatedAt = new Date();
            await concurrentConversation.save();
        }
        res.json({ ...result, timestamp: new Date() });
    } catch (err) {
        if (err.code && err.status) {
            console.warn('Career Assistant provider request failed:', err.code, err.provider || '',
                err.providerDiagnostics ? JSON.stringify(err.providerDiagnostics) : '');
            return res.status(err.status).json({
                code: err.code,
                message: providerErrorMessage(err.code, 'Career Assistant', err),
                ...(err.fallbackAttempted ? { fallbackAttempted: true } : {}),
                ...(err.code === 'AI_PROVIDER_QUOTA_EXCEEDED' && err.retryAfter
                    ? { retryAfter: err.retryAfter }
                    : {})
            });
        }
        console.error('Career Assistant request failed:', err);
        res.status(500).json({ code: 'ASSISTANT_FAILED', message: 'Assistant failed to generate a response.' });
    }
});

// ----------------------------------------------------
// 2. CAREER PROFILE
// ----------------------------------------------------
router.get('/profile', optionalAuth, async (req, res) => {
    try {
        const user = await User.findById(req.user._id || req.user.id)
            .select('-password -calendarRefreshToken');
        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }
        const completion = calculateProfileCompletion(user);
        res.json({
            user,
            ...completion
        });
    } catch (err) {
        console.error('Profile fetch error:', err);
        res.status(500).json({ message: "Failed to fetch profile." });
    }
});

router.put('/profile', optionalAuth, async (req, res) => {
    try {
        const { updates, error } = validateProfileUpdate(req.body);
        if (error) return res.status(400).json({ message: error });
        const userId = String(req.user._id || req.user.id);
        if (updates.email) {
            const existing = await User.findOne({ email: updates.email });
            if (existing && String(existing._id) !== userId) {
                return res.status(409).json({ message: 'An account with this email already exists.' });
            }
        }
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $set: updates },
            { new: true, runValidators: true }
        ).select('-password -calendarRefreshToken');
        if (!updatedUser) return res.status(404).json({ message: 'User not found.' });
        const completion = calculateProfileCompletion(updatedUser);

        res.json({
            message: "Profile updated successfully.",
            user: updatedUser,
            ...completion
        });
    } catch (err) {
        if (err.code === 11000) {
            return res.status(409).json({ message: 'An account with this email already exists.' });
        }
        console.error('Profile update error:', err);
        res.status(500).json({ message: "Failed to update profile." });
    }
});

// ----------------------------------------------------
// 3. AI CAREER ASSESSMENT
// ----------------------------------------------------

router.get('/assessment/options', optionalAuth, (req, res) => {
    const { categories, difficulties, lengths } = getCuratedAssessmentOptions();
    const providerStatus = getAssessmentProviderStatus();
    res.json({
        categories,
        difficulties,
        lengths,
        source: providerStatus.provider?.toLowerCase() || null,
        providerStatus
    });
});

router.post('/assessment/start', optionalAuth, async (req, res) => {
    try {
        const { category = 'Mixed', difficulty = 'medium', count = 5 } = req.body || {};
        if (!ASSESSMENT_CATEGORIES.includes(category)) {
            return res.status(400).json({ message: 'Choose a supported assessment category.' });
        }
        if (!['easy', 'medium', 'hard'].includes(difficulty)) {
            return res.status(400).json({ message: 'Choose easy, medium, or hard difficulty.' });
        }
        if (![1, 2, 5, 10].includes(count)) {
            return res.status(400).json({ message: 'Choose a session length of 1, 2, 5, or 10 questions.' });
        }

        const userId = String(req.user._id || req.user.id);
        const resolvedRole = resolveTargetRole(undefined, req.user).role;
        if (!resolvedRole) return targetRoleRequiredResponse(res);

        const assessmentProviderStatus = getAssessmentProviderStatus();
        if (!assessmentProviderStatus.configured) {
            const providerError = {
                provider: assessmentProviderStatus.provider,
                providerDiagnostics: {
                    configurationIssue: assessmentProviderStatus.reason
                }
            };
            return res.status(503).json({
                code: 'AI_PROVIDER_NOT_CONFIGURED',
                message: providerErrorMessage(
                    'AI_PROVIDER_NOT_CONFIGURED',
                    'Assessment question generation',
                    providerError
                ),
                providerStatus: assessmentProviderStatus
            });
        }
        const requestKey = JSON.stringify([
            userId,
            resolvedRole,
            category,
            difficulty,
            count,
            req.user.technicalSkills || [],
            req.user.interests || []
        ]);
        let sessionResult;
        try {
            sessionResult = await runDeduplicated(assessmentGenerationInFlight, requestKey, async () => {
                const generated = await generateMcqQuestions({
                    role: resolvedRole,
                    topic: category,
                    difficulty,
                    count,
                    profile: req.user
                });
                if (!SUPPORTED_AI_PROVIDERS.has(generated.source) || !generated.model) {
                    const error = new Error('Assessment questions were not generated by the configured provider.');
                    error.code = 'AI_PROVIDER_INVALID_OUTPUT';
                    error.status = 502;
                    throw error;
                }
                const questions = generated.questions.map((question, index) => ({
                    questionId: index + 1,
                    category: category === 'Mixed'
                        ? (ASSESSMENT_CATEGORIES.includes(question.category)
                            ? question.category
                            : (ASSESSMENT_CATEGORIES.includes(question.topic) ? question.topic : 'Mixed'))
                        : category,
                    question: question.question,
                    options: question.options,
                    answerIndex: question.answerIndex,
                    explanation: question.explanation,
                    difficulty,
                    source: generated.source
                }));
                const session = new CareerAssessmentSession({
                    userId,
                    targetRole: resolvedRole,
                    category,
                    difficulty,
                    questions,
                    source: generated.source,
                    model: generated.model || null,
                    contextMode: generated.contextMode || 'personalized',
                    fallbackUsed: Boolean(generated.fallbackUsed),
                    status: 'active'
                });
                await session.save();
                return { session, questions };
            });
        } catch (error) {
            const code = error.code || 'AI_PROVIDER_UNAVAILABLE';
            console.warn('Assessment question generation unavailable:', code);
            return res.status(error.status || 502).json({
                code,
                message: providerErrorMessage(code, 'Assessment question generation', error),
                ...(error.fallbackAttempted ? { fallbackAttempted: true } : {})
            });
        }
        const { session, questions } = sessionResult;

        return res.status(201).json({
            sessionId: session._id,
            targetRole: resolvedRole,
            category,
            difficulty,
            source: session.source,
            model: session.model,
            contextMode: session.contextMode,
            ...(session.contextMode === 'generic_privacy_safe'
                ? { privacyNotice: 'Gemini receives only the selected topic, difficulty, and question count—not your role or profile. Questions are general practice.' }
                : {}),
            fallbackUsed: Boolean(session.fallbackUsed),
            questions: questions.map(({ questionId, category: questionCategory, question, options, difficulty: questionDifficulty }) => ({
                id: questionId,
                category: questionCategory,
                question,
                options,
                difficulty: questionDifficulty
            }))
        });
    } catch (error) {
        console.error('Assessment session start failed:', error);
        return res.status(500).json({ message: 'Unable to start the assessment session.' });
    }
});

router.get('/assessment/questions', authMiddleware, (req, res) => {
    res.status(410).json({
        code: 'ASSESSMENT_SESSION_REQUIRED',
        message: 'Assessment questions are generated for each session. Start a new assessment session.'
    });
});

router.post('/assessment/submit', optionalAuth, async (req, res) => {
    try {
        const { answers, targetRole, sessionId } = req.body;
        const userId = req.user._id || req.user.id;
        let activeSession = null;
        if (typeof sessionId !== 'string' || !sessionId.trim() || sessionId.length > 100) {
            return res.status(400).json({
                code: 'ASSESSMENT_SESSION_REQUIRED',
                message: 'Submit answers with the session ID returned by the assessment start endpoint.'
            });
        }
        if (mongoose.connection.readyState === 1 && !mongoose.Types.ObjectId.isValid(sessionId)) {
            return res.status(400).json({ message: 'Assessment session is invalid.' });
        }
        activeSession = await CareerAssessmentSession.findOne({
            _id: sessionId,
            userId: String(userId)
        });
        if (!activeSession || activeSession.status !== 'active') {
            return res.status(404).json({ message: 'Assessment session is unavailable or already submitted.' });
        }
        const expectedAnswerCount = activeSession.questions.length;
        if (!Array.isArray(answers) || answers.length !== expectedAnswerCount) {
            return res.status(400).json({
                message: `Submit exactly ${expectedAnswerCount} assessment answers.`
            });
        }
        if (answers.some(answer => answer !== null && answer !== undefined &&
            typeof answer !== 'string' && !Number.isInteger(answer) &&
            (typeof answer !== 'object' || Array.isArray(answer)))) {
            return res.status(400).json({ message: 'Assessment answers must be option letters or option indexes.' });
        }
        if (answers.some((answer, index) => answer && typeof answer === 'object' &&
            answer.questionId !== undefined && answer.questionId !== index + 1)) {
            return res.status(400).json({ message: 'Assessment answers must match the original question order.' });
        }
        if (activeSession && answers.some((answer, index) =>
            !answer || typeof answer !== 'object' || answer.questionId !== index + 1)) {
            return res.status(400).json({ message: 'Assessment answers must include the matching question number.' });
        }
        if (targetRole !== undefined &&
            (typeof targetRole !== 'string' || targetRole.trim().length > 120)) {
            return res.status(400).json({ message: 'Target role must be text with at most 120 characters.' });
        }

        const resolvedRole = resolveTargetRole(undefined, req.user).role;
        if (!resolvedRole) return targetRoleRequiredResponse(res);
        if (targetRole !== undefined && targetRole.trim() !== resolvedRole) {
            return res.status(409).json({
                code: 'TARGET_ROLE_CHANGED',
                message: 'Your saved target role changed during this assessment. Restart to use the updated role.'
            });
        }

        if (activeSession && activeSession.targetRole !== resolvedRole) {
            return res.status(409).json({
                code: 'TARGET_ROLE_CHANGED',
                message: 'Your saved target role changed during this assessment. Restart to use the updated role.'
            });
        }

        if (activeSession && answers.some((answer, index) => {
            const rawAnswer = answer && typeof answer === 'object'
                ? (answer.answer ?? answer.selectedOption ?? answer.value)
                : answer;
            const question = activeSession.questions[index];
            if (typeof rawAnswer === 'number') return rawAnswer < 0 || rawAnswer > 3;
            if (typeof rawAnswer !== 'string') return true;
            const clean = rawAnswer.trim();
            return !question.options.includes(clean) && !/^[A-D]$/i.test(clean);
        })) {
            return res.status(400).json({ message: 'Each answer must match one of the displayed options.' });
        }

        const evaluation = evaluateAssessmentQuestionSet(activeSession.questions, answers.map(answer =>
            answer.answer ?? answer.selectedOption ?? answer.value));
        const resultSessionId = String(activeSession._id);
        let aiInsights = null;
        let aiInsightsStatus = { status: 'unavailable', code: 'AI_PROVIDER_NOT_CONFIGURED' };
        try {
            aiInsights = await generateAssessmentInsights({
                evaluation: activeSession && evaluation.categoryScores
                    ? { ...evaluation, scores: evaluation.categoryScores }
                    : evaluation,
                targetRole: resolvedRole,
                profile: req.user
            });
            aiInsightsStatus = { status: 'generated', source: aiInsights.source, model: aiInsights.model };
        } catch (error) {
            aiInsightsStatus = {
                status: 'unavailable',
                code: error.code || 'AI_PROVIDER_UNAVAILABLE',
                message: providerErrorMessage(error.code || 'AI_PROVIDER_UNAVAILABLE', 'Assessment insights', error)
            };
        }

        // Save assessment record
        const assessment = new CareerAssessment({
            userId,
            sessionId: resultSessionId,
            assessmentCategory: activeSession?.category || null,
            difficulty: activeSession?.difficulty || null,
            generationSource: activeSession?.source || null,
            generationModel: activeSession?.model || null,
            contextMode: activeSession?.contextMode || 'personalized',
            fallbackUsed: Boolean(activeSession?.fallbackUsed),
            categoryScores: evaluation.categoryScores || null,
            targetRole: resolvedRole,
            scores: {
                aptitude: evaluation.scores.aptitude,
                technical: evaluation.scores.technical,
                problemSolving: evaluation.scores.problemSolving,
                communication: evaluation.scores.communication,
                roleSpecific: evaluation.scores.roleSpecific,
                overallReadiness: evaluation.overallReadiness
            },
            strengths: evaluation.strengths,
            weaknesses: evaluation.weaknesses,
            skillGaps: evaluation.skillGaps,
            recommendedSkills: evaluation.recommendedSkills,
            suitableRoles: evaluation.suitableRoles,
            aiInsights,
            aiInsightsSource: aiInsights?.source || null,
            aiInsightsModel: aiInsights?.model || null,
            detailedAnswers: evaluation.breakdown.map(b => ({
                questionId: b.questionId,
                category: b.category,
                difficulty: b.difficulty || null,
                question: b.question,
                userAnswer: b.userAnswer || '',
                correctAnswer: b.correctAnswer || '',
                isCorrect: !!b.isCorrect,
                feedback: b.explanation || ''
            }))
        });
        await assessment.save();
        activeSession.status = 'completed';
        await activeSession.save();

        // Update user readiness score
        await User.findByIdAndUpdate(userId, {
            careerReadinessScore: evaluation.overallReadiness
        });

        res.json({
            message: "Assessment submitted successfully!",
            assessmentId: assessment._id,
            sessionId: resultSessionId,
            generationSource: activeSession.source,
            generationModel: activeSession.model || null,
            fallbackUsed: Boolean(activeSession.fallbackUsed),
            assessmentCategory: activeSession.category,
            difficulty: activeSession.difficulty,
            targetRole: resolvedRole,
            aiInsights,
            aiInsightsStatus,
            scoringMethod: 'deterministic-answer-key',
            ...evaluation
        });
    } catch (err) {
        console.error('Assessment submission error:', err);
        res.status(500).json({ message: "Failed to process assessment submission." });
    }
});

router.get('/assessment/latest', optionalAuth, async (req, res) => {
    try {
        const userId = req.user._id || req.user.id;
        const latest = await CareerAssessment.findOne({ userId }).sort({ date: -1 });
        const user = latest ? null : await User.findById(userId);
        return res.json({
            assessment: latest || null,
            overallReadiness: latest?.scores?.overallReadiness ?? user?.careerReadinessScore ?? 0,
            assessmentCompleted: Boolean(latest),
            message: latest ? null : 'Complete the career assessment to see your results.'
        });
    } catch (err) {
        res.status(500).json({ message: "Failed to fetch assessment." });
    }
});

router.get('/assessment/history/:assessmentId', optionalAuth, async (req, res) => {
    try {
        const { assessmentId } = req.params;
        if (mongoose.connection.readyState === 1 && !mongoose.Types.ObjectId.isValid(assessmentId)) {
            return res.status(400).json({ message: 'Assessment ID is invalid.' });
        }
        const userId = String(req.user._id || req.user.id);
        const assessment = await CareerAssessment.findOne({
            _id: assessmentId,
            userId
        }).select('-userId');
        if (!assessment) return res.status(404).json({ message: 'Saved assessment not found.' });
        return res.json({ assessment });
    } catch (error) {
        console.error('Saved assessment retrieval failed:', error.message);
        return res.status(500).json({ message: 'Could not retrieve the saved assessment.' });
    }
});

router.get('/assessment/history', optionalAuth, async (req, res) => {
    try {
        const userId = String(req.user._id || req.user.id);
        const requestedPage = Number.parseInt(req.query.page, 10);
        const requestedLimit = Number.parseInt(req.query.limit, 10);
        const limit = Number.isInteger(requestedLimit) && requestedLimit > 0
            ? Math.min(requestedLimit, 20)
            : 10;
        const total = await CareerAssessment.countDocuments({ userId });
        const totalPages = Math.ceil(total / limit);
        const page = Number.isInteger(requestedPage) && requestedPage > 0
            ? Math.min(requestedPage, Math.max(totalPages, 1))
            : 1;
        const assessments = await CareerAssessment.find({ userId })
            .sort({ date: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .select('targetRole assessmentCategory difficulty scores date generationSource generationModel fallbackUsed');

        res.json({
            assessments,
            pagination: {
                page,
                limit,
                total,
                totalPages
            }
        });
    } catch (err) {
        console.error('Assessment history fetch failed:', err);
        res.status(500).json({ message: 'Failed to load assessment history.' });
    }
});

// ----------------------------------------------------
// 4. JOBS & INTERNSHIPS WITH AI MATCHING
// ----------------------------------------------------
router.get('/opportunities', optionalAuth, async (req, res) => {
    try {
        res.set('Cache-Control', 'no-store');
        const jobs = await fetchLiveJobs();
        const user = await User.findById(req.user._id || req.user.id);
        if (!user) return res.status(404).json({ message: 'User profile not found.' });

        const search = typeof req.query.search === 'string' ? req.query.search.trim().toLowerCase() : '';
        const requestedType = typeof req.query.type === 'string' ? req.query.type : 'all';
        const requestedCategory = typeof req.query.category === 'string'
            ? req.query.category.trim().toLowerCase()
            : '';
        const sort = typeof req.query.sort === 'string' ? req.query.sort : 'match';
        let opportunities = jobs
            .map(job => ({ ...job, ...calculateJobMatch(user, job) }))
            .filter(job => {
                if (requestedType !== 'all' && job.type !== requestedType) return false;
                if (requestedCategory && !job.tags.some(tag => tag.toLowerCase() === requestedCategory)) return false;
                if (!search) return true;
                return [job.title, job.organization, job.location, ...job.tags]
                    .some(value => String(value || '').toLowerCase().includes(search));
            });

        if (sort === 'newest') {
            opportunities.sort((a, b) => Date.parse(b.createdAt || 0) - Date.parse(a.createdAt || 0));
        } else {
            opportunities.sort((a, b) => (b.overallMatch ?? -1) - (a.overallMatch ?? -1));
        }
        res.json({
            opportunities,
            total: opportunities.length,
            dataSource: 'live_api',
            source: ARBEITNOW_SOURCE,
            retrievedAt: new Date().toISOString(),
            message: opportunities.length === 0 ? 'No jobs match those filters in the current provider feed.' : undefined
        });
    } catch (err) {
        if (err.code && err.status) {
            console.warn('Job provider request failed:', err.code);
            return res.status(err.status).json({
                code: err.code,
                dataSource: 'unavailable',
                message: 'Live job listings are temporarily unavailable. Try again later.'
            });
        }
        console.error('Opportunities error:', err);
        res.status(500).json({ message: 'Failed to fetch live opportunities.' });
    }
});

router.post('/opportunities/explanation', optionalAuth, async (req, res) => {
    try {
        const { jobId } = req.body;
        if (typeof jobId !== 'string' || !jobId.trim() || jobId.length > 300) {
            return res.status(400).json({ message: 'A valid live listing ID is required.' });
        }
        const [jobs, user] = await Promise.all([
            fetchLiveJobs(),
            User.findById(req.user._id || req.user.id)
        ]);
        const job = jobs.find(item => item.id === jobId);
        if (!job) return res.status(404).json({ message: 'That listing is not in the current provider feed.' });
        if (!user) return res.status(404).json({ message: 'User profile not found.' });
        const match = calculateJobMatch(user, job);
        const explanation = await explainJobFit({ job, profile: user, match });
        res.json({
            jobId: job.id,
            source: job.source,
            applicationLink: job.applicationLink,
            overallMatch: match.overallMatch,
            ...explanation
        });
    } catch (error) {
        if (error.code && error.status) {
            return res.status(error.status).json({
                code: error.code,
                message: providerErrorMessage(error.code, 'Job-fit explanation', error)
            });
        }
        console.error('Job-fit explanation failed:', error);
        res.status(500).json({ message: 'Failed to explain job fit.' });
    }
});

// ----------------------------------------------------
// 5. SKILL GAP ANALYSIS
// ----------------------------------------------------
router.get('/skill-gap', optionalAuth, async (req, res) => {
    try {
        const user = await User.findById(req.user._id || req.user.id) || req.user;
        const requestedRole = typeof req.query.role === 'string' ? req.query.role.trim() : '';
        if (requestedRole.length > 120) {
            return res.status(400).json({ message: 'Target role must be 120 characters or fewer.' });
        }
        const resolvedRole = resolveTargetRole(requestedRole, user);
        if (!resolvedRole.role) return targetRoleRequiredResponse(res);
        const targetRole = resolvedRole.role;

        const roleSkillStandards = {
            'Full Stack Developer': [
                { skill: 'JavaScript / TypeScript', priority: 'High', description: 'Core programming language for modern frontend and backend development.' },
                { skill: 'React', priority: 'High', description: 'Component architecture, state management, and virtual DOM rendering.' },
                { skill: 'Node.js & Express', priority: 'High', description: 'Asynchronous event loop, RESTful APIs, and middleware.' },
                { skill: 'HTML & Modern CSS', priority: 'High', description: 'Semantic markup, flexbox/grid, and responsive layout standards.' },
                { skill: 'SQL & Database Design', priority: 'High', description: 'Relational data modeling, indexing, ACID transactions.' },
                { skill: 'Git & Version Control', priority: 'High', description: 'Branching strategies, pull request reviews, and merge conflict resolution.' },
                { skill: 'Docker Containerization', priority: 'Medium', description: 'Packaging applications and microservices for production consistency.' },
                { skill: 'System Design Fundamentals', priority: 'Medium', description: 'Caching (Redis), load balancers, rate limiting, and scalability.' },
                { skill: 'Automated Testing (Jest)', priority: 'Medium', description: 'Unit testing, integration testing, and CI/CD pipelines.' }
            ],
            'Frontend Engineer': [
                { skill: 'JavaScript (ES6+)', priority: 'High', description: 'Asynchronous JS, closures, prototypes, and browser APIs.' },
                { skill: 'React / Next.js', priority: 'High', description: 'Hooks, SSR/CSR rendering, and client-side optimization.' },
                { skill: 'CSS / Tailwind', priority: 'High', description: 'Utility-first styling, animations, and fluid mobile-first responsiveness.' },
                { skill: 'State Management (Redux/Zustand)', priority: 'Medium', description: 'Managing complex global application state.' },
                { skill: 'Web Performance & Core Vitals', priority: 'High', description: 'Optimizing LCP, FID, CLS, and asset bundling.' },
                { skill: 'TypeScript', priority: 'Medium', description: 'Static typing, interfaces, and compile-time error prevention.' }
            ],
            'Backend Engineer': [
                { skill: 'Node.js / Python / Java', priority: 'High', description: 'Server-side execution runtime and language mastery.' },
                { skill: 'REST & GraphQL APIs', priority: 'High', description: 'Scalable interface contracts, pagination, and status handling.' },
                { skill: 'Relational DBs (PostgreSQL/MySQL)', priority: 'High', description: 'Schema normalization, query optimization, and connection pooling.' },
                { skill: 'NoSQL / Redis', priority: 'Medium', description: 'Document stores and high-speed in-memory caching.' },
                { skill: 'Docker & Microservices', priority: 'High', description: 'Container orchestration, environment variables, and microservice meshes.' },
                { skill: 'System Design & Scalability', priority: 'High', description: 'Message queues (Kafka/RabbitMQ), partitioning, and high availability.' }
            ],
            'Software Development Engineer 1 (SDE-1)': [
                { skill: 'Data Structures and Algorithms', priority: 'High', description: 'Select and analyze standard data structures and algorithms for coding problems.' },
                { skill: 'Programming Fundamentals', priority: 'High', description: 'Write correct, maintainable code in a primary programming language.' },
                { skill: 'Object-Oriented Design', priority: 'High', description: 'Apply composition, interfaces, and common design principles to small systems.' },
                { skill: 'SQL and Database Fundamentals', priority: 'Medium', description: 'Model relational data and write reliable queries.' },
                { skill: 'Testing and Debugging', priority: 'Medium', description: 'Reproduce defects and verify behavior with focused automated tests.' },
                { skill: 'Git and Collaboration', priority: 'Medium', description: 'Use version control and communicate implementation trade-offs.' }
            ],
            'Data Analyst / ML Engineer': [
                { skill: 'Python', priority: 'High', description: 'Use Python for data preparation, analysis, and reproducible workflows.' },
                { skill: 'SQL', priority: 'High', description: 'Retrieve, join, aggregate, and validate structured data.' },
                { skill: 'Statistics and Probability', priority: 'High', description: 'Interpret distributions, uncertainty, and statistical comparisons.' },
                { skill: 'Data Visualization', priority: 'Medium', description: 'Communicate findings with accurate, readable charts and dashboards.' },
                { skill: 'Machine Learning Fundamentals', priority: 'Medium', description: 'Understand model evaluation, overfitting, and appropriate validation.' },
                { skill: 'Data Cleaning and Feature Preparation', priority: 'Medium', description: 'Handle missing values, inconsistent records, and leakage risks.' }
            ],
            'Data Analyst': [
                { skill: 'SQL', priority: 'High', description: 'Retrieve, join, aggregate, and validate structured data.' },
                { skill: 'Spreadsheets and Data Cleaning', priority: 'High', description: 'Clean inconsistent records and validate formulas and totals.' },
                { skill: 'Statistics and Probability', priority: 'High', description: 'Interpret distributions, uncertainty, and statistical comparisons.' },
                { skill: 'Data Visualization', priority: 'Medium', description: 'Communicate findings with accurate, readable charts and dashboards.' },
                { skill: 'Python or R', priority: 'Medium', description: 'Use a reproducible analysis language for data preparation and analysis.' },
                { skill: 'Business Communication', priority: 'Medium', description: 'Explain findings and limitations in terms relevant to decisions.' }
            ],
            'Cloud Engineer': [
                { skill: 'Linux and Networking', priority: 'High', description: 'Understand operating-system basics, DNS, HTTP, and network troubleshooting.' },
                { skill: 'Cloud Platform Fundamentals', priority: 'High', description: 'Deploy and operate services using a major cloud provider.' },
                { skill: 'Infrastructure as Code', priority: 'High', description: 'Provision repeatable infrastructure using reviewed configuration.' },
                { skill: 'Containers', priority: 'Medium', description: 'Build and operate containerized applications.' },
                { skill: 'Monitoring and Incident Response', priority: 'High', description: 'Use observability signals to diagnose service issues.' },
                { skill: 'Security and IAM', priority: 'High', description: 'Apply least privilege and secure cloud configuration.' }
            ],
            'Cybersecurity Analyst': [
                { skill: 'Networking Fundamentals', priority: 'High', description: 'Interpret common protocols, ports, and network traffic.' },
                { skill: 'Linux and Windows Security', priority: 'High', description: 'Use system logs and controls to investigate security events.' },
                { skill: 'Security Monitoring', priority: 'High', description: 'Triage alerts and correlate evidence from security logs.' },
                { skill: 'Incident Response', priority: 'High', description: 'Follow documented containment, investigation, and recovery steps.' },
                { skill: 'Scripting', priority: 'Medium', description: 'Automate repeatable analysis with a scripting language.' },
                { skill: 'Risk and Vulnerability Management', priority: 'Medium', description: 'Prioritize findings using evidence, impact, and remediation context.' }
            ]
        };

        const benchmarkAliases = {
            'SDE-1': 'Software Development Engineer 1 (SDE-1)',
            'Machine Learning Engineer': 'Data Analyst / ML Engineer',
            'AI/ML Engineer': 'Data Analyst / ML Engineer',
            'Data Scientist': 'Data Analyst / ML Engineer',
            'Software Developer': 'Software Development Engineer 1 (SDE-1)',
            'Frontend Developer': 'Frontend Engineer',
            'Backend Developer': 'Backend Engineer'
        };
        const benchmarkRole = benchmarkAliases[targetRole] || targetRole;
        const standard = roleSkillStandards[benchmarkRole];
        if (!standard) {
            return res.status(422).json({
                code: 'ROLE_BENCHMARK_UNAVAILABLE',
                message: 'No curated skill benchmark is available for this role yet. Choose a listed benchmark or provide one for this exercise.',
                supportedRoles: [
                    ...Object.keys(roleSkillStandards),
                    'SDE-1',
                    'Machine Learning Engineer',
                    'AI/ML Engineer',
                    'Data Scientist',
                    'Software Developer',
                    'Frontend Developer',
                    'Backend Developer'
                ]
            });
        }
        const userSkills = Array.isArray(user.technicalSkills)
            ? user.technicalSkills
                .filter(skill => typeof skill === 'string' && skill.trim())
                .map(skill => skill.trim().toLowerCase())
            : [];
        const normalizedWords = value => String(value).toLowerCase()
            .replace(/[^a-z0-9+#.]+/g, ' ').trim().split(/\s+/).filter(Boolean);

        const matched = [];
        const missing = [];

        standard.forEach(item => {
            const requiredWords = normalizedWords(item.skill);
            const hasSkill = userSkills.some(profileSkill => {
                const profileWords = normalizedWords(profileSkill);
                return profileWords.some(word => requiredWords.includes(word));
            });
            if (hasSkill) {
                matched.push({ ...item, status: 'acquired' });
            } else {
                missing.push({ ...item, status: 'missing' });
            }
        });

        const matchPercent = Math.round((matched.length / standard.length) * 100);
        const userId = String(req.user._id || req.user.id);
        const latestAssessment = await CareerAssessment.findOne({
            userId
        }).sort({ date: -1 });
        const aiContextHash = crypto.createHash('sha256').update(JSON.stringify({
            targetRole,
            matchedSkills: matched.map(item => item.skill),
            missingSkills: missing.map(item => item.skill),
            interests: user.interests || [],
            careerGoals: user.careerGoals || '',
            availableHoursPerWeek: user.availableHoursPerWeek || null,
            assessmentScores: latestAssessment?.scores || null
        })).digest('hex');
        let savedAnalysis = await SkillGapAnalysis.findOne({ userId, targetRole });
        let aiAdvice = null;
        let aiAdviceError = null;
        const reusedAdvice = savedAnalysis?.aiInsightsContextHash === aiContextHash &&
            SUPPORTED_AI_PROVIDERS.has(savedAnalysis.aiInsightsSource);
        if (reusedAdvice) {
            aiAdvice = {
                insights: savedAnalysis.aiInsights,
                source: savedAnalysis.aiInsightsSource,
                model: savedAnalysis.aiInsightsModel,
                fallbackUsed: Boolean(savedAnalysis.aiInsightsFallbackUsed)
            };
        } else if (missing.length) {
            try {
                aiAdvice = await runDeduplicated(
                    skillGapAdviceInFlight,
                    `${userId}:${targetRole}:${aiContextHash}`,
                    () => generateSkillGapAdvice({
                        targetRole,
                        matchedSkills: matched,
                        missingSkills: missing,
                        profile: user,
                        assessment: latestAssessment
                    })
                );
            } catch (error) {
                if (!error.code?.startsWith('AI_')) throw error;
                aiAdviceError = error;
            }
        }
        if (!savedAnalysis) {
            savedAnalysis = new SkillGapAnalysis({
                userId,
                targetRole
            });
        }
        savedAnalysis.matchPercentage = matchPercent;
        savedAnalysis.matchedSkills = matched;
        savedAnalysis.missingSkills = missing;
        if (aiAdvice && !reusedAdvice) {
            savedAnalysis.aiInsights = aiAdvice.insights;
            savedAnalysis.aiInsightsSource = aiAdvice.source;
            savedAnalysis.aiInsightsModel = aiAdvice.model;
            savedAnalysis.aiInsightsFallbackUsed = Boolean(aiAdvice.fallbackUsed);
            savedAnalysis.aiInsightsContextHash = aiContextHash;
        }
        savedAnalysis.generatedAt = new Date();
        await savedAnalysis.save();

        res.json({
            analysisId: savedAnalysis._id,
            generatedAt: savedAnalysis.generatedAt,
            targetRole,
            matchPercentage: matchPercent,
            totalSkillsRequired: standard.length,
            acquiredCount: matched.length,
            missingCount: missing.length,
            matchedSkills: matched,
            missingSkills: missing,
            aiInsights: aiAdvice?.insights || [],
            aiAdviceStatus: aiAdvice
                ? {
                    status: 'generated',
                    source: aiAdvice.source,
                    model: aiAdvice.model,
                    fallbackUsed: Boolean(aiAdvice.fallbackUsed),
                    cached: reusedAdvice
                }
                : aiAdviceError
                    ? {
                    status: 'unavailable',
                    code: aiAdviceError.code,
                    message: providerErrorMessage(aiAdviceError.code, 'Skill-gap guidance', aiAdviceError)
                    }
                    : { status: 'not_needed' },
            learningRoadmap: (aiAdvice?.insights || []).map(insight => ({
                skill: insight.skill,
                learningAction: insight.learningAction,
                projectIdea: insight.projectIdea,
                completionCriteria: insight.completionCriteria
            })),
            methodology: 'Curated role benchmarks are compared with self-reported profile skills using normalized whole-word matches. This checks listed skills only; it does not verify proficiency.'
        });
    } catch (err) {
        if (err.code?.startsWith('AI_')) {
            return res.status(err.status || 502).json({
                code: err.code,
                message: providerErrorMessage(err.code, 'Skill gap analysis', err)
            });
        }
        console.error('Skill gap error:', err);
        res.status(500).json({ message: "Failed to compute skill gap." });
    }
});

router.get('/skill-gap/history', optionalAuth, async (req, res) => {
    try {
        const analyses = await SkillGapAnalysis.find({
            userId: String(req.user._id || req.user.id)
        }).sort({ generatedAt: -1 });
        res.json({ analyses });
    } catch (err) {
        console.error('Skill gap history error:', err);
        res.status(500).json({ message: 'Failed to load saved skill-gap analyses.' });
    }
});

router.get('/resources/recommendations', optionalAuth, async (req, res) => {
    try {
        const userId = String(req.user._id || req.user.id);
        const [user, latestSkillGap] = await Promise.all([
            User.findById(userId),
            SkillGapAnalysis.findOne({ userId }).sort({ generatedAt: -1 })
        ]);
        if (!user) return res.status(404).json({ message: 'User profile not found.' });
        const missingSkills = (latestSkillGap?.missingSkills || []).map(item =>
            typeof item === 'string' ? item : item.skill).filter(Boolean);
        const recommendation = await recommendLearningResources({ profile: user, missingSkills });
        res.json({ ...recommendation, basedOnSkills: missingSkills });
    } catch (error) {
        if (error.code && error.status) {
            return res.status(error.status).json({
                code: error.code,
                message: providerErrorMessage(error.code, 'Learning resource recommendation', error)
            });
        }
        console.error('Learning resource recommendation failed:', error);
        res.status(500).json({ message: 'Failed to recommend learning resources.' });
    }
});

// ----------------------------------------------------
// 6. AI CAREER ROADMAP
// ----------------------------------------------------
router.get('/roadmap', optionalAuth, async (req, res) => {
    try {
        const userId = req.user._id || req.user.id;
        const user = await User.findById(userId);
        const { role: targetRole } = resolveTargetRole(undefined, user);
        if (!targetRole) return targetRoleRequiredResponse(res);
        const activeRoadmap = await CareerRoadmap.findOne({ userId, archivedAt: null }).sort({ updatedAt: -1 });
        let roadmap = activeRoadmap;
        if (activeRoadmap && activeRoadmap.targetRole !== targetRole) {
            roadmap = await generateAndSaveRoadmap({
                user,
                userId,
                targetRole,
                previousRoadmap: activeRoadmap
            });
        } else if (!roadmap) {
            roadmap = await generateAndSaveRoadmap({ user, userId, targetRole });
        }

        res.json(roadmap);
    } catch (err) {
        console.error('Roadmap error:', err);
        res.status(500).json({ message: "Failed to fetch roadmap." });
    }
});

router.post('/roadmap/regenerate', optionalAuth, async (req, res) => {
    try {
        const userId = req.user._id || req.user.id;
        const user = await User.findById(userId);
        const { role: targetRole } = resolveTargetRole(undefined, user);
        if (!targetRole) return targetRoleRequiredResponse(res);
        const currentRoadmap = await CareerRoadmap.findOne({ userId, archivedAt: null })
            .sort({ updatedAt: -1 });
        const roadmap = await generateAndSaveRoadmap({
            user,
            userId,
            targetRole,
            previousRoadmap: currentRoadmap
        });
        return res.json({ message: 'Career roadmap regenerated.', roadmap });
    } catch (err) {
        console.error('Roadmap regeneration error:', err);
        return res.status(500).json({ message: 'Failed to regenerate your roadmap.' });
    }
});

router.get('/roadmap/history', optionalAuth, async (req, res) => {
    try {
        const userId = String(req.user._id || req.user.id);
        const records = await CareerRoadmap.find({ userId });
        const archived = records
            .filter(record => record.archivedAt)
            .sort((a, b) => new Date(b.archivedAt) - new Date(a.archivedAt))
            .slice(0, 20);
        res.json({ roadmaps: archived });
    } catch (err) {
        console.error('Archived roadmap history fetch failed:', err);
        res.status(500).json({ message: 'Failed to load previous roadmaps.' });
    }
});

router.put('/roadmap/milestone', optionalAuth, async (req, res) => {
    try {
        const { milestoneId, completed } = req.body;
        const userId = req.user._id || req.user.id;
        if (typeof milestoneId !== 'string' || typeof completed !== 'boolean') {
            return res.status(400).json({ message: "A milestone ID and boolean completion state are required." });
        }
        const roadmap = await CareerRoadmap.findOne({ userId, archivedAt: null });

        if (!roadmap) {
            return res.status(404).json({ message: "Roadmap not found." });
        }

        let totalMilestones = 0;
        let completedCount = 0;
        let milestoneFound = false;

        roadmap.phases.forEach(phase => {
            phase.milestones.forEach(m => {
                if (m.id === milestoneId) {
                    m.completed = completed;
                    milestoneFound = true;
                }
                totalMilestones++;
                if (m.completed) completedCount++;
            });

            // Update phase status
            const allDone = phase.milestones.every(m => m.completed);
            const anyDone = phase.milestones.some(m => m.completed);
            if (allDone) phase.status = 'completed';
            else if (anyDone) phase.status = 'in-progress';
            else phase.status = 'pending';
        });

        if (!milestoneFound) {
            return res.status(404).json({ message: "Milestone not found." });
        }
        roadmap.progressPercentage = Math.round((completedCount / (totalMilestones || 1)) * 100);
        await roadmap.save();

        res.json({
            message: "Milestone updated.",
            progressPercentage: roadmap.progressPercentage,
            roadmap
        });
    } catch (err) {
        console.error('Milestone update error:', err);
        res.status(500).json({ message: "Failed to update milestone." });
    }
});

// ----------------------------------------------------
// 7. APPLICATION TRACKER
// ----------------------------------------------------
router.get('/applications', optionalAuth, async (req, res) => {
    try {
        const userId = req.user._id || req.user.id;
        const applications = await JobApplication.find({ userId }).sort({ appliedDate: -1 });

        const stats = {
            total: applications.length,
            saved: applications.filter(a => a.status === 'Saved').length,
            started: applications.filter(a => a.status === 'Application Started').length,
            applied: applications.filter(a => a.status === 'Applied').length,
            shortlisted: applications.filter(a => a.status === 'Shortlisted').length,
            assessment: applications.filter(a => a.status === 'Assessment').length,
            interview: applications.filter(a => a.status === 'Interview').length,
            selected: applications.filter(a => a.status === 'Selected' || a.status === 'Offer').length,
            rejected: applications.filter(a => a.status === 'Rejected').length
        };

        res.json({ applications, stats });
    } catch (err) {
        console.error('Applications error:', err);
        res.status(500).json({ message: "Failed to fetch applications." });
    }
});

router.post('/applications', optionalAuth, async (req, res) => {
    try {
        const userId = req.user._id || req.user.id;
        const {
            company,
            jobRole,
            jobId,
            sourceUrl,
            source,
            applicationMethod,
            type,
            location,
            salaryOrStipend,
            status,
            interviewDate,
            matchPercentage,
            notes,
            contactPerson
        } = req.body;

        if (typeof company !== 'string' || !company.trim() ||
            typeof jobRole !== 'string' || !jobRole.trim()) {
            return res.status(400).json({ message: "Company and job role are required." });
        }
        if (status && !APPLICATION_STATUSES.includes(status)) {
            return res.status(400).json({ message: "Invalid application status." });
        }
        if (sourceUrl && !safeHttpsUrl(sourceUrl)) {
            return res.status(400).json({ message: 'Application source URL must use a safe HTTPS address.' });
        }
        if (matchPercentage != null &&
            (!Number.isFinite(Number(matchPercentage)) || Number(matchPercentage) < 0 || Number(matchPercentage) > 100)) {
            return res.status(400).json({ message: 'Match percentage must be between 0 and 100.' });
        }

        const existing = await JobApplication.findOne(jobId
            ? { userId: String(userId), jobId: String(jobId) }
            : { userId: String(userId), company: company.trim(), jobRole: jobRole.trim() });
        if (existing) {
            return res.status(409).json({
                duplicate: true,
                message: "An application for this role at this company already exists.",
                application: existing
            });
        }

        const initialStatus = status || 'Saved';
        const application = new JobApplication({
            userId,
            company: company.trim(),
            jobRole: jobRole.trim(),
            jobId: jobId || '',
            sourceUrl: sourceUrl || '',
            source: typeof source === 'string' ? source.trim() : '',
            applicationMethod: applicationMethod || 'tracked',
            type: type || 'job',
            location: location || 'Not specified',
            ...(typeof salaryOrStipend === 'string' && salaryOrStipend.trim()
                ? { salaryOrStipend: salaryOrStipend.trim() }
                : {}),
            status: initialStatus,
            statusHistory: [{ status: initialStatus, timestamp: new Date(), note: 'Application created.' }],
            interviewDate: interviewDate || '',
            matchPercentage: matchPercentage ?? null,
            notes: notes || '',
            contactPerson: contactPerson || ''
        });

        await application.save();
        res.status(201).json({
            message: "Application tracked successfully.",
            application
        });
    } catch (err) {
        if (err.code === 11000) {
            return res.status(409).json({
                duplicate: true,
                message: 'This job is already saved in your application tracker.'
            });
        }
        console.error('Create application error:', err);
        res.status(500).json({ message: "Failed to save application." });
    }
});

router.put('/applications/:id', optionalAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = String(req.user._id || req.user.id);
        const updateData = {};
        for (const field of ['status', 'notes', 'interviewDate', 'contactPerson']) {
            if (req.body[field] !== undefined) updateData[field] = req.body[field];
        }
        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ message: "No supported application fields were provided." });
        }
        if (updateData.status && !APPLICATION_STATUSES.includes(updateData.status)) {
            return res.status(400).json({ message: "Invalid application status." });
        }

        // Ownership check — only the owner can update their application
        const existing = await JobApplication.findById(id);
        if (!existing) {
            return res.status(404).json({ message: "Application not found." });
        }
        if (String(existing.userId) !== userId) {
            return res.status(403).json({ message: "Forbidden: You cannot modify another student's application." });
        }

        // Track status change in history
        const changesStatus = updateData.status && updateData.status !== existing.status;
        const update = {
            $set: { ...updateData, updatedAt: new Date() },
            ...(changesStatus ? {
                $push: {
                    statusHistory: {
                        status: updateData.status,
                        timestamp: new Date(),
                        note: updateData.notes || `Status changed to ${updateData.status}.`
                    }
                }
            } : {})
        };
        const updated = await JobApplication.findByIdAndUpdate(id, update, {
            new: true,
            runValidators: true
        });
        res.json({ message: "Application updated.", application: updated });
    } catch (err) {
        console.error('Application update error:', err);
        res.status(500).json({ message: "Failed to update application." });
    }
});

// PATCH: Update application status with statusHistory tracking
router.patch('/applications/:id/status', optionalAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = String(req.user._id || req.user.id);
        const { status, notes, interviewDate } = req.body;

        if (!status || !APPLICATION_STATUSES.includes(status)) {
            return res.status(400).json({ message: "Status is required." });
        }

        const application = await JobApplication.findById(id);
        if (!application) {
            return res.status(404).json({ message: "Application not found." });
        }
        if (String(application.userId) !== userId) {
            return res.status(403).json({ message: "Forbidden: You cannot modify another student's application." });
        }
        if (application.status === status && notes === undefined && interviewDate === undefined) {
            return res.json({ message: "Application status is unchanged.", application });
        }

        const setFields = { status, updatedAt: new Date() };
        if (notes !== undefined) setFields.notes = notes;
        if (interviewDate !== undefined) setFields.interviewDate = interviewDate;
        const updateFields = { $set: setFields };

        if (application.status !== status) {
            updateFields.$push = {
                statusHistory: {
                    status,
                    timestamp: new Date(),
                    note: notes || `Status changed to ${status}.`
                }
            };
        }
        const updated = await JobApplication.findByIdAndUpdate(id, updateFields, {
            new: true,
            runValidators: true
        });

        res.json({
            message: `Status updated to '${status}'.`,
            application: updated
        });
    } catch (err) {
        console.error('Status update error:', err);
        res.status(500).json({ message: "Failed to update application status." });
    }
});

router.delete('/applications/:id', optionalAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const application = await JobApplication.findById(id);
        if (!application) {
            return res.status(404).json({ message: "Application not found." });
        }
        if (String(application.userId) !== String(req.user._id || req.user.id)) {
            return res.status(403).json({ message: "Forbidden: You cannot delete another student's application." });
        }
        await JobApplication.findByIdAndDelete(id);
        res.json({ message: "Application deleted successfully." });
    } catch (err) {
        console.error('Application delete error:', err);
        res.status(500).json({ message: "Failed to delete application." });
    }
});

// ----------------------------------------------------
// 8. DAILY PREPARATION PLAN
// ----------------------------------------------------
router.get('/daily-plan', optionalAuth, async (req, res) => {
    try {
        const userId = req.user._id || req.user.id;
        const user = await User.findById(userId) || req.user;
        const { role: targetRole } = resolveTargetRole(undefined, user);
        if (!targetRole) return targetRoleRequiredResponse(res);
        const todayStr = new Date().toISOString().slice(0, 10);

        let plan = await DailyPlan.findOne({ userId, date: todayStr });

        if (!plan) {
            plan = await runDeduplicated(dailyPlanGenerationInFlight, `${userId}:${todayStr}`, () =>
                getOrGenerateDailyPlan({
                    userId: String(userId),
                    date: todayStr,
                    DailyPlan,
                    GenerationLock: DailyPlanGenerationLock,
                    generate: async () => {
                        const roadmap = await CareerRoadmap.findOne({ userId, archivedAt: null });
                        let pendingRoadmapMilestone = null;
                        if (roadmap && Array.isArray(roadmap.phases)) {
                            for (const ph of roadmap.phases) {
                                const found = (ph.milestones || []).find(m => !m.completed);
                                if (found) {
                                    pendingRoadmapMilestone = found.title;
                                    break;
                                }
                            }
                        }
                        const [codingProblem, codingAttempts] = await Promise.all([
                            CodingProblem.findOne({
                                catalogVersion: 'careerhub-dsa-100-v1',
                                isActive: true,
                                _id: { $nin: user.completedCodingProblems || [] }
                            }).select('_id title'),
                            CodeSubmission.countDocuments({ userId })
                        ]);
                        const generated = buildDailyPreparationTasks({
                            profile: user,
                            pendingMilestone: pendingRoadmapMilestone,
                            codingProblem,
                            codingAttempts
                        });
                        const generatedPlan = new DailyPlan({
                            userId,
                            date: todayStr,
                            targetRole,
                            completionPercentage: 0,
                            streak: user.streak ?? 0,
                            generationSource: generated.source,
                            generationModel: generated.model,
                            fallbackUsed: Boolean(generated.fallbackUsed),
                            tasks: generated.tasks
                        });
                        try {
                            await generatedPlan.save();
                        } catch (error) {
                            if (error.code !== 11000 && error.code !== 11001) throw error;
                            const concurrentlySavedPlan = await DailyPlan.findOne({ userId, date: todayStr });
                            if (concurrentlySavedPlan) return concurrentlySavedPlan;
                            throw error;
                        }
                        return generatedPlan;
                    }
                })
            );
        }

        res.json({
            date: todayStr,
            plan,
            generationSource: plan.generationSource || null,
            generationModel: plan.generationModel || null,
            fallbackUsed: Boolean(plan.fallbackUsed),
            profileTargetRole: user.targetRole || null,
            roleMismatch: Boolean(user.targetRole && plan.targetRole && user.targetRole !== plan.targetRole),
            userStreak: user.streak ?? 0
        });
    } catch (err) {
        if (err.code === 'DAILY_PLAN_GENERATION_IN_PROGRESS') {
            res.set('Retry-After', '5');
            return res.status(503).json({
                code: err.code,
                message: err.message
            });
        }
        if (err.code?.startsWith('AI_')) {
            return res.status(err.status || 502).json({
                code: err.code,
                message: providerErrorMessage(err.code, 'Daily preparation plan', err)
            });
        }
        console.error('Daily plan fetch error:', err);
        res.status(500).json({ message: 'Failed to fetch daily plan.' });
    }
});

router.put('/daily-plan/task/:taskId', optionalAuth, async (req, res) => {
    try {
        const userId = req.user._id || req.user.id;
        const { taskId } = req.params;
        const { completed } = req.body;
        if (completed !== undefined && typeof completed !== 'boolean') {
            return res.status(400).json({ message: 'Task completion state must be true or false.' });
        }
        const todayStr = new Date().toISOString().slice(0, 10);

        let plan = await DailyPlan.findOne({ userId, date: todayStr });
        if (!plan) {
            return res.status(404).json({ message: 'No daily plan found for today.' });
        }

        const task = (plan.tasks || []).find(t => t.id === taskId);
        if (!task) {
            return res.status(404).json({ message: 'Task not found in daily plan.' });
        }

        const wasCompleted = task.completed;
        const wasPlanComplete = plan.completionPercentage === 100;
        const targetCompleted = completed !== undefined ? !!completed : !task.completed;
        task.completed = targetCompleted;
        task.completedAt = targetCompleted ? new Date() : null;

        const total = plan.tasks.length;
        const done = plan.tasks.filter(t => t.completed).length;
        plan.completionPercentage = Math.round((done / (total || 1)) * 100);

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found.' });
        if (targetCompleted && !wasCompleted) {
            user.xp = (user.xp || 0) + (task.xpReward || 25);
            if (done === total) {
                user.xp += 50;
                user.streak = (user.streak || 0) + 1;
            }
        } else if (!targetCompleted && wasCompleted) {
            user.xp = Math.max(0, (user.xp || 0) - (task.xpReward || 25) - (wasPlanComplete ? 50 : 0));
            if (wasPlanComplete) user.streak = Math.max(0, (user.streak || 0) - 1);
        }
        user.level = Math.floor((user.xp || 0) / 100) + 1;
        await user.save();
        plan.streak = user.streak || 0;

        await plan.save();

        res.json({
            message: 'Task updated successfully',
            task,
            plan,
            user: user ? { xp: user.xp, level: user.level, streak: user.streak } : null
        });
    } catch (err) {
        console.error('Task update error:', err);
        res.status(500).json({ message: 'Failed to update daily plan task.' });
    }
});

// ----------------------------------------------------
// 9. JOB DESCRIPTION ANALYZER
// ----------------------------------------------------
router.get('/job-analyzer/history', authMiddleware, async (req, res) => {
    try {
        const analyses = await JobDescriptionAnalysis.find({
            userId: String(req.user._id || req.user.id)
        }).sort({ createdAt: -1 }).limit(20);
        return res.json({ analyses });
    } catch (error) {
        console.error('Job description analysis history failed:', error.message);
        return res.status(500).json({ message: 'Could not load saved job-description analyses.' });
    }
});

router.post('/job-analyzer', authMiddleware, async (req, res) => {
    try {
        const { jobDescription, jobTitle, company } = req.body;
        if (typeof jobDescription !== 'string' || !jobDescription.trim()) {
            return res.status(400).json({ message: 'Job description text cannot be empty.' });
        }
        if (jobDescription.length > 50000) {
            return res.status(413).json({ message: 'Job description must be 50,000 characters or fewer.' });
        }
        if (jobTitle !== undefined &&
            (typeof jobTitle !== 'string' || jobTitle.trim().length > 120)) {
            return res.status(400).json({ message: 'Job title must be text with at most 120 characters.' });
        }
        if (company !== undefined &&
            (typeof company !== 'string' || company.trim().length > 120)) {
            return res.status(400).json({ message: 'Company must be text with at most 120 characters.' });
        }

        const userId = String(req.user._id || req.user.id);
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'Account not found.' });
        const analysis = analyzeJobDescriptionLocally({
            jobDescription: jobDescription.trim(),
            jobTitle,
            company,
            profile: user
        });

        const approval = getApprovedDataProcessingStatus('job_analyzer');
        if (approval.approved) {
            try {
                const aiAdvice = await generateJobDescriptionAdvice({
                    jobDescription: jobDescription.trim(),
                    jobTitle,
                    company,
                    profile: {
                        targetRole: user.targetRole,
                        technicalSkills: user.technicalSkills,
                        softSkills: user.softSkills
                    },
                    extractedRequirements: [
                        ...analysis.extractedRequirements,
                        ...analysis.matchedSoftSkills
                    ],
                    missingSkills: analysis.missingSkills
                });
                analysis.recommendations = aiAdvice.preparationSteps;
                analysis.interviewQuestions = aiAdvice.interviewQuestions;
                analysis.aiSummary = aiAdvice.summary;
                analysis.aiAdviceStatus = {
                    status: 'generated',
                    source: aiAdvice.source,
                    model: aiAdvice.model,
                    fallbackUsed: Boolean(aiAdvice.fallbackUsed)
                };
                analysis.analysisMethod = aiAdvice.source;
                analysis.recommendationMethod = aiAdvice.source;
            } catch (error) {
                if (!error.code?.startsWith('AI_')) throw error;
                console.warn('Approved job-description AI analysis unavailable:', error.code);
                analysis.aiAdviceStatus = {
                    status: 'unavailable',
                    reason: 'Advanced analysis failed; local requirement analysis is available.'
                };
            }
        } else {
            analysis.aiAdviceStatus.reason = approval.reason;
        }

        const saved = await new JobDescriptionAnalysis({
            userId,
            ...analysis
        }).save();
        return res.status(201).json({
            ...analysis,
            analysisId: saved._id,
            analyzedAt: saved.createdAt
        });
    } catch (error) {
        console.error('Job analyzer failed:', error.message);
        return res.status(500).json({ message: 'Failed to analyze the job description.' });
    }
});

// ----------------------------------------------------
// 10. DYNAMIC PLACEMENT READINESS SCORE
// ----------------------------------------------------
router.get('/readiness', optionalAuth, async (req, res) => {
    try {
        const userId = req.user._id || req.user.id;
        const user = await User.findById(userId) || req.user;

        const [assessment, submissions, interviews, roadmap, applications] = await Promise.all([
            CareerAssessment.findOne({ userId }).sort({ date: -1 }),
            CodeSubmission.find({ userId }),
            Interview.find({ userId }),
            CareerRoadmap.findOne({ userId, archivedAt: null }),
            JobApplication.find({ userId })
        ]);

        const profileCompletion = calculateProfileCompletion(user);
        const profileScore = profileCompletion.completionPercentage;

        let assessmentScore = 0;
        let hasAssessment = false;
        if (assessment && assessment.scores) {
            assessmentScore = assessment.scores.overallReadiness || 0;
            hasAssessment = true;
        }

        let codingScore = 0;
        const acceptedSubmissions = (submissions || []).filter(s => s.status === 'accepted');
        const uniqueSolvedProblems = new Set(acceptedSubmissions.map(s => String(s.problemId))).size;
        if (uniqueSolvedProblems > 0) {
            codingScore = Math.min(100, Math.round((uniqueSolvedProblems / 5) * 80 + (acceptedSubmissions.length > 0 ? 15 : 0)));
        }

        let interviewScore = 0;
        const interviewCount = (interviews || []).length;
        if (interviewCount > 0) {
            const sum = interviews.reduce((acc, curr) => acc + (curr.totalScore ?? 0), 0);
            interviewScore = Math.round(sum / interviewCount);
        }

        const resumeScore = user.resumeScore || 0;
        const roadmapScore = roadmap ? (roadmap.progressPercentage || 0) : 0;

        let weightedSum = 0;
        let totalWeight = 0;

        const factors = [
            { name: 'Coding Mastery', score: codingScore, weight: 25, active: uniqueSolvedProblems > 0 },
            { name: 'Career Assessment', score: assessmentScore, weight: 20, active: hasAssessment },
            { name: 'Mock Interviews', score: interviewScore, weight: 20, active: interviewCount > 0 },
            { name: 'Resume ATS Score', score: resumeScore, weight: 15, active: resumeScore > 0 },
            { name: 'Roadmap Progress', score: roadmapScore, weight: 10, active: roadmapScore > 0 },
            { name: 'Profile Depth', score: profileScore, weight: 10, active: true }
        ];

        factors.forEach(f => {
            if (f.active) {
                weightedSum += f.score * f.weight;
                totalWeight += f.weight;
            }
        });

        let overallScore = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
        if (totalWeight < 40) {
            overallScore = Math.min(overallScore, Math.round(overallScore * (totalWeight / 100) + 15));
        }

        let statusBadge = 'Needs Preparation';
        let statusColor = '#ef4444';
        if (overallScore >= 85) {
            statusBadge = 'Elite Candidate';
            statusColor = '#10b981';
        } else if (overallScore >= 75) {
            statusBadge = 'Placement Ready';
            statusColor = '#3b82f6';
        } else if (overallScore >= 55) {
            statusBadge = 'Interview Ready';
            statusColor = '#06b6d4';
        } else if (overallScore >= 35) {
            statusBadge = 'Building Foundations';
            statusColor = '#f59e0b';
        }

        const nextMilestones = [];
        if (!hasAssessment) {
            nextMilestones.push({ task: 'Take Career Assessment', impact: '+20% Readiness', url: '/assessment' });
        }
        if (uniqueSolvedProblems < 3) {
            nextMilestones.push({ task: `Solve ${3 - uniqueSolvedProblems} more coding challenges`, impact: '+15% Readiness', url: '/coding' });
        }
        if (interviewCount < 2) {
            nextMilestones.push({ task: 'Complete AI Mock Interview', impact: '+15% Readiness', url: '/interviews' });
        }
        if (resumeScore < 70) {
            nextMilestones.push({ task: 'Analyze and optimize resume with ATS', impact: '+15% Readiness', url: '/resume' });
        }
        if (roadmapScore < 50) {
            nextMilestones.push({ task: 'Complete Phase 1 Roadmap Milestones', impact: '+10% Readiness', url: '/roadmap' });
        }

        if (user.careerReadinessScore !== overallScore) {
            await User.findByIdAndUpdate(userId, { careerReadinessScore: overallScore });
        }

        res.json({
            overallScore,
            statusBadge,
            statusColor,
            breakdown: {
                coding: { score: codingScore, problemsSolved: uniqueSolvedProblems, weight: 25 },
                assessment: { score: assessmentScore, completed: hasAssessment, weight: 20 },
                interview: { score: interviewScore, count: interviewCount, weight: 20 },
                resume: { score: resumeScore, weight: 15 },
                roadmap: { score: roadmapScore, weight: 10 },
                profile: { score: profileScore, weight: 10 }
            },
            nextMilestones,
            user: {
                name: user.name,
                targetRole: user.targetRole || null,
                xp: user.xp || 0,
                level: user.level || 1,
                streak: user.streak || 1
            }
        });
    } catch (err) {
        console.error('Readiness error:', err);
        res.status(500).json({ message: 'Failed to compute readiness score.' });
    }
});

// ----------------------------------------------------
// 11. DETAILED PROGRESS ANALYTICS
// ----------------------------------------------------
router.get('/analytics/history', optionalAuth, async (req, res) => {
    try {
        const userId = req.user._id || req.user.id;
        const user = await User.findById(userId) || req.user;

        const [submissions, interviews, applications, roadmap, assessment] = await Promise.all([
            CodeSubmission.find({ userId }).sort({ submittedAt: 1 }),
            Interview.find({ userId }).sort({ date: 1 }),
            JobApplication.find({ userId }),
            CareerRoadmap.findOne({ userId, archivedAt: null }),
            CareerAssessment.findOne({ userId }).sort({ date: -1 })
        ]);

        const accepted = (submissions || []).filter(s => s.status === 'accepted');
        const failed = (submissions || []).filter(s => s.status !== 'accepted');
        const accuracyRate = submissions.length > 0
            ? Math.round((accepted.length / submissions.length) * 100)
            : 0;

        const interviewTrend = (interviews || []).map((inv, idx) => ({
            session: `Session ${idx + 1}`,
            score: inv.totalScore ?? 0,
            role: inv.role || 'Unspecified role',
            date: inv.date ? new Date(inv.date).toLocaleDateString() : 'No date recorded'
        }));

        const appStats = {
            total: applications.length,
            applied: applications.filter(a => a.status === 'Applied').length,
            screening: applications.filter(a => a.status === 'Shortlisted' || a.status === 'Screening').length,
            interview: applications.filter(a => a.status === 'Interview').length,
            offer: applications.filter(a => a.status === 'Selected' || a.status === 'Offer').length,
            rejected: applications.filter(a => a.status === 'Rejected').length
        };

        const technicalSkills = user.technicalSkills || [];
        const competencies = technicalSkills.map((skill, i) => ({
            skill,
            proficiency: null,
            status: 'Self-reported'
        }));

        res.json({
            user: {
                name: user.name,
                email: user.email,
                targetRole: user.targetRole || null,
                xp: user.xp || 0,
                level: user.level || 1,
                streak: user.streak || 1,
                readinessScore: user.careerReadinessScore || 0,
                resumeScore: user.resumeScore || 0
            },
            coding: {
                totalSubmissions: submissions.length,
                acceptedCount: accepted.length,
                failedCount: failed.length,
                accuracyRate
            },
            interviews: {
                totalSessions: interviews.length,
                averageScore: interviews.length > 0
                        ? Math.round(interviews.reduce((acc, curr) => acc + (curr.totalScore ?? 0), 0) / interviews.length)
                    : 0,
                trend: interviewTrend
            },
            applications: appStats,
            roadmapProgress: roadmap ? roadmap.progressPercentage : 0,
            assessmentScore: assessment?.scores?.overallReadiness || 0,
            competencies
        });
    } catch (err) {
        console.error('Analytics history error:', err);
        res.status(500).json({ message: 'Failed to fetch analytics history.' });
    }
});

// ----------------------------------------------------
// 12. CAREER ROLE RECOMMENDATIONS
// ----------------------------------------------------
const ROLE_REQUIREMENTS = {
    'AI/ML Engineer': {
        skills: ['Python', 'TensorFlow', 'PyTorch', 'Machine Learning', 'Deep Learning', 'NumPy', 'Pandas', 'Scikit-learn', 'Mathematics', 'Statistics'],
        minCgpa: 7.0,
        degrees: ['b.tech', 'm.tech', 'msc', 'b.e', 'be', 'bsc', 'computer science', 'data science', 'ai', 'artificial intelligence'],
        experienceKeywords: ['machine learning', 'ml', 'ai', 'deep learning', 'model', 'tensorflow', 'pytorch']
    },
    'Data Scientist': {
        skills: ['Python', 'R', 'Statistics', 'Machine Learning', 'SQL', 'Data Visualization', 'NumPy', 'Pandas', 'Jupyter'],
        minCgpa: 7.0,
        degrees: ['b.tech', 'm.tech', 'bsc', 'msc', 'statistics', 'mathematics', 'computer science', 'data science'],
        experienceKeywords: ['data', 'analytics', 'visualization', 'statistics', 'sql', 'python']
    },
    'Data Analyst': {
        skills: ['Excel', 'SQL', 'Python', 'Data Visualization', 'Tableau', 'Power BI', 'Statistics'],
        minCgpa: 6.5,
        degrees: ['b.tech', 'bsc', 'bba', 'mba', 'msc', 'statistics', 'mathematics', 'computer science'],
        experienceKeywords: ['data', 'analytics', 'report', 'dashboard', 'sql', 'excel']
    },
    'Software Developer': {
        skills: ['Java', 'C++', 'Python', 'Data Structures', 'Algorithms', 'Git', 'SQL'],
        minCgpa: 6.0,
        degrees: ['b.tech', 'be', 'b.e', 'm.tech', 'mca', 'bsc', 'computer science', 'information technology'],
        experienceKeywords: ['software', 'developer', 'development', 'java', 'python', 'c++']
    },
    'Backend Developer': {
        skills: ['Node.js', 'Python', 'Java', 'SQL', 'MongoDB', 'REST APIs', 'Docker', 'Redis'],
        minCgpa: 6.0,
        degrees: ['b.tech', 'be', 'm.tech', 'bsc', 'mca', 'computer science', 'information technology'],
        experienceKeywords: ['backend', 'api', 'server', 'node', 'express', 'django', 'spring', 'rest']
    },
    'Frontend Developer': {
        skills: ['JavaScript', 'React', 'HTML/CSS', 'TypeScript', 'Vue.js', 'Git', 'Responsive Design'],
        minCgpa: 6.0,
        degrees: ['b.tech', 'be', 'bsc', 'mca', 'computer science', 'information technology'],
        experienceKeywords: ['frontend', 'ui', 'react', 'javascript', 'html', 'css', 'angular', 'vue']
    },
    'Full Stack Developer': {
        skills: ['JavaScript', 'React', 'Node.js', 'HTML/CSS', 'SQL', 'MongoDB', 'Git', 'REST APIs'],
        minCgpa: 6.0,
        degrees: ['b.tech', 'be', 'bsc', 'mca', 'computer science', 'information technology'],
        experienceKeywords: ['full stack', 'fullstack', 'react', 'node', 'javascript', 'web', 'mern']
    },
    'Cloud Engineer': {
        skills: ['AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'Linux', 'Terraform', 'CI/CD'],
        minCgpa: 6.5,
        degrees: ['b.tech', 'be', 'm.tech', 'bsc', 'computer science', 'information technology', 'networking'],
        experienceKeywords: ['cloud', 'aws', 'azure', 'gcp', 'devops', 'infrastructure', 'docker', 'kubernetes']
    },
    'Cybersecurity Analyst': {
        skills: ['Networking', 'Linux', 'Python', 'Security Tools', 'Cryptography', 'Ethical Hacking'],
        minCgpa: 6.5,
        degrees: ['b.tech', 'be', 'bsc', 'm.tech', 'computer science', 'information technology', 'cybersecurity', 'networking'],
        experienceKeywords: ['security', 'cyber', 'ethical hacking', 'penetration', 'firewall', 'network', 'vulnerability']
    }
};

router.get('/recommendations', optionalAuth, async (req, res) => {
    try {
        const userId = req.user._id || req.user.id;
        const user = await User.findById(userId) || req.user;

        const userSkillsRaw = [
            ...(user.technicalSkills || []),
            ...(user.softSkills || [])
        ].filter(skill => typeof skill === 'string' && skill.trim());
        const userSkillsLower = userSkillsRaw.map(skill => skill.trim().toLowerCase());
        const normalizeWords = value => String(value).toLowerCase()
            .replace(/[^a-z0-9+#.]+/g, ' ').trim().split(/\s+/).filter(Boolean);

        // Parse CGPA — strip non-numeric suffix like '%'
        const cgpaStr = (user.cgpa || '').replace(/[^0-9.]/g, '');
        const userCgpa = parseFloat(cgpaStr) || 0;
        const hasCgpa = cgpaStr.length > 0;
        const userDegree = (user.degree || '').toLowerCase();
        const userBranch = (user.branch || '').toLowerCase();
        const userExpText = (user.experience || [])
            .map(e => `${e.role || ''} ${e.company || ''} ${e.description || ''}`.toLowerCase())
            .join(' ');

        const results = Object.entries(ROLE_REQUIREMENTS).map(([roleName, req]) => {
            // --- Skill overlap (60%) ---
            const reqSkillsLower = req.skills.map(s => s.toLowerCase());
            const matchedSkills = [];
            const missingSkills = [];

            reqSkillsLower.forEach((rs, idx) => {
                const requiredWords = normalizeWords(rs);
                const found = userSkillsLower.some(profileSkill =>
                    normalizeWords(profileSkill).some(word => requiredWords.includes(word))
                );
                if (found) {
                    matchedSkills.push(req.skills[idx]);
                } else {
                    missingSkills.push(req.skills[idx]);
                }
            });

            const skillRatio = req.skills.length > 0 ? matchedSkills.length / req.skills.length : 0;
            const skillScore = Math.round(skillRatio * 100);

            // --- Education relevance (20%) ---
            const degreeText = `${userDegree} ${userBranch}`;
            const degreeMatch = req.degrees.some(d => degreeText.includes(d));
            const cgpaOk = hasCgpa && userCgpa >= req.minCgpa;
            const educationScore = (degreeMatch ? 70 : 0) + (hasCgpa ? (cgpaOk ? 30 : 0) : 0);

            // --- Experience relevance (20%) ---
            const expMatches = req.experienceKeywords.filter(kw => userExpText.includes(kw)).length;
            const expRatio = req.experienceKeywords.length > 0 ? expMatches / req.experienceKeywords.length : 0;
            const experienceScore = (user.experience || []).length > 0
                ? Math.round(expRatio * 100)
                : 0;

            // --- Weighted total ---
            const matchScore = Math.round(
                (skillScore * 0.60) + (educationScore * 0.20) + (experienceScore * 0.20)
            );

            // Build human-readable reasoning
            const reasons = [];
            if (skillRatio >= 0.6) reasons.push(`Strong skill alignment (${matchedSkills.length}/${req.skills.length} skills matched)`);
            else if (skillRatio >= 0.3) reasons.push(`Moderate skill overlap (${matchedSkills.length}/${req.skills.length} skills matched)`);
            else reasons.push(`Growing potential — ${req.skills.length - matchedSkills.length} skills to acquire`);
            if (degreeMatch) reasons.push('Degree / branch is highly relevant');
            if (cgpaOk && userCgpa > 0) reasons.push(`CGPA ${userCgpa} meets the ${req.minCgpa}+ threshold`);
            if (expMatches > 0) reasons.push(`Experience mentions relevant keywords (${expMatches} matched)`);

            return {
                role: roleName,
                matchScore: Math.min(100, Math.max(0, matchScore)),
                matchedSkills,
                missingSkills,
                whyRecommended: reasons.join('. ') + '.',
                prioritySkillsToLearn: missingSkills.slice(0, 3)
            };
        });

        // Sort descending and return top 5
        results.sort((a, b) => b.matchScore - a.matchScore);
        let top5 = results.slice(0, 5);
        const aiAdvice = await generateCareerRecommendationAdvice({
            profile: user,
            recommendations: top5
        });
        const adviceByRole = new Map(aiAdvice.recommendations.map(item => [item.role, item]));
        top5 = top5.map(item => ({
            ...item,
            aiExplanation: adviceByRole.get(item.role)?.explanation || null,
            aiNextSteps: adviceByRole.get(item.role)?.nextSteps || [],
            explanationSource: aiAdvice.source
        }));

        res.json({
            recommendations: top5,
            aiAdviceStatus: { status: 'generated', source: aiAdvice.source, model: aiAdvice.model },
            methodology: 'Role matches combine listed-skill overlap (60%), education/CGPA alignment (20%), and experience-keyword overlap (20%). Profile skills and experience are self-reported and not independently verified.',
            basedOn: {
                skills: userSkillsRaw,
                cgpa: userCgpa,
                degree: user.degree,
                branch: user.branch,
                experienceCount: (user.experience || []).length
            }
        });
    } catch (err) {
        if (err.code?.startsWith('AI_')) {
            return res.status(err.status || 502).json({
                code: err.code,
                message: providerErrorMessage(err.code, 'Career recommendations', err)
            });
        }
        console.error('Recommendations error:', err);
        res.status(500).json({ message: 'Failed to compute career recommendations.' });
    }
});

module.exports = router;
