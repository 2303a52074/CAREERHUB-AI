const assert = require('node:assert/strict');
const catalog = require('./utils/codingProblemLibrary');
const { executeProblemTestCases, executeSource } = require('./utils/codeExecutionService');
const seedCodingProblems = require('./utils/seedCodingProblems');

const expectedTopics = {
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
const expectedDifficulties = { easy: 40, medium: 40, hard: 20 };
const languages = ['python', 'java', 'cpp', 'javascript'];
const placeholder = /\b(?:TODO|FIXME|NotImplementedError|NotImplementedException|placeholder|your code here|implement me)\b|^\s*pass\s*$|return None\s*$/i;
const genericPhrases = /identify the invariant needed|test empty, singleton, repeated-value|public example for|hidden boundary case for|suitable approach should preserve|target complexity depends on the selected/i;

function assertUnique(values, label, problemId) {
    assert.equal(new Set(values).size, values.length, `${problemId} must have unique ${label}.`);
}

function validateGateRejectsPlaceholder() {
    const first = catalog[0];
    const invalid = catalog.map((problem, index) => index === 0 ? {
        ...problem,
        starterCode: { ...problem.starterCode, python: 'pass' }
    } : problem);
    assert.throws(() => seedCodingProblems.validateLibrary(invalid),
        /unverified placeholder content/i,
        `${first.problemId} placeholder starter should fail the seeding quality gate.`);
}

function validateStructure() {
    assert.equal(catalog.length, 100);
    assertUnique(catalog.map(problem => problem.problemId), 'IDs', 'catalog');
    assertUnique(catalog.map(problem => problem.title.toLowerCase()), 'titles', 'catalog');
    assertUnique(catalog.map(problem => problem.description.toLowerCase().trim()), 'descriptions', 'catalog');
    assertUnique(catalog.map(problem => problem.functionSignature), 'function signatures', 'catalog');

    const topicCounts = Object.fromEntries(Object.keys(expectedTopics).map(topic => [topic, 0]));
    const difficultyCounts = { easy: 0, medium: 0, hard: 0 };
    const publicSourceSet = new Set();
    const hintSet = new Set();
    const editorialSet = new Set();
    const explanationSet = new Set();
    for (const problem of catalog) {
        assert.match(problem.problemId, /^ch-\d{3}$/);
        assert.ok(problem.description.trim().length >= 60, `${problem.problemId} has a short statement.`);
        assert.ok(problem.inputFormat.trim().length >= 20, `${problem.problemId} needs an exact input format.`);
        assert.ok(problem.outputFormat.trim().length >= 20, `${problem.problemId} needs an exact output format.`);
        assert.ok(problem.constraints.trim().length >= 20, `${problem.problemId} needs constraints.`);
        assert.equal((topicCounts[problem.category] ?? -1) >= 0, true, `${problem.problemId} has an unknown topic.`);
        topicCounts[problem.category]++;
        difficultyCounts[problem.difficulty]++;

        assert.ok(Array.isArray(problem.examples) && problem.examples.length >= 2,
            `${problem.problemId} needs at least two examples.`);
        assert.ok(Array.isArray(problem.testCases) && problem.testCases.length >= 4,
            `${problem.problemId} needs multiple public and hidden test cases.`);
        const publicCases = problem.testCases.filter(test => !test.isHidden);
        const hiddenCases = problem.testCases.filter(test => test.isHidden);
        assert.ok(publicCases.length >= 2 && hiddenCases.length >= 2,
            `${problem.problemId} needs at least two public and two hidden cases.`);
        assertUnique(problem.testCases.map(test => test.stdin), 'test inputs', problem.problemId);
        assert.ok(problem.testCases.every(test =>
            typeof test.stdin === 'string' &&
            typeof test.expectedOutput === 'string' &&
            typeof test.explanation === 'string' &&
            test.explanation.trim().length >= 20),
        `${problem.problemId} has a malformed test case or generic explanation.`);

        for (const [index, example] of problem.examples.entries()) {
            assert.equal(typeof example.input, 'string', `${problem.problemId} example ${index + 1} needs input.`);
            assert.equal(typeof example.output, 'string', `${problem.problemId} example ${index + 1} needs output.`);
            assert.ok(example.explanation?.trim().length >= 20,
                `${problem.problemId} example ${index + 1} needs a meaningful explanation.`);
            const matchingCase = problem.testCases.find(test => !test.isHidden &&
                test.stdin === example.input);
            assert.ok(matchingCase, `${problem.problemId} example is missing a public test case.`);
            assert.equal(matchingCase.expectedOutput, example.output,
                `${problem.problemId} example output differs from its test case.`);
        }

        assert.equal(problem.hints.length, 3, `${problem.problemId} needs exactly three hints.`);
        assertUnique(problem.hints.map(hint => hint.toLowerCase().trim()), 'hints', problem.problemId);
        assert.ok(problem.hints.every(hint => hint.trim().length >= 25),
            `${problem.problemId} contains a short/generic hint.`);
        assert.ok(problem.editorial.trim().length >= 100,
            `${problem.problemId} needs an algorithm-specific explanation.`);
        assert.ok(!genericPhrases.test(problem.description) &&
            !genericPhrases.test(problem.editorial) &&
            !problem.hints.some(hint => genericPhrases.test(hint)),
        `${problem.problemId} contains catalog-generic content.`);
        assert.ok(!editorialSet.has(problem.editorial.trim().toLowerCase()),
            `${problem.problemId} reuses a generic editorial.`);
        editorialSet.add(problem.editorial.trim().toLowerCase());
        for (const hint of problem.hints) {
            const key = hint.trim().toLowerCase();
            assert.ok(!hintSet.has(key), `${problem.problemId} reuses a generic hint.`);
            hintSet.add(key);
        }
        for (const test of problem.testCases) {
            const key = test.explanation.trim().toLowerCase();
            assert.ok(!genericPhrases.test(test.explanation) && !explanationSet.has(key),
                `${problem.problemId} reuses a generic test explanation.`);
            explanationSet.add(key);
        }
        assert.ok(problem.timeComplexity.trim().length > 0 && problem.spaceComplexity.trim().length > 0);

        assert.ok(problem.starterCode && problem.referenceCode,
            `${problem.problemId} needs public starters and a private reference implementation.`);
        for (const language of languages) {
            const starter = problem.starterCode[language];
            assert.equal(typeof starter, 'string', `${problem.problemId} is missing ${language} starter.`);
            assert.ok(starter.trim().length >= 40, `${problem.problemId} ${language} starter is not problem-specific.`);
            assert.ok(!placeholder.test(starter), `${problem.problemId} ${language} starter contains a placeholder.`);
            assert.ok(!publicSourceSet.has(`${language}:${starter}`),
                `${problem.problemId} reuses a generic ${language} starter.`);
            publicSourceSet.add(`${language}:${starter}`);
        }
        assert.equal(typeof problem.referenceCode.python, 'string',
            `${problem.problemId} needs a private Python reference implementation.`);
        assert.ok(problem.referenceCode.python.trim().length >= 50,
            `${problem.problemId} Python reference is incomplete.`);
    }

    for (const [topic, expected] of Object.entries(expectedTopics)) {
        assert.equal(topicCounts[topic], expected, `${topic} count mismatch.`);
    }
    for (const [difficulty, expected] of Object.entries(expectedDifficulties)) {
        assert.equal(difficultyCounts[difficulty], expected, `${difficulty} count mismatch.`);
    }
    seedCodingProblems.validateLibrary(catalog);
    validateGateRejectsPlaceholder();
    console.log(`PASS: catalog structure (${catalog.length} unique problems, topic and difficulty distributions, examples, hints, and language starters).`);
}

async function validateExpectedOutputs() {
    let completed = 0;
    for (const problem of catalog) {
        const result = await executeProblemTestCases(
            problem.referenceCode.python,
            problem.testCases,
            { language: 'python', includeHidden: true }
        );
        assert.equal(result.allPassed, true,
            `${problem.problemId} Python reference failed ${result.status}.`);
        completed++;
        console.log(`PASS: ${problem.problemId} ${problem.title} reference outputs`);
    }
    console.log(`PASS: ${completed} per-problem Python executions verified all public and hidden expected outputs.`);

    const crossLanguageProblems = [
        catalog[0],
        catalog.find(problem => problem.problemId === 'ch-043')
    ];
    for (const problem of crossLanguageProblems) {
        assert.ok(problem, 'The cross-language verification problems must exist.');
        for (const language of languages) {
            const source = problem.referenceCode[language];
            assert.equal(typeof source, 'string', `${problem.problemId} is missing the ${language} reference.`);
            const result = await executeProblemTestCases(source, problem.testCases, {
                language,
                includeHidden: true
            });
            assert.equal(result.allPassed, true,
                `${problem.problemId} ${language} reference failed ${result.status}.`);
        }
    }
    console.log('PASS: all four language runners matched public and hidden cases for ch-001 and ch-043.');
}

async function validateStarterRuntimes() {
    const sample = catalog[0];
    for (const language of languages) {
        const result = await executeSource(sample.starterCode[language], {
            language,
            stdin: sample.testCases[0].stdin
        });
        assert.equal(result.status, 'runtime_error',
            `${sample.problemId} ${language} learner scaffold must compile, then clearly require an implementation.`);
    }
    console.log('PASS: Python, Java, C++, and JavaScript learner starters compile and stop without fabricated outputs.');
}

async function main() {
    validateStructure();
    const health = await require('./utils/codeExecutionService').checkDockerAvailability({ refresh: true });
    if (!health.available) {
        console.error(`BLOCKED: ${health.message}`);
        process.exitCode = 2;
        return;
    }
    await validateStarterRuntimes();
    await validateExpectedOutputs();
}

main().catch(error => {
    console.error(`FAIL: coding catalog validation — ${error.message}`);
    process.exitCode = 1;
});
