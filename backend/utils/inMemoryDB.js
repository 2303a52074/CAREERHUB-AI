// In-Memory Data Stores
const users = [];
const interviews = [];
const codingProblems = [];
const codeSubmissions = [];
const challenges = [];
const jobOpportunities = [];
const jobApplications = [];
const careerAssessments = [];
const careerAssessmentSessions = [];
const careerRoadmaps = [];
const dailyPlans = [];
const dailyPlanGenerationLocks = [];
const careerConversations = [];
const resumeAnalyses = [];
const skillGapAnalyses = [];
const examSessions = [];
const additionalCodingProblems = require('./additionalCodingProblems');

const seedPromise = (async () => {
    try {
        // Seed default coding problems
        codingProblems.push(
            {
                _id: 'problem-1',
                id: '1',
                title: "Two Sum",
                description: "Given an array of integers nums and an integer target, return indices of the two numbers that add up to target. You may assume that each input would have exactly one solution, and you may not use the same element twice.",
                difficulty: "easy",
                category: "arrays",
                testCases: [
                    { input: '[2,7,11,15], 9', expectedOutput: '[0,1]', isHidden: false },
                    { input: '[3,2,4], 6', expectedOutput: '[1,2]', isHidden: false },
                    { input: '[3,3], 6', expectedOutput: '[0,1]', isHidden: true }
                ],
                solutionTemplate: "function solution(nums, target) {\n    // Write your code here\n    // Example: return [0, 1]\n}",
                points: 10,
                companies: ["Google", "Amazon", "Facebook"],
                constraints: "2 <= nums.length <= 10^4, -10^9 <= nums[i] <= 10^9, -10^9 <= target <= 10^9"
            },
            {
                _id: 'problem-2',
                id: '2',
                title: "Reverse String",
                description: "Write a function that reverses a string. The input string is given as an array of characters. Do not allocate extra space for another array.",
                difficulty: "easy",
                category: "strings",
                testCases: [
                    { input: '["h","e","l","l","o"]', expectedOutput: '["o","l","l","e","h"]', isHidden: false },
                    { input: '["H","a","n","n","a","h"]', expectedOutput: '["h","a","n","n","a","H"]', isHidden: false }
                ],
                solutionTemplate: "function solution(s) {\n    // Reverse the array in-place\n}",
                points: 5,
                companies: ["Microsoft", "Apple"],
                constraints: "1 <= s.length <= 10^5"
            },
            {
                _id: 'problem-3',
                id: '3',
                title: "Valid Parentheses",
                description: "Given a string s containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid. A valid string must have matching brackets in the correct order.",
                difficulty: "medium",
                category: "strings",
                testCases: [
                    { input: '"()"', expectedOutput: 'true', isHidden: false },
                    { input: '"()[]{}"', expectedOutput: 'true', isHidden: false },
                    { input: '"(]"', expectedOutput: 'false', isHidden: true }
                ],
                solutionTemplate: "function solution(s) {\n    // Write your code here\n}",
                points: 20,
                companies: ["Google", "Amazon", "Microsoft", "Facebook"],
                constraints: "1 <= s.length <= 10^4"
            },
            {
                _id: 'problem-4',
                id: '4',
                title: "Palindrome Number",
                description: "Given an integer x, return true if x is a palindrome, and false otherwise. An integer is a palindrome when it reads the same forward and backward.",
                difficulty: "easy",
                category: "math",
                testCases: [
                    { input: '121', expectedOutput: 'true', isHidden: false },
                    { input: '-121', expectedOutput: 'false', isHidden: false },
                    { input: '10', expectedOutput: 'false', isHidden: true }
                ],
                solutionTemplate: "function solution(x) {\n    // Return true if x is a palindrome\n    if (x < 0) return false;\n    const s = String(x);\n    return s === s.split('').reverse().join('');\n}",
                points: 10,
                companies: ["Amazon", "Microsoft"],
                constraints: "-2^31 <= x <= 2^31 - 1"
            },
            {
                _id: 'problem-5',
                id: '5',
                title: "Maximum Subarray",
                description: "Given an integer array nums, find the subarray with the largest sum, and return its sum. Solve using Kadane's algorithm in O(n) time.",
                difficulty: "medium",
                category: "dynamic-programming",
                testCases: [
                    { input: '[-2,1,-3,4,-1,2,1,-5,4]', expectedOutput: '6', isHidden: false },
                    { input: '[1]', expectedOutput: '1', isHidden: false },
                    { input: '[5,4,-1,7,8]', expectedOutput: '23', isHidden: true }
                ],
                solutionTemplate: "function solution(nums) {\n    // Kadane's Algorithm\n    let maxSoFar = nums[0];\n    let currMax = nums[0];\n    for (let i = 1; i < nums.length; i++) {\n        currMax = Math.max(nums[i], currMax + nums[i]);\n        maxSoFar = Math.max(maxSoFar, currMax);\n    }\n    return maxSoFar;\n}",
                points: 25,
                companies: ["Google", "Apple", "LinkedIn"],
                constraints: "1 <= nums.length <= 10^5, -10^4 <= nums[i] <= 10^4"
            },
            {
                _id: 'problem-6',
                id: '6',
                title: "Contains Duplicate",
                description: "Given an integer array nums, return true if any value appears at least twice in the array, and return false if every element is distinct.",
                difficulty: "easy",
                category: "arrays",
                testCases: [
                    { input: '[1,2,3,1]', expectedOutput: 'true', isHidden: false },
                    { input: '[1,2,3,4]', expectedOutput: 'false', isHidden: false },
                    { input: '[1,1,1,3,3,4,3,2,4,2]', expectedOutput: 'true', isHidden: true }
                ],
                solutionTemplate: "function solution(nums) {\n    const set = new Set();\n    for (const n of nums) {\n        if (set.has(n)) return true;\n        set.add(n);\n    }\n    return false;\n}",
                points: 10,
                companies: ["Amazon", "Uber", "Adobe"],
                constraints: "1 <= nums.length <= 10^5"
            }
        );
        codingProblems.push(...additionalCodingProblems.map(problem => ({
            ...problem,
            _id: `problem-${problem.id}`,
            companies: []
        })));

    } catch (e) {
        console.warn("Seed init error:", e.message);
    }
})();

