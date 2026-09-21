const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const Interview = require('../models/Interview');
const User = require('../models/User');
const { generateQuestion, evaluateAnswer } = require('../utils/aiService');

const router = express.Router();

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function optionalAuth(req, res, next) {
    const authHeader = req.header('Authorization');
    if (authHeader) {
        try {
            return authMiddleware(req, res, next);
        } catch (e) {
            // fallback
        }
    }
    const demoUser = await User.findOne({ email: 'demo@example.com' }) || (await User.find())[0];
    req.user = demoUser || { _id: 'user-demo-1', id: 'user-demo-1', name: 'Demo Candidate' };
    next();
}

// Fallback questions categorized by interview type
const interviewTypeQuestions = {
    HR: [
        "Tell me about yourself, your background, and why you are interested in joining our company.",
        "Where do you see yourself professionally in the next 3 to 5 years?",
        "Why do you want to work at our organization specifically compared to competitors?",
        "How do you handle high-pressure deadlines or sudden shifts in priority?",
        "What are your greatest professional strengths and your biggest area for improvement?"
    ],
    Behavioral: [
        "Describe a situation where you had a major conflict with a team member. How did you resolve it?",
        "Tell me about a time you made a significant mistake on a project. What happened and what did you learn?",
        "Give an example of a goal you reached and tell me about the specific strategy you used to achieve it.",
        "Describe a time when you had to learn a completely new technology or tool within a tight timeframe.",
        "Tell me about a time you received difficult constructive feedback. How did you act upon it?"
    ],
    Aptitude: [
        "Explain how you would estimate the number of smartphones purchased in your city annually.",
        "You have 8 balls of identical look, but one is heavier. What is the minimum weighings needed on a balance scale to find it?",
        "A project has 3 interdependent phases. How do you identify the critical path and buffer against delays?",
        "Explain the quantitative logic behind compounding latency in a distributed microservices call chain.",
        "If a server has 99.9% uptime (three nines), how many minutes of downtime is allowed per year?"
    ]
};

// ================= STANDARD INTERVIEW =================
router.post('/generate', optionalAuth, async (req, res) => {
    const {
        role = 'Full Stack Developer',
        difficulty = 'medium',
        company = 'Top Tech',
        type = 'Technical'
    } = req.body;
    
    try {
        const questions = [];
        
        if (type !== 'Technical' && interviewTypeQuestions[type]) {
            const pool = interviewTypeQuestions[type];
            // Mix with AI if possible, else take from pool
            for (let i = 0; i < Math.min(5, pool.length); i++) {
                questions.push({
                    type: 'text',
                    question: pool[i],
                    skill: type,
                    difficulty: difficulty,
                    company: company,
                    hint: `Format your answer clearly with specific examples using the STAR method.`
                });
            }
        } else {
            // Technical role-based questions
            for (let i = 0; i < 5; i++) {
                const q = await generateQuestion(`${company} ${role}`, difficulty);
                questions.push({
                    ...q,
                    company,
                    interviewType: type
                });
                if (i < 4) await delay(150);
            }
        }
        res.json({ questions, company, role, type, difficulty });
    } catch (error) {
        console.error('Generate error:', error);
        res.status(500).json({ 
            message: 'Failed to generate questions. Please try again.', 
            error: error.message 
        });
    }
});

// ================= EVALUATE SINGLE ANSWER =================
router.post('/evaluate', optionalAuth, async (req, res) => {
    const { answer, questionObj } = req.body;
    
    try {
        const qText = questionObj?.question || questionObj || "General interview question";
        const result = await evaluateAnswer(qText, answer || "");
        res.json(result);
    } catch (error) {
        console.error('Evaluate error:', error);
        res.status(500).json({ 
            message: 'Failed to evaluate answer. Please try again.',
            error: error.message 
        });
    }
});

// ================= SAVE INTERVIEW =================
router.post('/save', optionalAuth, async (req, res) => {
    const { role, difficulty, totalScore, answers, company, interviewType } = req.body;
    const userId = req.user._id || req.user.id;
    
    try {
        const newInterview = new Interview({
            userId,
            role: role || 'general',
            difficulty: difficulty || 'medium',
            totalScore: totalScore || 0,
            answers: answers || [],
            date: new Date()
        });
        
        await newInterview.save();

        // Update user XP & readiness score
        try {
            const xpGained = Math.round((totalScore || 50) * 1.5);
            await User.findByIdAndUpdate(userId, {
                $inc: { xp: xpGained },
                lastPractice: new Date()
            });
        } catch (e) {
            console.warn('XP update error:', e.message);
        }

        res.json({ message: 'Interview saved successfully', score: totalScore });
    } catch (error) {
        console.error('Save error:', error);
        res.status(500).json({ message: 'Failed to save interview', error: error.message });
    }
});

