const bcrypt = require('bcryptjs');

// In-Memory Data Stores
const users = [];
const interviews = [];
const codingProblems = [];
const codeSubmissions = [];
const challenges = [];
const jobOpportunities = [];
const jobApplications = [];
const careerAssessments = [];
const careerRoadmaps = [];

// Initialize seed data
(async () => {
    try {
        const hashedPassword = await bcrypt.hash('password123', 10);
        users.push({
            _id: 'user-demo-1',
            id: 'user-demo-1',
            name: 'Demo Candidate',
            email: 'demo@example.com',
            password: hashedPassword,
            role: 'admin',
            xp: 380,
            level: 3,
            streak: 5,
            publicProfile: true,
            theme: 'dark',
            degree: 'B.Tech',
            branch: 'Computer Science & Engineering',
            college: 'SR University',
            graduationYear: '2026',
            cgpa: '8.8',
            technicalSkills: ['JavaScript', 'React', 'Node.js', 'Express', 'Python', 'HTML/CSS', 'SQL', 'Git'],
            softSkills: ['Problem Solving', 'Team Collaboration', 'Communication', 'Adaptability'],
            certifications: ['Full Stack Web Development - Meta', 'AWS Cloud Practitioner', 'Algorithms Specialization'],
            projects: [
                {
                    title: 'CareerHub AI - Placement Portal',
                    techStack: 'React, Node.js, Express, Gemini AI',
                    description: 'Full stack AI-powered career assistant with automated mock interviews, resume scoring, and career roadmaps.',
                    link: 'https://github.com/demo/careerhub'
                },
                {
                    title: 'Distributed Task Queue System',
                    techStack: 'Node.js, Redis, Docker, Jest',
                    description: 'Asynchronous task processing engine with exponential backoff and worker pools.',
                    link: 'https://github.com/demo/task-queue'
                }
            ],
            experience: [
                {
                    company: 'InnovateX Labs',
                    role: 'Software Engineer Intern',
                    duration: 'May 2025 - Aug 2025 (4 mos)',
                    description: 'Built high-throughput REST endpoints and automated CI/CD pipelines.'
                }
            ],
            careerInterests: ['Full Stack Development', 'Distributed Systems', 'Cloud Architecture'],
            preferredRoles: ['Full Stack Developer', 'Software Development Engineer', 'Frontend Engineer'],
            preferredLocations: ['Bengaluru', 'Hyderabad', 'Remote'],
            careerGoals: 'To join an innovative technology team as a Software Engineer, contributing to high-scale cloud platforms while mastering modern distributed systems.',
            careerReadinessScore: 82,
            resumeScore: 86,
            targetRole: 'Full Stack Developer'
        });

        // Seed default job opportunities
        jobOpportunities.push(
            {
                _id: 'opp-1',
                id: '1',
                type: 'job',
                title: 'Associate Software Engineer',
                organization: 'Google',
                location: 'Bengaluru / Hybrid',
                salaryOrStipend: '₹22 - ₹32 LPA',
                requiredSkills: ['JavaScript', 'React', 'Data Structures', 'Algorithms', 'System Design'],
                eligibility: 'B.Tech / M.Tech in CS/IT, Min CGPA: 8.0, 2025-2026 batch',
                deadline: '2026-10-15',
                openings: 15,
                description: 'Build large-scale applications and cloud solutions that impact billions of users globally.',
                applicationLink: 'https://careers.google.com'
            },
            {
                _id: 'opp-2',
                id: '2',
                type: 'job',
                title: 'Software Engineer 1 (Full Stack)',
                organization: 'Microsoft',
                location: 'Hyderabad / Bengaluru',
                salaryOrStipend: '₹20 - ₹28 LPA',
                requiredSkills: ['TypeScript', 'React', 'Node.js', 'Azure', 'C# / Java'],
                eligibility: 'B.Tech / M.Tech / MCA, Min CGPA: 7.5',
                deadline: '2026-10-30',
                openings: 25,
                description: 'Develop features for cloud collaboration suites and enterprise developer tools.',
                applicationLink: 'https://careers.microsoft.com'
            },
            {
                _id: 'opp-3',
                id: '3',
                type: 'job',
                title: 'Full Stack Developer',
                organization: 'Razorpay',
                location: 'Bengaluru / Remote',
                salaryOrStipend: '₹18 - ₹25 LPA',
                requiredSkills: ['React', 'Node.js', 'SQL', 'Docker', 'REST APIs'],
                eligibility: 'B.Tech / B.E / MCA, Min CGPA: 7.0',
                deadline: '2026-10-20',
                openings: 8,
                description: 'Shape the next generation of financial infrastructure and payment gateway tech for millions of merchants.',
                applicationLink: 'https://razorpay.com/jobs'
            },
            {
                _id: 'opp-4',
                id: '4',
                type: 'internship',
                title: 'Software Development Engineering Intern',
                organization: 'Amazon',
                location: 'Bengaluru / Hyderabad',
                salaryOrStipend: '₹80,000 / month',
                requiredSkills: ['Python', 'Java', 'Data Structures', 'AWS', 'Problem Solving'],
                eligibility: 'Pre-final & final year students (2026/2027 batch), CGPA >= 7.5',
                deadline: '2026-11-05',
                openings: 40,
                description: '6-month summer internship with high pre-placement offer (PPO) conversion rates.',
                applicationLink: 'https://amazon.jobs'
            },
            {
                _id: 'opp-5',
                id: '5',
                type: 'internship',
                title: 'Frontend Engineering Intern',
                organization: 'Swiggy',
                location: 'Remote',
                salaryOrStipend: '₹50,000 / month',
                requiredSkills: ['JavaScript', 'React', 'HTML/CSS', 'Redux / Zustand', 'Web Performance'],
                eligibility: 'Students graduating in 2026/2027',
                deadline: '2026-10-25',
                openings: 10,
                description: 'Work on ultra-fast consumer storefront interfaces powering millions of food orders daily.',
                applicationLink: 'https://swiggy.com/careers'
            },
            {
                _id: 'opp-meta',
                id: 'meta-1',
                type: 'job',
                title: 'Software Engineer - Front End & Full Stack',
                organization: 'Meta',
                location: 'Remote / Menlo Park / London',
                salaryOrStipend: '$145,000 - $190,000 / yr',
                requiredSkills: ['React', 'JavaScript', 'GraphQL', 'System Design', 'TypeScript'],
                eligibility: 'BS/MS in Computer Science or related STEM degree',
                deadline: '2026-11-30',
                openings: 35,
                description: 'Build user-facing experiences for billions of people across Instagram, WhatsApp, and Meta Reality Labs.',
                applicationLink: 'https://www.metacareers.com/jobs'
            },
            {
                _id: 'opp-apple',
                id: 'apple-1',
                type: 'job',
                title: 'Software Development Engineer - Cloud & Web Services',
                organization: 'Apple',
                location: 'Cupertino, CA / Austin / Bengaluru',
                salaryOrStipend: '$150,000 - $210,000 / yr',
                requiredSkills: ['Python', 'Go', 'Swift', 'Distributed Systems', 'Kubernetes'],
                eligibility: 'B.Tech / M.Tech / MS in CS, 0-2 years experience',
                deadline: '2026-12-15',
                openings: 20,
                description: 'Craft high-performance distributed backend architectures powering iCloud and Apple Services ecosystem.',
                applicationLink: 'https://jobs.apple.com/en-us/search?search=Software%20Engineer'
            },
            {
                _id: 'opp-cred',
                id: 'cred-1',
                type: 'job',
                title: 'Backend Software Engineer - Fintech Platform',
                organization: 'CRED',
                location: 'Bengaluru / Hybrid',
                salaryOrStipend: '₹24 - ₹34 LPA',
                requiredSkills: ['Java', 'Golang', 'Kafka', 'Redis', 'High Scale Microservices'],
                eligibility: 'B.Tech / B.E, strong DSA and low-latency system design fundamentals',
                deadline: '2026-11-20',
                openings: 12,
                description: 'Scale financial transactions and rewards infrastructure with zero-downtime microservices.',
                applicationLink: 'https://cred.club/careers'
            },
            {
                _id: 'opp-flipkart',
                id: 'flipkart-1',
                type: 'job',
                title: 'Software Development Engineer 1 (SDE-1)',
                organization: 'Flipkart',
                location: 'Bengaluru, India',
                salaryOrStipend: '₹18 - ₹26 LPA',
                requiredSkills: ['Data Structures', 'Java', 'Spring Boot', 'MySQL', 'System Design'],
                eligibility: '2025 / 2026 Graduating Batches, CGPA >= 7.0',
                deadline: '2026-11-10',
                openings: 45,
                description: 'Build ultra-scalable e-commerce checkout and supply-chain logistics engines for India’s top commerce platform.',
                applicationLink: 'https://www.flipkartcareers.com/'
            },
            {
                _id: 'opp-6',
                id: '6',
                type: 'hackathon',
                title: 'Smart India Hackathon 2026',
                organization: 'Ministry of Education & AICTE',
                location: 'National / Hybrid',
                salaryOrStipend: '₹1,00,000 Prize per Problem Statement',
                requiredSkills: ['Full Stack', 'AI/ML', 'IoT', 'Cloud', 'Rapid Prototyping'],
                eligibility: 'Open to all engineering college students in teams of 6',
                deadline: '2026-10-18',
                openings: 500,
                description: 'World’s biggest open innovation hackathon solving real-world government and industry challenges.',
                applicationLink: 'https://sih.gov.in'
            },
            {
                _id: 'opp-7',
                id: '7',
                type: 'hackathon',
                title: 'Google Solution Challenge 2026',
                organization: 'Google Developer Student Clubs',
                location: 'Global Online',
                salaryOrStipend: '$12,000 Total Prizes & Mentorship',
                requiredSkills: ['Flutter', 'Firebase', 'Gemini AI', 'Google Cloud'],
                eligibility: 'University students globally',
                deadline: '2026-11-15',
                openings: 200,
                description: 'Solve for one or more of the United Nations 17 Sustainable Development Goals using Google tech.',
                applicationLink: 'https://developers.google.com/community/gdsc-solution-challenge'
            },
            {
                _id: 'opp-8',
                id: '8',
                type: 'course',
                title: 'Meta Full-Stack Developer Professional Certificate',
                organization: 'Meta & Coursera',
                location: 'Self-Paced Online',
                salaryOrStipend: 'Industry Recognized Credential',
                requiredSkills: ['HTML', 'CSS', 'JavaScript', 'React', 'Django / Python', 'Database Design'],
                eligibility: 'Beginner to Intermediate learners',
                deadline: 'Rolling Admission',
                openings: 1000,
                description: 'Comprehensive program preparing graduates for entry-level full-stack engineering roles.',
                applicationLink: 'https://coursera.org/meta-full-stack'
            },
            {
                _id: 'opp-9',
                id: '9',
                type: 'course',
                title: 'AWS Certified Solutions Architect - Associate',
                organization: 'Amazon Web Services',
                location: 'Online Examination',
                salaryOrStipend: 'Global Cloud Certification',
                requiredSkills: ['Cloud Architecture', 'AWS S3', 'EC2', 'IAM', 'VPC', 'Serverless Lambda'],
                eligibility: 'Engineers with foundational cloud knowledge',
                deadline: 'Flexible Exam Scheduling',
                openings: 1000,
                description: 'Validation of expertise in designing secure, resilient, and cost-effective cloud systems.',
                applicationLink: 'https://aws.amazon.com/certification'
            }
        );

        // Seed default job applications for user-demo-1
        jobApplications.push(
            {
                _id: 'app-1',
                userId: 'user-demo-1',
                company: 'Google',
                jobRole: 'Associate Software Engineer',
                type: 'job',
                location: 'Bengaluru / Hybrid',
                salaryOrStipend: '₹28 LPA',
                appliedDate: '2026-09-08',
                status: 'Interview',
                interviewDate: '2026-09-22T14:00:00Z',
                matchPercentage: 92,
                notes: 'Passed initial coding screen. Technical Round 1 on System Design and Trees/Graphs scheduled.',
                contactPerson: 'Campus Talent Acquisition'
            },
            {
                _id: 'app-2',
                userId: 'user-demo-1',
                company: 'Microsoft',
                jobRole: 'Software Engineer 1',
                type: 'job',
                location: 'Hyderabad',
                salaryOrStipend: '₹24 LPA',
                appliedDate: '2026-09-05',
                status: 'Assessment',
                interviewDate: '',
                matchPercentage: 88,
                notes: 'Codility online assessment completed with 100% test cases passing. Awaiting interview schedule.',
                contactPerson: 'University Recruiting'
            },
            {
                _id: 'app-3',
                userId: 'user-demo-1',
                company: 'Razorpay',
                jobRole: 'Full Stack Developer',
                type: 'job',
                location: 'Bengaluru',
                salaryOrStipend: '₹20 LPA',
                appliedDate: '2026-09-02',
                status: 'Shortlisted',
                interviewDate: '',
                matchPercentage: 94,
                notes: 'Profile and GitHub repository reviewed by hiring manager. Shortlisted for round 1.',
                contactPerson: 'Engineering Lead'
            },
            {
                _id: 'app-4',
                userId: 'user-demo-1',
                company: 'Swiggy',
                jobRole: 'Engineering Intern',
                type: 'internship',
                location: 'Remote',
                salaryOrStipend: '₹50,000 / mo',
                appliedDate: '2026-09-11',
                status: 'Applied',
                interviewDate: '',
                matchPercentage: 90,
                notes: 'Application submitted via CareerHub portal with customized resume.',
                contactPerson: 'HR Team'
            },
            {
                _id: 'app-5',
                userId: 'user-demo-1',
                company: 'Amazon',
                jobRole: 'SDE Intern',
                type: 'internship',
                location: 'Hyderabad',
                salaryOrStipend: '₹80,000 / mo',
                appliedDate: '2026-08-20',
                status: 'Selected',
                interviewDate: '2026-09-01T10:00:00Z',
                matchPercentage: 95,
                notes: 'Offer letter received! Offer accepted for Spring 2027 internship.',
                contactPerson: 'Recruiter Ananya'
            }
        );

        // Seed default career roadmap for user-demo-1
        careerRoadmaps.push({
            _id: 'roadmap-1',
            userId: 'user-demo-1',
            targetRole: 'Full Stack Developer',
            generatedDate: new Date(),
            progressPercentage: 55,
            phases: [
                {
                    phaseNumber: 1,
                    title: 'Phase 1 — Fundamentals & Core Architecture',
                    description: 'Deepen core software engineering fundamentals, data structures, and foundational web protocols.',
                    status: 'completed',
                    milestones: [
                        { id: 'm1-1', title: 'Master Advanced JavaScript (Closures, Event Loop, Promises, Prototypes)', completed: true },
                        { id: 'm1-2', title: 'Solidify React 19 component lifecycle, custom hooks, and state paradigms', completed: true },
                        { id: 'm1-3', title: 'Design clean RESTful and GraphQL API contracts with Express & TypeScript', completed: true },
                        { id: 'm1-4', title: 'Solve 25+ LeetCode problems across Arrays, Two Pointers, and Strings', completed: true }
                    ]
                },
                {
                    phaseNumber: 2,
                    title: 'Phase 2 — Full-Stack Projects & Production Craft',
                    description: 'Build real-world multi-tier applications with authentication, databases, and automated testing.',
                    status: 'in-progress',
                    milestones: [
                        { id: 'm2-1', title: 'Build and deploy an end-to-end full stack application with relational SQL/PostgreSQL', completed: true },
                        { id: 'm2-2', title: 'Implement secure JWT authentication with refresh rotation and RBAC roles', completed: true },
                        { id: 'm2-3', title: 'Containerize application microservices with Docker and Docker Compose', completed: false },
                        { id: 'm2-4', title: 'Add unit and integration tests with Jest/Supertest achieving >80% code coverage', completed: false }
                    ]
                },
                {
                    phaseNumber: 3,
                    title: 'Phase 3 — Resume Optimization & ATS Tuning',
                    description: 'Transform project bullet points using Google XYZ formula and pass modern ATS screening.',
                    status: 'in-progress',
                    milestones: [
                        { id: 'm3-1', title: 'Run resume through CareerHub AI Resume Analyzer and achieve >= 85 Score', completed: true },
                        { id: 'm3-2', title: 'Quantify metrics across internship and projects (e.g. "reduced latency by 35%")', completed: true },
                        { id: 'm3-3', title: 'Ensure GitHub repositories have clean READMEs, architecture diagrams, and live demos', completed: false }
                    ]
                },
                {
                    phaseNumber: 4,
                    title: 'Phase 4 — Targeted Interview Preparation',
                    description: 'Simulate high-pressure technical, system design, and behavioral interviews.',
                    status: 'pending',
                    milestones: [
                        { id: 'm4-1', title: 'Complete 5 AI Technical Mock Interviews with score >= 80%', completed: true },
                        { id: 'm4-2', title: 'Practice 3 HR Behavioral interviews using the STAR framework', completed: false },
                        { id: 'm4-3', title: 'Study High-Level System Design (Caching, Load Balancing, DB Sharding)', completed: false }
                    ]
                },
                {
                    phaseNumber: 5,
                    title: 'Phase 5 — Strategic Applications & Placement',
                    description: 'Track applications, leverage alumni referrals, and conquer final round interviews.',
                    status: 'pending',
                    milestones: [
                        { id: 'm4-1', title: 'Track at least 10 targeted job applications in CareerHub Application Tracker', completed: false },
                        { id: 'm5-2', title: 'Reach out to 5 alumni on LinkedIn for warm referrals and informational chats', completed: false },
                        { id: 'm5-3', title: 'Prepare counter-offers and evaluate total compensation packages', completed: false }
                    ]
                }
            ]
        });

        // Seed default coding problems
        codingProblems.push(
            {
                _id: 'problem-1',
                id: '1',
                title: "Two Sum",
                description: "Given an array of integers nums and an integer target, return indices of the two numbers that add up to target. You may assume that each input would have exactly one solution, and you may not use the same element twice.",
                difficulty: "easy",
                category: "arrays",
                testCases: [
                    { input: '[2,7,11,15], 9', expectedOutput: '[0,1]', isHidden: false },
                    { input: '[3,2,4], 6', expectedOutput: '[1,2]', isHidden: false },
                    { input: '[3,3], 6', expectedOutput: '[0,1]', isHidden: true }
                ],
                solutionTemplate: "function solution(nums, target) {\n    // Write your code here\n    // Example: return [0, 1]\n}",
                points: 10,
                companies: ["Google", "Amazon", "Facebook"],
                constraints: "2 <= nums.length <= 10^4, -10^9 <= nums[i] <= 10^9, -10^9 <= target <= 10^9"
            },
            {
                _id: 'problem-2',
                id: '2',
                title: "Reverse String",
                description: "Write a function that reverses a string. The input string is given as an array of characters. Do not allocate extra space for another array.",
                difficulty: "easy",
                category: "strings",
                testCases: [
                    { input: '["h","e","l","l","o"]', expectedOutput: '["o","l","l","e","h"]', isHidden: false },
                    { input: '["H","a","n","n","a","h"]', expectedOutput: '["h","a","n","n","a","H"]', isHidden: false }
                ],
                solutionTemplate: "function solution(s) {\n    // Reverse the array in-place\n}",
                points: 5,
                companies: ["Microsoft", "Apple"],
                constraints: "1 <= s.length <= 10^5"
            },
            {
                _id: 'problem-3',
                id: '3',
                title: "Valid Parentheses",
                description: "Given a string s containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid. A valid string must have matching brackets in the correct order.",
                difficulty: "medium",
                category: "strings",
                testCases: [
                    { input: '"()"', expectedOutput: 'true', isHidden: false },
                    { input: '"()[]{}"', expectedOutput: 'true', isHidden: false },
                    { input: '"(]"', expectedOutput: 'false', isHidden: true }
                ],
                solutionTemplate: "function solution(s) {\n    // Write your code here\n}",
                points: 20,
                companies: ["Google", "Amazon", "Microsoft", "Facebook"],
                constraints: "1 <= s.length <= 10^4"
            }
        );

        // Seed initial interview
        interviews.push({
            _id: 'interview-1',
            userId: 'user-demo-1',
            role: 'Frontend Developer',
            difficulty: 'medium',
            totalScore: 85,
            xpEarned: 85,
            answers: [
                { question: "Explain the virtual DOM in React.", answer: "The virtual DOM is an in-memory representation of real DOM elements.", score: 9, skill: "frontend" },
                { question: "What is closure in JavaScript?", answer: "A closure is a function with access to its outer function's scope.", score: 8, skill: "javascript" }
            ],
            date: new Date()
        });
    } catch (e) {
        console.warn("Seed init error:", e.message);
    }
})();