class QueryBuilder {
    constructor(dataPromise) {
        this.dataPromise = Promise.resolve(dataPromise);
    }

    sort(sortObj) {
        this.dataPromise = this.dataPromise.then(items => {
            if (!Array.isArray(items)) return items;
            const clone = [...items];
            if (typeof sortObj === 'object') {
                const [field, dir] = Object.entries(sortObj)[0] || ['_id', 1];
                clone.sort((a, b) => {
                    const valA = a[field] ?? '';
                    const valB = b[field] ?? '';
                    if (valA < valB) return dir === -1 ? 1 : -1;
                    if (valA > valB) return dir === -1 ? -1 : 1;
                    return 0;
                });
            }
            return clone;
        });
        return this;
    }

    limit(n) {
        this.dataPromise = this.dataPromise.then(items => {
            if (Array.isArray(items)) return items.slice(0, n);
            return items;
        });
        return this;
    }

    skip(n) {
        this.dataPromise = this.dataPromise.then(items => {
            if (Array.isArray(items)) return items.slice(n);
            return items;
        });
        return this;
    }

    select(fieldsStr) {
        this.dataPromise = this.dataPromise.then(items => {
            if (!items) return items;
            const fields = typeof fieldsStr === 'string' ? fieldsStr.split(' ').filter(Boolean) : [];
            const excludeFields = fields.filter(f => f.startsWith('-')).map(f => f.slice(1));
            const includeFields = fields.filter(f => !f.startsWith('-'));

            const filterItem = (item) => {
                if (!item || typeof item !== 'object') return item;
                const copy = { ...item };
                if (excludeFields.length > 0) {
                    excludeFields.forEach(f => delete copy[f]);
                } else if (includeFields.length > 0) {
                    const filtered = {};
                    includeFields.forEach(f => { filtered[f] = copy[f]; });
                    if (copy._id) filtered._id = copy._id;
                    return filtered;
                }
                return copy;
            };

            if (Array.isArray(items)) return items.map(filterItem);
            return filterItem(items);
        });
        return this;
    }

