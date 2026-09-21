const express = require('express');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const fs = require('fs');
const authMiddleware = require('../middleware/authMiddleware');
const User = require('../models/User');
const { analyzeResume } = require('../utils/aiService');

const router = express.Router();

/* ---------------- MULTER CONFIG ---------------- */
const uploadDir = require('path').join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) =>
        cb(null, Date.now() + '-' + (file.originalname || 'resume.pdf'))
});

const upload = multer({ storage });

async function optionalAuth(req, res, next) {
    const authHeader = req.header('Authorization');
    if (authHeader) {
        try {
            return authMiddleware(req, res, next);
        } catch (e) {
            // fallback
        }
    }
    const demoUser = await User.findOne({ email: 'demo@example.com' }) || (await User.find())[0];
    req.user = demoUser || { _id: 'user-demo-1', id: 'user-demo-1', name: 'Demo Candidate' };
    next();
}

const jobLinks = {
    "Frontend Developer": "https://www.linkedin.com/jobs/search/?keywords=Frontend%20Developer",
    "Backend Developer": "https://www.linkedin.com/jobs/search/?keywords=Backend%20Developer",
    "Full Stack Developer": "https://www.linkedin.com/jobs/search/?keywords=Full%20Stack%20Developer",
    "Data Analyst": "https://www.linkedin.com/jobs/search/?keywords=Data%20Analyst",
    "Machine Learning Engineer": "https://www.linkedin.com/jobs/search/?keywords=Machine%20Learning%20Engineer"
};

/* ---------------- RESUME ANALYSIS HELPER ---------------- */
async function performResumeAnalysis(text, targetRole, userId) {
    const user = userId ? await User.findById(userId) : null;
    const analysis = await analyzeResume(text, targetRole || user?.targetRole || 'Full Stack Developer', user || {});

    // Save score to user profile if user exists
    if (userId) {
        try {
            await User.findByIdAndUpdate(userId, { resumeScore: analysis.score });
        } catch (e) {
            console.warn('Failed to update user resume score:', e.message);
        }
    }

    // Suggested jobs with links
    const suggestedJobs = (analysis.detectedSkills.length > 0
        ? ["Frontend Developer", "Full Stack Developer", "Backend Developer"]
        : ["Junior Software Trainee", "Associate Developer"]
    ).map(job => ({
        title: job,
        link: jobLinks[job] || `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(job)}`
    }));

    return {
        score: analysis.score,
        atsCompatibility: analysis.atsCompatibility,
        summary: analysis.summary,
        matchedSkills: analysis.detectedSkills,
        detectedSkills: analysis.detectedSkills,
        missingSkills: analysis.missingSkills,
        strengths: analysis.strengths,
        weaknesses: analysis.weaknesses,
        recommendations: analysis.recommendations,
        suggestedJobs
    };
}

/* ---------------- RESUME FILE UPLOAD ---------------- */
router.post('/upload', optionalAuth, upload.single('resume'), async (req, res) => {
    try {
        let text = req.body.resumeText || "";

        if (req.file && req.file.path) {
            const dataBuffer = fs.readFileSync(req.file.path);
            try {
                const pdfData = await pdfParse(dataBuffer);
                text = pdfData.text || "";
            } catch (parseErr) {
                text = dataBuffer.toString('utf-8');
            }
        }

        if (!text || text.trim().length === 0) {
            return res.status(400).json({ message: "No resume file or text provided for analysis." });
        }

        const targetRole = req.body.targetRole || 'Full Stack Developer';
        const result = await performResumeAnalysis(text, targetRole, req.user?._id || req.user?.id);
        res.json(result);

    } catch (err) {
        console.error('Resume upload error:', err);
        res.status(500).json({ message: "Resume analysis failed." });
    }
});

/* ---------------- RESUME TEXT ANALYSIS ---------------- */
router.post('/analyze-text', optionalAuth, async (req, res) => {
    try {
        const { resumeText, targetRole } = req.body;
        if (!resumeText || !resumeText.trim()) {
            return res.status(400).json({ message: "Resume text cannot be empty." });
        }

        const result = await performResumeAnalysis(resumeText, targetRole, req.user?._id || req.user?.id);
        res.json(result);
    } catch (err) {
        console.error('Resume text analysis error:', err);
        res.status(500).json({ message: "Resume analysis failed." });
    }
});

module.exports = router;
