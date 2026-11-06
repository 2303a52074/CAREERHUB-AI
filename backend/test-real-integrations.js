const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const mongoose = require('mongoose');
require('./utils/loadEnv')();

const configuredMongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
const openRouterConfigured = (!process.env.AI_PROVIDER ||
    process.env.AI_PROVIDER.trim().toLowerCase() === 'openrouter') &&
    Boolean(process.env.OPENROUTER_API_KEY?.trim());
const port = Number(process.env.VERIFICATION_PORT || 3311);
const baseUrl = `http://127.0.0.1:${port}`;
const testSuffix = `careerhub_verification_${Date.now()}`;
const checks = [];
const providerFailureCodes = new Set([
    'AI_PROVIDER_NOT_CONFIGURED',
    'AI_PROVIDER_AUTH_ERROR',
    'AI_PROVIDER_QUOTA_EXCEEDED',
    'AI_MODEL_INVALID',
    'AI_RATE_LIMITED',
    'AI_PROVIDER_TIMEOUT',
    'AI_PROVIDER_NETWORK_ERROR',
    'AI_PROVIDER_EMPTY_RESPONSE',
    'AI_PROVIDER_INVALID_OUTPUT',
    'AI_PROVIDER_REQUEST_REJECTED',
    'AI_PROVIDER_UNAVAILABLE'
]);
const QUALIFIED_FALLBACK_MODEL = 'qwen/qwen3-30b-a3b-instruct-2507';
let serverProcess;
let serverLogs = '';
let serverStdoutRemainder = '';
const serverProviderMetrics = [];

function captureProviderMetrics(chunk) {
    const lines = `${serverStdoutRemainder}${chunk}`.split(/\r?\n/);
    serverStdoutRemainder = lines.pop() || '';
    for (const line of lines) {
        const marker = 'OpenRouter request metrics: ';
        const markerIndex = line.indexOf(marker);
        if (markerIndex < 0) continue;
        try {
            serverProviderMetrics.push(JSON.parse(line.slice(markerIndex + marker.length)));
        } catch {
            continue;
        }
    }
}

function record(name, status, detail = '') {
    checks.push({ name, status, detail });
    const label = status === 'VERIFIED' ? 'PASS' : status;
    console.log(`${label}: ${name}${detail ? ` â€” ${detail}` : ''}`);
}

function isProviderFailure(response) {
    return response.status >= 400 && providerFailureCodes.has(response.data?.code);
}

function providerFailureDetail(response) {
    const diagnosticLog = serverLogs.split(/\r?\n/).filter(line =>
        line.includes('OpenRouter interview question output failed schema validation:') ||
        line.includes('OpenRouter returned unusable assistant content:')
    ).pop();
    const diagnostic = diagnosticLog?.match(/(\{.*\})$/)?.[1];
    return `${response.data?.code || `HTTP_${response.status}`}; no AI result was counted.` +
        (diagnostic ? ` Sanitized provider diagnostic: ${diagnostic}` : '');
}

function dedicatedMongoUri(uri) {
    const parsed = new URL(uri);
    const originalName = decodeURIComponent(parsed.pathname.replace(/^\/+/, ''));
    if (!originalName) throw new Error('Configured Mongo URI must include a database name.');
    parsed.pathname = `/${encodeURIComponent(`${originalName}_${testSuffix}`)}`;
    return parsed.toString();
}

async function request(method, endpoint, { token, body, headers = {} } = {}) {
    const response = await fetch(`${baseUrl}${endpoint}`, {
        method,
        headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
            ...headers
        },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {})
    });
    const text = await response.text();
    let data;
    try {
        data = JSON.parse(text);
    } catch {
        data = text;
    }
    return { status: response.status, data, headers: response.headers };
}

