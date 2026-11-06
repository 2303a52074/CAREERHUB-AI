const mongoose = require('mongoose');
const { skillGapAnalyses, wrapModel } = require('../utils/inMemoryDB');

const SkillGapAnalysisSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    targetRole: { type: String, required: true },
    matchPercentage: { type: Number, required: true, min: 0, max: 100 },
    matchedSkills: { type: [mongoose.Schema.Types.Mixed], default: [] },
    missingSkills: { type: [mongoose.Schema.Types.Mixed], default: [] },
    aiInsights: { type: [mongoose.Schema.Types.Mixed], default: [] },
    aiInsightsSource: { type: String, default: null },
    aiInsightsModel: { type: String, default: null },
    aiInsightsFallbackUsed: { type: Boolean, default: false },
    aiInsightsContextHash: { type: String, default: null },
    generatedAt: { type: Date, default: Date.now }
});

SkillGapAnalysisSchema.index({ userId: 1, targetRole: 1 }, { unique: true });

const OriginalSkillGapAnalysisModel = mongoose.models.SkillGapAnalysis ||
    mongoose.model('SkillGapAnalysis', SkillGapAnalysisSchema);

module.exports = wrapModel(skillGapAnalyses, 'SkillGapAnalysis', OriginalSkillGapAnalysisModel, mongoose);
