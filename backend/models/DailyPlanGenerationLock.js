const mongoose = require('mongoose');
const { dailyPlanGenerationLocks, wrapModel } = require('../utils/inMemoryDB');

const DailyPlanGenerationLockSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    date: { type: String, required: true },
    ownerToken: { type: String, required: true },
    expiresAt: { type: Date, required: true }
}, { timestamps: true });

DailyPlanGenerationLockSchema.index(
    { userId: 1, date: 1 },
    { unique: true, name: 'uniq_daily_plan_generation_lock_user_date' }
);

const OriginalDailyPlanGenerationLockModel =
    mongoose.models.DailyPlanGenerationLock ||
    mongoose.model('DailyPlanGenerationLock', DailyPlanGenerationLockSchema);

module.exports = wrapModel(
    dailyPlanGenerationLocks,
    'DailyPlanGenerationLock',
    OriginalDailyPlanGenerationLockModel,
    mongoose
);