async function uploadResumePdf(token) {
    const pdfPath = path.join(__dirname, 'test-fixtures', 'valid-resume.pdf');
    const form = new FormData();
    form.append('resume', new Blob([fs.readFileSync(pdfPath)], { type: 'application/pdf' }), 'verification-resume.pdf');
    form.append('targetRole', 'Verification Backend Engineer');
    const response = await fetch(`${baseUrl}/api/resume/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form
    });
    const responseText = await response.text();
    let data;
    try {
        data = JSON.parse(responseText);
    } catch {
        data = responseText;
    }
    return { status: response.status, data };
}

function startServer(mongoUri) {
    const simulatePrimaryFailure = process.env.CAREERHUB_TEST_SIMULATE_PRIMARY_FAILURE === '1';
    const serverArgs = simulatePrimaryFailure
        ? ['--require', path.join(__dirname, 'test-simulate-primary-failure.js'),
            path.join(__dirname, 'server.js')]
        : [path.join(__dirname, 'server.js')];
    serverProcess = spawn(process.execPath, serverArgs, {
        cwd: path.join(__dirname, '..'),
        env: {
            ...process.env,
            PORT: String(port),
            MONGO_URI: mongoUri,
            MONGODB_URI: '',
            JWT_SECRET: process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex'),
            NODE_ENV: 'test'
        },
        stdio: ['ignore', 'pipe', 'pipe']
    });
    serverProcess.stdout.on('data', chunk => captureProviderMetrics(String(chunk)));
    serverProcess.stderr.on('data', chunk => {
        serverLogs = `${serverLogs}${chunk}`.slice(-4000);
    });
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
    serverProcess = null;
}

async function dropTestDatabase(uri) {
    const connection = mongoose.createConnection(uri);
    try {
        await connection.asPromise();
        await connection.dropDatabase();
    } finally {
        await connection.close();
    }
}

async function waitForDatabase() {
    const deadline = Date.now() + 30000;
    while (Date.now() < deadline) {
        if (serverProcess?.exitCode !== null && serverProcess?.exitCode !== undefined) {
            throw new Error('Test API process exited before health check.');
        }
        try {
            const health = await request('GET', '/api/health');
            if (health.status === 200 && health.data.database === 'connected') return true;
        } catch {
            await new Promise(resolve => setTimeout(resolve, 300));
        }
        await new Promise(resolve => setTimeout(resolve, 300));
    }
    throw new Error('MongoDB-backed API did not become healthy within 30 seconds.');
}

async function register(name) {
    const email = `verify-${crypto.randomUUID()}@careerhub.invalid`;
    const password = `Verify-${crypto.randomBytes(8).toString('hex')}`;
    const registration = await request('POST', '/api/auth/register', {
        body: { name, email, password }
    });
    assert.equal(registration.status, 201, `Registration returned ${registration.status}.`);
    return { name, email, password };
}

async function login(account) {
    const response = await request('POST', '/api/auth/login', {
        body: { email: account.email, password: account.password }
    });
    assert.equal(response.status, 200, `Login returned ${response.status}.`);
    assert.ok(response.data.token, 'Login did not return a token.');
    return response.data.token;
}

async function createRoadmapFixture(testUri, token, targetRole, id) {
    await mongoose.connect(testUri);
    try {
        const ownerProfile = await request('GET', '/api/career/profile', { token });
        assert.equal(ownerProfile.status, 200);
        const userId = String(ownerProfile.data.user._id || ownerProfile.data.user.id);
        const CareerRoadmap = require('./models/CareerRoadmap');
        const roadmap = await new CareerRoadmap({
            userId,
            targetRole,
            generationSource: 'test-fixture',
            aiGenerationStatus: 'not_generated',
            phases: [{
                phaseNumber: 1,
                title: 'Persistence verification fixture',
                description: 'Test-only data; not generated by AI.',
                status: 'in-progress',
                milestones: [{
                    id,
                    title: 'Verify saved progress',
                    completionCriteria: 'The test marks this milestone complete.',
                    estimatedHours: 1,
                    completed: false
                }]
            }]
        }).save();
        return { id: String(roadmap._id), milestoneId: id };
    } finally {
        await mongoose.disconnect();
    }
}

async function runApiFlows(testUri) {
    const health = await request('GET', '/api/health');
    assert.equal(health.data.database, 'connected');
    record('Backend is connected to the dedicated real MongoDB database', 'VERIFIED', health.data.database);

    const accountA = await register(`Mongo Candidate ${Date.now()}`);
    const accountB = await register(`Isolation Candidate ${Date.now()}`);
    let tokenA = await login(accountA);
    let tokenB = await login(accountB);
    let dailyPlanBeforeRestart = null;
    let skillGapProvenanceBeforeRestart = null;

    const profile = await request('PUT', '/api/career/profile', {
        token: tokenA,
        body: {
            targetRole: 'Verification Backend Engineer',
            technicalSkills: ['Node.js', 'MongoDB', 'API Verification']
        }
    });
    assert.equal(profile.status, 200);
    record('Mongo registration and profile update', 'VERIFIED');

    const unauthenticatedLeetCodeProfile = await request('GET', '/api/coding/leetcode/profile');
    assert.equal(unauthenticatedLeetCodeProfile.status, 401);
    const invalidLeetCodeProfile = await request('PUT', '/api/coding/leetcode/profile', {
        token: tokenA,
        body: { username: 'not/a/profile' }
    });
    assert.equal(invalidLeetCodeProfile.status, 400);
    const leetcodeTestUsername = `career_${Date.now()}`;
    const savedLeetCodeProfile = await request('PUT', '/api/coding/leetcode/profile', {
        token: tokenA,
        body: { username: leetcodeTestUsername }
    });
    assert.equal(savedLeetCodeProfile.status, 200);
    assert.equal(savedLeetCodeProfile.data.verification, 'unverified');
    assert.match(savedLeetCodeProfile.data.profileUrl, /^https:\/\/leetcode\.com\/u\//);
    const otherLeetCodeProfile = await request('GET', '/api/coding/leetcode/profile', { token: tokenB });
    assert.equal(otherLeetCodeProfile.status, 200);
    assert.equal(otherLeetCodeProfile.data.username, '');
    const unsupportedLeetCodeSync = await request('POST', '/api/coding/leetcode/sync', { token: tokenA });
    assert.equal(unsupportedLeetCodeSync.status, 503);
    assert.equal(unsupportedLeetCodeSync.data.code, 'LEETCODE_SYNC_UNAVAILABLE');
    const profileAfterUnsupportedSync = await request('GET', '/api/coding/leetcode/profile', { token: tokenA });
    assert.equal(profileAfterUnsupportedSync.data.username, leetcodeTestUsername);
    const removedLeetCodeProfile = await request('DELETE', '/api/coding/leetcode/profile', { token: tokenA });
    assert.equal(removedLeetCodeProfile.status, 200);
    record('LeetCode profile link validation, owner isolation, unavailable sync honesty, and disconnect', 'VERIFIED');

    const unauthenticatedAiHealth = await request('POST', '/api/health/ai');
    assert.equal(unauthenticatedAiHealth.status, 401,
        'The live OpenRouter health endpoint must reject unauthenticated requests.');
    const aiHealth = await request('POST', '/api/health/ai', { token: tokenA });
    assert.ok(!['apiKey', 'key', 'credentials'].some(field => field in aiHealth.data),
        'OpenRouter health response must not expose credentials.');
    const providerAvailable = aiHealth.status === 200 &&
        aiHealth.data.status === 'connected' &&
        aiHealth.data.provider === 'OpenRouter' &&
        aiHealth.data.verified === true;
    const simulatedPrimaryFailure = process.env.CAREERHUB_TEST_SIMULATE_PRIMARY_FAILURE === '1';
    if (simulatedPrimaryFailure && openRouterConfigured) {
        record('DeepSeek health check', 'BLOCKED',
            'Primary HTTP 503 was simulated locally; this is not a natural provider failure.');
    } else if (providerAvailable) {
        record('Authenticated OpenRouter connectivity check performs real generation', 'VERIFIED',
            `Provider: ${aiHealth.data.provider}, model: ${aiHealth.data.model}`);
    } else if (!openRouterConfigured && aiHealth.status === 503 &&
        aiHealth.data.status === 'not_configured' && aiHealth.data.verified === false) {
        record('Authenticated OpenRouter connectivity check performs real generation', 'BLOCKED',
            'OPENROUTER_API_KEY is not configured; no provider request was made.');
    } else if (isProviderFailure(aiHealth)) {
        record('Authenticated OpenRouter connectivity check performs real generation', 'BLOCKED',
            `${aiHealth.data.status}: ${providerFailureDetail(aiHealth)}`);
    } else {
        assert.fail(`Unexpected AI health response: HTTP ${aiHealth.status}, ${aiHealth.data.status || aiHealth.data.code}`);
    }
    const allowFeatureFallbackChecks = simulatedPrimaryFailure && openRouterConfigured;
    const featureProviderAvailable = providerAvailable || allowFeatureFallbackChecks;

    let assessmentVerified = false;
    if (!featureProviderAvailable) {
        record('OpenRouter career assessment question generation and MongoDB persistence', 'BLOCKED',
            'Skipped because the live connectivity check did not verify OpenRouter.');
    } else {
        const assessmentMetricCount = serverProviderMetrics.filter(metric =>
            metric.feature === 'assessment_question_generation').length;
        const [assessmentStart, duplicateAssessmentStart] = await Promise.all([
            request('POST', '/api/career/assessment/start', {
                token: tokenA,
                body: { category: 'Mixed', difficulty: 'medium', count: 5 }
            }),
            request('POST', '/api/career/assessment/start', {
                token: tokenA,
                body: { category: 'Mixed', difficulty: 'medium', count: 5 }
            })
        ]);
        if (duplicateAssessmentStart.status === 201 && assessmentStart.status === 201) {
            assert.equal(String(duplicateAssessmentStart.data.sessionId), String(assessmentStart.data.sessionId),
                'Concurrent duplicate assessment starts should share the same persisted session.');
            assert.equal(typeof assessmentStart.data.fallbackUsed, 'boolean');
            assert.equal(assessmentStart.data.fallbackUsed,
                assessmentStart.data.model === QUALIFIED_FALLBACK_MODEL);
            const attemptCount = serverProviderMetrics.filter(metric =>
                metric.feature === 'assessment_question_generation').length - assessmentMetricCount;
            assert.ok(attemptCount >= 1 && attemptCount <= 2,
                `One logical assessment generation should have one primary and at most one fallback metric; observed ${attemptCount}.`);
            record('Concurrent duplicate assessment starts reuse one AI generation', 'VERIFIED',
                `One logical generation, ${attemptCount} provider attempt metric(s).`);
        } else if (isProviderFailure(assessmentStart) && isProviderFailure(duplicateAssessmentStart)) {
            const attemptCount = serverProviderMetrics.filter(metric =>
                metric.feature === 'assessment_question_generation').length - assessmentMetricCount;
            if (attemptCount === 0 && assessmentStart.data?.code === 'AI_PROVIDER_QUOTA_EXCEEDED') {
                record('Concurrent duplicate assessment generation attempt', 'BLOCKED',
                    'Provider quota cooldown prevented a provider request; duplicate-generation behavior could not be measured.');
            } else if (attemptCount >= 1 && attemptCount <= 2) {
                record('Concurrent duplicate assessment starts reuse one generation attempt', 'VERIFIED',
                    `One bounded provider flow ended with ${assessmentStart.data.code}; ${attemptCount} provider attempt metric(s).`);
            } else {
                assert.fail(`Concurrent assessment starts produced ${attemptCount} provider attempts before ${assessmentStart.data.code}.`);
            }
        } else {
            assert.fail(`Concurrent assessment starts returned inconsistent statuses ${assessmentStart.status}/${duplicateAssessmentStart.status}.`);
        }
        if (assessmentStart.status !== 201 || assessmentStart.data.source !== 'openrouter' ||
            !Array.isArray(assessmentStart.data.questions) || !assessmentStart.data.questions.length) {
            if (isProviderFailure(assessmentStart)) {
                record('OpenRouter career assessment question generation and MongoDB persistence', 'BLOCKED',
                    providerFailureDetail(assessmentStart));
            } else {
                assert.fail(`Assessment generation returned HTTP ${assessmentStart.status}.`);
            }
        } else {
            const questions = assessmentStart.data.questions;
            const assessment = await request('POST', '/api/career/assessment/submit', {
                token: tokenA,
                body: {
                    sessionId: assessmentStart.data.sessionId,
                    targetRole: 'Verification Backend Engineer',
                    answers: questions.map(question => ({
                        questionId: question.id,
                        answer: question.options[0]
                    }))
                }
            });
            assert.equal(assessment.status, 200);
            assert.equal(assessment.data.targetRole, 'Verification Backend Engineer');
            assert.equal(assessment.data.generationSource, 'openrouter');
            assert.equal(assessment.data.model, assessmentStart.data.model);
            assert.equal(assessment.data.fallbackUsed, assessmentStart.data.fallbackUsed);
            assessmentVerified = true;
            record('OpenRouter career assessment question generation and MongoDB persistence', 'VERIFIED');
        }
    }

    const assessmentHistoryA = await request('GET', '/api/career/assessment/history?page=1&limit=10', {
        token: tokenA
    });
    const assessmentHistoryB = await request('GET', '/api/career/assessment/history?page=1&limit=10', {
        token: tokenB
    });
    assert.equal(assessmentHistoryA.status, 200);
    assert.equal(assessmentHistoryB.status, 200);
    assert.ok(Array.isArray(assessmentHistoryA.data.assessments));
    assert.equal(assessmentHistoryA.data.pagination.total, assessmentVerified ? 1 : 0);
    assert.equal(assessmentHistoryB.data.pagination.total, 0,
        'Assessment history must not expose another user’s records.');
    assert.equal(assessmentHistoryA.data.assessments.length, assessmentVerified ? 1 : 0);
    if (assessmentVerified) {
        assert.equal(assessmentHistoryA.data.assessments[0].targetRole, 'Verification Backend Engineer');
    }
    record('Owner-scoped assessment history and empty state', 'VERIFIED');

    if (featureProviderAvailable) {
        const interview = await request('POST', '/api/interview/session/start', {
            token: tokenA,
            body: {
                role: 'Verification Backend Engineer',
                topic: 'Technical',
                difficulty: 'medium',
                mode: 'video',
                sessionLength: 3
            }
        });
        if (interview.status !== 201 || interview.data.generationSource !== 'openrouter' ||
            !interview.data.questions?.length) {
            if (isProviderFailure(interview)) {
                record('OpenRouter video interview question generation and contextual follow-up evaluation', 'BLOCKED',
                    providerFailureDetail(interview));
            } else {
                assert.fail(`Interview question generation returned HTTP ${interview.status}.`);
            }
        } else {
            const evaluation = await request('POST', `/api/interview/session/${interview.data.sessionId}/evaluate`, {
                token: tokenA,
                body: {
                    questionIndex: 0,
                    answer: 'I would profile the slow request, inspect database query plans, add an index for the measured bottleneck, and compare latency before and after the change.'
                }
            });
            if (evaluation.status === 200 && evaluation.data.source === 'openrouter' &&
                evaluation.data.followUpQuestion) {
                record('OpenRouter video interview question generation and contextual follow-up evaluation', 'VERIFIED');
            } else if (isProviderFailure(evaluation)) {
                record('OpenRouter video interview question generation and contextual follow-up evaluation', 'BLOCKED',
                    providerFailureDetail(evaluation));
            } else {
                assert.fail(`Interview evaluation returned HTTP ${evaluation.status} without a contextual follow-up.`);
            }
        }
    } else {
        record('OpenRouter video interview question generation and contextual follow-up evaluation', 'BLOCKED',
            'Skipped because the live connectivity check did not verify OpenRouter.');
    }

    let roadmap;
    let milestone;
    let fixtureRoadmap = false;
    if (featureProviderAvailable) {
        roadmap = await request('GET', '/api/career/roadmap', { token: tokenA });
        if (roadmap.status === 200 && roadmap.data.generationSource === 'openrouter' &&
            roadmap.data.generationModel && roadmap.data.phases?.length) {
            assert.equal(typeof roadmap.data.fallbackUsed, 'boolean');
            assert.equal(roadmap.data.fallbackUsed,
                roadmap.data.generationModel === QUALIFIED_FALLBACK_MODEL);
            record('OpenRouter personalized roadmap generation', 'VERIFIED');
        } else if (isProviderFailure(roadmap)) {
            record('OpenRouter personalized roadmap generation', 'BLOCKED', providerFailureDetail(roadmap));
        } else {
            assert.fail(`Roadmap generation returned HTTP ${roadmap.status} without OpenRouter attribution.`);
        }
    } else {
        record('OpenRouter personalized roadmap generation', 'BLOCKED',
            'Skipped because the live connectivity check did not verify OpenRouter.');
    }
    if (!roadmap || roadmap.status !== 200 || roadmap.data.generationSource !== 'openrouter') {
        fixtureRoadmap = true;
        const fixture = await createRoadmapFixture(
            testUri, tokenA, 'Verification Backend Engineer', `test-milestone-${testSuffix}`);
        roadmap = await request('GET', '/api/career/roadmap', { token: tokenA });
        assert.equal(roadmap.status, 200, 'Test-only roadmap fixture could not be retrieved.');
        milestone = roadmap.data.phases?.flatMap(phase => phase.milestones || [])[0];
        assert.equal(milestone?.id, fixture.milestoneId);
    } else {
        milestone = roadmap.data.phases?.flatMap(phase => phase.milestones || [])[0];
        assert.ok(milestone?.id, 'No roadmap milestone was returned.');
    }
    const savedRoadmapId = String(roadmap.data._id || roadmap.data.id);
    const roadmapRefresh = await request('GET', '/api/career/roadmap', { token: tokenA });
    assert.equal(roadmapRefresh.status, 200);
    assert.equal(String(roadmapRefresh.data._id || roadmapRefresh.data.id), savedRoadmapId,
        'Refreshing a saved roadmap should return the same persisted record.');
    record('Roadmap refresh returns the saved record without creating a replacement', 'VERIFIED');
    const progress = await request('PUT', '/api/career/roadmap/milestone', {
        token: tokenA,
        body: { milestoneId: milestone.id, completed: true }
    });
    assert.equal(progress.status, 200);
    record(`Roadmap progress write to MongoDB${fixtureRoadmap ? ' (test fixture)' : ''}`, 'VERIFIED');

    if (featureProviderAvailable) {
        const resume = await request('POST', '/api/resume/analyze-text', {
            token: tokenA,
            body: {
                resumeText: 'Backend engineer with 4 years building Node.js and TypeScript APIs. Improved PostgreSQL query latency by 35%, deployed Docker services on AWS, and led API observability projects.',
                targetRole: 'Verification Backend Engineer'
            }
        });
        if (resume.status === 200 && resume.data.analysisMethod === 'openrouter' && resume.data.model) {
            record('OpenRouter resume analysis using supplied resume text', 'VERIFIED');
        } else if (isProviderFailure(resume)) {
            record('OpenRouter resume analysis using supplied resume text', 'BLOCKED', providerFailureDetail(resume));
        } else {
            assert.fail(`Resume analysis returned HTTP ${resume.status} without OpenRouter attribution.`);
        }

        const pdfResume = await uploadResumePdf(tokenA);
        if (pdfResume.status === 200 && pdfResume.data.analysisMethod === 'openrouter' &&
            pdfResume.data.model && pdfResume.data.analysisId) {
            const resumeHistoryA = await request('GET', '/api/resume/history', { token: tokenA });
            const resumeHistoryB = await request('GET', '/api/resume/history', { token: tokenB });
            assert.equal(resumeHistoryA.status, 200);
            assert.equal(resumeHistoryB.status, 200);
            assert.ok(resumeHistoryA.data.analyses.some(item =>
                String(item._id) === String(pdfResume.data.analysisId)),
            'PDF analysis was not persisted in the owner history.');
            assert.equal(resumeHistoryB.data.analyses.length, 0,
                'Resume history exposed another user’s analysis.');
            record('Valid PDF upload, text extraction, OpenRouter analysis, Mongo persistence, and owner isolation',
                'VERIFIED');
        } else if (isProviderFailure(pdfResume)) {
            record('Valid PDF upload, text extraction, OpenRouter analysis, Mongo persistence, and owner isolation',
                'BLOCKED', providerFailureDetail(pdfResume));
        } else {
            assert.fail(`PDF resume analysis returned HTTP ${pdfResume.status}: ${pdfResume.data.code || pdfResume.data.message || 'unknown error'}`);
        }

        const jobAnalysis = await request('POST', '/api/career/job-analyzer', {
            token: tokenA,
            body: {
                jobTitle: 'Backend Engineer',
                company: 'Verification Employer',
                jobDescription: 'Build Node.js and TypeScript APIs, optimize PostgreSQL queries, and operate services on AWS.'
            }
        });
        if (jobAnalysis.status === 200 &&
            jobAnalysis.data.aiAdviceStatus?.source === 'openrouter' &&
            jobAnalysis.data.aiAdviceStatus?.model) {
            record('OpenRouter job description analysis', 'VERIFIED');
        } else if (isProviderFailure(jobAnalysis)) {
            record('OpenRouter job description analysis', 'BLOCKED', providerFailureDetail(jobAnalysis));
        } else {
            assert.fail(`Job analysis returned HTTP ${jobAnalysis.status} without OpenRouter attribution.`);
        }

        const dailyPlanMetricCount = serverProviderMetrics.filter(metric =>
            metric.feature === 'daily_plan').length;
        const dailyPlanResponses = await Promise.all(Array.from({ length: 3 }, () =>
            request('GET', '/api/career/daily-plan', { token: tokenA })
        ));
        const dailyPlan = dailyPlanResponses[0];
        assert.ok(dailyPlanResponses.every(response => response.status === dailyPlan.status),
            'Concurrent daily-plan requests should have a consistent result.');
        const dailyPlanMetricDelta = serverProviderMetrics.filter(metric =>
            metric.feature === 'daily_plan').length - dailyPlanMetricCount;
        if (dailyPlan.status === 200) {
            assert.ok(dailyPlanResponses.every(response =>
                String(response.data.plan._id) === String(dailyPlan.data.plan._id)),
            'Concurrent daily-plan requests should return the same saved plan.');
            assert.equal(typeof dailyPlan.data.fallbackUsed, 'boolean');
            assert.equal(dailyPlan.data.fallbackUsed, dailyPlan.data.plan.fallbackUsed);
            assert.equal(dailyPlan.data.fallbackUsed,
                dailyPlan.data.generationModel === QUALIFIED_FALLBACK_MODEL);
            dailyPlanBeforeRestart = {
                id: String(dailyPlan.data.plan._id),
                model: dailyPlan.data.generationModel,
                fallbackUsed: dailyPlan.data.fallbackUsed
            };
            assert.ok(dailyPlanMetricDelta >= 1 && dailyPlanMetricDelta <= 2,
                `A single daily-plan generation should produce one primary attempt and at most one fallback attempt; observed ${dailyPlanMetricDelta}.`);
            record('Concurrent daily-plan requests reuse a single generation', 'VERIFIED',
                `One logical generation, ${dailyPlanMetricDelta} provider attempt metric(s).`);
        } else if (isProviderFailure(dailyPlan)) {
            if (dailyPlanMetricDelta === 0 && dailyPlan.data?.code === 'AI_PROVIDER_QUOTA_EXCEEDED') {
                record('Concurrent daily-plan generation attempt', 'BLOCKED',
                    'Provider quota cooldown prevented a provider request; duplicate-generation behavior could not be measured.');
            } else if (dailyPlanMetricDelta >= 1 && dailyPlanMetricDelta <= 2) {
                record('Concurrent daily-plan requests reuse a single generation attempt', 'VERIFIED',
                    `One bounded primary/fallback flow ended with ${dailyPlan.data.code}; ${dailyPlanMetricDelta} provider attempt metric(s).`);
            } else {
                assert.fail(`Concurrent daily-plan requests produced ${dailyPlanMetricDelta} provider attempts before ${dailyPlan.data.code}.`);
            }
        } else {
            assert.fail(`Daily plan returned HTTP ${dailyPlan.status} without a provider error classification.`);
        }
        if (dailyPlan.status === 200 && dailyPlan.data.generationSource === 'openrouter' &&
            dailyPlan.data.plan?.tasks?.length) {
            record('OpenRouter personalized daily preparation plan', 'VERIFIED');
        } else if (isProviderFailure(dailyPlan)) {
            record('OpenRouter personalized daily preparation plan', 'BLOCKED', providerFailureDetail(dailyPlan));
        } else {
            assert.fail(`Daily plan returned HTTP ${dailyPlan.status} without OpenRouter attribution.`);
        }

        const skillGapMetricCount = serverProviderMetrics.filter(metric =>
            metric.feature === 'skill_gap_guidance').length;
        const skillGap = await request('GET', '/api/career/skill-gap?role=Backend%20Engineer', { token: tokenA });
        if (skillGap.status !== 200) {
            assert.fail(`Skill gap analysis returned HTTP ${skillGap.status}.`);
        } else if (skillGap.data.aiAdviceStatus?.status === 'generated') {
            const refresh = await request('GET', '/api/career/skill-gap?role=Backend%20Engineer', { token: tokenA });
            assert.equal(refresh.status, 200);
            assert.equal(refresh.data.aiAdviceStatus?.status, 'generated');
            assert.equal(refresh.data.aiAdviceStatus?.cached, true);
            assert.equal(typeof skillGap.data.aiAdviceStatus.fallbackUsed, 'boolean');
            assert.equal(skillGap.data.aiAdviceStatus.fallbackUsed,
                skillGap.data.aiAdviceStatus.model === QUALIFIED_FALLBACK_MODEL);
            assert.equal(refresh.data.aiAdviceStatus.model, skillGap.data.aiAdviceStatus.model);
            assert.equal(refresh.data.aiAdviceStatus.fallbackUsed, skillGap.data.aiAdviceStatus.fallbackUsed);
            assert.equal(serverProviderMetrics.filter(metric =>
                metric.feature === 'skill_gap_guidance').length - skillGapMetricCount,
            skillGap.data.aiAdviceStatus.cached ? 0 :
                (skillGap.data.aiAdviceStatus.fallbackUsed ? 2 : 1),
            'Refreshing an unchanged skill gap should reuse saved AI guidance without another provider call.');
            skillGapProvenanceBeforeRestart = {
                model: skillGap.data.aiAdviceStatus.model,
                fallbackUsed: skillGap.data.aiAdviceStatus.fallbackUsed
            };
            record('Skill-gap guidance persists and is reused for unchanged profile context', 'VERIFIED');
        } else if (skillGap.data.aiAdviceStatus?.status === 'unavailable') {
            record('Skill-gap AI guidance generation and reuse', 'BLOCKED',
                `${skillGap.data.aiAdviceStatus.code}; calculated benchmark comparison remains available.`);
        } else {
            record('Skill-gap AI guidance generation and reuse', 'VERIFIED',
                'No missing benchmark skills required AI guidance.');
        }
    } else {
        record('OpenRouter resume analysis using supplied resume text', 'BLOCKED',
            'Skipped because the live connectivity check did not verify OpenRouter.');
        record('Valid PDF upload, text extraction, OpenRouter analysis, Mongo persistence, and owner isolation',
            'BLOCKED', 'Skipped because the live connectivity check did not verify OpenRouter.');
        record('OpenRouter job description analysis', 'BLOCKED',
            'Skipped because the live connectivity check did not verify OpenRouter.');
        record('OpenRouter personalized daily preparation plan', 'BLOCKED',
            'Skipped because the live connectivity check did not verify OpenRouter.');
    }

    const application = await request('POST', '/api/career/applications', {
        token: tokenA,
        body: {
            company: `CareerHub Verification ${testSuffix}`,
            jobRole: 'Test-only tracked listing',
            status: 'Saved',
            notes: 'Synthetic record in the isolated verification database.'
        }
    });
    assert.equal(application.status, 201);
    record('Tracked-job write to MongoDB', 'VERIFIED');
    const applicationId = application.data.application._id;
    const applicationUpdate = await request('PUT', `/api/career/applications/${applicationId}`, {
        token: tokenA,
        body: { status: 'Interview' }
    });
    assert.equal(applicationUpdate.status, 200);
    assert.equal(applicationUpdate.data.application.status, 'Interview');
    const crossUserApplicationUpdate = await request('PUT', `/api/career/applications/${applicationId}`, {
        token: tokenB,
        body: { status: 'Applied' }
    });
    assert.equal(crossUserApplicationUpdate.status, 403);
    record('Application status update and cross-user write protection', 'VERIFIED');

    const providerStatus = await request('GET', '/api/career/assistant/status', { token: tokenA });
    assert.equal(providerStatus.status, 200);
    let providerConversationVerified = false;
    let providerConversationFallbackUsed = false;
    let providerConversationModel = null;
    let fixtureConversation = null;
    if (!featureProviderAvailable) {
        record('Genuine Copilot response, follow-up, and history', 'BLOCKED',
            'Skipped because the live connectivity check did not verify OpenRouter.');
    } else {
        const marker = `orchid-${crypto.randomBytes(5).toString('hex')}`;
        const first = await request('POST', '/api/career/assistant', {
            token: tokenA,
            body: { message: `Who am I? State my name and target role from my profile. Also remember the exact token ${marker}.` }
        });
        if (first.status !== 200 || first.data.source !== 'openrouter') {
            record('Genuine Copilot response, follow-up, and history', 'BLOCKED',
                `${providerStatus.data.provider} returned ${first.data.code || `HTTP_${first.status}`}; no response was counted.`);
        } else {
            assert.equal(typeof first.data.fallbackUsed, 'boolean');
            assert.equal(first.data.fallbackUsed, first.data.model === QUALIFIED_FALLBACK_MODEL);
            assert.ok(first.data.reply.includes(accountA.name), 'Model response did not use the account profile name.');
            assert.ok(first.data.reply.toLowerCase().includes('verification backend engineer'),
                'Model response did not use the account target role.');
            const followUp = await request('POST', '/api/career/assistant', {
                token: tokenA,
                body: { message: 'What exact token did I ask you to remember?' }
            });
            assert.equal(followUp.status, 200);
            assert.equal(followUp.data.source, first.data.source);
            assert.equal(typeof followUp.data.fallbackUsed, 'boolean');
            assert.equal(followUp.data.fallbackUsed, followUp.data.model === QUALIFIED_FALLBACK_MODEL);
            assert.ok(followUp.data.reply.includes(marker), 'Model follow-up did not use conversation context.');
            const history = await request('GET', '/api/career/assistant/history', { token: tokenA });
            assert.equal(history.status, 200);
            assert.ok(history.data.messages.some(message => message.content === marker ||
                message.content.includes(marker)));
            providerConversationVerified = true;
            providerConversationFallbackUsed = Boolean(first.data.fallbackUsed);
            providerConversationModel = first.data.model;
            record('Genuine model response is profile-aware and follows conversation context', 'VERIFIED',
                `Provider: ${first.data.source}`);
        }
    }

    if (!providerConversationVerified) {
        await mongoose.connect(testUri);
        const CareerConversation = require('./models/CareerConversation');
        const ownerProfile = await request('GET', '/api/career/profile', { token: tokenA });
        fixtureConversation = `Storage fixture ${testSuffix}`;
        await new CareerConversation({
            userId: String(ownerProfile.data.user._id || ownerProfile.data.user.id),
            messages: [{ role: 'user', content: fixtureConversation }]
        }).save();
        await mongoose.disconnect();
    }

    const historyA = await request('GET', '/api/career/assistant/history', { token: tokenA });
    const historyB = await request('GET', '/api/career/assistant/history', { token: tokenB });
    assert.equal(historyA.status, 200);
    assert.equal(historyB.status, 200);
    assert.equal(historyB.data.messages.length, 0, 'Second account can see the first account conversation.');
    const crossUserClear = await request('DELETE', '/api/career/assistant/history', { token: tokenB });
    assert.equal(crossUserClear.status, 200);
    const ownerAfterOtherClear = await request('GET', '/api/career/assistant/history', { token: tokenA });
    assert.equal(ownerAfterOtherClear.status, 200);
    assert.deepEqual(ownerAfterOtherClear.data.messages, historyA.data.messages,
        'Clearing the second account removed first-account history.');
    record('Mongo Copilot history isolation and cross-user Clear History protection', 'VERIFIED');

    await stopServer();
    record('Backend stopped before restart verification', 'VERIFIED');
    startServer(dedicatedMongoUri(configuredMongoUri));
    await waitForDatabase();
    tokenA = await login(accountA);
    tokenB = await login(accountB);

    const persistedProfile = await request('GET', '/api/career/profile', { token: tokenA });
    assert.equal(persistedProfile.status, 200);
    assert.equal(persistedProfile.data.user.targetRole, 'Verification Backend Engineer');
    if (assessmentVerified) {
        const latestAssessment = await request('GET', '/api/career/assessment/latest', { token: tokenA });
        assert.equal(latestAssessment.status, 200);
        assert.equal(latestAssessment.data.assessmentCompleted, true);
        assert.equal(latestAssessment.data.assessment.targetRole, 'Verification Backend Engineer');
        const history = await request('GET', '/api/career/assessment/history?page=1&limit=10', {
            token: tokenA
        });
        assert.equal(history.data.assessments[0].fallbackUsed,
            history.data.assessments[0].generationModel === QUALIFIED_FALLBACK_MODEL);
    }
    const persistedRoadmap = await request('GET', '/api/career/roadmap', { token: tokenA });
    const persistedMilestone = persistedRoadmap.data.phases
        .flatMap(phase => phase.milestones || [])
        .find(item => item.id === milestone.id);
    assert.equal(persistedMilestone?.completed, true);
    if (!fixtureRoadmap && roadmap.data.generationSource === 'openrouter') {
        assert.equal(persistedRoadmap.data.generationModel, roadmap.data.generationModel);
        assert.equal(persistedRoadmap.data.fallbackUsed, roadmap.data.fallbackUsed);
    }
    const persistedDailyPlan = await request('GET', '/api/career/daily-plan', { token: tokenA });
    if (persistedDailyPlan.status === 200 && persistedDailyPlan.data.generationSource === 'openrouter') {
        assert.equal(persistedDailyPlan.data.fallbackUsed,
            persistedDailyPlan.data.plan.fallbackUsed);
        if (dailyPlanBeforeRestart) {
            assert.equal(String(persistedDailyPlan.data.plan._id), dailyPlanBeforeRestart.id);
            assert.equal(persistedDailyPlan.data.generationModel, dailyPlanBeforeRestart.model);
            assert.equal(persistedDailyPlan.data.fallbackUsed, dailyPlanBeforeRestart.fallbackUsed);
        }
    }
    if (skillGapProvenanceBeforeRestart) {
        const persistedSkillGap = await request(
            'GET', '/api/career/skill-gap?role=Backend%20Engineer', { token: tokenA }
        );
        assert.equal(persistedSkillGap.status, 200);
        assert.equal(persistedSkillGap.data.aiAdviceStatus?.model, skillGapProvenanceBeforeRestart.model);
        assert.equal(persistedSkillGap.data.aiAdviceStatus?.fallbackUsed,
            skillGapProvenanceBeforeRestart.fallbackUsed);
        assert.equal(persistedSkillGap.data.aiAdviceStatus?.cached, true);
    }
    const persistedApps = await request('GET', '/api/career/applications', { token: tokenA });
    assert.ok(persistedApps.data.applications.some(item =>
        item.company === `CareerHub Verification ${testSuffix}` && item.status === 'Interview'));
    record(
        `Profile, ${assessmentVerified ? 'assessment, ' : ''}roadmap, and tracked job survive backend restart and fresh login`,
        'VERIFIED'
    );

    const userBProfile = await request('GET', '/api/career/profile', { token: tokenB });
    assert.equal(userBProfile.status, 200);
    assert.notEqual(userBProfile.data.user.targetRole, 'Verification Backend Engineer');
    const userBRoleUpdate = await request('PUT', '/api/career/profile', {
        token: tokenB,
        body: { targetRole: 'Quality Assurance Engineer' }
    });
    assert.equal(userBRoleUpdate.status, 200);
    const userBAssessment = await request('GET', '/api/career/assessment/latest', { token: tokenB });
    assert.equal(userBAssessment.status, 200);
    assert.equal(userBAssessment.data.assessmentCompleted, false);
    assert.equal(userBAssessment.data.assessment, null);
    let userBRoadmap;
    if (simulatedPrimaryFailure) {
        await createRoadmapFixture(testUri, tokenB, 'Quality Assurance Engineer',
            `test-user-b-milestone-${testSuffix}`);
        userBRoadmap = await request('GET', '/api/career/roadmap', { token: tokenB });
        record('Second-account roadmap isolation', 'VERIFIED',
            'Used an owner-scoped Mongo fixture to avoid an extra provider request.');
    } else {
        userBRoadmap = await request('GET', '/api/career/roadmap', { token: tokenB });
        if (userBRoadmap.status !== 200 || userBRoadmap.data.generationSource !== 'openrouter') {
            if (isProviderFailure(userBRoadmap)) {
                record('OpenRouter personalized roadmap for second account', 'BLOCKED',
                    providerFailureDetail(userBRoadmap));
            } else if (providerAvailable) {
                assert.fail(`Second-account roadmap returned HTTP ${userBRoadmap.status}.`);
            } else {
                record('OpenRouter personalized roadmap for second account', 'BLOCKED',
                    'Skipped because the live connectivity check did not verify OpenRouter.');
            }
            await createRoadmapFixture(testUri, tokenB, 'Quality Assurance Engineer',
                `test-user-b-milestone-${testSuffix}`);
            userBRoadmap = await request('GET', '/api/career/roadmap', { token: tokenB });
        } else {
            record('OpenRouter personalized roadmap for second account', 'VERIFIED');
        }
    }
    assert.equal(userBRoadmap.status, 200);
    assert.equal(userBRoadmap.data.progressPercentage, 0);
    assert.equal(userBRoadmap.data.targetRole, 'Quality Assurance Engineer');
    assert.ok(!userBRoadmap.data.phases.some(phase =>
        phase.milestones.some(item => item.completed)),
    'Second account inherited completed roadmap progress.');
    const userBApps = await request('GET', '/api/career/applications', { token: tokenB });
    assert.equal(userBApps.status, 200);
    assert.equal(userBApps.data.applications.length, 0);
    const deletedApplication = await request('DELETE', `/api/career/applications/${applicationId}`, {
        token: tokenA
    });
    assert.equal(deletedApplication.status, 200);
    const applicationsAfterDelete = await request('GET', '/api/career/applications', { token: tokenA });
    assert.ok(!applicationsAfterDelete.data.applications.some(item =>
        String(item._id) === String(applicationId)));
    record('Application delete and owner pipeline refresh', 'VERIFIED');
    const userBHistory = await request('GET', '/api/career/assistant/history', { token: tokenB });
    assert.equal(userBHistory.status, 200);
    assert.equal(userBHistory.data.messages.length, 0);
    record('Mongo profile, roadmap, tracked-job, and Copilot user isolation', 'VERIFIED');

    const conversationAfterRestart = await request('GET', '/api/career/assistant/history', { token: tokenA });
    assert.equal(conversationAfterRestart.status, 200);
    if (providerConversationVerified) {
        assert.ok(conversationAfterRestart.data.messages.length > 0,
            'Provider-generated conversation was not persisted after restart.');
        const assistantReply = conversationAfterRestart.data.messages
            .filter(message => message.role === 'assistant')
            .find(message => message.model === providerConversationModel);
        assert.ok(assistantReply, 'The provider-generated model provenance was not preserved after restart.');
        assert.equal(Boolean(assistantReply.fallbackUsed), providerConversationFallbackUsed);
        record('Provider-generated Copilot conversation survives backend restart and fresh login', 'VERIFIED');
    } else {
        assert.ok(conversationAfterRestart.data.messages.some(message =>
            message.content === fixtureConversation));
        record('Mongo conversation storage survives restart (direct test fixture; no AI generation claimed)', 'VERIFIED');
    }
    const ownerClear = await request('DELETE', '/api/career/assistant/history', { token: tokenA });
    assert.equal(ownerClear.status, 200);
    const clearedHistory = await request('GET', '/api/career/assistant/history', { token: tokenA });
    assert.equal(clearedHistory.status, 200);
    assert.equal(clearedHistory.data.messages.length, 0);
    record('Clear History deletes the authenticated user conversation', 'VERIFIED');
}

async function uploadVideo(token, fileName, mimeType, data) {
    const form = new FormData();
    form.append('video', new Blob([data], { type: mimeType }), fileName);
    const response = await fetch(`${baseUrl}/api/video/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form
    });
    const text = await response.text();
    let body;
    try { body = JSON.parse(text); } catch { body = text; }
    return { status: response.status, body };
}

