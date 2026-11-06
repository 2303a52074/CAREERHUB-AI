const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const loadEnv = require('./utils/loadEnv');

const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'careerhub-env-test-'));
const suffix = `${process.pid}_${Date.now()}`;
const rootKey = `CAREERHUB_ENV_ROOT_${suffix}`;
const backendKey = `CAREERHUB_ENV_BACKEND_${suffix}`;
const sharedKey = `CAREERHUB_ENV_SHARED_${suffix}`;
const processKey = `CAREERHUB_ENV_PROCESS_${suffix}`;
const keys = [rootKey, backendKey, sharedKey, processKey];
const previous = new Map(keys.map(key => [key, process.env[key]]));

try {
    fs.mkdirSync(path.join(temporaryRoot, 'backend'));
    fs.writeFileSync(path.join(temporaryRoot, '.env'),
        `${rootKey}=root-value\n${sharedKey}=root-value\n${processKey}=file-value\n`);
    fs.writeFileSync(path.join(temporaryRoot, 'backend', '.env'),
        `${backendKey}=backend-value\n${sharedKey}=backend-value\n${processKey}=backend-file-value\n`);
    process.env[processKey] = 'process-value';

    loadEnv(temporaryRoot);

    assert.equal(process.env[rootKey], 'root-value');
    assert.equal(process.env[backendKey], 'backend-value');
    assert.equal(process.env[sharedKey], 'root-value');
    assert.equal(process.env[processKey], 'process-value');
    console.log('Environment loading tests passed: root and backend .env files load; process and root values take precedence.');
} finally {
    for (const [key, value] of previous) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
    }
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
}
