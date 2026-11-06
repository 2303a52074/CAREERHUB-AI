const mongoose = require('mongoose');
const loadEnv = require('../utils/loadEnv');

loadEnv();

const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;

async function main() {
    if (!mongoUri) {
        throw new Error('Set MONGO_URI or MONGODB_URI before running this migration.');
    }

    await mongoose.connect(mongoUri, { autoIndex: false });
    require('../models/DailyPlan');
    require('../models/DailyPlanGenerationLock');

    const collection = mongoose.models.DailyPlan.collection;
    const lockCollection = mongoose.models.DailyPlanGenerationLock.collection;
    const duplicateSummary = target => target.aggregate([
        {
            $group: {
                _id: { userId: '$userId', date: '$date' },
                count: { $sum: 1 }
            }
        },
        { $match: { count: { $gt: 1 } } },
        {
            $group: {
                _id: null,
                duplicateGroups: { $sum: 1 },
                excessDocuments: { $sum: { $subtract: ['$count', 1] } }
            }
        }
    ]).toArray();
    const [duplicatePlans, duplicateLeases] = await Promise.all([
        duplicateSummary(collection),
        duplicateSummary(lockCollection)
    ]);
    const duplicates = duplicatePlans[0];
    const duplicateLocks = duplicateLeases[0];

    if (duplicates || duplicateLocks) {
        const duplicatePlanGroups = duplicates?.duplicateGroups || 0;
        const duplicatePlanDocuments = duplicates?.excessDocuments || 0;
        const duplicateLockGroups = duplicateLocks?.duplicateGroups || 0;
        throw new Error(
            `Migration stopped without modifying data: found ${duplicatePlanGroups} duplicate plan groups (${duplicatePlanDocuments} excess plans) and ${duplicateLockGroups} duplicate lease groups. Resolve them explicitly before retrying.`
        );
    }

    await collection.createIndex(
        { userId: 1, date: 1 },
        { unique: true, name: 'uniq_daily_plan_user_date' }
    );
    await lockCollection.createIndex(
        { userId: 1, date: 1 },
        { unique: true, name: 'uniq_daily_plan_generation_lock_user_date' }
    );
    console.log('Created daily-plan and generation-lock unique indexes after checking for duplicate plans.');
}

main()
    .catch(error => {
        console.error(`Daily-plan index migration failed: ${error.message}`);
        process.exitCode = 1;
    })
    .finally(async () => {
        if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
    });
