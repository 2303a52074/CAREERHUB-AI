require('./utils/loadEnv')();

const aiService = require('./utils/aiService');

const configuration = aiService.getOpenRouterConfiguration();
const requestCount = 30;
const repetitionsPerFeature = 3;
const providerMetrics = [];
const measurements = [];
const originalConsoleInfo = console.info;

const resumeText = [
    'Backend engineer with four years of experience building Node.js and TypeScript APIs.',
    'Designed REST services, optimized PostgreSQL queries, and deployed Docker workloads on AWS.',
    'Added integration tests, structured logging, and incident dashboards for production services.',
    'Collaborated with frontend and product teams to define API contracts and delivery milestones.'
].join(' ');

const features = [
    ['assessment_question_generation', index => aiService.generateMcqQuestions({
        role: 'Backend Engineer',
        topic: 'Software engineering and system design',
        difficulty: 'medium',
        count: 1,
        profile: { technicalSkills: ['Node.js', 'TypeScript', 'PostgreSQL'] }
    })],
    ['career_assistant', index => aiService.chatCareerAssistant(
        `Give one practical backend interview preparation step; run ${index + 1}.`,
        [],
        { targetRole: 'Backend Engineer', technicalSkills: ['Node.js', 'TypeScript'] },
        { assessment: null, skillGap: null, codingPractice: { solvedProblems: 0 } }
    )],
    ['resume_analysis', () => aiService.analyzeResume(resumeText, 'Backend Engineer')],
    ['job_analyzer', () => aiService.generateJobDescriptionAdvice({
        jobDescription: 'Build Node.js APIs, optimize PostgreSQL, deploy with Docker and AWS, and maintain automated tests.',
        jobTitle: 'Backend Engineer',
        company: 'Controlled benchmark employer',
        profile: { targetRole: 'Backend Engineer', technicalSkills: ['Node.js'] },
        extractedRequirements: ['node.js', 'postgresql', 'docker', 'aws'],
        missingSkills: ['postgresql', 'docker', 'aws']
    })],
    ['skill_gap_guidance', () => aiService.generateSkillGapAdvice({
        targetRole: 'Backend Engineer',
        matchedSkills: [{ skill: 'Node.js' }],
        missingSkills: [
            { skill: 'PostgreSQL' },
            { skill: 'Docker' },
            { skill: 'AWS' }
        ],
        profile: { careerGoals: 'Prepare for backend engineering interviews.' }
    })],
    ['career_roadmap', () => aiService.generatePersonalizedRoadmap({
        targetRole: 'Backend Engineer',
        technicalSkills: ['Node.js', 'TypeScript'],
        missingSkills: ['PostgreSQL', 'Docker'],
        availableHoursPerWeek: 6
    })],
    ['daily_plan', () => aiService.generateDailyPreparationTasks({
        profile: {
            targetRole: 'Backend Engineer',
            technicalSkills: ['Node.js', 'TypeScript'],
            availableHoursPerWeek: 6
        },
        pendingMilestone: 'Add integration coverage for one API feature.',
        codingProblem: { title: 'Validate an API request' }
    })],
    ['interview_question_generation', () => aiService.generateInterviewQuestions({
        role: 'Backend Engineer',
        difficulty: 'medium',
        company: '',
        type: 'Technical',
        count: 1,
        profile: { technicalSkills: ['Node.js', 'TypeScript'] }
    })],
    ['interview_evaluation', () => aiService.evaluateAnswer(
        'How would you make a REST API resilient to database outages?',
        'I would use bounded timeouts, safe retries for idempotent operations, circuit breaking, and observable recovery checks.',
        { role: 'Backend Engineer', topic: 'System Design', difficulty: 'medium' }
    )],
    ['coding_hint', () => aiService.generateCodingHint({
        title: 'Find the first repeated value',
        description: 'Given a list of integers, return the first value encountered a second time. Explain expected linear-time behavior.'
    })]
];

function percentile(values, proportion) {
    if (!values.length) return null;
    const sorted = [...values].sort((a, b) => a - b);
    return sorted[Math.max(0, Math.ceil(sorted.length * proportion) - 1)];
}

function summarize(values) {
    return {
        count: values.length,
        medianMs: percentile(values, 0.5),
        p90Ms: percentile(values, 0.9)
    };
}

