'use strict';

function referencePython(id, functionName) {
    const shared = `import collections, json, sys

def build_tree(encoded):
    if not encoded or encoded[0] is None:
        return None, []
    root = {"value": encoded[0], "left": None, "right": None, "index": 0}
    nodes = [root]
    queue = collections.deque([root])
    pos = 1
    while queue and pos < len(encoded):
        parent = queue.popleft()
        for side in ("left", "right"):
            if pos >= len(encoded):
                break
            value = encoded[pos]
            if value is not None:
                child = {"value": value, "left": None, "right": None, "index": pos}
                parent[side] = child
                nodes.append(child)
                queue.append(child)
            pos += 1
    return root, nodes

def inorder(root):
    result, stack = [], []
    node = root
    while stack or node:
        while node:
            stack.append(node)
            node = node["left"]
        node = stack.pop()
        result.append(node)
        node = node["right"]
    return result

`;
    const bodies = {
        'ch-059': '    return data[::-1]',
        'ch-060': '    result = []\n    for value in data:\n        if not result or result[-1] != value:\n            result.append(value)\n    return result',
        'ch-061': '    return data[len(data) // 2]',
        'ch-062': '    a, b = data["a"], data["b"]\n    i = j = 0\n    result = []\n    while i < len(a) and j < len(b):\n        if a[i] <= b[j]:\n            result.append(a[i]); i += 1\n        else:\n            result.append(b[j]); j += 1\n    return result + a[i:] + b[j:]',
        'ch-063': '    values, k = data["list"], data["k"]\n    return values[:len(values)-k] + values[len(values)-k+1:]',
        'ch-064': '    index = data["cycleAt"]\n    return None if index is None else data["values"][index]',
        'ch-065': '    values, k = data["list"], data["k"]\n    result = []\n    for start in range(0, len(values), k):\n        group = values[start:start+k]\n        result.extend(group[::-1] if len(group) == k else group)\n    return result',
        'ch-066': '    return {"values": list(data["values"]), "random": list(data["random"])}',
        'ch-067': '    pairs = {")": "(", "]": "[", "}": "{"}\n    stack = []\n    for char in data:\n        if char in "([{": stack.append(char)\n        elif char not in pairs or not stack or stack.pop() != pairs[char]: return False\n    return not stack',
        'ch-068': '    queue, result = collections.deque(), []\n    for command in data:\n        if command[0] == "enqueue": queue.append(command[1])\n        else: result.append(queue.popleft() if queue else None)\n    return result',
        'ch-069': '    values, minima, result = [], [], []\n    for command in data:\n        op = command[0]\n        if op == "push":\n            value = command[1]; values.append(value); minima.append(min(value, minima[-1] if minima else value))\n        elif op == "pop": result.append(values.pop()); minima.pop()\n        elif op == "peek": result.append(values[-1])\n        else: result.append(minima[-1])\n    return result',
        'ch-070': '    n = len(data); answer = [-1] * n; stack = []\n    for i in range(2*n):\n        value = data[i % n] if n else 0\n        while stack and data[stack[-1]] < value: answer[stack.pop()] = value\n        if i < n: stack.append(i)\n    return answer',
        'ch-071': '    stack = []\n    for token in data:\n        if token not in {"+", "-", "*", "/"}: stack.append(int(token)); continue\n        right, left = stack.pop(), stack.pop()\n        if token == "+": stack.append(left + right)\n        elif token == "-": stack.append(left - right)\n        elif token == "*": stack.append(left * right)\n        else: stack.append((abs(left) // abs(right)) * (-1 if (left < 0) != (right < 0) else 1))\n    return stack[-1]',
        'ch-072': '    answer = [0] * len(data); stack = []\n    for i, value in enumerate(data):\n        while stack and data[stack[-1]] < value:\n            previous = stack.pop()\n            answer[previous] = i - previous\n        stack.append(i)\n    return answer',
        'ch-073': '    values, k = data["values"], data["k"]\n    q, result = collections.deque(), []\n    for i, value in enumerate(values):\n        while q and q[0] <= i-k: q.popleft()\n        while q and values[q[-1]] <= value: q.pop()\n        q.append(i)\n        if i >= k-1: result.append(values[q[0]])\n    return result',
        'ch-074': '    stack, best = [], 0\n    for i, height in enumerate(data + [0]):\n        while stack and data[stack[-1]] > height:\n            h = data[stack.pop()]\n            width = i - (stack[-1] if stack else -1) - 1\n            best = max(best, h * width)\n        stack.append(i)\n    return best',
        'ch-075': '    root, _ = build_tree(data)\n    def depth(node): return 0 if node is None else 1 + max(depth(node["left"]), depth(node["right"]))\n    return depth(root)',
        'ch-076': '    root, _ = build_tree(data)\n    return [node["value"] for node in inorder(root)]',
        'ch-077': '    a, _ = build_tree(data["a"]); b, _ = build_tree(data["b"])\n    def same(x, y): return x is None and y is None or x is not None and y is not None and x["value"] == y["value"] and same(x["left"], y["left"]) and same(x["right"], y["right"])\n    return same(a, b)',
        'ch-078': '    root, _ = build_tree(data["tree"]); target = data["target"]\n    while root:\n        if root["value"] == target: return True\n        root = root["left"] if target < root["value"] else root["right"]\n    return False',
        'ch-079': '    root, _ = build_tree(data)\n    if root is None: return []\n    result, queue = [], collections.deque([root])\n    while queue:\n        row = []\n        for _ in range(len(queue)):\n            node = queue.popleft(); row.append(node["value"])\n            if node["left"]: queue.append(node["left"])\n            if node["right"]: queue.append(node["right"])\n        result.append(row)\n    return result',
        'ch-080': '    root, _ = build_tree(data)\n    def valid(node, low=None, high=None):\n        if node is None: return True\n        v = node["value"]\n        return (low is None or low < v) and (high is None or v < high) and valid(node["left"], low, v) and valid(node["right"], v, high)\n    return valid(root)',
        'ch-081': '    root, _ = build_tree(data["tree"]); k = data["k"]\n    for node in inorder(root):\n        k -= 1\n        if k == 0: return node["value"]',
        'ch-082': '    node, p, q = None, data["p"], data["q"]\n    node, _ = build_tree(data["tree"])\n    low, high = min(p, q), max(p, q)\n    while node:\n        if high < node["value"]: node = node["left"]\n        elif low > node["value"]: node = node["right"]\n        else: return node["value"]',
        'ch-083': '    root, _ = build_tree(data); best = -float("inf")\n    def gain(node):\n        nonlocal best\n        if node is None: return 0\n        left, right = max(0, gain(node["left"])), max(0, gain(node["right"]))\n        best = max(best, node["value"] + left + right)\n        return node["value"] + max(left, right)\n    gain(root)\n    return best',
        'ch-084': '    encoded = list(data); root, _ = build_tree(encoded); ordered = inorder(root)\n    first = second = previous = None\n    for node in ordered:\n        if previous is not None and previous["value"] > node["value"]:\n            if first is None: first = previous\n            second = node\n        previous = node\n    encoded[first["index"]], encoded[second["index"]] = encoded[second["index"]], encoded[first["index"]]\n    return encoded'
    };
    const body = bodies[id];
    if (!body) throw new Error(`Missing Python reference for ${id}`);
    return `${shared}def ${functionName}(data):\n${body}\n\ndata = json.loads(sys.stdin.read())\nanswer = ${functionName}(data)\nprint(json.dumps(answer, separators=(",", ":")))\n`;
}

