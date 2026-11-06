const questions = [
    {
        id: 'fe-1',
        role: 'frontend',
        topic: 'Frontend',
        difficulty: 'easy',
        question: 'Which HTML element is intended to represent the main content unique to a page?',
        options: ['<main>', '<section>', '<aside>', '<footer>'],
        answerIndex: 0,
        explanation: 'The main element represents the dominant content of the document and should generally appear once.'
    },
    {
        id: 'fe-2',
        role: 'frontend',
        topic: 'Frontend',
        difficulty: 'medium',
        question: 'What is the primary purpose of a React key when rendering a list?',
        options: ['To identify items across renders', 'To encrypt component state', 'To trigger a full page reload', 'To make every child render immediately'],
        answerIndex: 0,
        explanation: 'Stable keys let React match list items between renders and update the correct elements.'
    },
    {
        id: 'fe-3',
        role: 'frontend',
        topic: 'Frontend',
        difficulty: 'hard',
        question: 'Which approach best prevents stale asynchronous results from replacing newer search results?',
        options: ['Ignore every result after the first request', 'Associate requests with an incrementing ID and apply only the latest', 'Disable the search input permanently', 'Render every response in arrival order'],
        answerIndex: 1,
        explanation: 'A request sequence identifier lets the UI discard responses from older requests that finish late.'
    },
    {
        id: 'be-1',
        role: 'backend',
        topic: 'Backend',
        difficulty: 'easy',
        question: 'Which HTTP status code most commonly indicates that a resource was created successfully?',
        options: ['200', '201', '204', '302'],
        answerIndex: 1,
        explanation: '201 Created indicates that the request succeeded and created a resource.'
    },
    {
        id: 'be-2',
        role: 'backend',
        topic: 'Backend',
        difficulty: 'medium',
        question: 'Why should a database query use a parameterized value instead of string concatenation?',
        options: ['It guarantees every query is cached', 'It prevents input from changing the query structure', 'It disables database validation', 'It automatically encrypts all returned fields'],
        answerIndex: 1,
        explanation: 'Parameterization keeps values separate from SQL syntax and helps prevent injection.'
    },
    {
        id: 'be-3',
        role: 'backend',
        topic: 'Backend',
        difficulty: 'hard',
        question: 'For a long-running task triggered by an HTTP request, which design generally improves API responsiveness?',
        options: ['Hold the connection open indefinitely', 'Queue the task and return a trackable job identifier', 'Repeat the task synchronously three times', 'Disable request timeouts'],
        answerIndex: 1,
        explanation: 'A background queue decouples long work from request latency and can expose job status separately.'
    },
    {
        id: 'ds-1',
        role: 'general',
        topic: 'Data Structures',
        difficulty: 'easy',
        question: 'Which data structure provides average constant-time lookup by key?',
        options: ['Hash table', 'Unsorted linked list', 'Stack', 'Binary heap'],
        answerIndex: 0,
        explanation: 'A hash table provides average O(1) key lookup, subject to a suitable hash function and controlled collisions.'
    },
    {
        id: 'ds-2',
        role: 'general',
        topic: 'Data Structures',
        difficulty: 'medium',
        question: 'What is the time complexity of binary search on a sorted array?',
        options: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'],
        answerIndex: 1,
        explanation: 'Binary search halves the remaining search interval each step, giving logarithmic time.'
    },
    {
        id: 'ds-3',
        role: 'general',
        topic: 'Data Structures',
        difficulty: 'hard',
        question: 'Which structure is commonly used to implement a least-recently-used cache with O(1) get and update operations?',
        options: ['Queue and set', 'Hash map and doubly linked list', 'Binary search tree only', 'Stack and min-heap'],
        answerIndex: 1,
        explanation: 'The hash map finds entries in O(1), while the doubly linked list supports O(1) recency updates and eviction.'
    },
    {
        id: 'sd-1',
        role: 'backend',
        topic: 'System Design',
        difficulty: 'easy',
        question: 'What is the main purpose of a load balancer?',
        options: ['Distribute incoming traffic across service instances', 'Store relational data', 'Compile application code', 'Encrypt browser cookies'],
        answerIndex: 0,
        explanation: 'A load balancer distributes traffic and can improve availability and capacity.'
    },
    {
        id: 'sd-2',
        role: 'backend',
        topic: 'System Design',
        difficulty: 'medium',
        question: 'When is a read replica most useful?',
        options: ['When reads are a significant load and can tolerate replication lag', 'When every write must be synchronously duplicated without delay', 'When no database is needed', 'When all data must remain in a browser'],
        answerIndex: 0,
        explanation: 'Read replicas can scale read-heavy workloads, with the trade-off that replication may lag behind writes.'
    },
    {
        id: 'sd-3',
        role: 'backend',
        topic: 'System Design',
        difficulty: 'hard',
        question: 'Which property does an idempotency key primarily provide for retried payment requests?',
        options: ['Exactly-once network delivery', 'Protection against applying the same logical operation twice', 'Automatic refund handling', 'Lower network latency'],
        answerIndex: 1,
        explanation: 'Idempotency keys allow retries to return the original operation result instead of duplicating its side effect.'
    },
    {
        id: 'beh-1',
        role: 'general',
        topic: 'Behavioral',
        difficulty: 'easy',
        question: 'Which structure is most useful for a concise behavioral interview answer?',
        options: ['Situation, task, action, result', 'Claim, opinion, repetition, summary', 'Problem, unrelated details, conclusion, joke', 'Role, company history, salary, references'],
        answerIndex: 0,
        explanation: 'The STAR structure organizes context, responsibility, actions, and outcomes.'
    },
    {
        id: 'beh-2',
        role: 'general',
        topic: 'Behavioral',
        difficulty: 'medium',
        question: 'When discussing a mistake in an interview, which response is strongest?',
        options: ['Blame a teammate and avoid describing your role', 'Explain your actions, the impact, and what you changed afterward', 'Claim you have never made a mistake', 'Describe the issue without its resolution'],
        answerIndex: 1,
        explanation: 'A strong response is accountable, specific about impact, and explains learning or corrective action.'
    },
    {
        id: 'tech-1',
        role: 'general',
        topic: 'Technical',
        difficulty: 'easy',
        question: 'What should a unit test primarily verify?',
        options: ['A small unit of behavior under defined inputs', 'The appearance of every page in all browsers', 'The production database credentials', 'The speed of the entire network'],
        answerIndex: 0,
        explanation: 'Unit tests focus on a small piece of logic with controlled inputs and expected outputs.'
    },
    {
        id: 'tech-2',
        role: 'general',
        topic: 'Technical',
        difficulty: 'medium',
        question: 'Which approach best helps make a function easier to test?',
        options: ['Hide dependencies in global state', 'Pass external dependencies as explicit inputs', 'Combine unrelated operations in one function', 'Make the function depend on current wall-clock time'],
        answerIndex: 1,
        explanation: 'Explicit dependencies make behavior easier to isolate and replace in tests.'
    },
    {
        id: 'tech-3',
        role: 'general',
        topic: 'Technical',
        difficulty: 'hard',
        question: 'A test passes alone but fails in the full suite. What should you investigate first?',
        options: ['Order dependence and shared mutable state', 'Whether the test name is long enough', 'Changing the expected result until it passes', 'Removing assertions from the test'],
        answerIndex: 0,
        explanation: 'Tests that depend on execution order often share state or leave global resources modified.'
    }
];

