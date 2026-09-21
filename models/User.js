/*Design a Mongoose schema for user authentication including name, email, password, and role*/

const mongoose = require('mongoose');
const { users, wrapModel } = require('../utils/inMemoryDB');

const UserSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    password: String,
    role: { type: String, default: "user" },
    xp: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
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
    degree: { type: String, default: 'B.Tech' },
    branch: { type: String, default: 'Computer Science and Engineering' },
    college: { type: String, default: 'SR University' },
    graduationYear: { type: String, default: '2026' },
    cgpa: { type: String, default: '8.7' },
    technicalSkills: { type: [String], default: ['JavaScript', 'React', 'HTML/CSS', 'Python', 'Node.js', 'Git'] },
    softSkills: { type: [String], default: ['Problem Solving', 'Team Collaboration', 'Communication'] },
    certifications: { type: [String], default: ['Full Stack Web Development - Coursera', 'AWS Cloud Foundations'] },
    projects: {
        type: [
            {
                title: String,
                techStack: String,
                description: String,
                link: String
            }
        ],
        default: [
            {
                title: 'AI Smart Career & Placement Portal',
                techStack: 'React, Node.js, Express, Gemini AI',
                description: 'Full stack AI-powered career assistant with automated mock interviews and resume scoring.',
                link: 'https://github.com/candidate/careerhub'
            }
        ]
    },
    experience: {
        type: [
            {
                company: String,
                role: String,
                duration: String,
                description: String
            }
        ],
        default: [
            {
                company: 'InnovateX Labs',
                role: 'Frontend Developer Intern',
                duration: 'Jun 2025 - Aug 2025 (3 mos)',
                description: 'Developed interactive dashboards and improved Lighthouse performance by 25%.'
            }
        ]
    },
    careerInterests: { type: [String], default: ['Full Stack Development', 'Frontend Architecture', 'Cloud Computing'] },
    preferredRoles: { type: [String], default: ['Full Stack Developer', 'Software Engineer', 'Frontend Engineer'] },
    preferredLocations: { type: [String], default: ['Bengaluru', 'Hyderabad', 'Remote'] },
    careerGoals: { type: String, default: 'Aiming to join a top-tier engineering team as a Software Engineer and build scalable, user-centric web applications.' },
    careerReadinessScore: { type: Number, default: 78 },
    resumeScore: { type: Number, default: 84 },
    targetRole: { type: String, default: 'Full Stack Developer' }
});

const OriginalUserModel = mongoose.models.User || mongoose.model('User', UserSchema);
module.exports = wrapModel(users, 'User', OriginalUserModel, mongoose);