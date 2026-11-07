const TECHNICAL_SKILLS = [
    'javascript', 'typescript', 'react', 'next.js', 'vue', 'angular', 'node.js', 'express',
    'python', 'django', 'fastapi', 'flask', 'java', 'spring boot', 'c++', 'c#', '.net',
    'golang', 'rust', 'ruby', 'php', 'sql', 'mysql', 'postgresql', 'mongodb', 'redis',
    'graphql', 'rest api', 'docker', 'kubernetes', 'aws', 'azure', 'gcp', 'ci/cd',
    'git', 'system design', 'microservices', 'kafka', 'tailwind', 'html', 'css',
    'unit testing', 'jest', 'data structures', 'algorithms', 'linux', 'terraform',
    'machine learning', 'data analysis', 'pytorch', 'tensorflow', 'pandas', 'excel'
];

const SOFT_SKILLS = [
    'communication', 'teamwork', 'leadership', 'problem solving', 'critical thinking',
    'adaptability', 'time management', 'collaboration', 'ownership', 'mentorship'
];

const ROLE_SKILLS = {
    'frontend': ['javascript', 'html', 'css', 'react'],
    'backend': ['rest api', 'sql', 'unit testing', 'system design'],
    'full stack': ['javascript', 'react', 'node.js', 'sql'],
    'data analyst': ['sql', 'python', 'data analysis', 'excel'],
    'machine learning': ['python', 'machine learning', 'pandas', 'tensorflow']
};

const SECTION_PATTERNS = [
    ['summary', /\b(?:professional\s+)?summary\b|\bobjective\b/i],
    ['experience', /\b(?:work\s+)?experience\b|\bemployment\s+history\b|\bprofessional\s+experience\b/i],
    ['education', /\beducation\b|\bacademic\s+background\b/i],
    ['skills', /\b(?:technical\s+)?skills\b|\btechnologies\b|\btech\s+stack\b/i],
    ['projects', /\bprojects?\b|\bselected\s+work\b/i],
    ['certifications', /\bcertifications?\b|\blicenses?\b/i]
];

const ACTION_VERBS = /\b(?:built|created|designed|developed|implemented|improved|increased|reduced|led|launched|delivered|automated|optimized|managed|analyzed|deployed|maintained|owned|resolved|tested)\b/i;
const MEASUREMENT = /(?:\b\d+(?:\.\d+)?\s*(?:%|\bpercent\b|\busers?\b|\bcustomers?\b|\brequests?\b|\bms\b|\bseconds?\b|\bhours?\b|\bdays?\b|\bweeks?\b|\bmonths?\b|\byears?\b|\bprojects?\b|\bteams?\b|\bpeople\b|\brecords?\b|\btransactions?\b|\bdollars?\b|\bk\b|\bm\b)|\$\s?\d[\d,.]*|\b\d{2,}\b)/i;
const EMAIL = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const PHONE = /(?:\+?\d[\d().\s-]{7,}\d)/;

function list(value, limit = 30) {
    return Array.isArray(value)
        ? value.filter(item => typeof item === 'string' && item.trim()).slice(0, limit)
        : [];
}

function hasPhrase(text, phrase) {
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
    const trailingBoundary = phrase.toLowerCase() === 'c' ? '(?![a-z0-9+#])' : '(?![a-z0-9])';
    return new RegExp(`(^|[^a-z0-9])${escaped}${trailingBoundary}`, 'i').test(text);
}

function sentenceList(text, pattern, limit = 8) {
    return text.split(/\r?\n/)
        .flatMap(line => line.split(/(?<=[.!?])\s+(?=[A-Z0-9])/))
        .map(line => line.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '').trim())
        .filter(line => line.length >= 12 && pattern.test(line))
        .slice(0, limit);
}

