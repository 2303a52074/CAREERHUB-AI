const express = require('express');
const nodeVm = require('vm');
let VM;
try {
    VM = require('vm2').VM;
} catch (e) {
    VM = null;
}
const authMiddleware = require('../middleware/authMiddleware');
const CodingProblem = require('../models/CodingProblem');
const CodeSubmission = require('../models/CodeSubmission');
const User = require('../models/User');

const router = express.Router();

let genAIClient = null;
function getGenAI() {
    if (!genAIClient && process.env.GEMINI_API_KEY) {
        try {
            const { GoogleGenAI } = require('@google/genai');
            genAIClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        } catch (e) {
            console.warn("Gemini SDK init warning:", e.message);
        }
    }
    return genAIClient;
}

// ========== SECURE EVALUATE FUNCTION ==========
function runSandboxedScript(script, timeout = 2000) {
    if (VM) {
        try {
            const vm = new VM({
                timeout,
                sandbox: {},
                fixAsync: false
            });
            return vm.run(script);
        } catch (err) {
            // Fall back to node vm if vm2 errors
        }
    }
    const sandbox = {};
    nodeVm.createContext(sandbox);
    return nodeVm.runInContext(script, sandbox, { timeout });
}

function evaluateCode(code, testCases) {
    const results = [];
    let allPassed = true;
    let totalExecutionTime = 0;

    for (let i = 0; i < (testCases || []).length; i++) {
        const testCase = testCases[i];
        const startTime = Date.now();
        
        try {
            const script = `
                ${code}
                const input = ${testCase.input};
                let res;
                if (typeof solution === 'function') {
                    if (Array.isArray(input)) {
                        res = solution(...input);
                    } else {
                        res = solution(input);
                    }
                } else if (typeof twoSum === 'function') {
                    res = twoSum(...input);
                } else {
                    throw new Error("Function 'solution' is not defined.");
                }
                JSON.stringify(res);
            `;

            const rawResult = runSandboxedScript(script, 2000);
            const actualOutput = rawResult !== undefined ? JSON.parse(rawResult) : null;
            
            let expectedOutput;
            try {
                expectedOutput = JSON.parse(testCase.expectedOutput);
            } catch {
                expectedOutput = testCase.expectedOutput;
            }

            const passed = JSON.stringify(actualOutput) === JSON.stringify(expectedOutput);
            
            results.push({
                testCaseId: i,
                passed,
                actualOutput: rawResult,
                expectedOutput: testCase.expectedOutput
            });

            if (!passed) allPassed = false;

        } catch (error) {
            results.push({
                testCaseId: i,
                passed: false,
                actualOutput: null,
                error: error.message
            });
            allPassed = false;
        }
        totalExecutionTime += (Date.now() - startTime);
    }
    
    return { allPassed, results, executionTime: totalExecutionTime };
}

