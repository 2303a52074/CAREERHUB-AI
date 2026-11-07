const express = require('express');
const multer = require('multer');
const path = require('path');
const authMiddleware = require('../middleware/authMiddleware');
const User = require('../models/User');
const ResumeAnalysis = require('../models/ResumeAnalysis');
const { analyzeResume, getApprovedDataProcessingStatus } = require('../utils/aiService');
const { analyzeResumeLocally } = require('../utils/localCareerAnalysis');
const { resolveTargetRole, targetRoleRequiredResponse } = require('../utils/roleResolution');
const { providerErrorMessage } = require('../utils/providerErrors');
const { extractResumeText } = require('../utils/resumePdf');
const { extractResumeDocxText } = require('../utils/resumeDocx');

const router = express.Router();

/* ---------------- MULTER CONFIG ---------------- */
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024, files: 1 },
    fileFilter: (req, file, cb) => {
        const extension = path.extname(file.originalname).toLowerCase();
        const isPdf = extension === '.pdf' &&
            ['application/pdf', 'application/octet-stream'].includes(file.mimetype);
        const isDocx = extension === '.docx' &&
            ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/octet-stream']
                .includes(file.mimetype);
        if (!isPdf && !isDocx) {
            return cb(new Error('Upload a PDF or DOCX resume file.'));
        }
        cb(null, true);
    }
});

const jobLinks = {
    "Frontend Developer": "https://www.linkedin.com/jobs/search/?keywords=Frontend%20Developer",
    "Backend Developer": "https://www.linkedin.com/jobs/search/?keywords=Backend%20Developer",
    "Full Stack Developer": "https://www.linkedin.com/jobs/search/?keywords=Full%20Stack%20Developer",
    "Data Analyst": "https://www.linkedin.com/jobs/search/?keywords=Data%20Analyst",
    "Machine Learning Engineer": "https://www.linkedin.com/jobs/search/?keywords=Machine%20Learning%20Engineer"
};

function logResumeExtraction(startedAt, type, outcome, textLength = 0, failureCategory = null) {
    console.info('Resume extraction metrics:', JSON.stringify({
        documentType: type,
        outcome,
        extractionDurationMs: Date.now() - startedAt,
        extractedTextCharacters: textLength,
        failureCategory
    }));
}

/* ---------------- RESUME ANALYSIS HELPER ---------------- */
async function performResumeAnalysis(
    text,
    targetRole,
    userId,
    jobDescription = '',
    feature = 'resume_analysis'
) {
    if (typeof text !== 'string' || text.trim().length < 30) {
        const error = new Error('Provide at least 30 characters of resume text.');
        error.code = 'RESUME_TEXT_INSUFFICIENT';
        error.status = 422;
        throw error;
    }
    const user = userId ? await User.findById(userId) : null;
    const resolvedRole = resolveTargetRole(targetRole, user).role;
    if (!resolvedRole) {
        const error = new Error('Choose a target role before analyzing a resume.');
        error.code = 'TARGET_ROLE_REQUIRED';
        error.status = 409;
        throw error;
    }
    let analysis = analyzeResumeLocally(text, resolvedRole, jobDescription);
    const approval = getApprovedDataProcessingStatus(feature);
    let advancedAnalysisStatus = approval.approved ? 'pending' : 'unavailable';
    let advancedAnalysisReason = approval.reason;
    if (approval.approved) {
        try {
            const advanced = await analyzeResume(text, resolvedRole, user || {}, jobDescription, feature);
            analysis = {
                ...analysis,
                ...advanced,
                score: analysis.score,
                atsCompatibility: analysis.atsCompatibility,
                summary: analysis.summary,
                atsReadabilityIssues: analysis.atsReadabilityIssues,
                presentSections: analysis.presentSections,
                missingSections: analysis.missingSections,
                measurableAchievements: analysis.measurableAchievements,
                analysisMethod: 'local',
                advancedAnalysisMethod: advanced.analysisMethod,
                advancedSummary: advanced.summary
            };
            advancedAnalysisStatus = 'generated';
            advancedAnalysisReason = null;
        } catch (error) {
            if (!error.code?.startsWith('AI_')) throw error;
            console.warn('Approved advanced resume analysis unavailable:', error.code);
            advancedAnalysisStatus = 'failed';
            advancedAnalysisReason = 'Advanced analysis failed. The saved report contains local checks only.';
        }
    }

    if (userId && Number.isFinite(analysis.score)) {
        await User.findByIdAndUpdate(userId, { resumeScore: analysis.score });
    }

    const savedAnalysis = new ResumeAnalysis({
        userId: String(userId),
        targetRole: resolvedRole,
        score: analysis.score,
        atsCompatibility: analysis.atsCompatibility,
        summary: analysis.summary,
        detectedSkills: analysis.detectedSkills,
        missingSkills: analysis.missingSkills,
        strengths: analysis.strengths,
        weaknesses: analysis.weaknesses,
        projects: analysis.projects,
        experience: analysis.experience,
        education: analysis.education,
        atsReadabilityIssues: analysis.atsReadabilityIssues,
        recommendations: analysis.recommendations,
        prioritizedEdits: analysis.prioritizedEdits,
        presentSections: analysis.presentSections,
        missingSections: analysis.missingSections,
        measurableAchievements: analysis.measurableAchievements,
        analysisMethod: analysis.analysisMethod,
        model: analysis.model || null,
        advancedAnalysisStatus,
        advancedAnalysisMethod: analysis.advancedAnalysisMethod || null,
        advancedSummary: analysis.advancedSummary || null,
        comparedWithJobDescription: Boolean(jobDescription)
    });
    await savedAnalysis.save();

    // Suggested jobs with links
    const suggestedJobs = [{
        title: `${resolvedRole} openings`,
        link: jobLinks[resolvedRole] || `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(resolvedRole)}`
    }];

    return {
        score: analysis.score,
        atsCompatibility: analysis.atsCompatibility,
        summary: analysis.summary,
        matchedSkills: analysis.detectedSkills,
        detectedSkills: analysis.detectedSkills,
        missingSkills: analysis.missingSkills,
        strengths: analysis.strengths,
        weaknesses: analysis.weaknesses,
        projects: analysis.projects,
        experience: analysis.experience,
        education: analysis.education,
        atsReadabilityIssues: analysis.atsReadabilityIssues,
        recommendations: analysis.recommendations,
        prioritizedEdits: analysis.prioritizedEdits,
        presentSections: analysis.presentSections,
        missingSections: analysis.missingSections,
        measurableAchievements: analysis.measurableAchievements,
        suggestedJobs,
        analysisMethod: analysis.analysisMethod,
        model: analysis.model || null,
        advancedAnalysisStatus,
        advancedAnalysisReason,
        comparedWithJobDescription: Boolean(jobDescription),
        analysisStatus: analysis.analysisStatus,
        analysisId: savedAnalysis._id,
        analyzedAt: savedAnalysis.createdAt
    };
}

