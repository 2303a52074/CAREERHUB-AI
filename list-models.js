require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function listModels() {
    console.log('🔍 Checking available models...');
    console.log('=================================');
    
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.log('❌ GEMINI_API_KEY not found!');
        return;
    }
    
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Try different model names
    const modelsToTry = [
        "gemini-2.0-flash-exp",
        "gemini-2.0-pro-exp",
        "gemini-1.5-pro",
        "gemini-1.5-flash",
        "gemini-pro",
        "gemini-1.0-pro"
    ];
    
    for (const modelName of modelsToTry) {
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent("Say 'OK'");
            await result.response;
            console.log(`✅ WORKING: ${modelName}`);
        } catch (error) {
            console.log(`❌ FAILED: ${modelName} - ${error.message.substring(0, 50)}`);
        }
    }
}

listModels();