const DEFAULT_TIMEOUT_MS = 15000;
const REQUEST_TIMEOUT_MS = 5000;
const POLL_INTERVAL_MS = 250;
const MAX_SOURCE_LENGTH = 20000;
const MAX_INPUT_LENGTH = 5000;
const LANGUAGE_CACHE_MS = 30000;
const LANGUAGE_DEFINITIONS = [
    { value: 'python', label: 'Python 3', editorLanguage: 'python', matches: /^Python(?:\s*\(3\.|\s+3\b)/i },
    { value: 'javascript', label: 'JavaScript (Node.js)', editorLanguage: 'javascript', matches: /^JavaScript\b/i },
    { value: 'java', label: 'Java', editorLanguage: 'java', matches: /^Java\s*(?:\(|$)/i },
    { value: 'c', label: 'C', editorLanguage: 'c', matches: /^C\s*\(/i },
    { value: 'cpp', label: 'C++', editorLanguage: 'cpp', matches: /^C\+\+\s*\(/i },
    { value: 'csharp', label: 'C#', editorLanguage: 'csharp', matches: /^C#\s*\(/i },
    { value: 'go', label: 'Go', editorLanguage: 'go', matches: /^Go\s*(?:\(|$)/i }
];
let cachedLanguages = null;
let cachedLanguagesAt = 0;
let cachedLanguagesKey = '';

function createCodeExecutionError(code, status, message) {
    const error = new Error(message);
    error.code = code;
    error.status = status;
    return error;
}

function getRunnerConfig() {
    const configuredUrl = process.env.CODE_EXECUTION_API_URL?.trim();
    if (!configuredUrl) return null;

    let baseUrl;
    try {
        baseUrl = new URL(configuredUrl);
    } catch {
        throw createCodeExecutionError(
            'CODE_EXECUTION_CONFIG_INVALID',
            503,
            'The configured code execution service URL is invalid.'
        );
    }

    const isLocalRunner = ['localhost', '127.0.0.1', '::1'].includes(baseUrl.hostname);
    if (!isLocalRunner) {
        throw createCodeExecutionError(
            'CODE_EXECUTION_CONFIG_INVALID',
            503,
            'Only a locally hosted Judge0 Community Edition runner is supported.'
        );
    }

    if (baseUrl.username || baseUrl.password) {
        throw createCodeExecutionError(
            'CODE_EXECUTION_CONFIG_INVALID',
            503,
            'Do not include credentials in the code execution service URL.'
        );
    }
    const basePath = baseUrl.pathname.replace(/\/+$/, '').replace(/\/submissions$/i, '');
    baseUrl.pathname = `${basePath || ''}/`;
    baseUrl.search = '';
    baseUrl.hash = '';
    return {
        baseUrl,
        endpoint: new URL('submissions', baseUrl),
        apiKey: process.env.CODE_EXECUTION_API_KEY?.trim() || '',
        apiKeyHeader: process.env.CODE_EXECUTION_API_KEY_HEADER?.trim() || 'X-Auth-Token'
    };
}

function isConfigured() {
    try {
        return Boolean(getRunnerConfig());
    } catch {
        return false;
    }
}

function parseRunnerResponse(payload) {
    if (!payload || typeof payload !== 'object' ||
        !payload.status || !Number.isInteger(payload.status.id)) {
        throw createCodeExecutionError(
            'CODE_EXECUTION_INVALID_RESPONSE',
            502,
            'The code execution service returned an invalid response.'
        );
    }
    return payload;
}

function executionStatus(payload) {
    const statuses = {
        3: 'accepted',
        4: 'wrong_answer',
        5: 'time_limit',
        6: 'compilation_error',
        7: 'runtime_error',
        8: 'runtime_error',
        9: 'runtime_error',
        10: 'runtime_error',
        11: 'runtime_error',
        12: 'runtime_error',
        13: 'runner_error',
        14: 'runner_error'
    };
    return statuses[payload.status.id] || 'runner_error';
}

function makeRequestHeaders(config) {
    const headers = { 'Content-Type': 'application/json' };
    if (config.apiKey && !/^[A-Za-z0-9-]+$/.test(config.apiKeyHeader)) {
        throw createCodeExecutionError('CODE_EXECUTION_CONFIG_INVALID', 503,
            'The configured code execution API-key header name is invalid.');
    }
    if (config.apiKey) headers[config.apiKeyHeader] = config.apiKey;
    return headers;
}

async function fetchRunner(url, options) {
    try {
        return await fetch(url, {
            ...options,
            signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
        });
    } catch (error) {
        if (error.name === 'TimeoutError' || error.name === 'AbortError') {
            throw createCodeExecutionError(
                'CODE_EXECUTION_TIMEOUT',
                504,
                'The code execution service timed out. Please retry.'
            );
        }
        if (error.code?.startsWith('CODE_')) throw error;
        throw createCodeExecutionError('CODE_EXECUTION_UNAVAILABLE', 502,
            'The code execution service could not be reached.');
    }
}

async function assertRunnerResponse(response) {
    if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
            throw createCodeExecutionError(
                'CODE_EXECUTION_AUTH_ERROR',
                502,
                'The code execution service rejected its server credentials.'
            );
        }
        if (response.status === 429) {
            throw createCodeExecutionError(
                'CODE_EXECUTION_RATE_LIMITED',
                503,
                'The code execution service is rate limited. Please retry later.'
            );
        }
        throw createCodeExecutionError(
            'CODE_EXECUTION_UNAVAILABLE',
            502,
            'The code execution service returned an error.'
        );
    }
}

async function readRunnerJson(response) {
    await assertRunnerResponse(response);
    try {
        return await response.json();
    } catch (error) {
        throw createCodeExecutionError(
            'CODE_EXECUTION_INVALID_RESPONSE',
            502,
            'The code execution service returned an invalid response.'
        );
    }
}

function getLanguageStarterCode(language) {
    const templates = {
        python: `import json
import sys

def solution(*args):
    # Read JSON arguments from stdin and return your result.
    return None

if __name__ == "__main__":
    args = [json.loads(line) for line in sys.stdin if line.strip()]
    print(json.dumps(solution(*args), separators=(",", ":")))`,
        javascript: `function solution(...args) {
    // Return your result for the supplied problem input.
}`,
        java: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        // Read standard input and print the result.
    }
}`,
        c: `#include <stdio.h>

int main(void) {
    // Read standard input and print the result.
    return 0;
}`,
        cpp: `#include <iostream>
using namespace std;

int main() {
    // Read standard input and print the result.
    return 0;
}`,
        csharp: `using System;

public class Program {
    public static void Main() {
        // Read standard input and print the result.
    }
}`,
        go: `package main

import "fmt"

func main() {
    // Read standard input and print the result.
    fmt.Println()
}`
    };
    return templates[language] || '';
}

async function getAvailableLanguages({ refresh = false } = {}) {
    const config = getRunnerConfig();
    if (!config) {
        throw createCodeExecutionError(
            'CODE_EXECUTION_NOT_CONFIGURED',
            503,
            'Code execution is unavailable until an isolated Judge0-compatible service is configured.'
        );
    }
    const cacheKey = `${config.baseUrl.href}|${config.apiKey}|${config.apiKeyHeader}`;
    if (!refresh && cachedLanguages && cachedLanguagesKey === cacheKey &&
        Date.now() - cachedLanguagesAt < LANGUAGE_CACHE_MS) {
        return cachedLanguages;
    }

    const response = await fetchRunner(new URL('languages', config.baseUrl), {
        method: 'GET',
        headers: makeRequestHeaders(config)
    });
    const payload = await readRunnerJson(response);
    if (!Array.isArray(payload)) {
        throw createCodeExecutionError('CODE_EXECUTION_INVALID_RESPONSE', 502,
            'The code execution service returned an invalid language list.');
    }

    const languages = LANGUAGE_DEFINITIONS.flatMap(definition => {
        const providerLanguage = payload.find(language =>
            Number.isInteger(language?.id) && typeof language.name === 'string' &&
            definition.matches.test(language.name) &&
            !language.is_archived);
        return providerLanguage
            ? [{
                value: definition.value,
                label: definition.label,
                editorLanguage: definition.editorLanguage,
                id: providerLanguage.id,
                providerName: providerLanguage.name,
                starterCode: getLanguageStarterCode(definition.value)
            }]
            : [];
    });
    if (!languages.some(language => language.value === 'javascript')) {
        throw createCodeExecutionError('CODE_EXECUTION_LANGUAGE_UNAVAILABLE', 503,
            'The configured runner does not offer a supported JavaScript runtime.');
    }
    cachedLanguages = languages;
    cachedLanguagesAt = Date.now();
    cachedLanguagesKey = cacheKey;
    return languages;
}

async function getExecutionLanguage(value) {
    if (typeof value !== 'string' ||
        !LANGUAGE_DEFINITIONS.some(language => language.value === value)) {
        throw createCodeExecutionError('CODE_EXECUTION_LANGUAGE_UNSUPPORTED', 400,
            'Choose one of the supported programming languages.');
    }
    const languages = await getAvailableLanguages();
    const language = languages.find(item => item.value === value);
    if (!language) {
        throw createCodeExecutionError('CODE_EXECUTION_LANGUAGE_UNAVAILABLE', 422,
            'The selected language is not available on the configured execution service.');
    }
    return language;
}

async function waitForCompletion(config, initialPayload) {
    let payload;
    if (initialPayload?.status && Number.isInteger(initialPayload.status.id)) {
        payload = parseRunnerResponse(initialPayload);
    } else if (typeof initialPayload?.token === 'string' && initialPayload.token.length > 0) {
        payload = {
            ...initialPayload,
            status: { id: 1, description: 'In Queue' }
        };
    } else {
        throw createCodeExecutionError('CODE_EXECUTION_INVALID_RESPONSE', 502,
            'The code execution service returned neither a submission status nor a token.');
    }
    const deadline = Date.now() + DEFAULT_TIMEOUT_MS;
    while (payload.status.id === 1 || payload.status.id === 2) {
        if (!payload.token) {
            throw createCodeExecutionError(
                'CODE_EXECUTION_INVALID_RESPONSE',
                502,
                'The code execution service did not return a submission token.'
            );
        }
        if (Date.now() >= deadline) {
            throw createCodeExecutionError(
                'CODE_EXECUTION_TIMEOUT',
                504,
                'Code execution exceeded the allowed time. Please retry.'
            );
        }
        await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
        const url = new URL(`${config.endpoint.href.replace(/\/$/, '')}/${encodeURIComponent(payload.token)}`);
        url.searchParams.set('base64_encoded', 'false');
        const response = await fetchRunner(url, {
            method: 'GET',
            headers: makeRequestHeaders(config)
        });
        payload = parseRunnerResponse(await readRunnerJson(response));
    }
    return payload;
}

async function executeSource(sourceCode, {
    language = 'javascript',
    stdin = '',
    expectedOutput,
    timeLimit = 2,
    memoryLimit = 256
} = {}) {
    if (typeof sourceCode !== 'string' || !sourceCode.trim() || sourceCode.length > MAX_SOURCE_LENGTH) {
        throw createCodeExecutionError(
            'CODE_EXECUTION_INVALID_INPUT',
            400,
            `Source code must contain between 1 and ${MAX_SOURCE_LENGTH} characters.`
        );
    }
    if (typeof stdin !== 'string' || stdin.length > MAX_INPUT_LENGTH) {
        throw createCodeExecutionError('CODE_EXECUTION_INVALID_INPUT', 413,
            `Standard input must be ${MAX_INPUT_LENGTH} characters or fewer.`);
    }
    const config = getRunnerConfig();
    if (!config) {
        throw createCodeExecutionError(
            'CODE_EXECUTION_NOT_CONFIGURED',
            503,
            'Code execution is unavailable until an isolated Judge0-compatible service is configured.'
        );
    }
    const selectedLanguage = await getExecutionLanguage(language);
    const url = new URL(config.endpoint);
    url.searchParams.set('base64_encoded', 'false');
    const body = {
        language_id: selectedLanguage.id,
        source_code: sourceCode,
        cpu_time_limit: Math.max(1, Math.min(Number(timeLimit) || 2, 5)),
        memory_limit: Math.max(16, Math.min(Number(memoryLimit) || 256, 512)) * 1024
    };
    if (stdin) body.stdin = stdin;
    if (typeof expectedOutput === 'string') body.expected_output = expectedOutput;
    const response = await fetchRunner(url, {
        method: 'POST',
        headers: makeRequestHeaders(config),
        body: JSON.stringify(body)
    });
    const initialPayload = await readRunnerJson(response);
    const payload = await waitForCompletion(config, initialPayload);
    const description = String(payload.status.description || '');
    const status = /memory limit/i.test(description)
        ? 'memory_limit'
        : executionStatus(payload);
    return {
        status,
        statusDescription: description,
        stdout: typeof payload.stdout === 'string' ? payload.stdout.slice(0, 10000) : '',
        stderr: typeof payload.stderr === 'string' ? payload.stderr.slice(0, 4000) : '',
        compileOutput: typeof payload.compile_output === 'string' ? payload.compile_output.slice(0, 4000) : '',
        time: typeof payload.time === 'string' ? payload.time : null,
        memory: Number.isFinite(payload.memory) ? payload.memory : null
    };
}

async function executeJavaScript(sourceCode, options = {}) {
    return executeSource(sourceCode, { ...options, language: 'javascript' });
}

function parseInputArguments(rawInput) {
    if (typeof rawInput !== 'string' || !rawInput.trim()) return [];
    try {
        const parsed = JSON.parse(rawInput);
        return Array.isArray(parsed) ? [parsed] : [parsed];
    } catch {
        try {
            const parsedArguments = JSON.parse(`[${rawInput}]`);
            if (!Array.isArray(parsedArguments)) throw new Error('Expected an argument list.');
            return parsedArguments;
        } catch {
            throw createCodeExecutionError(
                'CODE_EXECUTION_INVALID_INPUT',
                400,
                'Sample input is not valid JSON argument data.'
            );
        }
    }
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

function argumentsToStdin(args) {
    if (!Array.isArray(args)) {
        throw createCodeExecutionError('CODE_EXECUTION_INVALID_INPUT', 400,
            'Problem input must be valid JSON argument data.');
    }
    return args.map(value => JSON.stringify(value)).join('\n');
}

function outputMatches(actualOutput, expectedOutput) {
    const actual = String(actualOutput || '').trim().split(/\r?\n/).pop() || '';
    try {
        return JSON.stringify(JSON.parse(actual)) === JSON.stringify(JSON.parse(expectedOutput));
    } catch {
        return actual === String(expectedOutput).trim();
    }
}

async function executeProblemTestCases(code, testCases, {
    language = 'javascript',
    timeLimit,
    memoryLimit
} = {}) {
    if (!Array.isArray(testCases) || testCases.length === 0) {
        throw createCodeExecutionError(
            'CODE_EXECUTION_TESTS_UNAVAILABLE',
            422,
            'This problem has no test cases available for execution.'
        );
    }
    const results = [];
    const startedAt = Date.now();
    let status = 'accepted';
    for (let index = 0; index < testCases.length; index++) {
        const testCase = testCases[index];
        const args = parseInputArguments(testCase.input);
        const execution = language === 'javascript'
            ? await executeJavaScript(
                makeFunctionCallSource(code, args),
                { expectedOutput: testCase.expectedOutput, timeLimit, memoryLimit }
            )
            : await executeSource(code, {
                language,
                stdin: argumentsToStdin(args),
                expectedOutput: testCase.expectedOutput,
                timeLimit,
                memoryLimit
            });
        const passed = execution.status === 'accepted' &&
            outputMatches(execution.stdout, testCase.expectedOutput);
        const result = {
            testCaseId: index,
            passed,
            status: execution.status,
            ...(testCase.isHidden ? {} : {
                actualOutput: execution.stdout.trim(),
                expectedOutput: testCase.expectedOutput
            }),
            ...(!testCase.isHidden && !passed && execution.stderr
                ? { error: execution.stderr.trim() }
                : {}),
            ...(!testCase.isHidden && !passed && execution.compileOutput
                ? { error: execution.compileOutput.trim() }
                : {})
        };
        results.push(result);
        if (!passed && status === 'accepted') {
            status = execution.status === 'accepted' ? 'wrong_answer' : execution.status;
        }
    }
    const allPassed = results.every(result => result.passed);
    return {
        allPassed,
        status: allPassed ? 'accepted' : status,
        results,
        executionTime: Date.now() - startedAt
    };
}

module.exports = {
    argumentsToStdin,
    executeJavaScript,
    executeSource,
    getAvailableLanguages,
    getLanguageStarterCode,
    executeProblemTestCases,
    isConfigured,
    makeFunctionCallSource,
    outputMatches,
    parseInputArguments
};
