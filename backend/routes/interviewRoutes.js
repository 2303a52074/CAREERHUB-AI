const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const Interview = require('../models/Interview');
const ExamSession = require('../models/ExamSession');
const User = require('../models/User');
const {
    generateMcqQuestions,
    generateInterviewQuestions,
    evaluateAnswer
} = require('../utils/aiService');
const { providerErrorMessage } = require('../utils/providerErrors');
const { resolveTargetRole, targetRoleRequiredResponse } = require('../utils/roleResolution');

const router = express.Router();
const INTERVIEW_TOPICS = ['Mixed', 'Frontend', 'Backend', 'Data Structures', 'System Design', 'Behavioral', 'Technical'];
const SUPPORTED_AI_PROVIDERS = new Set(['openrouter', 'gemini', 'groq']);

function safePublicQuestion(question) {
    const { answerIndex, explanation, ...publicQuestion } = question;
    return publicQuestion;
}

async function persistInterviewResult(userId, session, answers, totalScore) {
    const record = new Interview({
        userId,
        role: session.role,
        difficulty: session.difficulty,
        company: session.company,
        interviewType: session.mode === 'mcq' ? 'MCQ Practice' : session.topic,
        totalScore,
        answers,
        date: new Date()
    });
    await record.save();
    const xpEarned = Math.round(totalScore * 1.5);
    await User.findByIdAndUpdate(userId, {
        $inc: { xp: xpEarned },
        lastPractice: new Date()
    });
    await ExamSession.findByIdAndDelete(session._id);
    return { interviewId: record._id, xpEarned };
}

async function createSession({ userId, requestedRole, difficulty, topic, mode, sessionLength, company }) {
    const profile = await User.findById(userId)
        .select('targetRole technicalSkills interests projects');
    const { role } = resolveTargetRole(requestedRole, profile);
    if (!role) {
        const error = new Error('Choose a target role in your profile or for this interview session.');
        error.code = 'TARGET_ROLE_REQUIRED';
        error.status = 409;
        throw error;
    }
    let source = null;
    let model = null;
    let questions;
    if (mode === 'mcq') {
        const generated = await generateMcqQuestions({
            role, difficulty, topic, count: sessionLength, profile: profile || {}
        });
        questions = generated.questions;
        source = generated.source;
        model = generated.model;
        if (questions.length !== sessionLength ||
            !SUPPORTED_AI_PROVIDERS.has(source) || !model ||
            questions.some(question => question.source !== source ||
                !Array.isArray(question.options) || question.options.length !== 4 ||
                !Number.isInteger(question.answerIndex))) {
            const error = new Error('Interview provider returned invalid questions.');
            error.code = 'AI_PROVIDER_INVALID_OUTPUT';
            error.status = 502;
            throw error;
        }
    } else {
        const session = new ExamSession({
            userId: String(userId),
            role,
            difficulty,
            company,
            mode,
            topic,
            sessionLength,
            generationSource: 'pending',
            generationModel: null,
            questions: [],
            expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000)
        });
        await session.save();
        try {
            const interviewType = topic === 'Behavioral' ? 'Behavioral'
                : topic === 'System Design' ? 'Technical' : 'Technical';
            const generated = await generateInterviewQuestions({
                role,
                difficulty,
                company,
                type: interviewType,
                count: 1,
                profile: profile || {},
                feature: topic === 'Behavioral'
                    ? 'behavioral_interview_generation'
                    : mode === 'video' || mode === 'voice'
                        ? 'video_interview_generation'
                        : 'technical_interview_generation'
            });
            if (!SUPPORTED_AI_PROVIDERS.has(generated.source) || !generated.model ||
                generated.questions.length !== 1 || generated.questions[0].source !== generated.source) {
                const error = new Error('Interview provider returned invalid questions.');
                error.code = 'AI_PROVIDER_INVALID_OUTPUT';
                error.status = 502;
                throw error;
            }
            source = generated.source;
            model = generated.model;
            questions = generated.questions.map(question => ({ ...question, topic }));
            session.generationSource = source;
            session.generationModel = model;
            session.questions = questions;
            await session.save();
            return { session, questions, role, source, model };
        } catch (error) {
            error.sessionId = session._id;
            error.sessionRole = role;
            throw error;
        }
    }
    const session = new ExamSession({
        userId: String(userId),
        role,
        difficulty,
        company,
        mode,
        topic,
        sessionLength,
        generationSource: source,
        generationModel: model,
        questions,
        expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000)
    });
    await session.save();
    return { session, questions, role, source, model };
}

