
const mongoose = require('mongoose');
const { codeSubmissions, wrapModel } = require('../utils/inMemoryDB');

const CodeSubmissionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    problemId: { type: mongoose.Schema.Types.ObjectId, ref: 'CodingProblem', required: true },
    code: { type: String, required: true },
    language: { type: String, default: 'javascript' },
    status: { type: String, enum: ['accepted', 'wrong_answer', 'time_limit', 'memory_limit', 'compilation_error', 'runtime_error', 'runner_error', 'pending'], default: 'pending' },
    score: { type: Number, default: 0 },
    executionTime: Number,
    memoryUsed: Number,
    testResults: [{
        testCaseId: Number,
        passed: Boolean,
        actualOutput: String,
        expectedOutput: String,
        error: String
    }],
    submittedAt: { type: Date, default: Date.now }
});

const OriginalCodeSubmissionModel = mongoose.models.CodeSubmission || mongoose.model('CodeSubmission', CodeSubmissionSchema);
module.exports = wrapModel(codeSubmissions, 'CodeSubmission', OriginalCodeSubmissionModel, mongoose);