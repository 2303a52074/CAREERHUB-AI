const TOPIC_COUNTS = {
    arrays: 15,
    strings: 10,
    hashing: 10,
    'two-pointers': 8,
    'sliding-window': 7,
    'binary-search': 8,
    'linked-lists': 8,
    'stacks-queues': 8,
    'trees-bst': 10,
    graphs: 6,
    'dynamic-programming': 6,
    'sorting-recursion': 4
};

function validateLibrary(problems) {
    if (!Array.isArray(problems) || problems.length !== 100) {
        throw new Error('Refusing to seed: the coding catalog must contain exactly 100 problems.');
    }
    if (!problems.every(problem => problem.catalogVersion === 'careerhub-dsa-100-v1')) {
        throw new Error('Refusing to seed: every problem must belong to the validated catalog version.');
    }

    const ids = new Set();
    const titles = new Set();
    const descriptions = new Set();
    const topics = new Map();
    const difficulties = { easy: 0, medium: 0, hard: 0 };
    const incomplete = [];
    const genericContent = /identify the invariant needed|test empty, singleton, repeated-value|public example for|hidden boundary case for|suitable approach should preserve|target complexity depends on the selected|your code here|implement me|TODO|FIXME|NotImplemented|placeholder/i;
    const placeholderCode = /\b(?:TODO|FIXME|NotImplementedError|NotImplementedException|placeholder|your code here|implement me)\b|^\s*pass\s*$|^\s*return None\s*$/i;
    for (const problem of problems) {
        const titleKey = String(problem.title || '').trim().toLowerCase();
        const descriptionKey = String(problem.description || '').trim().toLowerCase();
        if (ids.has(problem.problemId) || titles.has(titleKey) || descriptions.has(descriptionKey)) {
            throw new Error('Refusing to seed: coding problem IDs, titles, and descriptions must be unique.');
        }
        ids.add(problem.problemId);
        titles.add(titleKey);
        descriptions.add(descriptionKey);
        topics.set(problem.category, (topics.get(problem.category) || 0) + 1);
        difficulties[problem.difficulty] = (difficulties[problem.difficulty] || 0) + 1;

        const starterCode = problem.starterCode || {};
        const referenceCode = problem.referenceCode || {};
        const hasLanguages = ['python', 'java', 'cpp', 'javascript'].every(language =>
            typeof starterCode[language] === 'string' &&
            starterCode[language].trim().length >= 40 &&
            !placeholderCode.test(starterCode[language])) &&
            typeof referenceCode.python === 'string' &&
            referenceCode.python.trim().length >= 50 &&
            starterCode.python !== referenceCode.python &&
            !placeholderCode.test(referenceCode.python);
        const publicCases = (problem.testCases || []).filter(test => !test.isHidden).length;
        const hiddenCases = (problem.testCases || []).filter(test => test.isHidden).length;
        const examplesMatchTests = (problem.examples || []).length >= 2 &&
            problem.examples.every(example => problem.testCases.some(test =>
                !test.isHidden && test.stdin === (example.input ?? example.stdin) &&
                test.expectedOutput === (example.output ?? example.stdout)));
        const distinctTestInputs = (problem.testCases || []).length ===
            new Set(problem.testCases.map(test => test.stdin)).size;
        const hints = Array.isArray(problem.hints) ? problem.hints : [];
        const completeContent = String(problem.description || '').trim().length >= 60 &&
            String(problem.inputFormat || '').trim().length >= 20 &&
            String(problem.outputFormat || '').trim().length >= 20 &&
            String(problem.constraints || '').trim().length >= 20 &&
            String(problem.editorial || '').trim().length >= 100 &&
            hints.length >= 3 && hints.every(hint => String(hint).trim().length >= 25) &&
            !genericContent.test(problem.description || '') &&
            !genericContent.test(problem.editorial || '') &&
            !hints.some(hint => genericContent.test(hint)) &&
            hints.length === new Set(hints.map(hint => String(hint).trim().toLowerCase())).size &&
            (problem.testCases || []).every(test =>
                typeof test.stdin === 'string' &&
                typeof test.expectedOutput === 'string' &&
                String(test.explanation || '').trim().length >= 20 &&
                !genericContent.test(test.explanation));
        if (!hasLanguages || !completeContent || !examplesMatchTests || !distinctTestInputs ||
            publicCases < 2 || hiddenCases < 2) {
            incomplete.push(problem.problemId || 'unknown');
        }
    }

    const distributionValid = Object.entries(TOPIC_COUNTS)
        .every(([topic, count]) => topics.get(topic) === count) &&
        topics.size === Object.keys(TOPIC_COUNTS).length &&
        difficulties.easy === 40 && difficulties.medium === 40 && difficulties.hard === 20;
    if (!distributionValid) {
        throw new Error('Refusing to seed: coding catalog topic or difficulty distribution is invalid.');
    }
    if (incomplete.length) {
        throw new Error(`Refusing to seed unverified placeholder content in ${incomplete.length} problems (${incomplete.slice(0, 5).join(', ')}${incomplete.length > 5 ? ', ...' : ''}). Complete and validate all four starters, problem-specific hints/editorials, and public/hidden examples first.`);
    }
}

async function seedCodingProblems(model, problems) {
    if (problems.some(problem => problem.catalogVersion === 'careerhub-dsa-100-v1')) {
        validateLibrary(problems);
    }
    await model.init();

    for (const problem of problems) {
        const seedData = { ...problem };
        delete seedData._id;
        delete seedData.referenceCode;
        delete seedData.referenceSolver;
        delete seedData.solutionCode;
        const seedId = problem.problemId ||
            String(problem.title || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const seedKey = `careerhub:dsa:v1:${seedId}`;
        const [seededByKey, seededByProblemId] = await Promise.all([
            model.findOne({ seedKey }).select('_id'),
            problem.problemId ? model.findOne({ problemId: problem.problemId }).select('_id') : null
        ]);
        if (seededByKey && seededByProblemId &&
            String(seededByKey._id) !== String(seededByProblemId._id)) {
            throw new Error(`Conflicting coding catalog records exist for ${problem.problemId}.`);
        }
        const seeded = seededByKey || seededByProblemId;
        if (seeded) {
            await model.updateOne(
                { _id: seeded._id },
                {
                    $set: { ...seedData, seedKey },
                    $unset: { referenceCode: 1, solutionCode: 1 }
                }
            );
            continue;
        }

        try {
            await model.updateOne(
                { seedKey },
                { $setOnInsert: { ...seedData, seedKey } },
                { upsert: true }
            );
        } catch (error) {
            if (error.code !== 11000 || !(await model.findOne({ seedKey }).select('_id'))) {
                throw error;
            }
        }
    }
}

module.exports = seedCodingProblems;
module.exports.validateLibrary = validateLibrary;