async function submitMcqSession(session, userId, answers, res) {
    if (session.mode !== 'mcq') {
        return res.status(409).json({ message: 'This session is not an MCQ practice session.' });
    }
    if (!Array.isArray(answers) || answers.length !== session.questions.length ||
        answers.some(answer => !Number.isInteger(answer) || answer < 0 || answer > 3)) {
        return res.status(400).json({ message: `Select one of four options for all ${session.questions.length} questions.` });
    }
    const topicScores = new Map();
    const review = session.questions.map((question, index) => {
        const correct = answers[index] === question.answerIndex;
        const topic = question.topic || 'General';
        const tally = topicScores.get(topic) || { topic, correct: 0, total: 0 };
        tally.total++;
        if (correct) tally.correct++;
        topicScores.set(topic, tally);
        return {
            question: question.question,
            options: question.options,
            selectedIndex: answers[index],
            correctIndex: question.answerIndex,
            correct,
            explanation: question.explanation,
            topic
        };
    });
    const score = Math.round(review.filter(item => item.correct).length / review.length * 100);
    const persisted = await persistInterviewResult(userId, session, review.map(item => ({
        question: item.question,
        answer: item.options[item.selectedIndex],
        score: item.correct ? 100 : 0,
        feedback: item.explanation,
        source: 'rule-based',
        skill: item.topic
    })), score);
    return res.json({
        score,
        correctCount: review.filter(item => item.correct).length,
        totalQuestions: review.length,
        totalScore: score,
        results: review.map(item => ({
            correct: item.correct,
            score: item.correct ? 10 : 0,
            feedback: item.explanation,
            source: 'rule-based'
        })),
        sources: ['rule-based'],
        topicPerformance: [...topicScores.values()].map(item => ({
            ...item,
            score: Math.round(item.correct / item.total * 100)
        })),
        review,
        interviewId: persisted.interviewId,
        xpEarned: persisted.xpEarned,
        questionSource: session.generationSource,
        questionModel: session.generationModel
    });
}

function providerErrorResponse(error, res, extra = {}) {
    if (error.code === 'TARGET_ROLE_REQUIRED') {
        return targetRoleRequiredResponse(res);
    }
    if (error.code === 'CURATED_QUESTION_POOL_TOO_SMALL') {
        res.status(422).json({
            code: error.code,
            message: error.message
        });
        return true;
    }
    if (!error.code?.startsWith('AI_')) return false;
    res.status(error.status || 502).json({
        code: error.code,
        message: providerErrorMessage(error.code, 'Interview', error),
        ...extra
    });
    return true;
}