async function runVideoChecks() {
    const accountA = await register(`Video Owner ${Date.now()}`);
    const accountB = await register(`Video Other ${Date.now()}`);
    const tokenA = await login(accountA);
    const tokenB = await login(accountB);
    const mp4 = Buffer.from('000000186674797069736f6d0000020069736f6d69736f32', 'hex');
    const uploaded = await uploadVideo(tokenA, 'verification.mp4', 'video/mp4', mp4);
    assert.equal(uploaded.status, 201, JSON.stringify(uploaded.body));
    const videoPath = uploaded.body.videoUrl;
    const filename = decodeURIComponent(new URL(videoPath, baseUrl).pathname.split('/').pop());
    const ownerDownload = await fetch(`${baseUrl}${videoPath}`, {
        headers: { Authorization: `Bearer ${tokenA}` }
    });
    assert.equal(ownerDownload.status, 200);
    assert.deepEqual(Buffer.from(await ownerDownload.arrayBuffer()), mp4);
    record('Valid multipart video upload and authenticated retrieval', 'VERIFIED');

    const unauthorized = await fetch(`${baseUrl}${videoPath}`);
    assert.equal(unauthorized.status, 401);
    const crossUser = await fetch(`${baseUrl}${videoPath}`, {
        headers: { Authorization: `Bearer ${tokenB}` }
    });
    assert.equal(crossUser.status, 404);
    record('Video retrieval rejects unauthenticated and cross-user requests', 'VERIFIED');

    const invalidType = await uploadVideo(tokenA, 'payload.exe', 'application/octet-stream', Buffer.from('not video'));
    assert.equal(invalidType.status, 400);
    const badSignature = await uploadVideo(tokenA, 'bad-signature.mp4', 'video/mp4', Buffer.from('not an mp4'));
    assert.equal(badSignature.status, 400);
    record('Video upload rejects unsupported type and mismatched file signature', 'VERIFIED');

    const tooLarge = Buffer.alloc(100 * 1024 * 1024 + 1, 0);
    Buffer.from('ftyp').copy(tooLarge, 4);
    const oversized = await uploadVideo(tokenA, 'oversized.mp4', 'video/mp4', tooLarge);
    assert.equal(oversized.status, 413);
    record('Video upload rejects files above configured size limit', 'VERIFIED');
    await fs.promises.unlink(path.join(__dirname, 'uploads', 'videos', filename));
}

