'use strict';

const specifications = [
    {
        id: 'ch-001', title: 'Count Above the Line', category: 'arrays', difficulty: 'easy',
        description: 'Given an integer sequence and a limit, count the entries strictly greater than the limit. Equal values do not qualify.',
        args: [['values', 'array'], ['limit', 'int']], result: 'int', fn: 'countAboveLimit',
        constraints: '1 <= n <= 200000; -10^9 <= values[i], limit <= 10^9.',
        hints: ['A single scan is sufficient; each value contributes independently.', 'Compare with strict greater-than, not greater-than-or-equal.', 'Keep only a running count, so auxiliary storage is unnecessary.'],
        editorial: 'Scan the sequence once and increment a counter precisely when the current value exceeds the limit. No ordering or mutation is needed. This is optimal because every input value may affect the answer; it uses O(n) time and O(1) auxiliary space.',
        plan: 'Scan values once and increment a counter only for values strictly above limit.',
        solve: (values, limit) => values.filter(value => value > limit).length,
        cases: [
            ['5 2 1 4 5 6 3', '3', 'The qualifying values are 4, 5, and 6; the limit itself is excluded.'],
            ['4 8 8 9 10 8', '2', 'Only 9 and 10 are strictly above the boundary value 8.'],
            ['1 0 -7', '1', 'Zero is strictly greater than the limit of negative seven.'],
            ['7 -2 -5 -2 0 3 -2 4 -2', '3', 'The values 0, 3, and 4 exceed -2; equal values are excluded.']
        ]
    },
    {
        id: 'ch-002', title: 'Leftward Array Rotation', category: 'arrays', difficulty: 'easy',
        description: 'Rotate an integer sequence left by a nonnegative number of positions. Rotations longer than the sequence wrap around.',
        args: [['values', 'array'], ['steps', 'int']], result: 'array', fn: 'rotateLeft',
        constraints: '1 <= n <= 200000; 0 <= steps <= 10^9; -10^9 <= values[i] <= 10^9.',
        hints: ['A rotation count equal to the sequence length changes nothing.', 'Reduce the count modulo n before splitting the sequence.', 'The suffix after the cut precedes the original prefix.'],
        editorial: 'Let shift = steps mod n. Concatenate the slice beginning at shift with the prefix ending just before shift. This directly constructs the required order, runs in O(n) time, and uses O(n) space for the returned sequence.',
        plan: 'Normalize steps modulo the sequence length, then assemble suffix followed by prefix.',
        solve: (values, steps) => { const shift = steps % values.length; return values.slice(shift).concat(values.slice(0, shift)); },
        cases: [
            ['5 1 2 3 4 5 2', '[3,4,5,1,2]', 'Cut before index 2; the remaining suffix becomes the new prefix.'],
            ['3 7 8 9 0', '[7,8,9]', 'A zero shift leaves the sequence in its original order.'],
            ['5 -1 0 4 8 9 9', '[9,-1,0,4,8]', 'Nine left moves on five values are equivalent to four moves.'],
            ['1 42 1000000000', '[42]', 'Any rotation of a one-element sequence is unchanged.']
        ]
    },
    {
        id: 'ch-003', title: 'Inclusive Running Totals', category: 'arrays', difficulty: 'easy',
        description: 'For every position, report the sum of all sequence values from the beginning through that position.',
        args: [['values', 'array']], result: 'array', fn: 'runningTotals',
        constraints: '1 <= n <= 200000; -10^9 <= values[i] <= 10^9; intermediate totals fit signed 64-bit integers.',
        hints: ['The total at the next position is the previous total plus one value.', 'Negative entries reduce the running total rather than resetting it.', 'Append each updated total as soon as it is known.'],
        editorial: 'Maintain a cumulative sum initialized to zero. Add each value and append the new sum to the result. Every value is processed once, giving O(n) time; the output itself takes O(n) space and the running state is O(1).',
        plan: 'Accumulate each next value into a running sum and record every prefix total.',
        solve: values => { let sum = 0; return values.map(value => (sum += value)); },
        cases: [
            ['5 2 1 3 -2 4', '[2,3,6,4,8]', 'The negative fourth value lowers the accumulated total from 6 to 4.'],
            ['3 0 0 5', '[0,0,5]', 'Zero entries preserve the current prefix total.'],
            ['1 -9', '[-9]', 'The only prefix contains the single negative entry.'],
            ['4 5 -5 -5 5', '[5,0,-5,0]', 'The running sum returns to zero twice without losing earlier contributions.']
        ]
    },
    {
        id: 'ch-004', title: 'Best Later-Day Gain', category: 'arrays', difficulty: 'easy',
        description: 'Given daily prices, choose one earlier day to buy and one later day to sell. Return the largest nonnegative gain, or zero if every later sale loses money.',
        args: [['prices', 'array']], result: 'int', fn: 'bestLaterGain',
        constraints: '1 <= n <= 200000; 0 <= prices[i] <= 10^9.',
        hints: ['At a sale day, only the cheapest earlier price matters.', 'Update the cheapest price after evaluating its possible sale on that day.', 'A sequence with no rise should still produce the allowed zero gain.'],
        editorial: 'Walk from left to right, tracking the minimum price seen before or at the current day and the best difference found so far. Evaluating each day against the prior minimum enforces buy-before-sell. The algorithm is O(n) time and O(1) auxiliary space.',
        plan: 'Track the smallest earlier price and update the best nonnegative sale difference.',
        solve: prices => { let low = Infinity; let best = 0; for (const price of prices) { best = Math.max(best, price - low); low = Math.min(low, price); } return best; },
        cases: [
            ['6 7 1 5 3 6 4', '5', 'Buying at 1 and selling later at 6 yields the best gain, 5.'],
            ['5 9 7 5 3 1', '0', 'Every later price is lower, so no profitable trade exists.'],
            ['2 3 8', '5', 'The earliest price is the cheapest and the final price is 5 higher.'],
            ['4 4 2 2 2', '0', 'Equal or falling prices never create a positive gain.']
        ]
    },
    {
        id: 'ch-005', title: 'Merge Ordered Sequences', category: 'arrays', difficulty: 'easy',
        description: 'Combine two already nondecreasing integer sequences into one nondecreasing sequence, retaining every duplicate.',
        args: [['first', 'array'], ['second', 'array']], result: 'array', fn: 'mergeOrdered',
        constraints: '0 <= first.length, second.length <= 100000; each input is nondecreasing; total length is positive.',
        hints: ['The first unconsumed item in each sequence is the next candidate.', 'When values tie, taking either first preserves sorted order.', 'Append any remaining suffix after one sequence is exhausted.'],
        editorial: 'Use two indices, repeatedly append the smaller current value, then append the unconsumed suffix. Each element is copied once, so time is O(n+m) and the returned merged sequence requires O(n+m) space.',
        plan: 'Advance the pointer of the smaller front value, then append the remaining tail.',
        solve: (first, second) => { const out = []; let i = 0; let j = 0; while (i < first.length && j < second.length) out.push(first[i] <= second[j] ? first[i++] : second[j++]); return out.concat(first.slice(i), second.slice(j)); },
        cases: [
            ['3 1 4 8 4 2 4 7 9', '[1,2,4,4,7,8,9]', 'Each input pointer advances in sorted order, and equal 4s are both kept.'],
            ['0 3 1 3 5', '[1,3,5]', 'An empty first sequence leaves the second sequence unchanged.'],
            ['4 -4 -1 3 10 3 -5 -1 11', '[-5,-4,-1,-1,3,10,11]', 'The merge handles negative values and retains both copies of -1.'],
            ['2 1 1 3 2 2 2', '[1,1,2,2,2]', 'Duplicates from both inputs are emitted separately.']
        ]
    },
    {
        id: 'ch-006', title: 'Smallest Missing Nonnegative', category: 'arrays', difficulty: 'easy',
        description: 'Return the smallest nonnegative integer absent from an unsorted integer sequence. Negative values do not count as candidates.',
        args: [['values', 'array']], result: 'int', fn: 'smallestMissingNonnegative',
        constraints: '1 <= n <= 200000; -10^9 <= values[i] <= 10^9.',
        hints: ['Only values from zero through n can affect the answer.', 'A set lets you test candidate membership without sorting.', 'Check candidates in increasing order and stop at the first gap.'],
        editorial: 'Insert all values into a hash set, then test 0, 1, 2, and onward until a candidate is absent. At most n+1 candidates are needed. Expected time and auxiliary space are both O(n); a sorted alternative is slower and unnecessary here.',
        plan: 'Build membership information, then test nonnegative candidates from zero upward.',
        solve: values => { const present = new Set(values); let candidate = 0; while (present.has(candidate)) candidate++; return candidate; },
        cases: [
            ['6 0 2 2 -1 4 1', '3', 'Zero, one, and two are present; three is the first missing candidate.'],
            ['4 -4 -2 -1 -8', '0', 'No nonnegative value occurs, so zero is missing.'],
            ['3 0 1 2', '3', 'The consecutive prefix 0 through 2 is present.'],
            ['6 1 2 3 4 5 6', '0', 'A sequence of positive values cannot fill the missing zero.']
        ]
    },
    {
        id: 'ch-007', title: 'Longest Rising Contiguous Run', category: 'arrays', difficulty: 'medium',
        description: 'Find the length of the longest contiguous run in which every value is strictly greater than the value immediately before it.',
        args: [['values', 'array']], result: 'int', fn: 'longestRisingRun',
        constraints: '1 <= n <= 200000; -10^9 <= values[i] <= 10^9.',
        hints: ['A run breaks on equality as well as on a decrease.', 'Track the current run length and the best seen so far.', 'The first element starts a run of length one.'],
        editorial: 'Initialize current and best lengths to one. For each adjacent pair, extend current when the right value is larger; otherwise restart it at one, then update best. This is O(n) time and O(1) extra space.',
        plan: 'Extend the active run only for a strict rise; otherwise restart at length one.',
        solve: values => { let current = 1; let best = 1; for (let i = 1; i < values.length; i++) { current = values[i] > values[i - 1] ? current + 1 : 1; best = Math.max(best, current); } return best; },
        cases: [
            ['7 1 2 2 3 4 1 5', '3', 'The longest strict run is 2, 3, 4; equality at the second 2 breaks the earlier run.'],
            ['4 9 7 5 2', '1', 'Every adjacent pair falls, so each single element is its own run.'],
            ['1 -3', '1', 'A one-element input has a run of length one.'],
            ['5 -2 0 1 4 8', '5', 'All adjacent values rise, giving one run across the entire sequence.']
        ]
    },
    {
        id: 'ch-008', title: 'Target-Sum Segment Count', category: 'arrays', difficulty: 'medium',
        description: 'Count contiguous segments whose values sum exactly to a target. Values may be negative, zero, or positive.',
        args: [['values', 'array'], ['target', 'int']], result: 'long', fn: 'countTargetSegments',
        constraints: '1 <= n <= 200000; -10^9 <= values[i], target <= 10^9; the answer fits signed 64-bit.',
        hints: ['A segment sum is the difference of two prefix sums.', 'For current prefix p, seek an earlier prefix equal to p - target.', 'Record the current prefix only after counting matches ending here.'],
        editorial: 'Keep a frequency map of prefix sums, seeded with frequency one for prefix zero. At each value, update the prefix, add the stored frequency of prefix-target to the answer, then increment this prefix frequency. This counts all endpoints in expected O(n) time and O(n) space, including negative values.',
        plan: 'Use prefix-sum frequencies to count prior boundaries that make the target difference.',
        solve: (values, target) => { const freq = new Map([[0, 1]]); let sum = 0; let count = 0; for (const value of values) { sum += value; count += freq.get(sum - target) || 0; freq.set(sum, (freq.get(sum) || 0) + 1); } return count; },
        cases: [
            ['5 1 1 1 1 1 2', '4', 'The four length-two segments each sum to two.'],
            ['4 3 -1 -2 4 0', '1', 'The first three values sum to zero, giving the single target segment.'],
            ['3 0 0 0 0', '6', 'Every nonempty segment sums to zero, giving 3·4/2 segments.'],
            ['5 2 -2 3 -3 1 1', '4', 'Negative prefixes are handled by exact differences rather than a positive-only window.']
        ]
    },
    {
        id: 'ch-009', title: 'Products Excluding Position', category: 'arrays', difficulty: 'medium',
        description: 'For each index, return the product of every sequence value except the value at that index. Division is not allowed.',
        args: [['values', 'array']], result: 'array', fn: 'productsWithoutPosition',
        constraints: '2 <= n <= 100000; -20 <= values[i] <= 20; every result fits an exact signed 53-bit integer.',
        hints: ['The product before an index and the product after it are independent.', 'A forward pass can store products strictly to the left.', 'A reverse running product supplies each right-side factor.'],
        editorial: 'First store the running product of all values strictly left of each index. Then traverse backward with a right product, multiply it into each stored result, and extend the right product. No division is used; time is O(n), auxiliary working space is O(1) beyond the required output.',
        plan: 'Store left products, then multiply by a reverse running product without division.',
        solve: values => { const out = Array(values.length); let left = 1; for (let i = 0; i < values.length; i++) { out[i] = left; left *= values[i]; } let right = 1; for (let i = values.length - 1; i >= 0; i--) { out[i] *= right; right *= values[i]; } return out; },
        cases: [
            ['4 1 2 3 4', '[24,12,8,6]', 'Each output multiplies the values on both sides of its position.'],
            ['3 0 5 0', '[0,0,0]', 'Two zeros ensure that every excluded-position product still contains a zero.'],
            ['2 -3 7', '[7,-3]', 'For two entries, each result is simply the other entry.'],
            ['5 2 0 -1 4 3', '[0,-24,0,0,0]', 'Excluding the only zero at index one leaves -24 there; other products contain zero.']
        ]
    },
    {
        id: 'ch-010', title: 'First Balanced Index', category: 'arrays', difficulty: 'medium',
        description: 'Return the smallest index whose strictly earlier values sum to the strictly later values. The value at the candidate index belongs to neither side; return -1 if none exists.',
        args: [['values', 'array']], result: 'int', fn: 'firstBalancedIndex',
        constraints: '1 <= n <= 200000; -10^9 <= values[i] <= 10^9; sums fit signed 64-bit.',
        hints: ['Compute the total once, then maintain the sum to the left.', 'At index i, the right sum is total minus left minus values[i].', 'Check indices from left to right to return the smallest valid one.'],
        editorial: 'Sum all entries, then scan while maintaining leftSum. At each index compare leftSum with total-leftSum-values[i], returning immediately on equality. Add the current value to leftSum only after the check. The method is O(n) time and O(1) extra space.',
        plan: 'Compare the maintained left sum with total minus left sum and the current value.',
        solve: values => { const total = values.reduce((a, b) => a + b, 0); let left = 0; for (let i = 0; i < values.length; i++) { if (left === total - left - values[i]) return i; left += values[i]; } return -1; },
        cases: [
            ['6 1 7 3 6 5 6', '3', 'At index 3, the left and right sides both sum to 11.'],
            ['3 2 1 2', '1', 'Index 1 has a left sum of 2 and a right sum of 2.'],
            ['1 9', '0', 'The empty left and right sides both sum to zero.'],
            ['4 1 2 3 10', '-1', 'No index divides the values into equal outside sums.']
        ]
    },
    {
        id: 'ch-011', title: 'Inclusive Range Total', category: 'arrays', difficulty: 'medium',
        description: 'Return the sum of sequence entries from inclusive index left through inclusive index right.',
        args: [['values', 'array'], ['left', 'int'], ['right', 'int']], result: 'long', fn: 'inclusiveRangeTotal',
        constraints: '1 <= n <= 200000; 0 <= left <= right < n; -10^9 <= values[i] <= 10^9.',
        hints: ['A direct scan of the requested interval is already linear in its length.', 'For a prefix-sum solution, define prefix[i] as the sum before index i.', 'Then subtract the prefix before left from the prefix after right.'],
        editorial: 'Build a prefix array with prefix[0]=0 and prefix[i+1]=prefix[i]+values[i]. The inclusive interval sum is prefix[right+1]-prefix[left]. Precomputation takes O(n) time and space; each query is O(1), so this interface is ready for repeated queries as well.',
        plan: 'Build exclusive prefix totals and subtract the boundary before left from that after right.',
        solve: (values, left, right) => values.slice(left, right + 1).reduce((a, b) => a + b, 0),
        cases: [
            ['5 3 1 4 1 5 1 3', '6', 'Indices 1 through 3 contain 1, 4, and 1, summing to 6.'],
            ['4 -2 7 -3 6 0 3', '8', 'The full inclusive range sums to -2 + 7 - 3 + 6 = 8.'],
            ['3 8 0 -5 2 2', '-5', 'A single-index interval returns the value at index 2.'],
            ['5 4 4 4 4 4 4 4', '4', 'The final index alone contributes four.']
        ]
    },
    {
        id: 'ch-012', title: 'Circular Next Greater Values', category: 'arrays', difficulty: 'medium',
        description: 'For each position, find the first strictly greater value encountered by scanning forward, wrapping around at most once. Use -1 if no such value exists.',
        args: [['values', 'array']], result: 'array', fn: 'circularNextGreater',
        constraints: '1 <= n <= 200000; -10^9 <= values[i] <= 10^9.',
        hints: ['An unresolved index is waiting for a future greater value.', 'A monotone stack can hold unresolved indices, not just values.', 'Two passes expose wrapped candidates; do not push indices on the second pass.'],
        editorial: 'Scan indices over two copies of the circular order. Maintain indices whose answer is unknown in a decreasing-value stack; a current value resolves and pops all smaller stack tops. Push each original index only on the first pass. Every index is pushed and popped at most once, giving O(n) time and O(n) space.',
        plan: 'Resolve a decreasing stack of unanswered indices during two circular scans.',
        solve: values => { const out = Array(values.length).fill(-1); const stack = []; for (let i = 0; i < 2 * values.length; i++) { const index = i % values.length; while (stack.length && values[stack[stack.length - 1]] < values[index]) out[stack.pop()] = values[index]; if (i < values.length) stack.push(index); } return out; },
        cases: [
            ['5 1 2 1 3 2', '[2,3,3,-1,3]', 'The final 2 wraps to the initial 1, but only values strictly larger resolve an index.'],
            ['3 5 5 5', '[-1,-1,-1]', 'Equal values are not greater, even after wrapping.'],
            ['1 -4', '[-1]', 'The sole element has no different greater candidate.'],
            ['4 1 2 3 0', '[2,3,-1,1]', 'The first three values resolve to their next larger entries; the final zero wraps to one.']
        ]
    },
    {
        id: 'ch-013', title: 'Shortest Unsorted Repair', category: 'arrays', difficulty: 'medium',
        description: 'Return the length of the shortest contiguous interval which, if sorted in nondecreasing order, makes the whole sequence nondecreasing. Return zero when it is already sorted.',
        args: [['values', 'array']], result: 'int', fn: 'shortestUnsortedRepair',
        constraints: '1 <= n <= 200000; -10^9 <= values[i] <= 10^9.',
        hints: ['The left boundary is the first violation while scanning forward.', 'A suffix minimum can show whether a value is too large for its position.', 'After locating boundaries, return their inclusive length.'],
        editorial: 'Find the first index where values[i] exceeds its successor and the last index where it is below its predecessor. If there is no such pair, return zero. Compute the min and max inside this provisional interval, then extend left while preceding values exceed the interval minimum and right while following values are below its maximum. The scan is O(n) time and O(1) space.',
        plan: 'Find the disorder boundaries, then expand them to include values crossed by the interval minimum and maximum.',
        solve: values => { let left = 0; let right = values.length - 1; while (left < right && values[left] <= values[left + 1]) left++; if (left === right) return 0; while (right > left && values[right] >= values[right - 1]) right--; let low = Infinity; let high = -Infinity; for (let i = left; i <= right; i++) { low = Math.min(low, values[i]); high = Math.max(high, values[i]); } while (left > 0 && values[left - 1] > low) left--; while (right < values.length - 1 && values[right + 1] < high) right++; return right - left + 1; },
        cases: [
            ['6 2 6 4 8 10 9', '5', 'Sorting indices 1 through 5 repairs the misplaced 6 and 9.'],
            ['4 1 2 3 4', '0', 'The entire input is already nondecreasing.'],
            ['5 1 3 2 2 2', '4', 'The equal 2 values extend the needed interval through the final index.'],
            ['3 3 2 1', '3', 'Every position is needed to sort the descending sequence.']
        ]
    },
    {
        id: 'ch-014', title: 'Maximum Fixed-Width Window Sum', category: 'arrays', difficulty: 'medium',
        description: 'Find the greatest sum among all contiguous windows of a specified width.',
        args: [['values', 'array'], ['width', 'int']], result: 'long', fn: 'maximumWindowSum',
        constraints: '1 <= width <= n <= 200000; -10^9 <= values[i] <= 10^9.',
        hints: ['Compute the first window sum directly.', 'Moving one step removes the outgoing value and adds the incoming one.', 'Initialize the best value from a real window so all-negative inputs work.'],
        editorial: 'Sum the first width entries, then slide the window one position at a time by subtracting its outgoing value and adding its incoming value. Update the maximum after each move. Each entry is touched a constant number of times: O(n) time and O(1) auxiliary space.',
        plan: 'Initialize one complete window and slide by removing one value and adding the next.',
        solve: (values, width) => { let sum = values.slice(0, width).reduce((a, b) => a + b, 0); let best = sum; for (let i = width; i < values.length; i++) { sum += values[i] - values[i - width]; best = Math.max(best, sum); } return best; },
        cases: [
            ['6 2 5 1 3 2 6 4', '12', 'The window [1,3,2,6] has the greatest sum, twelve.'],
            ['4 3 -7 -2 -5 2', '-4', 'The first width-two window sums to -4, higher than the later all-negative windows.'],
            ['3 9 -2 5 3', '12', 'The only width-three window sums to twelve.'],
            ['5 1 2 3 4 5 1', '5', 'A width-one window selects the largest individual entry.']
        ]
    },
    {
        id: 'ch-015', title: 'Maximum-Sum Subrectangle', category: 'arrays', difficulty: 'hard',
        description: 'In a rectangular integer grid, find the greatest sum obtainable from any nonempty axis-aligned rectangular submatrix.',
        args: [['grid', 'matrix']], result: 'long', fn: 'maximumSubrectangle',
        constraints: '1 <= rows, columns <= 120; -10^6 <= grid[r][c] <= 10^6; at least one cell exists.',
        hints: ['Fix two row boundaries and collapse the cells between them into column sums.', 'For each collapsed row band, solve a one-dimensional maximum subarray problem.', 'Use a running best that can start at a negative value; an empty rectangle is forbidden.'],
        editorial: 'Choose every top row and extend the bottom row downward, maintaining each column’s sum for that band. Run Kadane’s recurrence over those column sums and update the global best. This takes O(rows²·columns) time and O(columns) auxiliary space; if columns are the larger dimension, transpose first to square the smaller dimension.',
        plan: 'Collapse each pair of row boundaries into column totals, then apply nonempty Kadane to each band.',
        solve: grid => { if (grid.length > grid[0].length) grid = grid[0].map((_, c) => grid.map(row => row[c])); const rows = grid.length; const cols = grid[0].length; let best = -Infinity; for (let top = 0; top < rows; top++) { const sums = Array(cols).fill(0); for (let bottom = top; bottom < rows; bottom++) { for (let c = 0; c < cols; c++) sums[c] += grid[bottom][c]; let run = sums[0]; best = Math.max(best, run); for (let c = 1; c < cols; c++) { run = Math.max(sums[c], run + sums[c]); best = Math.max(best, run); } } } return best; },
        cases: [
            ['3 3 1 -2 3 4 5 -6 -2 3 2', '10', 'Rows one and two across the first two columns sum to 4 + 5 - 2 + 3 = 10.'],
            ['2 2 -8 -3 -5 -9', '-3', 'Every cell is negative, so the best nonempty rectangle is the single cell -3.'],
            ['1 5 2 -1 4 -2 3', '6', 'In the single row, the complete sequence sums to six and is the best segment.'],
            ['3 1 -2 5 -1', '5', 'A one-column grid reduces to a maximum subarray; the top two cells sum to three, and the middle cell alone is five.']
        ]
    },
    {
        id: 'ch-016', title: 'Reverse a Word', category: 'strings', difficulty: 'easy',
        description: 'Given one nonempty lowercase word, return a new string containing its characters in reverse order without dropping repeated letters.',
        args: [['word', 'string']], result: 'string', fn: 'reverseWord',
        constraints: '1 <= word.length <= 200000; word contains lowercase English letters only.',
        hints: ['The output length is unchanged.', 'The last input character becomes the first output character.', 'A two-pointer swap gives an in-place approach when mutation is allowed.'],
        editorial: 'Return the characters in reverse order, either by traversing backward into a new buffer or by swapping the ends inward. Both approaches take O(n) time; a new output buffer uses O(n) space, while in-place swaps use O(1) auxiliary space.',
        plan: 'Construct the word from its final character back to its first.',
        solve: word => [...word].reverse().join(''),
        cases: [
            ['career', 'reerac', 'The character order is reversed while all six characters are preserved.'],
            ['a', 'a', 'Reversing a single character leaves it unchanged.'],
            ['level', 'level', 'This word is already symmetric, so its reversal matches the input.'],
            ['abcdef', 'fedcba', 'The first and last characters exchange ends, as do each interior pair.']
        ]
    },
    {
        id: 'ch-017', title: 'First Nonrepeating Letter Index', category: 'strings', difficulty: 'easy',
        description: 'Return the zero-based index of the earliest lowercase letter that occurs exactly once. Return -1 if every letter repeats.',
        args: [['word', 'string']], result: 'int', fn: 'firstUniqueIndex',
        constraints: '1 <= word.length <= 200000; word contains lowercase English letters only.',
        hints: ['A frequency pass can summarize every letter before choosing an index.', 'A second left-to-right pass enforces earliest-position semantics.', 'Do not confuse the first letter with the first letter that is unique.'],
        editorial: 'Count each of the 26 lowercase letters, then scan the word from index zero and return the first index whose letter count is one. If none qualifies, return -1. The alphabet is fixed, so the method is O(n) time and O(1) auxiliary space.',
        plan: 'Count letters first, then scan again for the earliest count of one.',
        solve: word => { const counts = Array(26).fill(0); for (const ch of word) counts[ch.charCodeAt(0) - 97]++; return [...word].findIndex(ch => counts[ch.charCodeAt(0) - 97] === 1); },
        cases: [
            ['swiss', '1', 'The first s repeats, while w at index 1 occurs once.'],
            ['aabb', '-1', 'Both a and b occur twice, so there is no unique position.'],
            ['z', '0', 'The sole character occurs exactly once at index zero.'],
            ['abacdd', '1', 'The first a repeats; b at index 1 is the earliest unique letter.']
        ]
    },
    {
        id: 'ch-018', title: 'Count Lowercase Vowels', category: 'strings', difficulty: 'easy',
        description: 'Count occurrences of a, e, i, o, and u in a lowercase English word. Repeated vowels count repeatedly.',
        args: [['word', 'string']], result: 'int', fn: 'countVowels',
        constraints: '1 <= word.length <= 200000; word contains lowercase English letters only.',
        hints: ['Each character can be classified independently.', 'Use a membership set for the five vowel symbols.', 'Count occurrences, not distinct vowel types.'],
        editorial: 'Traverse the word and increment the count whenever the character belongs to the vowel set {a,e,i,o,u}. Each position is checked once, giving O(n) time; the fixed membership set and counter use O(1) space.',
        plan: 'Check each character against the five-vowel membership set and count every match.',
        solve: word => [...word].filter(ch => 'aeiou'.includes(ch)).length,
        cases: [
            ['education', '5', 'The vowels e, u, a, i, and o contribute five occurrences.'],
            ['rhythm', '0', 'No character in this word is one of the five specified vowels.'],
            ['queue', '4', 'The repeated u contributes twice, alongside e and the final e.'],
            ['banana', '3', 'Each of the three a characters is counted separately.']
        ]
    },
    {
        id: 'ch-019', title: 'Exact Word Palindrome', category: 'strings', difficulty: 'easy',
        description: 'Determine whether a lowercase word reads identically from left to right and right to left. Every character is significant.',
        args: [['word', 'string']], result: 'int', fn: 'isExactPalindrome',
        constraints: '1 <= word.length <= 200000; word contains lowercase English letters only.',
        hints: ['Compare symmetric positions rather than building a reversed copy.', 'A mismatch in either half is enough to reject the word.', 'An odd center character has no partner and needs no comparison.'],
        editorial: 'Compare word[i] with word[n-1-i] for each i in the first half, returning zero on the first mismatch and one if all pairs match. This uses O(n) time and O(1) extra space.',
        plan: 'Compare mirrored character pairs until a mismatch or the midpoint.',
        solve: word => { for (let i = 0; i < Math.floor(word.length / 2); i++) if (word[i] !== word[word.length - 1 - i]) return 0; return 1; },
        cases: [
            ['racecar', '1', 'Every mirrored pair matches around the center c.'],
            ['career', '0', 'The outer characters c and r differ immediately.'],
            ['a', '1', 'A single character has no mismatching mirrored pair.'],
            ['abca', '0', 'The inner mirrored characters b and c differ.']
        ]
    },
    {
        id: 'ch-020', title: 'Longest Distinct-Character Span', category: 'strings', difficulty: 'medium',
        description: 'Return the length of the longest contiguous substring in which no character occurs more than once.',
        args: [['word', 'string']], result: 'int', fn: 'longestDistinctSpan',
        constraints: '1 <= word.length <= 200000; word contains lowercase English letters only.',
        hints: ['Maintain a window with no duplicate characters.', 'When a character repeats inside the window, move the left boundary past its previous position.', 'Store last-seen indices so each boundary only moves forward.'],
        editorial: 'Track the most recent index for each character and a left boundary. On a repeated character whose last occurrence is inside the current window, advance left to one past that index. Update the maximum width at each position. This is O(n) time and O(1) space for the fixed alphabet.',
        plan: 'Use last-seen positions to move the left edge beyond any repeated character.',
        solve: word => { const last = Array(26).fill(-1); let left = 0; let best = 0; for (let i = 0; i < word.length; i++) { const c = word.charCodeAt(i) - 97; left = Math.max(left, last[c] + 1); last[c] = i; best = Math.max(best, i - left + 1); } return best; },
        cases: [
            ['abcabcbb', '3', 'The longest duplicate-free spans include abc, with length three.'],
            ['bbbb', '1', 'Each repeated b forces the window to contain only one b.'],
            ['dvdf', '3', 'After the second d, the window d f has length two; v d f later reaches three.'],
            ['abcaef', '5', 'The suffix bcaef has five distinct characters.']
        ]
    },
    {
        id: 'ch-021', title: 'Run-Length Word Encoding', category: 'strings', difficulty: 'medium',
        description: 'Encode each maximal run as its lowercase character followed by the run length, including length one. For example, aab becomes a2b1.',
        args: [['word', 'string']], result: 'string', fn: 'encodeRuns',
        constraints: '1 <= word.length <= 200000; word contains lowercase English letters only.',
        hints: ['A run ends when the next character differs or the word ends.', 'Count equal adjacent letters before appending one encoded pair.', 'Include the count even for a run of length one.'],
        editorial: 'Walk through maximal equal-character runs, count each run, and append its character plus the decimal count. The scan is O(n); the encoded output needs O(n) space in the worst case.',
        plan: 'Identify each maximal same-letter run and append its letter and full decimal length.',
        solve: word => { let out = ''; for (let i = 0; i < word.length;) { let j = i + 1; while (j < word.length && word[j] === word[i]) j++; out += word[i] + String(j - i); i = j; } return out; },
        cases: [
            ['aabccc', 'a2b1c3', 'Three runs encode as a2, b1, and c3.'],
            ['xyz', 'x1y1z1', 'Each distinct adjacent letter forms a run of length one.'],
            ['aaaa', 'a4', 'All four characters belong to one run.'],
            ['abbaa', 'a1b2a2', 'The matching a characters at the ends are separate runs.']
        ]
    },
    {
        id: 'ch-022', title: 'Exactly One Edit Apart', category: 'strings', difficulty: 'medium',
        description: 'Return one if two lowercase words differ by exactly one insertion, deletion, or substitution; otherwise return zero. Identical words are not one edit apart.',
        args: [['first', 'string'], ['second', 'string']], result: 'int', fn: 'exactlyOneEditApart',
        constraints: '1 <= first.length, second.length <= 200000; both words contain lowercase English letters.',
        hints: ['A length difference greater than one rules out a single edit.', 'For equal lengths, count substitutions at corresponding positions.', 'For lengths differing by one, advance the shorter pointer only when characters mismatch.'],
        editorial: 'If lengths match, count differing positions and accept exactly one. Otherwise, order the strings by length, reject a gap above one, and use two pointers to skip at most one character in the longer word. Finish by accepting one unmatched trailing character when present. Time is O(n+m); auxiliary space is O(1).',
        plan: 'Separate equal-length substitutions from one-character insertion/deletion with two pointers.',
        solve: (first, second) => { if (Math.abs(first.length - second.length) > 1) return 0; if (first.length === second.length) { let edits = 0; for (let i = 0; i < first.length; i++) if (first[i] !== second[i]) edits++; return edits === 1 ? 1 : 0; } const short = first.length < second.length ? first : second; const long = first.length < second.length ? second : first; let i = 0; let j = 0; let skipped = 0; while (i < short.length && j < long.length) { if (short[i] === long[j]) { i++; j++; } else { skipped++; j++; if (skipped > 1) return 0; } } return 1; },
        cases: [
            ['pale ple', '1', 'Removing a from pale produces ple with one deletion.'],
            ['book back', '0', 'Two positions differ, so one substitution cannot make them equal.'],
            ['cat cats', '1', 'The longer word has one trailing character.'],
            ['same same', '0', 'No edit is needed, but the requirement is exactly one edit.']
        ]
    },
    {
        id: 'ch-023', title: 'Shared Word Prefix', category: 'strings', difficulty: 'medium',
        description: 'Return the longest prefix shared by every supplied lowercase word. Return a dash when the common prefix is empty.',
        args: [['words', 'words']], result: 'string', fn: 'sharedPrefix',
        constraints: '1 <= word count <= 100000; 1 <= each word length <= 1000; total characters <= 200000.',
        hints: ['The common prefix cannot be longer than the shortest word.', 'Compare characters at each position across all words.', 'Stop immediately when any word ends or differs.'],
        editorial: 'Use the first word as a candidate and advance a shared length while every other word has the same character at that position. Return that prefix, or the agreed dash marker if the length is zero. The scan is O(total input characters) in the worst case and O(1) extra space beyond the output.',
        plan: 'Extend a common-prefix length while every word has the same character at that position.',
        solve: words => { let length = 0; while (length < words[0].length && words.every(word => length < word.length && word[length] === words[0][length])) length++; return length ? words[0].slice(0, length) : '-'; },
        cases: [
            ['3 flower flow flight', 'fl', 'All three words start with f and l, then disagree.'],
            ['2 dog race', '-', 'The first letters differ, leaving no nonempty shared prefix.'],
            ['1 prefix', 'prefix', 'With one supplied word, the whole word is the shared prefix.'],
            ['3 inter internet internal', 'inter', 'All three words share inter; their following characters differ or the first word ends.']
        ]
    },
    {
        id: 'ch-024', title: 'Shortest Required Character Cover', category: 'strings', difficulty: 'hard',
        description: 'Find the shortest substring of a lowercase source word containing every character of a nonempty pattern with its required multiplicity. Break equal-length ties by the earliest starting index; return a dash if no cover exists.',
        args: [['source', 'string'], ['pattern', 'string']], result: 'string', fn: 'shortestCharacterCover',
        constraints: '1 <= pattern.length <= source.length <= 200000; both strings contain lowercase English letters.',
        hints: ['Count required copies per character; a set is insufficient when the pattern repeats letters.', 'Expand a right edge until all required counts are met.', 'Once valid, shrink the left edge while preserving validity and update only on a strictly shorter span to retain earliest ties.'],
        editorial: 'Maintain required and present frequency arrays and a count of pattern characters currently satisfied. Advance the right edge, then while all required multiplicities are met, record the candidate and remove the left character to seek a tighter window. Keeping the earliest candidate on equal lengths implements tie-breaking. Time is O(n+m), space O(1) for the lowercase alphabet.',
        plan: 'Grow a frequency-count window until it covers the pattern, then shrink it while still valid.',
        solve: (source, pattern) => { const need = Array(26).fill(0); for (const ch of pattern) need[ch.charCodeAt(0) - 97]++; const have = Array(26).fill(0); let formed = 0; let left = 0; let bestStart = -1; let bestLength = Infinity; for (let right = 0; right < source.length; right++) { const c = source.charCodeAt(right) - 97; have[c]++; if (need[c] && have[c] <= need[c]) formed++; while (formed === pattern.length) { const len = right - left + 1; if (len < bestLength) { bestLength = len; bestStart = left; } const d = source.charCodeAt(left++) - 97; if (need[d] && have[d] <= need[d]) formed--; have[d]--; } } return bestStart < 0 ? '-' : source.slice(bestStart, bestStart + bestLength); },
        cases: [
            ['aaabcbc cba', 'abc', 'The substring abc contains one each of c, b, and a and has minimum width three.'],
            ['abac cab', 'bac', 'The substring bac is the shortest span containing c, a, and b.'],
            ['aaaa aa', 'aa', 'Two copies are required, so the shortest valid window has width two.'],
            ['abc d', '-', 'The required d never appears in the source.']
        ]
    },
    {
        id: 'ch-025', title: 'Distinct Subsequence Ways', category: 'strings', difficulty: 'hard',
        description: 'Count the index selections that spell a target word as a subsequence of a source word. Selected positions must increase; different index selections count separately.',
        args: [['source', 'string'], ['target', 'string']], result: 'long', fn: 'countSubsequenceWays',
        constraints: '1 <= target.length <= source.length <= 2000; both words contain lowercase English letters; the answer is at most 2^53-1.',
        hints: ['The answer for a source prefix either uses its final character or skips it.', 'Update target-prefix counts from right to left so one source position is not reused.', 'A one-dimensional DP needs target length plus one states.'],
        editorial: 'Let dp[j] count ways to match the first j target characters using the source prefix processed so far; initialize dp[0]=1. For each source character, traverse j downward and add dp[j-1] when the characters match. Descending order prevents reusing the current source character. Time is O(nm), space O(m).',
        plan: 'Update target-prefix counts backward for each source character to avoid reusing positions.',
        solve: (source, target) => { const dp = Array(target.length + 1).fill(0); dp[0] = 1; for (const ch of source) for (let j = target.length; j >= 1; j--) if (target[j - 1] === ch) dp[j] += dp[j - 1]; return dp[target.length]; },
        cases: [
            ['babgbag bag', '5', 'Five different triples of source indices spell bag.'],
            ['aaaa aa', '6', 'Choosing any two of four a positions gives six subsequences.'],
            ['abc ac', '1', 'Only source positions zero and two spell ac in order.'],
            ['abc d', '0', 'No source position matches d, so no target selection is possible.']
        ]
    },
    {
        id: 'ch-026', title: 'Duplicate Value Present', category: 'hashing', difficulty: 'easy',
        description: 'Return one if an integer sequence contains any value at least twice, otherwise return zero.',
        args: [['values', 'array']], result: 'int', fn: 'containsDuplicateValue',
        constraints: '1 <= n <= 200000; -10^9 <= values[i] <= 10^9.',
        hints: ['A repeated value is detectable when it is seen for a second time.', 'A hash set remembers prior values without sorting.', 'Return immediately when insertion finds an existing value.'],
        editorial: 'Insert values into a hash set as you scan. If the current value is already present, report one; if the scan completes, report zero. Expected time is O(n) with O(n) space; sorting offers deterministic O(n log n) time.',
        plan: 'Insert values into a set and stop when an insertion encounters a prior value.',
        solve: values => { const seen = new Set(); for (const value of values) { if (seen.has(value)) return 1; seen.add(value); } return 0; },
        cases: [
            ['5 4 1 7 1 9', '1', 'The second occurrence of 1 proves a duplicate exists.'],
            ['4 -3 0 8 2', '0', 'Every value is distinct despite signs and zero.'],
            ['1 6', '0', 'A single value cannot repeat.'],
            ['6 5 5 2 3 4 5', '1', 'The duplicate is found immediately in the first two positions.']
        ]
    },
    {
        id: 'ch-027', title: 'Strict Majority Value', category: 'hashing', difficulty: 'easy',
        description: 'Return the value occurring more than floor(n/2) times, or -1 if no strict majority exists. Input values are nonnegative, so -1 is an unambiguous absence marker.',
        args: [['values', 'array']], result: 'int', fn: 'strictMajority',
        constraints: '1 <= n <= 200000; 0 <= values[i] <= 10^9.',
        hints: ['A candidate can be found with a cancellation balance.', 'Cancellation identifies a possible winner but does not prove its frequency.', 'Verify the candidate with a second pass.'],
        editorial: 'Use Boyer-Moore cancellation to find a candidate in one pass, then count its occurrences and accept only if the count exceeds n/2. This takes O(n) time and O(1) auxiliary space, including the mandatory verification needed when no majority exists.',
        plan: 'Find a cancellation candidate, then verify its frequency exceeds half the sequence.',
        solve: values => { let candidate = 0; let balance = 0; for (const value of values) { if (balance === 0) candidate = value; balance += value === candidate ? 1 : -1; } return values.filter(value => value === candidate).length > Math.floor(values.length / 2) ? candidate : -1; },
        cases: [
            ['5 2 2 1 2 3', '2', 'The value 2 appears three times, more than half of five.'],
            ['4 1 2 1 2', '-1', 'Both values occur twice, so neither strictly exceeds half.'],
            ['1 0', '0', 'The only value occurs once, which is a strict majority of one.'],
            ['6 4 4 4 2 3 4', '4', 'Four occurs four times, exceeding the threshold of three.']
        ]
    },
    {
        id: 'ch-028', title: 'First Value Seen Twice', category: 'hashing', difficulty: 'easy',
        description: 'Scan an integer sequence from left to right and return the value whose second occurrence appears earliest. Return -1 when no value repeats.',
        args: [['values', 'array']], result: 'int', fn: 'firstSecondArrival',
        constraints: '1 <= n <= 200000; 0 <= values[i] <= 10^9.',
        hints: ['The requested order is determined by the second arrival, not the value magnitude.', 'A set records whether the current value appeared earlier.', 'Stop at the first failed insertion.'],
        editorial: 'Maintain a set of previously encountered values. On each item, return it immediately if it is already present; otherwise insert it. The earliest second arrival is found in expected O(n) time and O(n) space.',
        plan: 'Scan left to right and return the first value already present in the seen set.',
        solve: values => { const seen = new Set(); for (const value of values) { if (seen.has(value)) return value; seen.add(value); } return -1; },
        cases: [
            ['6 4 2 7 2 4 7', '2', 'The second 2 arrives before the second 4 or second 7.'],
            ['4 1 3 5 7', '-1', 'No value arrives a second time.'],
            ['2 9 9', '9', 'The second item is the first repeated arrival.'],
            ['5 8 1 8 1 8', '8', 'The repeat of 8 occurs at index 2 before the repeat of 1.']
        ]
    },
    {
        id: 'ch-029', title: 'Index-Pair Sum Count', category: 'hashing', difficulty: 'easy',
        description: 'Count unordered pairs of distinct indices whose values sum to a target. Equal values at different indices form valid pairs.',
        args: [['values', 'array'], ['target', 'int']], result: 'long', fn: 'countIndexPairs',
        constraints: '1 <= n <= 200000; -10^9 <= values[i], target <= 10^9; answer fits signed 64-bit.',
        hints: ['When visiting a value x, its complement is target-x.', 'Only previously visited values can form a pair with the current index.', 'Store frequencies, since several earlier indices may share the complement.'],
        editorial: 'Scan once with a frequency map. For each x, add the existing frequency of target-x to the pair count, then increment the frequency of x. This counts each index pair exactly once at its later endpoint, in expected O(n) time and O(n) space.',
        plan: 'Add the number of earlier complements before recording the current value frequency.',
        solve: (values, target) => { const freq = new Map(); let count = 0; for (const value of values) { count += freq.get(target - value) || 0; freq.set(value, (freq.get(value) || 0) + 1); } return count; },
        cases: [
            ['4 1 5 7 -1 6', '2', 'The pairs (1,5) and (7,-1) each use distinct positions and sum to six.'],
            ['4 3 3 3 3 6', '6', 'Every choice of two of the four 3s forms a distinct index pair.'],
            ['3 2 -1 8 7', '1', 'Only the values -1 and 8 sum to the target seven.'],
            ['5 0 0 0 0 0 0', '10', 'Five zeroes produce ten unordered pairs of distinct indices.']
        ]
    },
    {
        id: 'ch-030', title: 'Largest Anagram Class', category: 'hashing', difficulty: 'medium',
        description: 'Given lowercase words, return the size of the largest group whose words have identical character multiplicities. Words with repeated letters must preserve those counts.',
        args: [['words', 'words']], result: 'int', fn: 'largestAnagramClass',
        constraints: '1 <= word count <= 100000; each word has 1..100 lowercase letters; total characters <= 200000.',
        hints: ['An anagram signature must represent multiplicity, not just character presence.', 'Sorting each word gives a canonical signature.', 'Count signatures and keep the largest group frequency.'],
        editorial: 'Sort the characters in each word to form a canonical key, then count how often each key occurs in a hash map. The largest count is the answer. Sorting costs O(L log L) per word, for O(sum L log L) time and O(sum L) stored signature space.',
        plan: 'Canonicalize each word by its sorted letters, then tally matching signatures.',
        solve: words => { const groups = new Map(); let best = 0; for (const word of words) { const key = [...word].sort().join(''); const count = (groups.get(key) || 0) + 1; groups.set(key, count); best = Math.max(best, count); } return best; },
        cases: [
            ['6 eat tea tan ate nat bat', '3', 'eat, tea, and ate share one signature, the largest group.'],
            ['4 abc bca cab xyz', '3', 'The first three words are anagrams; xyz forms a singleton group.'],
            ['1 solo', '1', 'One input word forms a group of size one.'],
            ['5 a aa a aa aaa', '2', 'The two single-letter words share a class and the two double-letter words share another.']
        ]
    },
    {
        id: 'ch-031', title: 'Longest Zero-Sum Segment', category: 'hashing', difficulty: 'medium',
        description: 'Return the maximum length of a contiguous segment whose sum is zero. Return zero if no nonempty segment has zero sum.',
        args: [['values', 'array']], result: 'int', fn: 'longestZeroSumSegment',
        constraints: '0 <= n <= 200000; -10^9 <= values[i] <= 10^9.',
        hints: ['Equal prefix sums mark the values between them as a zero-sum segment.', 'Store the earliest index for each prefix sum to maximize the span.', 'Treat the prefix before the array as sum zero at index -1.'],
        editorial: 'Set the first-seen index of prefix sum zero to -1. As each value updates the prefix, if it has been seen, compute the distance from its earliest index; otherwise store the current index. The longest span is found in expected O(n) time and O(n) space.',
        plan: 'Remember the earliest index for each prefix sum and measure spans when a sum repeats.',
        solve: values => { const first = new Map([[0, -1]]); let sum = 0; let best = 0; for (let i = 0; i < values.length; i++) { sum += values[i]; if (first.has(sum)) best = Math.max(best, i - first.get(sum)); else first.set(sum, i); } return best; },
        cases: [
            ['6 1 2 -3 1 2 -3', '6', 'The whole sequence sums to zero, so its full length is attainable.'],
            ['3 2 4 6', '0', 'No prefix sum repeats, so no nonempty zero-sum segment exists.'],
            ['4 0 0 1 -1', '4', 'The entire sequence sums to zero and spans four values.'],
            ['5 3 1 2 4 -4', '2', 'The final pair 4,-4 is a zero-sum segment.']
        ]
    },
    {
        id: 'ch-032', title: 'Count Segments at Target', category: 'hashing', difficulty: 'medium',
        description: 'Count all contiguous segments whose sum equals a target, including segments in arrays with negative values.',
        args: [['values', 'array'], ['target', 'int']], result: 'long', fn: 'countHashedTargetSegments',
        constraints: '1 <= n <= 200000; -10^9 <= values[i], target <= 10^9; answer fits signed 64-bit.',
        hints: ['Negative values invalidate the usual expand-only sliding window.', 'For each prefix sum, count earlier prefixes differing by target.', 'Initialize prefix zero with one occurrence to include segments starting at index zero.'],
        editorial: 'Maintain a map from prefix sums to their occurrence counts, initially {0:1}. After adding each value to the running sum, add the frequency of runningSum-target to the answer, then record the new prefix. This is expected O(n) time and O(n) space.',
        plan: 'Count matching earlier prefix sums before adding the current prefix to its frequency.',
        solve: (values, target) => { const seen = new Map([[0, 1]]); let sum = 0; let total = 0; for (const value of values) { sum += value; total += seen.get(sum - target) || 0; seen.set(sum, (seen.get(sum) || 0) + 1); } return total; },
        cases: [
            ['5 1 1 1 1 1 2', '4', 'Four adjacent pairs have sum two.'],
            ['4 1 -1 0 2 0', '3', 'The target-zero segments include [1,-1], the standalone zero, and [1,-1,0].'],
            ['3 2 3 4 9', '1', 'Only the first two values sum to the target five.'],
            ['4 0 0 0 0 0', '10', 'All ten nonempty segments of four zeroes sum to zero.']
        ]
    },
    {
        id: 'ch-033', title: 'Longest Consecutive Value Set', category: 'hashing', difficulty: 'medium',
        description: 'Return the length of the longest set of consecutive integer values present, regardless of their positions or duplicates.',
        args: [['values', 'array']], result: 'int', fn: 'longestConsecutiveSet',
        constraints: '0 <= n <= 200000; -10^9 <= values[i] <= 10^9.',
        hints: ['Duplicates do not extend a run.', 'Only start a scan from a value whose predecessor is absent.', 'The set allows consecutive membership tests without sorting.'],
        editorial: 'Build a set of distinct values. For each value with no predecessor in the set, walk upward through consecutive values and measure the run; retain the maximum. Each value participates in at most one forward walk, so expected time is O(n) and space is O(n).',
        plan: 'Start a consecutive walk only at values whose immediate predecessor is absent.',
        solve: values => { const set = new Set(values); let best = 0; for (const value of set) { if (!set.has(value - 1)) { let end = value; while (set.has(end + 1)) end++; best = Math.max(best, end - value + 1); } } return best; },
        cases: [
            ['6 100 4 200 1 3 2', '4', 'The consecutive values 1, 2, 3, 4 form the longest run.'],
            ['5 8 8 8 8 8', '1', 'Duplicates collapse to one distinct value.'],
            ['0', '0', 'An empty sequence contains no consecutive run.'],
            ['6 -3 -2 0 1 2 9', '3', 'The longest run is 0, 1, 2; negative neighbors are not required.']
        ]
    },
    {
        id: 'ch-034', title: 'Shortest Multiset Cover Length', category: 'hashing', difficulty: 'hard',
        description: 'Given a candidate sequence and a required multiset, return the shortest contiguous candidate span containing every required value with its required multiplicity. Return -1 if no span can satisfy the requirement.',
        args: [['values', 'array'], ['required', 'array']], result: 'int', fn: 'shortestMultisetCover',
        constraints: '1 <= values.length <= 200000; 1 <= required.length <= 200000; values fit signed 32-bit integers.',
        hints: ['Count required copies of each integer in a hash map.', 'Expand the right boundary while tracking how many required copies are currently satisfied.', 'When the multiset is covered, advance the left edge until coverage would be lost.'],
        editorial: 'Build required frequencies and track how many required occurrences are currently matched as a sliding window expands. Once all required occurrences are covered, update the shortest length and remove values from the left until one needed count falls short. Hash maps support arbitrary integers. The two pointers move O(n) times, for expected O(n+m) time and O(m) space.',
        plan: 'Track required multiplicities in a window, shrinking whenever all required copies are covered.',
        solve: (values, required) => { const need = new Map(); for (const value of required) need.set(value, (need.get(value) || 0) + 1); const have = new Map(); let matched = 0; let left = 0; let best = Infinity; for (let right = 0; right < values.length; right++) { const value = values[right]; if (need.has(value)) { have.set(value, (have.get(value) || 0) + 1); if (have.get(value) <= need.get(value)) matched++; } while (matched === required.length) { best = Math.min(best, right - left + 1); const drop = values[left++]; if (need.has(drop)) { if (have.get(drop) <= need.get(drop)) matched--; have.set(drop, have.get(drop) - 1); } } } return best === Infinity ? -1 : best; },
        cases: [
            ['8 7 5 9 5 1 5 9 7 3 5 9 7', '3', 'The span [7,5,9] contains the required 5, 9, and 7 in three positions.'],
            ['5 1 2 2 4 5 2 2 2', '2', 'The two adjacent copies of 2 meet the required multiplicity in length two.'],
            ['4 1 2 3 4 2 9 9', '-1', 'Only one copy of required value 9 appears, so the two-copy requirement cannot be met.'],
            ['6 -1 4 -1 2 4 2 2 -1 2', '2', 'The adjacent values -1 and 2 meet the one-copy requirement for each.']
        ]
    },
    {
        id: 'ch-035', title: 'Subarrays Divisible by a Modulus', category: 'hashing', difficulty: 'hard',
        description: 'Count contiguous nonempty segments whose sum is divisible by a positive modulus. Values may be negative.',
        args: [['values', 'array'], ['modulus', 'int']], result: 'long', fn: 'countDivisibleSegments',
        constraints: '1 <= n <= 200000; 1 <= modulus <= 10^9; -10^9 <= values[i] <= 10^9; answer fits signed 64-bit.',
        hints: ['Two prefix sums produce a divisible segment when they have the same remainder.', 'Normalize negative remainders into the range zero through modulus minus one.', 'A remainder seen f times contributes f new segments when it appears again.'],
        editorial: 'Maintain the prefix remainder modulo k and a frequency table seeded with remainder zero once. Normalize each remainder to be nonnegative; add its prior frequency to the answer, then increment it. Equal prefix remainders delimit sums divisible by k. This takes expected O(n) time and O(min(n,k)) space.',
        plan: 'Count normalized prefix remainders; each repeated remainder contributes all prior matching boundaries.',
        solve: (values, modulus) => { const freq = new Map([[0, 1]]); let remainder = 0; let total = 0; for (const value of values) { remainder = ((remainder + value) % modulus + modulus) % modulus; total += freq.get(remainder) || 0; freq.set(remainder, (freq.get(remainder) || 0) + 1); } return total; },
        cases: [
            ['6 4 5 0 5 1 2 3', '7', 'Seven nonempty segments have sums divisible by four, including zero-sum boundaries.'],
            ['4 -1 2 9 -3 3', '3', 'The final three normalized prefix remainders match, producing three divisible segments.'],
            ['3 1 4 -2 1', '6', 'The modulus is one, so all six nonempty segments are divisible.'],
            ['5 7 7 7 7 7 7', '15', 'Every segment of five values is divisible by seven, giving 5·6/2 segments.']
        ]
    }
];

