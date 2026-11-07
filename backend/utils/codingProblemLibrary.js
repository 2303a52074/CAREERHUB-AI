'use strict';

const catalogVersion = 'careerhub-dsa-100-v1';
const topicCatalogs = [
    require('./codingCatalogPartA'),
    require('./codingCatalogPartB'),
    require('./codingCatalogPartC'),
    require('./codingCatalogPartD')
];

function normalizeProblem(problem) {
    const category = String(problem.category || problem.topic || '').trim().toLowerCase();
    const difficulty = String(problem.difficulty || '').trim().toLowerCase();
    const testCases = (problem.testCases || []).map((test, index) => ({
        stdin: String(test.stdin ?? test.input ?? ''),
        expectedOutput: String(test.expectedOutput ?? test.stdout ?? test.output ?? ''),
        explanation: String(test.explanation || ''),
        isHidden: typeof test.isHidden === 'boolean' ? test.isHidden : index >= 2
    }));
    const examples = (problem.examples || testCases.filter(test => !test.isHidden).slice(0, 2))
        .map(example => ({
            input: String(example.input ?? example.stdin ?? ''),
            output: String(example.output ?? example.stdout ?? example.expectedOutput ?? ''),
            explanation: String(example.explanation || '')
        }));
    const topics = Array.isArray(problem.topics) && problem.topics.length
        ? problem.topics.map(topic => String(topic).trim().toLowerCase())
        : [category];
    const tags = Array.isArray(problem.tags) && problem.tags.length
        ? problem.tags.map(tag => String(tag).trim().toLowerCase())
        : [...topics, difficulty];
    const functionSignature = String(problem.functionSignature || '').trim();

    return {
        problemId: String(problem.problemId || problem.id || '').trim(),
        title: String(problem.title || '').trim(),
        description: String(problem.description || '').trim(),
        difficulty,
        category,
        topics,
        tags,
        inputFormat: String(problem.inputFormat || '').trim(),
        outputFormat: String(problem.outputFormat || '').trim(),
        constraints: String(problem.constraints || '').trim(),
        examples,
        testCases,
        hiddenTestCases: testCases.filter(test => test.isHidden).length,
        hints: Array.isArray(problem.hints) ? problem.hints.map(String) : [],
        editorial: String(problem.editorial || '').trim(),
        timeComplexity: String(problem.timeComplexity || '').trim(),
        spaceComplexity: String(problem.spaceComplexity || '').trim(),
        functionSignature,
        starterCode: problem.starterCode || {},
        referenceCode: problem.referenceCode || {},
        solutionTemplate: String(problem.solutionTemplate || functionSignature),
        catalogVersion,
        isActive: true,
        timeLimit: Number.isFinite(problem.timeLimit) ? problem.timeLimit : 2,
        memoryLimit: Number.isFinite(problem.memoryLimit) ? problem.memoryLimit : 256,
        points: difficulty === 'easy' ? 10 : difficulty === 'medium' ? 20 : 30
    };
}

for (const [index, catalog] of topicCatalogs.entries()) {
    if (!Array.isArray(catalog)) {
        throw new Error(`Coding catalog part ${index + 1} must export an array of problem definitions.`);
    }
}

const codingProblemLibrary = topicCatalogs.flat().map(normalizeProblem);
const identifiers = codingProblemLibrary.map(problem => problem.problemId);
if (new Set(identifiers).size !== identifiers.length) {
    throw new Error('Coding catalog parts contain duplicate problem identifiers.');
}

module.exports = codingProblemLibrary;
