/*Design a Mongoose schema for user authentication including name, email, password, and role*/

const mongoose = require('mongoose');
const { users, wrapModel } = require('../utils/inMemoryDB');

const UserSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true, lowercase: true, trim: true },
    password: String,
    role: { type: String, default: "user" },
    xp: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
    completedCodingProblems: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'CodingProblem' }], default: [] },
    completedChallengeIds: { type: [String], default: [] },
    streak: { type: Number, default: 0 },
    lastPractice: Date,
    theme: { type: String, default: 'dark' },        
    publicProfile: { type: Boolean, default: false },  
    github: {                                           
        username: String,
        repos: Array,
        languages: Object
    },
    googleCalendarConnected: Boolean,                  // for calendar integration
    calendarRefreshToken: String,
    // CareerHub AI profile fields
    degree: { type: String, default: '' },
    branch: { type: String, default: '' },
    college: { type: String, default: '' },
    graduationYear: { type: String, default: '' },
    cgpa: { type: String, default: '' },
    technicalSkills: { type: [String], default: [] },
    softSkills: { type: [String], default: [] },
    certifications: { type: [String], default: [] },
    projects: {
        type: [{ title: String, techStack: String, description: String, link: String }],
        default: []
    },
    experience: {
        type: [{ company: String, role: String, duration: String, description: String }],
        default: []
    },
    careerInterests: { type: [String], default: [] },
    preferredRoles: { type: [String], default: [] },
    preferredLocations: { type: [String], default: [] },
    careerGoals: { type: String, default: '' },
    careerReadinessScore: { type: Number, default: 0 },
    resumeScore: { type: Number, default: 0 },
    targetRole: { type: String, default: '' },
    leetcodeUsername: { type: String, default: '' }
});

const OriginalUserModel = mongoose.models.User || mongoose.model('User', UserSchema);
module.exports = wrapModel(users, 'User', OriginalUserModel, mongoose);