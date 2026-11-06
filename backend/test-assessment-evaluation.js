const assert = require('node:assert/strict');
const {
    getAssessmentQuestions,
    evaluateAssessmentSubmission,
    getCuratedAssessmentQuestions,
    getCuratedAssessmentOptions,
    evaluateAssessmentQuestionSet
} = require('./utils/aiService');

const questions = getAssessmentQuestions();
assert.ok(questions.length > 0, 'The curated assessment question bank must not be empty.');

const correctAnswers = questions.map((question, index) => {
    const answerIndex = ['A', 'B', 'C', 'D'].indexOf(question.correctAnswer);
    assert.ok(answerIndex >= 0, `Question ${index + 1} has an invalid answer key.`);
    assert.equal(new Set(question.options).size, question.options.length,
        `Question ${index + 1} has duplicate options.`);
    return { questionId: index + 1, answer: question.options[answerIndex] };
});

const perfect = evaluateAssessmentSubmission(correctAnswers);
assert.equal(perfect.overallReadiness, 100);
assert.ok(perfect.breakdown.every((answer, index) =>
    answer.isCorrect && answer.questionId === index + 1));
assert.deepEqual(perfect.suitableRoles, []);
assert.deepEqual(perfect.recommendedSkills, []);

const incorrectAnswers = questions.map((question, index) => {
    const wrongOption = question.options.find(option =>
        ['A', 'B', 'C', 'D'][question.options.indexOf(option)] !== question.correctAnswer);
    return { questionId: index + 1, answer: wrongOption };
});
const zero = evaluateAssessmentSubmission(incorrectAnswers);
assert.equal(zero.overallReadiness, 0);
assert.ok(zero.breakdown.every(answer => !answer.isCorrect));
assert.ok(zero.skillGaps.length > 0);

const curatedSessionQuestions = getCuratedAssessmentQuestions({
    category: 'Mixed',
    difficulty: 'medium',
    count: 5
});
assert.equal(curatedSessionQuestions.length, 5);
assert.ok(curatedSessionQuestions.every(question =>
    question.source === 'curated' &&
    question.difficulty === 'medium' &&
    question.options.length === 4 &&
    Number.isInteger(question.answerIndex)));
assert.equal(new Set(curatedSessionQuestions.map(question => question.question)).size, 5);
const curatedOptions = getCuratedAssessmentOptions();
assert.ok(curatedOptions.curatedCombinations.some(item =>
    item.category === 'Mixed' && item.difficulty === 'medium' && item.counts.includes(5)));
assert.ok(curatedOptions.curatedCombinations.some(item =>
    item.category === 'Quantitative aptitude' && item.difficulty === 'easy' && item.counts.includes(1)));
assert.ok(!curatedOptions.curatedCombinations.some(item => item.category === 'DBMS and SQL'));

const dynamicPerfect = evaluateAssessmentQuestionSet(
    curatedSessionQuestions,
    curatedSessionQuestions.map(question => question.answerIndex)
);
assert.equal(dynamicPerfect.overallReadiness, 100);
assert.ok(Object.values(dynamicPerfect.categoryScores).every(score => score === 100));
const dynamicMiss = evaluateAssessmentQuestionSet(
    curatedSessionQuestions,
    curatedSessionQuestions.map((question, index) => index === 0
        ? (question.answerIndex + 1) % 4
        : question.answerIndex)
);
assert.equal(dynamicMiss.breakdown.filter(answer => answer.isCorrect).length, 4);
assert.ok(dynamicMiss.categoryScores[curatedSessionQuestions[0].category] < 100);
assert.equal(dynamicMiss.breakdown[0].correctAnswer, String.fromCharCode(65 + curatedSessionQuestions[0].answerIndex));

console.log('Assessment evaluation tests passed: answer keys, deterministic scoring, question associations, and grounded feedback.');
