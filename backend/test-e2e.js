const http = require('http');

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : null;
    const reqHeaders = { ...headers };
    if (postData) {
      reqHeaders['Content-Type'] = 'application/json';
      reqHeaders['Content-Length'] = Buffer.byteLength(postData);
    }
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
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
  console.log('🧪 Starting Full Product Verification Suite...\n');
  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`✅ PASS: ${name}`);
      passed++;
    } catch(e) {
      console.error(`❌ FAIL: ${name} -> ${e.message}`);
      failed++;
    }
  }

  // 1. Health check
  await test('Health check endpoint', async () => {
    const res = await request('GET', '/api/health');
    if (res.status !== 200 || res.data.status !== 'ok') throw new Error(`Status ${res.status}`);
  });

  // 2. Readiness Endpoint
  await test('Dynamic Readiness Endpoint (GET /api/career/readiness)', async () => {
    const res = await request('GET', '/api/career/readiness');
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    if (typeof res.data.overallScore !== 'number') throw new Error('Missing overallScore');
    console.log(`   Readiness Score: ${res.data.overallScore}% (${res.data.statusBadge})`);
  });

  // 3. Daily Plan Endpoint
  await test('Daily Plan Endpoint (GET /api/career/daily-plan)', async () => {
    const res = await request('GET', '/api/career/daily-plan');
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    const tasks = res.data.plan?.tasks;
    if (!Array.isArray(tasks) || tasks.length === 0) throw new Error('No daily tasks generated');
    console.log(`   Generated ${tasks.length} daily tasks for role: ${res.data.plan.targetRole}`);
  });

  // 4. Daily Plan Task Update
  await test('Daily Plan Task Update (PUT /api/career/daily-plan/task/task-code-1)', async () => {
    const res = await request('PUT', '/api/career/daily-plan/task/task-code-1', { completed: true });
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
    if (res.status !== 200 || !res.data.success) throw new Error(`Execution error: ${res.data.error}`);
    console.log(`   Sandbox Execution Output: ${res.data.output}`);
  });

  // 8. AI Mock Interview Generation
  await test('AI Mock Interview Generation (POST /api/interview/generate)', async () => {
    const res = await request('POST', '/api/interview/generate', {
      role: 'Full Stack Developer',
      type: 'Technical',
      difficulty: 'medium'
    });
    if (res.status !== 200 || !Array.isArray(res.data.questions) || res.data.questions.length === 0) {
      throw new Error(`Generation error: status ${res.status}`);
    }
    console.log(`   Generated ${res.data.questions.length} interview questions`);
  });

  // 9. Career Assistant AI Endpoint
  await test('Career Assistant AI Chat (POST /api/career/assistant)', async () => {
    const res = await request('POST', '/api/career/assistant', {
      message: 'What are the top 3 React patterns to review for SDE interviews?'
    });
    if (res.status !== 200 || !res.data.reply) throw new Error(`Status ${res.status}`);
    console.log(`   Assistant Response Preview: "${res.data.reply.slice(0, 60)}..."`);
  });

  // 10. Verify All 14 Page URLs respond with HTTP 200
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
    '/assistant'
  ];

  console.log('\n📄 Verifying all 14 Dedicated Web Page URLs:');
  for (const page of pages) {
    await test(`Page URL: ${page}`, async () => {
      const res = await request('GET', page);
      if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
      if (!res.data.includes('CareerHub AI')) throw new Error('HTML content invalid');
    });
  }

  console.log(`\n========================================`);
  console.log(`🎯 Verification Summary: ${passed} Passed, ${failed} Failed`);
  console.log(`========================================\n`);

  if (failed > 0) process.exit(1);
}

runTests();
