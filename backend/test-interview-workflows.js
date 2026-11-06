const assert = require('node:assert/strict');
const aiService = require('./utils/aiService');
const { getCuratedQuestions, getCuratedInterviewQuestions } = require('./utils/interviewQuestionBank');

const originalFetch = global.fetch;
const originalEnvironment = Object.fromEntries([
    'AI_PROVIDER',
    'OPENROUTER_API_KEY',
    'OPENROUTER_MODEL',
    'OPENROUTER_BASE_URL',
    'OPENROUTER_FALLBACK_INTERVIEW_MODEL'
].map(key => [key, process.env[key]]));

function response(content) {
    return new Response(JSON.stringify({
        model: 'deepseek/test-model',
        choices: [{ message: { content } }]
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
}

async function run() {
    try {
        process.env.AI_PROVIDER = 'openrouter';
        process.env.OPENROUTER_API_KEY = 'test-only';
        process.env.OPENROUTER_MODEL = 'deepseek/test-model';
        process.env.OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
        const questions = Array.from({ length: 3 }, (_, index) => ({
            question: `Role-specific question ${index + 1}?`,
            options: ['Option Alpha', 'Option Beta', 'Option Gamma', 'Option Delta'],
            answerIndex: index,
            explanation: `Reason ${index + 1}.`,
            topic: 'Frontend',
            difficulty: 'medium'
        }));
        global.fetch = async (url, options) => {
            assert.equal(new URL(url).pathname, '/api/v1/chat/completions');
            const body = JSON.parse(options.body);
            assert.deepEqual(body.response_format, { type: 'json_object' });
            assert.ok(body.messages.some(message => message.content.includes('Frontend Engineer')));
            return response(JSON.stringify({ questions }));
        };
        const generated = await aiService.generateMcqQuestions({
            role: 'Frontend Engineer',
            topic: 'Frontend',
            difficulty: 'medium',
            count: 3,
            profile: { technicalSkills: ['JavaScript'] }
        });
        assert.equal(generated.source, 'openrouter');
        assert.equal(generated.questions.length, 3);
        assert.equal(generated.questions[0].answerIndex, 0);

        let interviewRequests = 0;
        global.fetch = async (_url, options) => {
            interviewRequests++;
            assert.deepEqual(JSON.parse(options.body).response_format, { type: 'json_object' });
            return response(JSON.stringify({
                questions: [{
                    question: 'How would you design a resilient API?',
                    skill: 'System design',
                    hint: 'Discuss availability and failure recovery.'
                }]
            }));
        };
        const generatedInterview = await aiService.generateInterviewQuestions({
            role: 'Backend Engineer',
            difficulty: 'medium',
            type: 'Technical',
            count: 1
        });
        assert.equal(interviewRequests, 1);
        assert.equal(generatedInterview.source, 'openrouter');
        assert.equal(generatedInterview.questions[0].skill, 'System design');

        let invalidInterviewRequests = 0;
        global.fetch = async () => {
            invalidInterviewRequests++;
            return response(JSON.stringify({
                questions: [{ question: `Incomplete question ${invalidInterviewRequests}?` }]
            }));
        };
        await assert.rejects(
            aiService.generateInterviewQuestions({
                role: 'Backend Engineer',
                difficulty: 'medium',
                type: 'Technical',
                count: 1
            }),
            error => error.code === 'AI_PROVIDER_INVALID_OUTPUT' &&
                error.providerDiagnostics?.reason === 'question_schema' &&
                error.providerDiagnostics?.outputStage === 'interview_question_validation' &&
                error.providerDiagnostics?.expectedQuestionCount === 1
        );
        assert.equal(invalidInterviewRequests, 1);

        let wrongInterviewQuestionCountRequests = 0;
        global.fetch = async () => {
            wrongInterviewQuestionCountRequests++;
            return response(JSON.stringify({ questions: [] }));
        };
        await assert.rejects(
            aiService.generateInterviewQuestions({
                role: 'Backend Engineer',
                difficulty: 'medium',
                type: 'Technical',
                count: 1
            }),
            error => error.code === 'AI_PROVIDER_INVALID_OUTPUT' &&
                error.providerDiagnostics?.reason === 'question_count' &&
                error.providerDiagnostics?.expectedQuestionCount === 1
        );
        assert.equal(wrongInterviewQuestionCountRequests, 1);

        let emptyInterviewResponses = 0;
        global.fetch = async () => {
            emptyInterviewResponses++;
            return response('');
        };
        await assert.rejects(
            aiService.generateInterviewQuestions({
                role: 'Video Platform Engineer',
                difficulty: 'medium',
                type: 'Technical',
                count: 1
            }),
            error => error.code === 'AI_PROVIDER_INVALID_OUTPUT' || error.code === 'AI_PROVIDER_EMPTY_RESPONSE'
        );
        assert.equal(emptyInterviewResponses, 1);

        let invalidAssessmentRequests = 0;
        global.fetch = async () => {
            invalidAssessmentRequests++;
            const generatedQuestion = {
                question: 'How would you validate a response schema?',
                options: ['Use schema validation', 'Ignore the response', 'Check only status codes', 'Log it manually'],
                answerIndex: 0,
                explanation: 'A schema checks the response structure.',
                topic: 'API Verification',
                difficulty: 'medium'
            };
            return response(JSON.stringify({ questions: [generatedQuestion] }));
        };
        await assert.rejects(
            aiService.generateMcqQuestions({
                role: 'Backend Engineer',
                topic: 'Mixed',
                difficulty: 'medium',
                count: 1
            }),
            error => error.code === 'AI_PROVIDER_INVALID_OUTPUT' &&
                error.providerDiagnostics?.reason === 'question_schema' &&
                error.providerDiagnostics?.outputStage === 'assessment_question_validation'
        );
        assert.equal(invalidAssessmentRequests, 1);

        let wrongAssessmentQuestionCountRequests = 0;
        global.fetch = async () => {
            wrongAssessmentQuestionCountRequests++;
            return response(JSON.stringify({
                questions: []
            }));
        };
        await assert.rejects(
            aiService.generateMcqQuestions({
                role: 'Backend Engineer',
                topic: 'Mixed',
                difficulty: 'medium',
                count: 1
            }),
            error => error.code === 'AI_PROVIDER_INVALID_OUTPUT' &&
                error.providerDiagnostics?.reason === 'question_count' &&
                error.providerDiagnostics?.expectedQuestionCount === 1
        );
        assert.equal(wrongAssessmentQuestionCountRequests, 1);

        process.env.OPENROUTER_FALLBACK_INTERVIEW_MODEL = 'qwen/test-fallback';
        const interviewFallbackModels = [];
        global.fetch = async (_url, options) => {
            const model = JSON.parse(options.body).model;
            interviewFallbackModels.push(model);
            return response(JSON.stringify(model === process.env.OPENROUTER_MODEL
                ? { questions: [{ question: 'Private resume content should not appear in diagnostics.' }] }
                : { questions: [{
                    question: 'How would you validate a resilient service?',
                    skill: 'System design',
                    hint: 'Discuss measurable failure and recovery behavior.'
                }] }));
        };
        const interviewFallback = await aiService.generateInterviewQuestions({
            role: 'Backend Engineer',
            difficulty: 'medium',
            type: 'Technical',
            count: 1,
            profile: { careerGoals: 'private resume content should not appear in diagnostics' }
        });
        assert.deepEqual(interviewFallbackModels, ['deepseek/test-model', 'qwen/test-fallback']);
        assert.equal(interviewFallback.fallbackUsed, true);
        assert.equal(interviewFallback.questions[0].skill, 'System design');

        global.fetch = async () => response(JSON.stringify({
            questions: [{ question: 'Private resume content should not appear in diagnostics.' }]
        }));
        await assert.rejects(
            aiService.generateInterviewQuestions({
                role: 'Backend Engineer',
                difficulty: 'medium',
                type: 'Technical',
                count: 1,
                profile: { careerGoals: 'private resume content should not appear in diagnostics' }
            }),
            error => error.code === 'AI_PROVIDER_INVALID_OUTPUT' &&
                error.providerDiagnostics?.reason === 'question_schema' &&
                !JSON.stringify(error.providerDiagnostics).includes('Private resume content') &&
                !JSON.stringify(error.providerDiagnostics).includes('test-only')
        );

        delete process.env.OPENROUTER_FALLBACK_INTERVIEW_MODEL;
        global.fetch = async () => response(JSON.stringify({
            questions: [{
                question: 'How would you analyze a runtime trade-off?',
                options: ['Option A', 'Option B', 'Option C', 'Option D'],
                answerIndex: 1,
                explanation: 'The selected approach fits the stated constraint.',
                topic: 'Data structures and algorithms',
                difficulty: 'easy'
            }]
        }));
        const mixedAssessment = await aiService.generateMcqQuestions({
            role: 'Backend Engineer',
            topic: 'Mixed',
            difficulty: 'easy',
            count: 1
        });
        assert.equal(mixedAssessment.questions[0].topic, 'Data structures and algorithms');

        global.fetch = async () => response(JSON.stringify({
            questions: [{ ...questions[0], options: ['Same', 'Same', 'Other', 'Fourth'] }, ...questions.slice(1)]
        }));
        await assert.rejects(
            aiService.generateMcqQuestions({ role: 'Frontend Engineer', difficulty: 'medium', topic: 'Frontend', count: 3 }),
            error => error.code === 'AI_PROVIDER_INVALID_OUTPUT'
        );

        const curatedMcq = getCuratedQuestions({
            role: 'Frontend Engineer', topic: 'Frontend', difficulty: 'medium', count: 3
        });
        assert.equal(curatedMcq.length, 1);
        assert.ok(curatedMcq.every(question =>
            question.source === 'curated' &&
            question.topic === 'Frontend' &&
            question.difficulty === 'medium' &&
            question.options.length === 4 &&
            new Set(question.options).size === 4 &&
            Number.isInteger(question.answerIndex)));

        const curatedVoice = getCuratedInterviewQuestions({
            role: 'Frontend Engineer', topic: 'Behavioral', difficulty: 'medium', count: 3
        });
        assert.equal(curatedVoice.length, 1);
        assert.ok(curatedVoice.every(question =>
            question.source === 'curated' && question.type === 'text' &&
            question.topic === 'Behavioral' && question.difficulty === 'medium'));

        let evaluationRequestBody;
        global.fetch = async (url, options) => {
            evaluationRequestBody = JSON.parse(options.body);
            return response(JSON.stringify({
            rubric: { relevance: 4, correctness: 3, clarity: 4, structure: 3, completeness: 2 },
            evidence: ['Explained the key trade-off.'],
            improvements: ['Add a concrete validation example.'],
            feedback: 'The response addresses the main concern but needs a clearer implementation example.',
            followUpQuestion: 'How would you test that behavior?',
            nextDifficulty: 'medium'
            }));
        };
        const evaluation = await aiService.evaluateAnswer(
            'How would you test this feature?',
            'I would add unit tests and validate edge cases.',
            {
                role: 'Frontend Engineer',
                topic: 'Technical',
                difficulty: 'medium',
                questionIndex: 1,
                profile: { targetRole: 'Frontend Engineer', technicalSkills: ['React'] },
                priorResponses: [{ question: 'What did you build?', answer: 'A React dashboard.', score: 8 }]
            }
        );
        assert.equal(evaluation.source, 'openrouter');
        assert.equal(evaluation.score, 6);
        assert.equal(evaluation.followUpQuestion, 'How would you test that behavior?');
        assert.equal(evaluation.nextDifficulty, 'medium');
        const sentContext = JSON.parse(evaluationRequestBody.messages.at(-1).content).context;
        assert.equal(sentContext.role, 'Frontend Engineer');
        assert.equal(sentContext.priorResponses[0].answer, 'A React dashboard.');

        let invalidEvaluationRequests = 0;
        global.fetch = async () => {
            invalidEvaluationRequests++;
            return response(JSON.stringify({
                rubric: {},
                evidence: [],
                improvements: [],
                feedback: '',
                followUpQuestion: ''
            }));
        };
        await assert.rejects(
            aiService.evaluateAnswer(
                'How would you validate an API response?',
                'I would validate the response against a schema and fail the test when it does not match.',
                { difficulty: 'medium' }
            ),
            error => error.code === 'AI_PROVIDER_INVALID_OUTPUT'
        );
        assert.equal(invalidEvaluationRequests, 1);

        global.fetch = async () => response(JSON.stringify({
            rubric: { relevance: 5, correctness: 5, clarity: 5, structure: 5, completeness: 5 },
            evidence: ['The answer was complete and directly addressed the prompt.'],
            improvements: ['Add a concrete measurement to strengthen the example.'],
            feedback: 'Clear, complete, and technically sound.',
            followUpQuestion: 'How would you validate the design at production scale?'
        }));
        const strongEvaluation = await aiService.evaluateAnswer(
            'Explain how you would build this service.',
            'I would define the API contract, secure it, use a database transaction, and measure latency and errors.',
            { difficulty: 'medium' }
        );
        assert.equal(strongEvaluation.score, 10);
        assert.equal(strongEvaluation.nextDifficulty, 'hard');

        console.log('Interview workflow tests passed: single-attempt schema validation, curated fallback attribution, contextual evaluation, and score-adaptive difficulty.');
    } finally {
        global.fetch = originalFetch;
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
