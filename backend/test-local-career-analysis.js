const assert = require('node:assert/strict');
const {
    analyzeResumeLocally,
    analyzeJobDescriptionLocally,
    buildDailyPreparationTasks,
    buildCareerRoadmapLocally,
    hasPhrase
} = require('./utils/localCareerAnalysis');
const { getApprovedDataProcessingStatus } = require('./utils/aiService');

const resume = [
    'jane@example.test | +1 555 123 4567',
    'Professional Summary',
    'Backend engineer with 5 years of experience.',
    'Technical Skills',
    'Python, PostgreSQL, Docker',
    'Work Experience',
    'Developed a service that reduced response time by 35%.',
    'Education',
    'B.S. Computer Science',
    'Projects',
    'Built an API project with Python.',
    'Certifications',
    'AWS Certified Developer'
].join('\n');

function testLocalResumeAnalysis() {
    const result = analyzeResumeLocally(
        resume,
        'Backend Engineer',
        'Build Python and PostgreSQL services with unit testing.'
    );
    assert.equal(result.analysisMethod, 'local');
    assert.equal(result.presentSections.length, 6);
    assert.equal(result.missingSections.length, 0);
    assert.ok(result.detectedSkills.includes('python'));
    assert.ok(result.missingSkills.includes('unit testing'));
    assert.equal(result.measurableAchievements.length, 1);
    assert.equal(result.atsCompatibility, result.score);
    assert.ok(result.score >= 0 && result.score <= 100);
    assert.ok(!JSON.stringify(result).includes('jane@example.test'));
    assert.ok(!JSON.stringify(result).includes('555 123 4567'));
}

function testLocalJobAnalysis() {
    const result = analyzeJobDescriptionLocally({
        jobDescription: [
            'Required: Python, PostgreSQL, Docker and five years experience.',
            'Qualifications: Bachelor degree in computer science.',
            'Responsibilities:',
            '- Develop and maintain backend services.',
            '- Collaborate with the platform team.'
        ].join('\n'),
        jobTitle: 'Backend Engineer',
        company: 'Example',
        profile: { technicalSkills: ['Python', 'PostgreSQL'], softSkills: ['collaboration'] }
    });
    assert.equal(result.analysisMethod, 'local');
    assert.equal(result.overallMatch, 67);
    assert.ok(result.missingSkills.includes('docker'));
    assert.ok(result.qualifications.some(line => /Bachelor/i.test(line)));
    assert.ok(result.experienceRequirements.some(line => /years experience/i.test(line)));
    assert.ok(result.responsibilities.some(line => /Develop and maintain/i.test(line)));
    assert.ok(result.interviewQuestions.some(question => /python/i.test(question)));
    assert.equal(result.aiAdviceStatus.status, 'unavailable');
}

function testDailyPlanUsesStoredContext() {
    const plan = buildDailyPreparationTasks({
        profile: {
            targetRole: 'Backend Engineer',
            technicalSkills: ['PostgreSQL', 'Python'],
            careerGoals: 'Build reliable data services'
        },
        pendingMilestone: 'Add API monitoring',
        codingProblem: { _id: 'problem123', title: 'Merge intervals' },
        codingAttempts: 4
    });
    assert.equal(plan.source, 'local');
    assert.equal(plan.tasks.length, 5);
    assert.ok(plan.tasks[0].description.includes('Merge intervals'));
    assert.ok(plan.tasks[0].description.includes('4 recorded coding attempts'));
    assert.ok(plan.tasks[2].title.includes('PostgreSQL'));
    assert.ok(plan.tasks[3].title.includes('Add API monitoring'));
    assert.equal(plan.tasks[0].actionUrl, '/problem?id=problem123');
}

function testCareerRoadmapUsesSavedProfileLocally() {
    const roadmap = buildCareerRoadmapLocally({
        profile: {
            targetRole: 'Backend Engineer',
            technicalSkills: ['Python', 'PostgreSQL'],
            careerGoals: 'Build reliable data services'
        },
        assessmentScores: { overallReadiness: 72 },
        missingSkills: ['Docker', 'System Design']
    });
    assert.equal(roadmap.source, 'local');
    assert.equal(roadmap.model, null);
    assert.equal(roadmap.phases.length, 3);
    assert.ok(roadmap.phases.every(phase => phase.milestones.length >= 2));
    assert.ok(roadmap.phases[0].description.includes('72%'));
    assert.ok(roadmap.phases[0].milestones.some(item => item.title.includes('Docker')));
    assert.ok(roadmap.phases[1].milestones.some(item => item.completionCriteria.includes('Build reliable data services')));
    assert.ok(roadmap.phases.flatMap(phase => phase.milestones)
        .every(item => item.completionCriteria && item.estimatedHours > 0));
}

function testPrivacyApprovalGate() {
    const names = [
        'AI_PROVIDER',
        'CAREERHUB_AI_DATA_PROCESSING_APPROVED',
        'CAREERHUB_AI_DATA_PROCESSING_PROVIDER',
        'OPENROUTER_API_KEY',
        'OPENROUTER_MODEL',
        'GEMINI_API_KEY',
        'GEMINI_PRIMARY_FEATURES'
    ];
    const previous = Object.fromEntries(names.map(name => [name, process.env[name]]));
    try {
        process.env.AI_PROVIDER = 'gemini';
        process.env.CAREERHUB_AI_DATA_PROCESSING_APPROVED = 'true';
        process.env.CAREERHUB_AI_DATA_PROCESSING_PROVIDER = 'gemini';
        process.env.GEMINI_API_KEY = 'test-key-not-used';
        process.env.GEMINI_PRIMARY_FEATURES = 'resume_analysis';
        assert.equal(getApprovedDataProcessingStatus('resume_analysis').approved, false);

        process.env.AI_PROVIDER = 'openrouter';
        process.env.CAREERHUB_AI_DATA_PROCESSING_PROVIDER = 'openrouter';
        process.env.OPENROUTER_API_KEY = 'test-key-not-used';
        process.env.OPENROUTER_MODEL = 'provider/example:free';
        assert.equal(getApprovedDataProcessingStatus('resume_analysis').approved, false);

        process.env.OPENROUTER_MODEL = 'provider/example-paid';
        assert.equal(getApprovedDataProcessingStatus('resume_analysis').approved, true);
        assert.equal(getApprovedDataProcessingStatus('career_assistant').approved, true);
        process.env.CAREERHUB_AI_DATA_PROCESSING_PROVIDER = 'groq';
        assert.equal(getApprovedDataProcessingStatus('career_assistant').approved, false);

        process.env.CAREERHUB_AI_DATA_PROCESSING_APPROVED = 'false';
        assert.equal(getApprovedDataProcessingStatus('resume_analysis').approved, false);
    } finally {
        for (const name of names) {
            if (previous[name] === undefined) delete process.env[name];
            else process.env[name] = previous[name];
        }
    }
}

assert.equal(hasPhrase('c', 'c#'), false);
testLocalResumeAnalysis();
testLocalJobAnalysis();
testDailyPlanUsesStoredContext();
testCareerRoadmapUsesSavedProfileLocally();
testPrivacyApprovalGate();
console.log('Local career analysis tests passed: resume ATS checks, job requirements, profile-based daily plans and career roadmaps, and explicit AI privacy gating.');
