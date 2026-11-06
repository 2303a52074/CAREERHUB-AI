const mongoose = require('mongoose');
const { careerRoadmaps, wrapModel } = require('../utils/inMemoryDB');

const MilestoneSchema = new mongoose.Schema({
    id: String,
    title: String,
    completionCriteria: String,
    estimatedHours: Number,
    completed: { type: Boolean, default: false }
});

const PhaseSchema = new mongoose.Schema({
    phaseNumber: Number,
    title: String,
    description: String,
    status: { type: String, enum: ['completed', 'in-progress', 'pending'], default: 'pending' },
    milestones: [MilestoneSchema]
});

const CareerRoadmapSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    targetRole: { type: String, required: true },
    archivedAt: { type: Date, default: null, index: true },
    progressPercentage: { type: Number, default: 0 },
    generationSource: { type: String, default: 'curated' },
    generationModel: { type: String, default: null },
    fallbackUsed: { type: Boolean, default: false },
    aiGenerationStatus: { type: String, default: 'not_generated' },
    phases: [PhaseSchema],
    generatedDate: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const OriginalCareerRoadmapModel = mongoose.models.CareerRoadmap || mongoose.model('CareerRoadmap', CareerRoadmapSchema);
module.exports = wrapModel(careerRoadmaps, 'CareerRoadmap', OriginalCareerRoadmapModel, mongoose);
