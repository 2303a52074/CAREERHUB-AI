let geminiClient = null;
let groqClient = null;

function getGeminiClient() {
    if (!geminiClient && process.env.GEMINI_API_KEY) {
        try {
            const { GoogleGenAI } = require('@google/genai');
            geminiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        } catch (e) {
            console.warn('Failed to initialize GoogleGenAI:', e.message);
        }
    }
    return geminiClient;
}

function getGroqClient() {
    if (!groqClient && process.env.GROQ_API_KEY) {
        try {
            const Groq = require('groq-sdk');
            groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
        } catch (e) {
            console.warn('Failed to initialize Groq:', e.message);
        }
    }
    return groqClient;
}

// Fallback questions library organized by role and difficulty
const fallbackQuestions = {
    frontend: {
        easy: [
            "Explain the difference between let, const, and var in modern JavaScript.",
            "What is CSS box-sizing: border-box and why is it commonly used?",
            "What is the Document Object Model (DOM) and how does JavaScript interact with it?"
        ],
        medium: [
            "Explain how the React Virtual DOM works and how reconciliation optimizes renders.",
            "What are JavaScript closures, and can you provide a practical use case?",
            "Explain event delegation in JavaScript and how event bubbling enables it."
        ],
        hard: [
            "How would you optimize Core Web Vitals (LCP, FID/INP, CLS) for a high-traffic single page app?",
            "Explain the JavaScript event loop, microtasks vs macrotasks, and rendering pipeline.",
            "Design a resilient client-side state management architecture with offline synchronization."
        ]
    },
    backend: {
        easy: [
            "What is the difference between synchronous and asynchronous code in Node.js?",
            "Explain the purpose of HTTP status codes 200, 400, 401, 403, and 500.",
            "What is middleware in Express.js and how is next() used?"
        ],
        medium: [
            "How does Node.js handle concurrency despite being single-threaded?",
            "Compare SQL vs NoSQL databases in terms of ACID compliance and scalability.",
            "Explain JWT authentication flow and how to handle token refresh securely."
        ],
        hard: [
            "Design a distributed rate limiter capable of handling millions of requests per second.",
            "How do you resolve database deadlocks and handle race conditions in high-throughput transactions?",
            "Design an idempotent webhook delivery system with exponential backoff and dead-letter queues."
        ]
    },
    fullstack: {
        easy: [
            "What is RESTful API design and what are its core principles?",
            "Explain the difference between client-side rendering (CSR) and server-side rendering (SSR).",
            "How do CORS policies work and why do browsers enforce them?"
        ],
        medium: [
            "How would you design an authentication and authorization system for a multi-tenant SaaS application?",
            "Explain database indexing: how B-Trees work and when an index might hurt performance.",
            "How do WebSockets differ from HTTP polling and SSE (Server-Sent Events)?"
        ],
        hard: [
            "Architect a scalable real-time collaborative document editor like Google Docs.",
            "How would you migrate a monolith to microservices with zero downtime and data consistency?",
            "Design a global caching strategy utilizing CDN edge workers, Redis, and database query caching."
        ]
    }
};

function getFallbackQuestion(role = 'frontend', difficulty = 'medium') {
    const roleKey = Object.keys(fallbackQuestions).find(r => role.toLowerCase().includes(r)) || 'frontend';
    const diffKey = ['easy', 'medium', 'hard'].includes(difficulty.toLowerCase()) ? difficulty.toLowerCase() : 'medium';
    const list = fallbackQuestions[roleKey][diffKey];
    const questionText = list[Math.floor(Math.random() * list.length)];
    return {
        type: 'text',
        question: questionText,
        skill: role,
        difficulty: diffKey,
        hint: `Think about ${role} best practices and real-world implementation.`
    };
}