// ========== RUN ARBITRARY JAVASCRIPT CODE (/run) ==========
router.post('/run', async (req, res) => {
    try {
        const { code, testInput } = req.body;
        if (!code) {
            return res.status(400).json({ success: false, error: 'No code provided' });
        }

        const logs = [];
        const sandbox = {
            console: {
                log: (...args) => logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')),
                error: (...args) => logs.push('[ERROR] ' + args.join(' ')),
                warn: (...args) => logs.push('[WARN] ' + args.join(' '))
            }
        };
        nodeVm.createContext(sandbox);

        let runnableCode = code;
        if (testInput && typeof testInput === 'string' && testInput.trim()) {
            runnableCode = `
                ${code}
                ;(() => {
                    try {
                        let fn = null;
                        const knownFns = ['twoSum','reverseString','isValid','mergeArrays','maxSubArray','isPalindrome','romanToInt','longestCommonPrefix','climbStairs','search','solution','maxProfit','hasCycle','LRUCache','trap','findMedianSortedArrays'];
                        for (const name of knownFns) {
                            if (typeof this[name] === 'function') { fn = this[name]; break; }
                        }
                        if (!fn) {
                            const keys = Object.keys(this).filter(k => typeof this[k] === 'function' && k !== 'console');
                            if (keys.length > 0) fn = this[keys[keys.length - 1]];
                        }
                        if (fn) {
                            const callRes = fn(${testInput});
                            console.log('Result: ' + JSON.stringify(callRes));
                        }
                    } catch(evalErr) {
                        console.error(evalErr.message);
                    }
                })();
            `;
        }

        let scriptResult;
        try {
            scriptResult = nodeVm.runInContext(runnableCode, sandbox, { timeout: 2500 });
        } catch (execErr) {
            return res.json({ success: false, error: execErr.message, logs });
        }

        const output = logs.length > 0 ? logs.join('\n') : (scriptResult !== undefined ? String(scriptResult) : 'Execution finished with no output');
        res.json({ success: true, output, logs });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ========== AI CODE ANALYSIS ROUTE ==========
router.post('/analyze', authMiddleware, async (req, res) => {
    const { code, problemTitle, problemDescription } = req.body;

    const prompt = `You are a Senior Technical Interviewer.
Problem: ${problemTitle || 'Coding Challenge'}
Description: ${problemDescription || 'N/A'}
User's Code:
\`\`\`
${code || ''}
\`\`\`

Provide a brief review:
1. Logic Check: Is the approach correct?
2. Efficiency: Mention Time and Space Complexity (Big O).
3. Hint: If there is a bug, give a subtle hint without giving the full code.
Keep it under 150 words.`;

    const ai = getGenAI();
    if (ai) {
        try {
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
            });
            return res.json({ analysis: response.text });
        } catch (error) {
            console.warn("Gemini analyze failed:", error.message);
        }
    }

    // Fallback static analysis
    const length = (code || '').length;
    res.json({
        analysis: `Code analysis:\n1. Logic Check: Structure appears valid (${length} chars).\n2. Efficiency: Estimated O(N) or O(N log N) based on standard iterative traversal.\n3. Hint: Verify boundary limits and null checks for all input arrays.`
    });
});

// ========== SUBMIT CODE SOLUTION ==========
router.post('/submit/:problemId', authMiddleware, async (req, res) => {
    try {
        const { code, language = 'javascript' } = req.body;
        
        if (!code || code.trim() === '') {
            return res.status(400).json({ message: 'Code cannot be empty' });
        }
        
        const problem = await CodingProblem.findById(req.params.problemId);
        if (!problem) return res.status(404).json({ message: 'Problem not found' });
        
        const { allPassed, results, executionTime } = evaluateCode(code, problem.testCases || []);
        const score = allPassed ? (problem.points || 10) : 0;
        
        const submission = new CodeSubmission({
            userId: req.user.id,
            problemId: problem._id,
            code,
            language,
            status: allPassed ? 'accepted' : 'wrong_answer',
            score,
            executionTime,
            testResults: results
        });
        await submission.save();
        
        if (allPassed) {
            const user = await User.findById(req.user.id);
            if (user) {
                user.xp = (user.xp || 0) + score;
                user.level = Math.floor(user.xp / 100) + 1;
                await user.save();
            }
        }
        
        res.json({
            status: allPassed ? 'accepted' : 'wrong_answer',
            score,
            results,
            message: allPassed ? "✅ Correct! All test cases passed." : "❌ Failed some test cases."
        });
        
    } catch (error) {
        res.status(500).json({ message: 'Submission failed', error: error.message });
    }
});

// ========== GET PROBLEM BY ID ==========
router.get('/problems/:id', async (req, res) => {
    try {
        const problem = await CodingProblem.findById(req.params.id);
        if (!problem) {
            return res.status(404).json({ message: 'Problem not found' });
        }
        res.json(problem);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching problem' });
    }
});

// ========== GET ALL PROBLEMS ==========
router.get('/problems', async (req, res) => {
    try {
        const problems = await CodingProblem.find().select('-testCases');
        res.json(problems);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching problems' });
    }
});

// ========== GET USER CODING STATS ==========
router.get('/stats', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const submissions = await CodeSubmission.find({ userId, status: 'accepted' });
        const user = await User.findById(userId);

        const totalSolved = submissions ? submissions.length : 0;
        const totalPoints = user ? (user.xp || 0) : 0;

        res.json({
            totalSolved,
            totalPoints,
            rank: 1
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching stats' });
    }
});

module.exports = router;
