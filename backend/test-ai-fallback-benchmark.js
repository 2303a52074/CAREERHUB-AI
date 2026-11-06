require('./utils/loadEnv')();

const fs = require('node:fs');
const path = require('node:path');
const aiService = require('./utils/aiService');
const { extractResumeText } = require('./utils/resumePdf');

const QUALIFICATION_THRESHOLD = 10;
const MAX_P90_LATENCY_MS = 20000;
const MAX_ESTIMATED_COST_PER_SUCCESS_USD = 0.01;
const DEFAULT_CANDIDATE = 'qwen/qwen3-30b-a3b-instruct-2507';
const candidates = (process.env.OPENROUTER_QUALIFICATION_MODELS || DEFAULT_CANDIDATE)
    .split(',')
    .map(model => model.trim())
    .filter(Boolean);
const repetitions = Math.max(1, Number(process.env.OPENROUTER_QUALIFICATION_REPETITIONS) || 10);
const measurements = [];
const providerMetrics = [];
const originalConsoleInfo = console.info;
const originalPrimary = process.env.OPENROUTER_MODEL;
const fallbackVariables = Object.values(aiService.getOpenRouterConfiguration().optionalConfiguration)
    .filter(name => name.startsWith('OPENROUTER_FALLBACK_'));
const originalFallbacks = Object.fromEntries(fallbackVariables.map(name => [name, process.env[name]]));

const textNotPlaceholder = value => typeof value === 'string' &&
    value.trim().length >= 25 &&
    !/^(?:todo|tbd|placeholder|n\/a|not available|sample output|generated response)$/i.test(value.trim());
const listHasSubstance = values => Array.isArray(values) && values.some(textNotPlaceholder);