function starterCode(functionName, editorial, category) {
    const guidance = editorial.replace(/\s+/g, ' ').trim();
    const parseSetup = category === 'trees-bst'
        ? 'treeData = data.get("tree", data) if isinstance(data, dict) else data\n    nodes = [] if not treeData or treeData[0] is None else [treeData[0]]'
        : category === 'linked-lists' ? 'values = data.get("list", data) if isinstance(data, dict) else data'
            : category === 'stacks-queues' ? 'operations = data'
                : 'parsedInput = data';
    const parser = `static class JsonReader {\n    private final String s; private int i=0;\n    JsonReader(String s){this.s=s;}\n    Object read(){ space(); Object v=value(); space(); if(i!=s.length()) throw new IllegalArgumentException("Trailing JSON"); return v; }\n    void space(){while(i<s.length()&&Character.isWhitespace(s.charAt(i)))i++;}\n    Object value(){ space(); if(i>=s.length())throw new IllegalArgumentException("Missing JSON value"); char c=s.charAt(i);\n        if(c=='['){i++; java.util.List<Object>a=new java.util.ArrayList<>();space();if(i<s.length()&&s.charAt(i)==']'){i++;return a;}while(true){a.add(value());space();char d=s.charAt(i++);if(d==']')return a;if(d!=',')throw new IllegalArgumentException("Expected comma");}}\n        if(c=='{'){i++;java.util.Map<String,Object>m=new java.util.LinkedHashMap<>();space();if(i<s.length()&&s.charAt(i)=='}'){i++;return m;}while(true){space();String k=(String)value();space();if(s.charAt(i++)!=':')throw new IllegalArgumentException("Expected colon");m.put(k,value());space();char d=s.charAt(i++);if(d=='}')return m;if(d!=',')throw new IllegalArgumentException("Expected comma");}}\n        if(c=='"'){i++;StringBuilder b=new StringBuilder();while(i<s.length()){char x=s.charAt(i++);if(x=='"')return b.toString();if(x=='\\\\'){char e=s.charAt(i++);if(e=='u'){b.append((char)Integer.parseInt(s.substring(i,i+4),16));i+=4;}else b.append(e=='n'?'\\n':e=='r'?'\\r':e=='t'?'\\t':e);}else b.append(x);}throw new IllegalArgumentException("Unclosed string");}\n        if(s.startsWith("null",i)){i+=4;return null;}if(s.startsWith("true",i)){i+=4;return Boolean.TRUE;}if(s.startsWith("false",i)){i+=5;return Boolean.FALSE;}\n        int a=i;while(i<s.length()&&"-+0123456789.eE".indexOf(s.charAt(i))>=0)i++;if(a==i)throw new IllegalArgumentException("Invalid JSON value");return Double.valueOf(s.substring(a,i));\n    }\n}`;
    const cppParser = `#include <cctype>\n#include <map>\n#include <stdexcept>\n#include <vector>\nstruct Json { char kind='n'; std::string text; std::vector<Json> array; std::map<std::string,Json> object; };\nstruct JsonReader { const std::string& s; size_t i=0; JsonReader(const std::string& x):s(x){} void ws(){while(i<s.size()&&std::isspace((unsigned char)s[i]))++i;} std::string str(){if(s[i++]!='\"')throw std::runtime_error("string");std::string r;while(i<s.size()){char c=s[i++];if(c=='\"')return r;if(c=='\\\\'&&i<s.size()){char e=s[i++];r+=e=='n'?'\\n':e=='t'?'\\t':e;}else r+=c;}throw std::runtime_error("string");} Json value(){ws();if(i>=s.size())throw std::runtime_error("JSON");char c=s[i];if(c=='['){++i;Json v;v.kind='a';ws();if(i<s.size()&&s[i]==']'){++i;return v;}while(true){v.array.push_back(value());ws();char d=s[i++];if(d==']')return v;if(d!=',')throw std::runtime_error("array");}}if(c=='{'){++i;Json v;v.kind='o';ws();if(i<s.size()&&s[i]=='}'){++i;return v;}while(true){ws();std::string k=str();ws();if(s[i++]!=':')throw std::runtime_error("object");v.object[k]=value();ws();char d=s[i++];if(d=='}')return v;if(d!=',')throw std::runtime_error("object");}}if(c=='\"'){Json v;v.kind='s';v.text=str();return v;}size_t a=i;while(i<s.size()&&std::string("-+0123456789.eEabcdefghijklmnopqrstuvwxyz").find(s[i])!=std::string::npos)++i;if(a==i)throw std::runtime_error("value");Json v;v.kind='v';v.text=s.substr(a,i-a);return v;} Json read(){Json v=value();ws();if(i!=s.size())throw std::runtime_error("trailing JSON");return v;} };`;
    return {
        python: `import json\nimport sys\n\ndef ${functionName}(data):\n    """${guidance}"""\n    ${parseSetup}\n    raise RuntimeError("Continue the algorithm described above; this learner scaffold intentionally emits no answer.")\n\nif __name__ == "__main__":\n    data = json.loads(sys.stdin.read())\n    ${functionName}(data)`,
        java: `import java.io.*;\nimport java.util.*;\n\npublic class Main {\n${parser}\n    static Object ${functionName}(Object data) {\n        // ${guidance}\n        Object parsedInput = data;\n        throw new IllegalStateException("Continue the algorithm described above; this learner scaffold intentionally emits no answer.");\n    }\n    public static void main(String[] args) throws Exception {\n        String input = new String(System.in.readAllBytes(), java.nio.charset.StandardCharsets.UTF_8);\n        Object data = new JsonReader(input).read();\n        ${functionName}(data);\n    }\n}`,
        cpp: `#include <iostream>\n#include <iterator>\n#include <string>\n${cppParser}\nusing namespace std;\nJson ${functionName}(const Json& data) {\n    // ${guidance}\n    const Json& parsedInput = data;\n    throw runtime_error("Continue the algorithm described above; this learner scaffold intentionally emits no answer.");\n}\nint main() {\n    string input((istreambuf_iterator<char>(cin)), istreambuf_iterator<char>());\n    Json data = JsonReader(input).read();\n    ${functionName}(data);\n    return 0;\n}`,
        javascript: `const fs = require('fs');\n\nfunction ${functionName}(data) {\n  // ${guidance}\n  const parsedInput = data;\n  throw new Error('Continue the algorithm described above; this learner scaffold intentionally emits no answer.');\n}\nconst data = JSON.parse(fs.readFileSync(0, 'utf8'));\n${functionName}(data);`
    };
}