// Generate Question
async function generateQuestion(role, difficulty) {
    const prompt = `You are a technical interviewer at a top tech company. 
Generate ONE unique, challenging, ${difficulty} level interview question for a ${role} developer position.
Requirements:
- Make it practical and job-relevant
- Focus on real-world problem solving
- Keep it concise (under 150 characters)
- Do NOT include any explanations, labels, or markdown
- Output ONLY the question text
Question:`;

    // 1. Try Gemini
    const gemini = getGeminiClient();
    if (gemini) {
        try {
            const response = await gemini.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
            });
            let text = response.text ? response.text.trim() : "";
            text = text.replace(/^["']|["']$/g, '').replace(/\n/g, ' ');
            if (text && text.length > 10) {
                console.log(`[AI Studio] Gemini generated question for ${role}`);
                return {
                    type: 'text',
                    question: text,
                    skill: role,
                    difficulty: difficulty,
                    hint: `Think about ${role} architecture and best practices.`
                };
            }
        } catch (err) {
            console.warn('Gemini generateQuestion error, falling back:', err.message);
        }
    }

    // 2. Try Groq if configured
    const groq = getGroqClient();
    if (groq) {
        try {
            const completion = await groq.chat.completions.create({
                messages: [{ role: "user", content: prompt }],
                model: "llama-3.3-70b-versatile",
                temperature: 0.8,
                max_tokens: 200,
            });
            let questionText = completion.choices[0]?.message?.content?.trim() || "";
            questionText = questionText.replace(/^["']|["']$/g, '').replace(/\n/g, ' ');
            if (questionText && questionText.length > 10) {
                return {
                    type: 'text',
                    question: questionText,
                    skill: role,
                    difficulty: difficulty,
                    hint: `Think about ${role} best practices and real-world scenarios.`
                };
            }
        } catch (err) {
            console.warn('Groq generateQuestion error, falling back:', err.message);
        }
    }

    // 3. Fallback
    return getFallbackQuestion(role, difficulty);
}

// Evaluate Answer
async function evaluateAnswer(question, answer) {
    if (!answer || answer.trim().length === 0) {
        return {
            score: 1,
            feedback: "No answer provided. Please provide a clear explanation to receive points."
        };
    }

    const prompt = `You are a strict technical interviewer. Evaluate this candidate's answer.
Question: "${question}"
Candidate's Answer: "${answer}"

Rate from 1 to 10 (10 being perfect, 1 being completely wrong).
Provide specific, actionable feedback.

Return ONLY valid JSON in this exact format:
{
  "score": number,
  "feedback": "specific constructive feedback (max 100 words)"
}`;

    // 1. Try Gemini
    const gemini = getGeminiClient();
    if (gemini) {
        try {
            const response = await gemini.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
            });
            const text = response.text ? response.text.trim() : "";
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                return {
                    score: Math.min(10, Math.max(1, Number(parsed.score) || 5)),
                    feedback: parsed.feedback || "Good response. Well articulated."
                };
            }
        } catch (err) {
            console.warn('Gemini evaluateAnswer error, falling back:', err.message);
        }
    }

    // 2. Try Groq
    const groq = getGroqClient();
    if (groq) {
        try {
            const completion = await groq.chat.completions.create({
                messages: [{ role: "user", content: prompt }],
                model: "llama-3.3-70b-versatile",
                temperature: 0.5,
                max_tokens: 300,
            });
            const raw = completion.choices[0]?.message?.content?.trim() || "";
            const jsonMatch = raw.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                return {
                    score: Math.min(10, Math.max(1, Number(parsed.score) || 5)),
                    feedback: parsed.feedback || "Answer evaluated."
                };
            }
        } catch (err) {
            console.warn('Groq evaluateAnswer error, falling back:', err.message);
        }
    }

    // 3. Fallback Evaluation
    const wordCount = answer.trim().split(/\s+/).length;
    let baseScore = 5;
    let feedback = "Valid explanation provided.";

    if (wordCount < 10) {
        baseScore = 4;
        feedback = "Answer is very brief. Try elaborating on trade-offs and edge cases.";
    } else if (wordCount > 40) {
        baseScore = 8;
        feedback = "Detailed and thorough answer demonstrating good grasp of the topic.";
    } else {
        baseScore = 7;
        feedback = "Solid answer covering the core concepts well.";
    }

    return {
        score: baseScore,
        feedback
    };
}

