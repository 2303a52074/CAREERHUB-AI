const mongoose = require('mongoose');
const { codingProblems, wrapModel } = require('../utils/inMemoryDB');

const TestCaseSchema = new mongoose.Schema({
    input: String,
    stdin: String,
    expectedOutput: String,
    explanation: String,
    isHidden: { type: Boolean, default: false }
});

const CodingProblemSchema = new mongoose.Schema({
    problemId: { type: String, unique: true, sparse: true, index: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
    category: { type: String, required: true, index: true },
    topics: [{ type: String, maxlength: 60 }],
    tags: [{ type: String, maxlength: 60 }],
    inputFormat: { type: String, maxlength: 1000 },
    outputFormat: { type: String, maxlength: 1000 },
    constraints: { type: String, maxlength: 2000 },
    examples: [{
        input: { type: String, maxlength: 5000 },
        output: { type: String, maxlength: 2000 },
        explanation: { type: String, maxlength: 1000 }
    }],
    hiddenTestCases: { type: Number, default: 0, min: 0, max: 30 },
    hints: [{ type: String, maxlength: 1000 }],
    editorial: { type: String, maxlength: 5000 },
    timeComplexity: { type: String, maxlength: 100 },
    spaceComplexity: { type: String, maxlength: 100 },
    functionSignature: { type: String, maxlength: 500 },
    starterCode: {
        python: String,
        java: String,
        cpp: String,
        javascript: String
    },
    referenceCode: {
        type: {
            python: String,
            java: String,
            cpp: String,
            javascript: String
        },
        select: false
    },
    catalogVersion: { type: String, index: true },
    isActive: { type: Boolean, default: true, index: true },
    seedKey: { type: String, unique: true, sparse: true },
    testCases: [TestCaseSchema],
    solutionTemplate: { type: String, required: true },
    solutionCode: { type: String, select: false },
    timeLimit: { type: Number, default: 2 }, // seconds
    memoryLimit: { type: Number, default: 256 }, // MB
    points: { type: Number, default: 10 },
    companies: [String], // e.g., ['Google', 'Amazon']
    acceptanceRate: { type: Number, default: 0 },
    totalSubmissions: { type: Number, default: 0 },
    correctSubmissions: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
});

const OriginalProblemModel = mongoose.models.CodingProblem || mongoose.model('CodingProblem', CodingProblemSchema);
module.exports = wrapModel(codingProblems, 'CodingProblem', OriginalProblemModel, mongoose);