const assert = require('node:assert/strict');
const { resolveTargetRole } = require('./utils/roleResolution');

assert.deepEqual(
    resolveTargetRole(undefined, { targetRole: 'Backend Engineer' }),
    { role: 'Backend Engineer', source: 'profile' }
);
assert.deepEqual(
    resolveTargetRole('  Data Analyst  ', { targetRole: 'Backend Engineer' }),
    { role: 'Data Analyst', source: 'exercise' }
);
assert.deepEqual(
    resolveTargetRole('', { targetRole: '  ' }),
    { role: null, source: 'missing' }
);
assert.deepEqual(
    resolveTargetRole(undefined, null),
    { role: null, source: 'missing' }
);

console.log('Role resolution tests passed: profile target roles are canonical, exercise overrides are temporary, and missing roles stay unset.');
