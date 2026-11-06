require('./utils/loadEnv')();

const assert = require('node:assert/strict');
const {
    executeProblemTestCases,
    executeSource,
    getAvailableLanguages
} = require('./utils/codeExecutionService');

const expectedLanguageNames = ['python', 'javascript', 'java', 'c', 'cpp'];
const originalFetch = global.fetch;
let tokenPolls = 0;
let passed = 0;
let failed = 0;
let blocked = 0;

async function check(name, run) {
    try {
        await run();
        passed++;
        console.log(`PASS: ${name}`);
    } catch (error) {
        failed++;
        console.error(`FAIL: ${name} — ${error.code || error.name || 'Error'}: ${error.message}`);
    }
}

function assertAccepted(result, output) {
    assert.equal(result.status, 'accepted', result.statusDescription || result.stderr || result.compileOutput);
    if (output !== undefined) assert.equal(result.stdout.trim(), output);
}

async function run() {
    if (!process.env.CODE_EXECUTION_API_URL?.trim()) {
        blocked++;
        console.log('BLOCKED: CODE_EXECUTION_API_URL is not configured; no provider request was made.');
        process.exitCode = 2;
        return;
    }

    global.fetch = async (...args) => {
        const requestUrl = new URL(args[0]);
        if (/\/submissions\/[^/]+$/.test(requestUrl.pathname) && args[1]?.method === 'GET') {
            tokenPolls++;
        }
        return originalFetch(...args);
    };

    try {
        let languages;
        try {
            languages = await getAvailableLanguages({ refresh: true });
        } catch (error) {
            throw new Error(`Local Judge0 language discovery failed (${error.code || 'unknown'}): ${error.message}`);
        }
        const available = new Set(languages.map(language => language.value));
        for (const language of expectedLanguageNames) {
            if (!available.has(language)) {
                failed++;
                console.error(`FAIL: ${language} is missing from the actual local Judge0 language list.`);
            } else {
                passed++;
                console.log(`PASS: ${language} is present in the actual local Judge0 language list.`);
            }
        }

        const helloPrograms = {
            python: 'print("Hello, World!")',
            javascript: 'console.log("Hello, World!");',
            java: 'public class Main { public static void main(String[] args) { System.out.println("Hello, World!"); } }',
            c: '#include <stdio.h>\nint main(void) { puts("Hello, World!"); return 0; }',
            cpp: '#include <iostream>\nint main() { std::cout << "Hello, World!" << std::endl; return 0; }'
        };
        for (const [language, code] of Object.entries(helloPrograms)) {
            if (!available.has(language)) {
                blocked++;
                console.log(`BLOCKED: ${language} Hello World — language unavailable on configured runner.`);
                continue;
            }
            await check(`${language} Hello World executed by Judge0`, async () => {
                assertAccepted(await executeSource(code, { language }), 'Hello, World!');
            });
        }

        await check('stdin is delivered and stdout is returned', async () => {
            const result = await executeSource(
                'import sys; print(sys.stdin.read().strip())',
                { language: 'python', stdin: 'CareerHub stdin check' }
            );
            assertAccepted(result, 'CareerHub stdin check');
        });

        await check('Java compilation errors are reported by Judge0', async () => {
            const result = await executeSource('public class Main {', { language: 'java' });
            assert.equal(result.status, 'compilation_error', result.statusDescription);
            assert.ok(result.compileOutput || result.stderr, 'Provider returned no compiler diagnostic.');
        });

        await check('JavaScript runtime errors are reported by Judge0', async () => {
            const result = await executeSource('throw new Error("runtime-check");', { language: 'javascript' });
            assert.equal(result.status, 'runtime_error', result.statusDescription);
            assert.match(result.stderr, /runtime-check/);
        });

        await check('CPU time limit is enforced by Judge0', async () => {
            const result = await executeSource('while (true) {}', {
                language: 'javascript',
                timeLimit: 1
            });
            assert.equal(result.status, 'time_limit', result.statusDescription);
        });

        await check('memory limit is enforced by Judge0', async () => {
            const result = await executeSource(
                'x = bytearray(256 * 1024 * 1024)\nprint(len(x))',
                { language: 'python', memoryLimit: 32, timeLimit: 2 }
            );
            assert.equal(result.status, 'memory_limit', result.statusDescription || result.stderr);
        });

        await check('multiple problem cases run and hidden outputs are omitted', async () => {
            const result = await executeProblemTestCases(
                'function solution(nums, target) { const seen = new Map(); for (let i = 0; i < nums.length; i++) { const other = target - nums[i]; if (seen.has(other)) return [seen.get(other), i]; seen.set(nums[i], i); } return []; }',
                [
                    { input: '[2,7,11,15], 9', expectedOutput: '[0,1]', isHidden: false },
                    { input: '[3,3], 6', expectedOutput: '[0,1]', isHidden: true }
                ]
            );
            assert.equal(result.allPassed, true);
            assert.equal(result.results.length, 2);
            assert.equal('expectedOutput' in result.results[1], false);
            assert.equal('actualOutput' in result.results[1], false);
        });

        await check('Judge0 asynchronous submission tokens were polled', async () => {
            assert.ok(tokenPolls > 0, 'No GET /submissions/{token} poll was observed.');
        });
    } catch (error) {
        failed++;
        console.error(`FAIL: Local Judge0 integration setup — ${error.code || error.name || 'Error'}: ${error.message}`);
    } finally {
        global.fetch = originalFetch;
        console.log(`Judge0 real integration results: ${passed} passed, ${failed} failed, ${blocked} blocked.`);
        if (failed > 0 || blocked > 0) process.exitCode = 2;
    }
}

run().catch(error => {
    global.fetch = originalFetch;
    console.error(`Judge0 integration runner failed: ${error.message}`);
    process.exitCode = 1;
});
