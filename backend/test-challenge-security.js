const assert = require('node:assert/strict');
const User = require('./models/User');
const {
    submitChallengeAnswer,
    XP_PER_CHALLENGE
} = require('./utils/challengeService');

async function run() {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const firstUser = new User({ name: 'Challenge test user', email: `challenge-${suffix}@example.test` });
    const secondUser = new User({ name: 'Other test user', email: `other-${suffix}@example.test` });
    await firstUser.save();
    await secondUser.save();

    const textSubmission = await submitChallengeAnswer(
        firstUser._id,
        { id: 'javascript-closure-2026-01-01', type: 'text' },
        'function scope outer access'
    );
    assert.deepEqual(textSubmission, { available: false, code: 'CHALLENGE_EVALUATION_UNAVAILABLE' });
    assert.equal((await User.findById(firstUser._id)).xp || 0, 0);

    const codingChallenge = { id: 'reverse-string-2026-01-01', type: 'coding' };
    const rejectedCode = await submitChallengeAnswer(firstUser._id, codingChallenge, 'function solution() {}', async () => {
        return { allPassed: false };
    });
    assert.deepEqual(rejectedCode, { available: true, correct: false });
    assert.equal((await User.findById(firstUser._id)).xp || 0, 0);

    const [firstAward, duplicateAward] = await Promise.all([
        submitChallengeAnswer(firstUser._id, codingChallenge, 'function solution(str) {}', async () => ({ allPassed: true })),
        submitChallengeAnswer(firstUser._id, codingChallenge, 'function solution(str) {}', async () => ({ allPassed: true }))
    ]);
    assert.equal([firstAward, duplicateAward].filter(result => !result.alreadyCompleted).length, 1);
    assert.equal([firstAward, duplicateAward].filter(result => result.alreadyCompleted).length, 1);

    const otherChallengeAward = await submitChallengeAnswer(
        secondUser._id,
        codingChallenge,
        'function solution(str) {}',
        async () => ({ allPassed: true })
    );
    assert.equal(otherChallengeAward.alreadyCompleted, false);

    const persistedFirstUser = await User.findById(firstUser._id);
    const persistedSecondUser = await User.findById(secondUser._id);
    assert.equal(persistedFirstUser.xp, XP_PER_CHALLENGE);
    assert.deepEqual(persistedFirstUser.completedChallengeIds, ['reverse-string-2026-01-01']);
    assert.equal(persistedSecondUser.xp, XP_PER_CHALLENGE);
    assert.deepEqual(persistedSecondUser.completedChallengeIds, ['reverse-string-2026-01-01']);

    const missingUserSubmission = await submitChallengeAnswer(
        'missing-challenge-user',
        codingChallenge,
        'function solution(str) {}',
        async () => ({ allPassed: true })
    );
    assert.equal(missingUserSubmission.notFound, true);

    console.log('Challenge security tests passed (ungraded-answer rejection, owner-scoped XP, duplicate prevention).');
}

run().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
