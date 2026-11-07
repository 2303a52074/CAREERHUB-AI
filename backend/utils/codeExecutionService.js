const { spawn } = require('child_process');
const { randomUUID } = require('crypto');

const MAX_SOURCE_LENGTH = 20000;
const MAX_INPUT_LENGTH = 5000;
const MAX_CASES = 30;
const MAX_DOCKER_OUTPUT = 1024 * 1024;
const DOCKER_TIMEOUT_MS = 45000;
const LANGUAGE_DEFINITIONS = [
    { value: 'python', label: 'Python 3', editorLanguage: 'python', starterCode: 'import sys\n\ndef solve(data):\n    # Parse the provided input and return the required result.\n    return None\n\nif __name__ == \"__main__\":\n    print(solve(sys.stdin.read()))\n' },
    { value: 'java', label: 'Java 17', editorLanguage: 'java', starterCode: 'import java.io.*;\nimport java.nio.charset.StandardCharsets;\n\npublic class Main {\n    public static void main(String[] args) throws Exception {\n        String input = new String(System.in.readAllBytes(), StandardCharsets.UTF_8).trim();\n        // Parse the provided input and print the required result.\n        System.out.println(input);\n    }\n}\n' },
    { value: 'cpp', label: 'C++17', editorLanguage: 'cpp', starterCode: '#include <iostream>\n#include <string>\nusing namespace std;\n\nint main() {\n    string input((istreambuf_iterator<char>(cin)), istreambuf_iterator<char>());\n    // Parse the provided input and print the required result.\n    cout << input << \"\\\\n\";\n    return 0;\n}\n' },
    { value: 'javascript', label: 'JavaScript (Node.js)', editorLanguage: 'javascript', starterCode: 'const fs = require(\"fs\");\nconst input = fs.readFileSync(0, \"utf8\").trim();\n// Parse the provided input and print the required result.\nconsole.log(input);\n' }
];
const LANGUAGE_VALUES = new Set(LANGUAGE_DEFINITIONS.map(item => item.value));
let dockerStatusCache = { checkedAt: 0, available: false, message: 'Docker status has not been checked.' };

function createCodeExecutionError(code, status, message) {
    const error = new Error(message);
    error.code = code;
    error.status = status;
    return error;
}

function dockerImage() {
    const image = process.env.CAREERHUB_RUNNER_IMAGE?.trim() || 'careerhub-code-runner:local';
    if (!/^[a-zA-Z0-9][a-zA-Z0-9._/:@-]{0,180}$/.test(image)) {
        throw createCodeExecutionError('CODE_EXECUTION_CONFIG_INVALID', 503,
            'The configured local runner image name is invalid.');
    }
    return image;
}

function validateSource(sourceCode, stdin = '') {
    if (typeof sourceCode !== 'string' || !sourceCode.trim() ||
        Buffer.byteLength(sourceCode, 'utf8') > MAX_SOURCE_LENGTH) {
        throw createCodeExecutionError('CODE_EXECUTION_INVALID_INPUT', 400,
            `Source code must contain between 1 and ${MAX_SOURCE_LENGTH} characters.`);
    }
    if (typeof stdin !== 'string' || Buffer.byteLength(stdin, 'utf8') > MAX_INPUT_LENGTH) {
        throw createCodeExecutionError('CODE_EXECUTION_INVALID_INPUT', 413,
            `Standard input must be ${MAX_INPUT_LENGTH} bytes or fewer.`);
    }
}

function validateLanguage(language) {
    if (typeof language !== 'string' || !LANGUAGE_VALUES.has(language)) {
        throw createCodeExecutionError('CODE_EXECUTION_LANGUAGE_UNSUPPORTED', 400,
            'Choose Python, Java, C++, or JavaScript.');
    }
}

function dockerArgs(image, containerName) {
    const testRunId = process.env.CAREERHUB_RUNNER_TEST_RUN_ID;
    if (testRunId && !/^[a-zA-Z0-9-]{1,64}$/.test(testRunId)) {
        throw createCodeExecutionError('CODE_EXECUTION_CONFIG_INVALID', 503,
            'The local runner test identifier is invalid.');
    }
    return [
        'run', '--rm', '--interactive',
        '--name', containerName,
        ...(testRunId ? ['--label', `careerhub.test-run=${testRunId}`] : []),
        ...runnerSecurityOptions(),
        image
    ];
}