class QueryBuilder {
    constructor(dataPromise) {
        this.dataPromise = Promise.resolve(dataPromise);
    }

    sort(sortObj) {
        this.dataPromise = this.dataPromise.then(items => {
            if (!Array.isArray(items)) return items;
            const clone = [...items];
            if (typeof sortObj === 'object') {
                const [field, dir] = Object.entries(sortObj)[0] || ['_id', 1];
                clone.sort((a, b) => {
                    const valA = a[field] ?? '';
                    const valB = b[field] ?? '';
                    if (valA < valB) return dir === -1 ? 1 : -1;
                    if (valA > valB) return dir === -1 ? -1 : 1;
                    return 0;
                });
            }
            return clone;
        });
        return this;
    }

    limit(n) {
        this.dataPromise = this.dataPromise.then(items => {
            if (Array.isArray(items)) return items.slice(0, n);
            return items;
        });
        return this;
    }

    select(fieldsStr) {
        this.dataPromise = this.dataPromise.then(items => {
            if (!items) return items;
            const fields = typeof fieldsStr === 'string' ? fieldsStr.split(' ').filter(Boolean) : [];
            const excludeFields = fields.filter(f => f.startsWith('-')).map(f => f.slice(1));
            const includeFields = fields.filter(f => !f.startsWith('-'));

            const filterItem = (item) => {
                if (!item || typeof item !== 'object') return item;
                const copy = { ...item };
                if (excludeFields.length > 0) {
                    excludeFields.forEach(f => delete copy[f]);
                } else if (includeFields.length > 0) {
                    const filtered = {};
                    includeFields.forEach(f => { filtered[f] = copy[f]; });
                    if (copy._id) filtered._id = copy._id;
                    return filtered;
                }
                return copy;
            };

            if (Array.isArray(items)) return items.map(filterItem);
            return filterItem(items);
        });
        return this;
    }

