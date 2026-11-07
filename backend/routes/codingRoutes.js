const express = require('express');
const mongoose = require('mongoose');
const authMiddleware = require('../middleware/authMiddleware');
const CodingProblem = require('../models/CodingProblem');
const CodeSubmission = require('../models/CodeSubmission');
const SavedCodingProblem = require('../models/SavedCodingProblem');
const User = require('../models/User');
const {
    checkDockerAvailability,
    executeSource,
    executeProblemTestCases,
    getAvailableLanguages
} = require('../utils/codeExecutionService');
const {
    evaluateCode: evaluateCodeReview,
    generateCodingHint
} = require('../utils/aiService');
const { providerErrorMessage } = require('../utils/providerErrors');

const router = express.Router();
const LEETCODE_USERNAME_PATTERN = /^[a-zA-Z0-9_-]{1,39}$/;
const CURRENT_CATALOG = 'careerhub-dsa-100-v1';
const SUPPORTED_LANGUAGES = new Set(['python', 'java', 'cpp', 'javascript']);

function leetcodeProfileUrl(username) {
    return `https://leetcode.com/u/${encodeURIComponent(username)}/`;
}

function validDocumentId(id) {
    return mongoose.Types.ObjectId.isValid(id);
}

router.get('/leetcode/profile', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user._id || req.user.id).select('leetcodeUsername');
        const username = user?.leetcodeUsername || '';
        return res.json({
            username,
            profileUrl: username ? leetcodeProfileUrl(username) : null,
            verification: username ? 'unverified' : 'not_connected',
            syncedAt: null,
            statistics: null
        });
    } catch (error) {
        console.error('LeetCode profile lookup failed:', error.message);
        return res.status(500).json({ message: 'Could not load your LeetCode profile link.' });
    }
});

router.put('/leetcode/profile', authMiddleware, async (req, res) => {
    const username = typeof req.body.username === 'string' ? req.body.username.trim() : '';
    if (!LEETCODE_USERNAME_PATTERN.test(username)) {
        return res.status(400).json({
            code: 'LEETCODE_USERNAME_INVALID',
            message: 'Enter a LeetCode username containing only letters, numbers, underscores, or hyphens.'
        });
    }
    try {
        const user = await User.findById(req.user._id || req.user.id);
        if (!user) return res.status(404).json({ message: 'Account not found.' });
        user.leetcodeUsername = username;
        await user.save();
        return res.json({
            username,
            profileUrl: leetcodeProfileUrl(username),
            verification: 'unverified',
            message: 'Profile link saved. LeetCode did not provide a documented public API to verify or synchronize statistics.'
        });
    } catch (error) {
        console.error('LeetCode profile save failed:', error.message);
        return res.status(500).json({ message: 'Could not save your LeetCode profile link.' });
    }
});

router.delete('/leetcode/profile', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user._id || req.user.id);
        if (!user) return res.status(404).json({ message: 'Account not found.' });
        user.leetcodeUsername = '';
        await user.save();
        return res.json({ message: 'LeetCode profile link removed.', username: null });
    } catch (error) {
        console.error('LeetCode profile disconnect failed:', error.message);
        return res.status(500).json({ message: 'Could not remove your LeetCode profile link.' });
    }
});

router.post('/leetcode/sync', authMiddleware, async (req, res) => {
    return res.status(503).json({
        code: 'LEETCODE_SYNC_UNAVAILABLE',
        message: 'Automatic sync is unavailable because LeetCode has no documented public statistics API and no authorized data provider is configured. Your saved profile link and CareerHub practice history are unchanged.'
    });
});

router.get('/languages', authMiddleware, async (req, res) => {
    try {
        const [languages, engine] = await Promise.all([
            getAvailableLanguages(),
            checkDockerAvailability()
        ]);
        return res.json({
            status: engine.available ? 'ready' : 'unavailable',
            engine,
            languages: languages.map(({ value, label, editorLanguage, starterCode }) => ({
                value,
                label,
                editorLanguage,
                starterCode
            }))
        });
    } catch (error) {
        if (error.code?.startsWith('CODE_')) {
            return res.status(error.status || 502).json({
                status: 'unavailable',
                code: error.code,
                message: error.message
            });
        }
        console.error('Code execution language check failed:', error.message);
        return res.status(500).json({
            status: 'unavailable',
            message: 'Could not verify the configured code execution service.'
        });
    }
});

