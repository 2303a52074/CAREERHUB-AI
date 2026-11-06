require('./utils/loadEnv')();

const assert = require('node:assert/strict');
const aiService = require('./utils/aiService');

const workflows = [
    {
        feature: 'assessment_question_generation',
        run: () => aiService.generateMcqQuestions({
            role: 'Backend Engineer',
            topic: 'Software engineering and system design',
            difficulty: 'medium',
            count: 1,
            profile: { technicalSkills: ['Node.js', 'PostgreSQL'] }
        }),
        isValid: result => result.source === 'groq' && result.fallbackUsed === true &&
            result.questions?.length === 1 && result.questions[0].options?.length === 4
    },
    {
        feature: 'job_analyzer',
        run: () => aiService.generateJobDescriptionAdvice({
            jobTitle: 'Backend Engineer',
            company: 'Qualification Example',
            jobDescription: 'Build Node.js APIs, optimize PostgreSQL queries, and operate services on AWS.',
            extractedRequirements: ['Node.js', 'PostgreSQL', 'AWS'],
            missingSkills: ['AWS'],
            profile: { targetRole: 'Backend Engineer', technicalSkills: ['Node.js', 'PostgreSQL'] }
        }),
        isValid: result => result.source === 'groq' && result.fallbackUsed === true &&
            typeof result.summary === 'string' && Array.isArray(result.preparationSteps)
    },
    {
        feature: 'skill_gap_guidance',
        run: () => aiService.generateSkillGapAdvice({
            targetRole: 'Backend Engineer',
            matchedSkills: ['Node.js', 'PostgreSQL'],
            missingSkills: ['AWS'],
            profile: { technicalSkills: ['Node.js', 'PostgreSQL'], availableHoursPerWeek: 6 }
        }),
        isValid: result => result.source === 'groq' && result.fallbackUsed === true &&
            Array.isArray(result.insights) && result.insights.length === 1
    },
    {
        feature: 'career_roadmap',
        run: () => aiService.generatePersonalizedRoadmap({
            targetRole: 'Backend Engineer',
            technicalSkills: ['Node.js', 'TypeScript'],
            missingSkills: ['PostgreSQL', 'Docker'],
            availableHoursPerWeek: 6
        }),
        isValid: result => result.source === 'groq' && result.fallbackUsed === true &&
            result.phases?.length >= 3 && result.phases.every(phase => phase.milestones?.length > 0)
    },
    {
        feature: 'daily_plan',
        run: () => aiService.generateDailyPreparationTasks({
            profile: {
                targetRole: 'Backend Engineer',
                technicalSkills: ['Node.js', 'PostgreSQL'],
                availableHoursPerWeek: 6
            },
            pendingMilestone: 'Add a tested database migration'
        }),
        isValid: result => result.source === 'groq' && result.fallbackUsed === true &&
            result.tasks?.length === 5 && result.tasks.every(task =>
                typeof task.title === 'string' && typeof task.description === 'string')
    },
    {
        feature: 'career_assistant',
        run: () => aiService.chatCareerAssistant(
            'Suggest one practical way to prepare for a backend system-design interview.',
            [],
            { targetRole: 'Backend Engineer', technicalSkills: ['Node.js'] },
            { source: 'synthetic qualification context; no personal records' }
        ),
        isValid: result => result.source === 'groq' && result.fallbackUsed === true &&
            typeof result.reply === 'string' && result.reply.trim().length >= 25
    },
    {
        feature: 'technical_interview_generation',
        run: () => aiService.generateInterviewQuestions({
            role: 'Backend Engineer',
            difficulty: 'medium',
            type: 'Technical',
            count: 1,
            profile: { technicalSkills: ['Node.js', 'PostgreSQL'] }
        }),
        isValid: result => result.source === 'groq' && result.fallbackUsed === true &&
            result.questions?.length === 1
    },
    {
        feature: 'behavioral_interview_generation',
        run: () => aiService.generateInterviewQuestions({
            role: 'Backend Engineer',
            difficulty: 'medium',
            type: 'Behavioral',
            count: 1,
            profile: { targetRole: 'Backend Engineer' }
        }),
        isValid: result => result.source === 'groq' && result.fallbackUsed === true &&
            result.questions?.length === 1
    },
    {
        feature: 'interview_evaluation',
        run: () => aiService.evaluateAnswer(
            'Describe how you would debug a slow API endpoint.',
            'I would inspect latency metrics and traces, identify the slow dependency, reproduce the issue, and verify a measured fix.',
            { role: 'Backend Engineer', topic: 'Performance', difficulty: 'medium' }
        ),
        isValid: result => result.source === 'groq' && result.fallbackUsed === true &&
            result.rubric && typeof result.feedback === 'string'
    },
    {
        feature: 'resume_analysis',
        run: () => aiService.analyzeResume(
            'Backend engineer with experience building Node.js APIs, PostgreSQL schemas, automated tests, and Docker deployments. Improved query performance through indexing and documented service operations.',
            'Backend Engineer',
            { technicalSkills: ['Node.js', 'PostgreSQL'] }
        ),
        isValid: result => result.analysisMethod === 'groq' && result.fallbackUsed === true &&
            Number.isFinite(result.score) && Array.isArray(result.detectedSkills)
    }
];

