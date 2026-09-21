// ================= GLOBAL STATE =================
let editor; // Monaco Editor Instance
let currentProblemId = null;
let currentProblemData = null;

// ================= INITIALIZATION =================
document.addEventListener('DOMContentLoaded', () => {
    // Check if we are on the editor page
    if (document.getElementById('monaco-editor')) {
        initEditor();
        const urlParams = new URLSearchParams(window.location.search);
        const problemId = urlParams.get('id');
        if (problemId) {
            loadProblem(problemId);
        }
    }
    
    // Load dashboard stats if on dashboard
    if (window.location.pathname.includes('dashboard')) {
        loadUserStats();
    }
});

// ================= EDITOR SETUP =================
function initEditor() {
    require.config({ paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.34.1/min/vs' }});
    require(['vs/editor/editor.main'], function() {
        editor = monaco.editor.create(document.getElementById('monaco-editor'), {
            value: "// Write your solution here\nfunction solution(input) {\n    \n}",
            language: 'javascript',
            theme: 'vs-dark',
            automaticLayout: true,
            fontSize: 16,
            minimap: { enabled: false }
        });
    });
}

// ================= AUTH FUNCTIONS =================
async function register() {
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    if (!name || !email || !password) return alert("Please fill all fields");

    try {
        const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });
        const data = await res.json();
        alert(data.message);
    } catch (error) {
        alert("Registration failed");
    }
}

async function login() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    if (!email || !password) return alert("Please fill all fields");

    try {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (data.token) {
            localStorage.setItem("token", data.token);
            window.location.href = "dashboard.html";
        } else {
            alert(data.message);
        }
    } catch (error) {
        alert("Login failed");
    }
}

// ================= PROBLEM LOGIC =================
async function loadProblem(id) {
    const token = localStorage.getItem("token");
    try {
        const res = await fetch(`/api/coding/problems/${id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const problem = await res.json();
        currentProblemId = id;
        currentProblemData = problem;

        // Update UI
        document.getElementById('prob-title').innerText = problem.title;
        document.getElementById('prob-desc').innerHTML = problem.description;
        document.getElementById('prob-difficulty').innerText = problem.difficulty;
        
        if (problem.baseCode) {
            editor.setValue(problem.baseCode);
        }
    } catch (error) {
        console.error("Failed to load problem", error);
    }
}

// ================= EXECUTION & AI =================
async function submitSolution() {
    const code = editor.getValue();
    const token = localStorage.getItem("token");
    const outputDiv = document.getElementById('console-output');

    outputDiv.innerHTML = `<div class="status-pending">> Running test cases...</div>`;

    try {
        const response = await fetch(`/api/coding/submit/${currentProblemId}`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ code })
        });

        const data = await response.json();
        
        if (data.status === 'accepted') {
            outputDiv.innerHTML = `<div style="color: #4ecdc4">✅ Accepted! Score: ${data.score}</div>`;
        } else {
            outputDiv.innerHTML = `<div style="color: #ff6b6b">❌ Wrong Answer</div>`;
            // Show details of the first failing test case
            const fail = data.results.find(r => !r.passed);
            if (fail) {
                outputDiv.innerHTML += `<div style="font-size: 12px; margin-top:5px;">
                    Expected: ${fail.expectedOutput} <br>
                    Actual: ${fail.actualOutput || fail.error}
                </div>`;
            }
        }
    } catch (error) {
        outputDiv.innerHTML = `<div style="color: #ff6b6b">Error: ${error.message}</div>`;
    }
}

async function getAIHint() {
    if (!currentProblemData) return;
    
    const code = editor.getValue();
    const token = localStorage.getItem("token");
    const aiBox = document.getElementById('ai-feedback-box');
    
    aiBox.innerText = "Analyzing your logic...";
    aiBox.style.display = "block";

    try {
        const response = await fetch('/api/coding/analyze', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ 
                code, 
                problemTitle: currentProblemData.title,
                problemDescription: currentProblemData.description 
            })
        });

        const data = await response.json();
        aiBox.innerText = data.analysis;
    } catch (error) {
        aiBox.innerText = "AI Mentor is currently offline.";
    }
}

// ================= DASHBOARD STATS =================
async function loadUserStats() {
    const token = localStorage.getItem("token");
    try {
        const res = await fetch('/api/coding/stats', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const stats = await res.json();
        
        document.getElementById('stat-solved').innerText = stats.totalSolved;
        document.getElementById('stat-xp').innerText = stats.totalPoints;
    } catch (error) {
        console.error("Failed to load stats");
    }
}