const verbalQuestions = [
    { role: 'general', topic: 'Behavioral', difficulty: 'easy', question: 'Tell me about a time you had to learn something unfamiliar quickly. What was your approach and what was the outcome?' },
    { role: 'general', topic: 'Behavioral', difficulty: 'medium', question: 'Describe a disagreement with a teammate. How did you resolve it and what changed afterward?' },
    { role: 'general', topic: 'Behavioral', difficulty: 'hard', question: 'Tell me about a project that did not meet its goals. How did you diagnose the cause and communicate the result?' },
    { role: 'frontend', topic: 'Technical', difficulty: 'easy', question: 'How would you make a form accessible to keyboard and screen-reader users?' },
    { role: 'frontend', topic: 'Technical', difficulty: 'medium', question: 'How would you investigate and improve a slow page that renders a large interactive list?' },
    { role: 'frontend', topic: 'Technical', difficulty: 'hard', question: 'How would you design a resilient frontend data flow for a frequently updated dashboard with intermittent network connectivity?' },
    { role: 'backend', topic: 'Technical', difficulty: 'easy', question: 'Walk through the steps you would take to validate and authorize an incoming API request.' },
    { role: 'backend', topic: 'Technical', difficulty: 'medium', question: 'How would you prevent duplicate side effects when clients retry a timed-out API request?' },
    { role: 'backend', topic: 'Technical', difficulty: 'hard', question: 'How would you investigate elevated latency across a service that depends on a database and an external provider?' },
    { role: 'backend', topic: 'System Design', difficulty: 'easy', question: 'Explain how you would divide a small web application between its client, API, and database.' },
    { role: 'backend', topic: 'System Design', difficulty: 'medium', question: 'Design a notification service that can retry delivery without sending duplicate notifications.' },
    { role: 'backend', topic: 'System Design', difficulty: 'hard', question: 'Design a rate-limited public API and explain how you would keep limits consistent across multiple application instances.' }
];

function roleGroup(role) {
    const normalizedRole = String(role || '').toLowerCase();
    return /front.?end|ui|web/i.test(normalizedRole)
        ? 'frontend'
        : /back.?end|server|api|database/i.test(normalizedRole)
            ? 'backend'
            : 'general';
}

function getCuratedQuestions({ role, topic, difficulty, count }) {
    const normalizedTopic = String(topic || 'Mixed').toLowerCase();
    const candidates = questions.filter(item =>
        (normalizedTopic === 'mixed' || item.topic.toLowerCase() === normalizedTopic) &&
        item.difficulty === difficulty);
    const group = roleGroup(role);
    candidates.sort((a, b) => Number(b.role === group) - Number(a.role === group));
    const selected = candidates.slice(0, count);
    if (!selected.length) return [];
    return selected.map(item => {
        const { id, role: ignoredRole, ...question } = item;
        return { ...question, type: 'mcq', options: [...question.options], source: 'curated' };
    });
}

function getCuratedInterviewQuestions({ role, topic, difficulty, count }) {
    const normalizedTopic = String(topic || 'Mixed').toLowerCase();
    const group = roleGroup(role);
    const candidates = verbalQuestions.filter(item =>
        (normalizedTopic === 'mixed' || item.topic.toLowerCase() === normalizedTopic) &&
        item.difficulty === difficulty);
    candidates.sort((a, b) => Number(b.role === group) - Number(a.role === group));
    return candidates.slice(0, count).map(item => {
        return { ...item, type: 'text', skill: item.topic, source: 'curated', model: null };
    });
}

module.exports = { getCuratedQuestions, getCuratedInterviewQuestions };
