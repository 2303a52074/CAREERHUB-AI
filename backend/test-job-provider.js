const assert = require('node:assert/strict');
const {
    ARBEITNOW_API_URL,
    normalizeArbeitnowJob,
    safeHttpsUrl,
    fetchLiveJobs,
    calculateJobMatch
} = require('./utils/jobProvider');

async function run() {
    const listing = {
        slug: 'python-developer-example',
        company_name: 'Example Employer',
        title: 'Python Developer',
        location: 'Remote',
        remote: true,
        tags: ['Python', 'Engineering'],
        job_types: ['Full-time'],
        description: '<p>Build software safely.</p>',
        url: 'https://www.arbeitnow.com/jobs/example-employer/python-developer-example',
        created_at: 1792581600
    };

    assert.equal(safeHttpsUrl('https://example.com/jobs/1'), 'https://example.com/jobs/1');
    assert.equal(safeHttpsUrl('javascript:alert(1)'), null);
    assert.equal(safeHttpsUrl('http://example.com/job'), null);
    assert.equal(safeHttpsUrl('https://user:pass@example.com/job'), null);
    assert.equal(normalizeArbeitnowJob({ ...listing, url: 'javascript:alert(1)' }), null);
    assert.equal(normalizeArbeitnowJob({ ...listing, url: 'https://attacker.example/jobs/1' }), null);
    assert.equal(normalizeArbeitnowJob({ ...listing, company_name: '' }), null);
    assert.equal(normalizeArbeitnowJob({ ...listing, location: '', remote: false }), null);

    const normalized = normalizeArbeitnowJob(listing);
    assert.equal(normalized.source, 'Arbeitnow Job Board API');
    assert.equal(normalized.isSample, false);
    assert.equal(normalized.type, 'job');
    assert.equal(normalized.location, 'Remote');
    assert.equal(normalized.salaryOrStipend, undefined);
    assert.equal(normalized.description, 'Build software safely.');

    const internship = normalizeArbeitnowJob({
        ...listing,
        job_types: ['Internship'],
        url: 'https://www.arbeitnow.com/jobs/example-employer/internship-example'
    });
    assert.equal(internship.type, 'internship');

    const match = calculateJobMatch({
        technicalSkills: ['Python', 'JavaScript'],
        targetRole: 'Python Developer',
        preferredLocations: ['Remote']
    }, normalized);
    assert.equal(match.overallMatch, 70);
    assert.deepEqual(match.matchedSkills, ['python']);
    assert.deepEqual(match.matchedProfileSkills, ['python']);
    assert.deepEqual(match.matchBasis, ['listed skills', 'target role', 'preferred location']);

    const descriptionOnlyMatch = calculateJobMatch({
        technicalSkills: ['Python', 'C++']
    }, {
        title: 'Backend Engineer',
        description: 'Build backend services with Python and C++.',
        tags: [],
        sourceJobTypes: ['Full-time']
    });
    assert.equal(descriptionOnlyMatch.overallMatch, 100);
    assert.deepEqual(descriptionOnlyMatch.matchedProfileSkills, ['python', 'c++']);
    assert.deepEqual(descriptionOnlyMatch.matchBasis, ['listed skills']);

    const roleOnlyMatch = calculateJobMatch({
        targetRole: 'Backend Engineer'
    }, { title: 'Senior Backend Engineer', tags: [] });
    assert.equal(roleOnlyMatch.overallMatch, 100);
    assert.deepEqual(roleOnlyMatch.matchBasis, ['target role']);

    const unavailableMatch = calculateJobMatch({}, normalized);
    assert.equal(unavailableMatch.overallMatch, null);
    assert.match(unavailableMatch.matchUnavailableReason, /technical skills, a target role, or a preferred location/i);

    let requestedUrl;
    const result = await fetchLiveJobs({
        fetchImpl: async url => {
            requestedUrl = url;
            return { ok: true, json: async () => ({ data: [listing, { ...listing, url: 'javascript:alert(1)' }] }) };
        }
    });
    assert.equal(requestedUrl, `${ARBEITNOW_API_URL}?page=1`);
    assert.equal(result.length, 1);
    assert.equal(result[0].id, 'python-developer-example');

    const emptyResult = await fetchLiveJobs({
        fetchImpl: async () => ({ ok: true, json: async () => ({ data: [] }) })
    });
    assert.deepEqual(emptyResult, []);

    await assert.rejects(
        fetchLiveJobs({ fetchImpl: async () => ({ ok: false, status: 429 }) }),
        error => error.code === 'JOB_PROVIDER_UNAVAILABLE' && error.status === 503
    );
    await assert.rejects(
        fetchLiveJobs({ fetchImpl: async () => { throw new Error('network down'); } }),
        error => error.code === 'JOB_PROVIDER_UNAVAILABLE' && error.status === 503
    );
    await assert.rejects(
        fetchLiveJobs({ fetchImpl: async () => { throw new DOMException('timed out', 'TimeoutError'); } }),
        error => error.code === 'JOB_PROVIDER_TIMEOUT' && error.status === 503
    );
    await assert.rejects(
        fetchLiveJobs({ fetchImpl: async () => ({ ok: true, json: async () => ({ jobs: [] }) }) }),
        error => error.code === 'JOB_PROVIDER_INVALID_RESPONSE' && error.status === 503
    );

    const originalConfiguration = Object.fromEntries([
        'AI_PROVIDER',
        'OPENROUTER_API_KEY',
        'OPENROUTER_MODEL',
        'CAREERHUB_AI_DATA_PROCESSING_APPROVED',
        'CAREERHUB_AI_DATA_PROCESSING_PROVIDER'
    ].map(name => [name, process.env[name]]));
    process.env.AI_PROVIDER = 'openrouter';
    try {
        const aiService = require('./utils/aiService');
        process.env.OPENROUTER_API_KEY = 'test-key-not-used';
        process.env.OPENROUTER_MODEL = 'provider/example-paid';
        process.env.CAREERHUB_AI_DATA_PROCESSING_APPROVED = 'false';
        process.env.CAREERHUB_AI_DATA_PROCESSING_PROVIDER = '';
        assert.equal(aiService.getCareerAssistantStatus().configured, false);
        process.env.CAREERHUB_AI_DATA_PROCESSING_APPROVED = 'true';
        process.env.CAREERHUB_AI_DATA_PROCESSING_PROVIDER = 'openrouter';
        assert.equal(aiService.getCareerAssistantStatus().configured, true);
        process.env.OPENROUTER_MODEL = 'provider/example:free';
        assert.equal(aiService.getCareerAssistantStatus().configured, false);
        process.env.OPENROUTER_API_KEY = '';
        await assert.rejects(
            aiService.chatCareerAssistant('Hello', [], {}),
            error => error.code === 'AI_PROVIDER_NOT_CONFIGURED' && error.status === 503
        );
    } finally {
        for (const [name, value] of Object.entries(originalConfiguration)) {
            if (value === undefined) delete process.env[name];
            else process.env[name] = value;
        }
    }

    console.log('Job provider tests passed: normalization, attribution, URL safety, matching, empty data, and failures.');
}

run().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
