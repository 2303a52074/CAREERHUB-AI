require('./utils/loadEnv')();

const assert = require('node:assert/strict');
const aiService = require('./utils/aiService');

const MODEL = 'qwen/qwen3-30b-a3b-instruct-2507';
const PRIMARY_MODEL = 'deepseek/deepseek-chat';
const workflows = [
    {
        feature: 'assessment_question_generation',
        environment: 'OPENROUTER_FALLBACK_ASSESSMENT_MODEL',
        run: () => aiService.generateMcqQuestions({
            role: 'Backend Engineer',
            topic: 'Software engineering and system design',
            difficulty: 'medium',
            count: 1,
            profile: { technicalSkills: ['Node.js', 'PostgreSQL'] }
        }),
        validate: result => result.source === 'openrouter' &&
            result.questions?.length === 1 &&
            result.questions[0].options?.length === 4 &&
            Number.isInteger(result.questions[0].answerIndex)
    },
    {
        feature: 'job_analyzer',
        environment: 'OPENROUTER_FALLBACK_JOB_ANALYZER_MODEL',
        run: () => aiService.generateJobDescriptionAdvice({
            jobTitle: 'Backend Engineer',
            company: 'Verification Employer',
            jobDescription: 'Build Node.js APIs, optimize PostgreSQL queries, and operate services on AWS.',
            extractedRequirements: ['Node.js', 'PostgreSQL', 'AWS'],
            missingSkills: ['AWS'],
            profile: { targetRole: 'Backend Engineer', technicalSkills: ['Node.js', 'PostgreSQL'] }
        }),
        validate: result => result.source === 'openrouter' &&
            typeof result.summary === 'string' &&
            Array.isArray(result.preparationSteps) &&
            Array.isArray(result.interviewQuestions)
    },
    {
        feature: 'skill_gap_guidance',
        environment: 'OPENROUTER_FALLBACK_SKILL_GAP_MODEL',
        run: () => aiService.generateSkillGapAdvice({
            targetRole: 'Backend Engineer',
            matchedSkills: ['Node.js', 'PostgreSQL'],
            missingSkills: ['AWS'],
            profile: { technicalSkills: ['Node.js', 'PostgreSQL'], availableHoursPerWeek: 6 }
        }),
        validate: result => result.source === 'openrouter' &&
            result.insights?.length === 1 &&
            result.insights[0].skill === 'AWS'
    },
    {
        feature: 'career_roadmap',
        environment: 'OPENROUTER_FALLBACK_ROADMAP_MODEL',
        run: () => aiService.generatePersonalizedRoadmap({
            targetRole: 'Backend Engineer',
            technicalSkills: ['Node.js', 'TypeScript'],
            missingSkills: ['PostgreSQL', 'Docker'],
            availableHoursPerWeek: 6
        }),
        validate: result => result.source === 'openrouter' &&
            result.phases?.length >= 3 &&
            result.phases.every(phase => phase.milestones?.length > 0)
    },
    {
        feature: 'daily_plan',
        environment: 'OPENROUTER_FALLBACK_DAILY_PLAN_MODEL',
        run: () => aiService.generateDailyPreparationTasks({
            profile: {
                targetRole: 'Backend Engineer',
                technicalSkills: ['Node.js', 'PostgreSQL'],
                availableHoursPerWeek: 6
            },
            pendingMilestone: 'Add a tested database migration'
        }),
        validate: result => result.source === 'openrouter' &&
            result.tasks?.length === 5 &&
            result.tasks.every(task => typeof task.title === 'string' && typeof task.description === 'string')
    },
    {
        feature: 'career_assistant',
        environment: 'OPENROUTER_FALLBACK_ASSISTANT_MODEL',
        run: () => aiService.chatCareerAssistant(
            'Suggest one practical way to prepare for a backend system-design interview.',
            [],
            { name: 'Fallback Verification Candidate', targetRole: 'Backend Engineer', technicalSkills: ['Node.js'] },
            { source: 'synthetic verification context; no personal records' }
        ),
        validate: result => result.source === 'openrouter' &&
            typeof result.reply === 'string' &&
            result.reply.trim().length >= 25
    }
];
const requestedFeatures = process.argv.slice(2)
    .filter(argument => argument.startsWith('--feature='))
    .map(argument => argument.slice('--feature='.length));