const originalFetch = global.fetch;
const originalConsoleInfo = console.info;
const originalConsoleWarn = console.warn;
const providerMetrics = [];
const previousEnvironment = {};
const fallbackVariables = [
    'OPENROUTER_FALLBACK_ASSISTANT_MODEL',
    'OPENROUTER_FALLBACK_INTERVIEW_MODEL',
    'OPENROUTER_FALLBACK_BEHAVIORAL_INTERVIEW_MODEL',
    'OPENROUTER_FALLBACK_VIDEO_INTERVIEW_MODEL',
    'OPENROUTER_FALLBACK_ASSESSMENT_MODEL',
    'OPENROUTER_FALLBACK_INTERVIEW_EVALUATION_MODEL',
    'OPENROUTER_FALLBACK_RESUME_MODEL',
    'OPENROUTER_FALLBACK_PDF_RESUME_MODEL',
    'OPENROUTER_FALLBACK_JOB_ANALYZER_MODEL',
    'OPENROUTER_FALLBACK_SKILL_GAP_MODEL',
    'OPENROUTER_FALLBACK_ROADMAP_MODEL',
    'OPENROUTER_FALLBACK_DAILY_PLAN_MODEL',
    'OPENROUTER_FALLBACK_CODING_MODEL'
];

function classifyError(error) {
    if (error?.code === 'AI_PROVIDER_QUOTA_EXCEEDED') return 'quota_exhausted';
    if (error?.code === 'AI_RATE_LIMITED') return 'rate_limited';
    if (error?.code === 'AI_PROVIDER_TIMEOUT') return 'timeout';
    if (error?.code === 'AI_PROVIDER_AUTH_ERROR') return 'authentication_error';
    if (error?.code === 'AI_MODEL_INVALID') return 'model_unavailable';
    if (error?.code === 'AI_PROVIDER_INVALID_OUTPUT') return 'invalid_output';
    if (error?.code?.startsWith('AI_PROVIDER_')) return 'provider_error';
    return 'application_error';
}

function percentile(values, value) {
    if (!values.length) return null;
    const ordered = [...values].sort((a, b) => a - b);
    return ordered[Math.ceil(value * ordered.length) - 1];
}