async function run() {
    if (configuration.provider !== 'openrouter' ||
        configuration.model !== 'deepseek/deepseek-chat' ||
        !configuration.apiKeyConfigured) {
        console.error(JSON.stringify({
            status: 'BLOCKED',
            reason: 'Expected configured OpenRouter deepseek/deepseek-chat credentials were not found.',
            provider: configuration.provider,
            model: configuration.model,
            apiKeyConfigured: configuration.apiKeyConfigured
        }));
        process.exitCode = 2;
        return;
    }

    console.info = (label, serialized) => {
        if (label === 'OpenRouter request metrics:') {
            try {
                providerMetrics.push(JSON.parse(serialized));
            } catch {
                providerMetrics.push(null);
            }
        }
    };

    try {
        for (let repetition = 0; repetition < repetitionsPerFeature; repetition++) {
            for (const [feature, generate] of features) {
                const metricsBefore = providerMetrics.length;
                const startedAt = performance.now();
                let outcome = 'success';
                let errorCode = null;
                try {
                    await generate(repetition);
                } catch (error) {
                    outcome = 'failure';
                    errorCode = typeof error.code === 'string' ? error.code : 'APPLICATION_ERROR';
                }
                const durationMs = Math.round(performance.now() - startedAt);
                measurements.push({
                    feature,
                    outcome,
                    errorCode,
                    durationMs,
                    providerMetric: providerMetrics.slice(metricsBefore).filter(Boolean).at(-1) || null
                });
                const measurement = measurements[measurements.length - 1];
                process.stdout.write(`${measurements.length}/${requestCount} ${feature}: ${outcome}` +
                    `${errorCode ? ` (${errorCode})` : ''} ${durationMs}ms\n`);
            }
        }
    } finally {
        console.info = originalConsoleInfo;
    }

    const successful = measurements.filter(item => item.outcome === 'success').length;
    const featureSummaries = Object.fromEntries(features.map(([feature]) => {
        const items = measurements.filter(item => item.feature === feature);
        const callDurations = items.map(item => item.durationMs);
        const providerDurations = items
            .map(item => item.providerMetric?.providerDurationMs)
            .filter(Number.isFinite);
        const applicationDurations = items
            .filter(item => item.providerMetric)
            .map(item => Math.max(0, item.durationMs - item.providerMetric.providerDurationMs));
        return [feature, {
            successes: items.filter(item => item.outcome === 'success').length,
            failures: items.length - items.filter(item => item.outcome === 'success').length,
            errors: items.reduce((all, item) => {
                if (item.errorCode) all[item.errorCode] = (all[item.errorCode] || 0) + 1;
                return all;
            }, {}),
            endToEnd: summarize(callDurations),
            provider: summarize(providerDurations),
            applicationProcessing: summarize(applicationDurations),
            retryCount: items.reduce((total, item) =>
                total + (item.providerMetric?.retryCount || 0), 0)
        }];
    }));

    process.stdout.write(`${JSON.stringify({
        status: 'COMPLETE',
        provider: configuration.provider,
        model: configuration.model,
        requests: measurements.length,
        successes: successful,
        failures: measurements.length - successful,
        successRate: Number((successful / measurements.length).toFixed(3)),
        failureRate: Number(((measurements.length - successful) / measurements.length).toFixed(3)),
        providerAttempts: providerMetrics.filter(Boolean).reduce((total, item) =>
            total + 1 + (item.retryCount || 0), 0),
        providerFailures: providerMetrics.filter(item => item?.outcome === 'failure')
            .reduce((all, item) => {
                const category = item.failureCategory || 'UNKNOWN';
                all[category] = (all[category] || 0) + 1;
                return all;
            }, {}),
        overall: {
            endToEnd: summarize(measurements.map(item => item.durationMs)),
            provider: summarize(measurements
                .map(item => item.providerMetric?.providerDurationMs)
                .filter(Number.isFinite)),
            applicationProcessing: summarize(measurements
                .filter(item => item.providerMetric)
                .map(item => Math.max(0, item.durationMs - item.providerMetric.providerDurationMs))),
            retryCount: measurements.reduce((total, item) =>
                total + (item.providerMetric?.retryCount || 0), 0)
        },
        perFeature: featureSummaries
    }, null, 2)}\n`);
}

run().catch(error => {
    console.error(`AI performance benchmark failed: ${error.code || error.name || 'Error'}`);
    process.exitCode = 1;
}).finally(() => {
    console.info = originalConsoleInfo;
});