router.get('/engine', authMiddleware, async (req, res) => {
    const engine = await checkDockerAvailability({ refresh: true });
    return res.status(engine.available ? 200 : 503).json({
        status: engine.available ? 'ready' : 'unavailable',
        engine: 'CareerHub local Docker runner',
        languages: [...SUPPORTED_LANGUAGES],
        message: engine.message
    });
});

// ========== RUN CODE IN THE LOCAL ISOLATED EXECUTION ENGINE ==========
router.post('/run', authMiddleware, async (req, res) => {
    try {
        const {
            code,
            language = 'javascript',
            stdin = ''
        } = req.body;
        if (typeof code !== 'string' || !code.trim()) {
            return res.status(400).json({ success: false, error: 'Code cannot be empty.' });
        }
        if (typeof language !== 'string' || !SUPPORTED_LANGUAGES.has(language)) {
            return res.status(400).json({ success: false, error: 'Choose Python, Java, C++, or JavaScript.' });
        }
        if (Buffer.byteLength(code, 'utf8') > 20000 ||
            typeof stdin !== 'string' || Buffer.byteLength(stdin, 'utf8') > 5000) {
            return res.status(413).json({ success: false, error: 'Code or sample input exceeds the supported size.' });
        }

        const execution = await executeSource(code, { language, stdin });
        const output = execution.stdout.trim();
        const executionError = execution.stderr || execution.compileOutput ||
            (execution.status === 'time_limit' ? 'Execution exceeded the configured time limit.' : null) ||
            (execution.status === 'memory_limit' ? 'Execution exceeded the configured memory limit.' : null);
        return res.json({
            success: execution.status === 'accepted',
            status: execution.status,
            statusDescription: execution.statusDescription,
            output,
            stdout: execution.stdout,
            stderr: execution.stderr,
            compileOutput: execution.compileOutput,
            error: executionError,
            executionTime: execution.time,
            memoryUsed: execution.memory
        });
    } catch (err) {
        if (err.code?.startsWith('CODE_')) {
            return res.status(err.status || 502).json({
                success: false,
                code: err.code,
                error: err.message
            });
        }
        console.error('Local code execution failed:', err.message);
        return res.status(500).json({ success: false, error: 'Code execution failed.' });
    }
});

