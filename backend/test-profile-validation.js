const assert = require('node:assert/strict');
const { validateProfileUpdate } = require('./utils/profileValidation');

function run() {
    assert.deepEqual(validateProfileUpdate({ name: 'Candidate', email: 'user@example.com' }).updates, {
        name: 'Candidate',
        email: 'user@example.com'
    });
    assert.deepEqual(validateProfileUpdate({
        technicalSkills: ['JavaScript', ' javascript ', 'Node.js'],
        projects: [{ title: 'Portfolio', link: 'https://example.com' }],
        experience: [{ company: 'Example Co' }]
    }).updates.technicalSkills, ['JavaScript', 'Node.js']);
    assert.match(validateProfileUpdate({ email: 'not-an-email' }).error, /valid email/);
    assert.match(validateProfileUpdate({ role: 'admin' }).error, /cannot be changed/);
    assert.match(validateProfileUpdate({ xp: 999999 }).error, /cannot be changed/);
    assert.match(validateProfileUpdate({ projects: [{ title: 'Portfolio', link: 'javascript:alert(1)' }] }).error, /HTTPS/);
    assert.match(validateProfileUpdate({ experience: [{ company: {} }] }).error, /valid text fields/);
    assert.match(validateProfileUpdate({ technicalSkills: Array(51).fill('JavaScript') }).error, /up to 50/);

    console.log('Profile validation tests passed: field allowlist, format checks, deduplication, and safe links.');
}

run();