const selectedWorkflows = requestedFeatures.length
    ? workflows.filter(workflow => requestedFeatures.includes(workflow.feature))
    : workflows;

const providerMetrics = [];
const originalConsoleInfo = console.info;
const originalFetch = global.fetch;
const originalPrimary = process.env.OPENROUTER_MODEL;
let simulatedPrimaryRequests = 0;

function classifyError(error) {
    if (error?.code === 'AI_PROVIDER_QUOTA_EXCEEDED') return 'quota_exhausted';
    if (error?.code === 'AI_RATE_LIMITED') return 'rate_limited';
    if (error?.code === 'AI_PROVIDER_TIMEOUT') return 'timeout';
    if (error?.code === 'AI_PROVIDER_INVALID_OUTPUT') return 'invalid_output';
    if (error?.code?.startsWith('AI_PROVIDER_')) return 'provider_error';
    return 'application_error';
}

async function main() {
    if (!selectedWorkflows.length ||
        (requestedFeatures.length > 0 &&
            selectedWorkflows.length !== new Set(requestedFeatures).size)) {
        throw new Error('Specify one or more valid --feature=<feature-name> arguments.');
    }
    const configuration = aiService.getOpenRouterConfiguration();
    assert.equal(configuration.model, PRIMARY_MODEL,
        'Live fallback qualification probe requires DeepSeek to remain primary.');
    assert.equal(configuration.providerSupported, true,
        'OpenRouter must be the configured provider.');
    assert.equal(configuration.apiKeyConfigured, true,
        'A backend OpenRouter API key is required.');

    for (const workflow of workflows) {
        assert.equal(process.env[workflow.environment]?.trim(), MODEL,
            `${workflow.environment} must match the benchmark-qualified model.`);
        const selected = aiService.getOpenRouterConfiguration(workflow.feature);
        assert.equal(selected.model, PRIMARY_MODEL);
        assert.equal(selected.fallbackModel, MODEL);
        assert.equal(selected.fallbackEnvironment, workflow.environment);
    }
    for (const feature of [
        'technical_interview_generation',
        'behavioral_interview_generation',
        'interview_evaluation',
        'resume_analysis',
        'pdf_resume_analysis',
        'coding_hint'
    ]) {
        assert.equal(aiService.getOpenRouterConfiguration(feature).fallbackConfigured, false,
            `${feature} must not use Qwen.`);
    }
    assert.equal(process.env.OPENROUTER_FALLBACK_MODEL?.trim() || '', '',
        'The global fallback must remain unset.');
    for (const environment of [
        'OPENROUTER_FALLBACK_INTERVIEW_MODEL',
        'OPENROUTER_FALLBACK_BEHAVIORAL_INTERVIEW_MODEL',
        'OPENROUTER_FALLBACK_VIDEO_INTERVIEW_MODEL',
        'OPENROUTER_FALLBACK_INTERVIEW_EVALUATION_MODEL',
        'OPENROUTER_FALLBACK_RESUME_MODEL',
        'OPENROUTER_FALLBACK_PDF_RESUME_MODEL',
        'OPENROUTER_FALLBACK_CODING_MODEL'
    ]) {
        assert.equal(process.env[environment]?.trim() || '', '',
            `${environment} must remain unset.`);
    }

    console.info = (label, serialized) => {
        if (label !== 'OpenRouter request metrics:') return;
        try {
            providerMetrics.push(JSON.parse(serialized));
        } catch {
            providerMetrics.push(null);
        }
    };
    process.env.OPENROUTER_MODEL = PRIMARY_MODEL;
    global.fetch = async (input, options) => {
        const body = JSON.parse(options.body);
        if (String(input).includes('/chat/completions') && body.model === PRIMARY_MODEL) {
            simulatedPrimaryRequests++;
            return new Response(JSON.stringify({
                error: { message: 'Controlled test-only primary HTTP 503.' }
            }), { status: 503, headers: { 'content-type': 'application/json' } });
        }
        return originalFetch(input, options);
    };

    const results = [];
    for (const workflow of selectedWorkflows) {
        const metricsStart = providerMetrics.length;
        const primaryStart = simulatedPrimaryRequests;
        const startedAt = performance.now();
        try {
            const result = await workflow.run();
            const metrics = providerMetrics.slice(metricsStart).filter(Boolean);
            const fallbackValid = workflow.validate(result);
            const fallbackActivationCount = metrics.filter(metric =>
                metric.fallbackAttempt === true).length;
            const passed = fallbackValid &&
                result.model === MODEL &&
                result.fallbackUsed === true &&
                simulatedPrimaryRequests > primaryStart &&
                metrics.some(metric => metric.model === MODEL &&
                    metric.fallbackAttempt === true &&
                    metric.outcome === 'success');
            results.push({
                workflow: workflow.feature,
                primary: PRIMARY_MODEL,
                primaryFailure: 'SIMULATED_HTTP_503',
                fallback: MODEL,
                fallbackUsed: Boolean(result.fallbackUsed),
                returnedModel: result.model || null,
                schemaValid: fallbackValid,
                fallbackActivationCount,
                elapsedMs: Math.round(performance.now() - startedAt),
                result: passed ? 'PASS' : 'FAIL'
            });
            console.log(JSON.stringify(results[results.length - 1]));
            if (!passed) {
                process.exitCode = 1;
                break;
            }
        } catch (error) {
            const category = classifyError(error);
            const metrics = providerMetrics.slice(metricsStart).filter(Boolean);
            const row = {
                workflow: workflow.feature,
                primary: PRIMARY_MODEL,
                primaryFailure: 'SIMULATED_HTTP_503',
                fallback: MODEL,
                fallbackUsed: Boolean(error.fallbackAttempted),
                schemaValid: false,
                elapsedMs: Math.round(performance.now() - startedAt),
                error: category,
                code: error.code || 'APPLICATION_ERROR',
                fallbackActivationCount: metrics.filter(metric =>
                    metric.fallbackAttempt === true).length,
                fallbackProviderAttempt: metrics.some(metric =>
                    metric.model === MODEL && metric.fallbackAttempt === true),
                result: category === 'quota_exhausted' ? 'BLOCKED' : 'FAIL'
            };
            console.log(JSON.stringify(row));
            results.push(row);
            if (category === 'quota_exhausted') {
                console.log('Stopping probe immediately: OpenRouter reported quota exhaustion.');
                process.exitCode = 2;
                break;
            }
            process.exitCode = 1;
            continue;
        }
    }
    const attempted = results.length;
    console.log(JSON.stringify({
        summary: {
            attemptedWorkflows: attempted,
            passed: results.filter(result => result.result === 'PASS').length,
            blocked: results.filter(result => result.result === 'BLOCKED').length,
            failed: results.filter(result => result.result === 'FAIL').length,
            simulatedPrimaryFailureRequests: simulatedPrimaryRequests,
            realFallbackActivations: results.reduce((total, result) =>
                total + (result.fallbackActivationCount || 0), 0),
            naturalDeepSeekFailures: 0,
            note: 'Primary failures were simulated locally; only fallback requests reached OpenRouter.'
        }
    }));
}

main().catch(error => {
    console.error(`Qualified fallback probe could not start: ${error.message}`);
    process.exitCode = 1;
}).finally(() => {
    console.info = originalConsoleInfo;
    global.fetch = originalFetch;
    if (originalPrimary === undefined) delete process.env.OPENROUTER_MODEL;
    else process.env.OPENROUTER_MODEL = originalPrimary;
});
