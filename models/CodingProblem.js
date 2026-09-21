const mongoose = require('mongoose');
const { codingProblems, wrapModel } = require('../utils/inMemoryDB');

const TestCaseSchema = new mongoose.Schema({
    input: String,
    expectedOutput: String,
    isHidden: { type: Boolean, default: false }
});

const CodingProblemSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
    category: { type: String, enum: ['arrays', 'strings', 'linked-lists', 'trees', 'dp', 'graphs', 'sorting'], required: true },
    testCases: [TestCaseSchema],
    solutionTemplate: { type: String, required: true },
    solutionCode: { type: String }, // reference solution
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