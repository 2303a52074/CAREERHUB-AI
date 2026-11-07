const mongoose = require('mongoose');
const { resumeAnalyses, wrapModel } = require('../utils/inMemoryDB');

const ResumeAnalysisSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    targetRole: { type: String, required: true },
    score: { type: Number, default: null },
    atsCompatibility: { type: Number, default: null },
    summary: { type: String, default: '' },
    detectedSkills: { type: [String], default: [] },
    missingSkills: { type: [String], default: [] },
    strengths: { type: [String], default: [] },
    weaknesses: { type: [String], default: [] },
    projects: { type: [String], default: [] },
    experience: { type: [String], default: [] },
    education: { type: [String], default: [] },
    atsReadabilityIssues: { type: [String], default: [] },
    recommendations: { type: [String], default: [] },
    prioritizedEdits: { type: [String], default: [] },
    presentSections: { type: [String], default: [] },
    missingSections: { type: [String], default: [] },
    measurableAchievements: { type: [String], default: [] },
    analysisMethod: { type: String, default: 'not_run' },
    advancedAnalysisStatus: { type: String, enum: ['unavailable', 'pending', 'generated', 'failed'], default: 'unavailable' },
    advancedAnalysisMethod: { type: String, default: null },
    advancedSummary: { type: String, default: null },
    model: { type: String, default: null },
    comparedWithJobDescription: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

ResumeAnalysisSchema.index({ userId: 1, createdAt: -1 });

const OriginalResumeAnalysisModel = mongoose.models.ResumeAnalysis ||
    mongoose.model('ResumeAnalysis', ResumeAnalysisSchema);

module.exports = wrapModel(resumeAnalyses, 'ResumeAnalysis', OriginalResumeAnalysisModel, mongoose);
