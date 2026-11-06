const mongoose = require('mongoose');
const { examSessions, wrapModel } = require('../utils/inMemoryDB');

const ExamQuestionSchema = new mongoose.Schema({
    type: { type: String, enum: ['mcq', 'text'], required: true },
    question: { type: String, required: true, maxlength: 2000 },
    options: { type: [String], default: [] },
    answerIndex: { type: Number, min: 0, max: 3 },
    explanation: { type: String, maxlength: 1000 },
    skill: String,
    topic: { type: String, maxlength: 80 },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'] },
    source: { type: String, enum: ['gemini', 'openrouter', 'groq', 'curated'], required: true },
    model: { type: String, maxlength: 120 }
}, { _id: false });

const InterviewResponseSchema = new mongoose.Schema({
    questionIndex: { type: Number, required: true },
    answer: { type: String, required: true, maxlength: 10000 },
    score: { type: Number, min: 0, max: 10, required: true },
    feedback: { type: String, maxlength: 1000 },
    rubric: { type: mongoose.Schema.Types.Mixed },
    evidence: [String],
    improvements: [String],
    source: { type: String, enum: ['gemini', 'openrouter', 'groq'], required: true },
    model: { type: String },
    createdAt: { type: Date, default: Date.now }
}, { _id: false });

const ExamSessionSchema = new mongoose.Schema({
    userId: { type: String, required: true, index: true },
    role: { type: String, required: true, maxlength: 120 },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
    company: { type: String, maxlength: 120 },
    mode: { type: String, enum: ['mcq', 'video', 'voice'], required: true },
    topic: { type: String, maxlength: 80, required: true },
    sessionLength: { type: Number, min: 1, max: 10, required: true },
    generationSource: { type: String, enum: ['gemini', 'openrouter', 'groq', 'curated', 'pending'], required: true },
    generationModel: { type: String, default: null },
    questions: { type: [ExamQuestionSchema], required: true },
    responses: { type: [InterviewResponseSchema], default: [] },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
    createdAt: { type: Date, default: Date.now }
});

const OriginalExamSessionModel = mongoose.models.ExamSession ||
    mongoose.model('ExamSession', ExamSessionSchema);
module.exports = wrapModel(examSessions, 'ExamSession', OriginalExamSessionModel, mongoose);
