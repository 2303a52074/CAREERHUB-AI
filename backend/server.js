require('./utils/loadEnv')();
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
const CodingProblem = require('./models/CodingProblem');
const { seedPromise } = require('./utils/inMemoryDB');
const seedCodingProblems = require('./utils/seedCodingProblems');
const codingProblemLibrary = require('./utils/codingProblemLibrary');
const authMiddleware = require('./middleware/authMiddleware');
const {
    verifyAIProviderConnectivity,
    getOpenRouterConfiguration,
    getGeminiConfiguration
} = require('./utils/aiService');
const { providerErrorMessage } = require('./utils/providerErrors');

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

// Health check endpoint
app.get('/api/health', (req, res) => {
    const databaseConnected = mongoose.connection.readyState === 1;
    res.status(databaseConnected ? 200 : 503).json({
        status: databaseConnected ? 'ok' : 'unavailable',
        service: 'CareerHub AI Backend',
        database: databaseConnected ? 'connected' : 'unavailable',
        timestamp: new Date().toISOString()
    });
});

app.locals.mongo = mongoose.connection;
app.use('/api', require('./utils/requireMongo'));

app.post('/api/health/ai', authMiddleware, async (req, res) => {
    const result = await verifyAIProviderConnectivity();
    const configuration = process.env.AI_PROVIDER?.trim().toLowerCase() === 'gemini'
        ? getGeminiConfiguration()
        : getOpenRouterConfiguration();
    return res.status(result.httpStatus).json({
        status: result.status,
        provider: result.provider,
        configured: result.configured,
        verified: result.ok,
        model: result.model,
        configuration: {
            apiKeyConfigured: configuration.apiKeyConfigured,
            provider: configuration.provider,
            requiredConfiguration: configuration.requiredConfiguration,
            optionalConfiguration: configuration.optionalConfiguration
        },
        code: result.code,
        ...(result.providerDiagnostics
            ? { providerDiagnostics: result.providerDiagnostics }
            : {}),
        message: result.code
            ? providerErrorMessage(result.code, `${result.provider} connectivity check`, {
                provider: result.provider,
                providerDiagnostics: result.providerDiagnostics
            })
            : `${result.provider} generated and returned a valid connectivity response.`
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
        .then(async () => {
            console.log("✅ MongoDB Connected successfully");
            await seedPromise;
            await seedCodingProblems(CodingProblem, codingProblemLibrary);
            console.log(`✅ Coding problem library is ready (${codingProblemLibrary.length} definitions).`);
        })
        .catch(err => console.error('⚠️ MongoDB initialization or coding catalog seeding failed:', err.message));
} else {
    console.warn('MongoDB is not configured. Persistent API operations are disabled.');
}

// Error middleware for graceful database handling
app.use((err, req, res, next) => {
    if (err.name === 'MongooseError' || err.name === 'MongoNetworkError' || (err.message && err.message.includes('buffering timed out'))) {
        console.warn('[CareerHub AI] Database is unavailable:', err.message);
        return res.status(503).json({ error: 'Database temporarily unavailable. Please retry.' });
    }
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error.' });
});

// Explicit clean routes for dedicated pages and auth views
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
    { route: '/resources', file: 'resources.html' },
    { route: '/assistant', file: 'assistant.html' },
    { route: '/login', file: 'login.html' },
    { route: '/register', file: 'register.html' },
    { route: '/admin', file: 'admin.html' },
    { route: '/problems', file: 'problems.html' },
    { route: '/problem', file: 'problem.html' },
    { route: '/editor', file: 'editor.html' },
    { route: '/profile', file: 'profile.html' },
    { route: '/recommendations', file: 'recommendations.html' }
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
