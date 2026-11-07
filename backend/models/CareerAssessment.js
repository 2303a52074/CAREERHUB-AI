const mongoose = require('mongoose');
const { careerAssessments, wrapModel } = require('../utils/inMemoryDB');

const CareerAssessmentSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    sessionId: { type: String, default: null },
    targetRole: { type: String, default: null },
    assessmentCategory: { type: String, default: null, maxlength: 80 },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: null },
    generationSource: { type: String, enum: ['gemini', 'openrouter', 'groq', 'curated'], default: null },
    generationModel: { type: String, default: null, maxlength: 120 },
    contextMode: { type: String, enum: ['generic_privacy_safe', 'personalized'], default: 'personalized' },
    fallbackUsed: { type: Boolean, default: false },
    categoryScores: { type: mongoose.Schema.Types.Mixed, default: null },
    scores: {
        aptitude: { type: Number, default: 0 },
        technical: { type: Number, default: 0 },
        problemSolving: { type: Number, default: 0 },
        communication: { type: Number, default: 0 },
        roleSpecific: { type: Number, default: 0 },
        overallReadiness: { type: Number, default: 0 }
    },
    strengths: [String],
    weaknesses: [String],
    skillGaps: [String],
    recommendedSkills: [String],
    suitableRoles: [String],
    detailedAnswers: [
        {
            questionId: Number,
            category: String,
            difficulty: String,
            question: String,
            userAnswer: String,
            correctAnswer: String,
            isCorrect: Boolean,
            feedback: String
        }
    ],
    aiInsights: { type: mongoose.Schema.Types.Mixed, default: null },
    aiInsightsSource: { type: String, default: null },
    aiInsightsModel: { type: String, default: null },
    date: { type: Date, default: Date.now }
});

const OriginalCareerAssessmentModel = mongoose.models.CareerAssessment || mongoose.model('CareerAssessment', CareerAssessmentSchema);
module.exports = wrapModel(careerAssessments, 'CareerAssessment', OriginalCareerAssessmentModel, mongoose);
