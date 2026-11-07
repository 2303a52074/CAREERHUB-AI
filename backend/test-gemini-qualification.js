require('./utils/loadEnv')();

const aiService = require('./utils/aiService');

const resumeText = 'Backend engineer with experience building Node.js APIs, PostgreSQL schemas, automated tests, and Docker deployments. Improved query performance through indexing and documented service operations.';
const role = 'Backend Engineer';
const profile = { targetRole: role, technicalSkills: ['Node.js', 'PostgreSQL'], availableHoursPerWeek: 6 };
const supportedFeatures = [
    'assessment_question_generation',
    'assessment_insights',
    'technical_interview_generation',
    'behavioral_interview_generation',
    'video_interview_generation',
    'interview_evaluation',
    'resume_analysis',
    'pdf_resume_analysis',
    'docx_resume_analysis',
    'job_analyzer',
    'skill_gap_guidance',
    'career_roadmap',
    'daily_plan',
    'coding_hint',
    'coding_review',
    'career_assistant',
    'career_recommendations',
    'learning_resources',
    'job_fit_explanation',
    'interview_question'
];

const workflows = [
    {
        feature: 'assessment_question_generation',
        run: () => aiService.generateMcqQuestions({
            role,
            topic: 'Software engineering and system design',
            difficulty: 'medium',
            count: 5,
            profile
        }),
        valid: result => result.source === 'gemini' && result.questions?.length === 5
    },
    {
        feature: 'assessment_insights',
        run: () => aiService.generateAssessmentInsights({
            targetRole: role,
            evaluation: {
                scores: { aptitude: 70, technical: 80, problemSolving: 75, communication: 65, roleSpecific: 78 },
                strengths: ['Technical'],
                weaknesses: ['Communication'],
                skillGaps: ['AWS']
            },
            profile
        }),
        valid: result => result.source === 'gemini' &&
            typeof result.summary === 'string' &&
            Array.isArray(result.strengths) &&
            Array.isArray(result.focusAreas) &&
            Array.isArray(result.nextSteps)
    },
    {
        feature: 'technical_interview_generation',
        run: () => aiService.generateInterviewQuestions({
            role, difficulty: 'medium', type: 'Technical', count: 1, profile
        }),
        valid: result => result.source === 'gemini' && result.questions?.length === 1
    },
    {
        feature: 'behavioral_interview_generation',
        run: () => aiService.generateInterviewQuestions({
            role, difficulty: 'medium', type: 'Behavioral', count: 1, profile
        }),
        valid: result => result.source === 'gemini' && result.questions?.length === 1
    },
    {
        feature: 'video_interview_generation',
        run: () => aiService.generateInterviewQuestions({
            role,
            difficulty: 'medium',
            type: 'Technical',
            count: 1,
            profile,
            feature: 'video_interview_generation'
        }),
        valid: result => result.source === 'gemini' && result.questions?.length === 1
    },
    {
        feature: 'interview_evaluation',
        run: () => aiService.evaluateAnswer(
            'Describe how you would debug a slow API endpoint.',
            'I would inspect latency metrics and traces, identify the slow dependency, reproduce the issue, and verify a measured fix.',
            { role, topic: 'Performance', difficulty: 'medium' }
        ),
        valid: result => result.source === 'gemini' &&
            typeof result.feedback === 'string' && result.rubric
    },
    {
        feature: 'interview_question',
        run: () => aiService.generateQuestion(role, 'medium'),
        valid: result => result.source === 'gemini' &&
            typeof result.question === 'string' && result.question.length >= 15
    },
    ...['resume_analysis', 'pdf_resume_analysis', 'docx_resume_analysis'].map(feature => ({
        feature,
        run: () => aiService.analyzeResume(resumeText, role, profile, '', feature),
        valid: result => result.analysisMethod === 'gemini' &&
            Number.isFinite(result.score) && Array.isArray(result.detectedSkills)
    })),
    {
        feature: 'job_analyzer',
        run: () => aiService.generateJobDescriptionAdvice({
            jobTitle: role,
            company: 'Synthetic Test Company',
            jobDescription: 'Build Node.js APIs, optimize PostgreSQL queries, and operate services on AWS.',
            extractedRequirements: ['Node.js', 'PostgreSQL', 'AWS'],
            missingSkills: ['AWS'],
            profile
        }),
        valid: result => result.source === 'gemini' &&
            typeof result.summary === 'string' && Array.isArray(result.preparationSteps)
    },
    {
        feature: 'skill_gap_guidance',
        run: () => aiService.generateSkillGapAdvice({
            targetRole: role,
            matchedSkills: ['Node.js', 'PostgreSQL'],
            missingSkills: ['AWS'],
            profile
        }),
        valid: result => result.source === 'gemini' && Array.isArray(result.insights)
    },
    {
        feature: 'career_roadmap',
        run: () => aiService.generatePersonalizedRoadmap({
            ...profile,
            missingSkills: ['AWS', 'Docker']
        }),
        valid: result => result.source === 'gemini' &&
            result.phases?.length >= 3 &&
            result.phases.every(phase => phase.milestones?.length > 0)
    },
    {
        feature: 'daily_plan',
        run: () => aiService.generateDailyPreparationTasks({
            profile,
            pendingMilestone: 'Add a tested database migration'
        }),
        valid: result => result.source === 'gemini' && result.tasks?.length === 5
    },
    {
        feature: 'coding_hint',
        run: () => aiService.generateCodingHint({
            title: 'Find duplicate values',
            description: 'Given an array of integers, identify the values that occur more than once.'
        }),
        valid: result => result.source === 'gemini' &&
            typeof result.hint === 'string' && Array.isArray(result.concepts)
    },
    {
        feature: 'coding_review',
        run: () => aiService.evaluateCode(
            'Return the largest number in an array.',
            'function largest(values) { return Math.max(...values); }'
        ),
        valid: result => result.source === 'gemini' &&
            Number.isFinite(result.score) &&
            typeof result.feedback === 'string' && result.feedback.length > 0
    },
    {
        feature: 'career_recommendations',
        run: () => aiService.generateCareerRecommendationAdvice({
            profile,
            recommendations: [{
                role,
                matchScore: 82,
                matchedSkills: ['Node.js', 'PostgreSQL'],
                missingSkills: ['AWS']
            }]
        }),
        valid: result => result.source === 'gemini' &&
            result.recommendations?.length === 1 &&
            result.recommendations[0].role === role
    },
    {
        feature: 'learning_resources',
        run: () => aiService.recommendLearningResources({
            profile,
            missingSkills: ['AWS', 'Docker']
        }),
        valid: result => result.source === 'gemini' &&
            Array.isArray(result.resources) &&
            result.resources.length <= 6 &&
            result.resources.every(resource => resource.url && resource.title)
    },
    {
        feature: 'job_fit_explanation',
        run: () => aiService.explainJobFit({
            job: {
                title: 'Backend Engineer',
                organization: 'Synthetic Test Company',
                location: 'Remote',
                type: 'Full time',
                source: 'Synthetic qualification fixture'
            },
            profile,
            match: {
                overallMatch: 82,
                matchedSkills: ['Node.js', 'PostgreSQL'],
                missingSkills: ['AWS']
            }
        }),
        valid: result => result.source === 'gemini' &&
            typeof result.explanation === 'string' &&
            Array.isArray(result.alignedSkills) &&
            Array.isArray(result.skillsToBuild)
    },
    {
        feature: 'career_assistant',
        run: () => aiService.chatCareerAssistant(
            'Suggest one practical way to prepare for a backend system-design interview.',
            [],
            { targetRole: role, technicalSkills: ['Node.js'] },
            { source: 'Synthetic qualification context; no personal records.' }
        ),
        valid: result => result.source === 'gemini' &&
            typeof result.reply === 'string' && result.reply.trim().length >= 25
    }
];
const providerMetrics = [];
const originalConsoleInfo = console.info;
console.info = (label, serialized) => {
    if (label === 'Gemini request metrics:' && typeof serialized === 'string') {
        try {
            providerMetrics.push(JSON.parse(serialized));
        } catch {
            originalConsoleInfo('Gemini emitted an unparseable safe metrics record.');
        }
        return;
    }
    originalConsoleInfo(label, serialized);
};