router.post('/problems/:id/run', authMiddleware, async (req, res) => {
    try {
        if (!validDocumentId(req.params.id)) return res.status(400).json({ message: 'Invalid problem identifier.' });
        const { code, language, stdin } = req.body;
        if (typeof code !== 'string' || !code.trim() || Buffer.byteLength(code, 'utf8') > 20000) {
            return res.status(code?.length > 20000 ? 413 : 400)
                .json({ message: 'Provide code between 1 and 20,000 characters.' });
        }
        if (!SUPPORTED_LANGUAGES.has(language)) {
            return res.status(400).json({ message: 'Choose Python, Java, C++, or JavaScript.' });
        }
        const problem = await CodingProblem.findOne({
            _id: req.params.id,
            catalogVersion: CURRENT_CATALOG,
            isActive: true
        });
        if (!problem) return res.status(404).json({ message: 'Problem not found.' });
        if (stdin !== undefined &&
            (typeof stdin !== 'string' || Buffer.byteLength(stdin, 'utf8') > 5000)) {
            return res.status(413).json({ message: 'Custom input must be 5,000 bytes or fewer.' });
        }
        if (typeof stdin === 'string' && stdin.length > 0) {
            const execution = await executeSource(code, {
                language,
                stdin,
                timeLimit: problem.timeLimit,
                memoryLimit: problem.memoryLimit
            });
            const passed = execution.status === 'accepted';
            const userId = req.user._id || req.user.id;
            const submission = new CodeSubmission({
                userId,
                problemId: problem._id,
                code,
                language,
                status: execution.status,
                score: 0,
                completed: false,
                executionTime: execution.time,
                testResults: [{
                    testCaseId: -1,
                    passed,
                    actualOutput: execution.stdout,
                    expectedOutput: '',
                    ...(execution.stderr ? { error: execution.stderr } : {})
                }]
            });
            await submission.save();
            return res.json({
                runId: submission._id,
                status: execution.status,
                passed: passed ? 1 : 0,
                total: 1,
                results: [{
                    passed,
                    status: execution.status,
                    actualOutput: execution.stdout,
                    ...(execution.stderr ? { error: execution.stderr } : {})
                }],
                executionTime: execution.time,
                memoryUsed: execution.memory
            });
        }
        const run = await executeProblemTestCases(code, problem.testCases || [], {
            language,
            timeLimit: problem.timeLimit,
            memoryLimit: problem.memoryLimit,
            includeHidden: false
        });
        const userId = req.user._id || req.user.id;
        const submission = new CodeSubmission({
            userId,
            problemId: problem._id,
            code,
            language,
            status: run.status,
            score: 0,
            completed: false,
            executionTime: run.executionTime,
            memoryUsed: run.memory,
            testResults: run.results
        });
        await submission.save();
        return res.json({
            runId: submission._id,
            status: run.status,
            passed: run.results.filter(result => result.passed).length,
            total: run.results.length,
            results: run.results,
            executionTime: run.executionTime,
            memoryUsed: run.memory
        });
    } catch (error) {
        if (error.code?.startsWith('CODE_')) {
            return res.status(error.status || 502).json({ code: error.code, message: error.message });
        }
        console.error('Coding sample run failed:', error.message);
        return res.status(500).json({ message: 'Could not run the public sample tests.' });
    }
});

router.post('/hint', authMiddleware, async (req, res) => {
    const problemId = typeof req.body.problemId === 'string' ? req.body.problemId : '';
    if (!problemId || problemId.length > 120) {
        return res.status(400).json({ message: 'Select a valid coding problem to request a hint.' });
    }
    try {
        const problem = await CodingProblem.findOne({
            _id: problemId,
            catalogVersion: CURRENT_CATALOG,
            isActive: true,
            seedKey: { $exists: true, $ne: '' }
        });
        if (!problem) return res.status(404).json({ message: 'Problem not found.' });
        const hint = await generateCodingHint({
            title: problem.title,
            description: problem.description
        });
        res.json({
            ...hint,
            ...(hint.contextMode === 'generic_privacy_safe'
                ? { privacyNotice: 'Gemini receives only the public practice-problem statement; your profile and submitted code are not sent.' }
                : {})
        });
    } catch (error) {
        if (error.code?.startsWith('AI_')) {
            return res.status(error.status || 502).json({
                code: error.code,
                message: providerErrorMessage(error.code, 'Coding hint', error)
            });
        }
        console.error('Coding hint generation failed:', error.message);
        res.status(500).json({ message: 'Coding hint generation failed.' });
    }
});

// ========== AI CODE ANALYSIS ROUTE ==========
router.post('/analyze', authMiddleware, async (req, res) => {
    const { code, problemTitle, problemDescription } = req.body;

    if (typeof code !== 'string' || !code.trim() || code.length > 20000) {
        return res.status(code?.length > 20000 ? 413 : 400).json({ message: 'Provide code between 1 and 20,000 characters.' });
    }
    try {
        const result = await evaluateCodeReview(
            `${problemTitle || 'Coding Challenge'}\n${problemDescription || ''}`,
            code
        );
        if (result.source === 'unavailable') {
            return res.status(503).json({
                code: 'AI_PROVIDER_NOT_CONFIGURED',
                message: result.feedback
            });
        }
        return res.json({
            analysis: `${result.score === null ? 'No score' : `Review score: ${result.score}/10`}\n\n${result.feedback}`,
            source: result.source,
            model: result.model || null
        });
    } catch (error) {
        if (error.code?.startsWith('AI_')) {
            return res.status(error.status || 502).json({
                code: error.code,
                message: providerErrorMessage(error.code, 'Code review', error)
            });
        }
        console.error('Code analysis failed:', error.message);
        return res.status(500).json({ message: 'Code analysis failed.' });
    }
});

