const mongoose = require('mongoose');

const SavedCodingProblemSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    problemId: { type: mongoose.Schema.Types.ObjectId, ref: 'CodingProblem', required: true },
    createdAt: { type: Date, default: Date.now }
});

SavedCodingProblemSchema.index({ userId: 1, problemId: 1 }, { unique: true });

module.exports = mongoose.models.SavedCodingProblem ||
    mongoose.model('SavedCodingProblem', SavedCodingProblemSchema);