// ================= STANDARD INTERVIEW =================
router.post('/generate', authMiddleware, async (req, res) => {
    const {
        role,
        difficulty = 'medium',
        company = '',
        type = 'Technical'
    } = req.body;
    if ((role !== undefined && (typeof role !== 'string' || !role.trim() || role.length > 120)) ||
        !['easy', 'medium', 'hard'].includes(difficulty) ||
        !['Technical', 'HR', 'Behavioral', 'Aptitude'].includes(type) ||
        typeof company !== 'string' || company.length > 120) {
        return res.status(400).json({ message: 'Provide a supported interview role, type, difficulty, and company.' });
    }
    try {
        const profile = await User.findById(req.user._id || req.user.id)
            .select('targetRole technicalSkills projects');
        const { role: resolvedRole } = resolveTargetRole(role, profile);
        if (!resolvedRole) return targetRoleRequiredResponse(res);
        const generated = await generateInterviewQuestions({
            role: resolvedRole,
            difficulty,
            company: company.trim(),
            type,
            count: 5,
            profile: profile || {}
        });
        const questions = generated.questions.map(question => ({
            ...question,
            company: company.trim(),
            interviewType: type
        }));
        const sources = [generated.source];
        res.json({
            questions,
            company,
            role: resolvedRole,
            type,
            difficulty,
            generationMode: 'ai',
            source: generated.source,
            model: generated.model,
            sources
        });
    } catch (error) {
        if (providerErrorResponse(error, res)) return;
        console.error('Generate error:', error);
        res.status(500).json({ message: 'Failed to generate questions. Please try again.' });
    }
});

// ================= EVALUATE SINGLE ANSWER =================
router.post('/evaluate', authMiddleware, async (req, res) => {
    const { answer } = req.body;
    const question = req.body.question || req.body.questionObj?.question || req.body.questionObj;
    if (typeof question !== 'string' || !question.trim() || question.length > 2000 ||
        typeof answer !== 'string' || !answer.trim() || answer.length > 10000) {
        return res.status(400).json({ message: 'Provide an interview question and an answer of up to 10,000 characters.' });
    }
    try {
        const result = await evaluateAnswer(question.trim(), answer.trim());
        res.json(result);
    } catch (error) {
        if (providerErrorResponse(error, res)) return;
        console.error('Evaluate error:', error);
        res.status(500).json({ message: 'Failed to evaluate answer. Please try again.' });
    }
});

// ================= SAVE INTERVIEW =================
router.post('/save', authMiddleware, async (req, res) => {
    res.status(410).json({
        code: 'INTERVIEW_SESSION_REQUIRED',
        message: 'Client-submitted scores are not accepted. Save results by completing an authenticated interview session.'
    });
});

// ================= GET HISTORY =================
router.get('/history', authMiddleware, async (req, res) => {
    try {
        const userId = req.user._id || req.user.id;
        const history = await Interview.find({ userId }).sort({ date: -1 });
        res.json(history || []);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch history', error: error.message });
    }
});

// ================= PRACTICE SESSION =================
router.post('/session/start', authMiddleware, async (req, res) => {
    const { role, topic = 'Mixed', difficulty = 'medium', mode = 'mcq', sessionLength = 5 } = req.body;
    const company = typeof req.body.company === 'string' ? req.body.company.slice(0, 120) : '';
    if ((role !== undefined && (typeof role !== 'string' || role.trim().length > 120)) ||
        !INTERVIEW_TOPICS.includes(topic) ||
        !['easy', 'medium', 'hard'].includes(difficulty) ||
        !['mcq', 'video', 'voice'].includes(mode) ||
        ![1, 2, 3, 5, 8, 10].includes(sessionLength)) {
        return res.status(400).json({ message: 'Choose a valid role, topic, difficulty, practice mode, and session length.' });
    }
    try {
        const generated = await createSession({
            userId: req.user._id || req.user.id,
            requestedRole: role,
            topic,
            difficulty,
            mode,
            sessionLength,
            company
        });
        res.status(201).json({
            sessionId: generated.session._id,
            role: generated.role,
            topic,
            difficulty,
            mode,
            sessionLength,
            generationSource: generated.source,
            generationModel: generated.model,
            questions: generated.questions.map(safePublicQuestion),
            expiresAt: generated.session.expiresAt
        });
    } catch (error) {
        if (providerErrorResponse(error, res, error.sessionId
            ? { sessionId: error.sessionId, role: error.sessionRole }
            : {})) return;
        console.error('Interview session creation error:', error);
        res.status(500).json({
            message: 'Could not create the interview practice session.',
            ...(error.sessionId ? { sessionId: error.sessionId, role: error.sessionRole } : {})
        });
    }
});

