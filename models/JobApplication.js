const mongoose = require('mongoose');
const { jobApplications, wrapModel } = require('../utils/inMemoryDB');

const JobApplicationSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    company: { type: String, required: true },
    jobRole: { type: String, required: true },
    type: { type: String, enum: ['job', 'internship', 'hackathon'], default: 'job' },
    location: String,
    salaryOrStipend: String,
    appliedDate: { type: String, default: () => new Date().toISOString().split('T')[0] },
    status: {
        type: String,
        enum: ['Applied', 'Shortlisted', 'Assessment', 'Interview', 'Selected', 'Rejected'],
        default: 'Applied'
    },
    interviewDate: String,
    matchPercentage: { type: Number, default: 80 },
    notes: String,
    contactPerson: String,
    updatedAt: { type: Date, default: Date.now }
});

const OriginalJobApplicationModel = mongoose.models.JobApplication || mongoose.model('JobApplication', JobApplicationSchema);
module.exports = wrapModel(jobApplications, 'JobApplication', OriginalJobApplicationModel, mongoose);