function runnerSecurityOptions() {
    return [
        '--network=none',
        '--cpus=0.5',
        '--memory=256m',
        '--memory-swap=256m',
        '--pids-limit=64',
        '--read-only',
        '--tmpfs', '/tmp:rw,exec,nosuid,nodev,size=128m',
        '--user=10001:10001',
        '--security-opt=no-new-privileges',
        '--cap-drop=ALL',
        '--ulimit', 'cpu=8:8',
        '--ulimit', 'fsize=1048576:1048576',
        '--ulimit', 'nofile=64:64'
    ];
}

function runDocker(request, { timeoutMs = DOCKER_TIMEOUT_MS } = {}) {
    const image = dockerImage();
    const containerName = `careerhub-run-${randomUUID()}`;
    return new Promise((resolve, reject) => {
        const child = spawn('docker', dockerArgs(image, containerName), {
            shell: false,
            windowsHide: true,
            stdio: ['pipe', 'pipe', 'pipe']
        });
        let stdout = '';
        let stderr = '';
        let outputSize = 0;
        let settled = false;
        const finish = (error, result) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            if (error) reject(error);
            else resolve(result);
        };
        const timer = setTimeout(() => {
            child.kill();
            const cleanup = spawn('docker', ['kill', containerName], {
                shell: false,
                windowsHide: true,
                stdio: 'ignore'
            });
            cleanup.on('error', () => {});
            finish(createCodeExecutionError('CODE_EXECUTION_TIMEOUT', 504,
                'The local isolated execution exceeded its time limit.'));
        }, timeoutMs);

        child.stdout.on('data', chunk => {
            outputSize += chunk.length;
            if (outputSize > MAX_DOCKER_OUTPUT) {
                child.kill();
                const cleanup = spawn('docker', ['kill', containerName], {
                    shell: false,
                    windowsHide: true,
                    stdio: 'ignore'
                });
                cleanup.on('error', () => {});
                finish(createCodeExecutionError('CODE_EXECUTION_OUTPUT_LIMIT', 502,
                    'The local execution service returned too much output.'));
                return;
            }
            stdout += chunk.toString('utf8');
        });
        child.stderr.on('data', chunk => {
            if (stderr.length < 8192) stderr += chunk.toString('utf8').slice(0, 8192 - stderr.length);
        });
        child.on('error', error => {
            finish(createCodeExecutionError(
                'CODE_EXECUTION_DOCKER_UNAVAILABLE',
                503,
                error.code === 'ENOENT'
                    ? 'Docker CLI is not installed. Install Docker Desktop and build the CareerHub runner image.'
                    : 'Could not start Docker. Verify Docker Desktop is running and accessible to the application.'
            ));
        });
        child.on('close', code => {
            if (settled) return;
            if (code !== 0) {
                if (/failed to connect to the docker (api|daemon)|cannot connect to the docker daemon/i.test(stderr)) {
                    finish(createCodeExecutionError(
                        'CODE_EXECUTION_DOCKER_UNAVAILABLE',
                        503,
                        'Docker is installed but its daemon is not running or accessible. Start Docker Desktop and retry.'
                    ));
                    return;
                }
                if (/unable to find image|pull access denied|no such image/i.test(stderr)) {
                    finish(createCodeExecutionError(
                        'CODE_EXECUTION_IMAGE_MISSING',
                        503,
                        'The local CareerHub runner image is not built. Build it using the Docker command in README.md.'
                    ));
                    return;
                }
                finish(createCodeExecutionError(
                    'CODE_EXECUTION_RUNNER_UNAVAILABLE',
                    503,
                    'The local runner image is unavailable or failed to start. Build it using the documented Docker command.'
                ));
                return;
            }
            let result;
            try {
                result = JSON.parse(stdout);
            } catch {
                finish(createCodeExecutionError('CODE_EXECUTION_INVALID_RESPONSE', 502,
                    'The local runner returned an invalid response.'));
                return;
            }
            finish(null, result);
        });
        child.stdin.on('error', () => {});
        child.stdin.end(JSON.stringify(request));
    });
}

