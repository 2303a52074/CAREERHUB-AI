const User = require('../models/User');
const { executeProblemTestCases } = require('./codeExecutionService');

const XP_PER_CHALLENGE = 20;
const REVERSE_STRING_TEST_CASES = [
    { input: '"CareerHub"', expectedOutput: '"buHreeraC"', isHidden: true },
    { input: '"racecar"', expectedOutput: '"racecar"', isHidden: true },
    { input: '"a b"', expectedOutput: '"b a"', isHidden: true },
    { input: '""', expectedOutput: '""', isHidden: true }
];

async function evaluateChallengeAnswer(challenge, answer, executeCode = executeProblemTestCases) {
    if (challenge.type === 'text') {
        return {
            available: false,
            code: 'CHALLENGE_EVALUATION_UNAVAILABLE'
        };
    }
    if (challenge.type === 'coding' && challenge.id.startsWith('reverse-string-')) {
        const result = await executeCode(answer, REVERSE_STRING_TEST_CASES, {
            language: 'javascript',
            timeLimit: 2,
            memoryLimit: 128
        });
        return { available: true, correct: result.allPassed };
    }
    return { available: false, code: 'CHALLENGE_EVALUATION_UNAVAILABLE' };
}

async function awardChallengeXp(userId, challengeId) {
    const update = await User.updateOne(
        { _id: userId, completedChallengeIds: { $ne: challengeId } },
        {
            $inc: { xp: XP_PER_CHALLENGE },
            $addToSet: { completedChallengeIds: challengeId }
        }
    );

    if (!update.matchedCount) {
        const existingUser = await User.findById(userId);
        return existingUser
            ? { alreadyCompleted: true, user: existingUser }
            : { notFound: true, user: null };
    }

    const user = await User.findById(userId);
    if (!user) {
        throw new Error('User account was not found after challenge completion.');
    }
    user.level = Math.floor((Number(user.xp) || 0) / 100) + 1;
    await user.save();
    return { alreadyCompleted: false, user };
}

async function submitChallengeAnswer(userId, challenge, answer, executeCode) {
    const evaluation = await evaluateChallengeAnswer(challenge, answer, executeCode);
    if (!evaluation.available || !evaluation.correct) {
        return evaluation;
    }

    return {
        ...evaluation,
        ...await awardChallengeXp(userId, challenge.id)
    };
}

module.exports = {
    XP_PER_CHALLENGE,
    evaluateChallengeAnswer,
    submitChallengeAnswer
};
