const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const {
    checkDockerAvailability,
    executeProblemTestCases,
    executeSource
} = require('./utils/codeExecutionService');

const testRunId = randomUUID();
process.env.CAREERHUB_RUNNER_TEST_RUN_ID = testRunId;

const programs = {
    python: 'import sys\nprint(sys.stdin.read().strip())',
    javascript: 'process.stdout.write(require("fs").readFileSync(0, "utf8").trim())',
    java: 'import java.util.*;\npublic class Main { public static void main(String[] args) { Scanner s = new Scanner(System.in); System.out.print(s.nextLine().trim()); } }',
    cpp: '#include <iostream>\n#include <string>\nint main(){std::string s;std::getline(std::cin,s);std::cout<<s;}'
};

async function main() {
    const engine = await checkDockerAvailability({ refresh: true });
    if (!engine.available) {
        console.log(`BLOCKED: ${engine.message}`);
        process.exitCode = 2;
        return;
    }

    for (const [language, code] of Object.entries(programs)) {
        const result = await executeSource(code, { language, stdin: 'runner-ok\n' });
        assert.equal(result.status, 'accepted', `${language} Hello World should execute.`);
        assert.equal(result.stdout.trim(), 'runner-ok');
        console.log(`PASS: ${language} compile/run`);
    }

        const javaTimeout = await executeSource(
            'public class Main { public static void main(String[] args) { while (true) { } } }',
            { language: 'java', timeLimit: 2 }
        );
        assert.equal(javaTimeout.status, 'time_limit');
        console.log('PASS: Java execution timeout');

        const wrongAnswer = await executeProblemTestCases(
        'import sys\nprint("wrong")',
        [{ stdin: 'case\n', expectedOutput: 'expected\n', isHidden: false }],
        { language: 'python' }
    );
    assert.equal(wrongAnswer.status, 'wrong_answer');
    console.log('PASS: wrong-answer classification');

    const compileError = await executeSource('def broken(:\n    pass', { language: 'python' });
    assert.equal(compileError.status, 'compilation_error');
    console.log('PASS: compilation-error classification');

    const runtimeError = await executeSource('raise RuntimeError("test")', {
        language: 'python',
        stdin: ''
    });
    assert.equal(runtimeError.status, 'runtime_error');
    console.log('PASS: runtime-error classification');

    const timeout = await executeSource('while True: pass', {
        language: 'python',
        timeLimit: 1
    });
    assert.equal(timeout.status, 'time_limit');
    console.log('PASS: execution timeout');

    const memoryLimit = await executeSource('data = bytearray(512 * 1024 * 1024)', {
        language: 'python',
        timeLimit: 5,
        memoryLimit: 256
    });
    assert.equal(memoryLimit.status, 'memory_limit');
    console.log('PASS: memory limit');

    const filesystem = await executeSource(
        'try:\n open("/etc/hostname", "w").write("modified")\n print("writable")\nexcept OSError:\n print("read-only")',
        { language: 'python', timeLimit: 2 }
    );
    assert.equal(filesystem.status, 'accepted');
    assert.equal(filesystem.stdout.trim(), 'read-only');
    console.log('PASS: root filesystem is read-only');

    const network = await executeSource(
        'import socket\ntry:\n socket.create_connection(("1.1.1.1", 53), timeout=1)\n print("reachable")\nexcept OSError:\n print("blocked")',
        { language: 'python', timeLimit: 2 }
    );
    assert.equal(network.status, 'accepted');
    assert.equal(network.stdout.trim(), 'blocked');
    console.log('PASS: network access is disabled');

    process.env.CAREERHUB_RUNNER_TEST_SENTINEL = 'host-only-test-value';
    const environment = await executeSource(
        'import os\nprint("exposed" if os.environ.get("CAREERHUB_RUNNER_TEST_SENTINEL") else "isolated")',
        { language: 'python', stdin: '' }
    );
    assert.equal(environment.status, 'accepted');
    assert.equal(environment.stdout.trim(), 'isolated');
    console.log('PASS: host environment variables are not passed into the container');

    const processLimit = await executeSource(
        'import subprocess\nchildren = []\nlimited = False\ntry:\n for _ in range(100): children.append(subprocess.Popen(["/bin/sleep", "5"]))\nexcept OSError:\n limited = True\nfinally:\n for child in children:\n  child.terminate()\n for child in children:\n  child.wait()\nprint("limited" if limited else "unlimited")',
        { language: 'python', timeLimit: 5 }
    );
    assert.equal(processLimit.status, 'accepted');
    assert.equal(processLimit.stdout.trim(), 'limited');
    console.log('PASS: process count is bounded');

    const hidden = await executeProblemTestCases(
        'import sys\nprint(sys.stdin.read().strip())',
        [
            { stdin: 'public\n', expectedOutput: 'public\n', isHidden: false },
            { stdin: 'secret-input\n', expectedOutput: 'secret-output\n', isHidden: true }
        ],
        { language: 'python' }
    );
    assert.equal(hidden.allPassed, false);
    assert.equal('actualOutput' in hidden.results[1], false);
    assert.equal('expectedOutput' in hidden.results[1], false);
    console.log('PASS: hidden input/output are not returned');

    const leftoverContainers = execFileSync('docker', [
        'ps', '-aq', '--filter', `label=careerhub.test-run=${testRunId}`
    ], { encoding: 'utf8' }).trim();
    assert.equal(leftoverContainers, '', 'Runner containers must be removed after execution.');
    console.log('PASS: temporary runner containers are cleaned up');
}

main().catch(error => {
    console.error(`FAIL: local runner integration — ${error.message}`);
    process.exitCode = 1;
});