async function checkDockerAvailability({ refresh = false } = {}) {
    if (!refresh && Date.now() - dockerStatusCache.checkedAt < 5000) return dockerStatusCache;
    try {
        const result = await runDocker({ healthCheck: true }, { timeoutMs: 10000 });
        dockerStatusCache = {
            checkedAt: Date.now(),
            available: result.status === 'ready',
            message: result.status === 'ready'
                ? `Docker is ready with image ${dockerImage()}.`
                : result.message || 'The CareerHub runner image is not ready.'
        };
    } catch (error) {
        dockerStatusCache = { checkedAt: Date.now(), available: false, message: error.message };
    }
    return dockerStatusCache;
}

function getAvailableLanguages() {
    return LANGUAGE_DEFINITIONS.map(language => ({ ...language }));
}

function getLanguageStarterCode(language) {
    return LANGUAGE_DEFINITIONS.find(item => item.value === language)?.starterCode || '';
}

function parseInputArguments(rawInput) {
    if (typeof rawInput !== 'string' || !rawInput.trim()) return [];
    try {
        return JSON.parse(`[${rawInput}]`);
    } catch {
        try {
            const parsed = JSON.parse(rawInput);
            return Array.isArray(parsed) ? parsed : [parsed];
        } catch {
            throw createCodeExecutionError('CODE_EXECUTION_INVALID_INPUT', 400,
                'Sample input must be valid JSON or JSON argument data.');
        }
    }
}

function argumentsToStdin(args) {
    if (!Array.isArray(args)) {
        throw createCodeExecutionError('CODE_EXECUTION_INVALID_INPUT', 400,
            'Problem input must be valid JSON argument data.');
    }
    return args.map(value => JSON.stringify(value)).join('\n');
}

function makeFunctionCallSource(code, args) {
    return `${code}
const __careerhubArgs = ${JSON.stringify(args)};
const __careerhubFunction = typeof solution === 'function' ? solution
    : typeof twoSum === 'function' ? twoSum : null;
if (!__careerhubFunction) throw new Error("Function 'solution' is not defined.");
process.stdout.write(JSON.stringify(__careerhubFunction(...__careerhubArgs)) + '\\n');
`;
}

function valuesEqual(actual, expected) {
    if (actual === expected) return true;
    if (Array.isArray(actual) && Array.isArray(expected)) {
        return actual.length === expected.length && actual.every((value, index) => valuesEqual(value, expected[index]));
    }
    if (actual && expected && typeof actual === 'object' && typeof expected === 'object') {
        const actualKeys = Object.keys(actual).sort();
        const expectedKeys = Object.keys(expected).sort();
        return actualKeys.length === expectedKeys.length &&
            actualKeys.every((key, index) => key === expectedKeys[index] && valuesEqual(actual[key], expected[key]));
    }
    return false;
}

function outputMatches(actualOutput, expectedOutput) {
    const actual = String(actualOutput || '').trim().split(/\r?\n/).pop() || '';
    try {
        return valuesEqual(JSON.parse(actual), JSON.parse(expectedOutput));
    } catch {
        return actual === String(expectedOutput).trim();
    }
}

function mapStatus(status) {
    if (status === 'completed') return 'accepted';
    if (['wrong_answer', 'time_limit', 'memory_limit', 'compilation_error', 'runtime_error', 'internal_error'].includes(status)) {
        return status === 'internal_error' ? 'runner_error' : status;
    }
    return 'runner_error';
}

async function executeBatch(sourceCode, {
    language = 'javascript',
    cases,
    timeLimit = 2,
    memoryLimit = 256
} = {}) {
    validateSource(sourceCode);
    validateLanguage(language);
    if (!Array.isArray(cases) || cases.length < 1 || cases.length > MAX_CASES ||
        cases.some(item => !item || typeof item.stdin !== 'string' ||
            Buffer.byteLength(item.stdin, 'utf8') > MAX_INPUT_LENGTH)) {
        throw createCodeExecutionError('CODE_EXECUTION_INVALID_INPUT', 400,
            `Provide between 1 and ${MAX_CASES} test cases with valid input.`);
    }
    const boundedTimeLimit = Math.min(5, Math.max(0.25, Number(timeLimit) || 2));
    const boundedMemoryLimit = Math.min(256, Math.max(32, Number(memoryLimit) || 256));
    const response = await runDocker({
        language,
        source: sourceCode,
        cases,
        timeLimit: boundedTimeLimit,
        memoryLimit: boundedMemoryLimit
    });
    const status = mapStatus(response.status);
    if (response.status === 'internal_error') {
        throw createCodeExecutionError('CODE_EXECUTION_INTERNAL_ERROR', 503,
            'The isolated runner rejected the request. Check the local runner configuration.');
    }
    return { ...response, status };
}

