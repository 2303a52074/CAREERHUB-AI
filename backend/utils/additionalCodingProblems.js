module.exports = [
    {
        id: '7',
        title: 'Maximum Single-Trade Gain',
        description: 'Given daily asset prices, choose one day to buy and a later day to sell. Return the greatest nonnegative gain possible, or 0 when no profitable trade exists.',
        difficulty: 'easy',
        category: 'arrays',
        testCases: [
            { input: '[7,1,5,3,6,4]', expectedOutput: '5', isHidden: false },
            { input: '[7,6,4,3,1]', expectedOutput: '0', isHidden: false },
            { input: '[2,4,1]', expectedOutput: '2', isHidden: true }
        ],
        solutionTemplate: 'function solution(prices) {\n    // Return the best gain from one buy followed by one sell.\n}',
        constraints: '1 <= prices.length <= 100000; 0 <= prices[i] <= 100000'
    },
    {
        id: '8',
        title: 'Binary Search Position',
        description: 'Given a sorted array of distinct integers and a target, return the target index when present; otherwise return -1.',
        difficulty: 'easy',
        category: 'sorting',
        testCases: [
            { input: '[-1,0,3,5,9,12], 9', expectedOutput: '4', isHidden: false },
            { input: '[-1,0,3,5,9,12], 2', expectedOutput: '-1', isHidden: false },
            { input: '[5], 5', expectedOutput: '0', isHidden: true }
        ],
        solutionTemplate: 'function solution(nums, target) {\n    // Return the target index, or -1 when absent.\n}',
        constraints: '1 <= nums.length <= 100000; nums is strictly increasing'
    },
    {
        id: '9',
        title: 'Merge Sorted Sequences',
        description: 'Given two arrays already sorted in nondecreasing order, return one sorted array containing every value from both inputs.',
        difficulty: 'easy',
        category: 'arrays',
        testCases: [
            { input: '[1,3,5], [2,4,6]', expectedOutput: '[1,2,3,4,5,6]', isHidden: false },
            { input: '[], [0,2]', expectedOutput: '[0,2]', isHidden: false },
            { input: '[-2,4], [-2,3,9]', expectedOutput: '[-2,-2,3,4,9]', isHidden: true }
        ],
        solutionTemplate: 'function solution(first, second) {\n    // Return a merged sorted array.\n}',
        constraints: '0 <= first.length, second.length <= 100000'
    },
    {
        id: '10',
        title: 'First Unique Character Position',
        description: 'Given a lowercase string, return the index of its first character that occurs exactly once. Return -1 when every character repeats.',
        difficulty: 'easy',
        category: 'strings',
        testCases: [
            { input: '"careerhub"', expectedOutput: '0', isHidden: false },
            { input: '"aabb"', expectedOutput: '-1', isHidden: false },
            { input: '"swiss"', expectedOutput: '1', isHidden: true }
        ],
        solutionTemplate: 'function solution(text) {\n    // Return the first non-repeating character index.\n}',
        constraints: '1 <= text.length <= 100000; text contains lowercase English letters'
    },
    {
        id: '11',
        title: 'Longest Non-Repeating Segment',
        description: 'Given a string, return the length of its longest contiguous segment in which no character appears more than once.',
        difficulty: 'medium',
        category: 'strings',
        testCases: [
            { input: '"abcabcbb"', expectedOutput: '3', isHidden: false },
            { input: '"bbbbb"', expectedOutput: '1', isHidden: false },
            { input: '"pwwkew"', expectedOutput: '3', isHidden: true }
        ],
        solutionTemplate: 'function solution(text) {\n    // Return the longest length with all distinct characters.\n}',
        constraints: '0 <= text.length <= 100000'
    },
    {
        id: '12',
        title: 'Rotate Sequence Right',
        description: 'Given an array and a nonnegative rotation count, return a new array shifted right by that many positions. Counts larger than the array length should wrap around.',
        difficulty: 'medium',
        category: 'arrays',
        testCases: [
            { input: '[1,2,3,4,5], 2', expectedOutput: '[4,5,1,2,3]', isHidden: false },
            { input: '[1,2,3], 0', expectedOutput: '[1,2,3]', isHidden: false },
            { input: '[1,2], 5', expectedOutput: '[2,1]', isHidden: true }
        ],
        solutionTemplate: 'function solution(nums, steps) {\n    // Return a new array rotated right by steps.\n}',
        constraints: '1 <= nums.length <= 100000; 0 <= steps <= 1000000000'
    },
    {
        id: '13',
        title: 'Combine Overlapping Ranges',
        description: 'Given a list of closed numeric intervals, combine intervals that overlap and return the resulting ranges sorted by start value.',
        difficulty: 'medium',
        category: 'sorting',
        testCases: [
            { input: '[[1,3],[2,6],[8,10],[15,18]]', expectedOutput: '[[1,6],[8,10],[15,18]]', isHidden: false },
            { input: '[[1,4],[4,5]]', expectedOutput: '[[1,5]]', isHidden: false },
            { input: '[[-3,-1],[0,2],[-2,1]]', expectedOutput: '[[-3,2]]', isHidden: true }
        ],
        solutionTemplate: 'function solution(intervals) {\n    // Return sorted intervals with overlaps combined.\n}',
        constraints: '1 <= intervals.length <= 10000; start <= end'
    },
    {
        id: '14',
        title: 'Count Connected Land Groups',
        description: 'Given a rectangular grid of "1" land cells and "0" water cells, count the groups of land connected horizontally or vertically.',
        difficulty: 'medium',
        category: 'graphs',
        testCases: [
            { input: '[["1","1","0"],["0","1","0"],["1","0","1"]]', expectedOutput: '3', isHidden: false },
            { input: '[["1","1"],["1","1"]]', expectedOutput: '1', isHidden: false },
            { input: '[["0","0"],["0","0"]]', expectedOutput: '0', isHidden: true }
        ],
        solutionTemplate: 'function solution(grid) {\n    // Return the number of four-directionally connected land groups.\n}',
        constraints: '0 <= rows, columns <= 300; grid is rectangular'
    },
    {
        id: '15',
        title: 'Staircase Step Combinations',
        description: 'A staircase has n steps, and each move can climb either one or two steps. Return the number of distinct ordered ways to reach the top.',
        difficulty: 'easy',
        category: 'dynamic-programming',
        testCases: [
            { input: '2', expectedOutput: '2', isHidden: false },
            { input: '5', expectedOutput: '8', isHidden: false },
            { input: '10', expectedOutput: '89', isHidden: true }
        ],
        solutionTemplate: 'function solution(n) {\n    // Return the number of ways to reach step n.\n}',
        constraints: '1 <= n <= 45'
    },
    {
        id: '16',
        title: 'Minimum Coin Count',
        description: 'Given coin denominations and a target amount, return the fewest coins needed to form the amount. Return -1 when the amount cannot be formed.',
        difficulty: 'medium',
        category: 'dynamic-programming',
        testCases: [
            { input: '[1,2,5], 11', expectedOutput: '3', isHidden: false },
            { input: '[2], 3', expectedOutput: '-1', isHidden: false },
            { input: '[1], 0', expectedOutput: '0', isHidden: true }
        ],
        solutionTemplate: 'function solution(coins, amount) {\n    // Return the minimum number of coins, or -1 when impossible.\n}',
        constraints: '1 <= coins.length <= 12; 0 <= amount <= 10000; coin values are positive'
    }
];