router.post('/session/:sessionId/retry-question', authMiddleware, async (req, res) => {
    const userId = String(req.user._id || req.user.id);
    try {
        const session = await ExamSession.findById(req.params.sessionId);
        if (!session || String(session.userId) !== userId) {
            return res.status(404).json({ message: 'Interview session not found.' });
        }
        if (!['video', 'voice'].includes(session.mode) || session.generationSource !== 'pending' ||
            session.questions.length || session.responses.length) {
            return res.status(409).json({ message: 'This interview session cannot retry question generation.' });
        }
        if (new Date(session.expiresAt).getTime() <= Date.now()) {
            await ExamSession.findByIdAndDelete(session._id);
            return res.status(410).json({ message: 'Interview session expired. Start a new session.' });
        }
        const profile = await User.findById(userId).select('targetRole technicalSkills interests projects');
        const generated = await generateInterviewQuestions({
            role: session.role,
            difficulty: session.difficulty,
            company: session.company,
            type: session.topic === 'Behavioral' ? 'Behavioral' : 'Technical',
            count: 1,
            profile: profile || {},
            feature: session.topic === 'Behavioral'
                ? 'behavioral_interview_generation'
                : 'video_interview_generation'
        });
        if (!SUPPORTED_AI_PROVIDERS.has(generated.source) || !generated.model ||
            generated.questions.length !== 1 || generated.questions[0].source !== generated.source) {
            const error = new Error('Interview provider returned invalid questions.');
            error.code = 'AI_PROVIDER_INVALID_OUTPUT';
            error.status = 502;
            throw error;
        }
        session.generationSource = generated.source;
        session.generationModel = generated.model;
        session.questions = generated.questions.map(question => ({ ...question, topic: session.topic }));
        await session.save();
        res.json({
            sessionId: session._id,
            role: session.role,
            topic: session.topic,
            difficulty: session.difficulty,
            mode: session.mode,
            sessionLength: session.sessionLength,
            generationSource: session.generationSource,
            generationModel: session.generationModel,
            questions: session.questions.map(safePublicQuestion)
        });
    } catch (error) {
        if (providerErrorResponse(error, res)) return;
        console.error('Interview question retry error:', error);
        res.status(500).json({ message: 'Could not retry interview question generation.' });
    }
});

router.post('/session/:sessionId/submit', authMiddleware, async (req, res) => {
    const userId = String(req.user._id || req.user.id);
    try {
        const session = await ExamSession.findById(req.params.sessionId);
        if (!session || String(session.userId) !== userId) {
            return res.status(404).json({ message: 'Interview session not found.' });
        }
        if (new Date(session.expiresAt).getTime() <= Date.now()) {
            await ExamSession.findByIdAndDelete(session._id);
            return res.status(410).json({ message: 'Interview session expired. Start a new session.' });
        }
        return await submitMcqSession(session, userId, req.body.answers, res);
    } catch (error) {
        console.error('MCQ submission error:', error);
        res.status(500).json({ message: 'Could not submit this practice session.' });
    }
});

