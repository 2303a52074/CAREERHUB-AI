/**
 * CareerHub AI â€” Extended Test Suite
 * Integration coverage for account workflows, persistence, validation, and isolation.
 */

const http = require('http');
const crypto = require('crypto');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const CareerConversation = require('./models/CareerConversation');
const ResumeAnalysis = require('./models/ResumeAnalysis');
const CareerRoadmap = require('./models/CareerRoadmap');
const DailyPlan = require('./models/DailyPlan');
const DailyPlanGenerationLock = require('./models/DailyPlanGenerationLock');
const CareerAssessment = require('./models/CareerAssessment');
const User = require('./models/User');
const { submitChallengeAnswer, XP_PER_CHALLENGE } = require('./utils/challengeService');

const API_URL = new URL(process.env.API_BASE_URL || 'http://localhost:3000');
let passed = 0, failed = 0, skipped = 0;
let authToken = '';
let studentBToken = '';
let pendingAssessmentSession = null;
let testAppId = '';
const registeredEmail = `test_${Date.now()}@careerhub.test`;
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

function isProviderFailure(response) {
  return response.status >= 400 && providerFailureCodes.has(response.body?.code);
}

function isAdviceUnavailable(status) {
  return status?.status === 'not_configured' ||
    (status?.status === 'unavailable' && providerFailureCodes.has(status.code));
}

async function req(method, path, body, token) {
  return new Promise((resolve) => {
    const data = body ? JSON.stringify(body) : null;
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const opts = { hostname: API_URL.hostname, port: API_URL.port || 80, path, method, headers };
    const r = http.request(opts, (res) => {
      let buf = '';
      res.on('data', c => buf += c);
      res.on('end', () => {
        let json;
        try { json = JSON.parse(buf); } catch { json = buf; }
        resolve({ status: res.statusCode, body: json });
      });
    });
    r.on('error', e => resolve({ status: 0, error: e.message }));
    if (data) r.write(data);
    r.end();
  });
}

async function reqResumeFile(endpoint, filePath, token) {
  const form = new FormData();
  form.append(
    'resume',
    new Blob([fs.readFileSync(filePath)], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    }),
    path.basename(filePath)
  );
  form.append('targetRole', 'AI/ML Engineer');
  const response = await fetch(new URL(endpoint, API_URL), {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form
  });
  const text = await response.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text; }
  return { status: response.status, body };
}

function test(name, pass, detail = '') {
  if (pass) {
    console.log(`âœ… PASS: ${name}${detail ? '\n   ' + detail : ''}`);
    passed++;
  } else {
    console.log(`âŒ FAIL: ${name}${detail ? '\n   ' + detail : ''}`);
    failed++;
  }
}

function skip(name, detail = '') {
  console.log(`âš ï¸ BLOCKED: ${name}${detail ? '\n   ' + detail : ''}`);
  skipped++;
}

async function withTestMongo(work) {
  const uri = process.env.TEST_MONGO_URI || process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) throw new Error('A MongoDB URI is required to create isolated persistence fixtures.');
  const ownsConnection = mongoose.connection.readyState !== 1;
  if (ownsConnection) await mongoose.connect(uri);
  try {
    return await work();
  } finally {
    if (ownsConnection) await mongoose.disconnect();
  }
}