// ========== SUBMIT CODE SOLUTION ==========
router.post('/submit/:problemId', authMiddleware, async (req, res) => {
    try {
        if (!validDocumentId(req.params.problemId)) {
            return res.status(400).json({ message: 'Invalid problem identifier.' });
        }
        const { code, language = 'javascript' } = req.body;
        
        if (typeof code !== 'string' || code.trim() === '') {
            return res.status(400).json({ message: 'Code cannot be empty.' });
        }
        if (Buffer.byteLength(code, 'utf8') > 20000 || !SUPPORTED_LANGUAGES.has(language)) {
            return res.status(400).json({ message: 'Code must be at most 20,000 characters and include a supported language.' });
        }
        
        const problem = await CodingProblem.findOne({
            _id: req.params.problemId,
            catalogVersion: CURRENT_CATALOG,
            isActive: true
        });
        if (!problem) return res.status(404).json({ message: 'Problem not found' });
        
        const { allPassed, status, results, executionTime, memory } = await executeProblemTestCases(
            code,
            problem.testCases || [],
            {
                language,
                timeLimit: problem.timeLimit,
                memoryLimit: problem.memoryLimit
            }
        );
        const score = allPassed ? (problem.points || 10) : 0;
        
        const userId = req.user._id || req.user.id;
        const alreadyAccepted = status === 'accepted'
            ? await CodeSubmission.findOne({
                userId: String(userId),
                problemId: problem._id,
                status: 'accepted',
                completed: true
            }).select('_id')
            : null;
        const submission = new CodeSubmission({
            userId: req.user._id || req.user.id,
            problemId: problem._id,
            code,
            language,
            status,
            score,
            executionTime,
            memoryUsed: memory ?? null,
            completed: status === 'accepted',
            testResults: results
        });
        await submission.save();

        let xpEarned = 0;
        if (status === 'accepted') {
            const completion = { $addToSet: { completedCodingProblems: problem._id } };
            if (alreadyAccepted) {
                await User.updateOne({ _id: userId }, completion);
            } else {
                const award = await User.updateOne(
                    { _id: userId, completedCodingProblems: { $ne: problem._id } },
                    { ...completion, $inc: { xp: score } }
                );
                if ((award.modifiedCount ?? award.nModified) > 0) {
                    xpEarned = score;
                    const user = await User.findById(userId).select('xp');
                    if (user) {
                        await User.updateOne(
                            { _id: userId },
                            { $set: { level: Math.floor((user.xp || 0) / 100) + 1 } }
                        );
                    }
                }
            }
        }
        
        return res.json({
            status,
            score,
            xpEarned,
            results,
            message: allPassed ? "✅ Correct! All test cases passed." : "❌ Failed some test cases."
        });
        
    } catch (error) {
        if (error.code?.startsWith('CODE_')) {
            return res.status(error.status || 502).json({
                code: error.code,
                message: error.message
            });
        }
        console.error('Code submission failed:', error.message);
        return res.status(500).json({ message: 'Submission failed.' });
    }
});

router.get('/problems/:id/submissions', authMiddleware, async (req, res) => {
    try {
        if (!validDocumentId(req.params.id)) return res.status(400).json({ message: 'Invalid problem identifier.' });
        const problem = await CodingProblem.findOne({
            _id: req.params.id,
            catalogVersion: CURRENT_CATALOG,
            isActive: true
        }).select('_id');
        if (!problem) {
            return res.status(404).json({ message: 'Problem not found' });
        }
        const submissions = await CodeSubmission.find({
            userId: req.user._id || req.user.id,
            problemId: problem._id
        }).sort({ submittedAt: -1 }).limit(50);
        return res.json(submissions);
    } catch (error) {
        console.error('Problem submission history failed:', error.message);
        return res.status(500).json({ message: 'Could not load this problem’s history.' });
    }
});