const typeNames = {
    array: 'n followed by n integers',
    int: 'one integer',
    string: 'one lowercase word',
    words: 'n followed by n lowercase words',
    matrix: 'row count, column count, then row-major integer entries'
};

const solutionBodies = {
    'ch-001': {
        python: 'return sum(x > limit for x in values)',
        java: 'int count = 0; for (int x : values) if (x > limit) count++; return count;',
        cpp: 'long long count = 0; for (int x : values) if (x > limit) ++count; return count;'
    },
    'ch-002': {
        python: 'k = steps % len(values)\n    return values[k:] + values[:k]',
        java: 'int k = steps % values.length; long[] out = new long[values.length]; for (int i = 0; i < out.length; i++) out[i] = values[(i + k) % values.length]; return out;',
        cpp: 'int k = steps % (int)values.size(); vector<long long> out(values.size()); for (int i = 0; i < (int)out.size(); ++i) out[i] = values[(i + k) % values.size()]; return out;'
    },
    'ch-003': {
        python: 'out = []\n    total = 0\n    for value in values:\n        total += value\n        out.append(total)\n    return out',
        java: 'long[] out = new long[values.length]; long sum = 0; for (int i = 0; i < values.length; i++) out[i] = sum += values[i]; return out;',
        cpp: 'vector<long long> out(values.size()); long long sum = 0; for (size_t i = 0; i < values.size(); ++i) out[i] = sum += values[i]; return out;'
    },
    'ch-004': {
        python: 'low = float("inf")\n    best = 0\n    for price in prices:\n        best = max(best, price - low)\n        low = min(low, price)\n    return best',
        java: 'long low = Long.MAX_VALUE, best = 0; for (int p : prices) { best = Math.max(best, p - low); low = Math.min(low, p); } return best;',
        cpp: 'long long low = LLONG_MAX, best = 0; for (int p : prices) { best = max(best, (long long)p - low); low = min(low, (long long)p); } return best;'
    },
    'ch-005': {
        python: 'out = []\n    i = j = 0\n    while i < len(first) and j < len(second):\n        if first[i] <= second[j]: out.append(first[i]); i += 1\n        else: out.append(second[j]); j += 1\n    return out + first[i:] + second[j:]',
        java: 'long[] out = new long[first.length + second.length]; int i = 0, j = 0, k = 0; while (i < first.length && j < second.length) out[k++] = first[i] <= second[j] ? first[i++] : second[j++]; while (i < first.length) out[k++] = first[i++]; while (j < second.length) out[k++] = second[j++]; return out;',
        cpp: 'vector<long long> out; size_t i = 0, j = 0; while (i < first.size() && j < second.size()) out.push_back(first[i] <= second[j] ? first[i++] : second[j++]); while (i < first.size()) out.push_back(first[i++]); while (j < second.size()) out.push_back(second[j++]); return out;'
    },
    'ch-006': {
        python: 'present = set(values)\n    candidate = 0\n    while candidate in present: candidate += 1\n    return candidate',
        java: 'Set<Integer> set = new HashSet<>(); for (int x : values) set.add(x); int k = 0; while (set.contains(k)) k++; return k;',
        cpp: 'unordered_set<int> s(values.begin(), values.end()); int k = 0; while (s.count(k)) ++k; return k;'
    },
    'ch-007': {
        python: 'best = run = 1\n    for i in range(1, len(values)):\n        run = run + 1 if values[i] > values[i - 1] else 1\n        best = max(best, run)\n    return best',
        java: 'int run = 1, best = 1; for (int i = 1; i < values.length; i++) { run = values[i] > values[i - 1] ? run + 1 : 1; best = Math.max(best, run); } return best;',
        cpp: 'int run = 1, best = 1; for (int i = 1; i < (int)values.size(); ++i) { run = values[i] > values[i - 1] ? run + 1 : 1; best = max(best, run); } return best;'
    },
    'ch-008': {
        python: 'freq = {0: 1}\n    total = answer = 0\n    for value in values:\n        total += value\n        answer += freq.get(total - target, 0)\n        freq[total] = freq.get(total, 0) + 1\n    return answer',
        java: 'Map<Long, Long> f = new HashMap<>(); f.put(0L, 1L); long sum = 0, answer = 0; for (int x : values) { sum += x; answer += f.getOrDefault(sum - target, 0L); f.put(sum, f.getOrDefault(sum, 0L) + 1); } return answer;',
        cpp: 'unordered_map<long long, long long> f; f[0] = 1; long long sum = 0, answer = 0; for (int x : values) { sum += x; answer += f[sum - target]; ++f[sum]; } return answer;'
    },
    'ch-009': {
        python: 'out = [1] * len(values)\n    left = 1\n    for i, x in enumerate(values): out[i] = left; left *= x\n    right = 1\n    for i in range(len(values) - 1, -1, -1): out[i] *= right; right *= values[i]\n    return out',
        java: 'long[] out = new long[values.length]; long left = 1; for (int i = 0; i < values.length; i++) { out[i] = left; left *= values[i]; } long right = 1; for (int i = values.length - 1; i >= 0; i--) { out[i] *= right; right *= values[i]; } return out;',
        cpp: 'vector<long long> out(values.size(), 1); long long left = 1, right = 1; for (size_t i = 0; i < values.size(); ++i) { out[i] = left; left *= values[i]; } for (int i = (int)values.size() - 1; i >= 0; --i) { out[i] *= right; right *= values[i]; } return out;'
    },
    'ch-010': {
        python: 'total = sum(values)\n    left = 0\n    for i, x in enumerate(values):\n        if left == total - left - x: return i\n        left += x\n    return -1',
        java: 'long total = 0, left = 0; for (int x : values) total += x; for (int i = 0; i < values.length; i++) { if (left == total - left - values[i]) return i; left += values[i]; } return -1;',
        cpp: 'long long total = accumulate(values.begin(), values.end(), 0LL), left = 0; for (int i = 0; i < (int)values.size(); ++i) { if (left == total - left - values[i]) return i; left += values[i]; } return -1;'
    },
    'ch-011': {
        python: 'return sum(values[left:right + 1])',
        java: 'long sum = 0; for (int i = left; i <= right; i++) sum += values[i]; return sum;',
        cpp: 'long long sum = 0; for (int i = left; i <= right; ++i) sum += values[i]; return sum;'
    },
    'ch-012': {
        python: 'out = [-1] * len(values)\n    stack = []\n    for i in range(2 * len(values)):\n        j = i % len(values)\n        while stack and values[stack[-1]] < values[j]: out[stack.pop()] = values[j]\n        if i < len(values): stack.append(j)\n    return out',
        java: 'long[] out = new long[values.length]; Arrays.fill(out, -1); int[] stack = new int[values.length]; int top = 0, n = values.length; for (int i = 0; i < 2 * n; i++) { int j = i % n; while (top > 0 && values[stack[top - 1]] < values[j]) out[stack[--top]] = values[j]; if (i < n) stack[top++] = j; } return out;',
        cpp: 'vector<long long> out(values.size(), -1); vector<int> st; int n = values.size(); for (int i = 0; i < 2 * n; ++i) { int j = i % n; while (!st.empty() && values[st.back()] < values[j]) { out[st.back()] = values[j]; st.pop_back(); } if (i < n) st.push_back(j); } return out;'
    },
    'ch-013': {
        python: 'left, right = 0, len(values) - 1\n    while left < right and values[left] <= values[left + 1]: left += 1\n    if left == right: return 0\n    while values[right] >= values[right - 1]: right -= 1\n    low, high = min(values[left:right + 1]), max(values[left:right + 1])\n    while left and values[left - 1] > low: left -= 1\n    while right + 1 < len(values) and values[right + 1] < high: right += 1\n    return right - left + 1',
        java: 'int l = 0, r = values.length - 1; while (l < r && values[l] <= values[l + 1]) l++; if (l == r) return 0; while (values[r] >= values[r - 1]) r--; int lo = Integer.MAX_VALUE, hi = Integer.MIN_VALUE; for (int i = l; i <= r; i++) { lo = Math.min(lo, values[i]); hi = Math.max(hi, values[i]); } while (l > 0 && values[l - 1] > lo) l--; while (r + 1 < values.length && values[r + 1] < hi) r++; return r - l + 1;',
        cpp: 'int l = 0, r = values.size() - 1; while (l < r && values[l] <= values[l + 1]) ++l; if (l == r) return 0; while (values[r] >= values[r - 1]) --r; int lo = INT_MAX, hi = INT_MIN; for (int i = l; i <= r; ++i) { lo = min(lo, values[i]); hi = max(hi, values[i]); } while (l && values[l - 1] > lo) --l; while (r + 1 < (int)values.size() && values[r + 1] < hi) ++r; return r - l + 1;'
    },
    'ch-014': {
        python: 'total = sum(values[:width])\n    best = total\n    for i in range(width, len(values)):\n        total += values[i] - values[i - width]\n        best = max(best, total)\n    return best',
        java: 'long sum = 0; for (int i = 0; i < width; i++) sum += values[i]; long best = sum; for (int i = width; i < values.length; i++) { sum += values[i] - values[i - width]; best = Math.max(best, sum); } return best;',
        cpp: 'long long sum = accumulate(values.begin(), values.begin() + width, 0LL), best = sum; for (int i = width; i < (int)values.size(); ++i) { sum += values[i] - values[i - width]; best = max(best, sum); } return best;'
    },
    'ch-015': {
        python: 'if len(grid) > len(grid[0]): grid = [list(row) for row in zip(*grid)]\n    rows, cols = len(grid), len(grid[0])\n    best = -float("inf")\n    for top in range(rows):\n        sums = [0] * cols\n        for bottom in range(top, rows):\n            for c in range(cols): sums[c] += grid[bottom][c]\n            run = sums[0]; best = max(best, run)\n            for value in sums[1:]: run = max(value, run + value); best = max(best, run)\n    return best',
        java: 'int[][] a = grid; int rows = a.length, cols = a[0].length; if (rows > cols) { int[][] t = new int[cols][rows]; for (int i = 0; i < rows; i++) for (int j = 0; j < cols; j++) t[j][i] = a[i][j]; a = t; rows = a.length; cols = a[0].length; } long best = Long.MIN_VALUE; for (int top = 0; top < rows; top++) { long[] sums = new long[cols]; for (int bottom = top; bottom < rows; bottom++) { for (int c = 0; c < cols; c++) sums[c] += a[bottom][c]; long run = sums[0]; best = Math.max(best, run); for (int c = 1; c < cols; c++) { run = Math.max(sums[c], run + sums[c]); best = Math.max(best, run); } } } return best;',
        cpp: 'int rows = grid.size(), cols = grid[0].size(); if (rows > cols) { vector<vector<int>> t(cols, vector<int>(rows)); for (int i = 0; i < rows; ++i) for (int j = 0; j < cols; ++j) t[j][i] = grid[i][j]; grid = t; rows = grid.size(); cols = grid[0].size(); } long long best = LLONG_MIN; for (int top = 0; top < rows; ++top) { vector<long long> sums(cols); for (int bottom = top; bottom < rows; ++bottom) { for (int c = 0; c < cols; ++c) sums[c] += grid[bottom][c]; long long run = sums[0]; best = max(best, run); for (int c = 1; c < cols; ++c) { run = max(sums[c], run + sums[c]); best = max(best, run); } } } return best;'
    },
    'ch-016': {
        python: 'return word[::-1]',
        java: 'return new StringBuilder(word).reverse().toString();',
        cpp: 'reverse(word.begin(), word.end()); return word;'
    },
    'ch-017': {
        python: 'counts = [0] * 26\n    for ch in word: counts[ord(ch) - 97] += 1\n    return next((i for i, ch in enumerate(word) if counts[ord(ch) - 97] == 1), -1)',
        java: 'int[] count = new int[26]; for (char c : word.toCharArray()) count[c - 97]++; for (int i = 0; i < word.length(); i++) if (count[word.charAt(i) - 97] == 1) return i; return -1;',
        cpp: 'int count[26] = {}; for (char c : word) ++count[c - 97]; for (int i = 0; i < (int)word.size(); ++i) if (count[word[i] - 97] == 1) return i; return -1;'
    },
    'ch-018': {
        python: 'return sum(ch in "aeiou" for ch in word)',
        java: 'int n = 0; for (char c : word.toCharArray()) if ("aeiou".indexOf(c) >= 0) n++; return n;',
        cpp: 'int n = 0; for (char c : word) if (string("aeiou").find(c) != string::npos) ++n; return n;'
    },
    'ch-019': {
        python: 'return int(word == word[::-1])',
        java: 'for (int i = 0, j = word.length() - 1; i < j; i++, j--) if (word.charAt(i) != word.charAt(j)) return 0; return 1;',
        cpp: 'for (int i = 0, j = word.size() - 1; i < j; ++i, --j) if (word[i] != word[j]) return 0; return 1;'
    },
    'ch-020': {
        python: 'last = [-1] * 26\n    left = best = 0\n    for i, ch in enumerate(word):\n        c = ord(ch) - 97\n        left = max(left, last[c] + 1)\n        last[c] = i\n        best = max(best, i - left + 1)\n    return best',
        java: 'int[] last = new int[26]; Arrays.fill(last, -1); int left = 0, best = 0; for (int i = 0; i < word.length(); i++) { int c = word.charAt(i) - 97; left = Math.max(left, last[c] + 1); last[c] = i; best = Math.max(best, i - left + 1); } return best;',
        cpp: 'int last[26]; fill(last, last + 26, -1); int left = 0, best = 0; for (int i = 0; i < (int)word.size(); ++i) { int c = word[i] - 97; left = max(left, last[c] + 1); last[c] = i; best = max(best, i - left + 1); } return best;'
    },
    'ch-021': {
        python: 'parts = []\n    i = 0\n    while i < len(word):\n        j = i + 1\n        while j < len(word) and word[j] == word[i]: j += 1\n        parts.append(word[i] + str(j - i))\n        i = j\n    return "".join(parts)',
        java: 'StringBuilder out = new StringBuilder(); for (int i = 0; i < word.length();) { int j = i + 1; while (j < word.length() && word.charAt(j) == word.charAt(i)) j++; out.append(word.charAt(i)).append(j - i); i = j; } return out.toString();',
        cpp: 'string out; for (int i = 0; i < (int)word.size();) { int j = i + 1; while (j < (int)word.size() && word[j] == word[i]) ++j; out += word[i] + to_string(j - i); i = j; } return out;'
    },
    'ch-022': {
        python: 'if abs(len(first) - len(second)) > 1: return 0\n    if len(first) == len(second): return int(sum(a != b for a, b in zip(first, second)) == 1)\n    short, long = sorted((first, second), key=len)\n    i = j = skipped = 0\n    while i < len(short) and j < len(long):\n        if short[i] == long[j]: i += 1; j += 1\n        else:\n            skipped += 1; j += 1\n            if skipped > 1: return 0\n    return 1',
        java: 'if (Math.abs(first.length() - second.length()) > 1) return 0; if (first.length() == second.length()) { int d = 0; for (int i = 0; i < first.length(); i++) if (first.charAt(i) != second.charAt(i)) d++; return d == 1 ? 1 : 0; } String a = first.length() < second.length() ? first : second, b = first.length() < second.length() ? second : first; int i = 0, j = 0, skipped = 0; while (i < a.length() && j < b.length()) { if (a.charAt(i) == b.charAt(j)) { i++; j++; } else { if (++skipped > 1) return 0; j++; } } return 1;',
        cpp: 'if (abs((int)first.size() - (int)second.size()) > 1) return 0; if (first.size() == second.size()) { int d = 0; for (int i = 0; i < (int)first.size(); ++i) d += first[i] != second[i]; return d == 1; } string a = first.size() < second.size() ? first : second, b = first.size() < second.size() ? second : first; int i = 0, j = 0, skipped = 0; while (i < (int)a.size() && j < (int)b.size()) { if (a[i] == b[j]) { ++i; ++j; } else { if (++skipped > 1) return 0; ++j; } } return 1;'
    },
    'ch-023': {
        python: 'prefix = words[0]\n    for word in words[1:]:\n        i = 0\n        while i < min(len(prefix), len(word)) and prefix[i] == word[i]: i += 1\n        prefix = prefix[:i]\n    return prefix or "-"',
        java: 'int len = words[0].length(); for (String w : words) { int i = 0; while (i < len && i < w.length() && words[0].charAt(i) == w.charAt(i)) i++; len = i; } return len == 0 ? "-" : words[0].substring(0, len);',
        cpp: 'int len = words[0].size(); for (const string &w : words) { int i = 0; while (i < len && i < (int)w.size() && words[0][i] == w[i]) ++i; len = i; } return len ? words[0].substr(0, len) : "-";'
    },
    'ch-024': {
        python: 'need = [0] * 26\n    for ch in pattern: need[ord(ch) - 97] += 1\n    have = [0] * 26\n    formed = left = 0\n    best_start, best_len = -1, len(source) + 1\n    for right, ch in enumerate(source):\n        c = ord(ch) - 97; have[c] += 1\n        if need[c] and have[c] <= need[c]: formed += 1\n        while formed == len(pattern):\n            width = right - left + 1\n            if width < best_len: best_start, best_len = left, width\n            d = ord(source[left]) - 97\n            if need[d] and have[d] <= need[d]: formed -= 1\n            have[d] -= 1; left += 1\n    return "-" if best_start < 0 else source[best_start:best_start + best_len]',
        java: 'int[] need = new int[26], have = new int[26]; for (char c : pattern.toCharArray()) need[c - 97]++; int formed = 0, left = 0, start = -1, best = source.length() + 1; for (int right = 0; right < source.length(); right++) { int c = source.charAt(right) - 97; have[c]++; if (need[c] > 0 && have[c] <= need[c]) formed++; while (formed == pattern.length()) { int len = right - left + 1; if (len < best) { best = len; start = left; } int d = source.charAt(left++) - 97; if (need[d] > 0 && have[d] <= need[d]) formed--; have[d]--; } } return start < 0 ? "-" : source.substring(start, start + best);',
        cpp: 'int need[26] = {}, have[26] = {}; for (char c : pattern) ++need[c - 97]; int formed = 0, left = 0, start = -1, best = source.size() + 1; for (int right = 0; right < (int)source.size(); ++right) { int c = source[right] - 97; ++have[c]; if (need[c] && have[c] <= need[c]) ++formed; while (formed == (int)pattern.size()) { int len = right - left + 1; if (len < best) best = len, start = left; int d = source[left++] - 97; if (need[d] && have[d] <= need[d]) --formed; --have[d]; } } return start < 0 ? "-" : source.substr(start, best);'
    },
    'ch-025': {
        python: 'dp = [0] * (len(target) + 1)\n    dp[0] = 1\n    for ch in source:\n        for j in range(len(target), 0, -1):\n            if target[j - 1] == ch: dp[j] += dp[j - 1]\n    return dp[-1]',
        java: 'long[] dp = new long[target.length() + 1]; dp[0] = 1; for (char c : source.toCharArray()) for (int j = target.length(); j > 0; j--) if (target.charAt(j - 1) == c) dp[j] += dp[j - 1]; return dp[target.length()];',
        cpp: 'vector<long long> dp(target.size() + 1); dp[0] = 1; for (char c : source) for (int j = target.size(); j > 0; --j) if (target[j - 1] == c) dp[j] += dp[j - 1]; return dp[target.size()];'
    },
    'ch-026': {
        python: 'return int(len(set(values)) < len(values))',
        java: 'Set<Integer> set = new HashSet<>(); for (int x : values) if (!set.add(x)) return 1; return 0;',
        cpp: 'unordered_set<int> s; for (int x : values) if (!s.insert(x).second) return 1; return 0;'
    },
    'ch-027': {
        python: 'candidate = balance = 0\n    for value in values:\n        if balance == 0: candidate = value\n        balance += 1 if value == candidate else -1\n    return candidate if values.count(candidate) > len(values) // 2 else -1',
        java: 'int candidate = 0, balance = 0; for (int x : values) { if (balance == 0) candidate = x; balance += x == candidate ? 1 : -1; } int count = 0; for (int x : values) if (x == candidate) count++; return count > values.length / 2 ? candidate : -1;',
        cpp: 'int candidate = 0, balance = 0; for (int x : values) { if (!balance) candidate = x; balance += x == candidate ? 1 : -1; } int count = 0; for (int x : values) count += x == candidate; return count > (int)values.size() / 2 ? candidate : -1;'
    },
    'ch-028': {
        python: 'seen = set()\n    for value in values:\n        if value in seen: return value\n        seen.add(value)\n    return -1',
        java: 'Set<Integer> seen = new HashSet<>(); for (int x : values) if (!seen.add(x)) return x; return -1;',
        cpp: 'unordered_set<int> seen; for (int x : values) if (!seen.insert(x).second) return x; return -1;'
    },
    'ch-029': {
        python: 'freq = {}\n    answer = 0\n    for value in values:\n        answer += freq.get(target - value, 0)\n        freq[value] = freq.get(value, 0) + 1\n    return answer',
        java: 'Map<Integer, Long> freq = new HashMap<>(); long answer = 0; for (int x : values) { answer += freq.getOrDefault(target - x, 0L); freq.put(x, freq.getOrDefault(x, 0L) + 1); } return answer;',
        cpp: 'unordered_map<int, long long> freq; long long answer = 0; for (int x : values) { answer += freq[target - x]; ++freq[x]; } return answer;'
    },
    'ch-030': {
        python: 'freq = {}\n    for word in words:\n        key = "".join(sorted(word))\n        freq[key] = freq.get(key, 0) + 1\n    return max(freq.values())',
        java: 'Map<String, Integer> freq = new HashMap<>(); int best = 0; for (String w : words) { char[] a = w.toCharArray(); Arrays.sort(a); int n = freq.getOrDefault(new String(a), 0) + 1; freq.put(new String(a), n); best = Math.max(best, n); } return best;',
        cpp: 'unordered_map<string, int> freq; int best = 0; for (string w : words) { sort(w.begin(), w.end()); best = max(best, ++freq[w]); } return best;'
    },
    'ch-031': {
        python: 'first = {0: -1}\n    total = best = 0\n    for i, value in enumerate(values):\n        total += value\n        if total in first: best = max(best, i - first[total])\n        else: first[total] = i\n    return best',
        java: 'Map<Long, Integer> first = new HashMap<>(); first.put(0L, -1); long sum = 0; int best = 0; for (int i = 0; i < values.length; i++) { sum += values[i]; if (first.containsKey(sum)) best = Math.max(best, i - first.get(sum)); else first.put(sum, i); } return best;',
        cpp: 'unordered_map<long long, int> first; first[0] = -1; long long sum = 0; int best = 0; for (int i = 0; i < (int)values.size(); ++i) { sum += values[i]; if (first.count(sum)) best = max(best, i - first[sum]); else first[sum] = i; } return best;'
    },
    'ch-032': {
        python: 'freq = {0: 1}\n    total = answer = 0\n    for value in values:\n        total += value\n        answer += freq.get(total - target, 0)\n        freq[total] = freq.get(total, 0) + 1\n    return answer',
        java: 'Map<Long, Long> f = new HashMap<>(); f.put(0L, 1L); long sum = 0, answer = 0; for (int x : values) { sum += x; answer += f.getOrDefault(sum - target, 0L); f.put(sum, f.getOrDefault(sum, 0L) + 1); } return answer;',
        cpp: 'unordered_map<long long, long long> f; f[0] = 1; long long sum = 0, answer = 0; for (int x : values) { sum += x; answer += f[sum - target]; ++f[sum]; } return answer;'
    },
    'ch-033': {
        python: 'present = set(values)\n    best = 0\n    for value in present:\n        if value - 1 not in present:\n            end = value\n            while end + 1 in present: end += 1\n            best = max(best, end - value + 1)\n    return best',
        java: 'Set<Integer> set = new HashSet<>(); for (int x : values) set.add(x); int best = 0; for (int x : set) if (!set.contains(x - 1)) { int end = x; while (set.contains(end + 1)) end++; best = Math.max(best, end - x + 1); } return best;',
        cpp: 'unordered_set<int> s(values.begin(), values.end()); int best = 0; for (int x : s) if (!s.count(x - 1)) { int end = x; while (s.count(end + 1)) ++end; best = max(best, end - x + 1); } return best;'
    },
    'ch-034': {
        python: 'need = {}\n    for x in required: need[x] = need.get(x, 0) + 1\n    have = {}; matched = left = 0; best = len(values) + 1\n    for right, x in enumerate(values):\n        if x in need:\n            have[x] = have.get(x, 0) + 1\n            if have[x] <= need[x]: matched += 1\n        while matched == len(required):\n            best = min(best, right - left + 1)\n            drop = values[left]; left += 1\n            if drop in need:\n                if have[drop] <= need[drop]: matched -= 1\n                have[drop] -= 1\n    return -1 if best > len(values) else best',
        java: 'Map<Integer, Integer> need = new HashMap<>(), have = new HashMap<>(); for (int x : required) need.put(x, need.getOrDefault(x, 0) + 1); int matched = 0, left = 0, best = values.length + 1; for (int right = 0; right < values.length; right++) { int x = values[right]; if (need.containsKey(x)) { int n = have.getOrDefault(x, 0) + 1; have.put(x, n); if (n <= need.get(x)) matched++; } while (matched == required.length) { best = Math.min(best, right - left + 1); int d = values[left++]; if (need.containsKey(d)) { int n = have.get(d); if (n <= need.get(d)) matched--; have.put(d, n - 1); } } } return best > values.length ? -1 : best;',
        cpp: 'unordered_map<int, int> need, have; for (int x : required) ++need[x]; int matched = 0, left = 0, best = values.size() + 1; for (int right = 0; right < (int)values.size(); ++right) { int x = values[right]; if (need.count(x)) { int n = ++have[x]; if (n <= need[x]) ++matched; } while (matched == (int)required.size()) { best = min(best, right - left + 1); int d = values[left++]; if (need.count(d)) { if (have[d] <= need[d]) --matched; --have[d]; } } } return best > (int)values.size() ? -1 : best;'
    },
    'ch-035': {
        python: 'freq = {0: 1}\n    rem = answer = 0\n    for value in values:\n        rem = (rem + value) % modulus\n        answer += freq.get(rem, 0)\n        freq[rem] = freq.get(rem, 0) + 1\n    return answer',
        java: 'Map<Integer, Long> f = new HashMap<>(); f.put(0, 1L); long answer = 0; int rem = 0; for (int x : values) { rem = (int)(((long)rem + x) % modulus); if (rem < 0) rem += modulus; answer += f.getOrDefault(rem, 0L); f.put(rem, f.getOrDefault(rem, 0L) + 1); } return answer;',
        cpp: 'unordered_map<int, long long> f; f[0] = 1; long long answer = 0; int rem = 0; for (int x : values) { rem = ((long long)rem + x) % modulus; if (rem < 0) rem += modulus; answer += f[rem]; ++f[rem]; } return answer;'
    }
};

