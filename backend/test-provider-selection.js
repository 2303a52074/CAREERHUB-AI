const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const aiService = require('./utils/aiService');
require('./models/CareerAssessment');
require('./models/CareerAssessmentSession');
require('./models/CareerConversation');
require('./models/ExamSession');
require('./models/DailyPlan');

const geminiConversation = new mongoose.models.CareerConversation({
    userId: 'gemini-provenance-test',
    messages: [{
        role: 'assistant',
        content: 'Validated Gemini response',
        source: 'gemini',
        model: 'gemini-test-model',
        fallbackUsed: false
    }]
});
assert.equal(geminiConversation.validateSync(), undefined);
const localConversation = new mongoose.models.CareerConversation({
    userId: 'local-profile-test',
    messages: [{
        role: 'assistant',
        content: 'Answered from the saved profile',
        source: 'local',
        model: 'CareerHub profile',
        fallbackUsed: false
    }]
});
assert.equal(localConversation.validateSync(), undefined);

const originalFetch = global.fetch;
const originalConsoleInfo = console.info;
const originalEnvironment = Object.fromEntries([
    'AI_PROVIDER',
    'OPENROUTER_API_KEY',
    'OPENROUTER_MODEL',
    'OPENROUTER_BASE_URL',
    'OPENROUTER_FALLBACK_MODEL',
    'OPENROUTER_FALLBACK_INTERVIEW_MODEL',
    'GROQ_API_KEY',
    'GROQ_MODEL',
    'GROQ_FALLBACK_FEATURES',
    'GROQ_PRIMARY_FEATURES',
    'GEMINI_API_KEY',
    'GEMINI_MODEL',
    'GEMINI_PRIMARY_FEATURES',
    'GEMINI_QUALIFICATION_MODE',
    'OPENROUTER_ROLLBACK_FEATURES',
    'CAREERHUB_AI_DATA_PROCESSING_APPROVED',
    'CAREERHUB_AI_DATA_PROCESSING_PROVIDER',
    'NODE_ENV',
    ...[
        'OPENROUTER_FALLBACK_ASSISTANT_MODEL',
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
    ]
].map(key => [key, process.env[key]]));