function runDailyPlanWorker(userId, date) {
  return new Promise((resolve, reject) => {
    const worker = spawn(process.execPath, [
      path.join(__dirname, 'test-daily-plan-worker.js'),
      userId,
      date
    ], { env: process.env, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    worker.stdout.setEncoding('utf8').on('data', chunk => { stdout += chunk; });
    worker.stderr.setEncoding('utf8').on('data', chunk => { stderr += chunk; });
    worker.once('error', reject);
    worker.once('close', code => {
      if (code !== 0) return reject(new Error(stderr.trim() || `Worker exited with code ${code}.`));
      try {
        resolve(JSON.parse(stdout));
      } catch {
        reject(new Error('Daily-plan worker returned invalid output.'));
      }
    });
  });
}

async function createRoadmapFixture(token, targetRole, milestoneId) {
  const owner = await req('GET', '/api/career/profile', null, token);
  const userId = String(owner.body.user?._id || owner.body.user?.id);
  return withTestMongo(() => new CareerRoadmap({
    userId,
    targetRole: targetRole || owner.body.user?.targetRole,
    generationSource: 'test-fixture',
    aiGenerationStatus: 'not_generated',
    phases: [{
      phaseNumber: 1,
      title: 'Persistence test fixture',
      description: 'Test-only data; not generated by AI.',
      status: 'in-progress',
      milestones: [{
        id: milestoneId,
        title: 'Verify saved progress',
        completionCriteria: 'The test marks this milestone complete.',
        estimatedHours: 1,
        completed: false
      }]
    }]
  }).save());
}

async function createDailyPlanFixture(token, targetRole, taskId) {
  const owner = await req('GET', '/api/career/profile', null, token);
  const userId = String(owner.body.user?._id || owner.body.user?.id);
  const date = new Date().toISOString().slice(0, 10);
  return withTestMongo(() => new DailyPlan({
    userId,
    date,
    targetRole,
    generationSource: null,
    generationModel: null,
    completionPercentage: 0,
    streak: 0,
    tasks: [{
      id: taskId,
      title: 'Persistence test task',
      category: 'general',
      description: 'Test-only data; not generated by AI.',
      xpReward: 25,
      completed: false
    }, {
      id: `${taskId}-second`,
      title: 'Second persistence test task',
      category: 'general',
      description: 'Keeps plan-completion bonus separate from task XP.',
      xpReward: 25,
      completed: false
    }]
  }).save());
}

async function run() {
  console.log('\nðŸ§ª CareerHub AI â€” Extended Acceptance Tests\n');

  const coordinationUserId = `coordination-${crypto.randomUUID()}`;
  const coordinationDate = new Date().toISOString().slice(0, 10);
  try {
    await withTestMongo(async () => {
      await Promise.all([DailyPlan.init(), DailyPlanGenerationLock.init()]);
      const results = await Promise.all([
        runDailyPlanWorker(coordinationUserId, coordinationDate),
        runDailyPlanWorker(coordinationUserId, coordinationDate)
      ]);
      const storedPlans = await mongoose.models.DailyPlan.countDocuments({
        userId: coordinationUserId,
        date: coordinationDate
      });
      const storedLocks = await mongoose.models.DailyPlanGenerationLock.countDocuments({
        userId: coordinationUserId,
        date: coordinationDate
      });
      test('MongoDB lease coalesces multi-process daily-plan generation',
        results.filter(result => result.generated).length === 1 &&
        results[0].planId === results[1].planId &&
        storedPlans === 1 && storedLocks === 0,
        `generation winners: ${results.filter(result => result.generated).length}, persisted plans: ${storedPlans}, active locks: ${storedLocks}`);
    });
  } catch (error) {
    test('MongoDB lease coalesces cross-instance daily-plan generation', false, error.message);
  } finally {
    if (mongoose.connection.readyState === 1) {
      await Promise.all([
        mongoose.models.DailyPlan.deleteMany({ userId: coordinationUserId, date: coordinationDate }),
        mongoose.models.DailyPlanGenerationLock.deleteMany({ userId: coordinationUserId, date: coordinationDate })
      ]);
    }
  }

  // TEST 1: Registration creates a persistent user
  const regRes = await req('POST', '/api/auth/register', {
    name: 'Test Student A', email: registeredEmail, password: 'testpass123'
  });
  test('TEST 1: Registration creates a new user',
    regRes.status === 201 && regRes.body.message,
    `Status: ${regRes.status}`);

  // TEST 2a: Duplicate email rejected
  const dupRes = await req('POST', '/api/auth/register', {
    name: 'Duplicate', email: registeredEmail, password: 'testpass123'
  });
  test('TEST 2a: Duplicate email registration rejected',
    dupRes.status === 409, `Status: ${dupRes.status}`);

  // TEST 2b: Login works correctly
  const loginRes = await req('POST', '/api/auth/login', {
    email: registeredEmail, password: 'testpass123'
  });
  test('TEST 2b: Login returns JWT token',
    loginRes.status === 200 && !!loginRes.body.token, `Status: ${loginRes.status}`);
  authToken = loginRes.body.token || '';

  // TEST 2c: Wrong password rejected
  const badLogin = await req('POST', '/api/auth/login', {
    email: registeredEmail, password: 'wrongpassword'
  });
  test('TEST 2c: Wrong password rejected', badLogin.status === 401, `Status: ${badLogin.status}`);

  // TEST 3: Profile fetch works
  const profRes = await req('GET', '/api/career/profile', null, authToken);
  test('TEST 3: Authenticated profile fetch',
    profRes.status === 200 && (profRes.body.user || profRes.body.name), `Status: ${profRes.status}`);
  test('Profile API never returns password or private calendar credentials',
    profRes.status === 200 && !profRes.body.user?.password &&
    !profRes.body.user?.calendarRefreshToken,
    'Sensitive profile fields are excluded.');

  // TEST 3b: Profile update persists ALL fields
  const updateRes = await req('PUT', '/api/career/profile', {
    degree: 'B.Tech', branch: 'CSE (AI & ML)', college: 'Test University', cgpa: '8.5',
    technicalSkills: ['Python', 'Machine Learning', 'TensorFlow', 'NumPy'],
    softSkills: ['Problem Solving', 'Communication'],
    certifications: ['AWS Cloud Practitioner'],
    targetRole: 'AI/ML Engineer',
    careerGoals: 'Build ML models at scale'
  }, authToken);
  test('TEST 3b: Profile update with all fields accepted',
    updateRes.status === 200 && updateRes.body.user, `Status: ${updateRes.status}`);

  // Verify persistence
  const verifyRes = await req('GET', '/api/career/profile', null, authToken);
  const vUser = verifyRes.body.user || verifyRes.body;
  test('TEST 3c: Updated skills persist after re-fetch',
    verifyRes.status === 200 && (vUser.technicalSkills || []).includes('Machine Learning'),
    `Skills: ${(vUser.technicalSkills || []).slice(0,3).join(', ')}`);

  const codingProblems = await req('GET', '/api/coding/problems', null, authToken);
  const firstCodingProblem = Array.isArray(codingProblems.body) ? codingProblems.body[0] : null;
  const anonymousCodingHint = firstCodingProblem
    ? await req('POST', '/api/coding/hint', { problemId: firstCodingProblem._id }, null)
    : { status: 0, body: {} };
  test('Coding hint endpoint requires authentication',
    !firstCodingProblem || anonymousCodingHint.status === 401,
    `Status: ${anonymousCodingHint.status}`);
  if (firstCodingProblem?._id) {
    const codingHint = await req('POST', '/api/coding/hint', {
      problemId: firstCodingProblem._id
    }, authToken);
    if (isProviderFailure(codingHint)) {
      skip('Coding hint uses the configured provider and returns a validated hint',
        `Provider returned ${codingHint.body.code}.`);
    } else {
      test('Coding hint uses the configured provider and returns a validated hint',
        codingHint.status === 200 && codingHint.body.source === 'openrouter' &&
        codingHint.body.model && codingHint.body.hint && Array.isArray(codingHint.body.concepts),
        `Status: ${codingHint.status}, source: ${codingHint.body.source || codingHint.body.code || 'none'}`);
    }
  }

  const generatedInterview = await req('POST', '/api/interview/generate', {
    role: 'AI/ML Engineer', difficulty: 'easy', company: 'Verification Fixture', type: 'Technical'
  }, authToken);
  if (isProviderFailure(generatedInterview)) {
    skip('Mock interview questions use configured-provider output',
      `Provider returned ${generatedInterview.body.code}; curated session fallback is tested separately.`);
  } else {
    test('Mock interview questions use configured-provider output',
      generatedInterview.status === 200 && generatedInterview.body.source === 'openrouter' &&
      generatedInterview.body.model && generatedInterview.body.questions?.length === 5,
      `Status: ${generatedInterview.status}, source: ${generatedInterview.body.source || generatedInterview.body.code || 'none'}`);
  }

  const protectedProfileMutation = await req('PUT', '/api/career/profile', {
    xp: 999999,
    role: 'admin',
    careerReadinessScore: 100
  }, authToken);
  test('Profile updates reject progression and authorization fields',
    protectedProfileMutation.status === 400,
    `Status: ${protectedProfileMutation.status}`);

  const assessmentQuestions = await req('GET', '/api/career/assessment/questions', null, authToken);
  test('Legacy assessment questions endpoint cannot return curated demo questions',
    assessmentQuestions.status === 410 &&
    assessmentQuestions.body.code === 'ASSESSMENT_SESSION_REQUIRED',
    `Status: ${assessmentQuestions.status}, code: ${assessmentQuestions.body.code || 'none'}`);
  const anonymousAssessmentStart = await req('POST', '/api/career/assessment/start', {
    category: 'Mixed', difficulty: 'medium', count: 5
  });
  test('Assessment session start requires authentication',
    anonymousAssessmentStart.status === 401,
    `Status: ${anonymousAssessmentStart.status}`);
  const invalidAssessmentStart = await req('POST', '/api/career/assessment/start', {
    category: 'Invented category', difficulty: 'medium', count: 5
  }, authToken);
  test('Assessment session start validates configuration',
    invalidAssessmentStart.status === 400,
    `Status: ${invalidAssessmentStart.status}`);
  const assessmentOptions = await req('GET', '/api/career/assessment/options', null, authToken);
  const requestedAssessmentTopics = [
    'Quantitative aptitude', 'Logical reasoning', 'Verbal ability',
    'Programming fundamentals', 'Data structures and algorithms',
    'Object-oriented programming', 'DBMS and SQL', 'Operating systems',
    'Computer networks', 'Software engineering and system design',
    'AI/ML and role-specific technical topics'
  ];
  test('Assessment advertises the supported generation topics',
    assessmentOptions.status === 200 &&
    assessmentOptions.body.source === 'openrouter' &&
    requestedAssessmentTopics.every(topic => assessmentOptions.body.categories.includes(topic)),
    `Topics: ${assessmentOptions.body.categories?.length || 0}`);
  const startedAssessment = await req('POST', '/api/career/assessment/start', {
    category: 'Mixed', difficulty: 'medium', count: 5
  }, authToken);
  if (isProviderFailure(startedAssessment)) {
    skip('Assessment session generates real OpenRouter questions without answer keys',
      `OpenRouter returned ${startedAssessment.body.code}; demo questions were not substituted.`);
  } else {
    test('Assessment session generates OpenRouter questions without answer keys',
      startedAssessment.status === 201 &&
      startedAssessment.body.targetRole === 'AI/ML Engineer' &&
      startedAssessment.body.questions?.length === 5 &&
      startedAssessment.body.source === 'openrouter' &&
      startedAssessment.body.questions.every(question =>
        !('answerIndex' in question) && !('explanation' in question) && !('correctAnswer' in question)),
      `Status: ${startedAssessment.status}, source: ${startedAssessment.body.source || startedAssessment.body.code || 'none'}`);
  }
  if (startedAssessment.status === 201 && startedAssessment.body.source === 'openrouter') {
    pendingAssessmentSession = startedAssessment.body;
  }
  const missingSessionAssessment = await req('POST', '/api/career/assessment/submit', {
    answers: ['A']
  }, authToken);
  test('Assessment submissions require a generated session',
    missingSessionAssessment.status === 400 &&
    missingSessionAssessment.body.code === 'ASSESSMENT_SESSION_REQUIRED',
    `Status: ${missingSessionAssessment.status}, code: ${missingSessionAssessment.body.code || 'none'}`);
  let assessmentSubmit = null;
  let latestAssessment = null;
  if (pendingAssessmentSession) {
    const sessionId = pendingAssessmentSession.sessionId;
    const sessionAnswers = pendingAssessmentSession.questions.map(question => ({
      questionId: question.id,
      answer: question.options[0]
    }));
    const invalidAssessment = await req('POST', '/api/career/assessment/submit', {
      sessionId,
      answers: sessionAnswers.slice(1)
    }, authToken);
    test('Assessment rejects incomplete answer sets',
      invalidAssessment.status === 400,
      `Status: ${invalidAssessment.status}`);
    const mismatchedAssessmentRole = await req('POST', '/api/career/assessment/submit', {
      sessionId,
      answers: sessionAnswers,
      targetRole: 'Data Analyst'
    }, authToken);
    test('Assessment rejects a role that differs from the saved profile role',
      mismatchedAssessmentRole.status === 409 &&
      mismatchedAssessmentRole.body.code === 'TARGET_ROLE_CHANGED',
      `Status: ${mismatchedAssessmentRole.status}`);
    const reorderedAssessment = await req('POST', '/api/career/assessment/submit', {
      sessionId,
      answers: sessionAnswers.slice().reverse(),
      targetRole: 'AI/ML Engineer'
    }, authToken);
    test('Assessment rejects answers detached from their original question order',
      reorderedAssessment.status === 400,
      `Status: ${reorderedAssessment.status}`);
    assessmentSubmit = await req('POST', '/api/career/assessment/submit', {
      sessionId,
      answers: sessionAnswers,
      targetRole: 'AI/ML Engineer'
    }, authToken);
    const profileAfterAssessment = await req('GET', '/api/career/profile', null, authToken);
    test('Assessment uses the saved profile role captured at session start',
      assessmentSubmit.status === 200 &&
      assessmentSubmit.body.targetRole === 'AI/ML Engineer' &&
      typeof assessmentSubmit.body.sessionId === 'string' &&
      profileAfterAssessment.body.user?.targetRole === 'AI/ML Engineer',
      `Assessment role: ${assessmentSubmit.body.targetRole || 'none'}, saved role: ${profileAfterAssessment.body.user?.targetRole || 'none'}`);
    latestAssessment = await req('GET', '/api/career/assessment/latest', null, authToken);
    test('Assessment results persist and can be retrieved',
      assessmentSubmit.status === 200 && latestAssessment.status === 200 &&
      latestAssessment.body.assessmentCompleted === true &&
      latestAssessment.body.overallReadiness === assessmentSubmit.body.overallReadiness &&
      latestAssessment.body.assessment?.sessionId === assessmentSubmit.body.sessionId &&
      latestAssessment.body.assessment?.detailedAnswers?.every((answer, index) => answer.questionId === index + 1),
      `Saved readiness: ${latestAssessment.body.overallReadiness}`);
    if (isAdviceUnavailable(assessmentSubmit.body.aiInsightsStatus)) {
      skip('Assessment insight route consumes validated OpenRouter output',
        `Provider status: ${assessmentSubmit.body.aiInsightsStatus.status}, code: ${assessmentSubmit.body.aiInsightsStatus.code || 'not configured'}.`);
    } else {
      test('Assessment insight route consumes validated OpenRouter output',
        assessmentSubmit.body.aiInsightsStatus?.status === 'generated' &&
        assessmentSubmit.body.aiInsights?.source === 'openrouter' &&
        assessmentSubmit.body.aiInsights?.model,
        `AI status: ${assessmentSubmit.body.aiInsightsStatus?.status || 'none'}, code: ${assessmentSubmit.body.aiInsightsStatus?.code || 'none'}`);
    }
  } else {
    skip('Assessment session scoring and persistence use OpenRouter-generated questions',
      `No session could be generated: ${startedAssessment.body.code || 'provider unavailable'}.`);
    latestAssessment = await req('GET', '/api/career/assessment/latest', null, authToken);
  }
  const overview = await req('GET', '/api/career/overview', null, authToken);
  if (assessmentSubmit) {
    test('Dashboard overview uses the latest persisted assessment score',
      overview.status === 200 &&
      overview.body.readinessScore === latestAssessment.body.overallReadiness,
      `Overview readiness: ${overview.body.readinessScore}`);
  } else {
    skip('Dashboard overview reflects the latest assessment score',
      'No OpenRouter-generated assessment could be submitted.');
  }

  // TEST 4: Career recommendations use actual profile
  const recoRes = await req('GET', '/api/career/recommendations', null, authToken);
  const recos = recoRes.body.recommendations || (Array.isArray(recoRes.body) ? recoRes.body : []);
  if (isProviderFailure(recoRes)) {
    skip('Career recommendations are returned with OpenRouter-generated explanations',
      `Provider returned ${recoRes.body.code}; no recommendations were claimed as generated.`);
  } else {
    test('TEST 4: Career recommendations computed from real profile',
      recoRes.status === 200 && recos.length > 0, `Got ${recos.length} recommendations`);
  }
  if (isProviderFailure(recoRes) || isAdviceUnavailable(recoRes.body.aiAdviceStatus)) {
    skip('Career recommendations include validated OpenRouter explanations',
      `Provider status: ${recoRes.body.aiAdviceStatus?.status || 'unavailable'}, code: ${recoRes.body.code || recoRes.body.aiAdviceStatus?.code || 'not configured'}.`);
  } else {
    test('Career recommendations include validated OpenRouter explanations',
      recoRes.body.aiAdviceStatus?.status === 'generated' &&
      recos.some(item => item.explanationSource === 'openrouter' && item.aiExplanation),
      `AI status: ${recoRes.body.aiAdviceStatus?.status || 'none'}, code: ${recoRes.body.aiAdviceStatus?.code || 'none'}`);
  }
  if (recos.length > 0) {
    // AI/ML Engineer should rank high since we set those skills
    const aimlRank = recos.findIndex(r => r.role === 'AI/ML Engineer');
    test('TEST 4b: AI/ML Engineer ranks well with ML skills',
      aimlRank >= 0 && aimlRank <= 2,
      `AI/ML rank: #${aimlRank + 1}, Score: ${recos[aimlRank]?.matchScore}%`);
  }

  // TEST 5: Skill gap analysis returns role requirements
  const gapRes = await req('GET', '/api/career/skill-gap', null, authToken);
  if (isProviderFailure(gapRes)) {
    skip('Skill gap analysis is returned with validated OpenRouter guidance',
      `Provider returned ${gapRes.body.code}; no analysis was fabricated.`);
  } else {
    test('TEST 5: Skill gap analysis returns structured data',
      gapRes.status === 200 && typeof gapRes.body.analysisId === 'string',
      `Status: ${gapRes.status}`);
  }
  if (isProviderFailure(gapRes) || isAdviceUnavailable(gapRes.body.aiAdviceStatus)) {
    skip('Skill-gap route consumes validated OpenRouter guidance',
      `Provider status: ${gapRes.body.aiAdviceStatus?.status || 'unavailable'}, code: ${gapRes.body.code || gapRes.body.aiAdviceStatus?.code || 'not configured'}.`);
  } else {
    test('Skill-gap route consumes validated OpenRouter guidance',
      gapRes.body.aiAdviceStatus?.status === 'generated' &&
      gapRes.body.aiAdviceStatus?.source === 'openrouter' &&
      Array.isArray(gapRes.body.aiInsights),
      `AI status: ${gapRes.body.aiAdviceStatus?.status || 'none'}, code: ${gapRes.body.aiAdviceStatus?.code || 'none'}`);
  }
  const resourceRecs = await req('GET', '/api/career/resources/recommendations', null, authToken);
  if (isProviderFailure(resourceRecs)) {
    skip('Learning-resource recommendations come from the verified catalog',
      `Provider returned ${resourceRecs.body.code}.`);
  } else {
    test('Learning-resource recommendations come from the verified catalog',
      resourceRecs.status === 200 && resourceRecs.body.source === 'openrouter' &&
      resourceRecs.body.model && Array.isArray(resourceRecs.body.resources) &&
      resourceRecs.body.resources.every(item => /^https:\/\/(developer\.mozilla\.org|react\.dev|nodejs\.org|www\.mongodb\.com|docs\.python\.org|leetcode\.com|www\.hackerrank\.com|github\.com|docs\.github\.com|www\.careeronestop\.org)\//.test(item.url)),
      `Status: ${resourceRecs.status}, source: ${resourceRecs.body.source || 'none'}, code: ${resourceRecs.body.code || 'none'}, model: ${resourceRecs.body.model || 'none'}, resourceCount: ${resourceRecs.body.resources?.length ?? 'none'}`);
  }
  const gapHistory = await req('GET', '/api/career/skill-gap/history', null, authToken);
  if (isProviderFailure(gapRes)) {
    skip('Skill-gap analysis is persisted and retrievable for its owner',
      'No analysis was saved because OpenRouter generation was unavailable.');
  } else {
    test('Skill-gap analysis is persisted and retrievable for its owner',
      gapHistory.status === 200 && gapHistory.body.analyses.some(item => item.targetRole === gapRes.body.targetRole),
      `Saved analyses: ${gapHistory.body.analyses?.length || 0}`);
  }

  // TEST 6: Job opportunities load with computed match scores
  const jobsRes = await req('GET', '/api/career/opportunities', null, authToken);
  const opps = jobsRes.body.opportunities || (Array.isArray(jobsRes.body) ? jobsRes.body : []);
  test('TEST 6: Opportunities load successfully',
    jobsRes.status === 200 && opps.length > 0, `Got ${opps.length} jobs`);
  test('Jobs are fetched from the attributed provider feed',
    jobsRes.status === 200 &&
    jobsRes.body.dataSource === 'live_api' &&
    jobsRes.body.source === 'Arbeitnow Job Board API' &&
    Array.isArray(opps) && opps.every(job => job.organization && job.title && job.location && job.type &&
      job.source === 'Arbeitnow Job Board API' &&
      /^https:\/\/(www\.)?arbeitnow\.(com|co\.uk)\//.test(job.applicationLink)),
    `Source: ${jobsRes.body.source}, valid listings: ${opps.length}`);
  if (opps.length > 0) {
    test('TEST 6b: Jobs have computed match scores', opps[0].overallMatch !== undefined,
      `First match: ${opps[0].overallMatch}%`);
    const jobFit = await req('POST', '/api/career/opportunities/explanation', {
      jobId: opps[0].id
    }, authToken);
    if (isProviderFailure(jobFit)) {
      skip('Live listing fit explanation uses source facts and OpenRouter',
        `Provider returned ${jobFit.body.code}.`);
    } else {
      test('Live listing fit explanation uses source facts and OpenRouter',
        jobFit.status === 200 && jobFit.body.source === 'openrouter' &&
        jobFit.body.model && typeof jobFit.body.explanation === 'string' &&
        jobFit.body.applicationLink === opps[0].applicationLink,
        `Status: ${jobFit.status}, source: ${jobFit.body.source || jobFit.body.code || 'none'}`);
    }
    const searchedJobs = await req('GET',
      `/api/career/opportunities?search=${encodeURIComponent(opps[0].title)}`, null, authToken);
    test('Job search filters live listings',
      searchedJobs.status === 200 && searchedJobs.body.opportunities.some(job => job.id === opps[0].id),
      `Search result count: ${searchedJobs.body.opportunities?.length || 0}`);

    const emptyJobs = await req('GET', '/api/career/opportunities?type=competition', null, authToken);
    test('Empty live provider filters return an empty result',
      emptyJobs.status === 200 && emptyJobs.body.dataSource === 'live_api' &&
      Array.isArray(emptyJobs.body.opportunities) && emptyJobs.body.opportunities.length === 0,
      `Status: ${emptyJobs.status}, results: ${emptyJobs.body.opportunities?.length}`);

    const trackedJob = opps[0];
    const trackedResponse = await req('POST', '/api/career/applications', {
      company: trackedJob.organization,
      jobRole: trackedJob.title,
      jobId: trackedJob.id,
      sourceUrl: trackedJob.applicationLink,
      source: trackedJob.source,
      type: trackedJob.type,
      location: trackedJob.location,
      status: 'Saved',
      matchPercentage: trackedJob.overallMatch,
      notes: 'Saved from live Job Matching integration test.'
    }, authToken);
    test('A provider job is saved with Saved status and source attribution',
      trackedResponse.status === 201 &&
      trackedResponse.body.application.status === 'Saved' &&
      trackedResponse.body.application.sourceUrl === trackedJob.applicationLink &&
      trackedResponse.body.application.source === trackedJob.source,
      `Status: ${trackedResponse.status}, pipeline status: ${trackedResponse.body.application?.status}`);

    const duplicateJob = await req('POST', '/api/career/applications', {
      company: trackedJob.organization,
      jobRole: trackedJob.title,
      jobId: trackedJob.id,
      sourceUrl: trackedJob.applicationLink,
      source: trackedJob.source,
      status: 'Saved'
    }, authToken);
    test('Duplicate live job tracking is rejected',
      duplicateJob.status === 409 && duplicateJob.body.duplicate,
      `Status: ${duplicateJob.status}`);

    const invalidUrl = await req('POST', '/api/career/applications', {
      company: 'URL Validation Test',
      jobRole: 'URL Validation',
      sourceUrl: 'javascript:alert(1)',
      status: 'Saved'
    }, authToken);
    test('Unsafe job source URLs are rejected',
      invalidUrl.status === 400,
      `Status: ${invalidUrl.status}`);

    const retrievedJob = await req('GET', '/api/career/applications', null, authToken);
    const retrieved = (retrievedJob.body.applications || []).find(app => app.jobId === trackedJob.id);
    test('Tracked provider job survives retrieval from the application tracker',
      retrievedJob.status === 200 && retrieved?.status === 'Saved' &&
      retrieved?.sourceUrl === trackedJob.applicationLink,
      `Retrieved: ${!!retrieved}, status: ${retrieved?.status}`);
  }
  const unauthJobs = await req('GET', '/api/career/opportunities');
  test('Live job feed rejects unauthenticated requests', unauthJobs.status === 401,
    `Status: ${unauthJobs.status}`);

  // TEST 7: Apply creates exactly one application
  const applyRes = await req('POST', '/api/career/applications', {
    company: 'TestCo Corp', jobRole: 'Junior ML Engineer',
    status: 'Application Started', matchPercentage: 72,
    notes: 'Applied via test suite', applicationMethod: 'external'
  }, authToken);
  test('TEST 7: Apply creates application record',
    applyRes.status === 200 || applyRes.status === 201,
    `Status: ${applyRes.status}`);
  testAppId = applyRes.body?.application?._id || applyRes.body?.application?.id || '';

  // TEST 8: My Applications shows the record immediately
  const appsRes = await req('GET', '/api/career/applications', null, authToken);
  const apps = appsRes.body.applications || (Array.isArray(appsRes.body) ? appsRes.body : []);
  const foundApp = apps.find(a => a.company === 'TestCo Corp');
  test('TEST 8: Application visible immediately', !!foundApp,
    `Found: ${!!foundApp}, Total: ${apps.length}`);

  // TEST 9: Persists on second fetch
  const appsRes2 = await req('GET', '/api/career/applications', null, authToken);
  const apps2 = appsRes2.body.applications || (Array.isArray(appsRes2.body) ? appsRes2.body : []);
  test('TEST 9: Application persists on subsequent fetch',
    apps2.some(a => a.company === 'TestCo Corp'), `Count: ${apps2.length}`);

  // TEST 11: Duplicate application prevented
  const dupAppRes = await req('POST', '/api/career/applications', {
    company: 'TestCo Corp', jobRole: 'Junior ML Engineer', status: 'Applied'
  }, authToken);
  test('TEST 11: Duplicate application prevented',
    dupAppRes.status === 409 && dupAppRes.body.duplicate === true,
    `Status: ${dupAppRes.status}, Dup flag: ${dupAppRes.body?.duplicate}`);

  // TEST 12: Status change persists
  if (testAppId) {
    const statusRes = await req('PUT', `/api/career/applications/${testAppId}`, {
      status: 'Interview'
    }, authToken);
    test('TEST 12a: Status update accepted', statusRes.status === 200, `Status: ${statusRes.status}`);

    const va = (await req('GET', '/api/career/applications', null, authToken));
    const va2 = va.body.applications || (Array.isArray(va.body) ? va.body : []);
    const updated = va2.find(a => a.company === 'TestCo Corp');
    test('TEST 12b: Status change persists',
      updated?.status === 'Interview', `Status after update: ${updated?.status}`);
  } else {
    test('TEST 12a: Status change (skipped â€” no app ID)', false, '');
    test('TEST 12b: Status persistence (skipped)', false, '');
  }

  // TEST 13: Student isolation
  const studentBEmail = `studentB_${Date.now()}@test.com`;
  await req('POST', '/api/auth/register', { name: 'Student B', email: studentBEmail, password: 'student-pass-123' });
  const bLogin = await req('POST', '/api/auth/login', { email: studentBEmail, password: 'student-pass-123' });
  studentBToken = bLogin.body.token || '';
  const ownerProfileForChallenge = await req('GET', '/api/career/profile', null, authToken);
  const secondProfileForChallenge = await req('GET', '/api/career/profile', null, studentBToken);
  const challengeOwnerId = String(ownerProfileForChallenge.body.user?._id);
  const secondUserId = String(secondProfileForChallenge.body.user?._id);
  const challengeId = `reverse-string-mongo-${crypto.randomUUID()}`;
  await withTestMongo(async () => {
    const ownerBefore = await User.findById(challengeOwnerId);
    const secondBefore = await User.findById(secondUserId);
    const award = () => submitChallengeAnswer(
      challengeOwnerId,
      { id: challengeId, type: 'coding' },
      'function solution(str) {}',
      async () => ({ allPassed: true })
    );
    const awardResults = await Promise.all([award(), award()]);
    const ownerAfter = await User.findById(challengeOwnerId);
    const secondAfter = await User.findById(secondUserId);
    test('MongoDB awards challenge XP once and keeps the completion owner-scoped',
      awardResults.filter(result => !result.alreadyCompleted).length === 1 &&
      Number(ownerAfter.xp) - Number(ownerBefore.xp || 0) === XP_PER_CHALLENGE &&
      ownerAfter.completedChallengeIds.includes(challengeId) &&
      Number(secondAfter.xp || 0) === Number(secondBefore.xp || 0) &&
      !secondAfter.completedChallengeIds.includes(challengeId),
      `Owner XP delta: ${Number(ownerAfter.xp) - Number(ownerBefore.xp || 0)}, second-user XP delta: ${Number(secondAfter.xp || 0) - Number(secondBefore.xp || 0)}`);
  });
  const emptyLatestAssessment = await req('GET', '/api/career/assessment/latest', null, studentBToken);
  test('Latest assessment uses the stable envelope when no assessment exists',
    emptyLatestAssessment.status === 200 &&
    emptyLatestAssessment.body.assessment === null &&
    emptyLatestAssessment.body.assessmentCompleted === false &&
    Number.isFinite(emptyLatestAssessment.body.overallReadiness),
    `Status: ${emptyLatestAssessment.status}, completed: ${emptyLatestAssessment.body.assessmentCompleted}`);
  if (pendingAssessmentSession && studentBToken) {
    const sessionAnswers = pendingAssessmentSession.questions.map(question => ({
      questionId: question.id,
      answer: 'A'
    }));
    const crossUserSubmission = await req('POST', '/api/career/assessment/submit', {
      sessionId: pendingAssessmentSession.sessionId,
      answers: sessionAnswers
    }, studentBToken);
    test('Another account cannot submit an assessment session it does not own',
      crossUserSubmission.status === 404,
      `Status: ${crossUserSubmission.status}`);
    const sessionSubmission = await req('POST', '/api/career/assessment/submit', {
      sessionId: pendingAssessmentSession.sessionId,
      answers: sessionAnswers
    }, authToken);
    test('Assessment session scores and persists submitted answers',
      sessionSubmission.status === 200 &&
      sessionSubmission.body.sessionId === pendingAssessmentSession.sessionId &&
      sessionSubmission.body.generationSource === pendingAssessmentSession.source &&
      sessionSubmission.body.breakdown?.length === pendingAssessmentSession.questions.length &&
      Number.isFinite(sessionSubmission.body.overallReadiness),
      `Status: ${sessionSubmission.status}, score: ${sessionSubmission.body.overallReadiness ?? 'none'}`);
    const duplicateSessionSubmission = await req('POST', '/api/career/assessment/submit', {
      sessionId: pendingAssessmentSession.sessionId,
      answers: sessionAnswers
    }, authToken);
    test('Completed assessment sessions cannot be submitted twice',
      duplicateSessionSubmission.status === 404,
      `Status: ${duplicateSessionSubmission.status}`);
  }
  const bNoRoleGap = await req('GET', '/api/career/skill-gap', null, studentBToken);
  const bNoRoleRoadmap = await req('GET', '/api/career/roadmap', null, studentBToken);
  const bNoRoleDailyPlan = await req('GET', '/api/career/daily-plan', null, studentBToken);
  const bNoRoleInterview = await req('POST', '/api/interview/session/start', {
    mode: 'mcq',
    topic: 'Mixed',
    difficulty: 'medium',
    sessionLength: 3
  }, studentBToken);
  const bNoRoleResume = await req('POST', '/api/resume/analyze-text', {
    resumeText: 'A short resume with programming and project work.'
  }, studentBToken);
  test('Personalized features request a target role instead of assuming one',
    bNoRoleGap.status === 409 && bNoRoleGap.body.code === 'TARGET_ROLE_REQUIRED' &&
    bNoRoleRoadmap.status === 409 && bNoRoleDailyPlan.status === 409 &&
    bNoRoleInterview.status === 409 && bNoRoleResume.status === 409,
    `Skill gap=${bNoRoleGap.status}, roadmap=${bNoRoleRoadmap.status}, daily plan=${bNoRoleDailyPlan.status}, interview=${bNoRoleInterview.status}, resume=${bNoRoleResume.status}`);
  const mcqSession = await req('POST', '/api/interview/session/start', {
    role: 'Backend Engineer',
    topic: 'Mixed',
    difficulty: 'medium',
    mode: 'mcq',
    sessionLength: 3
  }, authToken);
  if (isProviderFailure(mcqSession)) {
    skip('MCQ session returns OpenRouter-attributed questions without exposing keys',
      `OpenRouter returned ${mcqSession.body.code}; curated questions were not substituted.`);
  } else {
    test('MCQ session returns OpenRouter-attributed questions without exposing keys',
      mcqSession.status === 201 &&
      mcqSession.body.generationSource === 'openrouter' &&
      mcqSession.body.questions?.length === 3 &&
      mcqSession.body.questions.every(question =>
        question.source === 'openrouter' && question.options?.length === 4 &&
        !('answerIndex' in question) && !('explanation' in question)),
      `Status: ${mcqSession.status}, source: ${mcqSession.body.generationSource || 'none'}`);
  }
  if (mcqSession.status === 201) {
    const crossUserSubmit = await req('POST', `/api/interview/session/${mcqSession.body.sessionId}/submit`, {
      answers: [0, 1, 2]
    }, studentBToken);
    test('MCQ sessions cannot be submitted by another account',
      crossUserSubmit.status === 404, `Status: ${crossUserSubmit.status}`);
    const invalidMcq = await req('POST', `/api/interview/session/${mcqSession.body.sessionId}/submit`, {
      answers: [0, 1, 4]
    }, authToken);
    test('MCQ submission validates answer indexes',
      invalidMcq.status === 400, `Status: ${invalidMcq.status}`);
    const submittedMcq = await req('POST', `/api/interview/session/${mcqSession.body.sessionId}/submit`, {
      answers: [0, 1, 2]
    }, authToken);
    test('MCQ scoring is deterministic and answer review is returned only after submission',
      submittedMcq.status === 200 &&
      Number.isFinite(submittedMcq.body.score) &&
      submittedMcq.body.review?.length === 3 &&
      submittedMcq.body.review.every(item =>
        Number.isInteger(item.correctIndex) && typeof item.explanation === 'string') &&
      Array.isArray(submittedMcq.body.topicPerformance),
      `Status: ${submittedMcq.status}, score: ${submittedMcq.body.score}`);
    const replayMcq = await req('POST', `/api/interview/session/${mcqSession.body.sessionId}/submit`, {
      answers: [0, 1, 2]
    }, authToken);
    test('MCQ result cannot be replayed for duplicate XP',
      replayMcq.status === 404, `Status: ${replayMcq.status}`);
  }
  const curatedVoiceSession = await req('POST', '/api/interview/session/start', {
    role: 'Backend Engineer',
    topic: 'Behavioral',
    difficulty: 'medium',
    mode: 'voice',
    sessionLength: 1
  }, authToken);
  if (isProviderFailure(curatedVoiceSession) && curatedVoiceSession.body.sessionId) {
    const retryVoiceQuestion = await req(
      'POST',
      `/api/interview/session/${curatedVoiceSession.body.sessionId}/retry-question`,
      {},
      authToken
    );
    const crossUserRetryVoice = await req(
      'POST',
      `/api/interview/session/${curatedVoiceSession.body.sessionId}/retry-question`,
      {},
      studentBToken
    );
    test('Voice session remains owner-scoped and retryable after provider failure',
      isProviderFailure(retryVoiceQuestion) &&
      retryVoiceQuestion.status === curatedVoiceSession.status &&
      crossUserRetryVoice.status === 404 &&
      curatedVoiceSession.body.role === 'Backend Engineer',
      `Initial and retry provider codes: ${curatedVoiceSession.body.code}, ${retryVoiceQuestion.body.code}`);
    skip('Runtime voice question generation requires a configured model provider',
      `Provider returned ${curatedVoiceSession.body.code}; no curated question was substituted.`);
  } else {
    test('Voice practice starts with one runtime-generated question',
      curatedVoiceSession.status === 201 &&
      curatedVoiceSession.body.generationSource === 'openrouter' &&
      curatedVoiceSession.body.sessionLength === 1 &&
      curatedVoiceSession.body.questions?.length === 1 &&
      curatedVoiceSession.body.questions.every(question => question.topic === 'Behavioral') &&
      curatedVoiceSession.body.questions.every(question => question.source === curatedVoiceSession.body.generationSource),
      `Status: ${curatedVoiceSession.status}, source: ${curatedVoiceSession.body.generationSource || curatedVoiceSession.body.code || 'none'}`);
  }
  const insufficientCuratedSession = await req('POST', '/api/interview/session/start', {
    role: 'Backend Engineer',
    topic: 'Behavioral',
    difficulty: 'medium',
    mode: 'mcq',
    sessionLength: 3
  }, authToken);
  const curatedPoolRespected = (insufficientCuratedSession.status === 422 &&
    insufficientCuratedSession.body.code === 'CURATED_QUESTION_POOL_TOO_SMALL' &&
    insufficientCuratedSession.body.message.includes('1 matching question')) ||
    (insufficientCuratedSession.status === 201 &&
      insufficientCuratedSession.body.generationSource === 'openrouter' &&
      insufficientCuratedSession.body.questions?.length === 3 &&
      insufficientCuratedSession.body.questions.every(question => question.topic === 'Behavioral'));
  if (isProviderFailure(insufficientCuratedSession)) {
    skip('Interview MCQ does not substitute curated questions when OpenRouter is unavailable',
      `OpenRouter returned ${insufficientCuratedSession.body.code}.`);
  } else {
    test('Selected topic is maintained by OpenRouter output',
      curatedPoolRespected,
      `Status: ${insufficientCuratedSession.status}, source: ${insufficientCuratedSession.body.generationSource || 'none'}, code: ${insufficientCuratedSession.body.code || 'none'}`);
  }
  const videoSession = await req('POST', '/api/interview/session/start', {
    role: 'Frontend Engineer',
    topic: 'Mixed',
    difficulty: 'easy',
    mode: 'video',
    sessionLength: 3
  }, authToken);
  if (isProviderFailure(videoSession) && videoSession.body.sessionId) {
    skip('Video session runtime question generation requires a configured model provider',
      `Provider returned ${videoSession.body.code}; session ${videoSession.body.sessionId} remains retryable.`);
  } else {
    test('Video practice starts with one runtime-generated question and does not upload media',
      videoSession.status === 201 &&
      videoSession.body.mode === 'video' &&
      videoSession.body.sessionLength === 3 &&
      videoSession.body.questions?.length === 1 &&
      videoSession.body.questions.every(question => question.source === videoSession.body.generationSource),
      `Status: ${videoSession.status}, source: ${videoSession.body.generationSource || videoSession.body.code || 'none'}`);
  }
  const forgedInterviewSave = await req('POST', '/api/interview/save', {
    role: 'Backend Engineer',
    difficulty: 'medium',
    totalScore: 100,
    answers: [{ question: 'Forged', answer: 'Forged', score: 100 }]
  }, authToken);
  test('Client-submitted interview scores are rejected',
    forgedInterviewSave.status === 410,
    `Status: ${forgedInterviewSave.status}`);
  const bGapHistory = await req('GET', '/api/career/skill-gap/history', null, studentBToken);
  test('Another account cannot read saved skill-gap analyses',
    bGapHistory.status === 200 && bGapHistory.body.analyses.length === 0,
    `Other user analyses: ${bGapHistory.body.analyses?.length || 0}`);
  const bResumeHistory = await req('GET', '/api/resume/history', null, studentBToken);
  test('Another account cannot read saved resume analyses',
    bResumeHistory.status === 200 && bResumeHistory.body.analyses.length === 0,
    `Other user analyses: ${bResumeHistory.body.analyses?.length || 0}`);
  const cSkillProfile = await req('PUT', '/api/career/profile', {
    technicalSkills: ['C'],
    targetRole: 'Data Analyst'
  }, studentBToken);
  const cDefaultSkillGap = await req('GET', '/api/career/skill-gap', null, studentBToken);
  const cOverview = await req('GET', '/api/career/overview', null, studentBToken);
  const cReadiness = await req('GET', '/api/career/readiness', null, studentBToken);
  const cAnalytics = await req('GET', '/api/career/analytics/history', null, studentBToken);
  test('Changing the saved target role is reflected in profile-derived career data',
    cSkillProfile.status === 200 &&
    cOverview.body.candidate?.targetRole === 'Data Analyst' &&
    cReadiness.body.user?.targetRole === 'Data Analyst' &&
    cAnalytics.body.user?.targetRole === 'Data Analyst',
    `Skill-gap status=${cDefaultSkillGap.status}, overview=${cOverview.body.candidate?.targetRole}, readiness=${cReadiness.body.user?.targetRole}, analytics=${cAnalytics.body.user?.targetRole}`);
  test('Skill gap analysis reflects the saved target role without requiring AI guidance',
    cDefaultSkillGap.status === 200 &&
    cDefaultSkillGap.body.targetRole === 'Data Analyst' &&
    Array.isArray(cDefaultSkillGap.body.matchedSkills) &&
    Array.isArray(cDefaultSkillGap.body.missingSkills) &&
    ['generated', 'unavailable'].includes(cDefaultSkillGap.body.aiAdviceStatus?.status),
    `Status: ${cDefaultSkillGap.status}, role: ${cDefaultSkillGap.body.targetRole || 'none'}, guidance: ${cDefaultSkillGap.body.aiAdviceStatus?.status || 'none'}`);
  const cSkillGap = await req('GET', '/api/career/skill-gap?role=Full%20Stack%20Developer', null, studentBToken);
  test('Skill-gap matching does not treat a single character as every skill',
    cSkillProfile.status === 200 && cSkillGap.status === 200 &&
    cSkillGap.body.matchedSkills.length === 0 &&
    cSkillGap.body.methodology.includes('self-reported') &&
    ['generated', 'unavailable'].includes(cSkillGap.body.aiAdviceStatus?.status),
    `Status: ${cSkillGap.status}, matched: ${cSkillGap.body.matchedSkills?.length || 0}, guidance: ${cSkillGap.body.aiAdviceStatus?.status || 'none'}`);
  const cRecommendations = await req('GET', '/api/career/recommendations', null, studentBToken);
  const softwareRecommendation = (cRecommendations.body.recommendations || [])
    .find(item => item.role === 'Software Developer');
  if (isProviderFailure(cRecommendations)) {
    skip('Career recommendations do not infer C++ from a profile skill named C',
      `OpenRouter returned ${cRecommendations.body.code}; recommendations were not returned.`);
  } else {
    test('Career recommendations do not infer C++ from a profile skill named C',
      cRecommendations.status === 200 &&
      softwareRecommendation?.matchedSkills.every(skill => skill !== 'C++') &&
      cRecommendations.body.methodology.includes('self-reported'),
      `Software Developer matched skills: ${softwareRecommendation?.matchedSkills.join(', ') || 'none'}`);
  }
  const cAnalyzer = await req('POST', '/api/career/job-analyzer', {
    jobDescription: 'C# and React are required for the role.'
  }, studentBToken);
  if (isProviderFailure(cAnalyzer)) {
    skip('Job analyzer does not infer React or C# from a profile skill named C',
      `OpenRouter returned ${cAnalyzer.body.code}; analysis was not returned.`);
  } else {
    test('Job analyzer does not infer React or C# from a profile skill named C',
      cAnalyzer.status === 200 && cAnalyzer.body.overallMatch === 0 &&
      cAnalyzer.body.matchedSkills.length === 0,
      `Match: ${cAnalyzer.body.overallMatch}, matched: ${cAnalyzer.body.matchedSkills?.length || 0}`);
  }
  if (isProviderFailure(cAnalyzer) || isAdviceUnavailable(cAnalyzer.body.aiAdviceStatus)) {
    skip('Job Description Analyzer consumes OpenRouter advice',
      `Provider status: ${cAnalyzer.body.aiAdviceStatus?.status || 'unavailable'}, code: ${cAnalyzer.body.code || cAnalyzer.body.aiAdviceStatus?.code || 'not configured'}.`);
  } else {
    test('Job Description Analyzer consumes OpenRouter advice',
      cAnalyzer.body.aiAdviceStatus?.status === 'generated' &&
      cAnalyzer.body.aiAdviceStatus?.source === 'openrouter' &&
      cAnalyzer.body.aiSummary,
      `AI status: ${cAnalyzer.body.aiAdviceStatus?.status || 'none'}, code: ${cAnalyzer.body.aiAdviceStatus?.code || 'none'}`);
  }
  const nonTechnicalAnalyzer = await req('POST', '/api/career/job-analyzer', {
    jobDescription: 'Collaborate with stakeholders and communicate project updates.'
  }, studentBToken);
  if (isProviderFailure(nonTechnicalAnalyzer)) {
    skip('Job analyzer reports no score when no catalog requirements are detected',
      `OpenRouter returned ${nonTechnicalAnalyzer.body.code}; no analysis was returned.`);
  } else {
    test('Job analyzer reports no score when no catalog requirements are detected',
      nonTechnicalAnalyzer.status === 200 && nonTechnicalAnalyzer.body.overallMatch === null,
      `Match: ${nonTechnicalAnalyzer.body.overallMatch}`);
  }
  const invalidAnalyzerInput = await req('POST', '/api/career/job-analyzer', {
    jobDescription: { not: 'text' }
  }, studentBToken);
  test('Job analyzer validates non-text job descriptions',
    invalidAnalyzerInput.status === 400,
    `Status: ${invalidAnalyzerInput.status}`);
  const ownerProfileAfterOtherUpdate = await req('GET', '/api/career/profile', null, authToken);
  test('A profile update stays scoped to the authenticated account',
    ownerProfileAfterOtherUpdate.status === 200 &&
    ownerProfileAfterOtherUpdate.body.user.targetRole === 'AI/ML Engineer',
    `Owner target role: ${ownerProfileAfterOtherUpdate.body.user?.targetRole}`);
  const exam = await req('POST', '/api/interview/exam', {
    role: 'Frontend Developer',
    difficulty: 'medium',
    company: 'Test Company'
  }, authToken);
  if (exam.status !== 200 || !exam.body.examId || !Array.isArray(exam.body.questions) ||
      exam.body.questions.length === 0) {
    const providerFailure = isProviderFailure(exam);
    if (providerFailure) {
      skip('Exam session security and evaluation checks', `Question provider returned ${exam.body.code}.`);
    } else {
      test('Exam session generation returns a usable session',
        false, `Status: ${exam.status}, code: ${exam.body.code || 'unknown'}`);
    }
  } else {
    test('Exam sessions hide answer keys and are account-bound',
      exam.body.generationMode === 'openrouter' &&
      exam.body.questions.every(question =>
        !('answerIndex' in question) && !('explanation' in question) &&
        question.source === exam.body.source),
      `Status: ${exam.status}, questions: ${exam.body.questions.length}`);
    const crossAccountExam = await req('POST', '/api/interview/exam/evaluate', {
      examId: exam.body.examId,
      answers: exam.body.questions.map(() => '0')
    }, studentBToken);
    test('Exam sessions cannot be evaluated by another account',
      crossAccountExam.status === 404,
      `Status: ${crossAccountExam.status}`);
    const incompleteExam = await req('POST', '/api/interview/exam/evaluate', {
      examId: exam.body.examId,
      answers: ['0']
    }, authToken);
    test('Exam evaluation rejects incomplete answer sets',
      incompleteExam.status === 400,
      `Status: ${incompleteExam.status}`);
    const emptyExamAnswer = await req('POST', '/api/interview/exam/evaluate', {
      examId: exam.body.examId,
      answers: exam.body.questions.map(() => '')
    }, authToken);
    test('Exam evaluation rejects empty answers instead of using a rule-based score',
      emptyExamAnswer.status === 400,
      `Status: ${emptyExamAnswer.status}`);
    const evaluatedExam = await req('POST', '/api/interview/exam/evaluate', {
      examId: exam.body.examId,
      answers: exam.body.questions.map(() => '0')
    }, authToken);
    test('Exam results are evaluated from server-held questions and saved',
      evaluatedExam.status === 200 && Number.isFinite(evaluatedExam.body.totalScore) &&
      Array.isArray(evaluatedExam.body.sources) &&
      evaluatedExam.body.sources.length === 1 && evaluatedExam.body.sources[0] === 'openrouter',
      `Status: ${evaluatedExam.status}, score: ${evaluatedExam.body.totalScore}`);
    const repeatExam = await req('POST', '/api/interview/exam/evaluate', {
      examId: exam.body.examId,
      answers: exam.body.questions.map(() => 'A')
    }, authToken);
    test('Exam result cannot be replayed for duplicate XP',
      repeatExam.status === 404,
      `Status: ${repeatExam.status}`);
  }

  if (studentBToken && testAppId) {
    let freshRoadmap = await req('GET', '/api/career/roadmap', null, studentBToken);
    const openrouterRoadmap = freshRoadmap.status === 200 &&
      freshRoadmap.body.generationSource === 'openrouter' &&
      freshRoadmap.body.generationModel && freshRoadmap.body.phases?.length >= 3 &&
      freshRoadmap.body.phases.every(phase => phase.milestones.length >= 1);
    if (openrouterRoadmap) {
      test('New roadmap is generated by OpenRouter',
        true,
        `Model: ${freshRoadmap.body.generationModel}`);
    } else if (isProviderFailure(freshRoadmap)) {
      skip('New roadmap is generated by OpenRouter',
        `${freshRoadmap.body.code}; creating a test-only fixture to verify persistence separately.`);
      await createRoadmapFixture(studentBToken, null,
        `test-roadmap-milestone-${Date.now()}`);
      freshRoadmap = await req('GET', '/api/career/roadmap', null, studentBToken);
      test('Roadmap persistence fixture is available without claiming AI generation',
        freshRoadmap.status === 200 &&
        freshRoadmap.body.generationSource === 'test-fixture',
        `Status: ${freshRoadmap.status}, source: ${freshRoadmap.body.generationSource || 'none'}`);
    } else {
      test('New roadmap is generated by OpenRouter',
        false,
        `Status: ${freshRoadmap.status}, source: ${freshRoadmap.body.generationSource || 'none'}`);
    }
    const roadmapMilestones = (freshRoadmap.body.phases || []).flatMap(phase => phase.milestones || []);
    test('New roadmap starts with no assumed progress',
      freshRoadmap.status === 200 &&
      freshRoadmap.body.progressPercentage === 0 &&
      roadmapMilestones.length > 0 &&
      roadmapMilestones.every(milestone => !milestone.completed),
      `Status: ${freshRoadmap.status}, progress: ${freshRoadmap.body.progressPercentage}%`);

    const firstMilestone = roadmapMilestones[0];
    const completedMilestone = await req('PUT', '/api/career/roadmap/milestone', {
      milestoneId: firstMilestone.id,
      completed: true
    }, studentBToken);
    test('Roadmap milestone progress persists for its owner',
      completedMilestone.status === 200 &&
      completedMilestone.body.roadmap.phases.some(phase =>
        phase.milestones.some(milestone => milestone.id === firstMilestone.id && milestone.completed)),
      `Status: ${completedMilestone.status}, progress: ${completedMilestone.body.progressPercentage}%`);

    const oldRoadmapId = freshRoadmap.body._id;
    const changedTargetRole = await req('PUT', '/api/career/profile', {
      targetRole: 'Backend Engineer'
    }, studentBToken);
    let retargetedRoadmap = await req('GET', '/api/career/roadmap', null, studentBToken);
    if (isProviderFailure(retargetedRoadmap)) {
      skip('Retargeted roadmap is generated by OpenRouter',
        `${retargetedRoadmap.body.code}; no replacement roadmap was claimed.`);
      const savedPriorRoadmap = await withTestMongo(() =>
        CareerRoadmap.findOne({ _id: oldRoadmapId }));
      test('Failed roadmap generation preserves the prior saved roadmap and progress',
        changedTargetRole.status === 200 &&
        savedPriorRoadmap &&
        !savedPriorRoadmap.archivedAt &&
        savedPriorRoadmap.phases.some(phase =>
          phase.milestones.some(milestone => milestone.id === firstMilestone.id && milestone.completed)),
        `Prior roadmap retained=${Boolean(savedPriorRoadmap && !savedPriorRoadmap.archivedAt)}, provider code=${retargetedRoadmap.body.code}`);
    } else {
      const oldRoadmapHistory = await req('GET', '/api/career/roadmap/history', null, studentBToken);
      const preservedRoadmap = oldRoadmapHistory.body.roadmaps?.find(item => item._id === oldRoadmapId);
      test('Target-role changes create a current roadmap and preserve prior progress',
        changedTargetRole.status === 200 &&
        retargetedRoadmap.status === 200 &&
        retargetedRoadmap.body.targetRole === 'Backend Engineer' &&
        retargetedRoadmap.body.progressPercentage === 0 &&
        preservedRoadmap?.archivedAt &&
        preservedRoadmap.phases.some(phase =>
          phase.milestones.some(milestone => milestone.id === firstMilestone.id && milestone.completed)),
        `Current role=${retargetedRoadmap.body.targetRole || 'none'}, old roadmap archived=${Boolean(preservedRoadmap?.archivedAt)}`);
    }
    const otherUserRoadmapHistory = await req('GET', '/api/career/roadmap/history', null, authToken);
    test('Archived roadmap history remains private to its owner',
      otherUserRoadmapHistory.status === 200 &&
      !otherUserRoadmapHistory.body.roadmaps?.some(item => item._id === oldRoadmapId),
      `Other account history count: ${otherUserRoadmapHistory.body.roadmaps?.length || 0}`);

    let dailyPlan = await req('GET', '/api/career/daily-plan', null, studentBToken);
    if (isProviderFailure(dailyPlan)) {
      skip('Daily plan tasks are generated by OpenRouter',
        `${dailyPlan.body.code}; creating a test-only task to verify persistence separately.`);
      await createDailyPlanFixture(studentBToken, 'Backend Engineer',
        `test-daily-task-${Date.now()}`);
      dailyPlan = await req('GET', '/api/career/daily-plan', null, studentBToken);
    }
    const firstTask = dailyPlan.body.plan?.tasks?.[0];
    const profileBeforeTask = await req('GET', '/api/career/profile', null, studentBToken);
    const initialXp = profileBeforeTask.body.user?.xp ?? profileBeforeTask.body.xp ?? 0;
    const completedTask = firstTask && await req('PUT', `/api/career/daily-plan/task/${firstTask.id}`, {
      completed: true
    }, studentBToken);
    const repeatedTask = firstTask && await req('PUT', `/api/career/daily-plan/task/${firstTask.id}`, {
      completed: true
    }, studentBToken);
    test('Daily-plan completion awards XP once and saves progress',
      dailyPlan.status === 200 && !!firstTask &&
      dailyPlan.body.userStreak === 0 &&
      completedTask?.status === 200 &&
      completedTask.body.user.xp === initialXp + firstTask.xpReward &&
      repeatedTask?.body.user.xp === completedTask.body.user.xp,
      `Task present: ${!!firstTask}, XP before/after: ${initialXp}/${completedTask?.body.user?.xp}`);
    const revertedTask = firstTask && await req('PUT', `/api/career/daily-plan/task/${firstTask.id}`, {
      completed: false
    }, studentBToken);
    test('Uncompleting a daily task reverses its XP reward',
      revertedTask?.status === 200 && revertedTask.body.user.xp === initialXp,
      `XP restored: ${revertedTask?.body.user?.xp}`);

    const isolRes = await req('PUT', `/api/career/applications/${testAppId}`, {
      status: 'Rejected'
    }, studentBToken);
    test('TEST 13: Student B cannot modify Student A\'s application',
      isolRes.status === 403 || isolRes.status === 404,
      `Status: ${isolRes.status} (403 or 404 expected)`);

      const patchIsolRes = await req('PATCH', `/api/career/applications/${testAppId}/status`, {
        status: 'Rejected'
      }, studentBToken);
      test('TEST 13a: Student B cannot patch Student A\'s application',
        patchIsolRes.status === 403 || patchIsolRes.status === 404,
        `Status: ${patchIsolRes.status} (403 or 404 expected)`);

      const deleteIsolRes = await req('DELETE', `/api/career/applications/${testAppId}`, null, studentBToken);
      test('TEST 13b: Student B cannot delete Student A\'s application',
        deleteIsolRes.status === 403 || deleteIsolRes.status === 404,
        `Status: ${deleteIsolRes.status} (403 or 404 expected)`);

      // Student B cannot read Student A's applications through protected endpoint
      const bApps = await req('GET', '/api/career/applications', null, studentBToken);
    const bAppList = bApps.body.applications || (Array.isArray(bApps.body) ? bApps.body : []);
    const seesA = bAppList.some(a => a.company === 'TestCo Corp');
    test('TEST 13b: Student B cannot see Student A\'s applications',
      !seesA, `Student B sees TestCo: ${seesA}`);
    const studentBTracked = bAppList.some(a => a.jobId && a.source === 'Arbeitnow Job Board API');
    test('Student B cannot see Student A\'s tracked provider job',
      !studentBTracked, `Student B sees tracked provider listing: ${studentBTracked}`);
  } else {
    test('TEST 13: Isolation test skipped', false, `TokenB: ${!!studentBToken}`);
    test('TEST 13b: Isolation test skipped', false, '');
  }

  const unauthApps = await req('GET', '/api/career/applications');
  test('Personal applications reject requests without a token',
    unauthApps.status === 401, `Status: ${unauthApps.status}`);

  // TEST 10: Dashboard readiness from real data
  const readRes = await req('GET', '/api/career/readiness', null, authToken);
  test('TEST 10: Dashboard readiness score calculated from real DB data',
    readRes.status === 200 && typeof readRes.body.overallScore === 'number',
    `Score: ${readRes.body?.overallScore}%`);

  // TEST 14: Pasted-text resume analysis
  const resumeRes = await req('POST', '/api/resume/analyze-text', {
    text: 'John Doe - ML Engineer\nSkills: Python, TensorFlow, PyTorch\nEducation: B.Tech CSE',
    jobDescription: 'Develop machine learning services with Python, TensorFlow, and tested APIs.'
  }, authToken);
  test('Resume analysis returns a real result or an explicit provider error',
    (resumeRes.status === 200 && resumeRes.body.analysisMethod === 'openrouter' &&
      typeof resumeRes.body.model === 'string' && resumeRes.body.comparedWithJobDescription === true) ||
    isProviderFailure(resumeRes),
    `Status: ${resumeRes.status}, method: ${resumeRes.body.analysisMethod || resumeRes.body.code || 'none'}`);
  if (resumeRes.body.code === 'AI_PROVIDER_QUOTA_EXCEEDED') {
    test('Resume quota error is accurate and user-safe',
      /no credits remaining/i.test(resumeRes.body.message || '') &&
      !/OpenRouter|model identifier|API key/i.test(resumeRes.body.message || ''),
      'The configured AI account needs credits; the message does not reveal provider or credential details.');
  }
  const shortResume = await req('POST', '/api/resume/analyze-text', { text: 'Hi' }, authToken);
  test('Short resume text is rejected without saving or assigning a score',
    shortResume.status === 422 && shortResume.body.code === 'RESUME_TEXT_INSUFFICIENT',
    `Status: ${shortResume.status}, code: ${shortResume.body.code || 'none'}`);
  const docxFixturePath = path.join(__dirname, '..', 'report', 'CareerHub_AI_Final_Year_Project_Report.docx');
  if (fs.existsSync(docxFixturePath)) {
    const docxUpload = await reqResumeFile('/api/resume/upload', docxFixturePath, authToken);
    test('DOCX upload extracts text before reporting the unavailable AI provider',
      docxUpload.status === 503 && docxUpload.body.code === 'AI_PROVIDER_NOT_CONFIGURED',
      `Status: ${docxUpload.status}, code: ${docxUpload.body.code || 'none'}`);
  } else {
    skip('DOCX upload route extracts an actual document',
      'The existing DOCX fixture is unavailable.');
  }
  const resumeProviderSuccess =
    resumeRes.status === 200 && resumeRes.body.analysisMethod === 'openrouter';
  let resumeHistoryFixture = false;
  const testMongoUri = process.env.TEST_MONGO_URI || process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!resumeProviderSuccess && testMongoUri) {
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(testMongoUri);
    }
    const profile = await req('GET', '/api/career/profile', null, authToken);
    const record = new ResumeAnalysis({
      userId: String(profile.body.user?._id || profile.body.user?.id),
      targetRole: 'AI/ML Engineer',
      score: 73,
      summary: 'Synthetic persistence fixture; not an AI result.',
      analysisMethod: 'test-fixture'
    });
    await record.save();
    resumeHistoryFixture = true;
  }
  const ownerResumeHistory = await req('GET', '/api/resume/history', null, authToken);
  test(resumeProviderSuccess
    ? 'Real AI resume analysis is saved to owner history'
    : 'Resume history route persists and scopes isolated fixture data',
  ownerResumeHistory.status === 200 && ownerResumeHistory.body.analyses.length > 0 &&
    (resumeProviderSuccess
      ? ownerResumeHistory.body.analyses.some(item => item.analysisMethod === 'openrouter')
      : resumeHistoryFixture && ownerResumeHistory.body.analyses.some(item => item.analysisMethod === 'test-fixture')),
  `Saved records: ${ownerResumeHistory.body.analyses?.length || 0}; AI analysis: ${resumeProviderSuccess}`);
  const reLogin = await req('POST', '/api/auth/login', {
    email: registeredEmail,
    password: 'testpass123'
  });
  const newLoginResumeHistory = await req('GET', '/api/resume/history', null, reLogin.body.token);
  test('Resume history survives a fresh login',
    reLogin.status === 200 && newLoginResumeHistory.status === 200 &&
    newLoginResumeHistory.body.analyses.length === ownerResumeHistory.body.analyses.length,
    `Status: ${newLoginResumeHistory.status}`);
  const otherResumeHistory = await req('GET', '/api/resume/history', null, studentBToken);
  test('Another account cannot read resume analysis history',
    otherResumeHistory.status === 200 && otherResumeHistory.body.analyses.length === 0,
    `Other user history: ${otherResumeHistory.body.analyses?.length || 0}`);

  // TEST 15: AI assistant with no fabrication
  const unauthAi = await req('POST', '/api/career/assistant', { message: 'Hello' });
  test('AI Copilot rejects unauthenticated requests', unauthAi.status === 401,
    `Status: ${unauthAi.status}`);
  const aiStatus = await req('GET', '/api/career/assistant/status', null, authToken);
  test('AI Copilot reports only user-safe availability status',
    aiStatus.status === 200 && typeof aiStatus.body.configured === 'boolean' &&
    typeof aiStatus.body.verified === 'boolean' && typeof aiStatus.body.ready === 'boolean' &&
    typeof aiStatus.body.quotaBlocked === 'boolean' &&
    (aiStatus.body.retryAfter === null || typeof aiStatus.body.retryAfter === 'string') &&
    (aiStatus.body.provider === null || aiStatus.body.provider === 'OpenRouter') &&
    (aiStatus.body.model === null || typeof aiStatus.body.model === 'string') &&
    !('apiKey' in aiStatus.body) && !('key' in aiStatus.body),
    `Configured: ${aiStatus.body.configured}, ready: ${aiStatus.body.ready}`);

  const aiRes = await req('POST', '/api/career/assistant', {
    message: 'Who am I? Tell me the name and target role from my profile, and say if anything is missing.'
  }, authToken);
  const providerGeneratedReply = aiRes.status === 200 &&
    aiRes.body.reply && aiRes.body.source === 'openrouter';
  if (aiRes.body.code === 'AI_PROVIDER_QUOTA_EXCEEDED') {
    test('Assistant quota errors include a safe cooldown expiry',
      typeof aiRes.body.retryAfter === 'string' &&
      Number.isFinite(Date.parse(aiRes.body.retryAfter)) &&
      Date.parse(aiRes.body.retryAfter) > Date.now(),
      'The client needs the expiry timestamp to pause repeated sends.');
  }
  if (providerGeneratedReply) {
    test('AI Copilot returns a response from the configured model',
      true, `Source: ${aiRes.body.source}, model: ${aiRes.body.model}`);
    test('AI Copilot uses authenticated profile context',
      aiRes.body.reply.includes('Test Student A'),
      'Response should identify the authenticated user from their profile.');
  } else {
    test('AI Copilot reports provider failure without generating a fake answer',
      isProviderFailure(aiRes),
      `Status: ${aiRes.status}, code: ${aiRes.body.code || 'none'}`);
    skip('Real model output and personalized response validation',
      aiRes.body.code === 'AI_PROVIDER_NOT_CONFIGURED'
        ? 'No provider API key is configured in this test process.'
        : 'The configured provider did not return a real model response.');
  }
  let historyFixtureAvailable = false;
  const assistantMongoUri = process.env.TEST_MONGO_URI || process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!providerGeneratedReply && assistantMongoUri) {
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(assistantMongoUri);
    }
    const owner = await req('GET', '/api/career/profile', null, authToken);
    const userId = owner.body.user?._id || owner.body.user?.id;
    const record = new CareerConversation({
      userId: String(userId),
      messages: [{ role: 'user', content: 'Conversation privacy integration test' }]
    });
    await record.save();
    historyFixtureAvailable = true;
  }
  const historyRes = await req('GET', '/api/career/assistant/history', null, authToken);
  if (providerGeneratedReply) {
    test('AI Copilot conversation is persisted for the authenticated user',
      historyRes.status === 200 &&
      historyRes.body.messages.some(message => message.role === 'user' && message.content.startsWith('Who am I?')) &&
      historyRes.body.messages.some(message => message.role === 'assistant' && message.content === aiRes.body.reply),
      `Messages persisted: ${historyRes.body.messages?.length || 0}`);
  } else if (historyFixtureAvailable) {
    test('Per-user conversation history can be loaded',
      historyRes.status === 200 &&
      historyRes.body.messages.some(message => message.content === 'Conversation privacy integration test'),
      `Messages loaded: ${historyRes.body.messages?.length || 0}`);
  } else {
    skip('Conversation history persistence and clear checks',
      'The server has no shared MongoDB connection and the AI provider did not return a response.');
  }
  const studentBHistory = await req('GET', '/api/career/assistant/history', null, studentBToken);
  test('Another user cannot read this Copilot conversation',
    studentBHistory.status === 200 && studentBHistory.body.messages.length === 0,
    `Student B history count: ${studentBHistory.body.messages?.length}`);
  await req('DELETE', '/api/career/assistant/history', null, studentBToken);
  const afterOtherClear = await req('GET', '/api/career/assistant/history', null, authToken);
  if (providerGeneratedReply || historyFixtureAvailable) {
    test('Another user cannot clear this Copilot conversation',
      afterOtherClear.status === 200 && afterOtherClear.body.messages.length > 0,
      `Owner history remains: ${afterOtherClear.body.messages?.length}`);
  } else {
    skip('Cross-user conversation clear isolation',
      'No owner conversation exists to verify because AI generation and shared persistence are unavailable.');
  }
  const clearHistory = await req('DELETE', '/api/career/assistant/history', null, authToken);
  const emptyHistory = await req('GET', '/api/career/assistant/history', null, authToken);
  if (providerGeneratedReply || historyFixtureAvailable) {
    test('Clear History deletes only the owner conversation',
      clearHistory.status === 200 && emptyHistory.status === 200 && emptyHistory.body.messages.length === 0,
      `Cleared: ${clearHistory.status === 200}, remaining: ${emptyHistory.body.messages?.length}`);
  } else {
    test('Clear History responds successfully for an empty conversation',
      clearHistory.status === 200 && emptyHistory.status === 200 && emptyHistory.body.messages.length === 0,
      `Cleared: ${clearHistory.status === 200}, remaining: ${emptyHistory.body.messages?.length}`);
  }

  // TEST 16: New page routes accessible
  for (const pg of ['/profile', '/recommendations', '/jobs', '/applications']) {
    const pgRes = await req('GET', pg, null, null);
    test(`TEST 16: Page ${pg} loads (200)`, pgRes.status === 200, `Status: ${pgRes.status}`);
  }

  const emptySkillProfile = await req('PUT', '/api/career/profile', {
    technicalSkills: [],
    targetRole: 'Data Analyst'
  }, studentBToken);
  const emptySkillGap = await req('GET', '/api/career/skill-gap?role=Data%20Analyst', null, studentBToken);
  test('Skill-gap benchmark reports zero acquired skills for an empty profile without requiring AI',
    emptySkillProfile.status === 200 && emptySkillGap.status === 200 &&
    emptySkillGap.body.matchedSkills.length === 0 &&
    emptySkillGap.body.acquiredCount === 0 &&
    emptySkillGap.body.missingCount === emptySkillGap.body.totalSkillsRequired &&
    ['generated', 'unavailable'].includes(emptySkillGap.body.aiAdviceStatus?.status),
    `Status: ${emptySkillGap.status}, acquired: ${emptySkillGap.body.acquiredCount}, guidance: ${emptySkillGap.body.aiAdviceStatus?.status}`);
  const skilledProfile = await req('PUT', '/api/career/profile', {
    technicalSkills: ['React', 'JavaScript'],
    targetRole: 'Full Stack Developer'
  }, studentBToken);
  const skilledGap = await req('GET', '/api/career/skill-gap?role=Full%20Stack%20Developer', null, studentBToken);
  test('Skill-gap benchmark matches existing profile skills without requiring AI guidance',
    skilledProfile.status === 200 && skilledGap.status === 200 &&
    skilledGap.body.matchedSkills.some(skill => skill.skill === 'React') &&
    skilledGap.body.matchedSkills.some(skill => skill.skill === 'JavaScript / TypeScript') &&
    ['generated', 'unavailable'].includes(skilledGap.body.aiAdviceStatus?.status),
    `Status: ${skilledGap.status}, matches: ${skilledGap.body.acquiredCount}, guidance: ${skilledGap.body.aiAdviceStatus?.status}`);

  if (studentBToken && (process.env.TEST_MONGO_URI || process.env.MONGO_URI || process.env.MONGODB_URI)) {
    const profile = await req('GET', '/api/career/profile', null, studentBToken);
    const userId = String(profile.body.user?._id || profile.body.user?.id);
    await withTestMongo(() => new CareerAssessment({
      userId,
      targetRole: 'Assessment envelope verification',
      generationSource: 'openrouter',
      scores: { overallReadiness: 72 },
      date: new Date()
    }).save());
    const savedAssessment = await req('GET', '/api/career/assessment/latest', null, studentBToken);
    test('Latest assessment uses the stable envelope when a saved result exists',
      savedAssessment.status === 200 &&
      savedAssessment.body.assessmentCompleted === true &&
      savedAssessment.body.assessment?.targetRole === 'Assessment envelope verification' &&
      savedAssessment.body.assessment?.scores?.overallReadiness === 72 &&
      savedAssessment.body.overallReadiness === 72 &&
      savedAssessment.body.message === null,
      `Status: ${savedAssessment.status}, readiness: ${savedAssessment.body.overallReadiness}`);
  } else {
    skip('Latest assessment stable envelope with a saved result',
      'An isolated MongoDB connection or second test account is unavailable.');
  }

  console.log('\n========================================');
  console.log(`ðŸŽ¯ Results: ${passed} Passed, ${failed} Failed, ${skipped} Blocked out of ${passed + failed + skipped} checks`);
  console.log('========================================\n');
  if (mongoose.connection.readyState === 1) await mongoose.disconnect();
  process.exitCode = failed > 0 ? 1 : skipped > 0 ? 2 : 0;
}

run().catch(e => { console.error('Runner error:', e); process.exit(1); });
