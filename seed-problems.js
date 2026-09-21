const mongoose = require('mongoose');
require('dotenv').config();
const CodingProblem = require('./models/CodingProblem');

const problems = [
    {
        title: "Two Sum",
        description: "Given an array of integers nums and an integer target, return indices of the two numbers that add up to target. You may assume that each input would have exactly one solution, and you may not use the same element twice.",
        difficulty: "easy",
        category: "arrays",
        testCases: [
            { input: '[2,7,11,15], 9', expectedOutput: '[0,1]', isHidden: false },
            { input: '[3,2,4], 6', expectedOutput: '[1,2]', isHidden: false },
            { input: '[3,3], 6', expectedOutput: '[0,1]', isHidden: true }
        ],
        solutionTemplate: `function solution(nums, target) {
    // Write your code here
    // Example: return [0, 1]
    
}`,
        points: 10,
        companies: ["Google", "Amazon", "Facebook"],
        constraints: "2 <= nums.length <= 10^4, -10^9 <= nums[i] <= 10^9, -10^9 <= target <= 10^9"
    },
    {
        title: "Reverse String",
        description: "Write a function that reverses a string. The input string is given as an array of characters. Do not allocate extra space for another array.",
        difficulty: "easy",
        category: "strings",
        testCases: [
            { input: '["h","e","l","l","o"]', expectedOutput: '["o","l","l","e","h"]', isHidden: false },
            { input: '["H","a","n","n","a","h"]', expectedOutput: '["h","a","n","n","a","H"]', isHidden: false }
        ],
        solutionTemplate: `function solution(s) {
    // Write your code here
    // Reverse the array in-place
    
}`,
        points: 5,
        companies: ["Microsoft", "Apple"],
        constraints: "1 <= s.length <= 10^5"
    },
    {
        title: "Valid Parentheses",
        description: "Given a string s containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid. A valid string must have matching brackets in the correct order.",
        difficulty: "medium",
        category: "strings",
        testCases: [
            { input: '"()"', expectedOutput: 'true', isHidden: false },
            { input: '"()[]{}"', expectedOutput: 'true', isHidden: false },
            { input: '"(]"', expectedOutput: 'false', isHidden: true },
            { input: '"([)]"', expectedOutput: 'false', isHidden: true },
            { input: '"({[]})"', expectedOutput: 'true', isHidden: true }
        ],
        solutionTemplate: `function solution(s) {
    const stack = [];
    const pairs = {
        '(': ')',
        '[': ']',
        '{': '}'
    };
    // Write your code here
    
}`,
        points: 20,
        companies: ["Google", "Amazon", "Microsoft", "Facebook"],
        constraints: "1 <= s.length <= 10^4"
    }
];

async function seed() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');
        
        await CodingProblem.deleteMany({});
        console.log('Cleared existing problems');
        
        await CodingProblem.insertMany(problems);
        console.log(`✅ Added ${problems.length} coding problems!`);
        
        process.exit(0);
    } catch (error) {
        console.error('Seeding error:', error);
        process.exit(1);
    }
}

seed();