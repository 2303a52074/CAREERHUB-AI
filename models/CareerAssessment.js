const mongoose = require('mongoose');
const { careerAssessments, wrapModel } = require('../utils/inMemoryDB');

const CareerAssessmentSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    targetRole: { type: String, default: 'Full Stack Developer' },
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
            category: String,
            question: String,
            userAnswer: String,
            correctAnswer: String,
            isCorrect: Boolean,
            feedback: String
        }
    ],
    date: { type: Date, default: Date.now }
});

const OriginalCareerAssessmentModel = mongoose.models.CareerAssessment || mongoose.model('CareerAssessment', CareerAssessmentSchema);
module.exports = wrapModel(careerAssessments, 'CareerAssessment', OriginalCareerAssessmentModel, mongoose);
