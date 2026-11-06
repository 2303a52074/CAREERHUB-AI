const assert = require('node:assert/strict');
const executionService = require('./utils/codeExecutionService');

const originalFetch = global.fetch;
const originalUrl = process.env.CODE_EXECUTION_API_URL;
const originalKey = process.env.CODE_EXECUTION_API_KEY;
const originalKeyHeader = process.env.CODE_EXECUTION_API_KEY_HEADER;

function response(payload, status = 200) {
    return {
        ok: status >= 200 && status < 300,
        status,
        json: async () => payload
    };
}

const providerLanguages = [
    { id: 109, name: 'Python (3.8.1)' },
    { id: 63, name: 'JavaScript (Node.js 12.14.0)' },
    { id: 62, name: 'Java (OpenJDK 13.0.1)' },
    { id: 50, name: 'C (GCC 9.2.0)' },
    { id: 54, name: 'C++ (GCC 9.2.0)' },
    { id: 51, name: 'C# (Mono 6.6.0.161)' },
    { id: 60, name: 'Go (1.13.5)' }
];

async function run() {
    try {
        delete process.env.CODE_EXECUTION_API_URL;
        delete process.env.CODE_EXECUTION_API_KEY;
        delete process.env.CODE_EXECUTION_API_KEY_HEADER;
        assert.equal(executionService.isConfigured(), false);
        await assert.rejects(
            executionService.executeJavaScript('process.exit(1)'),
            error => error.code === 'CODE_EXECUTION_NOT_CONFIGURED' && error.status === 503
        );

        process.env.CODE_EXECUTION_API_URL = 'http://remote-runner.invalid';
        await assert.rejects(
            executionService.executeJavaScript(''),
            error => error.code === 'CODE_EXECUTION_INVALID_INPUT'
        );
        await assert.rejects(
            executionService.executeJavaScript('process.exit(1)'),
            error => error.code === 'CODE_EXECUTION_CONFIG_INVALID'
        );

        process.env.CODE_EXECUTION_API_URL = 'https://judge0.example/api/v1';
        await assert.rejects(
            executionService.getAvailableLanguages(),
            error => error.code === 'CODE_EXECUTION_CONFIG_INVALID'
        );

        process.env.CODE_EXECUTION_API_URL = 'http://127.0.0.1:2358';
        process.env.CODE_EXECUTION_API_KEY = 'test-secret';
        let capturedUrl;
        let capturedOptions;
        global.fetch = async (url, options) => {
            capturedUrl = new URL(url);
            if (capturedUrl.pathname.endsWith('/languages')) {
                return response(providerLanguages);
            }
            capturedOptions = options;
            return response({
                status: { id: 3, description: 'Accepted' },
                stdout: '[0,1]\n',
                stderr: null,
                compile_output: null,
                time: '0.01',
                memory: 1234
            }, 201);
        };
        const execution = await executionService.executeJavaScript(
            executionService.makeFunctionCallSource('function solution(nums, target) { return [0, 1]; }', [[2, 7], 9])
        );
        assert.equal(capturedUrl.pathname, '/submissions');
        assert.equal(capturedUrl.searchParams.get('wait'), null);
        assert.equal(capturedOptions.headers['X-Auth-Token'], 'test-secret');
        assert.equal('X-RapidAPI-Key' in capturedOptions.headers, false);
        const requestBody = JSON.parse(capturedOptions.body);
        assert.equal(requestBody.language_id, 63);
        assert.equal(requestBody.memory_limit, 256 * 1024);
        assert.match(requestBody.source_code, /function solution/);
        assert.equal(execution.status, 'accepted');
        assert.equal(execution.stdout, '[0,1]\n');

        const languages = await executionService.getAvailableLanguages();
        assert.deepEqual(languages.map(language => language.value), [
            'python', 'javascript', 'java', 'c', 'cpp', 'csharp', 'go'
        ]);
        assert.equal(languages.find(language => language.value === 'python').id, 109);

        let calls = 0;
        const submissions = [];
        global.fetch = async (url, options) => {
            calls++;
            const urlValue = new URL(url);
            if (urlValue.pathname.endsWith('/languages')) return response(providerLanguages);
            if (options.method === 'POST') {
                submissions.push(JSON.parse(options.body));
                return response({ token: 'test-token' }, 201);
            }
            assert.match(String(url), /\/submissions\/test-token\?/);
            assert.equal(urlValue.searchParams.get('wait'), null);
            return response({
                token: 'test-token',
                status: { id: 3, description: 'Accepted' },
                stdout: '[0,1]\n'
            });
        };
        const testCases = await executionService.executeProblemTestCases(
            'function solution(nums, target) { return [0, 1]; }',
            [
                { input: '[2,7], 9', expectedOutput: '[0,1]', isHidden: false },
                { input: '[1,2], 3', expectedOutput: '[0,1]', isHidden: true }
            ]
        );
        assert.equal(calls, 4);
        assert.equal(submissions[0].language_id, 63);
        assert.equal('wait' in submissions[0], false);
        assert.equal(testCases.allPassed, true);
        assert.equal(testCases.results.length, 2);
        assert.equal('expectedOutput' in testCases.results[1], false);
        assert.equal('actualOutput' in testCases.results[1], false);
        assert.deepEqual(executionService.parseInputArguments('[1,2], 3'), [[1, 2], 3]);
        assert.equal(executionService.argumentsToStdin([[1, 2], 3]), '[1,2]\n3');
        assert.equal(executionService.outputMatches('[1,2]\n', '[1,2]'), true);

        let pythonBody;
        let pythonHeaders;
        process.env.CODE_EXECUTION_API_KEY_HEADER = 'X-Local-Runner-Key';
        global.fetch = async (url, options) => {
            const urlValue = new URL(url);
            if (urlValue.pathname.endsWith('/languages')) return response(providerLanguages);
            pythonBody = JSON.parse(options.body);
            pythonHeaders = options.headers;
            return response({
                status: { id: 3, description: 'Accepted' },
                stdout: '[0,1]\n'
            }, 201);
        };
        const pythonResult = await executionService.executeProblemTestCases(
            'print("[0,1]")',
            [{ input: '[2,7], 9', expectedOutput: '[0,1]', isHidden: false }],
            { language: 'python' }
        );
        assert.equal(pythonBody.language_id, 109);
        assert.equal(pythonBody.stdin, '[2,7]\n9');
        assert.equal(pythonHeaders['X-Local-Runner-Key'], 'test-secret');
        assert.equal('X-RapidAPI-Key' in pythonHeaders, false);
        assert.equal(pythonResult.allPassed, true);

        let evaluatedCaseCount = 0;
        global.fetch = async (url, options) => {
            const urlValue = new URL(url);
            if (urlValue.pathname.endsWith('/languages')) return response(providerLanguages);
            evaluatedCaseCount++;
            return response({
                status: { id: 3, description: 'Accepted' },
                stdout: evaluatedCaseCount === 1 ? 'incorrect\n' : '2\n'
            }, 201);
        };
        const allCases = await executionService.executeProblemTestCases(
            'print("result")',
            [
                { input: '1', expectedOutput: '1', isHidden: false },
                { input: '2', expectedOutput: '2', isHidden: true }
            ],
            { language: 'python' }
        );
        assert.equal(evaluatedCaseCount, 2);
        assert.equal(allCases.allPassed, false);
        assert.equal(allCases.results.length, 2);
        assert.equal('actualOutput' in allCases.results[1], false);
        assert.equal('expectedOutput' in allCases.results[1], false);

        await assert.rejects(
            executionService.executeSource('print(1)', { language: 'ruby' }),
            error => error.code === 'CODE_EXECUTION_LANGUAGE_UNSUPPORTED'
        );

        global.fetch = async () => response({}, 401);
        await assert.rejects(
            executionService.executeJavaScript('function solution() {}'),
            error => error.code === 'CODE_EXECUTION_AUTH_ERROR'
        );
        global.fetch = async () => { throw new Error('network failure'); };
        await assert.rejects(
            executionService.executeJavaScript('function solution() {}'),
            error => error.code === 'CODE_EXECUTION_UNAVAILABLE'
        );

        console.log('Code execution service tests passed: dynamic language discovery, async token polling, limits, stdin conversion, output checks, and hidden-case privacy.');
    } finally {
        global.fetch = originalFetch;
        if (originalUrl === undefined) delete process.env.CODE_EXECUTION_API_URL;
        else process.env.CODE_EXECUTION_API_URL = originalUrl;
        if (originalKey === undefined) delete process.env.CODE_EXECUTION_API_KEY;
        else process.env.CODE_EXECUTION_API_KEY = originalKey;
        if (originalKeyHeader === undefined) delete process.env.CODE_EXECUTION_API_KEY_HEADER;
        else process.env.CODE_EXECUTION_API_KEY_HEADER = originalKeyHeader;
    }
}

run().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
