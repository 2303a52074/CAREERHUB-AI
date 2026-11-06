const mongoose = require('mongoose');
const DailyPlan = require('./models/DailyPlan');
const DailyPlanGenerationLock = require('./models/DailyPlanGenerationLock');
const { getOrGenerateDailyPlan } = require('./utils/dailyPlanGeneration');

async function main() {
    const mongoUri = process.env.TEST_MONGO_URI || process.env.MONGO_URI;
    if (!mongoUri) throw new Error('TEST_MONGO_URI is required.');

    const [userId, date] = process.argv.slice(2);
    if (!userId || !date) throw new Error('A user ID and date are required.');

    await mongoose.connect(mongoUri);
    let generated = false;
    try {
        const plan = await getOrGenerateDailyPlan({
            userId,
            date,
            DailyPlan,
            GenerationLock: DailyPlanGenerationLock,
            generate: async () => {
                generated = true;
                await new Promise(resolve => setTimeout(resolve, 200));
                return new DailyPlan({
                    userId,
                    date,
                    targetRole: 'Coordination test',
                    tasks: []
                }).save();
            }
        });
        process.stdout.write(JSON.stringify({ planId: String(plan._id), generated }));
    } finally {
        await mongoose.disconnect();
    }
}

main().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
});
