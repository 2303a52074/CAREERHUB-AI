const mongoose = require('mongoose');
const { jobDescriptionAnalyses, wrapModel } = require('../utils/inMemoryDB');

const JobDescriptionAnalysisSchema = new mongoose.Schema({
    userId: { type: String, required: true, index: true },
    jobTitle: { type: String, default: null },
    company: { type: String, default: null },
    overallMatch: { type: Number, default: null },
    extractedRequirements: { type: [String], default: [] },
    matchedSkills: { type: [String], default: [] },
    missingSkills: { type: [String], default: [] },
    matchedSoftSkills: { type: [String], default: [] },
    qualifications: { type: [String], default: [] },
    experienceRequirements: { type: [String], default: [] },
    responsibilities: { type: [String], default: [] },
    recommendations: { type: [String], default: [] },
    interviewQuestions: { type: [String], default: [] },
    aiSummary: { type: String, default: null },
    aiAdviceStatus: { type: mongoose.Schema.Types.Mixed, default: null },
    recommendationMethod: { type: String, default: 'local' },
    analysisMethod: { type: String, default: 'local' },
    methodology: { type: String, default: '' },
    readinessVerdict: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now }
});

JobDescriptionAnalysisSchema.index({ userId: 1, createdAt: -1 });

const OriginalJobDescriptionAnalysisModel = mongoose.models.JobDescriptionAnalysis ||
    mongoose.model('JobDescriptionAnalysis', JobDescriptionAnalysisSchema);

module.exports = wrapModel(
    jobDescriptionAnalyses,
    'JobDescriptionAnalysis',
    OriginalJobDescriptionAnalysisModel,
    mongoose
);