function classifyError(error) {
    if (error?.code === 'AI_PROVIDER_QUOTA_EXCEEDED') return 'quota_exhausted';
    if (error?.code === 'AI_RATE_LIMITED') return 'rate_limited';
    if (error?.code === 'AI_PROVIDER_TIMEOUT') return 'timeout';
    if (error?.code === 'AI_PROVIDER_AUTH_ERROR') return 'authentication_error';
    if (error?.code === 'AI_MODEL_INVALID') return 'model_unavailable';
    if (error?.code === 'AI_PROVIDER_INVALID_OUTPUT') return 'invalid_output';
    if (error?.code?.startsWith('AI_PROVIDER_')) return 'provider_error';
    return 'application_error';
}

function percentile(values, ratio) {
    if (!values.length) return null;
    const ordered = [...values].sort((a, b) => a - b);
    return ordered[Math.ceil(ratio * ordered.length) - 1];
}

function median(values) {
    if (!values.length) return null;
    const ordered = [...values].sort((a, b) => a - b);
    const middle = Math.floor(ordered.length / 2);
    return ordered.length % 2
        ? ordered[middle]
        : Math.round((ordered[middle - 1] + ordered[middle]) / 2);
}

async function main() {
    const requestedFeatures = process.argv.slice(2)
        .filter(argument => argument.startsWith('--feature='))
        .map(argument => argument.slice('--feature='.length));
    const sampleArg = process.argv.find(argument => argument.startsWith('--samples='));
    const requestedSamples = sampleArg ? Number(sampleArg.slice('--samples='.length)) : 10;
    const delayArg = process.argv.find(argument => argument.startsWith('--delay-ms='));
    const delayMs = delayArg ? Number(delayArg.slice('--delay-ms='.length)) : 6500;
    if (!Number.isInteger(requestedSamples) || requestedSamples < 1 || requestedSamples > 10) {
        throw new Error('--samples must be an integer from 1 to 10.');
    }
    if (!Number.isInteger(delayMs) || delayMs < 6000 || delayMs > 60000) {
        throw new Error('--delay-ms must be an integer from 6000 to 60000.');
    }
    const selected = requestedFeatures.length
        ? workflows.filter(workflow => requestedFeatures.includes(workflow.feature))
        : workflows;
    const unknown = requestedFeatures.filter(feature =>
        !supportedFeatures.includes(feature));
    if (unknown.length) throw new Error(`Unknown feature names: ${unknown.join(', ')}`);
    const results = [];

    if (!process.env.GEMINI_API_KEY?.trim()) {
        console.log(JSON.stringify({
            model: process.env.GEMINI_MODEL?.trim() || 'gemini-3.1-flash-lite',
            realProviderRequests: 0,
            stopReason: 'missing_api_key',
            results: selected.map(workflow => ({
                feature: workflow.feature,
                provider: 'gemini',
                requested: requestedSamples,
                attempted: 0,
                valid: 0,
                errors: {},
                httpStatuses: [],
                medianLatencyMs: null,
                p90LatencyMs: null,
                qualification: 'BLOCKED_NO_API_KEY'
            }))
        }, null, 2));
        process.exitCode = 2;
        return;
    }
    if (!process.argv.includes('--confirm-free-tier-only')) {
        console.log(JSON.stringify({
            model: process.env.GEMINI_MODEL?.trim() || 'gemini-3.1-flash-lite',
            realProviderRequests: 0,
            stopReason: 'free_tier_not_confirmed',
            message: 'No requests sent. Confirm that this API project cannot bill, then pass --confirm-free-tier-only.',
            results: selected.map(workflow => ({
                feature: workflow.feature,
                provider: 'gemini',
                requested: requestedSamples,
                attempted: 0,
                valid: 0,
                httpStatuses: [],
                qualification: 'BLOCKED_FREE_TIER_NOT_CONFIRMED'
            }))
        }, null, 2));
        process.exitCode = 2;
        return;
    }

    process.env.NODE_ENV = 'test';
    process.env.GEMINI_QUALIFICATION_MODE = 'true';
    process.env.AI_PROVIDER = 'gemini';
    process.env.GEMINI_PRIMARY_FEATURES = supportedFeatures.join(',');
    process.env.GROQ_PRIMARY_FEATURES = '';
    process.env.GROQ_FALLBACK_FEATURES = '';
    process.env.OPENROUTER_ROLLBACK_FEATURES = '';

    for (const workflow of selected) {
        const latencies = [];
        const errors = {};
        let valid = 0;
        let attempted = 0;
        const providerErrorDetails = [];
        for (let index = 0; index < requestedSamples; index++) {
            attempted++;
            const startedAt = Date.now();
            try {
                const result = await workflow.run();
                latencies.push(Date.now() - startedAt);
                if (!workflow.valid(result)) throw Object.assign(
                    new Error('Production workflow result did not match expected shape.'),
                    { code: 'AI_PROVIDER_INVALID_OUTPUT' }
                );
                valid++;
            } catch (error) {
                latencies.push(Date.now() - startedAt);
                const category = classifyError(error);
                errors[`${category}:${error.code || 'UNKNOWN'}`] =
                    (errors[`${category}:${error.code || 'UNKNOWN'}`] || 0) + 1;
                if (error.providerDiagnostics) {
                    providerErrorDetails.push({
                        code: error.code || null,
                        ...error.providerDiagnostics
                    });
                }
                if (['rate_limited', 'quota_exhausted', 'authentication_error'].includes(category)) {
                    break;
                }
            }
            if (index + 1 < requestedSamples) await new Promise(resolve => setTimeout(resolve, delayMs));
        }
        const metrics = providerMetrics.filter(metric => metric.feature === workflow.feature);
        const sumMetric = name => {
            const values = metrics.map(metric => metric[name]).filter(Number.isFinite);
            return values.length ? values.reduce((sum, value) => sum + value, 0) : null;
        };
        const successRate = attempted ? Math.round((valid / attempted) * 100) : 0;
        results.push({
            feature: workflow.feature,
            provider: metrics[0]?.provider?.toLowerCase() || 'gemini',
            requested: requestedSamples,
            attempted,
            valid,
            successRate,
            errors,
            providerErrorDetails,
            httpStatuses: metrics.map(metric => metric.httpStatus).filter(Number.isInteger),
            providerRequests: metrics.length,
            medianLatencyMs: median(latencies),
            p90LatencyMs: percentile(latencies, 0.9),
            promptTokens: sumMetric('providerPromptTokens'),
            outputTokens: sumMetric('outputTokens'),
            totalTokens: sumMetric('totalTokens'),
            estimatedCostUsd: sumMetric('providerReportedCostUsd'),
            model: process.env.GEMINI_MODEL?.trim() || 'gemini-3.1-flash-lite',
            qualification: attempted >= 10 && valid >= 9
                ? 'QUALIFIED'
                : attempted < 10 ? 'INSUFFICIENT_SAMPLE' : 'NOT_QUALIFIED'
        });
        if (Object.keys(errors).some(key =>
            /rate_limited|quota_exhausted|authentication_error/.test(key))) {
            break;
        }
    }

    console.log(JSON.stringify({
        realProviderRequests: providerMetrics.length,
        validResponses: results.reduce((sum, result) => sum + result.valid, 0),
        rateLimitCount: results.reduce((sum, result) =>
            sum + Object.entries(result.errors || {})
                .filter(([key]) => key.startsWith('rate_limited:'))
                .reduce((count, [, value]) => count + value, 0), 0),
        timeoutCount: results.reduce((sum, result) =>
            sum + Object.entries(result.errors || {})
                .filter(([key]) => key.startsWith('timeout:'))
                .reduce((count, [, value]) => count + value, 0), 0),
        model: process.env.GEMINI_MODEL?.trim() || 'gemini-3.1-flash-lite',
        dataSource: 'Real Google Gemini API requests; synthetic, non-personal fixtures only.',
        stopReason: results.some(result => Object.keys(result.errors).some(key =>
            /rate_limited|quota_exhausted|authentication_error/.test(key)))
            ? 'provider_limit_or_authentication_error'
            : null,
        results
    }, null, 2));
    console.info = originalConsoleInfo;
    if (results.some(result => result.qualification !== 'QUALIFIED')) process.exitCode = 1;
}

main().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
});