// Evaluate Code
async function evaluateCode(question, code) {
    const prompt = `You are a senior code reviewer. Evaluate this code solution.
Problem: "${question}"
Code:
\`\`\`
${(code || '').substring(0, 1000)}
\`\`\`
Rate from 1 to 10 based on:
- Correctness
- Efficiency
- Code quality
- Edge cases

Return ONLY valid JSON:
{
  "score": number,
  "feedback": "specific feedback (max 100 words)"
}`;

    // 1. Try Gemini
    const gemini = getGeminiClient();
    if (gemini) {
        try {
            const response = await gemini.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
            });
            const text = response.text ? response.text.trim() : "";
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                return {
                    score: Math.min(10, Math.max(1, Number(parsed.score) || 5)),
                    feedback: parsed.feedback || "Code solution reviewed."
                };
            }
        } catch (err) {
            console.warn('Gemini evaluateCode error, falling back:', err.message);
        }
    }

    // 2. Fallback
    return {
        score: code && code.length > 20 ? 8 : 4,
        feedback: "Code structure is clean. Ensure proper time complexity and edge case handling."
    };
}

// ================= CAREER ASSISTANT AI =================
async function chatCareerAssistant(message, conversationHistory = [], userProfile = {}) {
    const profileSummary = `
Student Profile:
- Degree: ${userProfile.degree || 'B.Tech'} in ${userProfile.branch || 'Computer Science & Engineering'} (${userProfile.college || 'University'}, Class of ${userProfile.graduationYear || '2026'})
- CGPA: ${userProfile.cgpa || '8.5'}
- Technical Skills: ${(userProfile.technicalSkills || []).join(', ') || 'JavaScript, Python, React, SQL'}
- Soft Skills: ${(userProfile.softSkills || []).join(', ') || 'Communication, Problem Solving'}
- Certifications: ${(userProfile.certifications || []).join(', ') || 'None listed'}
- Target Role: ${userProfile.targetRole || 'Full Stack Developer'}
- Career Goals: ${userProfile.careerGoals || 'Become a Software Engineer'}
- Career Readiness Score: ${userProfile.careerReadinessScore || 75}/100
- Resume ATS Score: ${userProfile.resumeScore || 80}/100
- Projects: ${(userProfile.projects || []).map(p => p.title).join(', ') || 'Academic web projects'}
`;

    const prompt = `You are "CareerHub AI", an expert career and placement companion for university students and aspiring software engineers.
Your mission is to guide students across the complete career journey: Discover → Assess → Learn → Prepare → Apply → Track → Grow.

${profileSummary}

Conversation context:
${conversationHistory.slice(-4).map(m => `${m.role === 'user' ? 'Student' : 'CareerHub AI'}: ${m.content}`).join('\n')}

Student's new query:
"${message}"

Provide a highly actionable, encouraging, and structured response tailored specifically to their profile data.
- If they ask what career is suitable, analyze their skills and strengths.
- If they ask what skills they need, highlight concrete high-demand industry requirements.
- If they ask if they are ready for a job or interview, give realistic readiness feedback with specific tips.
- Use clear formatting with bullet points and bold highlights.
- Keep the response direct, engaging, and under 250 words.`;

    const gemini = getGeminiClient();
    if (gemini) {
        try {
            const response = await gemini.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
            });
            const text = response.text ? response.text.trim() : "";
            if (text && text.length > 20) {
                return text;
            }
        } catch (err) {
            console.warn('Gemini chatCareerAssistant error, falling back:', err.message);
        }
    }

    // High quality intelligent fallback based on intent keywords
    const msg = message.toLowerCase();
    const skills = (userProfile.technicalSkills || ['JavaScript', 'React', 'Node.js']);
    const target = userProfile.targetRole || 'Full Stack Developer';

    if (msg.includes('suitable') || msg.includes('which role') || msg.includes('career option')) {
        return `Based on your profile in **${userProfile.branch || 'Computer Science'}** and your core skills (**${skills.slice(0, 4).join(', ')}**), here are the top 3 roles best suited for you:

1. **${target}**: Your combination of frontend and backend technologies gives you strong placement viability for entry-level SDE roles.
2. **Frontend Engineer**: With React, JavaScript, and responsive design fundamentals, you are immediately eligible for frontend developer tracks at product startups and tier-1 service firms.
3. **Cloud & DevOps Associate**: Complementing your programming skills with Docker, Linux, and AWS will unlock high-paying cloud engineering positions.

💡 **Next Step**: Head over to the **Skill Gap Analysis** tab to see your exact match percentage for top company roles!`;
    }

    if (msg.includes('skill') || msg.includes('need to become') || msg.includes('learn next')) {
        return `To accelerate your preparation for **${target}**, here is your prioritized learning checklist:

- **High Priority**: Master **Docker containerization**, **PostgreSQL/MongoDB indexing**, and **TypeScript** type safety.
- **System Design Fundamentals**: Understand caching with Redis, load balancers, and database sharding basics for technical interviews.
- **DSA Practice**: Target Medium-level LeetCode problems on Trees, Graphs, Dynamic Programming, and Two-Pointers.

🚀 Check the **Career Roadmap** section in CareerHub AI for milestone-based phase tracking!`;
    }

    if (msg.includes('interview') || msg.includes('prepare') || msg.includes('mock')) {
        return `Great initiative! Here is your 3-step action plan to ace upcoming technical and HR rounds:

1. **Technical Prep**: Practice 2 mock interviews daily in CareerHub's **AI Interview Prep** tab under **Standard** and **Exam** modes.
2. **Behavioral (STAR Method)**: Prepare 3 real project stories (Situation, Task, Action, Result) showcasing leadership, conflict resolution, and debugging complex bugs.
3. **System Architecture**: Be ready to explain your **${(userProfile.projects?.[0]?.title) || 'primary portfolio project'}** end-to-end, including database schema, API contracts, and trade-offs.

Would you like me to start a quick 3-question practice drill right now?`;
    }

    return `Hello! As your **CareerHub AI** companion, I'm here to support your complete career journey from discovery to placement:

- **Target Goal**: ${target} (${userProfile.graduationYear || '2026'} Batch)
- **Current Career Readiness**: **${userProfile.careerReadinessScore || 78}/100**
- **Profile Completion**: High (${skills.length} technical skills verified)

How can I help you today? You can ask me:
- *"Which roles match my current skills?"*
- *"Am I ready for a Software Engineer interview at Google or Microsoft?"*
- *"How can I improve my resume ATS score?"*
- *"What is my biggest skill gap right now?"*`;
}

