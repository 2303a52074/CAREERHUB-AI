const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const User = require('../models/User');
const JobOpportunity = require('../models/JobOpportunity');
const JobApplication = require('../models/JobApplication');
const CareerAssessment = require('../models/CareerAssessment');
const CareerRoadmap = require('../models/CareerRoadmap');
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

module.exports = router;
