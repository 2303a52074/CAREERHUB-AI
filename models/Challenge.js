const mongoose = require('mongoose');
const { challenges, wrapModel } = require('../utils/inMemoryDB');

const ChallengeSchema = new mongoose.Schema({
    date: Date,
    question: String,
    type: String,
    skill: String
});

const OriginalChallengeModel = mongoose.models.Challenge || mongoose.model('Challenge', ChallengeSchema);
module.exports = wrapModel(challenges, 'Challenge', OriginalChallengeModel, mongoose);