function analyzeResumeLocally(resumeText, targetRole, jobDescription = '') {
    const text = String(resumeText || '').replace(/\r/g, '\n').replace(/[ \t]+/g, ' ').trim();
    const lowerText = text.toLowerCase();
    const presentSections = SECTION_PATTERNS
        .filter(([, pattern]) => pattern.test(text))
        .map(([name]) => name);
    const missingSections = SECTION_PATTERNS.map(([name]) => name)
        .filter(name => !presentSections.includes(name));
    const detectedSkills = TECHNICAL_SKILLS.filter(skill => hasPhrase(lowerText, skill));
    const roleKey = Object.keys(ROLE_SKILLS).find(key => String(targetRole || '').toLowerCase().includes(key));
    const expectedSkills = roleKey ? ROLE_SKILLS[roleKey] : [];
    const comparisonSkills = jobDescription
        ? TECHNICAL_SKILLS.filter(skill => hasPhrase(String(jobDescription).toLowerCase(), skill))
        : expectedSkills;
    const missingSkills = comparisonSkills.filter(skill => !detectedSkills.includes(skill));
    const measurableAchievements = text.split(/\r?\n/)
        .map(line => line.trim())
        .filter(line => MEASUREMENT.test(line) && ACTION_VERBS.test(line))
        .slice(0, 12);
    const readabilityIssues = [];
    if (!EMAIL.test(text)) readabilityIssues.push('No email address was detected in the extracted text.');
    if (!PHONE.test(text)) readabilityIssues.push('No phone number was detected in the extracted text.');
    if (missingSections.length) {
        readabilityIssues.push(`Section headings not detected: ${missingSections.join(', ')}.`);
    }
    if (text.length < 500) readabilityIssues.push('The extracted resume is short; confirm that all pages and sections were included.');
    if (text.length > 12000) readabilityIssues.push('The extracted resume is unusually long; consider focusing it on the target role.');
    if (!measurableAchievements.length) {
        readabilityIssues.push('No achievement bullet containing both an action verb and a measurable result was detected.');
    }

    const presentWeight = presentSections.length / SECTION_PATTERNS.length;
    const skillWeight = comparisonSkills.length
        ? (comparisonSkills.length - missingSkills.length) / comparisonSkills.length
        : Math.min(detectedSkills.length / 8, 1);
    const measurementWeight = measurableAchievements.length ? 1 : 0;
    const contactWeight = (Number(EMAIL.test(text)) + Number(PHONE.test(text))) / 2;
    const lengthWeight = text.length >= 500 && text.length <= 12000 ? 1 : 0.5;
    const score = Math.round(100 * (
        0.3 * presentWeight + 0.3 * skillWeight +
        0.2 * measurementWeight + 0.1 * contactWeight + 0.1 * lengthWeight
    ));

    const recommendations = [];
    if (missingSections.length) recommendations.push(`Add clearly labeled sections for: ${missingSections.join(', ')}.`);
    if (missingSkills.length) recommendations.push(`Address role-related skills only where supported by your experience: ${missingSkills.join(', ')}.`);
    if (!measurableAchievements.length) recommendations.push('Rewrite relevant experience bullets to include a verified action and measurable result; do not invent metrics.');
    if (!EMAIL.test(text) || !PHONE.test(text)) recommendations.push('Check that your preferred professional contact details are present.');
    if (!recommendations.length) recommendations.push('The extracted text covers the checked sections and role keywords; review each claim for accuracy and tailor the ordering to the vacancy.');

    const detectedProjects = sentenceList(text, /\b(?:project|built|created|developed|implemented)\b/i);
    const detectedExperience = sentenceList(text, /\b(?:engineer|developer|analyst|intern|company|team|experience|led|managed)\b/i);
    const detectedEducation = sentenceList(text, /\b(?:university|college|bachelor|master|b\.?s\.?|m\.?s\.?|degree|graduated|gpa)\b/i);
    const summary = `Local text analysis found ${presentSections.length} of ${SECTION_PATTERNS.length} common sections, ${detectedSkills.length} cataloged technical skills, and ${measurableAchievements.length} measurable achievement bullets. The score reflects only extracted text and the checks listed; it is not an ATS vendor score.`;

    return {
        score,
        atsCompatibility: score,
        summary,
        detectedSkills,
        missingSkills,
        strengths: [
            `${presentSections.length} of ${SECTION_PATTERNS.length} common resume sections were detected.`,
            `${detectedSkills.length} cataloged technical skills were found in the extracted text.`
        ],
        weaknesses: readabilityIssues.slice(0, 8),
        projects: detectedProjects,
        experience: detectedExperience,
        education: detectedEducation,
        atsReadabilityIssues: readabilityIssues,
        recommendations,
        prioritizedEdits: recommendations.slice(0, 5),
        presentSections,
        missingSections,
        measurableAchievements,
        analysisMethod: 'local',
        model: null,
        comparedWithJobDescription: Boolean(jobDescription)
    };
}