function parseArguments(spec, stdin) {
    const tokens = stdin.trim().split(/\s+/);
    let position = 0;
    const nextInt = () => Number(tokens[position++]);
    const args = spec.args.map(([, type]) => {
        if (type === 'int') return nextInt();
        if (type === 'string') return tokens[position++];
        if (type === 'array') {
            const length = nextInt();
            return Array.from({ length }, nextInt);
        }
        if (type === 'words') {
            const length = nextInt();
            return tokens.slice(position, position += length);
        }
        const rows = nextInt();
        const columns = nextInt();
        return Array.from({ length: rows }, () => Array.from({ length: columns }, nextInt));
    });
    if (position !== tokens.length) throw new Error(`Unexpected trailing input for ${spec.id}`);
    return args;
}

function formatResult(value) {
    return Array.isArray(value) ? JSON.stringify(value) : String(value);
}

function starterFor(spec) {
    const args = spec.args.map(([name]) => name);
    const pyType = { int: 'int', array: 'list[int]', string: 'str', words: 'list[str]', matrix: 'list[list[int]]' };
    const javaType = { int: 'int', array: 'int[]', string: 'String', words: 'String[]', matrix: 'int[][]' };
    const cppType = { int: 'int', array: 'vector<int>', string: 'string', words: 'vector<string>', matrix: 'vector<vector<int>>' };
    const parser = { int: 'readInt', array: 'readIntArray', string: 'readWord', words: 'readWords', matrix: 'readMatrix' };
    const pyRead = spec.args.map(([name, type]) => `${name} = ${parser[type]}()`).join('\n');
    const javaRead = spec.args.map(([name, type]) => `        ${javaType[type]} ${name} = ${parser[type]}();`).join('\n');
    const cppRead = spec.args.map(([name, type]) => `    ${cppType[type]} ${name} = ${parser[type]}();`).join('\n');
    const call = args.join(', ');
    const body = solutionBodies[spec.id];
    if (!body) throw new Error(`Missing language implementations for ${spec.id}`);
    const javaReturn = spec.result === 'array' ? 'long[]' : spec.result === 'string' ? 'String' : 'long';
    const cppReturn = spec.result === 'array' ? 'vector<long long>' : spec.result === 'string' ? 'string' : 'long long';
    const pythonBody = body.python;
    const javascriptBody = `return (${spec.solve.toString()})(${call});`;
    const python = `import sys\n\ntokens = sys.stdin.read().split()\npos = 0\ndef readInt():\n    global pos\n    value = int(tokens[pos]); pos += 1\n    return value\ndef readWord():\n    global pos\n    value = tokens[pos]; pos += 1\n    return value\ndef readIntArray():\n    n = readInt()\n    return [readInt() for _ in range(n)]\ndef readWords():\n    n = readInt()\n    return [readWord() for _ in range(n)]\ndef readMatrix():\n    rows, cols = readInt(), readInt()\n    return [[readInt() for _ in range(cols)] for _ in range(rows)]\n\ndef ${spec.fn}(${spec.args.map(([name, type]) => `${name}: ${pyType[type]}`).join(', ')}) -> ${spec.result === 'array' ? 'list[int]' : spec.result === 'string' ? 'str' : 'int'}:\n    ${pythonBody}\n\n${pyRead}\nresult = ${spec.fn}(${call})\nprint(__import__('json').dumps(result, separators=(',', ':')) if isinstance(result, list) else result)\n`;
    const java = `import java.util.*;\n\npublic class Main {\n    static Scanner scanner = new Scanner(System.in);\n    static int readInt() { return scanner.nextInt(); }\n    static String readWord() { return scanner.next(); }\n    static int[] readIntArray() { int n = readInt(); int[] a = new int[n]; for (int i = 0; i < n; i++) a[i] = readInt(); return a; }\n    static String[] readWords() { int n = readInt(); String[] a = new String[n]; for (int i = 0; i < n; i++) a[i] = readWord(); return a; }\n    static int[][] readMatrix() { int r = readInt(), c = readInt(); int[][] a = new int[r][c]; for (int i = 0; i < r; i++) for (int j = 0; j < c; j++) a[i][j] = readInt(); return a; }\n\n    static ${javaReturn} ${spec.fn}(${spec.args.map(([name, type]) => `${javaType[type]} ${name}`).join(', ')}) {\n        ${body.java}\n    }\n\n    public static void main(String[] args) {\n${javaRead}\n        Object result = ${spec.fn}(${call});\n        if (result instanceof long[]) System.out.println(Arrays.toString((long[]) result).replace(\" \", \"\"));\n        else System.out.println(result);\n    }\n}\n`;
    const cpp = `#include <bits/stdc++.h>\nusing namespace std;\nint readInt() { int x; cin >> x; return x; }\nstring readWord() { string s; cin >> s; return s; }\nvector<int> readIntArray() { int n = readInt(); vector<int> a(n); for (int &x : a) x = readInt(); return a; }\nvector<string> readWords() { int n = readInt(); vector<string> a(n); for (string &s : a) s = readWord(); return a; }\nvector<vector<int>> readMatrix() { int r = readInt(), c = readInt(); vector<vector<int>> a(r, vector<int>(c)); for (auto &row : a) for (int &x : row) x = readInt(); return a; }\n\n${cppReturn} ${spec.fn}(${spec.args.map(([name, type]) => `${cppType[type]} ${name}`).join(', ')}) {\n    ${body.cpp}\n}\n\nint main() {\n${cppRead}\n    auto result = ${spec.fn}(${call});\n    ${spec.result === 'array' ? 'cout << \"[\"; for (size_t i = 0; i < result.size(); ++i) { if (i) cout << \",\"; cout << result[i]; } cout << \"]\\n\";' : 'cout << result << \"\\n\";'}\n}\n`;
    const javascript = `const fs = require('fs');\nconst tokens = fs.readFileSync(0, 'utf8').trim().split(/\\s+/);\nlet pos = 0;\nconst readInt = () => Number(tokens[pos++]);\nconst readWord = () => tokens[pos++];\nconst readIntArray = () => Array.from({ length: readInt() }, readInt);\nconst readWords = () => Array.from({ length: readInt() }, readWord);\nconst readMatrix = () => { const rows = readInt(), cols = readInt(); return Array.from({ length: rows }, () => Array.from({ length: cols }, readInt)); };\n\nfunction ${spec.fn}(${call}) {\n    ${javascriptBody}\n}\n\n${spec.args.map(([name, type]) => `const ${name} = ${parser[type]}();`).join('\n')}\nconst result = ${spec.fn}(${call});\nconsole.log(Array.isArray(result) ? JSON.stringify(result) : result);\n`;
    const guidance = spec.plan.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    const pythonStarter = `import json\nimport sys\n\ntokens = sys.stdin.read().split()\npos = 0\ndef readInt():\n    global pos\n    value = int(tokens[pos]); pos += 1\n    return value\ndef readWord():\n    global pos\n    value = tokens[pos]; pos += 1\n    return value\ndef readIntArray():\n    n = readInt()\n    return [readInt() for _ in range(n)]\ndef readWords():\n    n = readInt()\n    return [readWord() for _ in range(n)]\ndef readMatrix():\n    rows, cols = readInt(), readInt()\n    return [[readInt() for _ in range(cols)] for _ in range(rows)]\n\ndef ${spec.fn}(${spec.args.map(([name, type]) => `${name}: ${pyType[type]}`).join(', ')}):\n    # ${guidance}\n        raise RuntimeError("${spec.fn}: learner implementation required")\n\n${pyRead}\nanswer = ${spec.fn}(${call})\nprint(json.dumps(answer, separators=(',', ':')) if isinstance(answer, list) else answer)\n`;
    const javaStarter = `import java.util.*;\n\npublic class Main {\n    static Scanner scanner = new Scanner(System.in);\n    static int readInt() { return scanner.nextInt(); }\n    static String readWord() { return scanner.next(); }\n    static int[] readIntArray() { int n = readInt(); int[] a = new int[n]; for (int i = 0; i < n; i++) a[i] = readInt(); return a; }\n    static String[] readWords() { int n = readInt(); String[] a = new String[n]; for (int i = 0; i < n; i++) a[i] = readWord(); return a; }\n    static int[][] readMatrix() { int r = readInt(), c = readInt(); int[][] a = new int[r][c]; for (int i = 0; i < r; i++) for (int j = 0; j < c; j++) a[i][j] = readInt(); return a; }\n\n    static ${javaReturn} ${spec.fn}(${spec.args.map(([name, type]) => `${javaType[type]} ${name}`).join(', ')}) {\n        // ${guidance}\n            throw new UnsupportedOperationException("${spec.fn}: learner implementation required");\n    }\n\n    public static void main(String[] args) {\n${javaRead}\n        Object answer = ${spec.fn}(${call});\n        if (answer instanceof long[]) System.out.println(Arrays.toString((long[]) answer).replace(\" \", \"\"));\n        else System.out.println(answer);\n    }\n}\n`;
    const cppStarter = `#include <bits/stdc++.h>\nusing namespace std;\nint readInt() { int x; cin >> x; return x; }\nstring readWord() { string s; cin >> s; return s; }\nvector<int> readIntArray() { int n = readInt(); vector<int> a(n); for (int &x : a) x = readInt(); return a; }\nvector<string> readWords() { int n = readInt(); vector<string> a(n); for (string &s : a) s = readWord(); return a; }\nvector<vector<int>> readMatrix() { int r = readInt(), c = readInt(); vector<vector<int>> a(r, vector<int>(c)); for (auto &row : a) for (int &x : row) x = readInt(); return a; }\n\n${cppReturn} ${spec.fn}(${spec.args.map(([name, type]) => `${cppType[type]} ${name}`).join(', ')}) {\n    // ${guidance}\n        throw logic_error("${spec.fn}: learner implementation required");\n}\n\nint main() {\n${cppRead}\n    auto answer = ${spec.fn}(${call});\n    ${spec.result === 'array' ? 'cout << \"[\"; for (size_t i = 0; i < answer.size(); ++i) { if (i) cout << \",\"; cout << answer[i]; } cout << \"]\\n\";' : 'cout << answer << \"\\n\";'}\n}\n`;
    const javascriptStarter = `const fs = require('fs');\nconst tokens = fs.readFileSync(0, 'utf8').trim().split(/\\s+/);\nlet pos = 0;\nconst readInt = () => Number(tokens[pos++]);\nconst readWord = () => tokens[pos++];\nconst readIntArray = () => Array.from({ length: readInt() }, readInt);\nconst readWords = () => Array.from({ length: readInt() }, readWord);\nconst readMatrix = () => { const rows = readInt(), cols = readInt(); return Array.from({ length: rows }, () => Array.from({ length: cols }, readInt)); };\n\nfunction ${spec.fn}(${call}) {\n    // ${guidance}\n        throw new Error(${JSON.stringify(`${spec.fn}: learner implementation required`)});\n}\n\n${spec.args.map(([name, type]) => `const ${name} = ${parser[type]}();`).join('\n')}\nconst answer = ${spec.fn}(${call});\nconsole.log(Array.isArray(answer) ? JSON.stringify(answer) : answer);\n`;
    return {
        starterCode: { python: pythonStarter, java: javaStarter, cpp: cppStarter, javascript: javascriptStarter },
        referenceCode: { python, java, cpp, javascript }
    };
}

