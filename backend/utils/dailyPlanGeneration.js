const crypto = require('crypto');

const LEASE_DURATION_MS = 5 * 60 * 1000;
const WAIT_FOR_OWNER_MS = 90 * 1000;
const POLL_INTERVAL_MS = 250;

function isDuplicateKeyError(error) {
    return error?.code === 11000 || error?.code === 11001;
}

function generationInProgressError() {
    const error = new Error('Another server is generating this daily plan. Retry shortly.');
    error.code = 'DAILY_PLAN_GENERATION_IN_PROGRESS';
    error.status = 503;
    return error;
}

function delay(milliseconds) {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
}

async function getOrGenerateDailyPlan({ userId, date, DailyPlan, GenerationLock, generate }) {
    const savedPlan = await DailyPlan.findOne({ userId, date });
    if (savedPlan) return savedPlan;

    await Promise.all([DailyPlan.init(), GenerationLock.init()]);
    const ownerToken = crypto.randomUUID();
    const deadline = Date.now() + WAIT_FOR_OWNER_MS;
    let lease;

    while (!lease) {
        const candidate = new GenerationLock({
            userId,
            date,
            ownerToken,
            expiresAt: new Date(Date.now() + LEASE_DURATION_MS)
        });
        try {
            lease = await candidate.save();
        } catch (error) {
            if (!isDuplicateKeyError(error)) throw error;

            const completedPlan = await DailyPlan.findOne({ userId, date });
            if (completedPlan) return completedPlan;

            const currentLease = await GenerationLock.findOne({ userId, date });
            if (!currentLease || currentLease.expiresAt <= new Date()) {
                if (currentLease) await GenerationLock.findByIdAndDelete(currentLease._id);
                continue;
            }
            if (Date.now() >= deadline) throw generationInProgressError();
            await delay(POLL_INTERVAL_MS);
        }
    }

    try {
        const completedPlan = await DailyPlan.findOne({ userId, date });
        if (completedPlan) return completedPlan;
        return await generate();
    } finally {
        await GenerationLock.findByIdAndDelete(lease._id);
    }
}

module.exports = {
    getOrGenerateDailyPlan,
    isDuplicateKeyError
};
