const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const requireMongo = require('./utils/requireMongo');
const { wrapModel } = require('./utils/inMemoryDB');

function response() {
    return {
        statusCode: null,
        body: null,
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(body) {
            this.body = body;
            return this;
        }
    };
}

const nextCalls = [];
const next = () => nextCalls.push(true);
const unavailable = response();
requireMongo({ app: { locals: { mongo: { readyState: 0 } } } }, unavailable, next);
assert.equal(unavailable.statusCode, 503);
assert.equal(unavailable.body.code, 'DATABASE_UNAVAILABLE');
assert.equal(nextCalls.length, 0);

const available = response();
requireMongo({ app: { locals: { mongo: { readyState: 1 } } } }, available, next);
assert.equal(available.statusCode, null);
assert.equal(nextCalls.length, 1);

async function testPaginationModelHelpers() {
    const records = [];
    const Sample = wrapModel(records, 'AssessmentHistoryTest', null, mongoose);
    await Sample.insertMany([
        { userId: 'owner-a', date: new Date('2024-01-01T00:00:00Z') },
        { userId: 'owner-a', date: new Date('2024-01-02T00:00:00Z') },
        { userId: 'owner-b', date: new Date('2024-01-03T00:00:00Z') }
    ]);

    assert.equal(await Sample.countDocuments({ userId: 'owner-a' }), 2);
    const page = await Sample.find({ userId: 'owner-a' })
        .sort({ date: -1 })
        .skip(1)
        .limit(1);
    assert.equal(page.length, 1);
    assert.equal(page[0].date.toISOString(), '2024-01-01T00:00:00.000Z');
}

testPaginationModelHelpers().then(() => {
    console.log('MongoDB requirement tests passed: database gating and filtered pagination helpers work.');
}).catch(error => {
    console.error(error);
    process.exitCode = 1;
});