    populate(field, selectFields) {
        this.dataPromise = this.dataPromise.then(items => {
            const populateItem = (item) => {
                if (!item) return item;
                const copy = { ...item };
                if (field === 'userId') {
                    const user = users.find(u => String(u._id) === String(copy.userId));
                    if (user) {
                        copy.userId = {
                            _id: user._id,
                            name: user.name,
                            email: user.email,
                            role: user.role
                        };
                    } else {
                        copy.userId = { _id: copy.userId, name: 'Candidate', email: 'user@example.com' };
                    }
                }
                return copy;
            };

            if (Array.isArray(items)) return items.map(populateItem);
            return populateItem(items);
        });
        return this;
    }

    lean() {
        return this;
    }

    then(resolve, reject) {
        return this.dataPromise.then(resolve, reject);
    }

    catch(reject) {
        return this.dataPromise.catch(reject);
    }
}

function matchFilter(item, filter) {
    if (!filter || Object.keys(filter).length === 0) return true;
    for (const [key, val] of Object.entries(filter)) {
        if (key === '_id' || key === 'id') {
            if (String(item._id) !== String(val) && String(item.id) !== String(val)) return false;
        } else if (item[key] !== val) {
            return false;
        }
    }
    return true;
}

function wrapModel(collection, modelName, originalMongooseModel, mongoose) {
    function ModelConstructor(data = {}) {
        if (mongoose.connection.readyState === 1 && originalMongooseModel) {
            return new originalMongooseModel(data);
        }
        const doc = {
            _id: 'mock-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6),
            ...data
        };
        doc.id = doc._id;
        doc.save = async function() {
            const idx = collection.findIndex(i => String(i._id) === String(doc._id));
            if (idx >= 0) {
                collection[idx] = { ...collection[idx], ...doc };
            } else {
                collection.push(doc);
            }
            return doc;
        };
        doc.toObject = function() {
            return { ...doc };
        };
        return doc;
    }

    ModelConstructor.findOne = function(filter) {
        if (mongoose.connection.readyState === 1 && originalMongooseModel) {
            return originalMongooseModel.findOne(filter);
        }
        const item = collection.find(i => matchFilter(i, filter));
        const res = item ? { ...item, save: async function() {
            const idx = collection.findIndex(i => String(i._id) === String(item._id));
            if (idx >= 0) collection[idx] = { ...collection[idx], ...this };
            return this;
        }} : null;
        return new QueryBuilder(res);
    };

    ModelConstructor.findById = function(id) {
        if (mongoose.connection.readyState === 1 && originalMongooseModel) {
            return originalMongooseModel.findById(id);
        }
        const item = collection.find(i => String(i._id) === String(id) || String(i.id) === String(id));
        const res = item ? { ...item, save: async function() {
            const idx = collection.findIndex(i => String(i._id) === String(item._id));
            if (idx >= 0) collection[idx] = { ...collection[idx], ...this };
            return this;
        }} : null;
        return new QueryBuilder(res);
    };

    ModelConstructor.findByIdAndUpdate = function(id, updates, options = {}) {
        if (mongoose.connection.readyState === 1 && originalMongooseModel) {
            return originalMongooseModel.findByIdAndUpdate(id, updates, options);
        }
        const idx = collection.findIndex(i => String(i._id) === String(id) || String(i.id) === String(id));
        if (idx >= 0) {
            collection[idx] = { ...collection[idx], ...updates };
            return new QueryBuilder({ ...collection[idx] });
        }
        return new QueryBuilder(null);
    };

    ModelConstructor.find = function(filter = {}) {
        if (mongoose.connection.readyState === 1 && originalMongooseModel) {
            return originalMongooseModel.find(filter);
        }
        const items = collection.filter(i => matchFilter(i, filter)).map(i => ({ ...i }));
        return new QueryBuilder(items);
    };

    ModelConstructor.deleteMany = function(filter = {}) {
        if (mongoose.connection.readyState === 1 && originalMongooseModel) {
            return originalMongooseModel.deleteMany(filter);
        }
        collection.length = 0;
        return Promise.resolve({ deletedCount: collection.length });
    };

    ModelConstructor.insertMany = function(docs = []) {
        if (mongoose.connection.readyState === 1 && originalMongooseModel) {
            return originalMongooseModel.insertMany(docs);
        }
        docs.forEach(d => {
            const doc = {
                _id: d._id || 'mock-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6),
                ...d
            };
            collection.push(doc);
        });
        return Promise.resolve(docs);
    };

    return ModelConstructor;
}

module.exports = {
    users,
    interviews,
    codingProblems,
    codeSubmissions,
    challenges,
    jobOpportunities,
    jobApplications,
    careerAssessments,
    careerRoadmaps,
    wrapModel
};