router.post('/session/:sessionId/evaluate', authMiddleware, async (req, res) => {
    const userId = String(req.user._id || req.user.id);
    const { questionIndex, answer } = req.body;
    if (!Number.isInteger(questionIndex) || typeof answer !== 'string' ||
        !answer.trim() || answer.length > 10000) {
        return res.status(400).json({ message: 'Provide the current question number and an answer of up to 10,000 characters.' });
    }
    try {
        const session = await ExamSession.findById(req.params.sessionId);
        if (!session || String(session.userId) !== userId) {
            return res.status(404).json({ message: 'Interview session not found.' });
        }
        if (!['video', 'voice'].includes(session.mode)) {
            return res.status(409).json({ message: 'Only voice and video sessions accept spoken responses.' });
        }
        if (new Date(session.expiresAt).getTime() <= Date.now()) {
            await ExamSession.findByIdAndDelete(session._id);
            return res.status(410).json({ message: 'Interview session expired. Start a new session.' });
        }
        if (questionIndex !== session.responses.length || !session.questions[questionIndex]) {
            return res.status(409).json({ message: 'Answer the current question in order.' });
        }
        const question = session.questions[questionIndex];
        const profile = await User.findById(userId)
            .select('name targetRole technicalSkills interests projects');
        const evaluation = await evaluateAnswer(question.question, answer.trim(), {
            role: session.role,
            topic: session.topic,
            difficulty: question.difficulty || session.difficulty,
            questionIndex,
            profile: profile || {},
            priorResponses: session.responses.map(response => ({
                question: session.questions[response.questionIndex]?.question || '',
                answer: response.answer,
                score: response.score
            }))
        });
        if (!SUPPORTED_AI_PROVIDERS.has(evaluation.source) || !evaluation.model) {
            return res.status(502).json({
                code: 'AI_PROVIDER_INVALID_OUTPUT',
                message: 'A verified AI evaluation was not returned. Your answer was not saved.'
            });
        }
        session.responses.push({
            questionIndex,
            answer: answer.trim(),
            score: evaluation.score,
            feedback: evaluation.feedback,
            rubric: evaluation.rubric,
            evidence: evaluation.evidence,
            improvements: evaluation.improvements,
            source: evaluation.source,
            model: evaluation.model
        });
        let followUpQuestion = null;
        if (evaluation.followUpQuestion && session.questions.length < session.sessionLength) {
            followUpQuestion = {
                type: 'text',
                question: evaluation.followUpQuestion,
                skill: question.skill,
                topic: question.topic,
                difficulty: evaluation.nextDifficulty,
                source: evaluation.source,
                model: evaluation.model
            };
            session.questions.push(followUpQuestion);
        }
        await session.save();
        res.json({
            score: evaluation.score,
            rubric: evaluation.rubric,
            evidence: evaluation.evidence,
            improvements: evaluation.improvements,
            feedback: evaluation.feedback,
            source: evaluation.source,
            model: evaluation.model,
            nextDifficulty: evaluation.nextDifficulty,
            followUpQuestion: followUpQuestion?.question || null,
            completedResponses: session.responses.length,
            totalQuestions: session.questions.length
        });
    } catch (error) {
        if (providerErrorResponse(error, res)) return;
        console.error('Interview response evaluation error:', error);
        res.status(500).json({ message: 'Could not evaluate this response.' });
    }
});

router.post('/session/:sessionId/finish', authMiddleware, async (req, res) => {
    const userId = String(req.user._id || req.user.id);
    try {
        const session = await ExamSession.findById(req.params.sessionId);
        if (!session || String(session.userId) !== userId) {
            return res.status(404).json({ message: 'Interview session not found.' });
        }
        if (!['video', 'voice'].includes(session.mode) || !session.responses.length) {
            return res.status(400).json({ message: 'Complete at least one evaluated response before finishing.' });
        }
        const totalScore = Math.round(
            session.responses.reduce((sum, response) => sum + response.score, 0) /
            session.responses.length * 10
        );
        const answers = session.responses.map(response => ({
            question: session.questions[response.questionIndex]?.question || '',
            answer: response.answer,
            score: response.score * 10,
            feedback: response.feedback,
            rubric: response.rubric,
            evidence: response.evidence,
            improvements: response.improvements,
            source: response.source,
            skill: session.questions[response.questionIndex]?.topic || session.topic
        }));
        const persisted = await persistInterviewResult(userId, session, answers, totalScore);
        res.json({
            totalScore,
            answerCount: answers.length,
            interviewId: persisted.interviewId,
            xpEarned: persisted.xpEarned,
            evaluationSource: session.responses.at(-1).source,
            evaluationModel: session.responses.at(-1).model
        });
    } catch (error) {
        console.error('Interview session finish error:', error);
        res.status(500).json({ message: 'Could not save this interview session.' });
    }
});