async function main() {
    const requestedFeatures = process.argv.slice(2)
        .filter(argument => argument.startsWith('--feature='))
        .map(argument => argument.slice('--feature='.length));
    const modelArgument = process.argv.find(argument => argument.startsWith('--model='));
    const samplesArgument = process.argv.find(argument => argument.startsWith('--samples='));
    const samplesPerFeature = samplesArgument ? Number(samplesArgument.slice('--samples='.length)) : 10;
    const delayArgument = process.argv.find(argument => argument.startsWith('--delay-ms='));
    const delayMs = delayArgument ? Number(delayArgument.slice('--delay-ms='.length)) : 1000;
    const selectedModel = modelArgument
        ? modelArgument.slice('--model='.length).trim()
        : process.env.GROQ_MODEL?.trim();
    const requested = requestedFeatures.length
        ? workflows.filter(workflow => requestedFeatures.includes(workflow.feature))
        : workflows;
    if (!requested.length ||
        (requestedFeatures.length && requested.length !== new Set(requestedFeatures).size)) {
        throw new Error('Provide valid --feature=<feature-name> values.');
    }
    if (!Number.isInteger(samplesPerFeature) || samplesPerFeature < 1 || samplesPerFeature > 10) {
        throw new Error('--samples must be an integer from 1 through 10.');
    }
    if (!Number.isInteger(delayMs) || delayMs < 0 || delayMs > 10000) {
        throw new Error('--delay-ms must be an integer from 0 through 10000.');
    }
    const openRouter = aiService.getOpenRouterConfiguration();
    assert.equal(openRouter.providerSupported, true, 'OpenRouter must remain the configured primary provider.');
    assert.ok(process.env.GROQ_API_KEY?.trim(), 'GROQ_API_KEY is required for real-provider qualification.');
    assert.ok(selectedModel, 'Set GROQ_MODEL or provide --model=<available-model-id>.');
    assert.equal(openRouter.model, process.env.OPENROUTER_MODEL?.trim() || 'deepseek/deepseek-chat');
    const modelResponse = await originalFetch('https://api.groq.com/openai/v1/models', {
        headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` }
    });
    const modelPayload = await modelResponse.json().catch(() => ({}));
    if (!modelResponse.ok) throw new Error('Groq model catalog request failed.');
    const availableModels = Array.isArray(modelPayload.data)
        ? modelPayload.data.map(model => model.id).filter(Boolean)
        : [];
    assert.ok(availableModels.includes(selectedModel), 'The selected Groq model is not currently available.');

    for (const name of [
        ...fallbackVariables,
        'GROQ_FALLBACK_FEATURES',
        'GROQ_MODEL'
    ]) previousEnvironment[name] = process.env[name];
    for (const name of fallbackVariables) delete process.env[name];
    process.env.GROQ_MODEL = selectedModel;
    process.env.GROQ_FALLBACK_FEATURES = requested.map(workflow => workflow.feature).join(',');
    console.info = (label, serialized) => {
        if (!label.endsWith('request metrics:')) return;
        try {
            const metric = JSON.parse(serialized);
            providerMetrics.push(metric);
        } catch {
            providerMetrics.push(null);
        }
    };
    console.warn = () => {};

    let simulatedPrimaryRequests = 0;
    let realGroqRequests = 0;
    global.fetch = async (input, options) => {
        const url = new URL(input);
        if (url.hostname === 'openrouter.ai') {
            simulatedPrimaryRequests++;
            return new Response(JSON.stringify({
                error: { message: 'Controlled test-only primary HTTP 503.' }
            }), { status: 503, headers: { 'content-type': 'application/json' } });
        }
        if (url.hostname === 'api.groq.com') realGroqRequests++;
        return originalFetch(input, options);
    };

    const results = [];
    let stopReason = null;
    try {
        for (const workflow of requested) {
            const durations = [];
            let attempted = 0;
            let valid = 0;
            const errors = {};
            let outputTokens = 0;
            let promptTokens = 0;
            let estimatedCostUsd = 0;
            let costReported = false;
            for (let sample = 0; sample < samplesPerFeature; sample++) {
                attempted++;
                const started = Date.now();
                let latencyRecorded = false;
                try {
                    const result = await workflow.run();
                    const latency = Date.now() - started;
                    durations.push(latency);
                    latencyRecorded = true;
                    if (!workflow.isValid(result)) throw Object.assign(new Error('Production schema output was not valid.'), {
                        code: 'AI_PROVIDER_INVALID_OUTPUT'
                    });
                    valid++;
                } catch (error) {
                    const classification = classifyError(error);
                    const safeCode = /^[A-Z0-9_]{1,64}$/.test(error?.code || '')
                        ? error.code
                        : error?.name === 'AssertionError'
                            ? 'ASSERTION_ERROR'
                            : 'UNKNOWN';
                    const errorKey = `${classification}:${safeCode}`;
                    errors[errorKey] = (errors[errorKey] || 0) + 1;
                    if (!latencyRecorded) durations.push(Date.now() - started);
                    if (['quota_exhausted', 'rate_limited', 'authentication_error'].includes(classification)) {
                        stopReason = classification;
                    }
                }
                const metric = providerMetrics.filter(item =>
                    item && item.feature === workflow.feature && item.provider === 'groq'
                ).at(-1);
                if (metric) {
                    outputTokens += Number(metric.outputTokens) || 0;
                    promptTokens += Number(metric.providerPromptTokens) || 0;
                    if (Number.isFinite(metric.providerReportedCostUsd)) {
                        estimatedCostUsd += metric.providerReportedCostUsd;
                        costReported = true;
                    }
                }
                if (stopReason) break;
                if (delayMs > 0) await new Promise(resolve => setTimeout(resolve, delayMs));
            }
            results.push({
                feature: workflow.feature,
                requested: samplesPerFeature,
                attempted,
                valid,
                errors,
                successRate: attempted ? Math.round(valid / attempted * 100) : null,
                medianLatencyMs: percentile(durations, 0.5),
                p90LatencyMs: percentile(durations, 0.9),
                model: selectedModel,
                outputTokens,
                promptTokens,
                estimatedCostUsd: costReported ? Number(estimatedCostUsd.toFixed(8)) : null,
                qualification: samplesPerFeature < 10 || attempted < 10
                    ? 'INSUFFICIENT_SAMPLE'
                    : valid < 9
                        ? 'NOT_QUALIFIED'
                        : !costReported
                            ? 'SCHEMA_THRESHOLD_MET_COST_UNVERIFIED'
                            : percentile(durations, 0.9) > 20000
                                ? 'LATENCY_NOT_ACCEPTABLE'
                                : 'CANDIDATE_FOR_COST_REVIEW'
            });
            if (stopReason) break;
        }
    } finally {
        global.fetch = originalFetch;
        console.info = originalConsoleInfo;
        console.warn = originalConsoleWarn;
        for (const [name, value] of Object.entries(previousEnvironment)) {
            if (value === undefined) delete process.env[name];
            else process.env[name] = value;
        }
    }

    console.log(JSON.stringify({
        primaryModel: openRouter.model,
        groqModel: selectedModel,
        primaryFailureSetup: simulatedPrimaryRequests
            ? 'HTTP 503 injected locally; not a natural OpenRouter outage.'
            : 'OpenRouter was not called; Groq used its own backend key because no primary key was configured.',
        simulatedPrimaryRequests,
        realGroqRequests,
        stopReason,
        results
    }, null, 2));
}

main().catch(error => {
    console.error('Groq qualification could not complete:', classifyError(error));
    process.exitCode = 1;
});
