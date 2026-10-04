const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const User = require('../models/User');
const JobOpportunity = require('../models/JobOpportunity');
const JobApplication = require('../models/JobApplication');
const CareerAssessment = require('../models/CareerAssessment');
const CareerRoadmap = require('../models/CareerRoadmap');
const DailyPlan = require('../models/DailyPlan');
const Interview = require('../models/Interview');
const CodeSubmission = require('../models/CodeSubmission');
const CodingProblem = require('../models/CodingProblem');
const {
    chatCareerAssistant,
    getAssessmentQuestions,
    evaluateAssessmentSubmission
} = require('../utils/aiService');

// Optional auth helper: if token is present, verifies user; otherwise falls back to demo candidate
async function optionalAuth(req, res, next) {
    const authHeader = req.header('Authorization');
    if (authHeader) {
        try {
            return authMiddleware(req, res, next);
        } catch (e) {
            // fallback to demo user
        }
    }
    const demoUser = await User.findOne({ email: 'demo@example.com' }) || (await User.find())[0];
    req.user = demoUser || { _id: 'user-demo-1', id: 'user-demo-1', name: 'Demo Candidate', role: 'admin' };
    next();
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
        completionPercentage: Math.min(100, Math.max(10, totalScore)),
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

    const skillsScore = requiredSkills.length > 0
        ? Math.round((matchedSkills.length / requiredSkills.length) * 100)
        : 85;

    // Education Match
    const eduText = (opp.eligibility || "").toLowerCase();
    const userDegree = (user.degree || "").toLowerCase();
    let educationScore = 80;
    if (userDegree && eduText.includes(userDegree)) {
        educationScore = 95;
    } else if (eduText.includes('b.tech') || eduText.includes('engineering') || eduText.includes('all')) {
        educationScore = 90;
    }

    // Role Match
    const targetRole = (user.targetRole || user.preferredRoles?.[0] || "").toLowerCase();
    const oppRole = (opp.title || "").toLowerCase();
    let roleScore = 75;
    if (targetRole && (oppRole.includes(targetRole) || targetRole.includes(oppRole))) {
        roleScore = 95;
    } else if (oppRole.includes('software') || oppRole.includes('developer') || oppRole.includes('engineer')) {
        roleScore = 85;
    }

    // Experience Match
    const expCount = (user.experience || []).length;
    const expScore = expCount > 0 ? 90 : 70;

    // Location Match
    const userLocs = (user.preferredLocations || []).map(l => l.toLowerCase());
    const oppLoc = (opp.location || "").toLowerCase();
    const locationScore = oppLoc.includes('remote') || userLocs.some(l => oppLoc.includes(l)) ? 95 : 80;

    const overallMatch = Math.round(
        (skillsScore * 0.45) + (roleScore * 0.20) + (educationScore * 0.15) + (locationScore * 0.10) + (expScore * 0.10)
    );

    return {
        overallMatch: Math.min(99, Math.max(50, overallMatch)),
        skillsMatch: skillsScore,
        educationMatch: educationScore,
        roleMatch: roleScore,
        experienceMatch: expScore,
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

        // Fetch recent assessment or compute baseline
        const assessments = await CareerAssessment.find({ userId }).sort({ createdAt: -1 });
        const latestAssessment = assessments[0];
        const readinessScore = latestAssessment ? latestAssessment.readinessScore : (user.readinessScore || 82);

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
                targetRole: user.targetRole || "Full Stack Developer",
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
router.post('/assistant', optionalAuth, async (req, res) => {
    try {
        const { message, history } = req.body;
        if (!message || !message.trim()) {
            return res.status(400).json({ message: "Message cannot be empty." });
        }

        const user = req.user || {};
        const reply = await chatCareerAssistant(message, history || [], user);
        res.json({ reply, timestamp: new Date() });
    } catch (err) {
        console.error('Career Assistant error:', err);
        res.status(500).json({ message: "Assistant failed to generate response." });
    }
});

// ----------------------------------------------------
// 2. CAREER PROFILE
// ----------------------------------------------------
router.get('/profile', optionalAuth, async (req, res) => {
    try {
        const user = await User.findById(req.user._id || req.user.id);
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
        const userId = req.user._id || req.user.id;
        const updateData = req.body;

        // Prevent modifying sensitive authentication fields directly via this route
        delete updateData.password;
        delete updateData.role;

        const updatedUser = await User.findByIdAndUpdate(userId, updateData, { new: true });
        const completion = calculateProfileCompletion(updatedUser);

        res.json({
            message: "Profile updated successfully.",
            user: updatedUser,
            ...completion
        });
    } catch (err) {
        console.error('Profile update error:', err);
        res.status(500).json({ message: "Failed to update profile." });
    }
});

// ----------------------------------------------------
// 3. AI CAREER ASSESSMENT
// ----------------------------------------------------
router.get('/assessment/questions', optionalAuth, (req, res) => {
    try {
        const questions = getAssessmentQuestions();
        // Send questions without answers to frontend
        const sanitized = questions.map((q, idx) => ({
            id: idx + 1,
            category: q.category,
            question: q.question,
            options: q.options
        }));
        res.json({ questions: sanitized });
    } catch (err) {
        res.status(500).json({ message: "Failed to fetch assessment questions." });
    }
});

router.post('/assessment/submit', optionalAuth, async (req, res) => {
    try {
        const { answers, targetRole } = req.body;
        const userId = req.user._id || req.user.id;

        const evaluation = evaluateAssessmentSubmission(answers || []);

        // Save assessment record
        const assessment = new CareerAssessment({
            userId,
            targetRole: targetRole || 'Full Stack Developer',
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
            detailedAnswers: evaluation.breakdown.map(b => ({
                category: b.category,
                question: b.question,
                userAnswer: b.userAnswer || '',
                correctAnswer: b.correctAnswer || '',
                isCorrect: !!b.isCorrect,
                feedback: b.explanation || ''
            }))
        });
        await assessment.save();

        // Update user readiness score
        await User.findByIdAndUpdate(userId, {
            careerReadinessScore: evaluation.overallReadiness,
            targetRole: targetRole || 'Full Stack Developer'
        });

        res.json({
            message: "Assessment submitted successfully!",
            assessmentId: assessment._id,
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
        if (!latest) {
            // Return high quality baseline default assessment based on user profile
            const user = await User.findById(userId);
            return res.json({
                overallReadiness: user?.careerReadinessScore || 78,
                scores: {
                    aptitude: 80,
                    technical: 85,
                    problemSolving: 75,
                    communication: 80,
                    roleSpecific: 70
                },
                strengths: [
                    "Strong grasp of frontend web technologies and React lifecycle",
                    "Solid understanding of REST API design and backend paradigms",
                    "Rapid code debugging and root-cause analysis"
                ],
                weaknesses: [
                    "Containerization with Docker and microservices deployment",
                    "High-volume database indexing and query tuning"
                ],
                skillGaps: ["Docker", "PostgreSQL Advanced Queries", "System Design Basics"],
                recommendedSkills: ["Docker & Kubernetes", "PostgreSQL", "System Design", "TypeScript", "Redis Caching"],
                suitableRoles: ["Full Stack Developer", "Frontend Engineer", "Software Development Engineer 1"]
            });
        }
        res.json(latest);
    } catch (err) {
        res.status(500).json({ message: "Failed to fetch assessment." });
    }
});

// ----------------------------------------------------
// 4. JOBS & INTERNSHIPS WITH AI MATCHING
// ----------------------------------------------------
router.get('/opportunities', optionalAuth, async (req, res) => {
    try {
        const { type, search } = req.query;
        let filter = {};
        if (type && type !== 'all') {
            filter.type = type;
        }

        let items = await JobOpportunity.find(filter);
        const user = await User.findById(req.user._id || req.user.id) || req.user;

        // Augment each opportunity with match calculations tailored to this user
        let enriched = items.map(item => {
            const matchInfo = computeOpportunityMatch(user, item);
            return {
                ...item,
                ...matchInfo
            };
        });

        // Search filtering
        if (search) {
            const q = search.toLowerCase();
            enriched = enriched.filter(item =>
                (item.title && item.title.toLowerCase().includes(q)) ||
                (item.organization && item.organization.toLowerCase().includes(q)) ||
                (item.requiredSkills && item.requiredSkills.some(s => s.toLowerCase().includes(q)))
            );
        }

        // Sort by match percentage descending
        enriched.sort((a, b) => b.overallMatch - a.overallMatch);

        res.json({
            opportunities: enriched,
            total: enriched.length
        });
    } catch (err) {
        console.error('Opportunities error:', err);
        res.status(500).json({ message: "Failed to fetch opportunities." });
    }
});

// ----------------------------------------------------
// 5. SKILL GAP ANALYSIS
// ----------------------------------------------------
router.get('/skill-gap', optionalAuth, async (req, res) => {
    try {
        const user = await User.findById(req.user._id || req.user.id) || req.user;
        const targetRole = req.query.role || user.targetRole || 'Full Stack Developer';

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
            ]
        };

        const standard = roleSkillStandards[targetRole] || roleSkillStandards['Full Stack Developer'];
        const userSkills = (user.technicalSkills || []).map(s => s.toLowerCase());

        const matched = [];
        const missing = [];

        standard.forEach(item => {
            const hasSkill = userSkills.some(us => us.includes(item.skill.toLowerCase().split(' ')[0]) || item.skill.toLowerCase().includes(us));
            if (hasSkill) {
                matched.push({ ...item, status: 'acquired' });
            } else {
                missing.push({ ...item, status: 'missing' });
            }
        });

        const matchPercent = Math.round((matched.length / standard.length) * 100);

        res.json({
            targetRole,
            matchPercentage: matchPercent,
            totalSkillsRequired: standard.length,
            acquiredCount: matched.length,
            missingCount: missing.length,
            matchedSkills: matched,
            missingSkills: missing,
            learningRoadmap: missing.map(m => ({
                skill: m.skill,
                priority: m.priority,
                estimatedHours: m.priority === 'High' ? '15-20 hrs' : '8-12 hrs',
                recommendedCourse: `Mastering ${m.skill} for Technical Placement`,
                practiceAction: `Build a small proof-of-concept incorporating ${m.skill}.`
            }))
        });
    } catch (err) {
        console.error('Skill gap error:', err);
        res.status(500).json({ message: "Failed to compute skill gap." });
    }
});

// ----------------------------------------------------
// 6. AI CAREER ROADMAP
// ----------------------------------------------------
router.get('/roadmap', optionalAuth, async (req, res) => {
    try {
        const userId = req.user._id || req.user.id;
        let roadmap = await CareerRoadmap.findOne({ userId });

        if (!roadmap) {
            // Seed a default roadmap for user
            roadmap = new CareerRoadmap({
                userId,
                targetRole: req.user.targetRole || 'Full Stack Developer',
                progressPercentage: 55,
                phases: [
                    {
                        phaseNumber: 1,
                        title: 'Phase 1 — Fundamentals & Core Architecture',
                        description: 'Master core engineering fundamentals, data structures, and foundational web protocols.',
                        status: 'completed',
                        milestones: [
                            { id: 'm1-1', title: 'Master Advanced JavaScript (Closures, Event Loop, Promises, Prototypes)', completed: true },
                            { id: 'm1-2', title: 'Solidify React 19 component lifecycle, custom hooks, and state paradigms', completed: true },
                            { id: 'm1-3', title: 'Design clean RESTful API contracts with Express & TypeScript', completed: true },
                            { id: 'm1-4', title: 'Solve 25+ LeetCode problems across Arrays, Two Pointers, and Strings', completed: true }
                        ]
                    },
                    {
                        phaseNumber: 2,
                        title: 'Phase 2 — Full-Stack Projects & Production Craft',
                        description: 'Build real-world multi-tier applications with authentication, databases, and automated testing.',
                        status: 'in-progress',
                        milestones: [
                            { id: 'm2-1', title: 'Build and deploy an end-to-end full stack application with relational PostgreSQL/SQL', completed: true },
                            { id: 'm2-2', title: 'Implement secure JWT authentication with refresh rotation and RBAC roles', completed: true },
                            { id: 'm2-3', title: 'Containerize application microservices with Docker and Docker Compose', completed: false },
                            { id: 'm2-4', title: 'Add unit and integration tests with Jest/Supertest achieving >80% code coverage', completed: false }
                        ]
                    },
                    {
                        phaseNumber: 3,
                        title: 'Phase 3 — Resume Optimization & ATS Tuning',
                        description: 'Transform project bullet points using Google XYZ formula and pass modern ATS screening.',
                        status: 'in-progress',
                        milestones: [
                            { id: 'm3-1', title: 'Run resume through CareerHub AI Resume Analyzer and achieve >= 85 Score', completed: true },
                            { id: 'm3-2', title: 'Quantify metrics across internship and projects (e.g. "reduced latency by 35%")', completed: true },
                            { id: 'm3-3', title: 'Ensure GitHub repositories have clean READMEs, architecture diagrams, and live demos', completed: false }
                        ]
                    },
                    {
                        phaseNumber: 4,
                        title: 'Phase 4 — Targeted Interview Preparation',
                        description: 'Simulate high-pressure technical, system design, and behavioral interviews.',
                        status: 'pending',
                        milestones: [
                            { id: 'm4-1', title: 'Complete 5 AI Technical Mock Interviews with score >= 80%', completed: true },
                            { id: 'm4-2', title: 'Practice 3 HR Behavioral interviews using the STAR framework', completed: false },
                            { id: 'm4-3', title: 'Study High-Level System Design (Caching, Load Balancing, DB Sharding)', completed: false }
                        ]
                    },
                    {
                        phaseNumber: 5,
                        title: 'Phase 5 — Strategic Applications & Placement',
                        description: 'Track applications, leverage alumni referrals, and conquer final round interviews.',
                        status: 'pending',
                        milestones: [
                            { id: 'm5-1', title: 'Track at least 10 targeted job applications in CareerHub Application Tracker', completed: false },
                            { id: 'm5-2', title: 'Reach out to 5 alumni on LinkedIn for warm referrals and informational chats', completed: false },
                            { id: 'm5-3', title: 'Prepare counter-offers and evaluate total compensation packages', completed: false }
                        ]
                    }
                ]
            });
            await roadmap.save();
        }

        res.json(roadmap);
    } catch (err) {
        console.error('Roadmap error:', err);
        res.status(500).json({ message: "Failed to fetch roadmap." });
    }
});

router.put('/roadmap/milestone', optionalAuth, async (req, res) => {
    try {
        const { milestoneId, completed } = req.body;
        const userId = req.user._id || req.user.id;
        const roadmap = await CareerRoadmap.findOne({ userId });

        if (!roadmap) {
            return res.status(404).json({ message: "Roadmap not found." });
        }

        let totalMilestones = 0;
        let completedCount = 0;

        roadmap.phases.forEach(phase => {
            phase.milestones.forEach(m => {
                if (m.id === milestoneId) {
                    m.completed = completed;
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
            applied: applications.filter(a => a.status === 'Applied').length,
            shortlisted: applications.filter(a => a.status === 'Shortlisted').length,
            assessment: applications.filter(a => a.status === 'Assessment').length,
            interview: applications.filter(a => a.status === 'Interview').length,
            selected: applications.filter(a => a.status === 'Selected').length,
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
            type,
            location,
            salaryOrStipend,
            status,
            interviewDate,
            matchPercentage,
            notes,
            contactPerson
        } = req.body;

        if (!company || !jobRole) {
            return res.status(400).json({ message: "Company and job role are required." });
        }

        const application = new JobApplication({
            userId,
            company,
            jobRole,
            type: type || 'job',
            location: location || 'Remote / Hybrid',
            salaryOrStipend: salaryOrStipend || 'Competitive',
            status: status || 'Applied',
            interviewDate: interviewDate || '',
            matchPercentage: matchPercentage || 85,
            notes: notes || '',
            contactPerson: contactPerson || ''
        });

        await application.save();
        res.status(201).json({
            message: "Application tracked successfully.",
            application
        });
    } catch (err) {
        console.error('Create application error:', err);
        res.status(500).json({ message: "Failed to save application." });
    }
});

router.put('/applications/:id', optionalAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        updateData.updatedAt = new Date();

        const updated = await JobApplication.findByIdAndUpdate(id, updateData, { new: true });
        if (!updated) {
            return res.status(404).json({ message: "Application not found." });
        }

        res.json({
            message: "Application updated.",
            application: updated
        });
    } catch (err) {
        res.status(500).json({ message: "Failed to update application." });
    }
});

router.delete('/applications/:id', optionalAuth, async (req, res) => {
    try {
        const { id } = req.params;
        await JobApplication.findByIdAndDelete(id);
        res.json({ message: "Application deleted successfully." });
    } catch (err) {
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
        const todayStr = new Date().toISOString().slice(0, 10);

        let plan = await DailyPlan.findOne({ userId, date: todayStr });

        if (!plan) {
            const targetRole = user.targetRole || 'Full Stack Developer';
            const roadmap = await CareerRoadmap.findOne({ userId });
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

            const problems = await CodingProblem.find() || [];
            const randomProblem = problems.length > 0
                ? problems[Math.floor(Math.random() * problems.length)]
                : { _id: '1', id: '1', title: 'Two Sum' };

            const generatedTasks = [
                {
                    id: 'task-code-1',
                    title: `Solve Coding Challenge: ${randomProblem.title}`,
                    category: 'coding',
                    description: `Implement and pass all test cases for ${randomProblem.title}. Sharpen problem-solving velocity.`,
                    xpReward: 35,
                    completed: false,
                    actionUrl: `/coding?problemId=${randomProblem._id || randomProblem.id}`,
                    actionText: 'Solve Problem'
                },
                {
                    id: 'task-interview-1',
                    title: `AI Mock Interview: ${targetRole} Practice`,
                    category: 'interview',
                    description: `Answer technical and behavioral questions in Voice or Text mode with AI scoring.`,
                    xpReward: 30,
                    completed: false,
                    actionUrl: `/interviews?role=${encodeURIComponent(targetRole)}`,
                    actionText: 'Start Interview'
                },
                {
                    id: 'task-skill-1',
                    title: `Target Skill Review: Core Architecture`,
                    category: 'skill',
                    description: `Analyze your skill gaps for ${targetRole} and review benchmark standards.`,
                    xpReward: 20,
                    completed: false,
                    actionUrl: '/skills',
                    actionText: 'Review Skills'
                },
                {
                    id: 'task-roadmap-1',
                    title: pendingRoadmapMilestone
                        ? `Roadmap Progress: ${pendingRoadmapMilestone}`
                        : `Career Roadmap: Complete next milestone`,
                    category: 'roadmap',
                    description: `Advance your step-by-step career milestones to elevate placement readiness.`,
                    xpReward: 25,
                    completed: false,
                    actionUrl: '/roadmap',
                    actionText: 'View Roadmap'
                },
                {
                    id: 'task-job-1',
                    title: `Review AI Job Recommendations & Opportunities`,
                    category: 'application',
                    description: `Inspect recent opportunities tailored to your ${targetRole} profile and track new applications.`,
                    xpReward: 20,
                    completed: false,
                    actionUrl: '/job-matching',
                    actionText: 'Explore Matches'
                }
            ];

            plan = new DailyPlan({
                userId,
                date: todayStr,
                targetRole,
                completionPercentage: 0,
                streak: user.streak || 1,
                tasks: generatedTasks
            });
            await plan.save();
        }

        res.json({
            date: todayStr,
            plan,
            userStreak: user.streak || 1
        });
    } catch (err) {
        console.error('Daily plan fetch error:', err);
        res.status(500).json({ message: 'Failed to fetch daily plan.' });
    }
});

router.put('/daily-plan/task/:taskId', optionalAuth, async (req, res) => {
    try {
        const userId = req.user._id || req.user.id;
        const { taskId } = req.params;
        const { completed } = req.body;
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
        const targetCompleted = completed !== undefined ? !!completed : !task.completed;
        task.completed = targetCompleted;
        if (targetCompleted) task.completedAt = new Date();

        const total = plan.tasks.length;
        const done = plan.tasks.filter(t => t.completed).length;
        plan.completionPercentage = Math.round((done / (total || 1)) * 100);

        const user = await User.findById(userId);
        if (user) {
            if (targetCompleted && !wasCompleted) {
                user.xp = (user.xp || 0) + (task.xpReward || 25);
                if (done === total) {
                    user.xp += 50;
                    user.streak = (user.streak || 0) + 1;
                }
            } else if (!targetCompleted && wasCompleted) {
                user.xp = Math.max(0, (user.xp || 0) - (task.xpReward || 25));
            }
            user.level = Math.floor((user.xp || 0) / 100) + 1;
            await user.save();
        }

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
router.post('/job-analyzer', optionalAuth, async (req, res) => {
    try {
        const { jobDescription, jobTitle, company } = req.body;
        if (!jobDescription || !jobDescription.trim()) {
            return res.status(400).json({ message: 'Job description text cannot be empty.' });
        }

        const userId = req.user._id || req.user.id;
        const user = await User.findById(userId) || req.user;

        const text = jobDescription.toLowerCase();

        const techSkillsCatalog = [
            'javascript', 'typescript', 'react', 'next.js', 'vue', 'angular', 'node.js', 'express',
            'python', 'django', 'fastapi', 'flask', 'java', 'spring boot', 'c++', 'c#', '.net',
            'golang', 'rust', 'ruby', 'php', 'sql', 'mysql', 'postgresql', 'mongodb', 'redis',
            'graphql', 'rest api', 'docker', 'kubernetes', 'aws', 'azure', 'gcp', 'ci/cd',
            'git', 'system design', 'microservices', 'kafka', 'tailwind', 'html', 'css',
            'unit testing', 'jest', 'agile', 'scrum', 'data structures', 'algorithms'
        ];

        const softSkillsCatalog = [
            'communication', 'teamwork', 'leadership', 'problem solving', 'critical thinking',
            'adaptability', 'time management', 'collaboration', 'ownership', 'mentorship'
        ];

        const detectedReqTech = techSkillsCatalog.filter(skill => text.includes(skill));
        const detectedReqSoft = softSkillsCatalog.filter(skill => text.includes(skill));

        const userSkills = (user.technicalSkills || []).map(s => s.toLowerCase());
        const userSoft = (user.softSkills || []).map(s => s.toLowerCase());

        const matchedTech = detectedReqTech.filter(reqSkill =>
            userSkills.some(us => us.includes(reqSkill) || reqSkill.includes(us))
        );
        const missingTech = detectedReqTech.filter(reqSkill =>
            !userSkills.some(us => us.includes(reqSkill) || reqSkill.includes(us))
        );

        const matchedSoft = detectedReqSoft.filter(reqSkill =>
            userSoft.some(us => us.includes(reqSkill) || reqSkill.includes(us))
        );

        const totalReq = Math.max(1, detectedReqTech.length);
        const rawScore = Math.round((matchedTech.length / totalReq) * 85);
        const roleBonus = (jobTitle && user.targetRole && user.targetRole.toLowerCase().includes(jobTitle.toLowerCase())) ? 15 : 10;
        const overallMatch = Math.min(98, Math.max(25, rawScore + roleBonus));

        const cap = s => s.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

        const recommendations = [];
        if (missingTech.length > 0) {
            recommendations.push(`Target High-Priority Skills: Focus on acquiring ${missingTech.slice(0, 3).map(cap).join(', ')} to boost alignment.`);
            recommendations.push(`Resume Tailoring: Integrate past projects or coursework demonstrating familiarity with ${missingTech[0]}.`);
        } else {
            recommendations.push(`Exceptional Technical Match: Your skillset directly mirrors the core requirements of this role.`);
        }
        recommendations.push(`Quantify Impact: Ensure your resume highlights measurable achievements (e.g. "Improved query performance by 40%").`);
        recommendations.push(`System Architecture: Expect architecture questions on distributed data flow and component decoupling.`);

        const interviewQuestions = [
            `Can you describe your experience with ${matchedTech[0] ? cap(matchedTech[0]) : 'modern web frameworks'} and how you structured your most complex application?`,
            `How would you handle a production bottleneck when working with ${detectedReqTech[1] ? cap(detectedReqTech[1]) : 'relational databases and caching'}?`,
            `Tell us about a challenging bug you encountered in a team setting and how you resolved it under tight deadlines.`
        ];

        res.json({
            jobTitle: jobTitle || 'Software Engineer',
            company: company || 'Hiring Organization',
            overallMatch,
            extractedRequirements: detectedReqTech.map(cap),
            matchedSkills: matchedTech.map(cap),
            missingSkills: missingTech.map(cap),
            matchedSoftSkills: matchedSoft.map(cap),
            recommendations,
            interviewQuestions,
            readinessVerdict: overallMatch >= 80
                ? 'Strong Candidate: High interview conversion likelihood.'
                : overallMatch >= 60
                ? 'Competitive Candidate: Bridge gap skills before applying.'
                : 'Developing Fit: Recommended to upskill on critical missing technologies.'
        });
    } catch (err) {
        console.error('Job analyzer error:', err);
        res.status(500).json({ message: 'Failed to analyze job description.' });
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
            CareerAssessment.findOne({ userId }).sort({ createdAt: -1 }),
            CodeSubmission.find({ userId }),
            Interview.find({ userId }),
            CareerRoadmap.findOne({ userId }),
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
            const sum = interviews.reduce((acc, curr) => acc + (curr.totalScore || 70), 0);
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
                targetRole: user.targetRole || 'Full Stack Developer',
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
            CodeSubmission.find({ userId }).sort({ createdAt: 1 }),
            Interview.find({ userId }).sort({ date: 1 }),
            JobApplication.find({ userId }),
            CareerRoadmap.findOne({ userId }),
            CareerAssessment.findOne({ userId }).sort({ createdAt: -1 })
        ]);

        const accepted = (submissions || []).filter(s => s.status === 'accepted');
        const failed = (submissions || []).filter(s => s.status !== 'accepted');
        const accuracyRate = submissions.length > 0
            ? Math.round((accepted.length / submissions.length) * 100)
            : 0;

        const interviewTrend = (interviews || []).map((inv, idx) => ({
            session: `Session ${idx + 1}`,
            score: inv.totalScore || 75,
            role: inv.role || 'Full Stack',
            date: inv.date ? new Date(inv.date).toLocaleDateString() : 'Recent'
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
            proficiency: Math.min(95, 60 + ((i * 7) % 35)),
            status: i < 5 ? 'Verified' : 'In Practice'
        }));

        res.json({
            user: {
                name: user.name,
                email: user.email,
                targetRole: user.targetRole || 'Full Stack Developer',
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
                    ? Math.round(interviews.reduce((acc, curr) => acc + (curr.totalScore || 75), 0) / interviews.length)
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

module.exports = router;
