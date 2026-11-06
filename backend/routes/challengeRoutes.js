const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const { submitChallengeAnswer, XP_PER_CHALLENGE } = require('../utils/challengeService');

const router = express.Router();

const challengePool = [
    { id: 'javascript-closure', type: 'text', question: 'What is a closure in JavaScript?', skill: 'javascript', answerHint: 'Describe a function retaining access to its lexical scope' },
    { id: 'css-box-model', type: 'text', question: 'Explain the box model in CSS.', skill: 'css', answerHint: 'Name its four parts' },
    { id: 'reverse-string', type: 'coding', question: 'Write a function that reverses a string.', skill: 'javascript', initialCode: 'function solution(str) {\n  // your code\n}' },
];

function getTodaysChallenge() {
    const date = new Date().toISOString().slice(0, 10);
    const dayNumber = Math.floor(Date.parse(`${date}T00:00:00.000Z`) / 86400000);
    const challenge = challengePool[dayNumber % challengePool.length];
    return { ...challenge, id: `${challenge.id}-${date}` };
}

// Get today's challenge
router.get('/today', authMiddleware, (req, res) => {
    res.json(getTodaysChallenge());
});

// Submit challenge answer
router.post('/submit', authMiddleware, async (req, res) => {
    const { answer } = req.body || {};
    if (typeof answer !== 'string' || answer.trim().length === 0 || answer.length > 20000) {
        return res.status(400).json({
            code: 'CHALLENGE_ANSWER_INVALID',
            message: 'Submit a non-empty answer of at most 20,000 characters.'
        });
    }

    const challenge = getTodaysChallenge();
    try {
        const submission = await submitChallengeAnswer(
            req.user._id || req.user.id,
            challenge,
            answer.trim()
        );
        if (!submission.available) {
            return res.status(503).json({
                code: submission.code,
                message: 'This challenge cannot award XP until a trusted answer evaluator is available.'
            });
        }
        if (!submission.correct) {
            return res.status(422).json({
                code: 'CHALLENGE_ANSWER_INCORRECT',
                message: 'The submitted answer did not pass this challenge.'
            });
        }
        if (submission.notFound) {
            return res.status(404).json({
                code: 'USER_NOT_FOUND',
                message: 'Your account could not be found.'
            });
        }
        if (submission.alreadyCompleted) {
            return res.status(409).json({
                code: 'CHALLENGE_ALREADY_COMPLETED',
                message: 'You have already earned XP for this challenge.'
            });
        }

        return res.json({
            score: XP_PER_CHALLENGE / 2,
            xpEarned: XP_PER_CHALLENGE,
            newLevel: submission.user.level,
            message: 'Challenge completed!'
        });
    } catch (error) {
        if (typeof error.code === 'string' && error.code.startsWith('CODE_EXECUTION_')) {
            return res.status(error.status || 503).json({
                code: error.code,
                message: error.message
            });
        }
        console.error('Challenge submission failed:', error.message);
        return res.status(500).json({
            code: 'CHALLENGE_SUBMISSION_FAILED',
            message: 'Could not verify this challenge. Please try again.'
        });
    }
});

module.exports = router;