// Compatibility endpoints use the same secure server-owned practice sessions.
router.post('/exam', authMiddleware, async (req, res) => {
    req.body = { ...req.body, mode: 'mcq', topic: 'Mixed', sessionLength: 5 };
    const userId = req.user._id || req.user.id;
    const { role, difficulty = 'medium', company = '' } = req.body;
    if ((role !== undefined && (typeof role !== 'string' || role.trim().length > 120)) ||
        !['easy', 'medium', 'hard'].includes(difficulty)) {
        return res.status(400).json({ message: 'Provide a valid role and supported difficulty.' });
    }
    try {
        const generated = await createSession({
            userId,
            requestedRole: role,
            difficulty,
            topic: 'Mixed',
            mode: 'mcq',
            sessionLength: 5,
            company: typeof company === 'string' ? company.slice(0, 120) : ''
        });
        res.json({
            examId: generated.session._id,
            sessionId: generated.session._id,
            questions: generated.questions.map(safePublicQuestion),
            generationMode: generated.source,
            source: generated.source,
            model: generated.model,
            expiresAt: generated.session.expiresAt
        });
    } catch (error) {
        if (providerErrorResponse(error, res)) return;
        console.error('Exam generation error:', error);
        res.status(500).json({ message: 'Failed to generate exam.' });
    }
});

router.post('/exam/evaluate', authMiddleware, async (req, res) => {
    const { examId, answers } = req.body;
    if (typeof examId !== 'string' || !Array.isArray(answers) ||
        answers.some(answer => typeof answer !== 'string' || !answer.trim() || answer.length > 10000)) {
        return res.status(400).json({ message: 'Provide a valid exam ID and non-empty text answers.' });
    }
    try {
        const session = await ExamSession.findById(examId);
        if (!session || String(session.userId) !== String(req.user._id || req.user.id)) {
            return res.status(404).json({ message: 'Exam session not found.' });
        }
        if (session.mode === 'mcq') {
            return await submitMcqSession(session, String(req.user._id || req.user.id),
                answers.map(answer => Number(answer)), res);
        }
        if (answers.length !== session.questions.length ||
            answers.some(answer => !answer.trim())) {
            return res.status(400).json({ message: `Submit a text answer for all ${session.questions.length} questions.` });
        }
        const results = [];
        for (let index = 0; index < session.questions.length; index++) {
            const evaluation = await evaluateAnswer(session.questions[index].question, answers[index].trim());
            if (!SUPPORTED_AI_PROVIDERS.has(evaluation.source) || !evaluation.model) {
                return res.status(502).json({
                    code: 'AI_PROVIDER_INVALID_OUTPUT',
                    message: 'A verified AI evaluation was not returned. No score was saved.'
                });
            }
            results.push(evaluation);
        }
        const totalScore = Math.round(
            results.reduce((sum, result) => sum + result.score, 0) /
            results.length * 10
        );
        const persisted = await persistInterviewResult(String(req.user._id || req.user.id), session,
            session.questions.map((question, index) => ({
                question: question.question,
                answer: answers[index].trim(),
                score: results[index].score * 10,
                feedback: results[index].feedback,
                rubric: results[index].rubric,
                evidence: results[index].evidence,
                improvements: results[index].improvements,
                source: results[index].source,
                skill: question.topic || session.topic
            })), totalScore);
        return res.json({
            totalScore,
            results,
            xpEarned: persisted.xpEarned,
            interviewId: persisted.interviewId,
            sources: [...new Set(results.map(result => result.source))]
        });
    } catch (error) {
        if (error.code && error.status) {
            return res.status(error.status).json({
                code: error.code,
                message: providerErrorMessage(error.code, 'Interview evaluation', error)
            });
        }
        console.error('Exam submission error:', error);
        res.status(500).json({ message: 'Failed to submit exam.' });
    }
});

module.exports = router;