async function run() {
    let providerRequests = 0;
    const providerMetrics = [];
    const geminiProviderMetrics = [];
    try {
        process.env.GROQ_PRIMARY_FEATURES = '';
        process.env.GEMINI_PRIMARY_FEATURES = '';
        process.env.GEMINI_QUALIFICATION_MODE = '';
        process.env.OPENROUTER_ROLLBACK_FEATURES = '';
        process.env.GROQ_FALLBACK_FEATURES = '';
        process.env.CAREERHUB_AI_DATA_PROCESSING_APPROVED = 'false';
        delete process.env.CAREERHUB_AI_DATA_PROCESSING_PROVIDER;
        for (const key of Object.keys(originalEnvironment)) {
            if (key.startsWith('OPENROUTER_FALLBACK_')) delete process.env[key];
        }
        process.env.AI_PROVIDER = 'openrouter';
        process.env.OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
        process.env.OPENROUTER_MODEL = 'deepseek/test-model';
        delete process.env.OPENROUTER_API_KEY;
        global.fetch = async () => {
            providerRequests++;
            throw new Error('No request should be sent without an OpenRouter key.');
        };
        assert.equal(aiService.getCareerAssistantStatus().configured, false);
        await assert.rejects(
            aiService.completeWithAI([{ role: 'user', content: 'test' }]),
            error => error.code === 'AI_PROVIDER_NOT_CONFIGURED'
        );
        assert.equal(providerRequests, 0);

        process.env.OPENROUTER_API_KEY = 'test-only-key';
        process.env.AI_PROVIDER = 'gemini';
        await assert.rejects(
            aiService.completeWithAI([{ role: 'user', content: 'test' }]),
            error => error.code === 'AI_PROVIDER_NOT_CONFIGURED'
        );
        assert.equal(providerRequests, 0);
        assert.equal(aiService.getCareerAssistantStatus().configured, false);

        process.env.AI_PROVIDER = 'openrouter';
        console.info = (label, serialized) => {
            if (label === 'OpenRouter request metrics:') providerMetrics.push(JSON.parse(serialized));
        };
        global.fetch = async (url, init) => {
            providerRequests++;
            assert.equal(new URL(url).href, 'https://openrouter.ai/api/v1/chat/completions');
            assert.equal(init.method, 'POST');
            assert.equal(init.headers.Authorization, 'Bearer test-only-key');
            assert.equal(init.headers['Content-Type'], 'application/json');
            const body = JSON.parse(init.body);
            assert.equal(body.model, 'deepseek/test-model');
            assert.deepEqual(body.messages, [{ role: 'user', content: 'Generate one short response.' }]);
            assert.equal(body.max_tokens, 800);
            return new Response(JSON.stringify({
                id: 'test-response',
                model: 'deepseek/test-model',
                choices: [{ message: { content: 'Generated by mocked OpenRouter.' } }],
                usage: { prompt_tokens: 17, completion_tokens: 5 }
            }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        };
        const result = await aiService.completeWithAI([
            { role: 'user', content: 'Generate one short response.' }
        ], { feature: 'metric_test' });
        assert.equal(providerRequests, 1);
        assert.equal(result.provider, 'openrouter');
        assert.equal(result.text, 'Generated by mocked OpenRouter.');
        assert.equal(result.model, 'deepseek/test-model');
        assert.equal(providerMetrics.length, 1);
        assert.equal(providerMetrics[0].feature, 'metric_test');
        assert.equal(providerMetrics[0].model, 'deepseek/test-model');
        assert.equal(providerMetrics[0].outcome, 'success');
        assert.equal(providerMetrics[0].providerPromptTokens, 17);
        assert.equal(providerMetrics[0].outputTokens, 5);
        assert.equal(providerMetrics[0].retryCount, 0);
        assert.equal(JSON.stringify(providerMetrics).includes('Generate one short response.'), false);
        assert.equal(aiService.getCareerAssistantStatus().provider, 'OpenRouter');
        assert.equal(aiService.getCareerAssistantStatus().verified, true);
        assert.equal(JSON.stringify(aiService.getCareerAssistantStatus()).includes('test-only-key'), false);
        assert.ok(mongoose.models.DailyPlan.schema.path('generationSource').enumValues.includes('openrouter'));
        assert.ok(mongoose.models.DailyPlan.schema.path('generationSource').enumValues.includes('groq'));
        assert.ok(mongoose.models.CareerAssessment.schema.path('generationSource').enumValues.includes('groq'));
        assert.ok(mongoose.models.CareerAssessmentSession.schema.path('source').enumValues.includes('groq'));
        assert.ok(mongoose.models.CareerAssessmentSession.schema.path('questions.0.source').enumValues.includes('groq'));
        assert.ok(mongoose.models.ExamSession.schema.path('generationSource').enumValues.includes('groq'));
        assert.ok(mongoose.models.ExamSession.schema.path('questions.0.source').enumValues.includes('groq'));
        assert.ok(mongoose.models.ExamSession.schema.path('responses.0.source').enumValues.includes('groq'));
        assert.ok(mongoose.models.CareerConversation.schema.path('messages.0.source').enumValues.includes('groq'));

        process.env.GEMINI_API_KEY = 'gemini-test-only-key';
        delete process.env.GEMINI_MODEL;
        process.env.AI_PROVIDER = 'gemini';
        process.env.GEMINI_PRIMARY_FEATURES = '';
        assert.equal(aiService.getGeminiConfiguration('assessment_question_generation').model, 'gemini-3.1-flash-lite');
        assert.equal(
            aiService.getGeminiConfiguration('assessment_question_generation').configurationIssue,
            'feature_not_enabled'
        );
        process.env.GEMINI_MODEL = 'gemini-test-model';
        process.env.GEMINI_PRIMARY_FEATURES = [
            'assessment_question_generation',
            'technical_interview_generation',
            'behavioral_interview_generation',
            'video_interview_generation',
            'coding_hint'
        ].join(',');
        process.env.AI_PROVIDER = 'gemini';
        console.info = (label, serialized) => {
            if (label === 'Gemini request metrics:') geminiProviderMetrics.push(JSON.parse(serialized));
            if (label === 'OpenRouter request metrics:') providerMetrics.push(JSON.parse(serialized));
        };
        assert.equal(aiService.getCareerAssistantStatus().configured, false);
        assert.equal(
            aiService.getGeminiConfiguration('career_assistant').configurationIssue,
            'privacy_restricted'
        );
        assert.equal(
            aiService.getCareerAssistantStatus().assistantMode,
            'unavailable'
        );
        assert.equal(
            aiService.getGeminiConfiguration('interview_evaluation').configurationIssue,
            'privacy_restricted'
        );
        assert.equal(aiService.getGeminiConfiguration('resume_analysis').primaryEnabled, false);
        assert.equal(aiService.getGeminiConfiguration('pdf_resume_analysis').primaryEnabled, false);
        assert.equal(aiService.getGeminiConfiguration('docx_resume_analysis').primaryEnabled, false);
        const geminiFeatures = [
            'assessment_question_generation',
            'technical_interview_generation',
            'behavioral_interview_generation',
            'video_interview_generation',
            'coding_hint'
        ];
        const geminiHosts = [];
        global.fetch = async (input, init) => {
            const url = new URL(input);
            geminiHosts.push(url.hostname);
            assert.equal(url.href, 'https://generativelanguage.googleapis.com/v1beta/models/gemini-test-model:generateContent');
            assert.equal(init.headers['x-goog-api-key'], 'gemini-test-only-key');
            assert.equal(init.headers.Authorization, undefined);
            const body = JSON.parse(init.body);
            assert.deepEqual(body.contents, [{
                role: 'user',
                parts: [{ text: 'Gemini direct-provider selection test.' }]
            }]);
            assert.equal(body.generationConfig.responseMimeType, 'application/json');
            return new Response(JSON.stringify({
                responseId: 'gemini-test-response',
                modelVersion: 'gemini-test-model',
                candidates: [{
                    content: { parts: [{ text: '{"ok":true}' }] },
                    finishReason: 'STOP'
                }],
                usageMetadata: {
                    promptTokenCount: 9,
                    candidatesTokenCount: 4,
                    totalTokenCount: 13
                }
            }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        };
        for (const feature of geminiFeatures) {
            const geminiResult = await aiService.completeWithAI(
                [{ role: 'user', content: 'Gemini direct-provider selection test.' }],
                {
                    feature,
                    responseFormat: true,
                    maxAttempts: 1,
                    validateResponse: text => assert.equal(JSON.parse(text).ok, true)
                }
            );
            assert.equal(geminiResult.provider, 'gemini', feature);
            assert.equal(geminiResult.model, 'gemini-test-model', feature);
            assert.equal(geminiResult.fallbackUsed, false, feature);
        }
        assert.deepEqual(geminiHosts, Array(geminiFeatures.length)
            .fill('generativelanguage.googleapis.com'));
        assert.equal(geminiProviderMetrics.length, geminiFeatures.length);
        assert.equal(JSON.stringify(geminiProviderMetrics).includes('Gemini direct-provider selection test.'), false);
        assert.equal(JSON.stringify(geminiProviderMetrics).includes('gemini-test-only-key'), false);
        const privacySafePrompts = [];
        global.fetch = async (input, init) => {
            const body = JSON.parse(init.body);
            const prompt = body.contents.flatMap(item => item.parts.map(part => part.text)).join('\n');
            privacySafePrompts.push(prompt);
            const instruction = body.systemInstruction?.parts?.[0]?.text || '';
            const text = instruction.includes('multiple-choice career assessment questions')
                ? JSON.stringify({
                    questions: [{
                        question: 'Which data structure supports average constant-time key lookup?',
                        options: ['Hash table', 'Linked list', 'Stack', 'Queue'],
                        answerIndex: 0,
                        explanation: 'Hash tables provide average constant-time lookup.',
                        topic: 'Data structures and algorithms',
                        difficulty: 'medium'
                    }]
                })
                : instruction.includes('interview question writer')
                    ? JSON.stringify({
                        questions: [{
                            question: 'How would you design a reliable service?',
                            skill: 'System design',
                            hint: 'Discuss availability and failure handling.'
                        }]
                    })
                    : JSON.stringify({
                        hint: 'Track values as you scan the input once.',
                        concepts: ['Hash set'],
                        complexityConsiderations: 'Consider the memory used by stored values.'
                    });
            return new Response(JSON.stringify({
                modelVersion: 'gemini-test-model',
                candidates: [{ content: { parts: [{ text }] }, finishReason: 'STOP' }]
            }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        };
        const safeAssessment = await aiService.generateMcqQuestions({
            role: 'Private Candidate Role',
            topic: 'Data structures and algorithms',
            difficulty: 'medium',
            count: 1,
            profile: {
                name: 'Private Candidate Name',
                technicalSkills: ['Private Skill'],
                interests: ['Private Interest']
            }
        });
        const safeInterview = await aiService.generateInterviewQuestions({
            role: 'Private Candidate Role',
            company: 'Private Company',
            difficulty: 'medium',
            type: 'Technical',
            count: 1,
            profile: {
                name: 'Private Candidate Name',
                technicalSkills: ['Private Skill'],
                projects: [{ title: 'Private Project' }]
            }
        });
        const safeCodingHint = await aiService.generateCodingHint({
            title: 'Find duplicate values',
            description: 'Given an array of integers, return the values appearing more than once.'
        });
        assert.equal(safeAssessment.contextMode, 'generic_privacy_safe');
        assert.equal(safeInterview.contextMode, 'generic_privacy_safe');
        assert.equal(safeCodingHint.contextMode, 'generic_privacy_safe');
        for (const prompt of privacySafePrompts) {
            assert.doesNotMatch(prompt, /Private Candidate|Private Company|Private Skill|Private Interest|Private Project/);
        }
        const requestCountBeforePrivacyBlock = providerRequests + geminiHosts.length;
        await assert.rejects(
            aiService.chatCareerAssistant(
                'who am i',
                [],
                { name: 'Private Candidate Name', email: 'private@example.test' },
                {}
            ),
            error => error.code === 'AI_PROVIDER_NOT_CONFIGURED' &&
                error.providerDiagnostics?.configurationIssue === 'feature_not_enabled'
        );
        assert.equal(providerRequests + geminiHosts.length, requestCountBeforePrivacyBlock);
        process.env.GEMINI_PRIMARY_FEATURES += ',career_assistant_general';
        const generalStatus = aiService.getCareerAssistantStatus();
        assert.equal(generalStatus.configured, true);
        assert.equal(generalStatus.assistantMode, 'general_privacy_safe');
        const promptCountBeforeGeneralChat = privacySafePrompts.length;
        const generalChat = await aiService.chatCareerAssistant(
            'How can I prepare for a system design interview?',
            [{ role: 'user', content: 'Private saved conversation content' }],
            { name: 'Private Candidate Name', email: 'private@example.test' },
            { privateContext: 'Private saved profile data' }
        );
        assert.equal(generalChat.contextMode, 'general_privacy_safe');
        assert.equal(generalChat.source, 'gemini');
        assert.equal(privacySafePrompts.length, promptCountBeforeGeneralChat + 1);
        assert.match(privacySafePrompts.at(-1), /How can I prepare for a system design interview/);
        assert.doesNotMatch(privacySafePrompts.at(-1), /Private Candidate|private@example|Private saved/);
        const generalProviderRequestCount = geminiHosts.length;
        const localProfileAnswer = await aiService.chatCareerAssistant(
            'Who am I? Tell me my saved skills.',
            [{ role: 'user', content: 'Private saved conversation content' }],
            {
                name: 'Private Candidate Name',
                email: 'private@example.test',
                targetRole: 'Backend Engineer',
                technicalSkills: ['Node.js', 'MongoDB']
            },
            { privateContext: 'Private saved profile data' }
        );
        assert.equal(localProfileAnswer.contextMode, 'local_profile');
        assert.equal(localProfileAnswer.source, 'local');
        assert.match(localProfileAnswer.reply, /Private Candidate Name/);
        assert.match(localProfileAnswer.reply, /Backend Engineer/);
        assert.match(localProfileAnswer.reply, /Node\.js, MongoDB/);
        assert.doesNotMatch(localProfileAnswer.reply, /private@example\.test|Private saved conversation content/);
        assert.equal(geminiHosts.length, generalProviderRequestCount);
        global.fetch = async () => new Response(JSON.stringify({
            error: {
                code: 404,
                status: 'NOT_FOUND',
                message: 'This model is no longer available to new users.',
                details: [{ reason: 'MODEL_ACCESS_RESTRICTED', domain: 'googleapis.com' }]
            }
        }), { status: 404, headers: { 'Content-Type': 'application/json' } });
        await assert.rejects(
            aiService.completeWithAI([{ role: 'user', content: 'Model access diagnostic test.' }], {
                feature: 'assessment_question_generation',
                maxAttempts: 1
            }),
            error => error.code === 'AI_MODEL_INVALID' &&
                error.providerDiagnostics?.httpStatus === 404 &&
                error.providerDiagnostics?.googleCode === 404 &&
                error.providerDiagnostics?.googleStatus === 'NOT_FOUND' &&
                error.providerDiagnostics?.googleReasons?.includes('MODEL_ACCESS_RESTRICTED') &&
                error.providerDiagnostics?.googleMessage === 'This model is no longer available to new users.' &&
                !JSON.stringify(error.providerDiagnostics).includes('gemini-test-only-key')
        );
        await assert.rejects(
            aiService.completeWithAI([{ role: 'user', content: 'private resume text is blocked' }], {
                feature: 'resume_analysis',
                maxAttempts: 1
            }),
            error => error.code === 'AI_PROVIDER_NOT_CONFIGURED' &&
                error.provider === 'Gemini' &&
                error.providerDiagnostics?.configurationIssue === 'privacy_restricted'
        );
        assert.equal(geminiHosts.length, geminiFeatures.length);

        const geminiFailureHosts = [];
        global.fetch = async input => {
            geminiFailureHosts.push(new URL(input).hostname);
            return new Response('{}', { status: 503 });
        };
        await assert.rejects(
            aiService.completeWithAI([{ role: 'user', content: 'Gemini failure must not silently route.' }], {
                feature: 'assessment_question_generation',
                maxAttempts: 1
            }),
            error => error.code === 'AI_PROVIDER_UNAVAILABLE' &&
                error.provider === 'Gemini' &&
                error.fallbackAttempted !== true
        );
        assert.deepEqual(geminiFailureHosts, ['generativelanguage.googleapis.com']);

        process.env.GROQ_API_KEY = 'groq-test-only-key';
        process.env.GROQ_MODEL = 'test/groq-model';
        process.env.GROQ_FALLBACK_FEATURES = 'assessment_question_generation';
        const geminiGroqHosts = [];
        global.fetch = async input => {
            const host = new URL(input).hostname;
            geminiGroqHosts.push(host);
            if (host === 'generativelanguage.googleapis.com') {
                return new Response('{}', { status: 503 });
            }
            return new Response(JSON.stringify({
                model: 'test/groq-model',
                choices: [{ message: { content: '{"ok":true}' } }]
            }), { status: 200 });
        };
        const geminiGroqFallback = await aiService.completeWithAI(
            [{ role: 'user', content: 'qualified Groq fallback test' }],
            {
                feature: 'assessment_question_generation',
                maxAttempts: 1,
                validateResponse: text => assert.equal(JSON.parse(text).ok, true)
            }
        );
        assert.deepEqual(geminiGroqHosts, [
            'generativelanguage.googleapis.com',
            'api.groq.com'
        ]);
        assert.equal(geminiGroqFallback.provider, 'groq');
        assert.equal(geminiGroqFallback.primaryModel, 'gemini-test-model');
        assert.equal(geminiGroqFallback.fallbackUsed, true);

        process.env.GROQ_FALLBACK_FEATURES = '';
        process.env.OPENROUTER_ROLLBACK_FEATURES = 'technical_interview_generation';
        const geminiRollbackHosts = [];
        global.fetch = async input => {
            const host = new URL(input).hostname;
            geminiRollbackHosts.push(host);
            if (host === 'generativelanguage.googleapis.com') {
                return new Response('{}', { status: 503 });
            }
            return new Response(JSON.stringify({
                model: 'deepseek/test-model',
                choices: [{ message: { content: '{"ok":true}' } }]
            }), { status: 200 });
        };
        const geminiRollback = await aiService.completeWithAI(
            [{ role: 'user', content: 'explicit OpenRouter rollback test' }],
            {
                feature: 'technical_interview_generation',
                responseFormat: true,
                maxAttempts: 1,
                validateResponse: text => assert.equal(JSON.parse(text).ok, true)
            }
        );
        assert.deepEqual(geminiRollbackHosts, [
            'generativelanguage.googleapis.com',
            'openrouter.ai'
        ]);
        assert.equal(geminiRollback.provider, 'openrouter');
        assert.equal(geminiRollback.primaryModel, 'gemini-test-model');
        assert.equal(geminiRollback.fallbackUsed, true);

        process.env.AI_PROVIDER = 'gemini';
        process.env.OPENROUTER_ROLLBACK_FEATURES = '';
        let invalidGeminiSchemaRequests = 0;
        global.fetch = async () => {
            invalidGeminiSchemaRequests++;
            return new Response(JSON.stringify({
                candidates: [{
                    content: { parts: [{ text: '{"wrong":true}' }] },
                    finishReason: 'STOP'
                }]
            }), { status: 200 });
        };
        await assert.rejects(
            aiService.completeWithAI([{ role: 'user', content: 'invalid Gemini schema test' }], {
                feature: 'assessment_question_generation',
                maxAttempts: 1,
                validateResponse: text => {
                    if (JSON.parse(text).ok !== true) {
                        const error = new Error('schema mismatch');
                        error.code = 'AI_PROVIDER_INVALID_OUTPUT';
                        throw error;
                    }
                }
            }),
            error => error.code === 'AI_PROVIDER_INVALID_OUTPUT' &&
                error.provider === 'Gemini' &&
                error.fallbackAttempted !== true
        );
        assert.equal(invalidGeminiSchemaRequests, 1);

        for (const [status, code] of [
            [400, 'AI_PROVIDER_REQUEST_REJECTED'],
            [401, 'AI_PROVIDER_AUTH_ERROR'],
            [404, 'AI_MODEL_INVALID'],
            [429, 'AI_RATE_LIMITED']
        ]) {
            let failureRequests = 0;
            global.fetch = async () => {
                failureRequests++;
                return new Response(JSON.stringify({
                    error: {
                        status: status === 429 ? 'RATE_LIMIT_EXCEEDED' : 'INVALID_ARGUMENT',
                        message: 'safe test failure'
                    }
                }), { status });
            };
            await assert.rejects(
                aiService.completeWithAI([{ role: 'user', content: 'Gemini safe error mapping test' }], {
                    feature: 'assessment_question_generation',
                    maxAttempts: 1
                }),
                error => error.code === code && error.provider === 'Gemini'
            );
            assert.equal(failureRequests, 1);
        }

        let geminiTimeoutCalls = 0;
        global.fetch = async () => {
            geminiTimeoutCalls++;
            throw new DOMException('simulated Gemini timeout', 'TimeoutError');
        };
        await assert.rejects(
            aiService.completeWithAI([{ role: 'user', content: 'Gemini timeout handling test' }], {
                feature: 'assessment_question_generation',
                maxAttempts: 1
            }),
            error => error.code === 'AI_PROVIDER_TIMEOUT' &&
                error.provider === 'Gemini' &&
                error.fallbackAttempted !== true
        );
        assert.equal(geminiTimeoutCalls, 1);

        delete process.env.GEMINI_API_KEY;
        let missingGeminiKeyCalls = 0;
        global.fetch = async () => {
            missingGeminiKeyCalls++;
            throw new Error('Missing Gemini credentials must not issue an HTTP request.');
        };
        await assert.rejects(
            aiService.completeWithAI([{ role: 'user', content: 'missing Gemini key' }], {
                feature: 'assessment_question_generation',
                maxAttempts: 1
            }),
            error => error.code === 'AI_PROVIDER_NOT_CONFIGURED' && error.provider === 'Gemini'
        );
        assert.equal(missingGeminiKeyCalls, 0);
        process.env.GEMINI_API_KEY = 'gemini-test-only-key';
        process.env.AI_PROVIDER = 'openrouter';

        global.fetch = async () => new Response('upstream auth failure', { status: 401 });
        await assert.rejects(
            aiService.completeWithAI([{ role: 'user', content: 'test' }]),
            error => error.code === 'AI_PROVIDER_AUTH_ERROR'
        );

        global.fetch = async () => new Response(JSON.stringify({ error: { code: 'rate_limit_exceeded' } }), { status: 429 });
        await assert.rejects(
            aiService.completeWithAI([{ role: 'user', content: 'test' }]),
            error => error.code === 'AI_RATE_LIMITED'
        );

        global.fetch = async () => new Response(JSON.stringify({ error: { code: 'model_not_found' } }), { status: 404 });
        await assert.rejects(
            aiService.completeWithAI([{ role: 'user', content: 'test' }]),
            error => error.code === 'AI_MODEL_INVALID'
        );

        let retryCount = 0;
        global.fetch = async () => {
            retryCount++;
            return retryCount === 1
                ? new Response('{}', { status: 503 })
                : new Response(JSON.stringify({ choices: [{ message: { content: 'retried' } }] }), { status: 200 });
        };
        const retried = await aiService.completeWithAI([{ role: 'user', content: 'test' }]);
        assert.equal(retryCount, 2);
        assert.equal(retried.text, 'retried');

        let emptyResponseAttempts = 0;
        global.fetch = async () => {
            emptyResponseAttempts++;
            return new Response(JSON.stringify({
                choices: [{ message: { content: '' }, finish_reason: 'stop' }]
            }), { status: 200 });
        };
        await assert.rejects(
            aiService.completeWithAI([{ role: 'user', content: 'test' }]),
            error => error.code === 'AI_PROVIDER_EMPTY_RESPONSE'
        );
        assert.equal(emptyResponseAttempts, 1);

        const tokenLimits = [];
        let truncatedResponseAttempts = 0;
        global.fetch = async (_url, init) => {
            tokenLimits.push(JSON.parse(init.body).max_tokens);
            truncatedResponseAttempts++;
            return truncatedResponseAttempts === 1
                ? new Response(JSON.stringify({
                    choices: [{ message: { content: 'Incomplete output' }, finish_reason: 'length' }]
                }), { status: 200 })
                : new Response(JSON.stringify({
                    choices: [{ message: { content: 'Completed after retry.' }, finish_reason: 'stop' }]
                }), { status: 200 });
        };
        await assert.rejects(
            aiService.completeWithAI([{ role: 'user', content: 'test' }], { maxTokens: 200 }),
            error => error.code === 'AI_PROVIDER_INVALID_OUTPUT'
        );
        assert.deepEqual(tokenLimits, [200]);
        assert.equal(truncatedResponseAttempts, 1);

        let rateLimitAttempts = 0;
        global.fetch = async () => {
            rateLimitAttempts++;
            return rateLimitAttempts === 1
                ? new Response(JSON.stringify({ error: { code: 'rate_limit_exceeded' } }), {
                    status: 429,
                    headers: { 'Retry-After': '0' }
                })
                : new Response(JSON.stringify({
                    choices: [{ message: { content: 'Available after rate-limit retry.' } }]
                }), { status: 200 });
        };
        const recoveredRateLimit = await aiService.completeWithAI([{ role: 'user', content: 'test' }]);
        assert.equal(rateLimitAttempts, 2);
        assert.equal(recoveredRateLimit.text, 'Available after rate-limit retry.');

        let deferredRateLimitAttempts = 0;
        global.fetch = async () => {
            deferredRateLimitAttempts++;
            return new Response(JSON.stringify({ error: { code: 'rate_limit_exceeded' } }), {
                status: 429,
                headers: { 'Retry-After': '30' }
            });
        };
        await assert.rejects(
            aiService.completeWithAI([{ role: 'user', content: 'test' }]),
            error => error.code === 'AI_RATE_LIMITED'
        );
        assert.equal(deferredRateLimitAttempts, 1);

        let persistentlyEmptyAttempts = 0;
        global.fetch = async () => {
            persistentlyEmptyAttempts++;
            return new Response(JSON.stringify({ choices: [{ message: { content: '' } }] }), { status: 200 });
        };
        await assert.rejects(
            aiService.completeWithAI([{ role: 'user', content: 'test' }]),
            error => error.code === 'AI_PROVIDER_EMPTY_RESPONSE'
        );
        assert.equal(persistentlyEmptyAttempts, 1);

        global.fetch = async (_url, init) => {
            const body = JSON.parse(init.body);
            assert.ok(body.messages.some(item => item.content.includes('Target Role: Backend Developer')));
            assert.ok(body.messages.some(item => item.content.includes('"progress":"Verified CareerHub record"')));
            assert.ok(body.messages.some(item => item.content.includes('CareerHub coding-practice records are not LeetCode synchronization')));
            assert.ok(body.messages.some(item => item.role === 'system' &&
                item.content.includes('dividing a global rate limit among instances still cannot guarantee a global cap')));
            assert.ok(body.messages.some(item => item.role === 'assistant' && item.content === 'Prior provider answer.'));
            return new Response(JSON.stringify({
                choices: [{ message: { content: 'A response grounded in saved career context.' } }]
            }), { status: 200 });
        };
        process.env.AI_PROVIDER = 'openrouter';
        process.env.OPENROUTER_MODEL = 'deepseek/test-model';
        process.env.CAREERHUB_AI_DATA_PROCESSING_APPROVED = 'true';
        process.env.CAREERHUB_AI_DATA_PROCESSING_PROVIDER = 'openrouter';
        const contextualAssistant = await aiService.chatCareerAssistant(
            'What should I practice next?',
            [{ role: 'assistant', content: 'Prior provider answer.' }],
            { targetRole: 'Backend Developer' },
            { progress: 'Verified CareerHub record' }
        );
        assert.equal(contextualAssistant.source, 'openrouter');
        assert.equal(contextualAssistant.reply, 'A response grounded in saved career context.');

        const longerAssistantResponse = 'A'.repeat(6000);
        global.fetch = async () => new Response(JSON.stringify({
            choices: [{ message: { content: longerAssistantResponse } }]
        }), { status: 200 });
        const longerAssistant = await aiService.chatCareerAssistant(
            'Explain system design tradeoffs.',
            [],
            { targetRole: 'Backend Developer' }
        );
        assert.equal(longerAssistant.reply.length, longerAssistantResponse.length);

        global.fetch = async () => new Response(`\uFEFF${JSON.stringify({
            choices: [{ message: { content: 'Recovered from a UTF-8 BOM response.' } }]
        })}`, {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
        const bomResponse = await aiService.completeWithAI([{ role: 'user', content: 'test' }]);
        assert.equal(bomResponse.text, 'Recovered from a UTF-8 BOM response.');

        let timeoutRetryAttempts = 0;
        global.fetch = async (_url, init) => {
            timeoutRetryAttempts++;
            assert.equal(JSON.parse(init.body).max_tokens, 700);
            const error = new Error('simulated timeout');
            error.name = 'TimeoutError';
            throw error;
        };
        await assert.rejects(
            aiService.chatCareerAssistant(
                'Design a resilient rate-limited API.',
                [],
                { targetRole: 'Backend Developer' }
            ),
            error => error.code === 'AI_PROVIDER_TIMEOUT'
        );
        assert.equal(timeoutRetryAttempts, 1);

        global.fetch = async () => new Response('invalid success body', { status: 200 });
        await assert.rejects(
            aiService.completeWithAI([{ role: 'user', content: 'test' }]),
            error => error.code === 'AI_PROVIDER_INVALID_OUTPUT'
        );

        global.fetch = async () => new Response('invalid error body', { status: 401 });
        await assert.rejects(
            aiService.completeWithAI([{ role: 'user', content: 'test' }]),
            error => error.code === 'AI_PROVIDER_AUTH_ERROR'
        );

        let networkRequests = 0;
        global.fetch = async () => {
            networkRequests++;
            throw new TypeError('fetch failed');
        };
        await assert.rejects(
            aiService.completeWithAI([{ role: 'user', content: 'test' }]),
            error => error.code === 'AI_PROVIDER_NETWORK_ERROR'
        );
        assert.equal(networkRequests, 2);

        let timeoutRequests = 0;
        global.fetch = async () => {
            timeoutRequests++;
            throw new DOMException('timed out', 'TimeoutError');
        };
        await assert.rejects(
            aiService.completeWithAI([{ role: 'user', content: 'test' }]),
            error => error.code === 'AI_PROVIDER_TIMEOUT'
        );
        assert.equal(timeoutRequests, 1);

        process.env.OPENROUTER_MODEL = 'deepseek/primary-test-model';
        process.env.OPENROUTER_FALLBACK_MODEL = 'qwen/legacy-global-model';
        assert.equal(aiService.getOpenRouterConfiguration('technical_interview_generation').fallbackConfigured, false);
        process.env.OPENROUTER_FALLBACK_INTERVIEW_MODEL = 'qwen/fallback-test-model';
        const fallbackModels = [];
        global.fetch = async (_url, init) => {
            const model = JSON.parse(init.body).model;
            fallbackModels.push(model);
            if (model === process.env.OPENROUTER_MODEL) {
                throw new DOMException('primary timed out', 'TimeoutError');
            }
            return new Response(JSON.stringify({
                model,
                choices: [{ message: { content: 'Recovered with a validated fallback response.' } }]
            }), { status: 200 });
        };
        const timeoutFallback = await aiService.completeWithAI(
            [{ role: 'user', content: 'primary timeout test' }],
            { maxAttempts: 1, feature: 'technical_interview_generation' }
        );
        assert.deepEqual(fallbackModels, ['deepseek/primary-test-model', 'qwen/fallback-test-model']);
        assert.equal(timeoutFallback.model, 'qwen/fallback-test-model');
        assert.equal(timeoutFallback.fallbackUsed, true);

        let isolatedFeatureRequests = 0;
        global.fetch = async (_url, init) => {
            isolatedFeatureRequests++;
            assert.equal(JSON.parse(init.body).model, process.env.OPENROUTER_MODEL);
            throw new DOMException('feature has no qualified fallback', 'TimeoutError');
        };
        await assert.rejects(
            aiService.completeWithAI([{ role: 'user', content: 'feature isolation test' }], {
                maxAttempts: 1,
                feature: 'behavioral_interview_generation'
            }),
            error => error.code === 'AI_PROVIDER_TIMEOUT' && error.fallbackAttempted !== true
        );
        assert.equal(isolatedFeatureRequests, 1);

        const validationModels = [];
        global.fetch = async (_url, init) => {
            const model = JSON.parse(init.body).model;
            validationModels.push(model);
            return new Response(JSON.stringify({
                model,
                choices: [{ message: { content: model.startsWith('deepseek') ? '{"wrong":true}' : '{"ok":true}' } }]
            }), { status: 200 });
        };
        const invalidOutputFallback = await aiService.completeWithAI(
            [{ role: 'user', content: 'schema validation test' }],
            {
                maxAttempts: 1,
                responseFormat: true,
                feature: 'technical_interview_generation',
                validateResponse: text => {
                    if (JSON.parse(text).ok !== true) {
                        const error = new Error('schema mismatch');
                        error.code = 'AI_PROVIDER_INVALID_OUTPUT';
                        throw error;
                    }
                }
            }
        );
        assert.deepEqual(validationModels, ['deepseek/primary-test-model', 'qwen/fallback-test-model']);
        assert.equal(invalidOutputFallback.fallbackUsed, true);

        const invalidJsonModels = [];
        global.fetch = async (_url, init) => {
            const model = JSON.parse(init.body).model;
            invalidJsonModels.push(model);
            return new Response(JSON.stringify({
                model,
                choices: [{ message: { content: model.startsWith('deepseek') ? 'not json' : '{"ok":true}' } }]
            }), { status: 200 });
        };
        const recoveredInvalidJson = await aiService.completeWithAI(
            [{ role: 'user', content: 'invalid JSON fallback test' }],
            {
                maxAttempts: 1,
                responseFormat: true,
                feature: 'technical_interview_generation',
                validateResponse: text => {
                    if (JSON.parse(text).ok !== true) {
                        const error = new Error('schema mismatch');
                        error.code = 'AI_PROVIDER_INVALID_OUTPUT';
                        throw error;
                    }
                }
            }
        );
        assert.deepEqual(invalidJsonModels, ['deepseek/primary-test-model', 'qwen/fallback-test-model']);
        assert.equal(recoveredInvalidJson.fallbackUsed, true);

        const invalidFallbackModels = [];
        global.fetch = async (_url, init) => {
            const model = JSON.parse(init.body).model;
            invalidFallbackModels.push(model);
            return new Response(JSON.stringify({
                model,
                choices: [{ message: { content: model.startsWith('deepseek') ? '{"wrong":true}' : '{"alsoWrong":true}' } }]
            }), { status: 200 });
        };
        await assert.rejects(
            aiService.completeWithAI(
                [{ role: 'user', content: 'invalid fallback schema test' }],
                {
                    maxAttempts: 1,
                    responseFormat: true,
                    feature: 'technical_interview_generation',
                    validateResponse: text => {
                        if (JSON.parse(text).ok !== true) {
                            const error = new Error('schema mismatch');
                            error.code = 'AI_PROVIDER_INVALID_OUTPUT';
                            throw error;
                        }
                    }
                }
            ),
            error => error.code === 'AI_PROVIDER_INVALID_OUTPUT' &&
                error.fallbackAttempted === true &&
                error.primaryFailureCode === 'AI_PROVIDER_INVALID_OUTPUT' &&
                error.primaryProviderDiagnostics?.reason === 'response_schema'
        );
        assert.deepEqual(invalidFallbackModels, ['deepseek/primary-test-model', 'qwen/fallback-test-model']);

        const rateLimitModels = [];
        global.fetch = async (_url, init) => {
            const model = JSON.parse(init.body).model;
            rateLimitModels.push(model);
            if (model === process.env.OPENROUTER_MODEL) {
                return new Response(JSON.stringify({ error: { code: 'rate_limit_exceeded' } }), {
                    status: 429,
                    headers: { 'Retry-After': '0' }
                });
            }
            return new Response(JSON.stringify({
                model,
                choices: [{ message: { content: 'Recovered after the primary rate limit.' } }]
            }), { status: 200 });
        };
        const rateLimitFallback = await aiService.completeWithAI(
            [{ role: 'user', content: 'rate limit fallback test' }],
            { maxAttempts: 1, feature: 'technical_interview_generation' }
        );
        assert.deepEqual(rateLimitModels, ['deepseek/primary-test-model', 'qwen/fallback-test-model']);
        assert.equal(rateLimitFallback.fallbackUsed, true);

        global.fetch = async (_url, init) => {
            const model = JSON.parse(init.body).model;
            if (model === process.env.OPENROUTER_MODEL) {
                throw new DOMException('primary timed out', 'TimeoutError');
            }
            throw new DOMException('fallback timed out', 'TimeoutError');
        };
        await assert.rejects(
            aiService.completeWithAI([{ role: 'user', content: 'fallback timeout test' }], {
                maxAttempts: 1, feature: 'technical_interview_generation'
            }),
            error => error.code === 'AI_PROVIDER_TIMEOUT' && error.fallbackAttempted === true
        );

        global.fetch = async () => new Response('{}', { status: 503 });
        await assert.rejects(
            aiService.completeWithAI([{ role: 'user', content: 'both unavailable test' }], {
                maxAttempts: 1, feature: 'technical_interview_generation'
            }),
            error => error.code === 'AI_PROVIDER_UNAVAILABLE' &&
                error.fallbackAttempted === true &&
                error.primaryFailureCode === 'AI_PROVIDER_UNAVAILABLE'
        );

        let authFallbackRequests = 0;
        global.fetch = async () => {
            authFallbackRequests++;
            return new Response('{}', { status: 401 });
        };
        await assert.rejects(
            aiService.completeWithAI([{ role: 'user', content: 'auth must not fallback' }], {
                maxAttempts: 1, feature: 'technical_interview_generation'
            }),
            error => error.code === 'AI_PROVIDER_AUTH_ERROR'
        );
        assert.equal(authFallbackRequests, 1);
        delete process.env.OPENROUTER_FALLBACK_INTERVIEW_MODEL;

        process.env.GROQ_API_KEY = 'groq-test-only-key';
        process.env.GROQ_MODEL = 'test/groq-model';
        process.env.GROQ_FALLBACK_FEATURES = 'technical_interview_generation';
        assert.equal(aiService.getGroqConfiguration('technical_interview_generation').fallbackConfigured, true);
        assert.equal(aiService.getGroqConfiguration('behavioral_interview_generation').fallbackConfigured, false);
        let groqRequests = 0;
        const groqModels = [];
        global.fetch = async (input, init) => {
            const body = JSON.parse(init.body);
            if (new URL(input).hostname === 'openrouter.ai') {
                assert.equal(body.model, process.env.OPENROUTER_MODEL);
                return new Response('{}', { status: 503 });
            }
            groqRequests++;
            assert.equal(new URL(input).href, 'https://api.groq.com/openai/v1/chat/completions');
            assert.equal(init.headers.Authorization, 'Bearer groq-test-only-key');
            assert.equal(init.headers['HTTP-Referer'], undefined);
            groqModels.push(body.model);
            return new Response(JSON.stringify({
                id: 'groq-test-response',
                model: 'test/groq-model',
                choices: [{ message: { content: '{"ok":true}' } }],
                usage: { prompt_tokens: 8, completion_tokens: 4 }
            }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        };
        const groqRecovered = await aiService.completeWithAI(
            [{ role: 'user', content: 'groq schema test' }],
            {
                feature: 'technical_interview_generation',
                responseFormat: true,
                maxAttempts: 1,
                validateResponse: text => {
                    if (JSON.parse(text).ok !== true) {
                        const error = new Error('schema mismatch');
                        error.code = 'AI_PROVIDER_INVALID_OUTPUT';
                        throw error;
                    }
                }
            }
        );
        assert.equal(groqRequests, 1);
        assert.deepEqual(groqModels, ['test/groq-model']);
        assert.equal(groqRecovered.provider, 'groq');
        assert.equal(groqRecovered.model, 'test/groq-model');
        assert.equal(groqRecovered.primaryModel, 'deepseek/primary-test-model');
        assert.equal(groqRecovered.fallbackUsed, true);

        process.env.AI_PROVIDER = 'openrouter';
        process.env.GROQ_FALLBACK_FEATURES = '';
        const groqPrimaryFeatures = [
            'assessment_question_generation',
            'job_analyzer',
            'skill_gap_guidance',
            'career_roadmap',
            'daily_plan',
            'career_assistant',
            'technical_interview_generation',
            'behavioral_interview_generation',
            'interview_evaluation',
            'resume_analysis'
        ];
        process.env.GROQ_PRIMARY_FEATURES = groqPrimaryFeatures.join(',');
        assert.equal(aiService.getCareerAssistantStatus().provider, 'Groq');
        assert.equal(aiService.getCareerAssistantStatus().groqPrimaryConfigured, true);
        const groqPrimaryRequests = [];
        global.fetch = async (input, init) => {
            const url = new URL(input);
            groqPrimaryRequests.push(url.hostname);
            assert.equal(url.href, 'https://api.groq.com/openai/v1/chat/completions');
            assert.equal(JSON.parse(init.body).model, 'test/groq-model');
            return new Response(JSON.stringify({
                id: `groq-primary-${groqPrimaryRequests.length}`,
                model: 'test/groq-model',
                choices: [{ message: { content: '{"ok":true}' } }]
            }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        };
        for (const feature of groqPrimaryFeatures) {
            let validated = false;
            const primaryResult = await aiService.completeWithAI(
                [{ role: 'user', content: `mocked provider-selection test for ${feature}` }],
                {
                    feature,
                    maxAttempts: 1,
                    validateResponse: text => {
                        assert.equal(JSON.parse(text).ok, true);
                        validated = true;
                    }
                }
            );
            assert.equal(primaryResult.provider, 'groq', feature);
            assert.equal(primaryResult.primaryModel, 'test/groq-model', feature);
            assert.equal(primaryResult.fallbackUsed, false, feature);
            assert.equal(validated, true, feature);
        }
        assert.deepEqual(groqPrimaryRequests, Array(groqPrimaryFeatures.length).fill('api.groq.com'));
        const unqualifiedFeatures = [
            'pdf_resume_analysis',
            'video_interview_generation',
            'assessment_insights',
            'career_recommendations',
            'learning_resources',
            'job_fit_explanation',
            'interview_question',
            'coding_hint',
            'coding_review',
            'provider_healthcheck'
        ];
        process.env.GROQ_PRIMARY_FEATURES = groqPrimaryFeatures.join(',');
        const unqualifiedProviderHosts = [];
        global.fetch = async input => {
            unqualifiedProviderHosts.push(new URL(input).hostname);
            return new Response(JSON.stringify({
                model: 'deepseek/test-model',
                choices: [{ message: { content: 'OpenRouter remains selected for this workflow.' } }]
            }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        };
        for (const feature of unqualifiedFeatures) {
            const unqualifiedResult = await aiService.completeWithAI(
                [{ role: 'user', content: `provider-selection test for ${feature}` }],
                { feature, maxAttempts: 1 }
            );
            assert.equal(unqualifiedResult.provider, 'openrouter', feature);
            assert.equal(unqualifiedResult.fallbackUsed, false, feature);
        }
        assert.deepEqual(unqualifiedProviderHosts, Array(unqualifiedFeatures.length).fill('openrouter.ai'));

        process.env.GROQ_PRIMARY_FEATURES = 'career_assistant';
        const invalidGroqPrimaryHosts = [];
        global.fetch = async input => {
            invalidGroqPrimaryHosts.push(new URL(input).hostname);
            return new Response(JSON.stringify({
                model: 'test/groq-model',
                choices: [{ message: { content: '{"wrong":true}' } }]
            }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        };
        await assert.rejects(
            aiService.completeWithAI([{ role: 'user', content: 'invalid Groq primary schema' }], {
                feature: 'career_assistant',
                maxAttempts: 1,
                validateResponse: text => {
                    if (JSON.parse(text).ok !== true) {
                        const error = new Error('schema mismatch');
                        error.code = 'AI_PROVIDER_INVALID_OUTPUT';
                        throw error;
                    }
                }
            }),
            error => error.code === 'AI_PROVIDER_INVALID_OUTPUT' &&
                error.provider === 'Groq' &&
                error.fallbackAttempted !== true
        );
        assert.deepEqual(invalidGroqPrimaryHosts, ['api.groq.com']);

        delete process.env.GROQ_API_KEY;
        assert.equal(aiService.getCareerAssistantStatus().provider, 'Groq');
        assert.equal(aiService.getCareerAssistantStatus().configured, false);
        const missingGroqPrimaryHosts = [];
        global.fetch = async input => {
            missingGroqPrimaryHosts.push(new URL(input).hostname);
            throw new Error('Missing Groq key must stop before any provider request.');
        };
        await assert.rejects(
            aiService.completeWithAI([{ role: 'user', content: 'missing Groq primary key' }], {
                feature: 'career_assistant',
                maxAttempts: 1
            }),
            error => error.code === 'AI_PROVIDER_NOT_CONFIGURED' && error.provider === 'Groq'
        );
        assert.deepEqual(missingGroqPrimaryHosts, []);
        process.env.GROQ_API_KEY = 'groq-test-only-key';

        process.env.GROQ_PRIMARY_FEATURES = 'career_assistant';
        const failedGroqPrimaryHosts = [];
        global.fetch = async input => {
            failedGroqPrimaryHosts.push(new URL(input).hostname);
            return new Response('{}', { status: 503 });
        };
        await assert.rejects(
            aiService.completeWithAI([{ role: 'user', content: 'Groq primary must fail closed' }], {
                feature: 'career_assistant',
                maxAttempts: 1
            }),
            error => error.code === 'AI_PROVIDER_UNAVAILABLE' &&
                error.provider === 'Groq' &&
                error.fallbackAttempted !== true
        );
        assert.deepEqual(failedGroqPrimaryHosts, ['api.groq.com']);
        process.env.GROQ_PRIMARY_FEATURES = '';
        process.env.GROQ_FALLBACK_FEATURES = 'technical_interview_generation';

        const isolatedGroqCalls = [];
        global.fetch = async input => {
            isolatedGroqCalls.push(new URL(input).hostname);
            return new Response('{}', { status: 503 });
        };
        await assert.rejects(
            aiService.completeWithAI([{ role: 'user', content: 'unqualified feature' }], {
                feature: 'behavioral_interview_generation',
                maxAttempts: 1
            }),
            error => error.code === 'AI_PROVIDER_UNAVAILABLE'
        );
        assert.deepEqual(isolatedGroqCalls, ['openrouter.ai']);

        const invalidGroqModels = [];
        global.fetch = async (input, init) => {
            const model = JSON.parse(init.body).model;
            if (new URL(input).hostname === 'openrouter.ai') return new Response('{}', { status: 503 });
            invalidGroqModels.push(model);
            return new Response(JSON.stringify({
                model,
                choices: [{ message: { content: '{"wrong":true}' } }]
            }), { status: 200 });
        };
        await assert.rejects(
            aiService.completeWithAI([{ role: 'user', content: 'invalid Groq schema' }], {
                feature: 'technical_interview_generation',
                responseFormat: true,
                maxAttempts: 1,
                validateResponse: text => {
                    if (JSON.parse(text).ok !== true) {
                        const error = new Error('schema mismatch');
                        error.code = 'AI_PROVIDER_INVALID_OUTPUT';
                        throw error;
                    }
                }
            }),
            error => error.code === 'AI_PROVIDER_INVALID_OUTPUT' &&
                error.provider === 'Groq' &&
                error.fallbackAttempted === true
        );
        assert.deepEqual(invalidGroqModels, ['test/groq-model']);

        let invalidJsonGroqCalls = 0;
        global.fetch = async input => {
            if (new URL(input).hostname === 'openrouter.ai') return new Response('{}', { status: 503 });
            invalidJsonGroqCalls++;
            return new Response(JSON.stringify({
                model: 'test/groq-model',
                choices: [{ message: { content: 'not valid json' } }]
            }), { status: 200 });
        };
        await assert.rejects(
            aiService.completeWithAI([{ role: 'user', content: 'invalid Groq JSON' }], {
                feature: 'technical_interview_generation',
                responseFormat: true,
                maxAttempts: 1,
                validateResponse: text => JSON.parse(text)
            }),
            error => error.code === 'AI_PROVIDER_INVALID_OUTPUT' &&
                error.provider === 'Groq' &&
                error.fallbackAttempted === true
        );
        assert.equal(invalidJsonGroqCalls, 1);

        let groqAuthRequests = 0;
        global.fetch = async input => {
            groqAuthRequests++;
            return new Response('{}', {
                status: new URL(input).hostname === 'openrouter.ai' ? 503 : 401
            });
        };
        await assert.rejects(
            aiService.completeWithAI([{ role: 'user', content: 'Groq authentication error' }], {
                feature: 'technical_interview_generation',
                maxAttempts: 1
            }),
            error => error.code === 'AI_PROVIDER_AUTH_ERROR' &&
                error.provider === 'Groq' &&
                error.fallbackAttempted === true
        );
        assert.equal(groqAuthRequests, 2);

        let groqRateLimitRequests = 0;
        global.fetch = async input => {
            groqRateLimitRequests++;
            return new Response('{}', {
                status: new URL(input).hostname === 'openrouter.ai' ? 503 : 429
            });
        };
        await assert.rejects(
            aiService.completeWithAI([{ role: 'user', content: 'Groq rate limit' }], {
                feature: 'technical_interview_generation',
                maxAttempts: 1
            }),
            error => error.code === 'AI_RATE_LIMITED' &&
                error.provider === 'Groq' &&
                error.fallbackAttempted === true
        );
        assert.equal(groqRateLimitRequests, 2);

        let groqTimeoutRequests = 0;
        global.fetch = async input => {
            if (new URL(input).hostname === 'openrouter.ai') return new Response('{}', { status: 503 });
            groqTimeoutRequests++;
            throw new DOMException('simulated Groq timeout', 'TimeoutError');
        };
        await assert.rejects(
            aiService.completeWithAI([{ role: 'user', content: 'Groq timeout' }], {
                feature: 'technical_interview_generation',
                maxAttempts: 1
            }),
            error => error.code === 'AI_PROVIDER_TIMEOUT' &&
                error.provider === 'Groq' &&
                error.fallbackAttempted === true
        );
        assert.equal(groqTimeoutRequests, 1);

        delete process.env.OPENROUTER_API_KEY;
        let missingConfigurationRequests = 0;
        global.fetch = async input => {
            missingConfigurationRequests++;
            throw new Error('Invalid primary configuration must stop before provider requests.');
        };
        await assert.rejects(
            aiService.completeWithAI([{ role: 'user', content: 'missing primary configuration' }], {
                feature: 'technical_interview_generation',
                maxAttempts: 1
            }),
            error => error.code === 'AI_PROVIDER_NOT_CONFIGURED'
        );
        assert.equal(missingConfigurationRequests, 0);
        process.env.OPENROUTER_API_KEY = 'test-only-key';

        let authFailoverCalls = 0;
        global.fetch = async input => {
            authFailoverCalls++;
            return new URL(input).hostname === 'openrouter.ai'
                ? new Response('{}', { status: 401 })
                : new Response(JSON.stringify({
                    model: 'test/groq-model',
                    choices: [{ message: { content: 'A single independent fallback attempt succeeded.' } }]
                }), { status: 200 });
        };
        await assert.rejects(
            aiService.completeWithAI([{ role: 'user', content: 'authentication failure must not fallback' }], {
                feature: 'technical_interview_generation',
                maxAttempts: 1
            }),
            error => error.code === 'AI_PROVIDER_AUTH_ERROR'
        );
        assert.equal(authFailoverCalls, 1);
        assert.equal(JSON.stringify(aiService.getCareerAssistantStatus()).includes('groq-test-only-key'), false);

        process.env.OPENROUTER_FALLBACK_INTERVIEW_MODEL = 'qwen/test-fallback-model';
        let qwenAuthFallbackRequests = 0;
        const qwenAuthRequestHosts = [];
        global.fetch = async input => {
            qwenAuthFallbackRequests++;
            const host = new URL(input).hostname;
            qwenAuthRequestHosts.push(host);
            return new Response('{}', { status: qwenAuthFallbackRequests === 1 ? 503 : 401 });
        };
        await assert.rejects(
            aiService.completeWithAI([{ role: 'user', content: 'Qwen auth failure must not use Groq' }], {
                feature: 'technical_interview_generation',
                maxAttempts: 1
            }),
            error => error.code === 'AI_PROVIDER_AUTH_ERROR' &&
                error.fallbackAttempted === true
        );
        assert.deepEqual(qwenAuthRequestHosts, ['openrouter.ai', 'openrouter.ai']);
        assert.equal(qwenAuthFallbackRequests, 2);
        delete process.env.OPENROUTER_FALLBACK_INTERVIEW_MODEL;

        global.fetch = async input => new Response('{}', {
            status: new URL(input).hostname === 'openrouter.ai' ? 503 : 402
        });
        await assert.rejects(
            aiService.completeWithAI([{ role: 'user', content: 'Groq quota exhaustion' }], {
                feature: 'technical_interview_generation',
                maxAttempts: 1
            }),
            error => error.code === 'AI_PROVIDER_QUOTA_EXCEEDED' &&
                error.provider === 'Groq' &&
                error.fallbackAttempted === true
        );

        process.env.GROQ_FALLBACK_FEATURES = '';
        global.fetch = async () => new Response(JSON.stringify({ error: { code: 'insufficient_credits' } }), { status: 402 });
        await assert.rejects(
            aiService.completeWithAI([{ role: 'user', content: 'test' }]),
            error => error.code === 'AI_PROVIDER_QUOTA_EXCEEDED' &&
                typeof error.retryAfter === 'string' &&
                !error.message.includes('test-only-key')
        );

        console.log('AI provider service tests passed: direct Gemini feature routing, privacy blocks, qualified fallbacks, OpenRouter rollback, validation, provenance, retries, and safe provider errors.');
    } finally {
        global.fetch = originalFetch;
        console.info = originalConsoleInfo;
        for (const [key, value] of Object.entries(originalEnvironment)) {
            if (value === undefined) delete process.env[key];
            else process.env[key] = value;
        }
    }
}

run().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