// ================= GET HISTORY =================
router.get('/history', optionalAuth, async (req, res) => {
    try {
        const userId = req.user._id || req.user.id;
        const history = await Interview.find({ userId }).sort({ date: -1 });
        res.json(history || []);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch history', error: error.message });
    }
});

// ================= EXAM MODE =================
router.post('/exam', optionalAuth, async (req, res) => {
    const { role = 'Full Stack Developer', difficulty = 'medium', company = 'Top Tech' } = req.body;
    
    try {
        const mcqQuestions = [
            { type: 'mcq', question: 'What does HTML stand for?', options: ['Hyper Text Markup Language', 'High Tech Modern Language', 'Hyper Transfer Markup Language', 'Home Tool Markup Language'], answer: 'A' },
            { type: 'mcq', question: 'Which of the following is a JavaScript framework or library?', options: ['React', 'Django', 'Flask', 'Laravel'], answer: 'A' },
            { type: 'mcq', question: 'What does CSS stand for?', options: ['Creative Style Sheets', 'Computer Style Sheets', 'Cascading Style Sheets', 'Colorful Style Sheets'], answer: 'C' },
            { type: 'mcq', question: 'Which symbol is used for comments in JavaScript?', options: ['<!-- -->', '//', '#', '/* */'], answer: 'B' },
            { type: 'mcq', question: 'What is the correct way to write a JavaScript array?', options: ['var colors = (1: "red", 2: "green")', 'var colors = ["red", "green"]', 'var colors = "red", "green"', 'var colors = 1 = ("red"), 2 = ("green")'], answer: 'B' },
            { type: 'mcq', question: 'How do you create a function in JavaScript?', options: ['function myFunction()', 'def myFunction()', 'create myFunction()', 'function:myFunction()'], answer: 'A' },
            { type: 'mcq', question: 'What does API stand for?', options: ['Application Programming Interface', 'Applied Programming Interface', 'Application Process Interface', 'Applied Process Interface'], answer: 'A' }
        ];
        
        const theoryQuestions = [];
        for (let i = 0; i < 2; i++) {
            const q = await generateQuestion(role, difficulty);
            theoryQuestions.push({ ...q, type: 'text' });
            await delay(100);
        }
        
        res.json({ questions: [...mcqQuestions, ...theoryQuestions] });
    } catch (error) {
        console.error('Exam generation error:', error);
        res.status(500).json({ message: 'Failed to generate exam', error: error.message });
    }
});

// ================= EVALUATE EXAM =================
router.post('/exam/evaluate', optionalAuth, async (req, res) => {
    const { questions, answers } = req.body;
    const userId = req.user._id || req.user.id;
    
    let totalScore = 0;
    const results = [];
    
    for (let i = 0; i < (questions || []).length; i++) {
        const q = questions[i];
        const userAnswer = (answers && answers[i]) || '';
        
        if (q.type === 'mcq') {
            const correct = String(userAnswer).trim().toUpperCase() === String(q.answer).trim().toUpperCase();
            const score = correct ? 10 : 0;
            totalScore += score;
            results.push({ correct, score, feedback: correct ? '✅ Correct!' : '❌ Wrong answer' });
        } else {
            try {
                const { score, feedback } = await evaluateAnswer(q.question, userAnswer);
                totalScore += score;
                results.push({ score, feedback });
            } catch (error) {
                results.push({ score: 5, feedback: "Evaluation completed." });
            }
        }
    }
    
    const count = (questions && questions.length) > 0 ? questions.length : 1;
    const finalScore = Math.round((totalScore / (count * 10)) * 100);
    
    const newInterview = new Interview({
        userId,
        role: 'Exam Mode',
        difficulty: 'medium',
        totalScore: finalScore,
        answers: (questions || []).map((q, i) => ({
            question: q.question,
            answer: (answers && answers[i]) || '',
            score: results[i]?.score || 0,
            skill: 'general'
        })),
        date: new Date()
    });
    
    await newInterview.save();
    res.json({ totalScore: finalScore, results });
});

module.exports = router;