const features = [
    {
        name: 'technical_interview_question_generation',
        run: () => aiService.generateInterviewQuestions({
            role: 'Backend Engineer',
            difficulty: 'medium',
            type: 'Technical',
            count: 1,
            feature: 'technical_interview_generation',
            profile: { technicalSkills: ['Node.js', 'MongoDB'] }
        }),
        quality: result => result.source === 'openrouter' &&
            result.questions?.length === 1 &&
            textNotPlaceholder(result.questions[0].question) &&
            textNotPlaceholder(result.questions[0].skill) &&
            textNotPlaceholder(result.questions[0].hint)
    },
    {
        name: 'behavioral_interview_question_generation',
        run: () => aiService.generateInterviewQuestions({
            role: 'Backend Engineer',
            difficulty: 'medium',
            type: 'Behavioral',
            count: 1,
            feature: 'behavioral_interview_generation',
            profile: { technicalSkills: ['Node.js', 'MongoDB'] }
        }),
        quality: result => result.source === 'openrouter' &&
            result.questions?.length === 1 &&
            textNotPlaceholder(result.questions[0].question) &&
            textNotPlaceholder(result.questions[0].skill) &&
            textNotPlaceholder(result.questions[0].hint)
    },
    {
        name: 'assessment_mcq_generation',
        run: () => aiService.generateMcqQuestions({
            role: 'Backend Engineer',
            topic: 'Software engineering and system design',
            difficulty: 'medium',
            count: 1,
            profile: { technicalSkills: ['Node.js', 'PostgreSQL'] }
        }),
        quality: result => result.source === 'openrouter' &&
            result.questions?.length === 1 &&
            textNotPlaceholder(result.questions[0].question) &&
            textNotPlaceholder(result.questions[0].explanation) &&
            result.questions[0].options?.length === 4 &&
            new Set(result.questions[0].options).size === 4 &&
            Number.isInteger(result.questions[0].answerIndex)
    },
    {
        name: 'interview_evaluation',
        run: () => aiService.evaluateAnswer(
            'How would you make a REST API resilient to database outages?',
            'I would use bounded timeouts, safe retries for idempotent operations, circuit breaking, and observable recovery checks.',
            { role: 'Backend Engineer', topic: 'System Design', difficulty: 'medium' }
        ),
        quality: result => result.source === 'openrouter' &&
            Number.isFinite(result.score) &&
            textNotPlaceholder(result.feedback) &&
            textNotPlaceholder(result.followUpQuestion) &&
            ['relevance', 'correctness', 'clarity', 'structure', 'completeness']
                .every(key => Number.isInteger(result.rubric?.[key]))
    },
    {
        name: 'resume_analysis',
        run: () => aiService.analyzeResume(
            'Backend engineer with four years building Node.js and TypeScript APIs. Designed REST services, optimized PostgreSQL queries, and deployed Docker workloads on AWS. Added integration tests, structured logging, and incident dashboards.',
            'Backend Engineer'
        ),
        quality: result => result.analysisMethod === 'openrouter' &&
            textNotPlaceholder(result.summary) &&
            Number.isFinite(result.score) &&
            Array.isArray(result.detectedSkills) &&
            Array.isArray(result.recommendations) &&
            listHasSubstance(result.recommendations)
    },
    {
        name: 'pdf_resume_analysis',
        async prepare() {
            const pdfPath = path.join(__dirname, 'test-fixtures', 'valid-resume.pdf');
            return extractResumeText(fs.readFileSync(pdfPath));
        },
        run: text => aiService.analyzeResume(text, 'Backend Engineer', {}, '', 'pdf_resume_analysis'),
        quality: result => result.analysisMethod === 'openrouter' &&
            textNotPlaceholder(result.summary) &&
            Number.isFinite(result.score) &&
            Array.isArray(result.detectedSkills) &&
            Array.isArray(result.recommendations)
    },
    {
        name: 'job_description_analysis',
        run: () => aiService.generateJobDescriptionAdvice({
            jobTitle: 'Backend Engineer',
            company: 'Benchmark Employer',
            jobDescription: 'Build Node.js APIs, optimize PostgreSQL queries, add integration tests, and operate services on AWS.',
            extractedRequirements: ['Node.js', 'PostgreSQL', 'integration testing', 'AWS'],
            missingSkills: ['AWS'],
            profile: { targetRole: 'Backend Engineer', technicalSkills: ['Node.js', 'PostgreSQL'] }
        }),
        quality: result => result.source === 'openrouter' &&
            textNotPlaceholder(result.summary) &&
            listHasSubstance(result.preparationSteps) &&
            listHasSubstance(result.interviewQuestions)
    },
    {
        name: 'skill_gap_analysis',
        run: () => aiService.generateSkillGapAdvice({
            targetRole: 'Backend Engineer',
            matchedSkills: ['Node.js', 'PostgreSQL'],
            missingSkills: ['AWS'],
            profile: { technicalSkills: ['Node.js', 'PostgreSQL'], availableHoursPerWeek: 6 }
        }),
        quality: result => result.source === 'openrouter' &&
            result.insights?.length === 1 &&
            result.insights[0].skill === 'AWS' &&
            textNotPlaceholder(result.insights[0].learningAction) &&
            textNotPlaceholder(result.insights[0].projectIdea)
    },
    {
        name: 'career_roadmap_generation',
        run: () => aiService.generatePersonalizedRoadmap({
            targetRole: 'Backend Engineer',
            technicalSkills: ['Node.js', 'TypeScript'],
            missingSkills: ['PostgreSQL', 'Docker'],
            availableHoursPerWeek: 6
        }),
        quality: result => result.source === 'openrouter' &&
            result.phases?.length >= 3 &&
            result.phases.every(phase => textNotPlaceholder(phase.title) &&
                phase.milestones?.length > 0 &&
                phase.milestones.every(milestone => textNotPlaceholder(milestone.completionCriteria)))
    },
    {
        name: 'daily_plan_generation',
        run: () => aiService.generateDailyPreparationTasks({
            profile: {
                targetRole: 'Backend Engineer',
                technicalSkills: ['Node.js', 'PostgreSQL'],
                availableHoursPerWeek: 6
            },
            pendingMilestone: 'Add a tested database migration'
        }),
        quality: result => result.source === 'openrouter' &&
            result.tasks?.length === 5 &&
            new Set(result.tasks.map(task => task.category)).size === 5 &&
            result.tasks.every(task => textNotPlaceholder(task.title) && textNotPlaceholder(task.description))
    },
    {
        name: 'coding_recommendations',
        run: () => aiService.generateCodingHint({
            title: 'Longest substring without repeated characters',
            description: 'Given a string, return the length of its longest substring without repeating characters.'
        }),
        quality: result => result.source === 'openrouter' &&
            textNotPlaceholder(result.hint) &&
            listHasSubstance(result.concepts) &&
            textNotPlaceholder(result.complexityConsiderations) &&
            !/full solution|complete code|expected output/i.test(result.hint)
    },
    {
        name: 'ai_career_assistant',
        run: () => aiService.chatCareerAssistant(
            'Explain one practical way to prepare for a backend system-design interview.',
            [],
            { name: 'Qualification Candidate', targetRole: 'Backend Engineer', technicalSkills: ['Node.js'] },
            { source: 'qualification fixture; no personal records' }
        ),
        quality: result => result.source === 'openrouter' &&
            textNotPlaceholder(result.reply) &&
            result.reply.length <= 12000
    }
];