    populate(field, selectFields) {
        this.dataPromise = this.dataPromise.then(items => {
            const populateItem = (item) => {
                if (!item) return item;
                const copy = { ...item };
                if (field === 'userId') {
                    const user = users.find(u => String(u._id) === String(copy.userId));
                    if (user) {
                        copy.userId = {
                            _id: user._id,
                            name: user.name,
                            email: user.email,
                            role: user.role
                        };
                    } else {
                        copy.userId = { _id: copy.userId, name: 'Candidate', email: 'user@example.com' };
                    }
                }
                return copy;
            };

            if (Array.isArray(items)) return items.map(populateItem);
            return populateItem(items);
        });
        return this;
    }

    lean() {
        return this;
    }

    then(resolve, reject) {
        return this.dataPromise.then(resolve, reject);
    }

    catch(reject) {
        return this.dataPromise.catch(reject);
    }
}

function sameMongoIdentifier(left, right) {
    if (left === right) return true;
    const leftIsObjectId = left?._bsontype === 'ObjectId';
    const rightIsObjectId = right?._bsontype === 'ObjectId';
    return left != null && right != null &&
        (leftIsObjectId || rightIsObjectId) &&
        String(left) === String(right);
}

function matchFilter(item, filter) {
    if (!filter || Object.keys(filter).length === 0) return true;
    for (const [key, val] of Object.entries(filter)) {
        if (key === '_id' || key === 'id') {
            if (String(item._id) !== String(val) && String(item.id) !== String(val)) return false;
        } else if (val && typeof val === 'object' && !Array.isArray(val) && '$ne' in val) {
            const current = item[key];
            const containsValue = Array.isArray(current)
                ? current.some(value => sameMongoIdentifier(value, val.$ne))
                : sameMongoIdentifier(current, val.$ne);
            if (containsValue) return false;
        } else if (val === null && item[key] == null) {
            continue;
        } else if (!sameMongoIdentifier(item[key], val)) {
            return false;
        }
    }
    return true;
}

