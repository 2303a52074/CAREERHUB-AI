require('./utils/loadEnv')();
const mongoose = require('mongoose');
const CodingProblem = require('./models/CodingProblem');
const { seedPromise } = require('./utils/inMemoryDB');
const seedCodingProblems = require('./utils/seedCodingProblems');
const codingProblemLibrary = require('./utils/codingProblemLibrary');

async function seed() {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (!mongoUri) {
        console.error('Seeding failed: MONGO_URI or MONGODB_URI must be configured.');
        process.exitCode = 1;
        return;
    }

    try {
        await mongoose.connect(mongoUri);
        await seedPromise;
        await seedCodingProblems(CodingProblem, codingProblemLibrary);
        console.log(`Coding problem library is ready (${codingProblemLibrary.length} definitions).`);
    } catch (error) {
        console.error('Seeding failed:', error.message || error.name || 'UnknownError');
        if (error.code) console.error('Database error code:', error.code);
        process.exitCode = 1;
    } finally {
        if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect();
        }
    }
}

seed();
