require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const authRoutes = require('./routes/authRoutes');
const interviewRoutes = require('./routes/interviewRoutes');
const resumeRoutes = require('./routes/resumeRoutes');
const videoRoutes = require('./routes/videoRoutes');
const userRoutes = require('./routes/userRoutes');
const challengeRoutes = require('./routes/challengeRoutes');
const codingRoutes = require('./routes/codingRoutes');
const adminRoutes = require('./routes/adminRoutes');
const careerRoutes = require('./routes/careerRoutes');

// Ensure upload directories exist
const uploadDir = path.join(__dirname, 'uploads', 'videos');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Determine frontend directory (supports ../frontend as well as fallback to public)
const frontendCandidates = [
    path.join(__dirname, '..', 'frontend'),
    path.join(__dirname, 'frontend'),
    path.join(__dirname, '..', 'public'),
    path.join(__dirname, 'public')
];
const frontendDir = frontendCandidates.find(dir => fs.existsSync(dir)) || path.join(__dirname, '..', 'frontend');
console.log(`📁 Serving frontend static files from: ${frontendDir}`);

// Serve static frontend files
app.use(express.static(frontendDir));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'CareerHub AI Backend',
        database: mongoose.connection.readyState === 1 ? 'connected' : 'in-memory-fallback',
        timestamp: new Date().toISOString()
    });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/interview', interviewRoutes);
app.use('/api/resume', resumeRoutes);
app.use('/api/video', videoRoutes);
app.use('/api/user', userRoutes);
app.use('/api/challenge', challengeRoutes);
app.use('/api/coding', codingRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/career', careerRoutes);

// Database connection handling (Mongoose with offline fallback)
mongoose.set('bufferCommands', false);
const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;

if (mongoUri) {
    mongoose.connect(mongoUri)
        .then(() => console.log("✅ MongoDB Connected successfully"))
        .catch(err => console.warn('⚠️ MongoDB not reachable — using robust in-memory fallback:', err.message));
} else {
    console.log("ℹ️ [CareerHub AI] Running with high-performance in-memory database store");
}

// Error middleware for graceful database handling
app.use((err, req, res, next) => {
    if (err.name === 'MongooseError' || err.name === 'MongoNetworkError' || (err.message && err.message.includes('buffering timed out'))) {
        console.warn('[CareerHub AI] Database operation timed out — returning fallback response');
        if (req.method === 'GET') {
            return res.json(req.path.endsWith('s') || req.path.endsWith('s/') ? [] : {});
        }
        return res.status(503).json({ error: 'Service temporarily unavailable (database offline)' });
    }
    console.error('Server error:', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
});

// Explicit clean routes for all 14 dedicated pages and auth views
const pageRoutes = [
    { route: '/dashboard', file: 'dashboard.html' },
    { route: '/assessment', file: 'assessment.html' },
    { route: '/skills', file: 'skills.html' },
    { route: '/roadmap', file: 'roadmap.html' },
    { route: '/daily-plan', file: 'daily-plan.html' },
    { route: '/coding', file: 'coding.html' },
    { route: '/interviews', file: 'interviews.html' },
    { route: '/resume', file: 'resume.html' },
    { route: '/job-analyzer', file: 'job-analyzer.html' },
    { route: '/job-matching', file: 'job-matching.html' },
    { route: '/jobs', file: 'jobs.html' },
    { route: '/applications', file: 'applications.html' },
    { route: '/analytics', file: 'analytics.html' },
    { route: '/assistant', file: 'assistant.html' },
    { route: '/login', file: 'login.html' },
    { route: '/register', file: 'register.html' },
    { route: '/admin', file: 'admin.html' },
    { route: '/problems', file: 'problems.html' },
    { route: '/editor', file: 'editor.html' }
];

pageRoutes.forEach(({ route, file }) => {
    app.get([route, route + '.html'], (req, res) => {
        const filePath = path.join(frontendDir, file);
        if (fs.existsSync(filePath)) {
            res.sendFile(filePath);
        } else {
            res.sendFile(path.join(frontendDir, 'index.html'));
        }
    });
});

// SPA fallback for HTML pages
app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(frontendDir, 'index.html'));
});

// Required container port and host
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 CareerHub AI Backend running on http://0.0.0.0:${PORT}`);
});

module.exports = app;
