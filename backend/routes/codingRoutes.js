const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const CodingProblem = require('../models/CodingProblem');
const CodeSubmission = require('../models/CodeSubmission');
const User = require('../models/User');
const {
    argumentsToStdin,
    executeJavaScript,
    executeSource,
    executeProblemTestCases,
    getAvailableLanguages,
    makeFunctionCallSource,
    parseInputArguments
} = require('../utils/codeExecutionService');
const { withOfficialLeetCodeLink, filterCodingProblems } = require('../utils/leetcodeCatalog');
const {
    evaluateCode: evaluateCodeReview,
    generateCodingHint,
    getCareerAssistantStatus
} = require('../utils/aiService');
const { providerErrorMessage } = require('../utils/providerErrors');

const router = express.Router();
const LEETCODE_USERNAME_PATTERN = /^[a-zA-Z0-9_-]{1,39}$/;

function leetcodeProfileUrl(username) {
    return `https://leetcode.com/u/${encodeURIComponent(username)}/`;
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
        const languages = await getAvailableLanguages();
        return res.json({
            status: 'ready',
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

// ========== RUN CODE ON THE ISOLATED EXECUTION SERVICE ==========
router.post('/run', authMiddleware, async (req, res) => {
    try {
        const {
            code,
            language = 'javascript',
            mode = 'problem',
            testInput = '',
            stdin = ''
        } = req.body;
        if (typeof code !== 'string' || !code.trim()) {
            return res.status(400).json({ success: false, error: 'Code cannot be empty.' });
        }
        if (typeof language !== 'string' || !['problem', 'program'].includes(mode)) {
            return res.status(400).json({ success: false, error: 'Choose a supported language and execution mode.' });
        }
        if (code.length > 20000 ||
            typeof testInput !== 'string' || testInput.length > 5000 ||
            typeof stdin !== 'string' || stdin.length > 5000) {
            return res.status(413).json({ success: false, error: 'Code or sample input exceeds the supported size.' });
        }

        let execution;
        if (mode === 'program') {
            execution = await executeSource(code, { language, stdin });
        } else {
            const args = parseInputArguments(testInput);
            execution = language === 'javascript'
                ? await executeJavaScript(makeFunctionCallSource(code, args))
                : await executeSource(code, {
                    language,
                    stdin: stdin || argumentsToStdin(args)
                });
        }
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
        console.error('External code execution failed:', err.message);
        return res.status(500).json({ success: false, error: 'Code execution failed.' });
    }
});

router.post('/hint', authMiddleware, async (req, res) => {
    const problemId = typeof req.body.problemId === 'string' ? req.body.problemId : '';
    if (!problemId || problemId.length > 120) {
        return res.status(400).json({ message: 'Select a valid coding problem to request a hint.' });
    }
    try {
        const problem = await CodingProblem.findById(problemId);
        if (!problem) return res.status(404).json({ message: 'Problem not found.' });
        const hint = await generateCodingHint({
            title: problem.title,
            description: problem.description
        });
        res.json(hint);
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
    if (!getCareerAssistantStatus().configured) {
        return res.status(503).json({
            code: 'AI_PROVIDER_NOT_CONFIGURED',
            message: providerErrorMessage('AI_PROVIDER_NOT_CONFIGURED', 'Code review')
        });
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
        const { code, language = 'javascript' } = req.body;
        
        if (typeof code !== 'string' || code.trim() === '') {
            return res.status(400).json({ message: 'Code cannot be empty.' });
        }
        if (code.length > 20000 || typeof language !== 'string') {
            return res.status(400).json({ message: 'Code must be at most 20,000 characters and include a supported language.' });
        }
        
        const problem = await CodingProblem.findById(req.params.problemId);
        if (!problem) return res.status(404).json({ message: 'Problem not found' });
        
        const { allPassed, status, results, executionTime } = await executeProblemTestCases(
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
                status: 'accepted'
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
        
        res.json({
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
        res.status(500).json({ message: 'Submission failed.' });
    }
});

// ========== GET PROBLEM BY ID ==========
router.get('/problems/:id', async (req, res) => {
    try {
        const problem = await CodingProblem.findById(req.params.id);
        if (!problem) {
            return res.status(404).json({ message: 'Problem not found' });
        }
        const record = withOfficialLeetCodeLink(problem);
        res.json(record);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching problem' });
    }
});

// ========== GET ALL PROBLEMS ==========
router.get('/problems', async (req, res) => {
    try {
        for (const key of ['search', 'difficulty', 'topic']) {
            if (req.query[key] !== undefined &&
                (typeof req.query[key] !== 'string' || req.query[key].length > 100)) {
                return res.status(400).json({ message: `Invalid ${key} filter.` });
            }
        }
        if (req.query.difficulty && !['easy', 'medium', 'hard'].includes(req.query.difficulty)) {
            return res.status(400).json({ message: 'Difficulty must be easy, medium, or hard.' });
        }
        const problems = filterCodingProblems(await CodingProblem.find(), {
            search: req.query.search,
            difficulty: req.query.difficulty,
            topic: req.query.topic
        });
        res.json(problems.map(problem => {
            return withOfficialLeetCodeLink(problem);
        }));
    } catch (error) {
        res.status(500).json({ message: 'Error fetching problems' });
    }
});

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
        const submissions = await CodeSubmission.find({ userId, status: 'accepted' });
        const user = await User.findById(userId);

        const totalSolved = new Set((submissions || []).map(submission => String(submission.problemId))).size;
        const totalPoints = user ? (user.xp || 0) : 0;

        res.json({
            totalSolved,
            totalPoints,
            rank: 1
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching stats' });
    }
});

module.exports = router;
