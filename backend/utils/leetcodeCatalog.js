const officialProblems = new Map([
    ['Two Sum', { number: 1, slug: 'two-sum' }],
    ['Reverse String', { number: 344, slug: 'reverse-string' }],
    ['Valid Parentheses', { number: 20, slug: 'valid-parentheses' }],
    ['Palindrome Number', { number: 9, slug: 'palindrome-number' }],
    ['Maximum Subarray', { number: 53, slug: 'maximum-subarray' }],
    ['Contains Duplicate', { number: 217, slug: 'contains-duplicate' }]
]);

function withOfficialLeetCodeLink(problem) {
    const record = typeof problem.toObject === 'function' ? problem.toObject() : { ...problem };
    const official = officialProblems.get(record.title);
    delete record.solutionCode;
    delete record.companies;
    record.testCases = (record.testCases || []).filter(testCase => !testCase.isHidden).slice(0, 2);
    record.officialSource = official ? 'LeetCode' : null;
    record.officialProblemNumber = official?.number ?? null;
    record.officialUrl = official
        ? `https://leetcode.com/problems/${official.slug}/`
        : null;
    return record;
}

function filterCodingProblems(problems, { search = '', difficulty = '', topic = '' } = {}) {
    const query = String(search).trim().toLocaleLowerCase();
    const requestedDifficulty = String(difficulty).trim().toLocaleLowerCase();
    const requestedTopic = String(topic).trim().toLocaleLowerCase();
    return problems.filter(problem =>
        (!requestedDifficulty || String(problem.difficulty || '').toLocaleLowerCase() === requestedDifficulty) &&
        (!requestedTopic || String(problem.category || '').toLocaleLowerCase() === requestedTopic) &&
        (!query || [problem.title, problem.category, problem.description]
            .some(value => String(value || '').toLocaleLowerCase().includes(query)))
    );
}

module.exports = { withOfficialLeetCodeLink, filterCodingProblems };