function wrapModel(collection, modelName, originalMongooseModel, mongoose) {
    function ModelConstructor(data = {}) {
        if (mongoose.connection.readyState === 1 && originalMongooseModel) {
            return new originalMongooseModel(data);
        }
        const doc = {
            _id: 'mock-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6),
            ...data
        };
        doc.id = doc._id;
        doc.save = async function() {
            const idx = collection.findIndex(i => String(i._id) === String(doc._id));
            if (idx >= 0) {
                collection[idx] = { ...collection[idx], ...doc };
            } else {
                collection.push(doc);
            }
            return doc;
        };
        doc.toObject = function() {
            return { ...doc };
        };
        return doc;
    }

    ModelConstructor.init = function() {
        if (mongoose.connection.readyState === 1 && originalMongooseModel) {
            return originalMongooseModel.init();
        }
        return Promise.resolve(ModelConstructor);
    };

    ModelConstructor.updateOne = function(filter, update, options) {
        if (mongoose.connection.readyState === 1 && originalMongooseModel) {
            return originalMongooseModel.updateOne(filter, update, options);
        }
        const item = collection.find(entry => matchFilter(entry, filter));
        if (!item) {
            return Promise.resolve({ acknowledged: true, matchedCount: 0, modifiedCount: 0, upsertedCount: 0 });
        }
        Object.entries(update.$set || {}).forEach(([key, value]) => {
            item[key] = value;
        });
        Object.entries(update.$inc || {}).forEach(([key, value]) => {
            item[key] = (Number(item[key]) || 0) + Number(value);
        });
        Object.entries(update.$addToSet || {}).forEach(([key, value]) => {
            const values = item[key] || [];
            if (!values.some(current => String(current) === String(value))) values.push(value);
            item[key] = values;
        });
        Object.entries(update).forEach(([key, value]) => {
            if (!key.startsWith('$')) item[key] = value;
        });
        return Promise.resolve({ acknowledged: true, matchedCount: 1, modifiedCount: 1, upsertedCount: 0 });
    };

    ModelConstructor.findOne = function(filter) {
        if (mongoose.connection.readyState === 1 && originalMongooseModel) {
            return originalMongooseModel.findOne(filter);
        }
        const item = collection.find(i => matchFilter(i, filter));
        const res = item ? { ...item, save: async function() {
            const idx = collection.findIndex(i => String(i._id) === String(item._id));
            if (idx >= 0) collection[idx] = { ...collection[idx], ...this };
            return this;
        }} : null;
        return new QueryBuilder(res);
    };

    ModelConstructor.findById = function(id) {
        if (mongoose.connection.readyState === 1 && originalMongooseModel) {
            return originalMongooseModel.findById(id);
        }
        const item = collection.find(i => String(i._id) === String(id) || String(i.id) === String(id));
        const res = item ? { ...item, save: async function() {
            const idx = collection.findIndex(i => String(i._id) === String(item._id));
            if (idx >= 0) collection[idx] = { ...collection[idx], ...this };
            return this;
        }} : null;
        return new QueryBuilder(res);
    };

    ModelConstructor.findByIdAndUpdate = function(id, updates, options = {}) {
        if (mongoose.connection.readyState === 1 && originalMongooseModel) {
            return originalMongooseModel.findByIdAndUpdate(id, updates, options);
        }
        const idx = collection.findIndex(i => String(i._id) === String(id) || String(i.id) === String(id));
        if (idx >= 0) {
            const updated = { ...collection[idx] };
            Object.entries(updates.$set || {}).forEach(([key, value]) => {
                updated[key] = value;
            });
            Object.entries(updates.$push || {}).forEach(([key, value]) => {
                updated[key] = [...(updated[key] || []), value];
            });
            Object.entries(updates.$inc || {}).forEach(([key, value]) => {
                updated[key] = (Number(updated[key]) || 0) + Number(value);
            });
            Object.entries(updates).forEach(([key, value]) => {
                if (!key.startsWith('$')) updated[key] = value;
            });
            collection[idx] = updated;
            return new QueryBuilder({ ...collection[idx] });
        }
        return new QueryBuilder(null);
    };

    ModelConstructor.findByIdAndDelete = function(id) {
        if (mongoose.connection.readyState === 1 && originalMongooseModel) {
            return originalMongooseModel.findByIdAndDelete(id);
        }
        const idx = collection.findIndex(i => String(i._id) === String(id) || String(i.id) === String(id));
        if (idx >= 0) {
            const removed = collection.splice(idx, 1)[0];
            return new QueryBuilder(removed);
        }
        return new QueryBuilder(null);
    };

    ModelConstructor.find = function(filter = {}) {
        if (mongoose.connection.readyState === 1 && originalMongooseModel) {
            return originalMongooseModel.find(filter);
        }
        const items = collection.filter(i => matchFilter(i, filter)).map(i => ({ ...i }));
        return new QueryBuilder(items);
    };

    ModelConstructor.countDocuments = function(filter = {}) {
        if (mongoose.connection.readyState === 1 && originalMongooseModel) {
            return originalMongooseModel.countDocuments(filter);
        }
        return Promise.resolve(collection.filter(item => matchFilter(item, filter)).length);
    };

    ModelConstructor.deleteMany = function(filter = {}) {
        if (mongoose.connection.readyState === 1 && originalMongooseModel) {
            return originalMongooseModel.deleteMany(filter);
        }
        collection.length = 0;
        return Promise.resolve({ deletedCount: collection.length });
    };

    ModelConstructor.insertMany = function(docs = []) {
        if (mongoose.connection.readyState === 1 && originalMongooseModel) {
            return originalMongooseModel.insertMany(docs);
        }
        docs.forEach(d => {
            const doc = {
                _id: d._id || 'mock-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6),
                ...d
            };
            collection.push(doc);
        });
        return Promise.resolve(docs);
    };

    return ModelConstructor;
}

module.exports = {
    users,
    interviews,
    codingProblems,
    codeSubmissions,
    challenges,
    jobOpportunities,
    jobApplications,
    careerAssessments,
    careerAssessmentSessions,
    careerRoadmaps,
    dailyPlans,
    dailyPlanGenerationLocks,
    careerConversations,
    resumeAnalyses,
    skillGapAnalyses,
    examSessions,
    wrapModel,
    seedPromise
};