router.get('/saved', authMiddleware, async (req, res) => {
    try {
        const saved = await SavedCodingProblem.find({ userId: req.user._id || req.user.id })
            .sort({ createdAt: -1 }).select('problemId createdAt');
        return res.json(saved);
    } catch (error) {
        console.error('Saved coding problems lookup failed:', error.message);
        return res.status(500).json({ message: 'Could not load saved problems.' });
    }
});

router.put('/saved/:problemId', authMiddleware, async (req, res) => {
    try {
        if (!validDocumentId(req.params.problemId)) {
            return res.status(400).json({ message: 'Invalid problem identifier.' });
        }
        const problem = await CodingProblem.findOne({
            _id: req.params.problemId,
            catalogVersion: CURRENT_CATALOG,
            isActive: true
        });
        if (!problem) return res.status(404).json({ message: 'Problem not found.' });
        const userId = req.user._id || req.user.id;
        const saved = await SavedCodingProblem.findOneAndUpdate(
            { userId, problemId: problem._id },
            { $setOnInsert: { userId, problemId: problem._id } },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        return res.json({ saved: true, problemId: problem._id, createdAt: saved.createdAt });
    } catch (error) {
        if (error.code === 11000) return res.json({ saved: true, problemId: req.params.problemId });
        console.error('Saving coding problem failed:', error.message);
        return res.status(500).json({ message: 'Could not save this problem.' });
    }
});

router.delete('/saved/:problemId', authMiddleware, async (req, res) => {
    try {
        if (!validDocumentId(req.params.problemId)) {
            return res.status(400).json({ message: 'Invalid problem identifier.' });
        }
        const result = await SavedCodingProblem.deleteOne({
            userId: req.user._id || req.user.id,
            problemId: req.params.problemId
        });
        return res.json({ saved: false, removed: (result.deletedCount || result.n) > 0 });
    } catch (error) {
        console.error('Removing saved coding problem failed:', error.message);
        return res.status(500).json({ message: 'Could not remove this saved problem.' });
    }
});

// ========== GET PROBLEM BY ID ==========
router.get('/problems/:id', authMiddleware, async (req, res) => {
    try {
        if (!validDocumentId(req.params.id)) return res.status(400).json({ message: 'Invalid problem identifier.' });
        const problem = await CodingProblem.findOne({
            _id: req.params.id,
            catalogVersion: CURRENT_CATALOG,
            isActive: true
        }).select('-solutionCode -referenceCode');
        if (!problem) return res.status(404).json({ message: 'Problem not found' });
        const [accepted, attempted, saved] = await Promise.all([
            CodeSubmission.findOne({
                userId: req.user._id || req.user.id,
                problemId: problem._id,
                completed: true,
                status: 'accepted'
            }).select('_id'),
            CodeSubmission.findOne({
                userId: req.user._id || req.user.id,
                problemId: problem._id
            }).select('_id'),
            SavedCodingProblem.findOne({
                userId: req.user._id || req.user.id,
                problemId: problem._id
            }).select('_id')
        ]);
        const response = problem.toObject ? problem.toObject() : { ...problem };
        response.examples = (response.testCases || []).filter(test => !test.isHidden).map(test => ({
            input: test.stdin ?? test.input,
            output: test.expectedOutput,
            explanation: test.explanation || ''
        }));
        delete response.testCases;
        response.solved = Boolean(accepted);
        response.attempted = Boolean(attempted);
        response.saved = Boolean(saved);
        return res.json(response);
    } catch (error) {
        console.error('Coding problem lookup failed:', error.message);
        return res.status(500).json({ message: 'Could not load this coding problem.' });
    }
});

// ========== SEARCH, FILTER, SORT, AND PAGE THROUGH THE ACTIVE LIBRARY ==========
router.get('/submissions', authMiddleware, async (req, res) => {
    try {
        const submissions = await CodeSubmission.find({
            userId: String(req.user._id || req.user.id)
        }).sort({ submittedAt: -1 }).limit(100).select('-code -testResults');
        res.json(submissions);
    } catch (error) {
        console.error('Coding submission history failed:', error);
        res.status(500).json({ message: 'Failed to load your coding submissions.' });
    }
});

// ========== GET USER CODING STATS ==========
router.get('/stats', authMiddleware, async (req, res) => {
    try {
        const userId = req.user._id || req.user.id;
        const [problems, submissions, saved] = await Promise.all([
            CodingProblem.find({ catalogVersion: CURRENT_CATALOG, isActive: true })
                .select('_id difficulty category problemId title'),
            CodeSubmission.find({ userId }).sort({ submittedAt: -1 }).limit(500)
                .select('problemId status completed submittedAt executionTime memoryUsed language score'),
            SavedCodingProblem.find({ userId }).select('problemId createdAt')
        ]);
        const problemById = new Map(problems.map(problem => [String(problem._id), problem]));
        const solvedIds = new Set((submissions || [])
            .filter(item => item.completed !== false && item.status === 'accepted' &&
                problemById.has(String(item.problemId)))
            .map(item => String(item.problemId)));
        const attemptedIds = new Set((submissions || [])
            .map(item => String(item.problemId))
            .filter(id => problemById.has(id)));
        const difficultyProgress = {};
        const topicProgress = {};
        for (const problem of problems) {
            const solved = solvedIds.has(String(problem._id));
            const difficulty = difficultyProgress[problem.difficulty] ||
                (difficultyProgress[problem.difficulty] = { total: 0, solved: 0 });
            difficulty.total++;
            if (solved) difficulty.solved++;
            const topic = topicProgress[problem.category] ||
                (topicProgress[problem.category] = { total: 0, solved: 0 });
            topic.total++;
            if (solved) topic.solved++;
        }
        const acceptedAttempts = (submissions || []).filter(item =>
            item.completed !== false && item.status === 'accepted').length;
        const pointsByProblem = new Map();
        for (const submission of submissions || []) {
            const id = String(submission.problemId);
            if (submission.completed !== false && submission.status === 'accepted' &&
                problemById.has(id)) {
                pointsByProblem.set(id, Math.max(pointsByProblem.get(id) || 0, submission.score || 0));
            }
        }
        const countedAttempts = (submissions || []).filter(item => item.completed !== false).length;
        const unsolvedAttempts = (submissions || []).filter(item =>
            !solvedIds.has(String(item.problemId)));
        const continueProblem = unsolvedAttempts
            .map(item => problemById.get(String(item.problemId)))
            .find(Boolean);
        const dayNumber = Math.floor(Date.now() / 86400000);
        const dailyChallenge = problems.length ? problems[dayNumber % problems.length] : null;
        return res.json({
            totalProblems: problems.length,
            totalSolved: solvedIds.size,
            totalAttempted: attemptedIds.size,
            totalSaved: saved.length,
            totalPoints: [...pointsByProblem.values()].reduce((total, points) => total + points, 0),
            successRate: countedAttempts ? Math.round((acceptedAttempts / countedAttempts) * 100) : 0,
            difficulty: difficultyProgress,
            topics: topicProgress,
            recentSubmissions: submissions.slice(0, 10),
            dailyChallenge: dailyChallenge ? {
                id: dailyChallenge._id,
                problemId: dailyChallenge.problemId,
                title: dailyChallenge.title,
                difficulty: dailyChallenge.difficulty,
                category: dailyChallenge.category
            } : null,
            continueProblem: continueProblem ? {
                id: continueProblem._id,
                problemId: continueProblem.problemId,
                title: continueProblem.title,
                difficulty: continueProblem.difficulty,
                category: continueProblem.category
            } : null
        });
    } catch (error) {
        console.error('Coding progress lookup failed:', error.message);
        return res.status(500).json({ message: 'Could not load coding progress.' });
    }
});

router.get('/problems', authMiddleware, async (req, res) => {
    try {
        for (const key of ['search', 'difficulty', 'topic', 'status', 'sort']) {
            if (req.query[key] !== undefined &&
                (typeof req.query[key] !== 'string' || req.query[key].length > 100)) {
                return res.status(400).json({ message: `Invalid ${key} filter.` });
            }
        }
        const difficulty = String(req.query.difficulty || '').toLowerCase();
        if (difficulty && !['easy', 'medium', 'hard'].includes(difficulty)) {
            return res.status(400).json({ message: 'Difficulty must be easy, medium, or hard.' });
        }
        const status = String(req.query.status || '');
        if (status && !['solved', 'attempted', 'saved', 'todo'].includes(status)) {
            return res.status(400).json({ message: 'Status filter must be solved, attempted, saved, or todo.' });
        }
        const page = Math.max(1, Math.min(1000, Number.parseInt(req.query.page, 10) || 1));
        const limit = Math.max(1, Math.min(50, Number.parseInt(req.query.limit, 10) || 20));
        const search = String(req.query.search || '').trim();
        const topic = String(req.query.topic || '').trim();
        const sort = String(req.query.sort || 'problemId');
        if (!['problemId', 'title', 'difficulty', 'createdAt'].includes(sort)) {
            return res.status(400).json({ message: 'Unsupported problem sort order.' });
        }
        const filter = { catalogVersion: CURRENT_CATALOG, isActive: true };
        if (difficulty) filter.difficulty = difficulty;
        if (topic) filter.category = topic;
        if (search) {
            const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            filter.$or = [
                { problemId: { $regex: `^${escaped}`, $options: 'i' } },
                { title: { $regex: escaped, $options: 'i' } },
                { description: { $regex: escaped, $options: 'i' } },
                { tags: { $regex: escaped, $options: 'i' } }
            ];
        }
        const userId = req.user._id || req.user.id;
        const [submissions, savedRecords] = await Promise.all([
            CodeSubmission.find({ userId }).select('problemId status completed'),
            SavedCodingProblem.find({ userId }).select('problemId')
        ]);
        const solvedIds = new Set(submissions.filter(item =>
            item.completed !== false && item.status === 'accepted').map(item => String(item.problemId)));
        const attemptedIds = new Set(submissions.map(item => String(item.problemId)));
        const savedIds = new Set(savedRecords.map(item => String(item.problemId)));
        const statusIds = status === 'solved' ? [...solvedIds]
            : status === 'attempted' ? [...attemptedIds]
                : status === 'saved' ? [...savedIds]
                    : status === 'todo' ? [...new Set([
                        ...submissions.map(item => String(item.problemId)),
                        ...savedRecords.map(item => String(item.problemId))
                    ])] : null;
        if (statusIds) {
            const objectIds = statusIds
                .filter(id => mongoose.Types.ObjectId.isValid(id))
                .map(id => new mongoose.Types.ObjectId(id));
            filter._id = status === 'todo' ? { $nin: objectIds } : { $in: objectIds };
        }
        const total = await CodingProblem.countDocuments(filter);
        const sortDirection = sort === 'createdAt' ? -1 : 1;
        const pageProblems = await CodingProblem.find(filter)
            .sort({ [sort]: sortDirection, _id: 1 })
            .skip((page - 1) * limit).limit(limit)
            .select('-solutionCode -referenceCode -testCases -editorial -hints -starterCode -examples -companies');
        const rows = pageProblems.map(problem => {
            const row = problem.toObject ? problem.toObject() : { ...problem };
            const id = String(row._id);
            row.solved = solvedIds.has(id);
            row.attempted = attemptedIds.has(id);
            row.saved = savedIds.has(id);
            return row;
        });
        const result = { problems: rows, page, limit, total, pages: Math.ceil(total / limit) };
        if (req.query.page === undefined && req.query.limit === undefined) {
            return res.json(rows);
        }
        return res.json(result);
    } catch (error) {
        console.error('Coding problem catalog query failed:', error.message);
        return res.status(500).json({ message: 'Could not fetch coding problems.' });
    }
});

module.exports = router;