function percentile(values, proportion) {
    if (!values.length) return null;
    const sorted = [...values].sort((a, b) => a - b);
    return sorted[Math.max(0, Math.ceil(sorted.length * proportion) - 1)];
}

function errorCategory(error) {
    const code = error?.code || 'APPLICATION_ERROR';
    if (code === 'AI_PROVIDER_TIMEOUT') return 'timeout';
    if (code === 'AI_PROVIDER_INVALID_OUTPUT' &&
        error.providerDiagnostics?.reason === 'invalid_json') return 'invalid_json';
    if (code === 'AI_PROVIDER_INVALID_OUTPUT') return 'schema_failure';
    if (code.startsWith('AI_PROVIDER_') || code === 'AI_RATE_LIMITED' || code === 'AI_MODEL_INVALID') {
        return 'provider_error';
    }
    return 'application_error';
}

async function getModelPricing() {
    const response = await fetch('https://openrouter.ai/api/v1/models', {
        headers: { Authorization: ['Bearer ', process.env[['OPENROUTER', 'API', 'KEY'].join('_' )]].join('') },
        signal: AbortSignal.timeout(15000)
    });
    if (!response.ok) throw new Error(`OpenRouter model listing returned HTTP ${response.status}.`);
    const payload = await response.json();
    return new Map((payload.data || []).map(model => [model.id, model.pricing || {}]));
}

