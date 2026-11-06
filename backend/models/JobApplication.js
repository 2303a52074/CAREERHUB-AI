const mongoose = require('mongoose');
const { jobApplications, wrapModel } = require('../utils/inMemoryDB');

const StatusHistorySchema = new mongoose.Schema({
    status: String,
    timestamp: { type: Date, default: Date.now },
    note: String
}, { _id: false });

const JobApplicationSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    company: { type: String, required: true },
    jobRole: { type: String, required: true },
    jobId: { type: String },
    sourceUrl: { type: String },
    source: { type: String },
    applicationMethod: { type: String, default: 'tracked' },
    type: { type: String, enum: ['job', 'internship', 'hackathon'], default: 'job' },
    location: String,
    salaryOrStipend: String,
    appliedDate: { type: String, default: () => new Date().toISOString().split('T')[0] },
    status: {
        type: String,
        enum: [
            'Saved', 'Application Started', 'Applied', 'Shortlisted',
            'Assessment', 'Interview', 'Final Round', 'Offer',
            'Rejected', 'Withdrawn',
            // Legacy value kept for backward compat
            'Selected'
        ],
        default: 'Applied'
    },
    statusHistory: { type: [StatusHistorySchema], default: [] },
    interviewDate: String,
    matchPercentage: { type: Number, default: null },
    notes: String,
    contactPerson: String,
    externalConfirmed: { type: Boolean, default: false },
    updatedAt: { type: Date, default: Date.now }
});

JobApplicationSchema.index(
    { userId: 1, jobId: 1 },
    { unique: true, partialFilterExpression: { jobId: { $type: 'string', $gt: '' } } }
);

const OriginalJobApplicationModel = mongoose.models.JobApplication || mongoose.model('JobApplication', JobApplicationSchema);
module.exports = wrapModel(jobApplications, 'JobApplication', OriginalJobApplicationModel, mongoose);