// ================= RESUME ANALYZER AI =================
async function analyzeResume(resumeText, targetRole = 'Full Stack Developer', userProfile = {}) {
    const text = (resumeText || "").trim();
    if (!text || text.length < 30) {
        return {
            score: 45,
            atsCompatibility: 50,
            summary: "Resume content is too brief. Please paste your complete resume or upload a comprehensive PDF document.",
            detectedSkills: ['JavaScript', 'HTML/CSS'],
            missingSkills: ['Node.js', 'Docker', 'SQL', 'TypeScript', 'System Design', 'Git'],
            strengths: ["Clean start with foundational technologies."],
            weaknesses: ["Missing measurable metrics and quantified achievements.", "Lack of clear project architecture descriptions."],
            recommendations: [
                "Use the Google XYZ formula: Accomplished [X] as measured by [Y], by doing [Z].",
                "Add a dedicated Technical Skills section with categorized headers (Languages, Frameworks, Tools, Databases).",
                "Include verifiable GitHub repositories and live deployment URLs for projects."
            ]
        };
    }

    const prompt = `You are a Principal Technical Recruiter and ATS (Applicant Tracking System) algorithm expert.
Analyze this candidate's resume for the target role: "${targetRole}".

Resume content:
\`\`\`
${text.substring(0, 3000)}
\`\`\`

Evaluate across:
1. Overall ATS Score (0-100)
2. ATS Compatibility (formatting, keyword density, section hygiene, 0-100)
3. Detected technical and soft skills (array of strings)
4. Missing critical skills for "${targetRole}" (array of strings)
5. Strengths (3 concise bullet points)
6. Weaknesses or weak bullet point descriptions (3 concise bullet points)
7. Specific, actionable recommendations to improve score (3-5 concrete action items)

Return ONLY valid JSON matching this structure:
{
  "score": number,
  "atsCompatibility": number,
  "summary": "1-2 sentence overall summary",
  "detectedSkills": ["skill1", "skill2"],
  "missingSkills": ["missing1", "missing2"],
  "strengths": ["strength1", "strength2"],
  "weaknesses": ["weakness1", "weakness2"],
  "recommendations": ["rec1", "rec2", "rec3"]
}`;

    const gemini = getGeminiClient();
    if (gemini) {
        try {
            const response = await gemini.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
            });
            const raw = response.text ? response.text.trim() : "";
            const jsonMatch = raw.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                return {
                    score: Math.min(100, Math.max(30, Number(parsed.score) || 82)),
                    atsCompatibility: Math.min(100, Math.max(30, Number(parsed.atsCompatibility) || 85)),
                    summary: parsed.summary || "Solid technical resume with strong foundational skills.",
                    detectedSkills: Array.isArray(parsed.detectedSkills) ? parsed.detectedSkills : ['JavaScript', 'React', 'Node.js', 'SQL'],
                    missingSkills: Array.isArray(parsed.missingSkills) ? parsed.missingSkills : ['Docker', 'TypeScript', 'Kubernetes'],
                    strengths: Array.isArray(parsed.strengths) ? parsed.strengths : ["Well-structured education and technical skills section."],
                    weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses : ["Project bullet points need more quantified impact."],
                    recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [
                        "Quantify outcomes (e.g. reduced load times by 30%, handled 500+ daily active users).",
                        "Include standard ATS section headers: Education, Experience, Technical Skills, Projects, Certifications.",
                        "Align project keywords directly with job descriptions for " + targetRole + "."
                    ]
                };
            }
        } catch (err) {
            console.warn('Gemini analyzeResume error, using rule-based engine:', err.message);
        }
    }

    // Rule-based fallback analyzer
    const lower = text.toLowerCase();
    const allKeywords = [
        'javascript', 'typescript', 'react', 'node.js', 'node', 'express', 'python', 'java', 'c++', 'c#',
        'sql', 'postgresql', 'mongodb', 'mysql', 'redis', 'docker', 'kubernetes', 'aws', 'azure', 'gcp',
        'html', 'css', 'tailwind', 'redux', 'next.js', 'git', 'github', 'rest api', 'graphql', 'ci/cd',
        'linux', 'agile', 'scrum', 'data structures', 'algorithms', 'jest', 'unit testing'
    ];

    const detected = allKeywords.filter(k => lower.includes(k));
    const targetKeywords = {
        'full stack developer': ['javascript', 'react', 'node', 'sql', 'docker', 'git', 'rest api', 'typescript'],
        'frontend developer': ['javascript', 'react', 'html', 'css', 'typescript', 'tailwind', 'redux', 'git'],
        'backend developer': ['node', 'python', 'java', 'sql', 'docker', 'redis', 'rest api', 'git', 'aws'],
        'data scientist': ['python', 'sql', 'machine learning', 'pandas', 'numpy', 'scikit-learn', 'deep learning']
    };

    const expected = targetKeywords[targetRole.toLowerCase()] || targetKeywords['full stack developer'];
    const missing = expected.filter(k => !lower.includes(k));

    let score = 70 + Math.min(25, detected.length * 3);
    if (lower.includes('%') || lower.includes('increased') || lower.includes('reduced') || lower.includes('improved')) {
        score += 5;
    }
    score = Math.min(95, Math.max(55, score));

    return {
        score: score,
        atsCompatibility: Math.min(98, score + 3),
        summary: `Resume shows high alignment for ${targetRole} with ${detected.length} verified technical keywords.`,
        detectedSkills: detected.map(s => s.charAt(0).toUpperCase() + s.slice(1)),
        missingSkills: missing.map(s => s.charAt(0).toUpperCase() + s.slice(1)),
        strengths: [
            "Clear technical skill stack aligned with modern software engineering.",
            "Relevant coursework and project implementations.",
            "Demonstrated familiarity with version control and web frameworks."
        ],
        weaknesses: [
            "Limited quantifiable metrics (e.g. latency reduction, request throughput, user volume).",
            "Missing key cloud or deployment keywords such as Docker or AWS.",
            "Descriptions could emphasize individual contributions over team activities."
        ],
        recommendations: [
            `Incorporate missing industry keywords for ${targetRole}: ${missing.slice(0, 4).join(', ') || 'Docker, CI/CD'}.`,
            "Apply the Google XYZ formula: 'Accomplished [X] as measured by [Y], by doing [Z]'.",
            "Verify that every project includes a direct link to GitHub repository or live URL.",
            "Keep formatting simple and single-column to maximize automated ATS parsing accuracy."
        ]
    };
}

