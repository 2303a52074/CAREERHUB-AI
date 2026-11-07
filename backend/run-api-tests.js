const { spawn, spawnSync } = require('node:child_process');
const crypto = require('node:crypto');
const path = require('node:path');
const mongoose = require('mongoose');
require('./utils/loadEnv')();

const configuredMongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
const port = Number(process.env.TEST_API_PORT || 3321);
const suites = ['test-e2e.js', 'test-extended.js'];
let serverProcess;
let testMongoUri;

function isolatedMongoUri(uri) {
    const parsed = new URL(uri);
    const databaseName = decodeURIComponent(parsed.pathname.replace(/^\/+/, ''));
    if (!databaseName) throw new Error('MongoDB test URI must include a database name.');
    parsed.pathname = `/${encodeURIComponent(`${databaseName}_api_test_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`)}`;
    return parsed.toString();
}

function startServer(mongoUri) {
    serverProcess = spawn(process.execPath, [path.join(__dirname, 'server.js')], {
        cwd: path.join(__dirname, '..'),
        env: {
            ...process.env,
            PORT: String(port),
            MONGO_URI: mongoUri,
            MONGODB_URI: '',
            OPENROUTER_API_KEY: '',
            CAREERHUB_AI_DATA_PROCESSING_APPROVED: 'false',
            CAREERHUB_AI_DATA_PROCESSING_PROVIDER: '',
            JWT_SECRET: process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex'),
            NODE_ENV: 'test'
        },
        stdio: 'inherit'
    });
}

function runDailyPlanMigration(mongoUri) {
    const result = spawnSync(process.execPath, [
        path.join(__dirname, 'migrations', 'ensure-daily-plan-unique-index.js')
    ], {
        env: {
            ...process.env,
            MONGO_URI: mongoUri,
            MONGODB_URI: ''
        },
        stdio: 'inherit'
    });
    if (result.error || result.signal || result.status !== 0) {
        throw new Error(
            `Daily-plan index migration failed in the isolated API test database: ${result.error?.message || result.signal || result.status}`
        );
    }
}

async function verifyDailyPlanMigrationRejectsDuplicates(mongoUri) {
    const connection = mongoose.createConnection(mongoUri);
    await connection.asPromise();
    const collection = connection.collection('dailyplans');
    const userId = `migration-safety-${crypto.randomUUID()}`;
    const date = '2000-01-01';
    try {
        await collection.insertMany([
            { userId, date },
            { userId, date }
        ]);
        const result = spawnSync(process.execPath, [
            path.join(__dirname, 'migrations', 'ensure-daily-plan-unique-index.js')
        ], {
            env: {
                ...process.env,
                MONGO_URI: mongoUri,
                MONGODB_URI: ''
            },
            encoding: 'utf8'
        });
        const recordsRemain = await collection.countDocuments({ userId, date });
        const rejectedAsDuplicate = result.status !== 0 &&
            result.status !== null &&
            /found 1 duplicate plan groups/.test(result.stderr || '');
        if (!rejectedAsDuplicate || recordsRemain !== 2) {
            throw new Error('Migration did not safely reject the duplicate fixture.');
        }
        console.log('Verified daily-plan migration refuses duplicate data without changing it.');
    } finally {
        await collection.deleteMany({ userId, date });
        await connection.close();
    }
}

async function waitForServer() {
    const deadline = Date.now() + 30000;
    const baseUrl = `http://127.0.0.1:${port}`;
    while (Date.now() < deadline) {
        if (serverProcess.exitCode !== null) {
            throw new Error('Isolated API test server exited before becoming ready.');
        }
        try {
            const response = await fetch(`${baseUrl}/api/health`);
            const health = await response.json();
            if (response.ok && health.database === 'connected') return baseUrl;
        } catch {
            await new Promise(resolve => setTimeout(resolve, 300));
        }
        await new Promise(resolve => setTimeout(resolve, 300));
    }
    throw new Error('Isolated API test server did not connect to MongoDB within 30 seconds.');
}

async function stopServer() {
    if (!serverProcess || serverProcess.exitCode !== null) return;
    const child = serverProcess;
    await new Promise(resolve => {
        const timeout = setTimeout(() => child.kill('SIGTERM'), 1000);
        child.once('exit', () => {
            clearTimeout(timeout);
            resolve();
        });
        child.kill('SIGTERM');
    });
}

async function dropTestDatabase() {
    if (!testMongoUri) return;
    const connection = mongoose.createConnection(testMongoUri);
    try {
        await connection.asPromise();
        await connection.dropDatabase();
    } finally {
        await connection.close();
    }
}

async function main() {
    if (!configuredMongoUri) {
        console.error('API tests blocked: configure MONGO_URI to run against an isolated test database.');
        process.exitCode = 2;
        return;
    }

    let exitCode = 0;
    try {
        testMongoUri = isolatedMongoUri(configuredMongoUri);
        await verifyDailyPlanMigrationRejectsDuplicates(testMongoUri);
        runDailyPlanMigration(testMongoUri);
        startServer(testMongoUri);
        const baseUrl = await waitForServer();
        for (const suite of suites) {
            const result = spawnSync(process.execPath, [path.join(__dirname, suite)], {
                env: { ...process.env, API_BASE_URL: baseUrl, TEST_MONGO_URI: testMongoUri },
                stdio: 'inherit'
            });
            if (result.error || result.signal || result.status === null) {
                console.error(`Failed to run ${suite}: ${result.error?.message || result.signal || 'unknown error'}`);
                exitCode = 1;
            } else if (result.status !== 0) {
                exitCode = result.status;
            }
        }
    } catch (error) {
        console.error(`Isolated API test setup failed: ${error.message}`);
        exitCode = 1;
    } finally {
        await stopServer();
        try {
            await dropTestDatabase();
        } catch {
            console.error('Failed to remove the isolated API test database.');
            exitCode = 1;
        }
    }
    process.exitCode = exitCode;
}

main().catch(error => {
    console.error(`API test runner failed: ${error.message}`);
    process.exitCode = 1;
});