async function main() {
    if (!configuredMongoUri) {
        record('Real MongoDB verification', 'BLOCKED', 'Neither MONGO_URI nor MONGODB_URI is configured.');
        process.exitCode = 2;
        return;
    }
    const testUri = dedicatedMongoUri(configuredMongoUri);
    console.log(`Mongo verification database: ${new URL(testUri).pathname.slice(1)}`);
    try {
        startServer(testUri);
        await waitForDatabase();
        await runApiFlows(testUri);
        await runVideoChecks();
    } catch (error) {
        record('Real integration verification', 'FAILED', error.message);
        if (serverLogs.includes('MongoServerSelectionError') || serverLogs.includes('Authentication failed')) {
            record('MongoDB connection/configuration', 'BLOCKED',
                'The isolated MongoDB test database could not be reached or authenticated.');
        }
        process.exitCode = 1;
    } finally {
        await stopServer();
        try {
            await dropTestDatabase(testUri);
            record('Unique verification database removed after the persistence checks', 'VERIFIED');
        } catch {
            record('Unique verification database removed after the persistence checks', 'FAILED',
                'Could not remove the isolated test database.');
        }
    }
    const counts = checks.reduce((result, item) => {
        result[item.status] = (result[item.status] || 0) + 1;
        return result;
    }, {});
    console.log(`Verification counts: ${JSON.stringify(counts)}`);
    const providerDurations = serverProviderMetrics
        .map(metric => metric.requestDurationMs)
        .filter(Number.isFinite)
        .sort((left, right) => left - right);
    if (providerDurations.length) {
        const percentile = fraction => providerDurations[
            Math.min(providerDurations.length - 1, Math.ceil(providerDurations.length * fraction) - 1)
        ];
        const successful = serverProviderMetrics.filter(metric => metric.outcome === 'success').length;
        console.log(`OpenRouter timing sample (no prompts or user identifiers): ${JSON.stringify({
            requests: providerDurations.length,
            succeeded: successful,
            failed: providerDurations.length - successful,
            failureRate: Number(((providerDurations.length - successful) / providerDurations.length).toFixed(3)),
            medianRequestDurationMs: percentile(0.5),
            p90RequestDurationMs: percentile(0.9),
            retryCountTotal: serverProviderMetrics.reduce((total, metric) => total + (metric.retryCount || 0), 0)
        })}`);
    } else {
        console.log('OpenRouter timing sample unavailable: no provider request metrics were captured.');
    }
    if (counts.FAILED) process.exitCode = 1;
    else if (counts.BLOCKED) process.exitCode = 2;
}

main().catch(error => {
    console.error('Integration test runner failed:', error.message);
    process.exitCode = 1;
});