router.get('/history', authMiddleware, async (req, res) => {
    try {
        const records = await ResumeAnalysis.find({ userId: String(req.user._id || req.user.id) })
            .sort({ createdAt: -1 })
            .limit(20);
        res.json({ analyses: records });
    } catch (err) {
        console.error('Resume analysis history fetch failed:', err);
        res.status(500).json({ message: 'Failed to load resume analysis history.' });
    }
});

/* ---------------- RESUME FILE UPLOAD ---------------- */
router.post('/upload', authMiddleware, (req, res, next) => {
    upload.single('resume')(req, res, err => {
        if (err) {
            return res.status(400).json({ message: err.message || 'Resume upload failed.' });
        }
        next();
    });
}, async (req, res) => {
    try {
        let text = req.body.resumeText || "";
        let analysisFeature = 'resume_analysis';

        if (req.file?.buffer) {
            const extractionStartedAt = Date.now();
            const documentType = path.extname(req.file.originalname).toLowerCase() === '.docx' ? 'docx' : 'pdf';
            analysisFeature = documentType === 'pdf' ? 'pdf_resume_analysis' : 'docx_resume_analysis';
            try {
                text = documentType === 'docx'
                    ? await extractResumeDocxText(req.file.buffer)
                    : await extractResumeText(req.file.buffer);
                logResumeExtraction(extractionStartedAt, documentType, 'success', text.length);
            } catch (parseErr) {
                logResumeExtraction(
                    extractionStartedAt,
                    documentType,
                    'failure',
                    0,
                    typeof parseErr.code === 'string' ? parseErr.code : 'DOCUMENT_PARSE_FAILED'
                );
                if (parseErr.code === 'PDF_TEXT_NOT_EXTRACTABLE') {
                    return res.status(422).json({
                        code: parseErr.code,
                        message: 'This PDF contains too little extractable text. Scanned or image-only PDFs are unsupported because OCR is not available; upload a text-based PDF or paste the resume text.'
                    });
                }
                if (['DOCX_INVALID_FILE', 'DOCX_PARSE_FAILED', 'RESUME_TEXT_NOT_EXTRACTABLE'].includes(parseErr.code)) {
                    return res.status(parseErr.code === 'RESUME_TEXT_NOT_EXTRACTABLE' ? 422 : 400).json({
                        code: parseErr.code,
                        message: parseErr.message
                    });
                }
                console.error('Resume document parsing failed:', parseErr.message);
                return res.status(400).json({ message: 'The uploaded resume could not be read. Please upload a valid PDF or DOCX file.' });
            }
        }

        if (!text || text.trim().length === 0) {
            return res.status(400).json({ message: "No resume file or text provided for analysis." });
        }
        if (text.trim().length < 30) {
            return res.status(422).json({
                code: 'RESUME_TEXT_INSUFFICIENT',
                message: 'Provide at least 30 characters of resume text. No analysis or score was created.'
            });
        }
        if (text.length > 50000) {
            return res.status(413).json({ message: 'Resume text must be 50,000 characters or fewer.' });
        }

        if (req.body.jobDescription !== undefined && typeof req.body.jobDescription !== 'string') {
            return res.status(400).json({ message: 'Job description must be text.' });
        }
        const targetRole = typeof req.body.targetRole === 'string' ? req.body.targetRole.trim() : '';
        const jobDescription = typeof req.body.jobDescription === 'string' ? req.body.jobDescription.trim() : '';
        if (targetRole.length > 120) {
            return res.status(400).json({ message: 'Target role must be 120 characters or fewer.' });
        }
        if (jobDescription.length > 12000) {
            return res.status(413).json({ message: 'Job description must be 12,000 characters or fewer.' });
        }
        if (!resolveTargetRole(targetRole, req.user).role) return targetRoleRequiredResponse(res);
        const result = await performResumeAnalysis(
            text,
            targetRole,
            req.user._id || req.user.id,
            jobDescription,
            analysisFeature
        );
        res.json(result);

    } catch (err) {
        if (err.code === 'TARGET_ROLE_REQUIRED') return targetRoleRequiredResponse(res);
        if (err.code === 'RESUME_TEXT_INSUFFICIENT') {
            return res.status(err.status || 422).json({
                code: err.code,
                message: 'Provide at least 30 characters of resume text. No analysis or score was created.'
            });
        }
        if (err.code?.startsWith('AI_')) {
            console.warn('Resume analysis provider request failed:', err.code, err.provider || '');
            return res.status(err.status || 502).json({
                code: err.code,
                message: providerErrorMessage(err.code, 'Resume analysis', err)
            });
        }
        console.error('Resume upload error:', err);
        res.status(500).json({ message: "Resume analysis failed." });
    }
});