function summarizeFeature(model, feature, pricing) {
    const rows = measurements.filter(item => item.model === model && item.feature === feature.name);
    const successful = rows.filter(item => item.outcome === 'success');
    const latestMetrics = rows.flatMap(item => item.providerMetrics || []);
    const promptTokens = latestMetrics.reduce((total, item) =>
        total + (item?.providerPromptTokens || 0), 0);
    const outputTokens = latestMetrics.reduce((total, item) =>
        total + (item?.outputTokens || 0), 0);
    const rates = pricing.get(model);
    const estimatedCostUsd = rates &&
        Number.isFinite(Number(rates.prompt)) && Number.isFinite(Number(rates.completion))
        ? promptTokens * Number(rates.prompt) + outputTokens * Number(rates.completion)
        : null;
    const providerReportedCostUsd = latestMetrics.some(item =>
        item?.providerReportedCostUsd !== null &&
        Number.isFinite(Number(item?.providerReportedCostUsd)))
        ? latestMetrics.reduce((total, item) =>
            total + (Number(item?.providerReportedCostUsd) || 0), 0)
        : null;
    const validCount = successful.filter(item => item.qualityPassed).length;
    const medianMs = percentile(rows.map(item => item.durationMs), 0.5);
    const p90Ms = percentile(rows.map(item => item.durationMs), 0.9);
    const providerLatencies = rows.map(item =>
        (item.providerMetrics || []).reduce((sum, metric) =>
            sum + (Number(metric?.providerDurationMs) || 0), 0));
    const costPerSuccessUsd = estimatedCostUsd !== null && validCount
        ? estimatedCostUsd / validCount
        : null;
    const hasEnoughSamples = rows.length >= QUALIFICATION_THRESHOLD;
    const qualifies = hasEnoughSamples &&
        validCount >= Math.ceil(rows.length * 0.9) &&
        p90Ms <= MAX_P90_LATENCY_MS &&
        costPerSuccessUsd !== null &&
        costPerSuccessUsd <= MAX_ESTIMATED_COST_PER_SUCCESS_USD;
    return {
        model,
        feature: feature.name,
        sampleSize: rows.length,
        requiredSampleSize: QUALIFICATION_THRESHOLD,
        status: !hasEnoughSamples ? 'INSUFFICIENT_SAMPLE' : qualifies ? 'QUALIFIED' : 'NOT_QUALIFIED',
        successful: validCount,
        failed: rows.length - validCount,
        successRate: rows.length ? Number((validCount / rows.length).toFixed(4)) : 0,
        invalidOutputRate: rows.length
            ? Number((rows.filter(item => ['invalid_json', 'schema_failure'].includes(item.outcome)).length /
                rows.length).toFixed(4))
            : 0,
        errors: {
            timeouts: rows.filter(item => item.outcome === 'timeout').length,
            providerErrors: rows.filter(item => item.outcome === 'provider_error').length,
            invalidJson: rows.filter(item => item.outcome === 'invalid_json').length,
            schemaFailures: rows.filter(item => item.outcome === 'schema_failure').length,
            other: rows.filter(item => item.outcome === 'application_error').length
        },
        latencyMs: {
            endToEnd: { median: medianMs, p90: p90Ms },
            provider: {
                median: percentile(providerLatencies, 0.5),
                p90: percentile(providerLatencies, 0.9)
            }
        },
        providerAttempts: latestMetrics.length,
        retryCount: latestMetrics.reduce((sum, item) => sum + (item?.retryCount || 0), 0),
        tokenUsage: { prompt: promptTokens, output: outputTokens },
        estimatedCostUsd,
        estimatedCostPerSuccessfulResponseUsd: costPerSuccessUsd,
        providerReportedCostUsd,
        qualificationLimits: {
            minimumSuccessRate: 0.9,
            maxP90LatencyMs: MAX_P90_LATENCY_MS,
            maxEstimatedCostPerSuccessfulResponseUsd: MAX_ESTIMATED_COST_PER_SUCCESS_USD
        }
    };
}