async function executeSource(sourceCode, {
    language = 'javascript',
    stdin = '',
    expectedOutput,
    timeLimit = 2,
    memoryLimit = 256
} = {}) {
    validateSource(sourceCode, stdin);
    const execution = await executeBatch(sourceCode, {
        language,
        cases: [{ stdin }],
        timeLimit,
        memoryLimit
    });
    const result = execution.results?.[0] || {};
    const matchesExpected = typeof expectedOutput !== 'string' || outputMatches(result.stdout, expectedOutput);
    const status = execution.status === 'accepted' && !matchesExpected ? 'wrong_answer' : execution.status;
    return {
        status,
        statusDescription: status === 'accepted' ? 'Completed' : status.replace(/_/g, ' '),
        stdout: result.stdout || '',
        stderr: result.stderr || execution.message || '',
        compileOutput: execution.status === 'compilation_error' ? execution.message : '',
        time: result.runtimeMs ?? execution.runtimeMs ?? null,
        memory: null
    };
}

async function executeJavaScript(sourceCode, options = {}) {
    return executeSource(sourceCode, { ...options, language: 'javascript' });
}

async function executeProblemTestCases(sourceCode, testCases, {
    language = 'javascript',
    timeLimit = 2,
    memoryLimit = 256,
    includeHidden = true
} = {}) {
    if (!Array.isArray(testCases) || testCases.length === 0) {
        throw createCodeExecutionError('CODE_EXECUTION_TESTS_UNAVAILABLE', 422,
            'This problem has no test cases available for execution.');
    }
    const selected = testCases
        .filter(testCase => includeHidden || !testCase.isHidden)
        .slice(0, MAX_CASES);
    if (!selected.length) {
        throw createCodeExecutionError('CODE_EXECUTION_TESTS_UNAVAILABLE', 422,
            'No public sample tests are available for this problem.');
    }
    const cases = selected.map(testCase => ({
        stdin: typeof testCase.stdin === 'string'
            ? testCase.stdin
            : argumentsToStdin(parseInputArguments(testCase.input))
    }));
    const startedAt = Date.now();
    const execution = await executeBatch(sourceCode, {
        language,
        cases,
        timeLimit,
        memoryLimit
    });
    const results = selected.map((testCase, index) => {
        const actual = execution.results?.[index] || {};
        const passed = execution.status === 'accepted' &&
            outputMatches(actual.stdout, testCase.expectedOutput);
        return {
            testCaseId: index,
            passed,
            status: execution.status === 'accepted' && !passed ? 'wrong_answer' : execution.status,
            ...(testCase.isHidden ? {} : {
                actualOutput: String(actual.stdout || '').trim(),
                expectedOutput: testCase.expectedOutput
            }),
            ...(!testCase.isHidden && actual.stderr
                ? { error: actual.stderr.trim() }
                : {})
        };
    });
    const allPassed = results.length === selected.length && results.every(result => result.passed);
    const failure = results.find(result => !result.passed);
    return {
        allPassed,
        status: allPassed ? 'accepted' : (failure?.status || execution.status),
        results,
        executionTime: Date.now() - startedAt,
        runtime: execution.runtimeMs ?? null,
        memory: null
    };
}

module.exports = {
    argumentsToStdin,
    checkDockerAvailability,
    executeJavaScript,
    executeSource,
    executeProblemTestCases,
    getAvailableLanguages,
    getLanguageStarterCode,
    isConfigured: () => dockerStatusCache.available,
    makeFunctionCallSource,
    outputMatches,
    parseInputArguments,
    runnerSecurityOptions
};
