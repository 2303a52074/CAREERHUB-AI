const assert = require('node:assert/strict');
const { withOfficialLeetCodeLink, filterCodingProblems } = require('./utils/leetcodeCatalog');
const { codingProblems } = require('./utils/inMemoryDB');
const additionalCodingProblems = require('./utils/additionalCodingProblems');
const seedCodingProblems = require('./utils/seedCodingProblems');

(async () => {
const catalog = [
    ['Two Sum', 1, 'two-sum'],
    ['Reverse String', 344, 'reverse-string'],
    ['Valid Parentheses', 20, 'valid-parentheses'],
    ['Palindrome Number', 9, 'palindrome-number'],
    ['Maximum Subarray', 53, 'maximum-subarray'],
    ['Contains Duplicate', 217, 'contains-duplicate']
];

for (const [title, number, slug] of catalog) {
    const publicProblem = withOfficialLeetCodeLink({
        title,
        companies: ['Unverified Company'],
        solutionCode: 'hidden reference',
        testCases: [
            { input: '1', expectedOutput: '1', isHidden: false },
            { input: '2', expectedOutput: '2', isHidden: true }
        ]
    });
    assert.equal(publicProblem.officialSource, 'LeetCode');
    assert.equal(publicProblem.officialProblemNumber, number);
    assert.equal(publicProblem.officialUrl, `https://leetcode.com/problems/${slug}/`);
    assert.match(publicProblem.officialUrl, /^https:\/\/leetcode\.com\/problems\/[a-z0-9-]+\/$/);
    assert.equal(publicProblem.companies, undefined);
    assert.equal(publicProblem.solutionCode, undefined);
    assert.equal(publicProblem.testCases.length, 1);
}

const unmatched = withOfficialLeetCodeLink({ title: 'Unverified Challenge' });
assert.equal(unmatched.officialUrl, null);
assert.equal(unmatched.officialSource, null);

assert.equal(new Set(codingProblems.map(problem => problem.title)).size, codingProblems.length,
    'The seeded coding catalog must not contain duplicate titles.');
assert.equal(codingProblems.length, 16, 'The local catalog should include the original six plus ten new curated challenges.');
assert.equal(additionalCodingProblems.length, 10);
for (const problem of additionalCodingProblems) {
    assert.ok(problem.description.length >= 40, `${problem.title} needs a complete prompt.`);
    assert.ok(problem.testCases.length >= 2, `${problem.title} needs visible sample cases.`);
    assert.ok(problem.constraints, `${problem.title} needs constraints.`);
    assert.equal(withOfficialLeetCodeLink(problem).officialUrl, null,
        'New CareerHub-authored problems must not claim an unverified official listing.');
}

async function verifySeedingIsIdempotent() {
    const records = [];
    const model = {
        async init() {},
        findOne(query) {
            return {
                select: async () => records.find(record =>
                    Object.entries(query).every(([key, value]) => {
                        if (key === 'seedKey') {
                            return value.$exists === false
                                ? record.seedKey === undefined
                                : record.seedKey === value;
                        }
                        return record[key] === value;
                    })
                ) || null
            };
        },
        async updateOne(filter, update, options = {}) {
            let record = records.find(item =>
                Object.entries(filter).every(([key, value]) => item[key] === value)
            );
            if (!record && options.upsert) {
                record = { ...update.$setOnInsert };
                records.push(record);
            } else if (record && update.$set) {
                Object.assign(record, update.$set);
            }
        }
    };
    await seedCodingProblems(model, codingProblems);
    await seedCodingProblems(model, codingProblems);
    assert.equal(records.length, codingProblems.length,
        'Seeding twice must not create duplicate curated problems.');
}

await verifySeedingIsIdempotent();

assert.equal(filterCodingProblems(codingProblems, { search: 'two sum' }).length, 1);
assert.equal(filterCodingProblems(codingProblems, { difficulty: 'easy' }).length, 9);
assert.equal(filterCodingProblems(codingProblems, { topic: 'strings' }).length, 4);
assert.equal(filterCodingProblems(codingProblems, { search: 'not-a-problem' }).length, 0);

console.log('Coding catalog tests passed: 16 unique problems, idempotent seeding, search/topic/difficulty filters, verified existing LeetCode links, and safe original entries.');
})().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
