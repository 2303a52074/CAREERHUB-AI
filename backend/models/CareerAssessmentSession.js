const mongoose = require('mongoose');
const { careerAssessmentSessions, wrapModel } = require('../utils/inMemoryDB');

const AssessmentQuestionSchema = new mongoose.Schema({
    questionId: { type: Number, required: true },
    category: { type: String, required: true, maxlength: 80 },
    question: { type: String, required: true, maxlength: 1000 },
    options: { type: [String], required: true },
    answerIndex: { type: Number, required: true, min: 0, max: 3 },
    explanation: { type: String, required: true, maxlength: 800 },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], required: true },
    source: { type: String, enum: ['gemini', 'openrouter', 'groq', 'curated'], required: true }
}, { _id: false });

const CareerAssessmentSessionSchema = new mongoose.Schema({
    userId: { type: String, required: true, index: true },
    targetRole: { type: String, required: true, maxlength: 120 },
    category: { type: String, required: true, maxlength: 80 },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], required: true },
    questions: { type: [AssessmentQuestionSchema], required: true },
    source: { type: String, enum: ['gemini', 'openrouter', 'groq', 'curated'], required: true },
    model: { type: String, default: null, maxlength: 120 },
    contextMode: { type: String, enum: ['generic_privacy_safe', 'personalized'], default: 'personalized' },
    fallbackUsed: { type: Boolean, default: false },
    status: { type: String, enum: ['active', 'completed'], default: 'active' },
    createdAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 }
});

const OriginalCareerAssessmentSessionModel = mongoose.models.CareerAssessmentSession ||
    mongoose.model('CareerAssessmentSession', CareerAssessmentSessionSchema);

module.exports = wrapModel(
    careerAssessmentSessions,
    'CareerAssessmentSession',
    OriginalCareerAssessmentSessionModel,
    mongoose
);