async function main() {
    if (process.env.AI_PROVIDER?.trim().toLowerCase() !== 'openrouter' ||
        !process.env.OPENROUTER_API_KEY?.trim()) {
        console.log(JSON.stringify({
            status: 'BLOCKED',
            reason: 'OpenRouter provider and server-side API key are required.'
        }));
        process.exitCode = 2;
        return;
    }

    const pricing = await getModelPricing();
    const unavailable = candidates.filter(model => !pricing.has(model));
    if (unavailable.length) {
        throw new Error(`Candidate models are not present in the current OpenRouter catalog: ${unavailable.join(', ')}`);
    }

    console.info = (label, serialized) => {
        if (label !== 'OpenRouter request metrics:') return;
        try {
            providerMetrics.push(JSON.parse(serialized));
        } catch {
            providerMetrics.push(null);
        }
    };
    for (const name of fallbackVariables) delete process.env[name];

    try {
        for (const model of candidates) {
            process.env.OPENROUTER_MODEL = model;
            for (const feature of features) {
                let prepared;
                let preparationError = null;
                try {
                    if (feature.prepare) prepared = await feature.prepare();
                } catch (error) {
                    preparationError = error;
                }
                for (let repetition = 0; repetition < repetitions; repetition++) {
                    const metricsBefore = providerMetrics.length;
                    const startedAt = performance.now();
                    let outcome = preparationError ? 'provider_error' : 'success';
                    let errorCode = preparationError ? 'FEATURE_INPUT_UNAVAILABLE' : null;
                    let qualityPassed = false;
                    let actualModel = model;
                    if (!preparationError) {
                        try {
                            const result = await feature.run(prepared);
                            actualModel = result.model || result.generationModel || model;
                            if (feature.quality(result) &&
                                (!result.model || result.model === model || result.model.startsWith(`${model}:`))) {
                                qualityPassed = true;
                            } else {
                                outcome = 'schema_failure';
                                errorCode = 'BENCHMARK_VALIDATION_FAILED';
                            }
                        } catch (error) {
                            outcome = errorCategory(error);
                            errorCode = typeof error.code === 'string' ? error.code : 'APPLICATION_ERROR';
                        }
                    }
                    const durationMs = Math.round(performance.now() - startedAt);
                    const callMetrics = providerMetrics.slice(metricsBefore).filter(Boolean);
                    const providerMetric = callMetrics.at(-1) || null;
                    measurements.push({
                        feature: feature.name,
                        model,
                        actualModel,
                        outcome: outcome === 'success' && qualityPassed ? 'success' : outcome,
                        errorCode,
                        qualityPassed,
                        durationMs,
                        providerMetric,
                        providerMetrics: callMetrics
                    });
                    process.stdout.write(
                        `${measurements.length} ${model} ${feature.name} ` +
                        `${qualityPassed ? 'validated' : outcome} ${durationMs}ms\n`
                    );
                }
            }
        }
    } finally {
        console.info = originalConsoleInfo;
        if (originalPrimary === undefined) delete process.env.OPENROUTER_MODEL;
        else process.env.OPENROUTER_MODEL = originalPrimary;
        for (const [name, value] of Object.entries(originalFallbacks)) {
            if (value === undefined) delete process.env[name];
            else process.env[name] = value;
        }
    }

    const featureResults = candidates.flatMap(model =>
        features.map(feature => summarizeFeature(model, feature, pricing)));
    const totals = {
        requests: measurements.length,
        successful: measurements.filter(item => item.outcome === 'success').length,
        failed: measurements.filter(item => item.outcome !== 'success').length,
        medianLatencyMs: percentile(measurements.map(item => item.durationMs), 0.5),
        p90LatencyMs: percentile(measurements.map(item => item.durationMs), 0.9),
        fallbackActivations: providerMetrics.filter(item => item?.fallbackAttempt).length
    };
    console.log(JSON.stringify({
        status: 'COMPLETE',
        provider: 'OpenRouter',
        qualification: 'Only these direct production-generator responses are evaluated; all use existing production validators.',
        sampleSizePerFeature: repetitions,
        minimumSamplesForQualification: QUALIFICATION_THRESHOLD,
        method: 'Sequential real-provider requests; prompts and response bodies are never written to output. A result qualifies only when production validation succeeds, its semantic sanity check passes, P90 is within limit, and estimated per-response cost is within limit.',
        totals,
        featureResults
    }, null, 2));
}

main().catch(error => {
    console.error(`AI feature qualification benchmark failed: ${error.message}`);
    process.exitCode = 1;
}).finally(() => {
    console.info = originalConsoleInfo;
    if (originalPrimary === undefined) delete process.env.OPENROUTER_MODEL;
    else process.env.OPENROUTER_MODEL = originalPrimary;
    for (const [name, value] of Object.entries(originalFallbacks)) {
        if (value === undefined) delete process.env[name];
        else process.env[name] = value;
    }
});
