const mongoose = require('mongoose');
const { dailyPlans, wrapModel } = require('../utils/inMemoryDB');

const DailyTaskSchema = new mongoose.Schema({
    id: String,
    title: { type: String, required: true },
    category: {
        type: String,
        enum: ['coding', 'interview', 'skill', 'roadmap', 'application', 'general'],
        default: 'general'
    },
    description: String,
    xpReward: { type: Number, default: 25 },
    completed: { type: Boolean, default: false },
    actionUrl: { type: String, default: '/dashboard' },
    actionText: { type: String, default: 'Start' },
    completedAt: Date
});

const DailyPlanSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    date: { type: String, required: true }, // Format: YYYY-MM-DD
    targetRole: { type: String, default: 'Full Stack Developer' },
    completionPercentage: { type: Number, default: 0 },
    streak: { type: Number, default: 1 },
    tasks: [DailyTaskSchema],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const OriginalDailyPlanModel = mongoose.models.DailyPlan || mongoose.model('DailyPlan', DailyPlanSchema);
module.exports = wrapModel(dailyPlans, 'DailyPlan', OriginalDailyPlanModel, mongoose);
