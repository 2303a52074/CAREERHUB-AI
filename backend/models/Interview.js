const mongoose = require('mongoose');
const { interviews, wrapModel } = require('../utils/inMemoryDB');

const InterviewSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    role: String,
    difficulty: String,                // track difficulty used
    totalScore: Number,
    xpEarned: Number,                  // for level system
    answers: [{                         // detailed answer tracking for skill analytics
        question: String,
        answer: String,
        score: Number,
        skill: String,                  // e.g., 'javascript', 'algorithms'
        timeSpent: Number
    }],
    date: { type: Date, default: Date.now }
});

const OriginalInterviewModel = mongoose.models.Interview || mongoose.model('Interview', InterviewSchema);
module.exports = wrapModel(interviews, 'Interview', OriginalInterviewModel, mongoose);