const http = require('http');
const mongoose = require('mongoose');
const API_URL = new URL(process.env.API_BASE_URL || 'http://localhost:3000');
const codingProblemLibrary = require('./utils/codingProblemLibrary');
require('./models/CodingProblem');
const seedCodingProblems = require('./utils/seedCodingProblems');
let authToken = '';
const testEmail = `e2e_${Date.now()}@careerhub.test`;
const testPassword = 'Capstone-test-123';
const configuredAIProvider = process.env.AI_PROVIDER?.trim().toLowerCase() || 'openrouter';
const configuredAIProviderLabel = configuredAIProvider === 'gemini'
  ? 'Gemini'
  : configuredAIProvider === 'groq' ? 'Groq' : 'OpenRouter';
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
  return response.status >= 400 && providerFailureCodes.has(response.data?.code);
}

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : null;
    const reqHeaders = {
      ...headers,
      ...(authToken && !headers.Authorization ? { Authorization: `Bearer ${authToken}` } : {})
    };
    if (postData) {
      reqHeaders['Content-Type'] = 'application/json';
      reqHeaders['Content-Length'] = Buffer.byteLength(postData);
    }
    const req = http.request({
      hostname: API_URL.hostname,
      port: API_URL.port || 80,
      path,
      method,
      headers: reqHeaders
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = res.headers['content-type']?.includes('application/json')
            ? JSON.parse(data)
            : data;
          resolve({ status: res.statusCode, data: parsed });
        } catch(e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function runTests() {
  console.log('ðŸ§ª Starting Full Product Verification Suite...\n');
  let passed = 0;
  let failed = 0;
  let blocked = 0;

  async function test(name, fn) {
    try {
      const outcome = await fn();
      if (outcome?.blocked) {
        console.warn(`âš ï¸ BLOCKED: ${name} -> ${outcome.reason}`);
        blocked++;
        return;
      }
      console.log(`âœ… PASS: ${name}`);
      passed++;
    } catch(e) {
      console.error(`âŒ FAIL: ${name} -> ${e.message}`);
      failed++;
    }
  }

  // 1. Health check
  await test('Health check endpoint', async () => {
    const res = await request('GET', '/api/health');
    if (res.status !== 200 || res.data.status !== 'ok') throw new Error(`Status ${res.status}`);
  });

  await test('Personal career data requires authentication', async () => {
    const res = await request('GET', '/api/career/readiness');
    if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
  });

  await test('Resume and job-description analysis require authentication', async () => {
    const resume = await request('POST', '/api/resume/analyze-text', {
      resumeText: 'A sufficiently long resume body with enough text for validation.'
    });
    const job = await request('POST', '/api/career/job-analyzer', {
      jobDescription: 'Python and PostgreSQL are required.'
    });
    const history = await request('GET', '/api/career/job-analyzer/history');
    if (resume.status !== 401 || job.status !== 401 || history.status !== 401) {
      throw new Error(`Expected unauthenticated 401s; resume=${resume.status}, job=${job.status}, history=${history.status}`);
    }
  });

  await test('Coding runner language discovery requires authentication', async () => {
    const res = await request('GET', '/api/coding/languages', null, { Authorization: 'invalid' });
    if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
  });

  await test('LeetCode profile lookup requires authentication', async () => {
    const res = await request('GET', '/api/user/leetcode/sample_user', null, { Authorization: 'invalid' });
    if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
  });

  await test('Interview video upload requires authentication', async () => {
    const res = await request('POST', '/api/video/upload', null, { Authorization: 'invalid' });
    if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
  });

  await test('Shared demo login is disabled', async () => {
    const res = await request('POST', '/api/auth/demo');
    if (res.status !== 404) throw new Error(`Expected 404, got ${res.status}`);
  });

  await test('Registration and login create an isolated test account', async () => {
    const registration = await request('POST', '/api/auth/register', {
      name: 'CareerHub E2E User',
      email: testEmail,
      password: testPassword
    });
    if (![200, 201].includes(registration.status)) {
      throw new Error(`Registration status ${registration.status}`);
    }
    const login = await request('POST', '/api/auth/login', {
      email: testEmail,
      password: testPassword
    });
    if (login.status !== 200 || !login.data.token) throw new Error(`Login status ${login.status}`);
    authToken = login.data.token;
  });

  await test('Coding catalog is seeded idempotently without duplicating records', async () => {
    if (!process.env.TEST_MONGO_URI) throw new Error('Isolated MongoDB URI is required to verify catalog seeding.');
    const connection = mongoose.createConnection(process.env.TEST_MONGO_URI);
    try {
      await connection.asPromise();
      const ProblemModel = connection.model('CodingProblem', mongoose.models.CodingProblem.schema);
      const firstProblem = await ProblemModel.findOne({ problemId: 'ch-001' }).select('_id seedKey');
      if (!firstProblem) throw new Error('The validated coding catalog was not seeded into MongoDB.');
      await ProblemModel.updateOne({ _id: firstProblem._id }, {
        $set: { seedKey: 'legacy:careerhub:ch-001' }
      });
      await seedCodingProblems(ProblemModel, codingProblemLibrary);
      await seedCodingProblems(ProblemModel, codingProblemLibrary);
      const [count, ids, restored] = await Promise.all([
        ProblemModel.countDocuments({ catalogVersion: 'careerhub-dsa-100-v1', isActive: true }),
        ProblemModel.distinct('problemId', { catalogVersion: 'careerhub-dsa-100-v1', isActive: true }),
        ProblemModel.findOne({ problemId: 'ch-001' }).select('seedKey')
      ]);
      if (count !== 100 || ids.length !== 100 ||
        restored?.seedKey !== 'careerhub:dsa:v1:ch-001') {
        throw new Error(`Catalog reseeding produced ${count} active records and ${ids.length} unique IDs.`);
      }
    } finally {
      await connection.close();
    }
  });

  await test('Interview provider status is authenticated and reports feature-level readiness', async () => {
    const unauthenticated = await request('GET', '/api/interview/status', null, { Authorization: 'invalid' });
    if (unauthenticated.status !== 401) throw new Error(`Expected 401, got ${unauthenticated.status}`);
    const status = await request('GET', '/api/interview/status');
    const expectedFeatures = [
      'technical_interview_generation',
      'behavioral_interview_generation',
      'video_interview_generation',
      'assessment_question_generation'
    ];
    if (status.status !== 200 || !status.data.features ||
        expectedFeatures.some(feature => !status.data.features[feature]) ||
        typeof status.data.ready !== 'boolean' ||
        typeof status.data.privacyNotice !== 'string' ||
        Object.hasOwn(status.data, 'apiKey') ||
        Object.hasOwn(status.data, 'credentialValue')) {
      throw new Error('Interview status omitted feature readiness, privacy messaging, or exposed configuration.');
    }
  });

  await test('Coding runner readiness verifies provider language discovery', async () => {
    const res = await request('GET', '/api/coding/languages');
    if (res.status === 200) {
      if (res.data.status === 'unavailable') {
        return { blocked: true, reason: res.data.engine?.message || 'The local Docker execution engine is unavailable.' };
      }
      if (res.data.status !== 'ready' || !Array.isArray(res.data.languages) ||
          res.data.languages.some(language => Object.hasOwn(language, 'id'))) {
        throw new Error('Runner readiness returned invalid or provider-internal language data.');
      }
      const languages = new Set(res.data.languages.map(language => language.value));
      if (['python', 'java', 'cpp', 'javascript'].some(language => !languages.has(language))) {
        throw new Error('The local runner did not advertise all four required languages.');
      }
      return;
    }
    if (res.status === 503 && res.data.status === 'unavailable') {
      return { blocked: true, reason: res.data.message || 'The local Docker execution engine is unavailable.' };
    }
    throw new Error(`Runner readiness returned ${res.status}: ${res.data.message || res.data.code}`);
  });

  await test('LeetCode sync reports unavailable without making unsupported API requests', async () => {
    const invalid = await request('GET', '/api/user/leetcode/bad%20name');
    if (invalid.status !== 400 || invalid.data.code !== 'LEETCODE_USERNAME_INVALID') {
      throw new Error(`Expected invalid username rejection, got HTTP ${invalid.status}.`);
    }
    const result = await request('GET', '/api/user/leetcode/sample_user');
    if (result.status !== 503 || result.data.code !== 'LEETCODE_SYNC_UNAVAILABLE' ||
        result.data.isSynced !== false ||
        result.data.profileUrl !== 'https://leetcode.com/u/sample_user/') {
      throw new Error('Unsupported LeetCode sync did not return a clear unavailable response.');
    }
  });

  await test('AI provider health check is authenticated and reports verified connectivity only', async () => {
    const unauthenticated = await request('POST', '/api/health/ai', null, { Authorization: 'invalid' });
    if (unauthenticated.status !== 401) throw new Error(`Expected 401, got ${unauthenticated.status}`);

    const res = await request('POST', '/api/health/ai');
    if (res.status === 503 && res.data.status === 'not_configured' &&
        res.data.code === 'AI_PROVIDER_NOT_CONFIGURED' && res.data.verified === false &&
        res.data.configured === false && res.data.configuration?.apiKeyConfigured === false &&
        res.data.configuration?.requiredConfiguration?.includes(`${configuredAIProvider.toUpperCase()}_API_KEY`)) return;
    if (res.status === 200 && res.data.status === 'connected' &&
        res.data.provider === configuredAIProviderLabel && res.data.verified === true &&
        res.data.configured === true && res.data.configuration?.apiKeyConfigured === true) return;
    if (isProviderFailure(res)) {
      return { blocked: true, reason: `${configuredAIProviderLabel} connectivity check returned ${res.data.status} (${res.data.code}).` };
    }
    throw new Error(`Unexpected ${configuredAIProviderLabel} health result: HTTP ${res.status}, ${res.data.status || res.data.code}`);
  });

  await test('Test profile selects an explicit target role', async () => {
    const res = await request('PUT', '/api/career/profile', {
      targetRole: 'Backend Engineer'
    });
    if (res.status !== 200 || res.data.user?.targetRole !== 'Backend Engineer') {
      throw new Error(`Profile update status ${res.status}`);
    }
  });

  // 2. Readiness Endpoint
  await test('Dynamic Readiness Endpoint (GET /api/career/readiness)', async () => {
    const res = await request('GET', '/api/career/readiness');
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    if (typeof res.data.overallScore !== 'number') throw new Error('Missing overallScore');
    console.log(`   Readiness Score: ${res.data.overallScore}% (${res.data.statusBadge})`);
  });

  // 3. Daily Plan Endpoint
  let dailyPlanTaskId;
  await test('Daily Plan Endpoint (GET /api/career/daily-plan)', async () => {
    const res = await request('GET', '/api/career/daily-plan');
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    const tasks = res.data.plan?.tasks;
    if (!Array.isArray(tasks) || tasks.length !== 5 || res.data.generationSource !== 'local') {
      throw new Error('A five-task local daily plan was not generated from the saved profile.');
    }
    dailyPlanTaskId = tasks[0].id;
    if (!dailyPlanTaskId) throw new Error('First daily task has no ID');
    const refreshed = await request('GET', '/api/career/daily-plan');
    if (refreshed.status !== 200 || String(refreshed.data.plan?._id) !== String(res.data.plan?._id)) {
      throw new Error('Daily plan did not survive a fresh backend retrieval.');
    }
    if (process.env.TEST_MONGO_URI) {
      const connection = mongoose.createConnection(process.env.TEST_MONGO_URI);
      try {
        await connection.asPromise();
        const stored = await connection.collection('dailyplans').findOne({
          _id: new mongoose.Types.ObjectId(String(res.data.plan._id))
        });
        if (!stored || stored.tasks?.length !== 5 || stored.generationSource !== 'local') {
          throw new Error('The local daily plan was not verified in the isolated MongoDB database.');
        }
      } finally {
        await connection.close();
      }
    } else {
      throw new Error('An isolated MongoDB URI is required to verify daily-plan persistence.');
    }
    console.log(`   Retrieved ${tasks.length} locally generated tasks for role: ${res.data.plan.targetRole}`);
  });

  // 4. Daily Plan Task Update
  await test('Daily Plan Task Update (PUT /api/career/daily-plan/task/:taskId)', async () => {
    if (!dailyPlanTaskId) return { blocked: true, reason: 'No task can be updated because genuine plan generation was unavailable.' };
    const res = await request('PUT', `/api/career/daily-plan/task/${encodeURIComponent(dailyPlanTaskId)}`, { completed: true });
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    if (res.data.task?.completed !== true) throw new Error('Task completed not updated');
    console.log(`   Task marked completed, plan completion: ${res.data.plan?.completionPercentage}%`);
  });

  // 5. Job Description Analyzer Endpoint
  await test('Job Description Analyzer (POST /api/career/job-analyzer)', async () => {
    const sampleJd = "We are seeking a Full Stack Software Engineer proficient in React, Node.js, TypeScript, Docker, and PostgreSQL. Experience with cloud services AWS and REST APIs required.";
    const res = await request('POST', '/api/career/job-analyzer', {
      jobDescription: sampleJd,
      jobTitle: 'Full Stack Software Engineer',
      company: 'InnovateTech'
    });
    if (res.status !== 201) throw new Error(`Status ${res.status}`);
    if (res.data.analysisMethod !== 'local' ||
        typeof res.data.overallMatch !== 'number' ||
        res.data.aiAdviceStatus?.status !== 'unavailable') {
      throw new Error('Job analysis must return local results and an explicit advanced-AI state.');
    }
    const history = await request('GET', '/api/career/job-analyzer/history');
    if (history.status !== 200 ||
        !history.data.analyses?.some(item => String(item._id) === String(res.data.analysisId))) {
      throw new Error('Saved job analysis was not retrieved from authenticated history.');
    }
    if (process.env.TEST_MONGO_URI) {
      const connection = mongoose.createConnection(process.env.TEST_MONGO_URI);
      try {
        await connection.asPromise();
        const stored = await connection.collection('jobdescriptionanalyses').findOne({
          _id: new mongoose.Types.ObjectId(String(res.data.analysisId))
        });
        if (!stored || stored.jobDescription !== undefined || stored.analysisMethod !== 'local') {
          throw new Error('The saved job analysis is missing or stored the raw job description.');
        }
      } finally {
        await connection.close();
      }
    } else {
      throw new Error('An isolated MongoDB URI is required to verify job-analysis persistence.');
    }
    console.log(`   JD Match: ${res.data.overallMatch}%, Matched Skills: ${res.data.matchedSkills.join(', ')}`);
  });

  // 6. Analytics History Endpoint
  await test('Progress Analytics History (GET /api/career/analytics/history)', async () => {
    const res = await request('GET', '/api/career/analytics/history');
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    if (!res.data.user || !res.data.coding || !res.data.interviews) throw new Error('Incomplete analytics payload');
    console.log(`   Analytics loaded: ${res.data.coding.acceptedCount} accepted problems, ${res.data.interviews.totalSessions} interviews`);
  });

  await test('Local coding runner reports genuine availability', async () => {
    const health = await request('GET', '/api/coding/engine');
    if (health.status === 503 && health.data.status === 'unavailable') {
      return { blocked: true, reason: health.data.message || 'The local Docker execution engine is unavailable.' };
    }
    if (health.status !== 200 || health.data.status !== 'ready') {
      throw new Error(`Unexpected runner response: ${health.status}`);
    }
    const sampleCode = "process.stdout.write(require('fs').readFileSync(0, 'utf8').trim())";
    const res = await request('POST', '/api/coding/run', {
      code: sampleCode,
      language: 'javascript',
      stdin: 'runner-ok\n'
    });
    if (res.status !== 200 || !res.data.success || res.data.output !== 'runner-ok') {
      throw new Error(`Local runner test failed: ${res.status} ${res.data.error || res.data.status}`);
    }
  });

  await test('Coding catalog omits hidden cases and supports pagination', async () => {
    const res = await request('GET', '/api/coding/problems?page=1&limit=5');
    if (res.status !== 200 || !Array.isArray(res.data) || res.data.length === 0) {
      if (res.status !== 200 || !res.data || !Array.isArray(res.data.problems)) {
        throw new Error(`Status ${res.status}`);
      }
    }
    const problems = Array.isArray(res.data) ? res.data : res.data.problems;
    if (problems.length > 5 || res.data.total !== undefined && res.data.total < problems.length ||
      problems.some(problem => 'solutionCode' in problem || 'referenceCode' in problem || 'testCases' in problem ||
      (problem.testCases || []).some(testCase => testCase.isHidden))) {
      throw new Error('Pagination or hidden-test protection failed.');
    }
  });

  await test('Coding catalog titles are unique and problem search works', async () => {
    const res = await request('GET', '/api/coding/problems');
    if (res.status === 200 && res.data.length === 0) {
      return { blocked: true, reason: 'The 100-problem catalog is not seeded because its problem-specific content failed the quality gate.' };
    }
    const titles = res.data.map(problem => problem.title);
    if (new Set(titles).size !== titles.length) throw new Error('Duplicate coding problem titles were returned.');
    const first = res.data[0];
    if (!first) throw new Error('No coding problems are available.');
    const search = await request('GET', `/api/coding/problems?search=${encodeURIComponent(first.problemId)}`);
    if (search.status !== 200 || !search.data.some(problem => problem.problemId === first.problemId)) {
      throw new Error('Search by problem ID did not return the matching problem.');
    }
  });

  await test('Coding catalog difficulty, topic, status, and invalid filters work', async () => {
    const difficulty = await request('GET', '/api/coding/problems?difficulty=easy');
    const topic = await request('GET', '/api/coding/problems?topic=strings');
    const empty = await request('GET', '/api/coding/problems?search=not-a-problem');
    const invalid = await request('GET', '/api/coding/problems?difficulty=unsupported');
    const status = await request('GET', '/api/coding/problems?status=solved');
    if (empty.status !== 200 || empty.data.length !== 0 || invalid.status !== 400 ||
      status.status !== 200) {
      throw new Error('Empty-search or invalid/status filter handling is incorrect.');
    }
    if (difficulty.status === 200 && difficulty.data.length === 0 &&
      topic.status === 200 && topic.data.length === 0) {
      return { blocked: true, reason: 'Catalog filters cannot be fully verified until the validated problem catalog is seeded.' };
    }
    if (difficulty.status !== 200 || !difficulty.data.length ||
      !difficulty.data.every(problem => problem.difficulty?.toLowerCase() === 'easy') ||
      topic.status !== 200 || !topic.data.length ||
      !topic.data.every(problem => problem.category?.toLowerCase() === 'strings') ||
      invalid.status !== 400) {
      throw new Error('One or more catalog filters returned unexpected results.');
    }
  });

  await test('Coding submission history is scoped to the signed-in user', async () => {
    const res = await request('GET', '/api/coding/submissions');
    if (res.status !== 200 || !Array.isArray(res.data)) {
      throw new Error(`Status ${res.status}`);
    }
  });

  await test('Accepted coding solution is evaluated and saved to history', async () => {
    const problems = await request('GET', '/api/coding/problems');
    const problem = (problems.data || []).find(item => item.problemId === 'ch-001');
    if (!problem) {
      return { blocked: true, reason: 'Submission execution and persistence require a validated, seeded coding problem and the local Docker runner.' };
    }
    const problemId = problem._id || problem.id;
    const details = await request('GET', `/api/coding/problems/${encodeURIComponent(problemId)}`);
    const definition = codingProblemLibrary.find(item => item.problemId === problem.problemId);
    const solution = {
      code: definition?.referenceCode?.javascript,
      language: 'javascript'
    };
    if (details.status !== 200 || !details.data?.starterCode?.javascript ||
      'referenceCode' in details.data ||
      typeof solution.code !== 'string' || !solution.code.trim()) {
      throw new Error('Problem detail did not provide a public starter and keep its reference solution private.');
    }
    const submission = await request('POST', `/api/coding/submit/${problemId}`, solution);
    if (submission.status === 503 && submission.data.code?.startsWith('CODE_EXECUTION_')) {
      return { blocked: true, reason: submission.data.message || 'The local Docker runner is unavailable.' };
    }
    if (submission.status !== 200 || submission.data.status !== 'accepted') {
      throw new Error(`Submission status ${submission.status}: ${submission.data.message || submission.data.status}`);
    }
    if (!Array.isArray(submission.data.results) ||
      !submission.data.results.some(result =>
        !Object.hasOwn(result, 'actualOutput') && !Object.hasOwn(result, 'expectedOutput'))) {
      throw new Error('Hidden-test submission results exposed test inputs or expected outputs.');
    }
    if (typeof submission.data.xpEarned !== 'number' || submission.data.xpEarned <= 0) {
      throw new Error('The first accepted solution did not award verified XP.');
    }
    const repeatedSubmission = await request('POST', `/api/coding/submit/${problemId}`, solution);
    if (repeatedSubmission.status !== 200 || repeatedSubmission.data.status !== 'accepted' ||
      repeatedSubmission.data.xpEarned !== 0) {
      throw new Error('Repeating an accepted solution did not preserve the no-duplicate-XP rule.');
    }
    const history = await request('GET', '/api/coding/submissions');
    if (history.status !== 200 || !history.data.some(item =>
      String(item.problemId) === String(problemId) && item.status === 'accepted')) {
      throw new Error('Accepted coding submission was not saved to the authenticated user history.');
    }
    if (!process.env.TEST_MONGO_URI) throw new Error('Isolated MongoDB URI is required to verify stored submissions.');
    const tokenPayload = JSON.parse(Buffer.from(authToken.split('.')[1], 'base64url').toString('utf8'));
    const connection = mongoose.createConnection(process.env.TEST_MONGO_URI);
    try {
      await connection.asPromise();
      const stored = await connection.collection('codesubmissions').findOne({
        userId: new mongoose.Types.ObjectId(tokenPayload.id),
        problemId: new mongoose.Types.ObjectId(problemId),
        code: solution.code,
        status: 'accepted',
        completed: true
      });
      if (!stored) throw new Error('Accepted submission was not found in the isolated MongoDB collection.');
    } finally {
      await connection.close();
    }

    const otherEmail = `e2e_other_${Date.now()}@careerhub.test`;
    const registration = await request('POST', '/api/auth/register', {
      name: 'CareerHub Other E2E User',
      email: otherEmail,
      password: testPassword
    });
    if (![200, 201].includes(registration.status)) {
      throw new Error(`Second-user registration status ${registration.status}.`);
    }
    const login = await request('POST', '/api/auth/login', {
      email: otherEmail,
      password: testPassword
    });
    if (login.status !== 200 || !login.data.token) throw new Error('Second test account could not authenticate.');
    const otherHistory = await request('GET', '/api/coding/submissions', null, {
      Authorization: `Bearer ${login.data.token}`
    });
    const otherStats = await request('GET', '/api/coding/stats', null, {
      Authorization: `Bearer ${login.data.token}`
    });
    if (otherHistory.status !== 200 || otherHistory.data.length !== 0 ||
      otherStats.status !== 200 || otherStats.data.totalSolved !== 0) {
      throw new Error('A different authenticated user could access the owner’s coding submission or progress.');
    }
  });

  // 8. AI Mock Interview Generation
  await test('AI Mock Interview Generation (POST /api/interview/generate)', async () => {
    const res = await request('POST', '/api/interview/generate', {
      role: 'Full Stack Developer',
      type: 'Technical',
      difficulty: 'medium'
    });

    if (res.status === 200 && Array.isArray(res.data.questions) && res.data.questions.length > 0) {
      if (res.data.generationMode !== 'ai' || res.data.source !== configuredAIProvider ||
          res.data.questions.some(question => question.source !== configuredAIProvider)) {
        throw new Error(`Interview questions were not generated by ${configuredAIProvider}.`);
      }
      return;
    }
    if (isProviderFailure(res)) {
      return { blocked: true, reason: `provider returned ${res.data.code}; no questions were fabricated.` };
    }
    throw new Error(`Generation error: status ${res.status}`);
  });

  await test('Interview sessions save to owner history', async () => {
    const session = await request('POST', '/api/interview/session/start', {
      role: 'Backend Engineer',
      topic: 'Mixed',
      difficulty: 'medium',
      mode: 'mcq',
      sessionLength: 3
    });
    if (session.status !== 201 || !session.data.sessionId ||
        session.data.questions.some(question => 'answerIndex' in question || 'explanation' in question)) {
      if (isProviderFailure(session)) {
        return { blocked: true, reason: `OpenRouter returned ${session.data.code}; no curated questions were substituted.` };
      }
      throw new Error(`Session start did not hide the answer key (status ${session.status}).`);
    }
    const result = await request('POST', `/api/interview/session/${session.data.sessionId}/submit`, {
      answers: [0, 1, 2]
    });
    if (result.status !== 200 || !Number.isFinite(result.data.score)) {
      throw new Error(`Session submit status ${result.status}`);
    }
    const history = await request('GET', '/api/interview/history');
    if (history.status !== 200 || !history.data.some(item => String(item._id) === String(result.data.interviewId))) {
      throw new Error(`History status ${history.status}`);
    }
  });

  // 9. Career Assistant AI Endpoint
  await test('Career Assistant AI Chat (POST /api/career/assistant)', async () => {
    const res = await request('POST', '/api/career/assistant', {
      message: 'What are the top 3 React patterns to review for SDE interviews?'
    });
    if (res.status === 200 && res.data.reply && res.data.source === configuredAIProvider && res.data.model) {
      console.log(`   Real provider: ${res.data.source} (${res.data.model})`);
      console.log(`   Assistant Response Preview: "${res.data.reply.slice(0, 60)}..."`);
      const status = await request('GET', '/api/career/assistant/status');
      if (status.status !== 200 || status.data.ready !== true ||
          status.data.provider !== configuredAIProviderLabel || !status.data.model ||
          'apiKey' in status.data || 'key' in status.data) {
        throw new Error('AI readiness status was not verified or exposed credential data.');
      }
      return;
    }
    if (isProviderFailure(res)) {
      return { blocked: true, reason: `provider returned ${res.data.code}; no fallback response was returned.` };
    }
    throw new Error(`Status ${res.status}, code ${res.data.code || 'none'}`);
  });

  // 10. Verify dedicated page URLs respond with HTTP 200
  const pages = [
    '/dashboard',
    '/assessment',
    '/skills',
    '/roadmap',
    '/daily-plan',
    '/coding',
    '/interviews',
    '/resume',
    '/job-analyzer',
    '/job-matching',
    '/jobs',
    '/applications',
    '/analytics',
    '/assistant',
    '/resources',
    '/profile',
    '/recommendations',
    '/problems',
    '/editor'
  ];

  console.log(`\nðŸ“„ Verifying ${pages.length} dedicated web page URLs:`);
  for (const page of pages) {
    await test(`Page URL: ${page}`, async () => {
      const res = await request('GET', page);
      if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
      if (!res.data.includes('CareerHub AI')) throw new Error('HTML content invalid');
    });
  }

  console.log(`\n========================================`);
  console.log(`ðŸŽ¯ Verification Summary: ${passed} Passed, ${failed} Failed, ${blocked} Blocked`);
  console.log(`========================================\n`);

  process.exitCode = failed > 0 ? 1 : blocked > 0 ? 2 : 0;
}

runTests();