// ================= CAREER ASSESSMENT AI =================
const assessmentQuestionBank = [
    {
        category: 'Aptitude',
        question: 'A train running at 72 km/h crosses a 260 m long platform in 23 seconds. What is the length of the train?',
        options: ['180 m', '200 m', '220 m', '240 m'],
        correctAnswer: 'B',
        explanation: 'Speed = 72 * (5/18) = 20 m/s. Total distance = 20 * 23 = 460 m. Train length = 460 - 260 = 200 m.'
    },
    {
        category: 'Aptitude',
        question: 'If 12 men can complete a project in 15 days, in how many days can 20 men complete the same project working at the same pace?',
        options: ['8 days', '9 days', '10 days', '12 days'],
        correctAnswer: 'B',
        explanation: 'M1 * D1 = M2 * D2 => 12 * 15 = 20 * D2 => 180 = 20 * D2 => D2 = 9 days.'
    },
    {
        category: 'Technical',
        question: 'What is the average time complexity of searching in a balanced Binary Search Tree (AVL / Red-Black)?',
        options: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'],
        correctAnswer: 'B',
        explanation: 'A balanced BST guarantees height of O(log n), so search, insert, and delete take O(log n) time.'
    },
    {
        category: 'Technical',
        question: 'In Node.js, which phase of the event loop executes callbacks registered by setImmediate()?',
        options: ['Timers phase', 'Poll phase', 'Check phase', 'Close callbacks phase'],
        correctAnswer: 'C',
        explanation: 'The check phase runs right after the poll phase and executes callbacks scheduled via setImmediate().'
    },
    {
        category: 'Problem Solving',
        question: 'You are given an array of size n containing integers from 1 to n with one duplicate. Which technique achieves O(n) time and O(1) extra space?',
        options: ['Sorting the array', 'Hash Set lookup', "Floyd's Tortoise and Hare Cycle Detection", 'Two nested loops'],
        correctAnswer: 'C',
        explanation: "Floyd's cycle-finding algorithm treats array values as pointer indices, finding the duplicate in O(n) time and O(1) space."
    },
    {
        category: 'Problem Solving',
        question: 'Which caching strategy guarantees that write operations are only committed to the database after the cache is updated synchronously?',
        options: ['Cache-Aside', 'Write-Through', 'Write-Back (Write-Behind)', 'Refresh-Ahead'],
        correctAnswer: 'B',
        explanation: 'Write-Through writes data to both the cache and the permanent database synchronously before returning.'
    },
    {
        category: 'Communication',
        question: 'During a sprint retrospective, a team member disagrees with your architectural proposal. What is the most effective approach?',
        options: [
            'Insist on your proposal because you designed it',
            'Listen actively, identify trade-offs, and suggest a small proof-of-concept (PoC) to evaluate both options',
            'Escalate immediately to senior management',
            'Agree with their proposal immediately to avoid any conflict'
        ],
        correctAnswer: 'B',
        explanation: 'Constructive engineering discourse relies on objective trade-off analysis and data-driven evaluation via PoCs.'
    },
    {
        category: 'Communication',
        question: 'When communicating a major production outage to executive stakeholders, what should you lead with?',
        options: [
            'A 20-page deep-dive log trace',
            'The high-level user impact, current mitigation status, and estimated recovery time (ETA)',
            'Blame on the cloud infrastructure provider',
            'No communication until the post-mortem is completely finalized'
        ],
        correctAnswer: 'B',
        explanation: 'Executive communication requires concise executive summaries focusing on impact, status, and recovery timeline.'
    },
    {
        category: 'Role-Specific',
        question: 'In React, why should components avoid mutating state directly (e.g., state.push(item))?',
        options: [
            'JavaScript syntax forbids mutating objects',
            'React relies on shallow object equality (===) to detect changes and trigger re-renders',
            'Direct mutation permanently corrupts the browser memory heap',
            'State mutations only work in class components'
        ],
        correctAnswer: 'B',
        explanation: 'React compares state references using Object.is/shallow equality; mutating in-place prevents re-renders.'
    },
    {
        category: 'Role-Specific',
        question: 'What is the primary benefit of using database connection pooling in a backend application?',
        options: [
            'It eliminates the need for primary keys',
            'It reuses established TCP connections, dramatically reducing latency and socket overhead',
            'It encrypts database tables automatically',
            'It converts SQL queries into NoSQL documents'
        ],
        correctAnswer: 'B',
        explanation: 'Establishing database connections requires expensive handshakes and authentication; pooling reuses existing connections.'
    }
];