function analyzeJobDescriptionLocally({ jobDescription, jobTitle = '', company = '', profile = {} }) {
    const text = String(jobDescription || '').replace(/\r/g, '\n').trim();
    const lowerText = text.toLowerCase();
    const requirements = TECHNICAL_SKILLS.filter(skill => hasPhrase(lowerText, skill));
    const softRequirements = SOFT_SKILLS.filter(skill => hasPhrase(lowerText, skill));
    const profileSkills = list(profile.technicalSkills).map(value => value.toLowerCase().trim());
    const profileSoftSkills = list(profile.softSkills).map(value => value.toLowerCase().trim());
    const matches = (skills, required) => skills.some(skill => hasPhrase(skill, required) || hasPhrase(required, skill));
    const matchedSkills = requirements.filter(skill => matches(profileSkills, skill));
    const missingSkills = requirements.filter(skill => !matches(profileSkills, skill));
    const matchedSoftSkills = softRequirements.filter(skill => matches(profileSoftSkills, skill));
    const qualifications = sentenceList(text, /\b(?:degree|bachelor|master|education|qualification|certif|years? of experience|minimum|required|must have)\b/i);
    const experienceRequirements = sentenceList(text, /\b(?:\d+\+?\s+years?|experience|senior|entry.level|internship)\b/i);
    const responsibilities = sentenceList(text, /\b(?:responsibilit|you will|you'll|duties|build|design|develop|maintain|lead|own|collaborate|deliver)\b/i, 12);
    const overallMatch = requirements.length
        ? Math.round((matchedSkills.length / requirements.length) * 100)
        : null;
    const recommendations = missingSkills.length
        ? [`Compare your evidence for these listed technical requirements: ${missingSkills.join(', ')}. Do not claim skills you cannot demonstrate.`]
        : ['No missing cataloged technical requirements were identified from this text and profile. Verify each requirement manually; profile skills are self-reported.'];
    if (qualifications.length) recommendations.push(`Review the listed qualification criteria: ${qualifications.slice(0, 3).join(' ')}`);
    else recommendations.push('No explicit qualification sentence was recognized by local text rules; review the full description for education or certification requirements.');
    if (experienceRequirements.length) recommendations.push(`Check the stated experience expectations: ${experienceRequirements.slice(0, 3).join(' ')}`);
    else recommendations.push('No explicit experience-duration requirement was recognized by local text rules.');
    const interviewQuestions = requirements.slice(0, 5).map(skill =>
        `Describe a project or work example where you used ${skill}, including your specific contribution and the result.`
    );
    if (!interviewQuestions.length) {
        interviewQuestions.push('Which responsibilities in this description best match your experience, and what evidence can you provide?');
    }

    return {
        jobTitle: String(jobTitle || '').trim() || null,
        company: String(company || '').trim() || null,
        overallMatch,
        extractedRequirements: requirements,
        matchedSkills,
        missingSkills,
        matchedSoftSkills,
        qualifications,
        experienceRequirements,
        responsibilities,
        recommendations,
        interviewQuestions,
        aiSummary: null,
        aiAdviceStatus: {
            status: 'unavailable',
            reason: 'Advanced personalized analysis requires an explicitly approved paid/data-processing provider. Local analysis is available.'
        },
        recommendationMethod: 'local',
        analysisMethod: 'local',
        methodology: 'Requirements and qualifications are extracted using local phrase and sentence rules. Technical match is the proportion of recognized technical catalog terms that also appear in the authenticated user profile; it does not verify proficiency or predict hiring outcomes.',
        readinessVerdict: overallMatch === null
            ? 'A match score is unavailable because no cataloged technical requirements were detected.'
            : overallMatch >= 80
                ? 'Strong listed-skill overlap with recognized technical requirements; this is not a hiring prediction.'
                : overallMatch >= 60
                    ? 'Partial listed-skill overlap. Review the missing requirements.'
                    : 'Limited listed-skill overlap. Review the missing requirements and the complete job description.'
    };
}

function buildDailyPreparationTasks({ profile = {}, pendingMilestone = '', codingProblem = null, codingAttempts = 0 }) {
    const role = String(profile.targetRole || 'your target role').trim();
    const skills = list(profile.technicalSkills, 10);
    const focusSkill = skills[0] || 'one foundational skill for your target role';
    const goal = String(profile.careerGoals || '').trim().slice(0, 180);
    const milestone = String(pendingMilestone || '').trim().slice(0, 180);
    const codingDescription = codingProblem
        ? `Continue with “${String(codingProblem.title).slice(0, 120)}”, a problem from the saved practice catalog.`
        : 'Review your saved coding practice and choose an available problem for your target role.';

    const tasks = [
        {
            id: 'task-coding-1',
            category: 'coding',
            title: codingProblem ? `Practice: ${codingProblem.title}` : 'Practice a coding problem',
            description: `${codingDescription} You have ${codingAttempts} recorded coding attempt${codingAttempts === 1 ? '' : 's'} so far.`,
            xpReward: 35,
            actionUrl: codingProblem?._id
                ? `/problem?id=${encodeURIComponent(codingProblem._id)}`
                : '/problems',
            actionText: 'Practice Coding'
        },
        {
            id: 'task-interview-1',
            category: 'interview',
            title: `Prepare one interview answer for ${role}`,
            description: 'Choose a technical or behavioral question and practice a concise answer using a concrete example.',
            xpReward: 30,
            actionUrl: '/interviews',
            actionText: 'Practice Interview'
        },
        {
            id: 'task-skill-1',
            category: 'skill',
            title: `Review ${focusSkill}`,
            description: skills.length
                ? `This skill is listed in your profile. Review one concept and record a small example you can explain.`
                : 'No technical skills are listed in your profile yet. Add a skill you are actively learning, then review one concept.',
            xpReward: 20,
            actionUrl: '/skills',
            actionText: 'Review Skills'
        },
        {
            id: 'task-roadmap-1',
            category: 'roadmap',
            title: milestone ? `Continue roadmap: ${milestone}` : `Review your ${role} roadmap`,
            description: milestone
                ? 'Continue the next incomplete milestone from your saved roadmap.'
                : goal
                    ? `Use your saved goal (“${goal}”) to choose a concrete next learning step.`
                    : 'Review the next concrete learning step for your target role and update your roadmap if needed.',
            xpReward: 25,
            actionUrl: '/roadmap',
            actionText: 'View Roadmap'
        },
        {
            id: 'task-application-1',
            category: 'application',
            title: `Review opportunities for ${role}`,
            description: 'Compare one verified job listing with your current skills and save it only if you intend to follow up.',
            xpReward: 20,
            actionUrl: '/job-matching',
            actionText: 'Explore Jobs'
        }
    ];

    return { tasks: tasks.map(task => ({ ...task, completed: false })), source: 'local', model: null, fallbackUsed: false };
}

function buildCareerRoadmapLocally({ profile = {}, targetRole, assessmentScores = null, missingSkills = [] }) {
    const role = String(targetRole || profile.targetRole || 'Career growth').trim();
    const skills = list(profile.technicalSkills, 12);
    const normalizedSkills = new Set(skills.map(skill => skill.toLowerCase()));
    const focusSkills = list(missingSkills, 6)
        .filter(skill => !normalizedSkills.has(skill.toLowerCase()))
        .slice(0, 3);
    const assessmentScore = Number(assessmentScores?.overallReadiness);
    const baseline = Number.isFinite(assessmentScore)
        ? `Use your saved assessment readiness (${Math.max(0, Math.min(100, Math.round(assessmentScore)))}%) to prioritize review; this is a study aid, not a hiring prediction.`
        : 'No saved assessment score is available; use your current profile skills to choose a starting point.';
    const firstSkill = focusSkills[0] || skills[0] || 'one role-relevant technical skill';
    const secondSkill = focusSkills[1] || skills[1] || firstSkill;
    const projectGoal = String(profile.careerGoals || '').trim().slice(0, 160);
    const phases = [
        {
            title: 'Build your foundation',
            description: `${baseline} Establish consistent practice for ${role}.`,
            milestones: [
                {
                    title: `Review ${firstSkill}`,
                    completionCriteria: `Write a short note explaining one core concept in ${firstSkill} and complete a small practice exercise.`,
                    estimatedHours: 4
                },
                {
                    title: `Strengthen problem-solving fundamentals for ${role}`,
                    completionCriteria: 'Complete and review three practice tasks relevant to your target role.',
                    estimatedHours: 6
                }
            ]
        },
        {
            title: 'Apply skills in a project',
            description: `Turn your current skills into verifiable work aligned with ${role}.`,
            milestones: [
                {
                    title: `Plan a practical ${role} project`,
                    completionCriteria: projectGoal
                        ? `Write a scope and acceptance checklist that supports your saved goal: ${projectGoal}.`
                        : 'Write a project scope, identify its users, and list three measurable acceptance checks.',
                    estimatedHours: 3
                },
                {
                    title: `Build and test a small project using ${secondSkill}`,
                    completionCriteria: 'Publish working source code with setup instructions and tests for its main behavior.',
                    estimatedHours: 12
                },
                {
                    title: 'Document your contribution and results',
                    completionCriteria: 'Add a concise README describing your decisions, tests, and verified outcomes without invented metrics.',
                    estimatedHours: 3
                }
            ]
        },
        {
            title: 'Prepare for applications',
            description: `Practice presenting your evidence and prepare for opportunities related to ${role}.`,
            milestones: [
                {
                    title: `Practice explaining your ${role} project`,
                    completionCriteria: 'Give a two-minute explanation of the problem, your approach, trade-offs, and test evidence.',
                    estimatedHours: 2
                },
                {
                    title: 'Review role-aligned interview fundamentals',
                    completionCriteria: 'Practice five technical or behavioral questions and record topics that need more study.',
                    estimatedHours: 5
                },
                {
                    title: 'Review your profile and verified opportunities',
                    completionCriteria: 'Check that your profile evidence is current and compare it with at least one sourced listing.',
                    estimatedHours: 2
                }
            ]
        }
    ];

    return { phases, source: 'local', model: null, fallbackUsed: false };
}

module.exports = {
    TECHNICAL_SKILLS,
    analyzeResumeLocally,
    analyzeJobDescriptionLocally,
    buildDailyPreparationTasks,
    buildCareerRoadmapLocally,
    hasPhrase
};
