const mongoose = require('mongoose');
const { interviews, wrapModel } = require('../utils/inMemoryDB');

const InterviewSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, maxlength: 120 },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
    company: { type: String, maxlength: 120 },
    interviewType: { type: String, maxlength: 40 },
    generationSource: { type: String, enum: ['openrouter', 'gemini', 'groq', 'curated', 'unknown'], default: 'unknown' },
    generationModel: { type: String, maxlength: 120 },
    contextMode: { type: String, enum: ['generic_privacy_safe', 'personalized'], default: 'personalized' },
    totalScore: { type: Number, min: 0, max: 100 },
    xpEarned: Number,                  // for level system
    answers: [{                         // detailed answer tracking for skill analytics
        question: { type: String, maxlength: 2000 },
        answer: { type: String, maxlength: 10000 },
        score: { type: Number, min: 0, max: 100 },
        feedback: { type: String, maxlength: 1000 },
        source: { type: String, enum: ['openrouter', 'gemini', 'groq', 'rule-based', 'unknown'] },
        rubric: { type: mongoose.Schema.Types.Mixed },
        evidence: [{ type: String, maxlength: 400 }],
        improvements: [{ type: String, maxlength: 400 }],
        skill: String,                  // e.g., 'javascript', 'algorithms'
        timeSpent: Number
    }],
    date: { type: Date, default: Date.now }
});

const OriginalInterviewModel = mongoose.models.Interview || mongoose.model('Interview', InterviewSchema);
module.exports = wrapModel(interviews, 'Interview', OriginalInterviewModel, mongoose);