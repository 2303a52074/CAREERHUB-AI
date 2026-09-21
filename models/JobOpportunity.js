const mongoose = require('mongoose');
const { jobOpportunities, wrapModel } = require('../utils/inMemoryDB');

const JobOpportunitySchema = new mongoose.Schema({
    id: String,
    type: { type: String, enum: ['job', 'internship', 'hackathon', 'competition', 'course', 'certification'], default: 'job' },
    title: { type: String, required: true },
    organization: { type: String, required: true },
    location: { type: String, default: 'Remote' },
    salaryOrStipend: { type: String, default: 'Competitive' },
    requiredSkills: [String],
    eligibility: String,
    deadline: String,
    openings: { type: Number, default: 5 },
    description: String,
    applicationLink: String,
    featured: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

const OriginalJobOpportunityModel = mongoose.models.JobOpportunity || mongoose.model('JobOpportunity', JobOpportunitySchema);
module.exports = wrapModel(jobOpportunities, 'JobOpportunity', OriginalJobOpportunityModel, mongoose);