function problem(id, title, category, difficulty, description, inputFormat, outputFormat, constraints,
    examples, hints, editorial, timeComplexity, spaceComplexity, functionName, task) {
    if (category === 'trees-bst') {
        inputFormat += ' Tree serialization: the first item is the root; then for each non-null node in breadth-first order, consume the next two items as its left and right children. null means no child, and omitted trailing child items are absent.';
    }
    const testCases = examples.map((example, index) => ({
        stdin: example.stdin,
        expectedOutput: example.stdout,
        explanation: example.explanation,
        isHidden: index >= 2
    }));
    return {
        id,
        problemId: id,
        title,
        description,
        category,
        difficulty,
        inputFormat,
        outputFormat,
        constraints,
        examples: examples.slice(0, 2).map(({ stdin, stdout, explanation }) => ({ stdin, stdout, explanation })),
        testCases,
        hints,
        editorial,
        timeComplexity,
        spaceComplexity,
        functionSignature: `${functionName}(data)`,
        starterCode: starterCode(functionName, editorial, category),
        referenceCode: { python: referencePython(id, functionName) }
    };
}

const problems = [
    problem('ch-059', 'Reverse a Linked Chain', 'linked-lists', 'easy',
        'Given a singly linked list encoded as a JSON array, reverse its node order and return the resulting array. The empty list has no head.',
        'One JSON array of integers; [] represents an empty list.', 'A JSON array in reversed order.',
        '0 <= list.length <= 100000; -10^9 <= list[i] <= 10^9.',
        [
            { stdin: '[1,2,3,4]', stdout: '[4,3,2,1]', explanation: 'Rewiring each next link in traversal order makes 4 the new head.' },
            { stdin: '[8]', stdout: '[8]', explanation: 'A one-node chain is already its own reverse.' },
            { stdin: '[]', stdout: '[]', explanation: 'There are no nodes to relink.' },
            { stdin: '[-2,0,-2]', stdout: '[-2,0,-2]', explanation: 'Reversal swaps the two equal endpoint values, leaving this value sequence unchanged.' }
        ],
        ['Keep a previous pointer and save the current next link before changing it.', 'The old head becomes the tail, so its next link must become null.', 'Handle an empty head without a special fabricated node.'],
        'Walk once with previous and current pointers. Save current.next, point current.next to previous, then advance both pointers; previous is the reversed head when the walk ends. This mutates links in place and needs no auxiliary nodes.',
        'O(n)', 'O(1)', 'reverseLinkedChain', 'Reverse the list represented by the JSON integer array, preserving node values and returning a JSON array.'),
    problem('ch-060', 'Remove Adjacent Repeats from Sorted List', 'linked-lists', 'easy',
        'A singly linked list is sorted in nondecreasing order. Remove repeated values so that each distinct value occurs once, preserving the original order.',
        'One JSON array of sorted integers; each array item is a list node.', 'A JSON array containing one node per distinct value.',
        '0 <= list.length <= 100000; the input values are nondecreasing.',
        [
            { stdin: '[1,1,2,3,3,3,5]', stdout: '[1,2,3,5]', explanation: 'Each equal-value run contributes its first node.' },
            { stdin: '[4,4,4]', stdout: '[4]', explanation: 'The entire input is one run.' },
            { stdin: '[]', stdout: '[]', explanation: 'The empty list remains empty.' },
            { stdin: '[-3,-2,-2,0]', stdout: '[-3,-2,0]', explanation: 'Only the adjacent duplicate -2 is removed.' }
        ],
        ['Since the list is sorted, equal values are adjacent.', 'Compare the current node with its next node and bypass the latter when equal.', 'Advance only after keeping the current next node.'],
        'Scan from the head. If current and current.next hold equal values, redirect current.next to current.next.next; otherwise advance current. The sorted property guarantees this removes every repeat in one pass.',
        'O(n)', 'O(1)', 'deduplicateSortedList', 'Remove all but one node from each equal-value run in a sorted singly linked list.'),
    problem('ch-061', 'Find the Middle Node', 'linked-lists', 'easy',
        'Return the value at the middle of a singly linked list. For an even number of nodes, choose the second of the two central nodes.',
        'One JSON array of integer node values. The list is guaranteed nonempty.', 'A single integer, the selected middle node value.',
        '1 <= list.length <= 100000; -10^9 <= list[i] <= 10^9.',
        [
            { stdin: '[3,7,9,12,15]', stdout: '9', explanation: 'The fifth node list has its third node in the middle.' },
            { stdin: '[2,4,6,8]', stdout: '6', explanation: 'The two central nodes are 4 and 6; the second is selected.' },
            { stdin: '[5]', stdout: '5', explanation: 'The sole node is the middle.' },
            { stdin: '[-5,0]', stdout: '0', explanation: 'For two nodes, the second node is the required middle.' }
        ],
        ['Move one pointer by one link and another by two.', 'When the faster pointer cannot advance twice, the slower one is positioned at the answer.', 'Starting both pointers at the head yields the second middle on even lengths.'],
        'Use slow and fast pointers, advancing slow one node and fast two nodes per iteration. When fast reaches the end (or its next link is the end), slow points to the second middle. The traversal uses constant extra space.',
        'O(n)', 'O(1)', 'secondMiddleValue', 'Return the value of the second middle node using a slow/fast traversal.'),
    problem('ch-062', 'Merge Two Sorted Chains', 'linked-lists', 'medium',
        'Merge two nondecreasing singly linked lists into one nondecreasing list. Reuse the input nodes conceptually and preserve duplicate values.',
        'One JSON object {"a":[...],"b":[...]}; arrays encode list nodes.', 'One JSON array containing the merged sorted values.',
        '0 <= a.length + b.length <= 200000; both arrays are nondecreasing.',
        [
            { stdin: '{"a":[1,4,7],"b":[2,3,8]}', stdout: '[1,2,3,4,7,8]', explanation: 'The next smallest head is repeatedly appended until both chains are exhausted.' },
            { stdin: '{"a":[],"b":[-1,2]}', stdout: '[-1,2]', explanation: 'An empty chain contributes no nodes.' },
            { stdin: '{"a":[2,2],"b":[2]}', stdout: '[2,2,2]', explanation: 'Equal values from both lists all remain in the merged result.' },
            { stdin: '{"a":[-4,9],"b":[-7,0,10]}', stdout: '[-7,-4,0,9,10]', explanation: 'The merge handles negative and positive values in sorted order.' }
        ],
        ['Maintain one cursor for each chain and choose the smaller current value.', 'When values tie, either chain can be selected without changing sortedness.', 'Append the remaining suffix when one cursor reaches its end.'],
        'Use a dummy head and a tail pointer. Repeatedly link the smaller current node and advance that chain; after one list ends, attach the other suffix. The dummy node simplifies the first insertion and the merge is linear.',
        'O(m+n)', 'O(1) auxiliary space', 'mergeSortedChains', 'Merge the sorted arrays a and b as if they were singly linked chains.'),
    problem('ch-063', 'Remove the Kth Node from the End', 'linked-lists', 'medium',
        'Remove the kth node from the end of a singly linked list and return the remaining values. k is one-based and is valid for the list.',
        'One JSON object {"list":[...],"k":integer}.', 'A JSON array for the list after deletion.',
        '1 <= list.length <= 100000; 1 <= k <= list.length.',
        [
            { stdin: '{"list":[1,2,3,4,5],"k":2}', stdout: '[1,2,3,5]', explanation: 'The second node counted from the tail is 4.' },
            { stdin: '{"list":[7],"k":1}', stdout: '[]', explanation: 'Removing the only node leaves an empty list.' },
            { stdin: '{"list":[2,9],"k":2}', stdout: '[9]', explanation: 'The first node is also the second node from the end.' },
            { stdin: '{"list":[0,0,1,0],"k":1}', stdout: '[0,0,1]', explanation: 'The final zero is removed.' }
        ],
        ['Place a leading sentinel before the original head to make head deletion uniform.', 'Advance a lead pointer k links ahead of a follow pointer.', 'Move both until lead reaches the end; follow.next is the node to unlink.'],
        'Use a sentinel node, then advance a lead pointer k steps from it. Move lead and follow together until lead reaches the last node. Bypass follow.next; this covers deleting the head without a separate branch.',
        'O(n)', 'O(1)', 'removeKthFromEnd', 'Delete the one-based kth node from the end of the singly linked list.'),
    problem('ch-064', 'Locate a Cycle Entrance', 'linked-lists', 'medium',
        'A singly linked list is represented by node values and an optional link target. Return the value at the first node reached by entering a cycle, or null when the list is acyclic.',
        'JSON object {"values":[...],"cycleAt":indexOrNull}; cycleAt links the last node to that zero-based index.', 'A JSON integer value at the cycle entrance, or null.',
        '0 <= values.length <= 100000; cycleAt is null or a valid index (and null for an empty list).',
        [
            { stdin: '{"values":[3,2,0,-4],"cycleAt":1}', stdout: '2', explanation: 'The tail points back to index 1, whose node value is 2.' },
            { stdin: '{"values":[1,2],"cycleAt":null}', stdout: 'null', explanation: 'No next link returns to an earlier node.' },
            { stdin: '{"values":[9],"cycleAt":0}', stdout: '9', explanation: 'The single node links to itself and is the cycle entrance.' },
            { stdin: '{"values":[],"cycleAt":null}', stdout: 'null', explanation: 'An empty chain cannot contain a cycle.' }
        ],
        ['Use tortoise-and-hare pointers to determine whether a meeting occurs.', 'After a meeting, reset one pointer to the head.', 'Advance both one step at a time; their next meeting is the cycle entrance.'],
        'First run Floyd cycle detection with one-step and two-step pointers. If they meet, reset one pointer to the head and advance both by one link; their meeting point is the cycle start. The approach uses constant auxiliary space and does not rely on values being unique.',
        'O(n)', 'O(1)', 'cycleEntranceValue', 'Return the value at the cycle entrance, using cycleAt to define the linked structure.'),
    problem('ch-065', 'Reverse Nodes in Fixed Blocks', 'linked-lists', 'hard',
        'Reverse a linked list in consecutive groups of size k. Reverse only complete groups; leave a final group shorter than k in its original order.',
        'JSON object {"list":[...],"k":positiveInteger}.', 'A JSON array in the resulting link order.',
        '1 <= list.length <= 100000; 1 <= k <= list.length.',
        [
            { stdin: '{"list":[1,2,3,4,5,6,7],"k":3}', stdout: '[3,2,1,6,5,4,7]', explanation: 'Two full groups are reversed; the final singleton stays in place.' },
            { stdin: '{"list":[1,2,3,4],"k":2}', stdout: '[2,1,4,3]', explanation: 'Both groups contain exactly two nodes.' },
            { stdin: '{"list":[5,8,2],"k":1}', stdout: '[5,8,2]', explanation: 'Groups of size one do not change the chain.' },
            { stdin: '{"list":[9,1,4,6,0],"k":4}', stdout: '[6,4,1,9,0]', explanation: 'The first four links reverse while the trailing zero remains unchanged.' }
        ],
        ['Find the kth node ahead before changing any links; if it is absent, stop.', 'Reverse links within one group using the node before the group as the initial previous pointer.', 'Reconnect the former group head to the next group and continue from that boundary.'],
        'Use a sentinel and identify each complete group boundary before mutating links. Reverse the group by setting the initial previous pointer to the node after the group, then reconnect the previous group tail to the reversed head. Stop when fewer than k nodes remain.',
        'O(n)', 'O(1)', 'reverseCompleteGroups', 'Reverse each complete group of k links in place and retain an incomplete suffix.'),
    problem('ch-066', 'Clone a Chain with Random Links', 'linked-lists', 'hard',
        'Each node has a next link and a random link that may point to any node in the chain or null. Given node values and random-target indices, return the cloned values and cloned random indices in original order.',
        'JSON object {"values":[...],"random":[...]} where random[i] is a zero-based target index or null.', 'JSON object {"values":[...],"random":[...]} for the independent clone.',
        '0 <= n <= 100000; random has n entries, each null or in [0,n).',
        [
            { stdin: '{"values":[7,13,11],"random":[null,0,1]}', stdout: '{"values":[7,13,11],"random":[null,0,1]}', explanation: 'The cloned nodes keep the same values and corresponding random targets.' },
            { stdin: '{"values":[1],"random":[0]}', stdout: '{"values":[1],"random":[0]}', explanation: 'The only node’s random link points to its clone.' },
            { stdin: '{"values":[],"random":[]}', stdout: '{"values":[],"random":[]}', explanation: 'Cloning an empty structure returns an empty structure.' },
            { stdin: '{"values":[4,4,9],"random":[2,null,0]}', stdout: '{"values":[4,4,9],"random":[2,null,0]}', explanation: 'Index mapping preserves links even when values are repeated.' }
        ],
        ['Create one clone per original node and keep an original-to-clone mapping.', 'Translate every non-null random target through that mapping rather than by value.', 'Repeated values are distinct nodes; indices, not values, identify them.'],
        'Allocate a clone for every input node and store clones by index. For each node, connect its cloned next position and translate its random target index to the matching clone; null stays null. This straightforward mapping is linear and avoids confusing nodes with equal values.',
        'O(n)', 'O(n)', 'cloneRandomLinkChain', 'Construct a deep copy described by node values and random-target indices.'),

    problem('ch-067', 'Check Bracket Nesting', 'stacks-queues', 'easy',
        'Determine whether a string containing parentheses, square brackets, and curly braces is correctly nested. Every opener must have the matching closer in last-opened-first-closed order.',
        'One JSON string containing only the six bracket characters.', 'JSON boolean true for a valid sequence and false otherwise.',
        '0 <= string.length <= 200000.',
        [
            { stdin: '"{[()]}"', stdout: 'true', explanation: 'Each closing bracket matches the most recent unmatched opener.' },
            { stdin: '"([)]"', stdout: 'false', explanation: 'The closing square bracket arrives while a parenthesis is on top.' },
            { stdin: '""', stdout: 'true', explanation: 'An empty sequence has no unmatched brackets.' },
            { stdin: '"]"', stdout: 'false', explanation: 'A closer cannot match when the stack is empty.' }
        ],
        ['Push opening brackets onto a stack.', 'A closing bracket must match the stack top, not merely appear somewhere earlier.', 'The sequence is valid only if the stack is empty at the end.'],
        'Scan characters once, pushing each opener. On a closer, reject an empty stack or mismatched top; otherwise pop. Accept only if no opener remains after the scan.',
        'O(n)', 'O(n)', 'hasBalancedBrackets', 'Return whether the supplied bracket sequence is correctly nested.'),
    problem('ch-068', 'Queue Built from Two Stacks', 'stacks-queues', 'easy',
        'Process enqueue and dequeue commands using a FIFO queue. A dequeue from an empty queue emits null and changes nothing.',
        'JSON array of commands: ["enqueue",value] or ["dequeue"].', 'JSON array containing one result for each dequeue command.',
        '0 <= commands.length <= 100000; values are integers.',
        [
            { stdin: '[["enqueue",4],["enqueue",9],["dequeue"],["enqueue",2],["dequeue"],["dequeue"]]', stdout: '[4,9,2]', explanation: 'Items leave in the order they were enqueued.' },
            { stdin: '[["dequeue"],["enqueue",-1],["dequeue"]]', stdout: '[null,-1]', explanation: 'An empty dequeue reports null; the later item is then removed.' },
            { stdin: '[]', stdout: '[]', explanation: 'No dequeue commands produce no outputs.' },
            { stdin: '[["enqueue",0],["enqueue",0],["dequeue"]]', stdout: '[0]', explanation: 'Repeated equal values remain separate queue entries.' }
        ],
        ['Use one stack for incoming values and another for outgoing values.', 'Transfer incoming items only when the outgoing stack is empty.', 'The outgoing stack top is always the oldest queued item.'],
        'Maintain input and output stacks. Enqueue pushes onto input; dequeue pops output, transferring all input items to output only when output is empty. This amortizes each item to at most one push and pop per stack.',
        'O(1) amortized per command', 'O(n)', 'runTwoStackQueue', 'Return dequeue results for the supplied FIFO command sequence.'),
    problem('ch-069', 'Minimum Value Stack', 'stacks-queues', 'easy',
        'Support push, pop, peek, and getMin operations on a stack. Every pop, peek, or getMin command is guaranteed to have a nonempty stack.',
        'JSON command array; use ["push",x], ["pop"], ["peek"], and ["getMin"].', 'JSON array of results for pop, peek, and getMin commands; pop and peek return the removed or top value.',
        '1 <= commands.length <= 100000; values are integers; operation validity is guaranteed.',
        [
            { stdin: '[["push",3],["push",-2],["getMin"],["pop"],["peek"],["getMin"]]', stdout: '[-2,-2,3,3]', explanation: 'The minimum changes to 3 after removing -2, and peek also returns 3.' },
            { stdin: '[["push",5],["push",5],["getMin"],["pop"],["getMin"]]', stdout: '[5,5,5]', explanation: 'The getMin, pop, and final getMin each emit 5; one duplicate remains after the pop.' },
            { stdin: '[["push",8],["peek"],["pop"]]', stdout: '[8,8]', explanation: 'Peek reads the top and pop then removes that same value.' },
            { stdin: '[["push",-7],["push",4],["push",-9],["getMin"],["pop"],["getMin"]]', stdout: '[-9,-9,-7]', explanation: 'The output records the minimum, the popped -9, and the prior minimum revealed afterward.' }
        ],
        ['Store the minimum associated with each stack depth.', 'On push, compare the new value with the minimum at the previous depth.', 'Pop the value and its stored minimum together.'],
        'Keep a value stack and a parallel minimum stack. On push, append the lesser of the new value and previous minimum; all other operations use the top entry. Each operation takes constant time.',
        'O(1) per operation', 'O(n)', 'processMinStack', 'Process the stack commands and return outputs from value-producing operations.'),
    problem('ch-070', 'Next Greater Values in a Circle', 'stacks-queues', 'medium',
        'For every array position, find the first strictly greater value encountered moving right and wrapping to the start at most once. Use -1 when no greater value exists.',
        'One JSON array of integers.', 'A JSON array of next-greater values aligned with the input indices.',
        '0 <= n <= 100000; -10^9 <= values[i] <= 10^9.',
        [
            { stdin: '[1,2,1]', stdout: '[2,-1,2]', explanation: 'The final 1 wraps around to the first greater value, 2.' },
            { stdin: '[5,4,3]', stdout: '[-1,5,5]', explanation: 'The smaller values wrap around to 5; 5 has no strictly greater value.' },
            { stdin: '[]', stdout: '[]', explanation: 'There are no positions to answer.' },
            { stdin: '[7,7,6]', stdout: '[-1,-1,7]', explanation: 'Equal values are not greater, while 6 wraps around to 7.' }
        ],
        ['Keep unresolved indices in a decreasing monotonic stack.', 'Scan two virtual passes, but push each index only during the first pass.', 'Resolve an index only when the current value is strictly larger.'],
        'Initialize answers to -1 and scan indices from 0 to 2n-1 using modulo n. While the current value is strictly greater than the value at the stack top, fill that answer and pop. Push indices only in the first pass so each position is resolved at most once.',
        'O(n)', 'O(n)', 'circularNextGreater', 'Return the next strictly greater value for every index in a circular array.'),
    problem('ch-071', 'Evaluate Reverse Polish Expression', 'stacks-queues', 'medium',
        'Evaluate an expression in postfix (reverse Polish) notation. Binary operators are +, -, *, and /; division truncates toward zero. The expression is valid and does not divide by zero.',
        'JSON array of string tokens, each an integer or one of +, -, *, /.', 'One JSON integer result.',
        '1 <= tokens.length <= 100000; intermediate results fit signed 32-bit integers.',
        [
            { stdin: '["2","1","+","3","*"]', stdout: '9', explanation: '(2 + 1) * 3 evaluates to 9.' },
            { stdin: '["4","13","5","/","+"]', stdout: '6', explanation: '13 / 5 truncates to 2, then 4 + 2 is 6.' },
            { stdin: '["-7","2","/"]', stdout: '-3', explanation: 'Division truncates -3.5 toward zero.' },
            { stdin: '["8","3","-","2","*"]', stdout: '10', explanation: '(8 - 3) * 2 equals 10.' }
        ],
        ['Push numeric tokens; an operator consumes the top two values.', 'For subtraction and division, the second popped value is the left operand.', 'Use truncation toward zero for division, including negative values.'],
        'Scan tokens left to right with a value stack. Push integers; for an operator pop right then left, compute left op right, and push the result. The final stack value is the answer. Integer division must truncate toward zero.',
        'O(n)', 'O(n)', 'evaluatePostfixExpression', 'Evaluate the valid postfix expression using integer arithmetic and truncating division.'),
    problem('ch-072', 'Days Until a Warmer Reading', 'stacks-queues', 'medium',
        'For each daily temperature, report how many days pass until a strictly warmer temperature. Use zero if no later day is warmer.',
        'One JSON array of integer temperatures.', 'A JSON array of wait lengths.',
        '0 <= n <= 100000; -100 <= temperature[i] <= 100.',
        [
            { stdin: '[73,74,75,71,69,72,76,73]', stdout: '[1,1,4,2,1,1,0,0]', explanation: 'Each unresolved day is filled when the scan reaches its first warmer reading.' },
            { stdin: '[30,40,50,60]', stdout: '[1,1,1,0]', explanation: 'Each day waits one day except the final day.' },
            { stdin: '[]', stdout: '[]', explanation: 'An empty reading list has no waits.' },
            { stdin: '[5,5,4,6]', stdout: '[3,2,1,0]', explanation: 'Equal readings are not warmer; the final 6 resolves all previous days.' }
        ],
        ['Store indices of days that have not yet found a warmer reading.', 'Temperatures in the unresolved stack decrease or stay equal.', 'Resolve only when the current reading is strictly higher.'],
        'Traverse temperatures left to right, keeping indices whose answer is unknown. While the current temperature exceeds the temperature at the stack top, pop that index and set its wait to the index difference. Answers not resolved remain zero.',
        'O(n)', 'O(n)', 'daysToWarmerReading', 'Return the number of days until a strictly warmer temperature for each day.'),
    problem('ch-073', 'Maximum in Every Fixed Window', 'stacks-queues', 'hard',
        'Return the maximum value in each contiguous window of width k in an integer array.',
        'JSON object {"values":[...],"k":width}.', 'A JSON array containing one maximum per window.',
        '1 <= k <= values.length <= 200000; values are signed 32-bit integers.',
        [
            { stdin: '{"values":[1,3,-1,-3,5,3,6,7],"k":3}', stdout: '[3,3,5,5,6,7]', explanation: 'Each output is the largest of the corresponding three consecutive values.' },
            { stdin: '{"values":[4,2,12],"k":1}', stdout: '[4,2,12]', explanation: 'Width one returns each value unchanged.' },
            { stdin: '{"values":[9,8,7],"k":3}', stdout: '[9]', explanation: 'A full-array window has one maximum.' },
            { stdin: '{"values":[2,2,1,2],"k":2}', stdout: '[2,2,2]', explanation: 'Equal maxima can occur at adjacent positions without changing the result.' }
        ],
        ['Keep candidate indices in a deque with values in nonincreasing order.', 'Discard indices from the front once they fall outside the current window.', 'Remove smaller or equal values from the back before appending the new index.'],
        'Maintain a deque of indices for the current window. Expire the front when it leaves the window and remove dominated values from the back before adding each new index. Once a full window exists, its maximum is at the front. Each index enters and leaves once.',
        'O(n)', 'O(k)', 'slidingWindowMaximum', 'Return the maximum of every width-k contiguous window.'),
    problem('ch-074', 'Largest Rectangle in a Histogram', 'stacks-queues', 'hard',
        'Given nonnegative histogram bar heights of unit width, return the largest rectangular area that can fit entirely under consecutive bars.',
        'One JSON array of nonnegative integer heights.', 'One JSON integer, the maximum rectangle area.',
        '1 <= heights.length <= 200000; 0 <= heights[i] <= 10^9; the answer fits signed 64-bit.',
        [
            { stdin: '[2,1,5,6,2,3]', stdout: '10', explanation: 'The bars of heights 5 and 6 support a width-two rectangle of area 10.' },
            { stdin: '[2,4]', stdout: '4', explanation: 'The height-4 bar alone has the largest area.' },
            { stdin: '[0,0,0]', stdout: '0', explanation: 'Zero-height bars enclose no positive-area rectangle.' },
            { stdin: '[3,3,3,3]', stdout: '12', explanation: 'All four bars form a rectangle of height 3 and width 4.' }
        ],
        ['Use an increasing stack of indices.', 'When a lower bar arrives, each popped bar has found its first smaller bar on the right.', 'Use the new stack top as the first smaller boundary on the left; add a sentinel to flush the stack.'],
        'Scan each bar followed by a zero-height sentinel. Maintain increasing heights on an index stack; while the top is taller than the current bar, pop it and compute width from the new top (or -1) to the current index. The resulting area covers every rectangle whose limiting bar is that popped height.',
        'O(n)', 'O(n)', 'largestHistogramRectangle', 'Compute the maximum area of a contiguous histogram rectangle.'),

    problem('ch-075', 'Maximum Depth of a Binary Tree', 'trees-bst', 'easy',
        'Return the number of nodes on the longest root-to-leaf path. The binary tree is encoded in level order, with null entries for missing children.',
        'One JSON array in level-order form, such as [1,2,3,null,4]; [] denotes an empty tree.', 'A JSON integer depth; the empty tree has depth 0.',
        '0 <= number of encoded entries <= 100000; values are distinct integers.',
        [
            { stdin: '[3,9,20,null,null,15,7]', stdout: '3', explanation: 'A longest path contains the root, 20, and either 15 or 7.' },
            { stdin: '[]', stdout: '0', explanation: 'An empty tree has no levels.' },
            { stdin: '[1]', stdout: '1', explanation: 'The root alone forms one level.' },
            { stdin: '[1,2,null,3]', stdout: '3', explanation: 'The left chain contains three nodes.' }
        ],
        ['The depth of an empty child is zero.', 'A node contributes one level above the deeper of its children.', 'Recursive depth is simple; breadth-first levels are an iterative alternative.'],
        'Use depth(null)=0 and depth(node)=1+max(depth(left),depth(right)). Visit each reachable node once. A depth-first recursion uses stack space proportional to tree height.',
        'O(n)', 'O(h) call stack', 'binaryTreeMaximumDepth', 'Return the maximum root-to-leaf node count from a level-order tree array.'),
    problem('ch-076', 'Inorder Walk of a Binary Tree', 'trees-bst', 'easy',
        'Return the binary tree values in inorder order: left subtree, node, then right subtree. The input is a level-order array with null child markers.',
        'One JSON level-order array; [] represents no root.', 'A JSON array of values in inorder traversal order.',
        '0 <= number of encoded entries <= 100000; values are distinct integers.',
        [
            { stdin: '[1,null,2,3]', stdout: '[1,3,2]', explanation: 'The left child of 2 is visited before 2, after the root 1.' },
            { stdin: '[]', stdout: '[]', explanation: 'An empty tree has an empty traversal.' },
            { stdin: '[4,2,6,1,3]', stdout: '[1,2,3,4,6]', explanation: 'The left subtree precedes 4, followed by its right subtree.' },
            { stdin: '[8,null,9]', stdout: '[8,9]', explanation: 'With no left child, the root is emitted before its right child.' }
        ],
        ['Inorder visits left, then current, then right.', 'An explicit stack avoids recursion for a very deep skewed tree.', 'The level-order null markers describe shape, not values to emit.'],
        'Build or interpret the tree from its level-order encoding, then perform iterative inorder traversal: push the left spine, pop and emit, and move to each right child. Each node is pushed and popped once.',
        'O(n)', 'O(h)', 'binaryTreeInorder', 'Return the inorder traversal of the level-order-encoded binary tree.'),
    problem('ch-077', 'Compare Two Binary Trees', 'trees-bst', 'easy',
        'Determine whether two binary trees have identical shape and equal values at corresponding nodes. Both trees use level-order arrays with null markers.',
        'JSON object {"a":[...],"b":[...]}, with [] representing an empty tree.', 'JSON boolean true only when the trees match in shape and values.',
        '0 <= encoded entries per tree <= 100000; values are integers.',
        [
            { stdin: '{"a":[1,2,3],"b":[1,2,3]}', stdout: 'true', explanation: 'Corresponding nodes have equal values and matching child positions.' },
            { stdin: '{"a":[1,2],"b":[1,null,2]}', stdout: 'false', explanation: 'The value 2 occupies a left-child position in one tree and a right-child position in the other.' },
            { stdin: '{"a":[],"b":[]}', stdout: 'true', explanation: 'Two empty trees have identical structure.' },
            { stdin: '{"a":[1],"b":[2]}', stdout: 'false', explanation: 'The two single-node trees contain different root values, so they are not equal.' }
        ],
        ['Compare roots before descending.', 'Two missing nodes match, but exactly one missing node is a mismatch.', 'If values match, compare both left-child pairs and both right-child pairs.'],
        'Decode each level-order representation with the same child-position rules. Recursively compare paired nodes: nulls match only nulls, and non-null nodes match only when their values and both corresponding subtrees match.',
        'O(n+m)', 'O(h1+h2)', 'sameBinaryTree', 'Return whether the two level-order trees have the same shape and node values.'),
    problem('ch-078', 'Search a Binary Search Tree', 'trees-bst', 'easy',
        'Given a binary search tree with distinct keys, return whether a target key is present. For each node, smaller keys are in the left subtree and larger keys are in the right subtree.',
        'JSON object {"tree":[...],"target":integer}; tree is level-order encoded with null markers.', 'JSON boolean indicating whether target occurs.',
        '0 <= tree entries <= 100000; keys are distinct integers.',
        [
            { stdin: '{"tree":[4,2,7,1,3],"target":2}', stdout: 'true', explanation: 'The search follows the root’s left branch to key 2.' },
            { stdin: '{"tree":[4,2,7,1,3],"target":5}', stdout: 'false', explanation: 'At 7, target 5 would be in its absent left subtree.' },
            { stdin: '{"tree":[],"target":0}', stdout: 'false', explanation: 'There is no root to match the target.' },
            { stdin: '{"tree":[6,2,8],"target":8}', stdout: 'true', explanation: 'The target is the root’s right child.' }
        ],
        ['Compare the target to the current node and discard one entire subtree.', 'Equality ends the search immediately.', 'A missing current node means the key is absent.'],
        'Starting at the root, move left when target is smaller and right when it is larger. Return true on equality and false when the path reaches null. The BST ordering avoids visiting unrelated nodes.',
        'O(h)', 'O(1) iterative', 'searchBinarySearchTree', 'Search the BST for target and return whether it is present.'),
    problem('ch-079', 'Level-by-Level Tree Values', 'trees-bst', 'medium',
        'Return the values of a binary tree grouped by depth, from root level to leaves and left to right within each level.',
        'One JSON level-order array with null markers; [] represents an empty tree.', 'A JSON array of arrays, one for each nonempty level.',
        '0 <= encoded entries <= 100000; values are distinct integers.',
        [
            { stdin: '[3,9,20,null,null,15,7]', stdout: '[[3],[9,20],[15,7]]', explanation: 'Nodes are grouped by distance from the root.' },
            { stdin: '[]', stdout: '[]', explanation: 'The empty encoding contributes no nodes, so the result contains no level arrays.' },
            { stdin: '[1,2,3,4]', stdout: '[[1],[2,3],[4]]', explanation: 'The last node is the left child of 2.' },
            { stdin: '[5,null,8,null,9]', stdout: '[[5],[8],[9]]', explanation: 'A right-skewed tree contributes one value per level.' }
        ],
        ['Use a FIFO queue beginning with the root.', 'Capture the queue size before processing a level.', 'Enqueue non-null left child before right child to preserve order.'],
        'Use breadth-first search. At each iteration record the queue’s current size, remove exactly that many nodes into one result row, and enqueue their existing children in left-to-right order. Every node is processed once.',
        'O(n)', 'O(w)', 'binaryTreeLevels', 'Return a left-to-right array of node values for each tree depth.'),
    problem('ch-080', 'Validate Search-Tree Ordering', 'trees-bst', 'medium',
        'Check whether a binary tree is a valid BST with distinct integer keys. Every node must be strictly greater than all keys in its left subtree and strictly smaller than all keys in its right subtree.',
        'One JSON level-order array with null markers.', 'JSON boolean indicating whether the tree satisfies strict BST ordering.',
        '0 <= encoded entries <= 100000; values are signed 32-bit integers.',
        [
            { stdin: '[2,1,3]', stdout: 'true', explanation: 'The left key is smaller and the right key is larger than the root.' },
            { stdin: '[5,1,4,null,null,3,6]', stdout: 'false', explanation: 'The 3 lies in the root’s right subtree but is less than 5.' },
            { stdin: '[]', stdout: 'true', explanation: 'An empty tree satisfies the ordering rule.' },
            { stdin: '[2,2]', stdout: 'false', explanation: 'Duplicate keys violate the strict ordering requirement.' }
        ],
        ['Checking only each node against its parent is insufficient.', 'Carry an exclusive lower and upper bound down each path.', 'A left child inherits the upper bound of its parent; a right child inherits its lower bound.'],
        'Traverse with an exclusive value interval. The root starts unbounded; a left descent tightens the upper bound to the parent value and a right descent tightens the lower bound. Reject any key outside its interval, which also detects duplicates and deep ancestor violations.',
        'O(n)', 'O(h)', 'isValidSearchTree', 'Return whether all keys satisfy strict ancestor-aware BST bounds.'),
    problem('ch-081', 'Kth Smallest Search-Tree Key', 'trees-bst', 'medium',
        'Return the kth smallest key in a BST with distinct values. k is valid for the number of nodes.',
        'JSON object {"tree":[...],"k":integer}; tree is level-order encoded.', 'The kth smallest integer key.',
        '1 <= node count <= 100000; 1 <= k <= node count.',
        [
            { stdin: '{"tree":[3,1,4,null,2],"k":1}', stdout: '1', explanation: 'The smallest key is the leftmost BST key.' },
            { stdin: '{"tree":[5,3,6,2,4,null,null,1],"k":3}', stdout: '3', explanation: 'In sorted order the first three values are 1, 2, 3.' },
            { stdin: '{"tree":[9],"k":1}', stdout: '9', explanation: 'The only key is first in sorted order.' },
            { stdin: '{"tree":[7,3,10,1,5,8,12],"k":6}', stdout: '10', explanation: 'The inorder sequence is 1, 3, 5, 7, 8, 10, 12.' }
        ],
        ['Inorder traversal of a BST visits keys in ascending order.', 'Stop as soon as the kth node is visited.', 'An explicit stack gives iterative traversal without storing the whole sorted sequence.'],
        'Perform iterative inorder traversal and decrement k when a node is visited. The value at the visit that makes k zero is the answer. Early termination avoids traversing keys larger than the answer.',
        'O(h+k)', 'O(h)', 'kthSmallestSearchTreeKey', 'Return the kth visited value during inorder traversal of the BST.'),
    problem('ch-082', 'Lowest Common Ancestor in a BST', 'trees-bst', 'medium',
        'Given a BST and two distinct key values that are guaranteed to occur, return the value of their lowest common ancestor: the deepest node whose subtree contains both keys.',
        'JSON object {"tree":[...],"p":key,"q":key}.', 'One integer, the ancestor key.',
        '1 <= node count <= 100000; all keys are distinct; p and q exist.',
        [
            { stdin: '{"tree":[6,2,8,0,4,7,9,null,null,3,5],"p":2,"q":8}', stdout: '6', explanation: 'The keys split to opposite sides at 6, making it their lowest shared ancestor.' },
            { stdin: '{"tree":[6,2,8,0,4,7,9,null,null,3,5],"p":2,"q":4}', stdout: '2', explanation: 'Key 2 is an ancestor of key 4 and is itself one of the requested nodes.' },
            { stdin: '{"tree":[10,5,15],"p":5,"q":15}', stdout: '10', explanation: 'The root is the first split between the two keys.' },
            { stdin: '{"tree":[8,4,12,2,6],"p":2,"q":6}', stdout: '4', explanation: 'Both keys lie in node 4’s subtree and split there.' }
        ],
        ['Order the two keys as low and high.', 'If both are below the current node, descend left; if both above, descend right.', 'The first node between the keys, inclusive, is their lowest common ancestor.'],
        'Starting at the root, descend left while both target keys are smaller and right while both are larger. The first node for which the targets lie on different sides or one equals the node is the lowest common ancestor. BST ordering makes a general parent map unnecessary.',
        'O(h)', 'O(1)', 'bstLowestCommonAncestor', 'Return the lowest common ancestor key by exploiting BST order.'),
    problem('ch-083', 'Maximum Path Sum in a Binary Tree', 'trees-bst', 'hard',
        'Find the largest sum over any nonempty path in a binary tree. A path may start and end at any nodes but must follow parent-child links without revisiting a node.',
        'One nonempty JSON level-order array with null markers.', 'One integer, the maximum path sum.',
        '1 <= node count <= 100000; node values are signed 32-bit integers; sums fit signed 64-bit.',
        [
            { stdin: '[1,2,3]', stdout: '6', explanation: 'The path 2 -> 1 -> 3 has sum 6.' },
            { stdin: '[-10,9,20,null,null,15,7]', stdout: '42', explanation: 'The path 15 -> 20 -> 7 has the greatest sum.' },
            { stdin: '[-3]', stdout: '-3', explanation: 'A path must contain a node, so the sole negative value is selected.' },
            { stdin: '[2,-1]', stdout: '2', explanation: 'The negative child is excluded, leaving the root as the best path.' }
        ],
        ['For each node, compute the best downward path that can be extended to its parent.', 'A negative child contribution can be replaced by zero.', 'Update the global answer with both positive child gains joined through the current node.'],
        'A postorder traversal returns the maximum downward gain from each node, clamped to at least zero. At each node, consider node.value plus both child gains as a complete path and update a global maximum; return node.value plus the larger single-child gain to the parent. Initialize the global maximum to negative infinity so all-negative trees work.',
        'O(n)', 'O(h)', 'maximumBinaryTreePathSum', 'Return the largest sum of any nonempty parent-child path.'),
    problem('ch-084', 'Recover a Swapped Search Tree', 'trees-bst', 'hard',
        'A BST has exactly two node values swapped, while its shape is unchanged. Restore the BST by swapping those values back and return the corrected level-order array.',
        'One JSON level-order array with null markers; exactly two values are out of their correct positions.', 'A JSON level-order array after the two key values are exchanged.',
        '2 <= node count <= 100000; original BST keys are distinct integers.',
        [
            { stdin: '[3,1,4,null,null,2]', stdout: '[2,1,4,null,null,3]', explanation: 'In inorder order, 3 and 2 are the misplaced values and are exchanged.' },
            { stdin: '[6,3,8,1,null,5,9]', stdout: '[5,3,8,1,null,6,9]', explanation: 'The inorder sequence contains the adjacent misplaced values 6 and 5, which must be exchanged.' },
            { stdin: '[2,3,1]', stdout: '[2,1,3]', explanation: 'The two child values are swapped; exchanging 3 and 1 restores the BST.' },
            { stdin: '[6,2,8,1,7,5,9]', stdout: '[6,2,8,1,5,7,9]', explanation: 'The misplaced inorder pair 7 and 5 are exchanged to restore ascending order.' }
        ],
        ['A correct BST has strictly increasing inorder values.', 'The first inversion identifies the earlier misplaced node; each inversion updates the later candidate.', 'After identifying the two values, swap only their values and retain the original shape.'],
        'Traverse inorder while tracking the previous node. On each inversion (previous.value > current.value), record the previous node on the first inversion and update the second candidate to current. Swap the two recorded values, then emit the unchanged shape in level order. Adjacent and separated misplaced positions are both handled.',
        'O(n)', 'O(h)', 'recoverSwappedSearchTree', 'Restore the BST by finding and exchanging the two values that violate inorder order.')
];

module.exports = problems;
