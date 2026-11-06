const http = require('http');
const API_URL = new URL(process.env.API_BASE_URL || 'http://localhost:3000');
const additionalCodingProblems = require('./utils/additionalCodingProblems');
let authToken = '';
const testEmail = `e2e_${Date.now()}@careerhub.test`;
const testPassword = 'Capstone-test-123';
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

  await test('Coding runner readiness verifies provider language discovery', async () => {
    const res = await request('GET', '/api/coding/languages');
    if (res.status === 200) {
      if (res.data.status !== 'ready' || !Array.isArray(res.data.languages) ||
          res.data.languages.some(language => Object.hasOwn(language, 'id'))) {
        throw new Error('Runner readiness returned invalid or provider-internal language data.');
      }
      return;
    }
    if (res.status === 503 && res.data.code === 'CODE_EXECUTION_NOT_CONFIGURED') {
      return { blocked: true, reason: 'No isolated Judge0-compatible runner is configured.' };
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

  await test('OpenRouter health check is authenticated and reports verified connectivity only', async () => {
    const unauthenticated = await request('POST', '/api/health/ai', null, { Authorization: 'invalid' });
    if (unauthenticated.status !== 401) throw new Error(`Expected 401, got ${unauthenticated.status}`);

    const res = await request('POST', '/api/health/ai');
    if (res.status === 503 && res.data.status === 'not_configured' &&
        res.data.code === 'AI_PROVIDER_NOT_CONFIGURED' && res.data.verified === false &&
        res.data.configured === false && res.data.configuration?.apiKeyConfigured === false &&
        res.data.configuration?.requiredConfiguration?.includes('OPENROUTER_API_KEY')) return;
    if (res.status === 200 && res.data.status === 'connected' &&
        res.data.provider === 'OpenRouter' && res.data.verified === true &&
        res.data.configured === true && res.data.configuration?.apiKeyConfigured === true) return;
    if (isProviderFailure(res)) {
      return { blocked: true, reason: `OpenRouter connectivity check returned ${res.data.status} (${res.data.code}).` };
    }
    throw new Error(`Unexpected OpenRouter health result: HTTP ${res.status}, ${res.data.status || res.data.code}`);
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
    if (isProviderFailure(res)) {
      return { blocked: true, reason: `OpenRouter returned ${res.data.code}; no daily plan was fabricated.` };
    }
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    const tasks = res.data.plan?.tasks;
    if (!Array.isArray(tasks) || tasks.length === 0) throw new Error('No daily tasks generated');
    dailyPlanTaskId = tasks[0].id;
    if (!dailyPlanTaskId) throw new Error('First daily task has no ID');
    console.log(`   Generated ${tasks.length} daily tasks for role: ${res.data.plan.targetRole}`);
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
    if (isProviderFailure(res)) {
      return { blocked: true, reason: `OpenRouter returned ${res.data.code}; no AI analysis was fabricated.` };
    }
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    if (typeof res.data.overallMatch !== 'number') throw new Error('Missing overallMatch');
    console.log(`   JD Match: ${res.data.overallMatch}%, Matched Skills: ${res.data.matchedSkills.join(', ')}`);
  });

  // 6. Analytics History Endpoint
  await test('Progress Analytics History (GET /api/career/analytics/history)', async () => {
    const res = await request('GET', '/api/career/analytics/history');
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    if (!res.data.user || !res.data.coding || !res.data.interviews) throw new Error('Incomplete analytics payload');
    console.log(`   Analytics loaded: ${res.data.coding.acceptedCount} accepted problems, ${res.data.interviews.totalSessions} interviews`);
  });

  // 7. Coding Sandbox Execution
  await test('Coding Sandbox Execution (POST /api/coding/run)', async () => {
    const sampleCode = "function solution(nums, target) { return [0, 1]; }";
    const res = await request('POST', '/api/coding/run', {
      code: sampleCode,
      testInput: "[2, 7, 11, 15], 9"
    });
    if (res.status === 503 && res.data.code === 'CODE_EXECUTION_NOT_CONFIGURED') {
      return { blocked: true, reason: 'No isolated Judge0-compatible execution service is configured.' };
    }
    if (res.status !== 200 || !res.data.success) throw new Error(`Execution error: ${res.data.error}`);
    console.log(`   Sandbox Execution Output: ${res.data.output}`);
  });

  await test('Coding problems omit hidden cases, solutions, and unverified company claims', async () => {
    const res = await request('GET', '/api/coding/problems');
    if (res.status !== 200 || !Array.isArray(res.data) || res.data.length === 0) {
      throw new Error(`Status ${res.status}`);
    }
    if (res.data.some(problem => 'solutionCode' in problem || 'companies' in problem ||
      (problem.testCases || []).some(testCase => testCase.isHidden))) {
      throw new Error('A solution, hidden test case, or unverified company claim was exposed.');
    }
  });

  await test('Coding catalog titles are unique and verified LeetCode links are safe', async () => {
    const res = await request('GET', '/api/coding/problems');
    const titles = res.data.map(problem => problem.title);
    if (new Set(titles).size !== titles.length) throw new Error('Duplicate coding problem titles were returned.');
    for (const problem of res.data) {
      if (problem.officialUrl &&
        (!/^https:\/\/leetcode\.com\/problems\/[a-z0-9-]+\/$/.test(problem.officialUrl) ||
          problem.officialSource !== 'LeetCode')) {
        throw new Error(`Unsafe or unattributed official URL for ${problem.title}.`);
      }
    }
  });

  await test('Coding catalog server search and difficulty/topic filters work', async () => {
    const search = await request('GET', '/api/coding/problems?search=Two%20Sum');
    const difficulty = await request('GET', '/api/coding/problems?difficulty=easy');
    const topic = await request('GET', '/api/coding/problems?topic=strings');
    const empty = await request('GET', '/api/coding/problems?search=not-a-problem');
    const invalid = await request('GET', '/api/coding/problems?difficulty=unsupported');
    if (search.status !== 200 || search.data.length !== 1 || search.data[0].title !== 'Two Sum' ||
      difficulty.status !== 200 || !difficulty.data.length ||
      !difficulty.data.every(problem => problem.difficulty?.toLowerCase() === 'easy') ||
      topic.status !== 200 || !topic.data.length ||
      !topic.data.every(problem => problem.category?.toLowerCase() === 'strings') ||
      empty.status !== 200 || empty.data.length !== 0 || invalid.status !== 400) {
      throw new Error('One or more catalog filters returned unexpected results.');
    }
  });

  await test('All ten new coding challenges execute their public examples in the sandbox', async () => {
    if (!process.env.CODE_EXECUTION_API_URL) {
      return { blocked: true, reason: 'No isolated Judge0-compatible execution service is configured.' };
    }
    const solutions = {
      '7': 'function solution(prices) { let low = Infinity, gain = 0; for (const price of prices) { gain = Math.max(gain, price - low); low = Math.min(low, price); } return gain; }',
      '8': 'function solution(nums, target) { let left = 0, right = nums.length - 1; while (left <= right) { const mid = Math.floor((left + right) / 2); if (nums[mid] === target) return mid; if (nums[mid] < target) left = mid + 1; else right = mid - 1; } return -1; }',
      '9': 'function solution(first, second) { const result = []; let i = 0, j = 0; while (i < first.length || j < second.length) { if (j >= second.length || (i < first.length && first[i] <= second[j])) result.push(first[i++]); else result.push(second[j++]); } return result; }',
      '10': 'function solution(text) { const counts = new Map(); for (const char of text) counts.set(char, (counts.get(char) || 0) + 1); return [...text].findIndex(char => counts.get(char) === 1); }',
      '11': 'function solution(text) { const last = new Map(); let start = 0, longest = 0; for (let i = 0; i < text.length; i++) { if (last.has(text[i])) start = Math.max(start, last.get(text[i]) + 1); last.set(text[i], i); longest = Math.max(longest, i - start + 1); } return longest; }',
      '12': 'function solution(nums, steps) { const shift = steps % nums.length; return shift === 0 ? [...nums] : nums.slice(-shift).concat(nums.slice(0, -shift)); }',
      '13': 'function solution(intervals) { intervals.sort((a, b) => a[0] - b[0]); const result = []; for (const current of intervals) { const last = result[result.length - 1]; if (!last || current[0] > last[1]) result.push([...current]); else last[1] = Math.max(last[1], current[1]); } return result; }',
      '14': 'function solution(grid) { let groups = 0; for (let r = 0; r < grid.length; r++) for (let c = 0; c < grid[r].length; c++) if (grid[r][c] === "1") { groups++; const stack = [[r,c]]; grid[r][c] = "0"; while (stack.length) { const [y,x] = stack.pop(); for (const [dy,dx] of [[1,0],[-1,0],[0,1],[0,-1]]) { const ny=y+dy,nx=x+dx; if (ny>=0&&ny<grid.length&&nx>=0&&nx<grid[ny].length&&grid[ny][nx]==="1") { grid[ny][nx]="0"; stack.push([ny,nx]); } } } } return groups; }',
      '15': 'function solution(n) { let previous = 1, current = 1; for (let step = 2; step <= n; step++) { const next = previous + current; previous = current; current = next; } return current; }',
      '16': 'function solution(coins, amount) { const best = Array(amount + 1).fill(Infinity); best[0] = 0; for (let value = 1; value <= amount; value++) for (const coin of coins) if (coin <= value) best[value] = Math.min(best[value], best[value - coin] + 1); return best[amount] === Infinity ? -1 : best[amount]; }'
    };
    for (const problem of additionalCodingProblems) {
      const code = solutions[problem.id];
      if (!code) throw new Error(`No sandbox fixture exists for ${problem.title}.`);
      for (const sample of problem.testCases.filter(testCase => !testCase.isHidden)) {
        const execution = await request('POST', '/api/coding/run', {
          code,
          testInput: sample.input
        });
        const expected = JSON.parse(sample.expectedOutput);
        let actual;
        try {
          actual = JSON.parse(execution.data.output.trim().split(/\r?\n/).pop());
        } catch {
          actual = null;
        }
        if (execution.status !== 200 || !execution.data.success ||
          JSON.stringify(actual) !== JSON.stringify(expected)) {
          throw new Error(`${problem.title} sample failed: ${execution.data.output || execution.data.error}`);
        }
      }
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
    const problem = (problems.data || []).find(item => item.title === 'Two Sum');
    if (!problem) throw new Error('Two Sum practice problem is unavailable.');
    const problemId = problem._id || problem.id;
    const statsBefore = await request('GET', '/api/coding/stats');
    const solution = {
      code: 'function solution(nums, target) { const seen = new Map(); for (let i = 0; i < nums.length; i++) { const complement = target - nums[i]; if (seen.has(complement)) return [seen.get(complement), i]; seen.set(nums[i], i); } return []; }',
      language: 'javascript'
    };
    const submission = await request('POST', `/api/coding/submit/${problemId}`, solution);
    if (submission.status === 503 && submission.data.code === 'CODE_EXECUTION_NOT_CONFIGURED') {
      return { blocked: true, reason: 'No isolated Judge0-compatible execution service is configured.' };
    }
    if (submission.status !== 200 || submission.data.status !== 'accepted') {
      throw new Error(`Submission status ${submission.status}: ${submission.data.message || submission.data.status}`);
    }
    const repeatedSubmission = await request('POST', `/api/coding/submit/${problemId}`, solution);
    if (repeatedSubmission.status !== 200 || repeatedSubmission.data.status !== 'accepted') {
      throw new Error(`Repeated submission status ${repeatedSubmission.status}.`);
    }
    const history = await request('GET', '/api/coding/submissions');
    const acceptedAttempts = (history.data || []).filter(item =>
      String(item.problemId) === String(problemId) && item.status === 'accepted');
    const statsAfter = await request('GET', '/api/coding/stats');
    if (history.status !== 200 || acceptedAttempts.length < 2 ||
      submission.data.xpEarned !== submission.data.score ||
      repeatedSubmission.data.xpEarned !== 0 ||
      statsAfter.data.totalSolved !== statsBefore.data.totalSolved + 1 ||
      statsAfter.data.totalPoints !== statsBefore.data.totalPoints + submission.data.score) {
      throw new Error('Repeated accepted submissions were not retained with one solved count and one XP award.');
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
      if (res.data.generationMode !== 'openrouter' ||
          res.data.questions.some(question => question.source !== 'openrouter')) {
        throw new Error('Interview questions were not generated by OpenRouter.');
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
    if (res.status === 200 && res.data.reply && res.data.source === 'openrouter' && res.data.model) {
      console.log(`   Real provider: ${res.data.source} (${res.data.model})`);
      console.log(`   Assistant Response Preview: "${res.data.reply.slice(0, 60)}..."`);
      const status = await request('GET', '/api/career/assistant/status');
      if (status.status !== 200 || status.data.ready !== true ||
          status.data.provider !== 'OpenRouter' || !status.data.model ||
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
