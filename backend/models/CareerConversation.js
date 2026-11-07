const mongoose = require('mongoose');
const { careerConversations, wrapModel } = require('../utils/inMemoryDB');

const MessageSchema = new mongoose.Schema({
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    source: { type: String, enum: ['openrouter', 'groq', 'gemini', 'local'], default: null },
    model: { type: String, default: null },
    fallbackUsed: { type: Boolean, default: false }
}, { _id: false });

const CareerConversationSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    messages: { type: [MessageSchema], default: [] },
    updatedAt: { type: Date, default: Date.now }
});

const OriginalCareerConversationModel = mongoose.models.CareerConversation ||
    mongoose.model('CareerConversation', CareerConversationSchema);

module.exports = wrapModel(careerConversations, 'CareerConversation', OriginalCareerConversationModel, mongoose);
