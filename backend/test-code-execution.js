const assert = require('node:assert/strict');
const executionService = require('./utils/codeExecutionService');

async function run() {
    const languages = executionService.getAvailableLanguages();
    assert.deepEqual(languages.map(language => language.value), [
        'python', 'java', 'cpp', 'javascript'
    ]);
    assert.ok(languages.every(language => language.starterCode.length > 10));
    assert.equal(executionService.isConfigured(), false,
        'The local engine must not report ready before a successful Docker health check.');

    const policy = executionService.runnerSecurityOptions();
    for (const required of [
        '--network=none',
        '--cpus=0.5',
        '--memory=256m',
        '--memory-swap=256m',
        '--pids-limit=64',
        '--read-only',
        '--user=10001:10001',
        '--security-opt=no-new-privileges',
        '--cap-drop=ALL'
    ]) {
        assert.ok(policy.includes(required), `Missing container restriction ${required}`);
    }

    assert.deepEqual(executionService.parseInputArguments('[1,2], "x"'), [[1, 2], 'x']);
    assert.deepEqual(executionService.parseInputArguments('{"values":[1,2]}'), [{ values: [1, 2] }]);
    assert.equal(executionService.argumentsToStdin([[1, 2], 'x']), '[1,2]\n"x"');
    assert.equal(executionService.outputMatches('{"b":2,"a":[1,2]}\n', '{"a":[1,2],"b":2}'), true);
    assert.equal(executionService.outputMatches('2\n', '3'), false);

    await assert.rejects(
        executionService.executeSource('', { language: 'python' }),
        error => error.code === 'CODE_EXECUTION_INVALID_INPUT'
    );
    await assert.rejects(
        executionService.executeSource('print(1)', { language: 'ruby' }),
        error => error.code === 'CODE_EXECUTION_LANGUAGE_UNSUPPORTED'
    );
    await assert.rejects(
        executionService.executeSource('print(1)', { stdin: 'x'.repeat(5001) }),
        error => error.code === 'CODE_EXECUTION_INVALID_INPUT' && error.status === 413
    );
    await assert.rejects(
        executionService.executeProblemTestCases('print(1)', []),
        error => error.code === 'CODE_EXECUTION_TESTS_UNAVAILABLE'
    );
    await assert.rejects(
        executionService.executeProblemTestCases('print(1)', [
            { stdin: '1', expectedOutput: '1' }
        ], { language: 'ruby' }),
        error => error.code === 'CODE_EXECUTION_LANGUAGE_UNSUPPORTED'
    );

    console.log('Local code execution tests passed: supported languages, Docker isolation policy, input validation, and output comparison.');
}

run().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