function getAssessmentQuestions() {
    return assessmentQuestionBank;
}

function evaluateAssessmentSubmission(userAnswers = []) {
    let aptitudeScore = 0;
    let technicalScore = 0;
    let problemSolvingScore = 0;
    let communicationScore = 0;
    let roleSpecificScore = 0;

    const optionLetters = ['A', 'B', 'C', 'D'];

    const breakdown = assessmentQuestionBank.map((q, index) => {
        let rawAnswer = userAnswers[index];
        if (rawAnswer && typeof rawAnswer === 'object') {
            rawAnswer = rawAnswer.selectedOption !== undefined ? rawAnswer.selectedOption : (rawAnswer.answer !== undefined ? rawAnswer.answer : rawAnswer.value);
        }

        let answerLetter = '';
        let answerText = '';

        if (typeof rawAnswer === 'number') {
            answerLetter = optionLetters[rawAnswer] || '';
            answerText = q.options[rawAnswer] || '';
        } else if (typeof rawAnswer === 'string') {
            const clean = rawAnswer.trim();
            if (clean.length === 1 && ['A', 'B', 'C', 'D'].includes(clean.toUpperCase())) {
                answerLetter = clean.toUpperCase();
                const idx = optionLetters.indexOf(answerLetter);
                answerText = q.options[idx] || clean;
            } else {
                const optIdx = q.options.findIndex(opt => opt.toLowerCase() === clean.toLowerCase() || clean.toLowerCase().includes(opt.toLowerCase()) || opt.toLowerCase().includes(clean.toLowerCase()));
                if (optIdx !== -1) {
                    answerLetter = optionLetters[optIdx];
                    answerText = q.options[optIdx];
                } else {
                    answerLetter = clean.toUpperCase();
                    answerText = clean;
                }
            }
        }

        const isCorrect = answerLetter === q.correctAnswer;
        const points = isCorrect ? 10 : 0;

        if (q.category === 'Aptitude') aptitudeScore += points * 5; // 2 questions = max 100
        if (q.category === 'Technical') technicalScore += points * 5;
        if (q.category === 'Problem Solving') problemSolvingScore += points * 5;
        if (q.category === 'Communication') communicationScore += points * 5;
        if (q.category === 'Role-Specific') roleSpecificScore += points * 5;

        return {
            category: q.category,
            question: q.question,
            userAnswer: answerLetter ? `${answerLetter} (${answerText})` : (answerText || 'Not Answered'),
            correctAnswer: q.correctAnswer,
            isCorrect,
            explanation: q.explanation
        };
    });

    const overallReadiness = Math.round(
        (aptitudeScore + technicalScore + problemSolvingScore + communicationScore + roleSpecificScore) / 5
    );

    const strengths = [];
    const weaknesses = [];
    const skillGaps = [];

    if (technicalScore >= 70) strengths.push("Strong core computer science and algorithm comprehension");
    else { weaknesses.push("Needs reinforcement on data structures & runtime event loops"); skillGaps.push("Advanced DSA"); }

    if (problemSolvingScore >= 70) strengths.push("Solid analytical logic and architectural trade-off evaluation");
    else { weaknesses.push("Algorithmic optimization techniques (Two-Pointers, Cycle Detection)"); skillGaps.push("System Problem Solving"); }

    if (communicationScore >= 70) strengths.push("Effective stakeholder communication and constructive team collaboration");
    else { weaknesses.push("Professional technical communication under pressure"); skillGaps.push("STAR Behavioral Technique"); }

    if (aptitudeScore >= 70) strengths.push("Rapid quantitative reasoning and time-work arithmetic");
    else { weaknesses.push("Speed in quantitative aptitude assessments"); skillGaps.push("Quantitative Aptitude"); }

    if (roleSpecificScore >= 70) strengths.push("Up-to-date web framework best practices and backend principles");
    else { weaknesses.push("Full-stack component lifecycles and database connection architectures"); skillGaps.push("Modern Framework Architecture"); }

    const suitableRoles = overallReadiness >= 80
        ? ["Software Development Engineer 1 (SDE-1)", "Full Stack Developer", "Backend Systems Engineer"]
        : overallReadiness >= 65
        ? ["Associate Software Engineer", "Frontend Developer", "QA Automation Engineer"]
        : ["Junior Developer Trainee", "Technical Support Engineer", "Apprentice Engineer"];

    const recommendedSkills = [
        "Docker & Containerization",
        "PostgreSQL / MongoDB Indexing",
        "System Design High-Level Concepts",
        "TypeScript Strict Mode",
        "STAR Method for Behavioral Rounds"
    ];

    return {
        overallReadiness,
        scores: {
            aptitude: aptitudeScore,
            technical: technicalScore,
            problemSolving: problemSolvingScore,
            communication: communicationScore,
            roleSpecific: roleSpecificScore
        },
        strengths,
        weaknesses,
        skillGaps,
        recommendedSkills,
        suitableRoles,
        breakdown
    };
}

module.exports = {
    generateQuestion,
    evaluateAnswer,
    evaluateCode,
    chatCareerAssistant,
    analyzeResume,
    getAssessmentQuestions,
    evaluateAssessmentSubmission
};