/* ---------------- RESUME TEXT ANALYSIS ---------------- */
router.post('/analyze-text', authMiddleware, async (req, res) => {
    try {
        // Accept both 'resumeText' (standard) and 'text' (alias) field names
        const resumeText = req.body.resumeText || req.body.text || '';
        const { targetRole } = req.body;
        if (req.body.jobDescription !== undefined && typeof req.body.jobDescription !== 'string') {
            return res.status(400).json({ message: 'Job description must be text.' });
        }
        const jobDescription = typeof req.body.jobDescription === 'string' ? req.body.jobDescription.trim() : '';
        if (typeof resumeText !== 'string' || !resumeText.trim()) {
            return res.status(400).json({ message: "Resume text cannot be empty. Use 'resumeText' or 'text' field." });
        }
        if (resumeText.length > 50000) {
            return res.status(413).json({ message: 'Resume text must be 50,000 characters or fewer.' });
        }

        const resolvedRole = typeof targetRole === 'string' ? targetRole.trim() : '';
        if (resolvedRole.length > 120) {
            return res.status(400).json({ message: 'Target role must be 120 characters or fewer.' });
        }
        if (jobDescription.length > 12000) {
            return res.status(413).json({ message: 'Job description must be 12,000 characters or fewer.' });
        }
        if (!resolveTargetRole(resolvedRole, req.user).role) return targetRoleRequiredResponse(res);
        const result = await performResumeAnalysis(resumeText.trim(), resolvedRole, req.user._id || req.user.id, jobDescription);
        res.json(result);
    } catch (err) {
        if (err.code === 'TARGET_ROLE_REQUIRED') return targetRoleRequiredResponse(res);
        if (err.code === 'RESUME_TEXT_INSUFFICIENT') {
            return res.status(err.status || 422).json({
                code: err.code,
                message: 'Provide at least 30 characters of resume text. No analysis or score was created.'
            });
        }
        if (err.code?.startsWith('AI_')) {
            console.warn('Resume analysis provider request failed:', err.code, err.provider || '');
            return res.status(err.status || 502).json({
                code: err.code,
                message: providerErrorMessage(err.code, 'Resume analysis', err)
            });
        }
        console.error('Resume text analysis error:', err);
        res.status(500).json({ message: "Resume analysis failed." });
    }
});

module.exports = router;