const catalog = specifications.map((spec, index) => {
    const cases = spec.cases.map(([stdin, expectedOutput, explanation], index) => ({
        stdin,
        expectedOutput,
        explanation,
        isHidden: index >= 2
    }));
    return {
        id: spec.id,
        title: spec.title,
        description: spec.description,
        category: spec.category,
        difficulty: spec.category === 'arrays'
            ? (index < 8 ? 'easy' : index < 14 ? 'medium' : 'hard')
            : spec.difficulty,
        inputFormat: `Whitespace-separated tokens in this order: ${spec.args.map(([name, type]) => `${name} (${typeNames[type]})`).join('; ')}. Array and word counts precede their entries; matrices start with row and column counts. Strings and words contain no whitespace.`,
        outputFormat: spec.result === 'array' ? 'One compact JSON array on a single line.' : spec.result === 'string' ? 'The answer word as raw text; a dash denotes an empty/no-answer result.' : 'One base-10 integer on a single line.',
        constraints: spec.constraints,
        examples: cases.slice(0, 2).map(test => ({ input: test.stdin, output: test.expectedOutput, explanation: test.explanation })),
        testCases: cases,
        hints: spec.hints,
        editorial: spec.editorial,
        timeComplexity: spec.id === 'ch-015' ? 'O(rows^2 * columns), or O(columns^2 * rows) after transposing to use the smaller dimension squared.' :
            (spec.id === 'ch-025' ? 'O(source length * target length).' :
                (spec.id === 'ch-030' ? 'O(sum of word lengths times the logarithm of each word length).' :
                    (spec.id === 'ch-034' || spec.id === 'ch-035' || spec.id === 'ch-008' || spec.id === 'ch-032' || spec.id === 'ch-029' ? 'Expected O(n) time.' : 'O(n) time.'))),
        spaceComplexity: spec.id === 'ch-015' ? 'O(columns) auxiliary space after choosing the squared dimension.' :
            (spec.id === 'ch-025' ? 'O(target length).' :
                (spec.id === 'ch-027' ? 'O(1) auxiliary space.' :
                (spec.id === 'ch-034' ? 'O(required multiset size).' :
                    (spec.category === 'hashing' || spec.id === 'ch-006' || spec.id === 'ch-008' || spec.id === 'ch-031' || spec.id === 'ch-032' || spec.id === 'ch-033' ? 'O(n) auxiliary space.' :
                        (spec.result === 'array' || spec.result === 'string' ? 'O(n) for the returned output.' : 'O(1) auxiliary space.'))))),
        functionSignature: `${spec.fn}(${spec.args.map(([name, type]) => `${name}: ${type}`).join(', ')}) -> ${spec.result}`,
        ...starterFor(spec),
        referenceSolver: stdin => formatResult(spec.solve(...parseArguments(spec, stdin)))
    };
});

module.exports = catalog;
