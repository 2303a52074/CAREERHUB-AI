'use strict';

const typeNames = {
    ints: { python: 'list[int]', java: 'List<Integer>', cpp: 'const std::vector<int>&', javascript: 'number[]' },
    int: { python: 'int', java: 'int', cpp: 'int', javascript: 'number' },
    long: { python: 'int', java: 'long', cpp: 'long long', javascript: 'number' },
    text: { python: 'str', java: 'String', cpp: 'const std::string&', javascript: 'string' },
    matrix: { python: 'list[list[int]]', java: 'List<List<Integer>>', cpp: 'const std::vector<std::vector<int>>&', javascript: 'number[][]' }
};

function unusedLegacyScaffold(id, method, args, mission) {
    const pyReads = [];
    const javaReads = [];
    const cppReads = [];
    const jsReads = [];
    for (const arg of args) {
        const { name, type } = arg;
        if (type === 'ints') {
            pyReads.push(`n_${name} = int(next(tokens))\n    ${name} = [int(next(tokens)) for _ in range(n_${name})]`);
            javaReads.push(`int n_${name} = input.nextInt();\n        List<Integer> ${name} = new ArrayList<>();\n        for (int i = 0; i < n_${name}; i++) ${name}.add(input.nextInt());`);
            cppReads.push(`int n_${name}; std::cin >> n_${name};\n    std::vector<int> ${name}(n_${name});\n    for (int& value : ${name}) std::cin >> value;`);
            jsReads.push(`const ${name} = takeInts();`);
        } else if (type === 'matrix') {
            pyReads.push(`rows_${name} = int(next(tokens)); cols_${name} = int(next(tokens))\n    ${name} = [[int(next(tokens)) for _ in range(cols_${name})] for _ in range(rows_${name})]`);
            javaReads.push(`int rows_${name} = input.nextInt(), cols_${name} = input.nextInt();\n        List<List<Integer>> ${name} = new ArrayList<>();\n        for (int r = 0; r < rows_${name}; r++) {\n            List<Integer> row = new ArrayList<>();\n            for (int c = 0; c < cols_${name}; c++) row.add(input.nextInt());\n            ${name}.add(row);\n        }`);
            cppReads.push(`int rows_${name}, cols_${name}; std::cin >> rows_${name} >> cols_${name};\n    std::vector<std::vector<int>> ${name}(rows_${name}, std::vector<int>(cols_${name}));\n    for (auto& row : ${name}) for (int& value : row) std::cin >> value;`);
            jsReads.push(`const ${name} = takeMatrix();`);
        } else if (type === 'text') {
            pyReads.push(`${name} = next(tokens)`);
            javaReads.push(`String ${name} = input.next();`);
            cppReads.push(`std::string ${name}; std::cin >> ${name};`);
            jsReads.push(`const ${name} = tokens[cursor++];`);
        } else if (type === 'long') {
            pyReads.push(`${name} = int(next(tokens))`);
            javaReads.push(`long ${name} = input.nextLong();`);
            cppReads.push(`long long ${name}; std::cin >> ${name};`);
            jsReads.push(`const ${name} = Number(tokens[cursor++]);`);
        } else {
            pyReads.push(`${name} = int(next(tokens))`);
            javaReads.push(`int ${name} = input.nextInt();`);
            cppReads.push(`int ${name}; std::cin >> ${name};`);
            jsReads.push(`const ${name} = Number(tokens[cursor++]);`);
        }
    }
    const names = args.map(({ name }) => name).join(', ');
    const pyParams = args.map(({ name, type }) => `${name}: ${typeNames[type].python}`).join(', ');
    const javaParams = args.map(({ name, type }) => `${typeNames[type].java} ${name}`).join(', ');
    const cppParams = args.map(({ name, type }) => `${typeNames[type].cpp} ${name}`).join(', ');
    const jsParams = names;
    const python = `# Template for ${id}; stdin tokens: ${args.map(({ type }) => type).join(', ')} in the order documented above.\nimport sys\n\ndef ${method}(${pyParams}):\n    \"\"\"${mission}\"\"\"\n    raise NotImplementedError(\"Implement the problem-specific algorithm described above.\")\n\n\ndef main():\n    tokens = iter(sys.stdin.read().split())\n    ${pyReads.join('\n    ')}\n    answer = ${method}(${names})\n    print(answer)\n\n\nif __name__ == \"__main__\":\n    main()\n`;
    const java = `// Template for ${id}; reads whitespace-separated fields in the documented order.\nimport java.util.*;\n\npublic class Main {\n    static Object ${method}(${javaParams}) {\n        // ${mission}\n        throw new UnsupportedOperationException(\"Implement this problem-specific algorithm.\");\n    }\n\n    public static void main(String[] args) {\n        Scanner input = new Scanner(System.in);\n        ${javaReads.join('\n        ')}\n        Object answer = ${method}(${names});\n        System.out.println(answer);\n    }\n}\n`;
    const cpp = `// Template for ${id}; reads whitespace-separated fields in the documented order.\n#include <iostream>\n#include <string>\n#include <vector>\n    #include <any>
    #include <stdexcept>\n\nstd::any ${method}(${cppParams}) {\n    // ${mission}\n    throw std::logic_error(\"Implement this problem-specific algorithm.\");\n}\n\nint main() {\n    ${cppReads.join('\n    ')}\n    auto answer = ${method}(${names});\n    (void)answer; // Add serialization for the selected result type.\n    return 0;\n}\n`;
    const javascript = `// Template for ${id}; reads whitespace-separated fields in the documented order.\nconst tokens = require('fs').readFileSync(0, 'utf8').trim().split(/\\s+/).filter(Boolean);\nlet cursor = 0;\nfunction takeInts() {\n    const length = Number(tokens[cursor++]);\n    return Array.from({ length }, () => Number(tokens[cursor++]));\n}\nfunction takeMatrix() {\n    const rows = Number(tokens[cursor++]), columns = Number(tokens[cursor++]);\n    return Array.from({ length: rows }, () => Array.from({ length: columns }, () => Number(tokens[cursor++])));\n}\nfunction ${method}(${jsParams}) {\n    // ${mission}\n    throw new Error('Implement this problem-specific algorithm.');\n}\n    ${jsReads.join('\n')}
    const answer = ${method}(${names});\nconsole.log(JSON.stringify(answer));\n`;
    return { python, java, cpp, javascript };
}

const fullSolutions = {
    'ch-036': [
        'l,r=0,len(values)-1\n    while l<r:\n        total=values[l]+values[r]\n        if total==target:return [l+1,r+1]\n        if total<target:l+=1\n        else:r-=1\n    return []',
        'let l=0,r=values.length-1;while(l<r){const s=values[l]+values[r];if(s===target)return[l+1,r+1];if(s<target)l++;else r--;}return[];',
        'int l=0,r=values.size()-1;while(l<r){long s=(long)values.get(l)+values.get(r);if(s==target)return Arrays.asList(l+1,r+1);if(s<target)l++;else r--;}return Collections.emptyList();',
        'int l=0,r=(int)values.size()-1;while(l<r){long s=1LL*values[l]+values[r];if(s==target)return{l+1,r+1};if(s<target)++l;else --r;}return{};'
    ],
    'ch-037': [
        'def pal(l,r):\n        while l<r:\n            if text[l]!=text[r]:return False\n            l+=1;r-=1\n        return True\n    l,r=0,len(text)-1\n    while l<r and text[l]==text[r]:l+=1;r-=1\n    return l>=r or pal(l+1,r) or pal(l,r-1)',
        'const pal=(l,r)=>{while(l<r)if(text[l++]!==text[r--])return false;return true;};let l=0,r=text.length-1;while(l<r&&text[l]===text[r]){l++;r--;}return l>=r||pal(l+1,r)||pal(l,r-1);',
        'int l=0,r=text.length()-1;while(l<r&&text.charAt(l)==text.charAt(r)){l++;r--;}return l>=r||pal(text,l+1,r)||pal(text,l,r-1);',
        'int l=0,r=(int)text.size()-1;auto pal=[&](int a,int b){while(a<b)if(text[a++]!=text[b--])return false;return true;};while(l<r&&text[l]==text[r]){++l;--r;}return l>=r||pal(l+1,r)||pal(l,r-1);'
    ],
    'ch-038': [
        'out=[]\n    for x in values:\n        if not out or out[-1]!=x:out.append(x)\n    return out',
        'const out=[];for(const x of values)if(!out.length||out[out.length-1]!==x)out.push(x);return out;',
        'List<Integer> out=new ArrayList<>();for(int x:values)if(out.isEmpty()||out.get(out.size()-1)!=x)out.add(x);return out;',
        'std::vector<int> out;for(int x:values)if(out.empty()||out.back()!=x)out.push_back(x);return out;'
    ],
    'ch-039': [
        'i,j=0,len(second)-1\n    best=(first[0],second[j])\n    def key(p):return(abs(p[0]+p[1]-target),p[0],p[1])\n    while i<len(first) and j>=0:\n        p=(first[i],second[j])\n        if key(p)<key(best):best=p\n        s=sum(p)\n        if s<target:i+=1\n        elif s>target:j-=1\n        else:i+=1;j-=1\n    return list(best)',
        'let i=0,j=second.length-1,best=[first[0],second[j]];const better=(a,b)=>{let x=Math.abs(a[0]+a[1]-target),y=Math.abs(b[0]+b[1]-target);return x<y||(x===y&&(a[0]<b[0]||(a[0]===b[0]&&a[1]<b[1])));};while(i<first.length&&j>=0){let p=[first[i],second[j]],s=p[0]+p[1];if(better(p,best))best=p;if(s<target)i++;else if(s>target)j--;else{i++;j--;}}return best;',
        'int i=0,j=second.size()-1;List<Integer> best=Arrays.asList(first.get(0),second.get(j));while(i<first.size()&&j>=0){int a=first.get(i),b=second.get(j),s=a+b;long d=Math.abs((long)s-target),bd=Math.abs((long)best.get(0)+best.get(1)-target);if(d<bd||(d==bd&&(a<best.get(0)||(a==best.get(0)&&b<best.get(1))))){best=Arrays.asList(a,b);}if(s<target)i++;else if(s>target)j--;else{i++;j--;}}return best;',
        'int i=0,j=(int)second.size()-1;std::vector<int> best{first[0],second[j]};auto d=[&](int a,int b){return std::llabs(1LL*a+b-target);};while(i<(int)first.size()&&j>=0){int a=first[i],b=second[j],s=a+b;if(d(a,b)<d(best[0],best[1])||(d(a,b)==d(best[0],best[1])&&std::pair<int,int>(a,b)<std::pair<int,int>(best[0],best[1])))best={a,b};if(s<target)++i;else if(s>target)--j;else{++i;--j;}}return best;'
    ],
    'ch-040': [
        'a=sorted(values);best=sum(a[:3])\n    for i in range(len(a)-2):\n        l,r=i+1,len(a)-1\n        while l<r:\n            s=a[i]+a[l]+a[r]\n            if (abs(s-target),s)<(abs(best-target),best):best=s\n            if s<target:l+=1\n            elif s>target:r-=1\n            else:return s\n    return best',
        'const a=[...values].sort((x,y)=>x-y);let best=a[0]+a[1]+a[2];for(let i=0;i<a.length-2;i++){let l=i+1,r=a.length-1;while(l<r){let s=a[i]+a[l]+a[r];if(Math.abs(s-target)<Math.abs(best-target)||(Math.abs(s-target)===Math.abs(best-target)&&s<best))best=s;if(s<target)l++;else if(s>target)r--;else return s;}}return best;',
        'List<Integer>a=new ArrayList<>(values);Collections.sort(a);long best=(long)a.get(0)+a.get(1)+a.get(2);for(int i=0;i<a.size()-2;i++){int l=i+1,r=a.size()-1;while(l<r){long s=(long)a.get(i)+a.get(l)+a.get(r);if(Math.abs(s-target)<Math.abs(best-target)||(Math.abs(s-target)==Math.abs(best-target)&&s<best))best=s;if(s<target)l++;else if(s>target)r--;else return s;}}return best;',
        'std::vector<int>a=values;std::sort(a.begin(),a.end());long long best=1LL*a[0]+a[1]+a[2];for(int i=0;i+2<(int)a.size();i++){int l=i+1,r=(int)a.size()-1;while(l<r){long long s=1LL*a[i]+a[l]+a[r];if(std::llabs(s-target)<std::llabs(best-target)||(std::llabs(s-target)==std::llabs(best-target)&&s<best))best=s;if(s<target)++l;else if(s>target)--r;else return s;}}return best;'
    ],
    'ch-041': [
        'l,r=0,len(heights)-1;area_best=-1;pair=[l,r]\n    while l<r:\n        area=(r-l)*min(heights[l],heights[r])\n        if area>area_best or (area==area_best and [l,r]<pair):area_best,pair=area,[l,r]\n        if heights[l]<=heights[r]:l+=1\n        else:r-=1\n    return pair',
        'let l=0,r=heights.length-1,best=-1,pair=[0,r];while(l<r){let a=(r-l)*Math.min(heights[l],heights[r]);if(a>best||(a===best&&(l<pair[0]||(l===pair[0]&&r<pair[1])))){best=a;pair=[l,r];}if(heights[l]<=heights[r])l++;else r--;}return pair;',
        'int l=0,r=heights.size()-1;long best=-1;List<Integer> pair=Arrays.asList(l,r);while(l<r){long a=(long)(r-l)*Math.min(heights.get(l),heights.get(r));if(a>best||(a==best&&(l<pair.get(0)||(l==pair.get(0)&&r<pair.get(1))))){best=a;pair=Arrays.asList(l,r);}if(heights.get(l)<=heights.get(r))l++;else r--;}return pair;',
        'int l=0,r=(int)heights.size()-1;long long best=-1;std::vector<int> pair{l,r};while(l<r){long long a=1LL*(r-l)*std::min(heights[l],heights[r]);if(a>best||(a==best&&std::pair<int,int>(l,r)<std::pair<int,int>(pair[0],pair[1]))){best=a;pair={l,r};}if(heights[l]<=heights[r])++l;else --r;}return pair;'
    ],
    'ch-042': [
        'n=len(values);p=[0]\n    for x in values:p.append(p[-1]+x)\n    for j in range(2,n-2):\n        suffix={p[k] for k in range(j+2,n)}\n        for i in range(1,j-1):\n            s=p[i]\n            if p[j]-p[i+1]==s and s+p[j+1] in suffix:return True\n    return False',
        'const n=values.length,p=Array(n+1).fill(0);for(let i=0;i<n;i++)p[i+1]=p[i]+values[i];for(let j=2;j<=n-3;j++){const suffix=new Set();for(let k=j+2;k<n;k++)suffix.add(p[k]);for(let i=1;i<=j-2;i++){let s=p[i];if(p[j]-p[i+1]===s&&suffix.has(s+p[j+1]))return true;}}return false;',
        'int n=values.size();long[] p=new long[n+1];for(int i=0;i<n;i++)p[i+1]=p[i]+values.get(i);for(int j=2;j<=n-3;j++){Set<Long>s=new HashSet<>();for(int k=j+2;k<n;k++)s.add(p[k]);for(int i=1;i<=j-2;i++){long x=p[i];if(p[j]-p[i+1]==x&&s.contains(x+p[j+1]))return true;}}return false;',
        'int n=values.size();std::vector<long long>p(n+1);for(int i=0;i<n;i++)p[i+1]=p[i]+values[i];for(int j=2;j<=n-3;j++){std::unordered_set<long long>s;for(int k=j+2;k<n;k++)s.insert(p[k]);for(int i=1;i<=j-2;i++){long long x=p[i];if(p[j]-p[i+1]==x&&s.count(x+p[j+1]))return true;}}return false;'
    ],
    'ch-043': [
        'l,r=0,len(heights)-1;left_wall=right_wall=water=0\n    while l<r:\n        if heights[l]<=heights[r]:\n            left_wall=max(left_wall,heights[l]);water+=left_wall-heights[l];l+=1\n        else:\n            right_wall=max(right_wall,heights[r]);water+=right_wall-heights[r];r-=1\n    return water',
        'let l=0,r=heights.length-1,leftWall=0,rightWall=0,water=0;while(l<r){if(heights[l]<=heights[r]){leftWall=Math.max(leftWall,heights[l]);water+=leftWall-heights[l++];}else{rightWall=Math.max(rightWall,heights[r]);water+=rightWall-heights[r--];}}return water;',
        'int l=0,r=heights.size()-1;long leftWall=0,rightWall=0,water=0;while(l<r){if(heights.get(l)<=heights.get(r)){leftWall=Math.max(leftWall,heights.get(l));water+=leftWall-heights.get(l++);}else{rightWall=Math.max(rightWall,heights.get(r));water+=rightWall-heights.get(r--);}}return water;',
        'int l=0,r=(int)heights.size()-1;long long leftWall=0,rightWall=0,water=0;while(l<r){if(heights[l]<=heights[r]){leftWall=std::max(leftWall,(long long)heights[l]);water+=leftWall-heights[l++];}else{rightWall=std::max(rightWall,(long long)heights[r]);water+=rightWall-heights[r--];}}return water;'
    ],
    'ch-044': [
        's=sum(values[:width]);best=s\n    for i in range(width,len(values)):\n        s+=values[i]-values[i-width];best=max(best,s)\n    return best/width',
        'let s=values.slice(0,width).reduce((a,b)=>a+b,0),best=s;for(let i=width;i<values.length;i++){s+=values[i]-values[i-width];best=Math.max(best,s);}return best/width;',
        'long s=0;for(int i=0;i<width;i++)s+=values.get(i);long best=s;for(int i=width;i<values.size();i++){s+=values.get(i)-values.get(i-width);best=Math.max(best,s);}return (double)best/width;',
        'long long s=0;for(int i=0;i<width;i++)s+=values[i];long long best=s;for(int i=width;i<(int)values.size();i++){s+=values[i]-values[i-width];best=std::max(best,s);}return(double)best/width;'
    ],
    'ch-045': [
        'counts={};left=best=0\n    for right,c in enumerate(text):\n        counts[c]=counts.get(c,0)+1\n        while len(counts)>limit:\n            old=text[left];counts[old]-=1\n            if counts[old]==0:del counts[old]\n            left+=1\n        best=max(best,right-left+1)\n    return best',
        'const c=new Map();let l=0,b=0;for(let r=0;r<text.length;r++){let x=text[r];c.set(x,(c.get(x)||0)+1);while(c.size>limit){x=text[l++];let n=c.get(x)-1;if(n)c.set(x,n);else c.delete(x);}b=Math.max(b,r-l+1);}return b;',
        'int[] c=new int[26];int l=0,d=0,b=0;for(int r=0;r<text.length();r++){int x=text.charAt(r)-\'a\';if(c[x]++==0)d++;while(d>limit){x=text.charAt(l++)-\'a\';if(--c[x]==0)d--;}b=Math.max(b,r-l+1);}return b;',
        'int c[26]={0},l=0,d=0,b=0;for(int r=0;r<(int)text.size();r++){int x=text[r]-\'a\';if(c[x]++==0)++d;while(d>limit){x=text[l++]-\'a\';if(--c[x]==0)--d;}b=std::max(b,r-l+1);}return b;'
    ],
    'ch-046': [
        'count=sum(x<0 for x in values[:width]);out=[count]\n    for i in range(width,len(values)):\n        count-=values[i-width]<0;count+=values[i]<0;out.append(count)\n    return out',
        'let n=0;for(let i=0;i<width;i++)if(values[i]<0)n++;const out=[n];for(let i=width;i<values.length;i++){if(values[i-width]<0)n--;if(values[i]<0)n++;out.push(n);}return out;',
        'int n=0;for(int i=0;i<width;i++)if(values.get(i)<0)n++;List<Integer> out=new ArrayList<>();out.add(n);for(int i=width;i<values.size();i++){if(values.get(i-width)<0)n--;if(values.get(i)<0)n++;out.add(n);}return out;',
        'int n=0;for(int i=0;i<width;i++)if(values[i]<0)++n;std::vector<int>out{n};for(int i=width;i<(int)values.size();i++){if(values[i-width]<0)--n;if(values[i]<0)++n;out.push_back(n);}return out;'
    ],
    'ch-047': [
        'l=s=0;b=len(values)+1\n    for r,x in enumerate(values):\n        s+=x\n        while s>=target:b=min(b,r-l+1);s-=values[l];l+=1\n    return 0 if b>len(values) else b',
        'let l=0,s=0,b=values.length+1;for(let r=0;r<values.length;r++){s+=values[r];while(s>=target){b=Math.min(b,r-l+1);s-=values[l++];}}return b>values.length?0:b;',
        'int l=0,b=values.size()+1;long s=0;for(int r=0;r<values.size();r++){s+=values.get(r);while(s>=target){b=Math.min(b,r-l+1);s-=values.get(l++);}}return b>values.size()?0:b;',
        'int l=0,b=(int)values.size()+1;long long s=0;for(int r=0;r<(int)values.size();r++){s+=values[r];while(s>=target){b=std::min(b,r-l+1);s-=values[l++];}}return b>(int)values.size()?0:b;'
    ],
    'ch-048': [
        'count=[0]*26;l=mf=best=0\n    for r,ch in enumerate(text):\n        i=ord(ch)-65;count[i]+=1;mf=max(mf,count[i])\n        if r-l+1-mf>replacements:count[ord(text[l])-65]-=1;l+=1\n        best=max(best,r-l+1)\n    return best',
        'const c=Array(26).fill(0);let l=0,m=0,b=0;for(let r=0;r<text.length;r++){m=Math.max(m,++c[text.charCodeAt(r)-65]);if(r-l+1-m>replacements)c[text.charCodeAt(l++)-65]--;b=Math.max(b,r-l+1);}return b;',
        'int[] c=new int[26];int l=0,m=0,b=0;for(int r=0;r<text.length();r++){m=Math.max(m,++c[text.charAt(r)-\'A\']);if(r-l+1-m>replacements)c[text.charAt(l++)-\'A\']--;b=Math.max(b,r-l+1);}return b;',
        'int c[26]={0},l=0,m=0,b=0;for(int r=0;r<(int)text.size();r++){m=std::max(m,++c[text[r]-\'A\']);if(r-l+1-m>replacements)--c[text[l++]-\'A\'];b=std::max(b,r-l+1);}return b;'
    ],
    'ch-049': [
        'l=s=b=0\n    for r,x in enumerate(costs):\n        s+=x\n        while s>budget:s-=costs[l];l+=1\n        b=max(b,r-l+1)\n    return b',
        'let l=0,s=0,b=0;for(let r=0;r<costs.length;r++){s+=costs[r];while(s>budget)s-=costs[l++];b=Math.max(b,r-l+1);}return b;',
        'int l=0,b=0;long s=0;for(int r=0;r<costs.size();r++){s+=costs.get(r);while(s>budget)s-=costs.get(l++);b=Math.max(b,r-l+1);}return b;',
        'int l=0,b=0;long long s=0;for(int r=0;r<(int)costs.size();r++){s+=costs[r];while(s>budget)s-=costs[l++];b=std::max(b,r-l+1);}return b;'
    ],
    'ch-050': [
        'need={}\n    for c in required:need[c]=need.get(c,0)+1\n    missing=len(required);l=0;start=0;best=len(source)+1\n    for r,c in enumerate(source):\n        if c in need:\n            if need[c]>0:missing-=1\n            need[c]-=1\n        while missing==0:\n            if r-l+1<best:start,best=l,r-l+1\n            old=source[l];l+=1\n            if old in need:\n                need[old]+=1\n                if need[old]>0:missing+=1\n    return "" if best>len(source) else source[start:start+best]',
        'const need=new Map();for(const c of required)need.set(c,(need.get(c)||0)+1);let miss=required.length,l=0,start=0,best=source.length+1;for(let r=0;r<source.length;r++){let c=source[r];if(need.has(c)){if(need.get(c)>0)miss--;need.set(c,need.get(c)-1);}while(miss===0){if(r-l+1<best){start=l;best=r-l+1;}c=source[l++];if(need.has(c)){need.set(c,need.get(c)+1);if(need.get(c)>0)miss++;}}}return best>source.length?"":source.slice(start,start+best);',
        'Map<Character,Integer> need=new HashMap<>();for(char c:required.toCharArray())need.put(c,need.getOrDefault(c,0)+1);int miss=required.length(),l=0,start=0,best=source.length()+1;for(int r=0;r<source.length();r++){char c=source.charAt(r);if(need.containsKey(c)){if(need.get(c)>0)miss--;need.put(c,need.get(c)-1);}while(miss==0){if(r-l+1<best){start=l;best=r-l+1;}c=source.charAt(l++);if(need.containsKey(c)){need.put(c,need.get(c)+1);if(need.get(c)>0)miss++;}}}return best>source.length()?"":source.substring(start,start+best);',
        'std::unordered_map<char,int>need;for(char c:required)++need[c];int miss=required.size(),l=0,start=0,best=source.size()+1;for(int r=0;r<(int)source.size();r++){char c=source[r];if(need.count(c)){if(need[c]>0)--miss;--need[c];}while(miss==0){if(r-l+1<best){start=l;best=r-l+1;}c=source[l++];if(need.count(c)){if(++need[c]>0)++miss;}}}return best>(int)source.size()?std::string():source.substr(start,best);'
    ],
    'ch-051': [
        'l,r=0,len(values)\n    while l<r:\n        m=(l+r)//2\n        if values[m]>=target:r=m\n        else:l=m+1\n    return l',
        'let l=0,r=values.length;while(l<r){let m=Math.floor((l+r)/2);if(values[m]>=target)r=m;else l=m+1;}return l;',
        'int l=0,r=values.size();while(l<r){int m=l+(r-l)/2;if(values.get(m)>=target)r=m;else l=m+1;}return l;',
        'int l=0,r=values.size();while(l<r){int m=l+(r-l)/2;if(values[m]>=target)r=m;else l=m+1;}return l;'
    ],
    'ch-052': [
        'if n<2:return n\n    l,r=1,n//2+1;ans=1\n    while l<=r:\n        m=(l+r)//2\n        if m<=n//m:ans=m;l=m+1\n        else:r=m-1\n    return ans',
        'if(n<2)return n;let l=1,r=Math.floor(n/2)+1,a=1;while(l<=r){let m=Math.floor((l+r)/2);if(m<=Math.floor(n/m)){a=m;l=m+1;}else r=m-1;}return a;',
        'if(n<2)return n;long l=1,r=n/2+1,a=1;while(l<=r){long m=l+(r-l)/2;if(m<=n/m){a=m;l=m+1;}else r=m-1;}return a;',
        'if(n<2)return n;long long l=1,r=n/2+1,a=1;while(l<=r){long long m=l+(r-l)/2;if(m<=n/m){a=m;l=m+1;}else r=m-1;}return a;'
    ],
    'ch-053': [
        'l,r=0,len(values)-1\n    while l<=r:\n        m=(l+r)//2\n        if values[m]==target:return m\n        if values[l]<=values[m]:\n            if values[l]<=target<values[m]:r=m-1\n            else:l=m+1\n        elif values[m]<target<=values[r]:l=m+1\n        else:r=m-1\n    return -1',
        'let l=0,r=values.length-1;while(l<=r){let m=Math.floor((l+r)/2);if(values[m]===target)return m;if(values[l]<=values[m]){if(values[l]<=target&&target<values[m])r=m-1;else l=m+1;}else if(values[m]<target&&target<=values[r])l=m+1;else r=m-1;}return -1;',
        'int l=0,r=values.size()-1;while(l<=r){int m=l+(r-l)/2;if(values.get(m)==target)return m;if(values.get(l)<=values.get(m)){if(values.get(l)<=target&&target<values.get(m))r=m-1;else l=m+1;}else if(values.get(m)<target&&target<=values.get(r))l=m+1;else r=m-1;}return -1;',
        'int l=0,r=(int)values.size()-1;while(l<=r){int m=l+(r-l)/2;if(values[m]==target)return m;if(values[l]<=values[m]){if(values[l]<=target&&target<values[m])r=m-1;else l=m+1;}else if(values[m]<target&&target<=values[r])l=m+1;else r=m-1;}return -1;'
    ],
    'ch-054': [
        'l,r=0,len(schedule)\n    while l<r:\n        m=(l+r)//2\n        if schedule[m]:r=m\n        else:l=m+1\n    return l if l<len(schedule) else -1',
        'let l=0,r=schedule.length;while(l<r){let m=Math.floor((l+r)/2);if(schedule[m])r=m;else l=m+1;}return l<schedule.length?l:-1;',
        'int l=0,r=schedule.size();while(l<r){int m=l+(r-l)/2;if(schedule.get(m)==1)r=m;else l=m+1;}return l<schedule.size()?l:-1;',
        'int l=0,r=schedule.size();while(l<r){int m=l+(r-l)/2;if(schedule[m])r=m;else l=m+1;}return l<(int)schedule.size()?l:-1;'
    ],
    'ch-055': [
        'l,r=max(weights),sum(weights)\n    while l<r:\n        m=(l+r)//2;used=1;load=0\n        for w in weights:\n            if load+w>m:used+=1;load=0\n            load+=w\n        if used<=days:r=m\n        else:l=m+1\n    return l',
        'let l=Math.max(...weights),r=weights.reduce((a,b)=>a+b,0);while(l<r){let m=Math.floor((l+r)/2),used=1,load=0;for(const w of weights){if(load+w>m){used++;load=0;}load+=w;}if(used<=days)r=m;else l=m+1;}return l;',
        'long l=0,r=0;for(int w:weights){l=Math.max(l,w);r+=w;}while(l<r){long m=l+(r-l)/2;int used=1;long load=0;for(int w:weights){if(load+w>m){used++;load=0;}load+=w;}if(used<=days)r=m;else l=m+1;}return l;',
        'long long l=0,r=0;for(int w:weights){l=std::max(l,(long long)w);r+=w;}while(l<r){long long m=l+(r-l)/2;int used=1;long long load=0;for(int w:weights){if(load+w>m){++used;load=0;}load+=w;}if(used<=days)r=m;else l=m+1;}return l;'
    ],
    'ch-056': [
        'l,r=max(work),sum(work)\n    while l<r:\n        m=(l+r)//2;count=1;total=0\n        for x in work:\n            if total+x>m:count+=1;total=0\n            total+=x\n        if count<=groups:r=m\n        else:l=m+1\n    return l',
        'let l=Math.max(...work),r=work.reduce((a,b)=>a+b,0);while(l<r){let m=Math.floor((l+r)/2),count=1,total=0;for(const x of work){if(total+x>m){count++;total=0;}total+=x;}if(count<=groups)r=m;else l=m+1;}return l;',
        'long l=0,r=0;for(int x:work){l=Math.max(l,x);r+=x;}while(l<r){long m=l+(r-l)/2;int count=1;long total=0;for(int x:work){if(total+x>m){count++;total=0;}total+=x;}if(count<=groups)r=m;else l=m+1;}return l;',
        'long long l=0,r=0;for(int x:work){l=std::max(l,(long long)x);r+=x;}while(l<r){long long m=l+(r-l)/2;int count=1;long long total=0;for(int x:work){if(total+x>m){++count;total=0;}total+=x;}if(count<=groups)r=m;else l=m+1;}return l;'
    ],
    'ch-057': [
        'if len(first)>len(second):first,second=second,first\n    l,r=0,len(first);half=(len(first)+len(second)+1)//2\n    while l<=r:\n        i=(l+r)//2;j=half-i;al=first[i-1] if i else float("-inf");ar=first[i] if i<len(first) else float("inf");bl=second[j-1] if j else float("-inf");br=second[j] if j<len(second) else float("inf")\n        if al>br:r=i-1\n        elif bl>ar:l=i+1\n        else:return max(al,bl) if (len(first)+len(second))%2 else (max(al,bl)+min(ar,br))/2\n    raise ValueError("unsorted inputs")',
        'if(first.length>second.length)[first,second]=[second,first];let l=0,r=first.length,h=Math.floor((first.length+second.length+1)/2);while(l<=r){let i=Math.floor((l+r)/2),j=h-i,al=i?first[i-1]:-Infinity,ar=i<first.length?first[i]:Infinity,bl=j?second[j-1]:-Infinity,br=j<second.length?second[j]:Infinity;if(al>br)r=i-1;else if(bl>ar)l=i+1;else{let x=Math.max(al,bl);return(first.length+second.length)%2?x:(x+Math.min(ar,br))/2;}}throw Error("unsorted inputs");',
        'if(first.size()>second.size()){List<Integer> t=first;first=second;second=t;}int l=0,r=first.size(),h=(first.size()+second.size()+1)/2;while(l<=r){int i=l+(r-l)/2,j=h-i;long al=i>0?first.get(i-1):Long.MIN_VALUE,ar=i<first.size()?first.get(i):Long.MAX_VALUE,bl=j>0?second.get(j-1):Long.MIN_VALUE,br=j<second.size()?second.get(j):Long.MAX_VALUE;if(al>br)r=i-1;else if(bl>ar)l=i+1;else{long x=Math.max(al,bl);return(first.size()+second.size())%2==1?x:(x+Math.min(ar,br))/2.0;}}throw new IllegalArgumentException("unsorted inputs");',
        'const std::vector<int>*a=&first,*b=&second;if(a->size()>b->size())std::swap(a,b);int l=0,r=a->size(),h=(a->size()+b->size()+1)/2;while(l<=r){int i=l+(r-l)/2,j=h-i;long long al=i?(*a)[i-1]:LLONG_MIN,ar=i<(int)a->size()?(*a)[i]:LLONG_MAX,bl=j?(*b)[j-1]:LLONG_MIN,br=j<(int)b->size()?(*b)[j]:LLONG_MAX;if(al>br)r=i-1;else if(bl>ar)l=i+1;else{long long x=std::max(al,bl);return(a->size()+b->size())%2?x:(x+std::min(ar,br))/2.0;}}throw std::logic_error("unsorted inputs");'
    ],
    'ch-058': [
        'lo,hi=grid[0][0],grid[-1][-1]\n    def count(x):\n        r,c=len(grid)-1,0;n=0\n        while r>=0 and c<len(grid[0]):\n            if grid[r][c]<=x:n+=r+1;c+=1\n            else:r-=1\n        return n\n    while lo<hi:\n        m=(lo+hi)//2\n        if count(m)>=k:hi=m\n        else:lo=m+1\n    return lo',
        'let lo=grid[0][0],hi=grid.at(-1).at(-1);const count=x=>{let r=grid.length-1,c=0,n=0;while(r>=0&&c<grid[0].length){if(grid[r][c]<=x){n+=r+1;c++;}else r--;}return n;};while(lo<hi){let m=Math.floor(lo+(hi-lo)/2);if(count(m)>=k)hi=m;else lo=m+1;}return lo;',
        'int lo=grid.get(0).get(0),hi=grid.get(grid.size()-1).get(grid.get(0).size()-1),cols=grid.get(0).size();while(lo<hi){int m=lo+(hi-lo)/2,r=grid.size()-1,c=0,n=0;while(r>=0&&c<cols){if(grid.get(r).get(c)<=m){n+=r+1;c++;}else r--;}if(n>=k)hi=m;else lo=m+1;}return lo;',
        'int lo=grid[0][0],hi=grid.back().back(),cols=grid[0].size();while(lo<hi){int m=lo+(hi-lo)/2,r=grid.size()-1,c=0,n=0;while(r>=0&&c<cols){if(grid[r][c]<=m){n+=r+1;++c;}else --r;}if(n>=k)hi=m;else lo=m+1;}return lo;'
    ]
};

function referenceCodeFactory(id, method, args) {
    const [pyBody, jsBody, javaBody, cppBody] = fullSolutions[id];
    const names = args.map(a => a.name).join(',');
    const params = lang => args.map(({name,type}) => `${lang === 'python' ? `${name}: ${typeNames[type].python}` : `${typeNames[type][lang]} ${name}`}`).join(',');
    const input = lang => args.map(({name,type}) => {
        if(type==='ints') return lang==='python'?`n=int(next(t));${name}=[int(next(t)) for _ in range(n)]`:lang==='javascript'?`const ${name}=ints();`:lang==='java'?`int n${name}=in.nextInt();List<Integer>${name}=new ArrayList<>();for(int i=0;i<n${name};i++)${name}.add(in.nextInt());`:`int n${name};std::cin>>n${name};std::vector<int>${name}(n${name});for(int&x:${name})std::cin>>x;`;
        if(type==='matrix') return lang==='python'?`r=int(next(t));c=int(next(t));${name}=[[int(next(t)) for _ in range(c)] for _ in range(r)]`:lang==='javascript'?`const ${name}=matrix();`:lang==='java'?`int r${name}=in.nextInt(),c${name}=in.nextInt();List<List<Integer>>${name}=new ArrayList<>();for(int i=0;i<r${name};i++){List<Integer>row=new ArrayList<>();for(int j=0;j<c${name};j++)row.add(in.nextInt());${name}.add(row);}`:`int r${name},c${name};std::cin>>r${name}>>c${name};std::vector<std::vector<int>>${name}(r${name},std::vector<int>(c${name}));for(auto&row:${name})for(int&x:row)std::cin>>x;`;
        if(type==='text') return lang==='python'?`${name}=next(t)`:lang==='javascript'?`const ${name}=t[i++];`:lang==='java'?`String ${name}=in.next();`:`std::string ${name};std::cin>>${name};`;
        return lang==='python'?`${name}=int(next(t))`:lang==='javascript'?`const ${name}=Number(t[i++]);`:lang==='java'?`${type==='long'?'long':'int'} ${name}=in.${type==='long'?'nextLong':'nextInt'}();`:`${type==='long'?'long long':'int'} ${name};std::cin>>${name};`;
    }).join('\n');
    const py=`import json,sys\n\ndef ${method}(${params('python')}):\n    ${pyBody}\n\nt=iter(sys.stdin.read().split())\n${input('python')}\na=${method}(${names})\nif isinstance(a,float) and a.is_integer():a=int(a)\nprint(a if isinstance(a,str) else json.dumps(a,separators=(",",":")))\n`;
    const javaType = id==='ch-037'||id==='ch-042'?'boolean':id==='ch-036'||id==='ch-038'||id==='ch-039'||id==='ch-041'||id==='ch-046'?'List<Integer>':id==='ch-050'?'String':id==='ch-044'||id==='ch-057'?'double':id==='ch-052'||id==='ch-040'||id==='ch-043'||id==='ch-047'||id==='ch-055'||id==='ch-056'||id==='ch-058'?'long':'int';
    const cppType = id==='ch-037'||id==='ch-042'?'bool':id==='ch-036'||id==='ch-038'||id==='ch-039'||id==='ch-041'||id==='ch-046'?'std::vector<int>':id==='ch-050'?'std::string':id==='ch-044'||id==='ch-057'?'double':id==='ch-052'||id==='ch-040'||id==='ch-043'||id==='ch-047'||id==='ch-055'||id==='ch-056'||id==='ch-058'?'long long':'int';
    const java=`import java.util.*;import java.io.*;\npublic class Main{static boolean pal(String s,int l,int r){while(l<r)if(s.charAt(l++)!=s.charAt(r--))return false;return true;}static ${javaType} ${method}(${params('java')}){${javaBody}}static String fmt(Object x){if(x instanceof List){StringJoiner j=new StringJoiner(",","[","]");for(Object y:(List<?>)x)j.add(fmt(y));return j.toString();}if(x instanceof Double&&((Double)x)==Math.rint((Double)x))return Long.toString(((Double)x).longValue());return String.valueOf(x);}public static void main(String[]z){Scanner in=new Scanner(System.in);${input('java')}Object a=${method}(${names});System.out.println(fmt(a));}}`;
    const cpp=`#include <algorithm>\n#include <climits>\n#include <cmath>\n#include <cstdlib>\n#include <iostream>\n#include <string>\n#include <unordered_map>\n#include <unordered_set>\n#include <utility>\n#include <vector>\n${cppType} ${method}(${args.map(({name,type})=>`${typeNames[type].cpp} ${name}`).join(',')}){${cppBody}}\nvoid emit(const std::vector<int>&v){std::cout<<"[";for(size_t i=0;i<v.size();i++){if(i)std::cout<<",";std::cout<<v[i];}std::cout<<"]";}void emit(const std::string&s){std::cout<<s;}void emit(bool b){std::cout<<(b?"true":"false");}template<class T>void emit(T x){std::cout<<x;}int main(){${input('cpp')}emit(${method}(${names}));std::cout<<"\\n";}`;
    const js=`const t=require('fs').readFileSync(0,'utf8').trim().split(/\\s+/).filter(Boolean);let i=0;function ints(){let n=Number(t[i++]);return Array.from({length:n},()=>Number(t[i++]));}function matrix(){let r=Number(t[i++]),c=Number(t[i++]);return Array.from({length:r},()=>Array.from({length:c},()=>Number(t[i++])));}function ${method}(${names}){${jsBody}}\n${input('javascript')}const a=${method}(${names});console.log(${id==='ch-050'?'a':'JSON.stringify(a)'});`;
    return {python:py,javascript:js,java,cpp};
}

const learnerGuidance = {
    'ch-036': 'Move inward from both sorted ends; discard the side that cannot reach the target and return one-based positions.',
    'ch-037': 'Find the first mismatching mirrored pair, then test the range after skipping either endpoint with a strict palindrome check.',
    'ch-038': 'Scan the nondecreasing values once and retain only the first item of each equal-value run.',
    'ch-039': 'Sweep opposite ends of the sorted lists; compare absolute error first, then apply both value-based tie-breaks.',
    'ch-040': 'Sort a copy, fix one index, and move the other two inward; preserve the smaller sum when errors tie.',
    'ch-041': 'Evaluate width times the shorter wall, then move that shorter boundary; compare index pairs on equal areas.',
    'ch-042': 'Use prefix-sum equations for three excluded separators, preserving nonempty pieces even when values are negative.',
    'ch-043': 'Advance the side with the lower current boundary; its opposite boundary proves that side’s water level is already determined.',
    'ch-044': 'Maintain the current width-k sum by removing one outgoing value and adding one incoming value.',
    'ch-045': 'Track lowercase frequencies and shrink the left edge whenever the distinct-character count exceeds the limit.',
    'ch-046': 'Update the negative tally using only the value leaving and the value entering each fixed-width window.',
    'ch-047': 'With positive values, expand until the threshold is met and shrink repeatedly to find the shortest qualifying span.',
    'ch-048': 'Track letter frequencies; a window needs length minus its most frequent letter count replacements.',
    'ch-049': 'Grow the nonnegative-cost window and remove leftmost costs until its total fits the budget.',
    'ch-050': 'Track multiplicities of required characters; record a complete window, then contract while every quota remains met.',
    'ch-051': 'Use a half-open binary-search interval to locate the first sorted value that is not less than the target.',
    'ch-052': 'Binary-search the largest feasible integer and compare mid with n divided by mid to avoid multiplication overflow.',
    'ch-053': 'Identify the sorted half at each midpoint and keep it only when its value range contains the target.',
    'ch-054': 'Binary-search the monotone false-to-true boundary; distinguish index n from an actual true schedule slot.',
    'ch-055': 'Binary-search capacity; greedily count ordered shipping days for each candidate without reordering packages.',
    'ch-056': 'Binary-search the maximum group sum; greedily count contiguous groups and use positivity to split groups if needed.',
    'ch-057': 'Binary-search a balanced partition in the shorter sorted run and inspect the four cross-boundary values.',
    'ch-058': 'Binary-search the value range and count values at most mid with a bottom-left staircase walk.'
};

function learnerStarterCode(id, method, args) {
    const names = args.map(a => a.name).join(',');
    const params = lang => args.map(({name,type}) => `${lang==='python'?`${name}: ${typeNames[type].python}`:`${typeNames[type][lang]} ${name}`}`).join(',');
    const read = lang => args.map(({name,type}) => {
        if(type==='ints') return lang==='python'?`n=int(next(tokens));${name}=[int(next(tokens)) for _ in range(n)]`:lang==='javascript'?`const ${name}=readInts();`:lang==='java'?`int n${name}=in.nextInt();List<Integer>${name}=new ArrayList<>();for(int q=0;q<n${name};q++)${name}.add(in.nextInt());`:`int n${name};std::cin>>n${name};std::vector<int>${name}(n${name});for(int&v:${name})std::cin>>v;`;
        if(type==='matrix') return lang==='python'?`rows=int(next(tokens));cols=int(next(tokens));${name}=[[int(next(tokens)) for _ in range(cols)] for _ in range(rows)]`:lang==='javascript'?`const ${name}=readMatrix();`:lang==='java'?`int rows${name}=in.nextInt(),cols${name}=in.nextInt();List<List<Integer>>${name}=new ArrayList<>();for(int r=0;r<rows${name};r++){List<Integer>row=new ArrayList<>();for(int c=0;c<cols${name};c++)row.add(in.nextInt());${name}.add(row);}`:`int rows${name},cols${name};std::cin>>rows${name}>>cols${name};std::vector<std::vector<int>>${name}(rows${name},std::vector<int>(cols${name}));for(auto&row:${name})for(int&v:row)std::cin>>v;`;
        if(type==='text') return lang==='python'?`${name}=next(tokens)`:lang==='javascript'?`const ${name}=tokens[pos++];`:lang==='java'?`String ${name}=in.next();`:`std::string ${name};std::cin>>${name};`;
        return lang==='python'?`${name}=int(next(tokens))`:lang==='javascript'?`const ${name}=Number(tokens[pos++]);`:lang==='java'?`${type==='long'?'long':'int'} ${name}=in.${type==='long'?'nextLong':'nextInt'}();`:`${type==='long'?'long long':'int'} ${name};std::cin>>${name};`;
    }).join('\n');
    const guidance=learnerGuidance[id];
    const py=`import sys\n\ndef ${method}(${params('python')}):\n    """${guidance}"""\n    raise RuntimeError(${JSON.stringify(`Problem-specific starter for ${id} has no solution yet.`)})\n\ntokens=iter(sys.stdin.read().split())\n${read('python')}\n${method}(${names})\n`;
    const java=`import java.util.*;\npublic class Main {\n    static ${methodReturnType(id,'java')} ${method}(${params('java')}) {\n        // ${guidance}\n        throw new UnsupportedOperationException(${JSON.stringify(guidance)});\n    }\n    public static void main(String[] args) {\n        Scanner in=new Scanner(System.in);\n        ${read('java')}\n        ${method}(${names});\n    }\n}\n`;
    const cpp=`#include <iostream>\n#include <string>\n#include <vector>\n#include <stdexcept>\n${methodReturnType(id,'cpp')} ${method}(${args.map(({name,type})=>`${typeNames[type].cpp} ${name}`).join(',')}) {\n    // ${guidance}\n    throw std::logic_error(${JSON.stringify(guidance)});\n}\nint main() {\n    ${read('cpp')}\n    ${method}(${names});\n}\n`;
    const js=`const tokens=require('fs').readFileSync(0,'utf8').trim().split(/\\s+/).filter(Boolean);let pos=0;\nfunction readInts(){const n=Number(tokens[pos++]);return Array.from({length:n},()=>Number(tokens[pos++]));}\nfunction readMatrix(){const r=Number(tokens[pos++]),c=Number(tokens[pos++]);return Array.from({length:r},()=>Array.from({length:c},()=>Number(tokens[pos++])));}\nfunction ${method}(${names}) {\n    // ${guidance}\n    throw new Error(${JSON.stringify(guidance)});\n}\n${read('javascript')}\n${method}(${names});\n`;
    return {python:py,java,cpp,javascript:js};
}

function methodReturnType(id, lang) {
    if (['ch-037','ch-042'].includes(id)) return lang==='java'?'boolean':'bool';
    if (['ch-036','ch-038','ch-039','ch-041','ch-046'].includes(id)) return lang==='java'?'List<Integer>':'std::vector<int>';
    if (id==='ch-050') return lang==='java'?'String':'std::string';
    if (['ch-044','ch-057'].includes(id)) return 'double';
    if (['ch-052','ch-040','ch-043','ch-047','ch-055','ch-056','ch-058'].includes(id)) return lang==='java'?'long':'long long';
    return 'int';
}

function defineProblem(spec) {
    const testCases = spec.testCases.map(testCase => ({ ...testCase }));
    for (const example of spec.examples) {
        const matchingCase = testCases.find(testCase => testCase.stdin === example.input);
        if (matchingCase) {
            if (matchingCase.expectedOutput !== example.output) {
                throw new Error(`${spec.id} example output disagrees with its matching test case.`);
            }
            matchingCase.isHidden = false;
        } else {
            testCases.push({
                stdin: example.input,
                expectedOutput: example.output,
                explanation: example.explanation,
                isHidden: false
            });
        }
    }
    const parseInput = stdin => {
        const tokens = stdin.trim().split(/\s+/).filter(Boolean);
        let cursor = 0;
        return spec.args.map(({ type }) => {
            if (type === 'ints') {
                const length = Number(tokens[cursor++]);
                return Array.from({ length }, () => Number(tokens[cursor++]));
            }
            if (type === 'matrix') {
                const rows = Number(tokens[cursor++]), columns = Number(tokens[cursor++]);
                return Array.from({ length: rows }, () => Array.from({ length: columns }, () => Number(tokens[cursor++])));
            }
            if (type === 'text') return tokens[cursor++];
            return Number(tokens[cursor++]);
        });
    };
    return {
        id: spec.id,
        title: spec.title,
        description: spec.description,
        category: spec.category,
        difficulty: spec.difficulty,
        inputFormat: spec.inputFormat,
        outputFormat: spec.outputFormat,
        constraints: spec.constraints,
        examples: spec.examples,
        testCases,
        hints: spec.hints,
        editorial: spec.editorial,
        timeComplexity: spec.timeComplexity,
        spaceComplexity: spec.spaceComplexity,
        functionSignature: `${spec.method}(${spec.args.map(({ type, name }) => `${typeNames[type].python} ${name}`).join(', ')})`,
        starterCode: learnerStarterCode(spec.id, spec.method, spec.args),
        referenceCode: referenceCodeFactory(spec.id, spec.method, spec.args),
        reference: spec.reference,
        referenceVerifier: stdin => spec.reference(...parseInput(stdin))
    };
}

const specs = [
    {
        id: 'ch-036', category: 'two-pointers', difficulty: 'easy', title: 'Sorted Pair Locator',
        description: 'Given a nondecreasing integer sequence and a target, return the one-based positions of a pair of distinct values whose sum is the target. The input is guaranteed to contain exactly one such pair.',
        inputFormat: 'Whitespace-delimited stdin: n, then n sorted integers, then target, each on its own line or separated by spaces.',
        outputFormat: 'A JSON two-integer array [leftPosition,rightPosition] using one-based positions.',
        constraints: '2 <= n <= 200000; -10^9 <= values[i], target <= 10^9; values are nondecreasing; exactly one valid pair exists.',
        examples: [
            { input: '4\n2 7 11 15\n9', output: '[1,2]', explanation: 'The first and second values sum to 9, so their one-based positions are 1 and 2.' },
            { input: '5\n-4 -1 3 8 12\n7', output: '[2,4]', explanation: '-1 and 8 form the only target pair.' }
        ],
        testCases: [
            { stdin: '4\n1 2 4 9\n3', expectedOutput: '[1,2]', explanation: 'The two smallest values make the target.', isHidden: false },
            { stdin: '5\n-4 -1 3 8 12\n7', expectedOutput: '[2,4]', explanation: 'A negative value pairs with a later positive value.', isHidden: false },
            { stdin: '6\n0 0 1 4 6 10\n14', expectedOutput: '[4,6]', explanation: 'The values four and ten form the unique pair for fourteen.', isHidden: true },
            { stdin: '7\n-8 -3 -1 2 5 9 14\n8', expectedOutput: '[3,6]', explanation: 'The values -1 and 9 make the target near the middle of the sequence.', isHidden: true }
        ],
        hints: ['Start with one candidate at each end; their sum tells you which side can no longer participate.', 'Because the list is sorted, a sum that is too small cannot be repaired by moving the right index left.', 'Convert the found zero-based indexes to the required one-based positions only when formatting the answer.'],
        editorial: 'Keep left and right at the two ends. If their sum equals target, return those positions; if it is smaller, advance left because every smaller right choice would also be too small; otherwise decrement right. The unique-pair guarantee means the scan cannot exhaust its candidates. This avoids copying or hashing the sorted sequence and uses its ordering directly.',
        timeComplexity: 'O(n)', spaceComplexity: 'O(1)', method: 'locateSortedPair', mission: 'Find the unique target pair with inward-moving indexes and return its one-based positions.',
        args: [{ name: 'values', type: 'ints' }, { name: 'target', type: 'long' }],
        reference: (values, target) => { let l = 0, r = values.length - 1; while (l < r) { const sum = values[l] + values[r]; if (sum === target) return [l + 1, r + 1]; if (sum < target) l++; else r--; } return []; }
    },
    {
        id: 'ch-037', category: 'two-pointers', difficulty: 'easy', title: 'Palindrome After One Removal',
        description: 'For a lowercase string, decide whether it can become a palindrome after deleting at most one character.',
        inputFormat: 'Whitespace-delimited stdin containing one nonempty lowercase string with no spaces.',
        outputFormat: 'The lowercase boolean literal true or false.',
        constraints: '1 <= string length <= 200000; the string contains lowercase English letters only.',
        examples: [
            { input: 'abca', output: 'true', explanation: 'Removing either mismatching endpoint, for example c, leaves aba.' },
            { input: 'abc', output: 'false', explanation: 'Removing one character still leaves two distinct letters, which cannot form a palindrome.' }
        ],
        testCases: [
            { stdin: 'raceacar', expectedOutput: 'true', explanation: 'Deleting the extra a yields racecar.', isHidden: false },
            { stdin: 'abba', expectedOutput: 'true', explanation: 'The original string is already a palindrome, so zero deletions suffice.', isHidden: false },
            { stdin: 'deeee', expectedOutput: 'true', explanation: 'Removing the leading d leaves a palindrome.', isHidden: true },
            { stdin: 'abcdef', expectedOutput: 'false', explanation: 'Neither deletion of the first mismatch can make the remaining ends agree.', isHidden: true }
        ],
        hints: ['Compare matching characters from the outside until the first mismatch.', 'At that mismatch, the one allowed deletion has only two meaningful choices: skip the left character or skip the right.', 'Check each remaining range with a plain palindrome scan; do not allow another skip inside that scan.'],
        editorial: 'Use two indexes moving inward while characters agree. On the first disagreement, test the substring after skipping the left endpoint and the substring after skipping the right endpoint with a helper that requires exact mirrored equality. Return true if either range is a palindrome; if the scan reaches the center, the original text already qualifies. Only one mismatch location needs branching, so the total work remains linear.',
        timeComplexity: 'O(n)', spaceComplexity: 'O(1)', method: 'isNearPalindrome', mission: 'Use two inward scans and permit one endpoint skip at the first mismatch.',
        args: [{ name: 'text', type: 'text' }],
        reference: text => { const pal = (l, r) => { while (l < r) { if (text[l++] !== text[r--]) return false; } return true; }; let l = 0, r = text.length - 1; while (l < r && text[l] === text[r]) { l++; r--; } return l >= r || pal(l + 1, r) || pal(l, r - 1); }
    },
    {
        id: 'ch-038', category: 'two-pointers', difficulty: 'easy', title: 'Deduplicate Sorted Stream',
        description: 'Return the sorted sequence with each distinct integer appearing once, preserving ascending order.',
        inputFormat: 'Whitespace-delimited stdin: n followed by n nondecreasing integers.',
        outputFormat: 'A JSON array of the distinct values, or [] when n is zero.',
        constraints: '0 <= n <= 200000; -10^9 <= values[i] <= 10^9; values are nondecreasing.',
        examples: [
            { input: '8\n0 0 1 1 1 2 4 4', output: '[0,1,2,4]', explanation: 'Each run of equal adjacent values contributes just its first value.' },
            { input: '4\n-3 -3 -3 -3', output: '[-3]', explanation: 'One repeated value has one distinct representative.' }
        ],
        testCases: [
            { stdin: '6\n1 1 2 3 3 5', expectedOutput: '[1,2,3,5]', explanation: 'Repeated runs collapse without changing order.', isHidden: false },
            { stdin: '0', expectedOutput: '[]', explanation: 'An empty stream has no distinct entries.', isHidden: false },
            { stdin: '5\n-9 -4 0 7 11', expectedOutput: '[-9,-4,0,7,11]', explanation: 'A sequence already distinct is returned unchanged.', isHidden: true },
            { stdin: '7\n2 2 2 2 3 3 8', expectedOutput: '[2,3,8]', explanation: 'Long runs and a final singleton are handled together.', isHidden: true }
        ],
        hints: ['Only a value different from the last retained value can start a new distinct run.', 'A read index can visit every input once while a write index tracks the compacted prefix.', 'Appending each new run’s first element directly is equivalent to in-place compaction when a new output list is allowed.'],
        editorial: 'Scan left to right and append the current value only when the output is empty or differs from its final element. Nondecreasing order ensures equal values are adjacent, so no set or sorting pass is needed. The output list is the compacted prefix and also naturally supports an empty input.',
        timeComplexity: 'O(n)', spaceComplexity: 'O(u) for u distinct values in the returned array', method: 'uniqueSortedValues', mission: 'Compact adjacent equal runs into a new ascending list.',
        args: [{ name: 'values', type: 'ints' }],
        reference: values => values.filter((value, index) => index === 0 || value !== values[index - 1])
    },
    {
        id: 'ch-039', category: 'two-pointers', difficulty: 'medium', title: 'Closest Pair Across Lists',
        description: 'Choose one value from each sorted integer list so their sum is closest to a target. Break equal-distance ties by the smaller first value, then the smaller second value.',
        inputFormat: 'Whitespace-delimited stdin: n, n sorted values, m, m sorted values, then target.',
        outputFormat: 'A JSON array [firstValue,secondValue] for the selected pair.',
        constraints: '1 <= n,m <= 200000; lists are nondecreasing; absolute values and target are at most 10^9.',
        examples: [
            { input: '4\n1 4 5 7\n4\n10 20 30 40\n32', output: '[1,30]', explanation: 'The sum 31 is the closest available total to 32.' },
            { input: '3\n-5 0 6\n3\n-2 2 8\n4', output: '[6,-2]', explanation: 'The largest first-list value and smallest second-list value sum to the target.' }
        ],
        testCases: [
            { stdin: '3\n1 4 9\n3\n2 6 10\n13', expectedOutput: '[4,10]', explanation: 'The pair totals 14, one away from the target.', isHidden: false },
            { stdin: '2\n-3 5\n2\n-2 4\n1', expectedOutput: '[-3,4]', explanation: 'The exact sum wins regardless of negative values.', isHidden: false },
            { stdin: '3\n1 2 3\n3\n8 9 10\n14', expectedOutput: '[3,10]', explanation: 'The largest available values form the closest sum.', isHidden: true },
            { stdin: '3\n1 2 3\n3\n5 6 7\n8', expectedOutput: '[1,7]', explanation: 'Several pairs tie at distance zero? The pair 1 and 7 totals 8 and is lexicographically earliest among exact pairs.', isHidden: true }
        ],
        hints: ['Begin with the smallest first-list value and the largest second-list value.', 'When the current sum is low, only moving forward in the first list can increase it; when high, move backward in the second.', 'Record a candidate by absolute distance, then apply both value-based tie-breaks explicitly.'],
        editorial: 'Maintain indexes at opposite ends of the two sorted lists and evaluate each current pair. Replace the best pair when its absolute error is smaller, or when errors tie and its value tuple is lexicographically smaller. Move the first index forward for a low sum and the second backward for a high sum; an exact sum can be recorded and the remaining scan may stop because no better error exists, though continuing is also safe. Each index moves only inward.',
        timeComplexity: 'O(n+m)', spaceComplexity: 'O(1)', method: 'closestCrossListPair', mission: 'Sweep the sorted lists from opposite ends while maintaining the distance and lexicographic best pair.',
        args: [{ name: 'first', type: 'ints' }, { name: 'second', type: 'ints' }, { name: 'target', type: 'int' }],
        reference: (first, second, target) => { let i = 0, j = second.length - 1, best = [first[0], second[j]]; while (i < first.length && j >= 0) { const pair = [first[i], second[j]], diff = Math.abs(pair[0] + pair[1] - target), bestDiff = Math.abs(best[0] + best[1] - target); if (diff < bestDiff || (diff === bestDiff && (pair[0] < best[0] || (pair[0] === best[0] && pair[1] < best[1])))) best = pair; const sum = pair[0] + pair[1]; if (sum < target) i++; else if (sum > target) j--; else { i++; j--; } } return best; }
    },
    {
        id: 'ch-040', category: 'two-pointers', difficulty: 'medium', title: 'Three Values Near Target',
        description: 'Return the sum of three values at distinct indexes whose total is closest to target. If sums are equally close, return the smaller sum.',
        inputFormat: 'Whitespace-delimited stdin: n, n integers, then target.',
        outputFormat: 'One integer: the selected three-value sum.',
        constraints: '3 <= n <= 5000; -10^6 <= values[i], target <= 10^6.',
        examples: [
            { input: '4\n-1 2 1 -4\n1', output: '2', explanation: '-1, 1, and 2 sum to 2, the closest total.' },
            { input: '3\n0 0 0\n1', output: '0', explanation: 'Only one choice of three indexes exists, with sum zero.' }
        ],
        testCases: [
            { stdin: '4\n-1 2 1 -4\n1', expectedOutput: '2', explanation: 'The sum is one away from the target.', isHidden: false },
            { stdin: '4\n-2 -1 1 2\n1', expectedOutput: '1', explanation: 'The triple -2, 1, and 2 sums exactly to one.', isHidden: false },
            { stdin: '5\n1 1 1 1 3\n6', expectedOutput: '5', explanation: 'The closest available triple uses two distinct copies of 1 and the 3.', isHidden: true },
            { stdin: '5\n-5 -2 -1 4 8\n3', expectedOutput: '2', explanation: 'The sum -5, -1, and 8 is two, the closest total.', isHidden: true }
        ],
        hints: ['Sort a copy so the first selected index can be fixed while the remaining two are searched inward.', 'For a fixed first value, compare the three-value sum with target to decide which moving pointer can improve it.', 'Keep the smaller sum on equal absolute error; an exact sum is globally optimal.'],
        editorial: 'Sort the values, then fix each index i and initialize left=i+1 and right=n-1. Evaluate their sum and update the best by distance, using the smaller sum as the tie-break. Advance left when the sum is below target and decrement right when above; return immediately on an exact match. Distinct indexes are guaranteed by the pointer bounds, even when values repeat.',
        timeComplexity: 'O(n^2) after sorting', spaceComplexity: 'O(n) for a sorted copy', method: 'closestThreeSum', mission: 'Sort the values, fix each first index, and use two pointers to inspect candidate triples.',
        args: [{ name: 'values', type: 'ints' }, { name: 'target', type: 'int' }],
        reference: (values, target) => { const a = [...values].sort((x, y) => x - y); let best = a[0] + a[1] + a[2]; for (let i = 0; i < a.length - 2; i++) { let l = i + 1, r = a.length - 1; while (l < r) { const sum = a[i] + a[l] + a[r]; if (Math.abs(sum - target) < Math.abs(best - target) || (Math.abs(sum - target) === Math.abs(best - target) && sum < best)) best = sum; if (sum < target) l++; else if (sum > target) r--; else return sum; } } return best; }
    },
    {
        id: 'ch-041', category: 'two-pointers', difficulty: 'medium', title: 'Container Boundary Pair',
        description: 'Given nonnegative heights, select two distinct boundaries that hold the greatest area. Return their zero-based indexes; ties go to the lexicographically earliest index pair.',
        inputFormat: 'Whitespace-delimited stdin: n followed by n nonnegative heights.',
        outputFormat: 'A JSON array [leftIndex,rightIndex], using zero-based indexes.',
        constraints: '2 <= n <= 200000; 0 <= heights[i] <= 10^9.',
        examples: [
            { input: '9\n1 8 6 2 5 4 8 3 7', output: '[1,8]', explanation: 'The limiting height is 7 and the width is 7, giving the maximum area 49.' },
            { input: '2\n1 1', output: '[0,1]', explanation: 'The only available boundaries form the answer.' }
        ],
        testCases: [
            { stdin: '4\n1 2 1 4', expectedOutput: '[1,3]', explanation: 'The height-2 and height-4 walls hold area 4.', isHidden: false },
            { stdin: '5\n5 1 2 1 5', expectedOutput: '[0,4]', explanation: 'Equal tall outer walls maximize width and area.', isHidden: false },
            { stdin: '6\n2 3 4 5 18 17', expectedOutput: '[4,5]', explanation: 'The adjacent heights 18 and 17 enclose area 17.', isHidden: true },
            { stdin: '4\n0 4 4 0', expectedOutput: '[1,2]', explanation: 'Only the two inner positive walls enclose nonzero area.', isHidden: true }
        ],
        hints: ['The area is width times the shorter boundary height, not the taller one.', 'After evaluating a pair, moving the taller side cannot improve the limiting height while it reduces width.', 'When equal areas occur, compare index pairs rather than relying on scan order.'],
        editorial: 'Initialize the endpoints and track the best area and pair. At each step compute (right-left)*min(height[left],height[right]); update on larger area or an equal area with a lexicographically earlier pair. Move the shorter side inward, since retaining it while shrinking width cannot increase the limiting height. For equal heights, moving either endpoint is safe; moving the left endpoint gives a deterministic scan.',
        timeComplexity: 'O(n)', spaceComplexity: 'O(1)', method: 'maxWaterBoundaryPair', mission: 'Apply the inward two-pointer area scan while keeping the lexicographically earliest maximum-area pair.',
        args: [{ name: 'heights', type: 'ints' }],
        reference: heights => { let l = 0, r = heights.length - 1, best = -1, pair = [l, r]; while (l < r) { const area = (r - l) * Math.min(heights[l], heights[r]); if (area > best || (area === best && (l < pair[0] || (l === pair[0] && r < pair[1])))) { best = area; pair = [l, r]; } if (heights[l] <= heights[r]) l++; else r--; } return pair; }
    },
    {
        id: 'ch-042', category: 'two-pointers', difficulty: 'hard', title: 'Four-Part Equal Split',
        description: 'Decide whether three cut positions can divide an integer array into four nonempty contiguous parts with equal sums. The three cut elements are excluded from all four sums.',
        inputFormat: 'Whitespace-delimited stdin: n followed by n integers.',
        outputFormat: 'The lowercase boolean literal true or false.',
        constraints: '7 <= n <= 2500; -10^6 <= values[i] <= 10^6.',
        examples: [
            { input: '7\n1 0 1 0 1 0 1', output: 'true', explanation: 'Cutting at indexes 1, 3, and 5 leaves four parts each summing to 1.' },
            { input: '7\n1 2 3 4 5 6 7', output: 'false', explanation: 'No three excluded separators produce four equal nonempty sums.' }
        ],
        testCases: [
            { stdin: '7\n1 0 1 0 1 0 1', expectedOutput: 'true', explanation: 'Three zero separators leave four one-element parts of sum one.', isHidden: false },
            { stdin: '7\n1 2 3 4 5 6 7', expectedOutput: 'false', explanation: 'Increasing values cannot satisfy the four equal-part equations.', isHidden: false },
            { stdin: '8\n0 0 0 0 0 0 0 0', expectedOutput: 'true', explanation: 'Any valid three separators leave four nonempty zero-sum parts.', isHidden: true },
            { stdin: '7\n2 0 2 0 2 0 2', expectedOutput: 'true', explanation: 'The same valid cut positions leave four equal parts of sum two.', isHidden: true }
        ],
        hints: ['Let i, j, and k be the excluded separator indexes; every kept segment must be nonempty.', 'Prefix sums make each of the four segment totals a constant-time expression, even with negative values.', 'For each middle separator j, enumerate valid i values, then look for a later k whose prefix reaches the required third-segment total.'],
        editorial: 'Build prefix sums p with p[t] equal to the sum before index t. For each middle cut j, consider i<=j-2 and set s=p[i]; the first two retained sums match exactly when p[j]-p[i+1]=s. For every such candidate, search k>=j+2 for p[k]-p[j+1]=s, equivalently p[k]=s+p[j+1]; a set of eligible suffix prefix values makes this lookup constant time. The index bounds ensure all four pieces contain at least one value. This quadratic method supports negative entries and avoids invalid monotonic-prefix assumptions.',
        timeComplexity: 'O(n^2)', spaceComplexity: 'O(n)', method: 'hasFourEqualParts', mission: 'Use prefix-sum equations for the excluded separators, checking each middle cut against valid left and right cuts.',
        args: [{ name: 'values', type: 'ints' }],
        reference: values => { const n = values.length, p = Array(n + 1).fill(0); for (let i = 0; i < n; i++) p[i + 1] = p[i] + values[i]; for (let j = 2; j <= n - 3; j++) { const suffix = new Set(); for (let k = j + 2; k <= n - 1; k++) suffix.add(p[k]); for (let i = 1; i <= j - 2; i++) { const s = p[i]; if (p[j] - p[i + 1] === s && suffix.has(s + p[j + 1])) return true; } } return false; }
    },
    {
        id: 'ch-043', category: 'two-pointers', difficulty: 'hard', title: 'Water Held Between Stone Ridges',
        description: 'A line of stone ridges has unit-width columns with nonnegative heights. After a storm, water remains in every low column only when taller ridges bound it on both sides. Return the total number of unit cubes retained across the line.',
        inputFormat: 'Whitespace-delimited stdin: a positive column count n followed by n nonnegative integer ridge heights.',
        outputFormat: 'One integer: the total retained water volume in unit cubes.',
        constraints: '1 <= n <= 200000; 0 <= heights[i] <= 1000000000; the answer fits a signed 64-bit integer.',
        examples: [
            { input: '12\n0 1 0 2 1 0 1 3 2 1 2 1', output: '6', explanation: 'The bounded dips collect six unit cubes when their local water levels are counted.' },
            { input: '6\n4 2 0 3 2 5', output: '9', explanation: 'The right ridge bounds the basin, which holds nine cubes above the interior columns.' }
        ],
        testCases: [
            { stdin: '12\n0 1 0 2 1 0 1 3 2 1 2 1', expectedOutput: '6', explanation: 'The two-ended scan sums the water above each bounded valley.', isHidden: false },
            { stdin: '6\n4 2 0 3 2 5', expectedOutput: '9', explanation: 'Interior columns are filled up to the shorter ridge on each side.', isHidden: false },
            { stdin: '5\n0 1 2 3 4', expectedOutput: '0', explanation: 'A steadily rising boundary has no right wall to retain water.', isHidden: true },
            { stdin: '6\n5 2 1 2 1 5', expectedOutput: '14', explanation: 'Equal outer ridges retain the sum of four interior deficits.', isHidden: true }
        ],
        hints: [
            'At any moment, the shorter visible ridge fixes the maximum water level for its own column, regardless of the unseen interior.',
            'Keep the tallest wall encountered from each end; the gap between that wall and the current column is the newly trapped amount.',
            'Move only the pointer at the lower end, adding its water before advancing it; this visits each column at most once.'
        ],
        editorial: 'Place pointers at the two ends and track the tallest ridge seen from each side. If the left endpoint is no higher than the right endpoint, the left-side water level is already bounded by the right ridge, so add leftMaximum minus the current left height and advance left. Otherwise, the symmetric right-side level is fixed by the left ridge; add rightMaximum minus the current right height and move right inward. Each step accounts for one column exactly once, including zero-height edges, yielding O(n) time and O(1) auxiliary space. A 64-bit accumulator is required because the total can exceed 32-bit bounds.',
        timeComplexity: 'O(n)', spaceComplexity: 'O(1)', method: 'trappedRidgeWater', mission: 'Advance the side with the lower current boundary and accumulate its deficit below the tallest ridge seen from that side.',
        args: [{ name: 'heights', type: 'ints' }],
        reference: heights => { let left = 0, right = heights.length - 1, leftWall = 0, rightWall = 0, water = 0; while (left < right) { if (heights[left] <= heights[right]) { leftWall = Math.max(leftWall, heights[left]); water += leftWall - heights[left++]; } else { rightWall = Math.max(rightWall, heights[right]); water += rightWall - heights[right--]; } } return water; }
    },
    {
        id: 'ch-044', category: 'sliding-window', difficulty: 'easy', title: 'Fixed Window Peak Mean',
        description: 'Find the maximum arithmetic mean among all contiguous windows of exactly width k.',
        inputFormat: 'Whitespace-delimited stdin: n, n integers, then k.',
        outputFormat: 'One decimal number; answers within 1e-6 of the exact mean are accepted.',
        constraints: '1 <= k <= n <= 200000; -10^6 <= values[i] <= 10^6.',
        examples: [
            { input: '6\n1 12 -5 -6 50 3\n4', output: '12.75', explanation: 'The best length-four window sums to 51, giving mean 12.75.' },
            { input: '4\n-5 -2 -8 -1\n2', output: '-3.5', explanation: 'The first pair has the largest (least negative) mean.' }
        ],
        testCases: [
            { stdin: '5\n1 2 3 4 5\n2', expectedOutput: '4.5', explanation: 'The last adjacent pair has the greatest sum.', isHidden: false },
            { stdin: '3\n7 7 7\n1', expectedOutput: '7', explanation: 'Every one-element window has the same mean.', isHidden: false },
            { stdin: '4\n-5 -2 -8 -1\n2', expectedOutput: '-3.5', explanation: 'A negative sequence still requires maximizing its sum.', isHidden: true },
            { stdin: '6\n1000000 -1000000 1000000 -1000000 5 5\n2', expectedOutput: '5', explanation: 'The final two values beat windows with large positive and negative cancellation.', isHidden: true },
            { stdin: '6\n2 4 6 8 10 12\n3', expectedOutput: '10', explanation: 'The final three consecutive values have the greatest mean, ten.', isHidden: true }
        ],
        hints: ['The mean denominator is the same for every candidate, so compare window sums instead.', 'Compute the first window once; after that, subtract the value leaving and add the value entering.', 'Do not initialize the best sum to zero because all valid windows may be negative.'],
        editorial: 'Sum the first k values and store that as the best. Slide the window one position at a time by subtracting its outgoing value and adding its incoming value, updating the largest sum. Divide by k only once at the end. Initializing from an actual window handles all-negative inputs without a special case.',
        timeComplexity: 'O(n)', spaceComplexity: 'O(1)', method: 'maximumWindowMean', mission: 'Maintain one rolling sum of width k and return its largest value divided by k.',
        args: [{ name: 'values', type: 'ints' }, { name: 'width', type: 'int' }],
        reference: (values, width) => { let sum = 0; for (let i = 0; i < width; i++) sum += values[i]; let best = sum; for (let i = width; i < values.length; i++) { sum += values[i] - values[i - width]; best = Math.max(best, sum); } return best / width; }
    },
    {
        id: 'ch-045', category: 'sliding-window', difficulty: 'easy', title: 'Bounded Distinct Window',
        description: 'Return the length of the longest contiguous lowercase substring containing at most k distinct characters.',
        inputFormat: 'Whitespace-delimited stdin: one lowercase string, then integer k.',
        outputFormat: 'One integer: the maximum substring length.',
        constraints: '1 <= string length <= 200000; 0 <= k <= 26; strings contain lowercase English letters.',
        examples: [
            { input: 'eceba\n2', output: '3', explanation: 'The substring ece contains two distinct letters and has length three.' },
            { input: 'aa\n0', output: '0', explanation: 'No nonempty substring can contain at most zero distinct characters.' }
        ],
        testCases: [
            { stdin: 'eceba\n2', expectedOutput: '3', explanation: 'The longest valid window is ece.', isHidden: false },
            { stdin: 'aa\n1', expectedOutput: '2', explanation: 'Both repeated characters belong to one distinct-letter class.', isHidden: false },
            { stdin: 'abc\n0', expectedOutput: '0', explanation: 'The window contracts to empty because every character exceeds the limit.', isHidden: true },
            { stdin: 'abaccc\n2', expectedOutput: '4', explanation: 'The suffix accc has length four and uses only a and c.', isHidden: true }
        ],
        hints: ['Track character frequencies in the current window rather than rescanning each substring.', 'Expand right by one; if the distinct count exceeds k, advance left until it is valid again.', 'When a character count reaches zero, remove its key so the distinct count reflects only the active range.'],
        editorial: 'Use a frequency map and two indexes. Add each right character and increase the distinct count when its former frequency was zero. While the distinct count exceeds k, remove the left character and decrement the distinct count when its frequency becomes zero. After restoring validity, update the maximum width. When k is zero, every character is removed and the answer remains zero.',
        timeComplexity: 'O(n)', spaceComplexity: 'O(min(n,alphabet size))', method: 'longestAtMostKDistinct', mission: 'Grow a frequency-counted window and shrink its left edge until no more than k letters remain.',
        args: [{ name: 'text', type: 'text' }, { name: 'limit', type: 'int' }],
        reference: (text, limit) => { const counts = new Map(); let left = 0, best = 0; for (let right = 0; right < text.length; right++) { counts.set(text[right], (counts.get(text[right]) || 0) + 1); while (counts.size > limit) { const c = text[left++], next = counts.get(c) - 1; if (next) counts.set(c, next); else counts.delete(c); } best = Math.max(best, right - left + 1); } return best; }
    },
    {
        id: 'ch-046', category: 'sliding-window', difficulty: 'easy', title: 'Windowed Negative Count',
        description: 'For each contiguous window of width k, report how many values in that window are strictly negative.',
        inputFormat: 'Whitespace-delimited stdin: n, n integers, then k.',
        outputFormat: 'A JSON array containing one negative-value count per window, from left to right.',
        constraints: '1 <= k <= n <= 200000; -10^9 <= values[i] <= 10^9.',
        examples: [
            { input: '6\n-1 2 -3 4 -5 6\n3', output: '[2,1,2,1]', explanation: 'The four width-three windows contain 2, 1, 2, and 1 negative values.' },
            { input: '4\n0 -2 0 3\n1', output: '[0,1,0,0]', explanation: 'Zero is not negative, while -2 contributes one.' }
        ],
        testCases: [
            { stdin: '5\n-2 -1 0 4 -3\n2', expectedOutput: '[2,1,0,1]', explanation: 'The count changes as negatives leave and enter the window.', isHidden: false },
            { stdin: '3\n1 2 3\n3', expectedOutput: '[0]', explanation: 'A full-width window with no negative values has count zero.', isHidden: false },
            { stdin: '4\n-1 -1 -1 -1\n2', expectedOutput: '[2,2,2]', explanation: 'Every fixed-width window is entirely negative.', isHidden: true },
            { stdin: '6\n0 -5 2 0 -1 3\n3', expectedOutput: '[1,1,1,1]', explanation: 'Zeros at either boundary never increment the count.', isHidden: true }
        ],
        hints: ['Count negatives in the first window once rather than rebuilding the count for every start.', 'When shifting one place, only the outgoing and incoming values can change the count.', 'Treat zero as nonnegative: decrement only when an outgoing value is below zero.'],
        editorial: 'Count negative values in indexes 0 through k-1. For each next window, subtract one if the outgoing value is negative and add one if the incoming value is negative, then append the current count. This reports exactly n-k+1 values and uses constant working memory apart from the required result list.',
        timeComplexity: 'O(n)', spaceComplexity: 'O(n) for the returned counts', method: 'negativeCountsByWindow', mission: 'Update the negative count by considering only the values crossing each window boundary.',
        args: [{ name: 'values', type: 'ints' }, { name: 'width', type: 'int' }],
        reference: (values, width) => { let count = 0; for (let i = 0; i < width; i++) if (values[i] < 0) count++; const answer = [count]; for (let i = width; i < values.length; i++) { if (values[i - width] < 0) count--; if (values[i] < 0) count++; answer.push(count); } return answer; }
    },
    {
        id: 'ch-047', category: 'sliding-window', difficulty: 'medium', title: 'Smallest Sum Threshold Span',
        description: 'Find the minimum length of a contiguous segment of positive integers whose sum is at least target. Return zero if no such segment exists.',
        inputFormat: 'Whitespace-delimited stdin: n, n positive integers, then target.',
        outputFormat: 'One integer: the shortest qualifying segment length, or 0.',
        constraints: '1 <= target <= 10^12; 0 <= n <= 200000; 1 <= values[i] <= 10^9.',
        examples: [
            { input: '6\n2 3 1 2 4 3\n7', output: '2', explanation: 'The final pair 4,3 reaches the threshold with length two.' },
            { input: '5\n1 1 1 1 1\n11', output: '0', explanation: 'The total is below the target, so no qualifying segment exists.' }
        ],
        testCases: [
            { stdin: '6\n2 3 1 2 4 3\n7', expectedOutput: '2', explanation: 'Two adjacent values are enough, and no single value reaches seven.', isHidden: false },
            { stdin: '3\n1 4 4\n4', expectedOutput: '1', explanation: 'A single value already meets the threshold.', isHidden: false },
            { stdin: '0\n20', expectedOutput: '0', explanation: 'An empty input sequence cannot reach the positive target.', isHidden: true },
            { stdin: '6\n1 2 3 4 5 6\n15', expectedOutput: '3', explanation: 'The segment 4,5,6 has length three and sum fifteen.', isHidden: true }
        ],
        hints: ['Positive values make the window sum monotone as either edge moves.', 'Expand the right edge until the sum qualifies, then try removing from the left while it still qualifies.', 'A best answer initialized beyond n makes the no-solution case easy to detect.'],
        editorial: 'Maintain a half-open window [left,right) and its sum. Add each incoming positive value. While the sum is at least target, record the current width and remove the leftmost value; positivity ensures removing values can only reduce the sum. If no qualifying window was recorded, return zero. Positive inputs are essential to this linear shrink strategy.',
        timeComplexity: 'O(n)', spaceComplexity: 'O(1)', method: 'shortestThresholdSpan', mission: 'Expand a positive-sum window, then shrink it repeatedly while it remains above the threshold.',
        args: [{ name: 'values', type: 'ints' }, { name: 'target', type: 'long' }],
        reference: (values, target) => { let left = 0, sum = 0, best = Infinity; for (let right = 0; right < values.length; right++) { sum += values[right]; while (sum >= target) { best = Math.min(best, right - left + 1); sum -= values[left++]; } } return best === Infinity ? 0 : best; }
    },
    {
        id: 'ch-048', category: 'sliding-window', difficulty: 'medium', title: 'Replacement-Limited Uniform Run',
        description: 'Return the length of the longest uppercase substring that can be made of one repeated letter by replacing at most k characters.',
        inputFormat: 'Whitespace-delimited stdin: one uppercase string, then nonnegative integer k.',
        outputFormat: 'One integer: the maximum achievable substring length.',
        constraints: '0 <= string length <= 200000; 0 <= k <= string length; characters are A through Z.',
        examples: [
            { input: 'ABAB\n2', output: '4', explanation: 'Replacing both Bs or both As makes the entire string uniform.' },
            { input: 'AABABBA\n1', output: '4', explanation: 'A window such as AABA needs one replacement and has length four.' }
        ],
        testCases: [
            { stdin: 'ABAB\n2', expectedOutput: '4', explanation: 'Two changes can unify all four letters.', isHidden: false },
            { stdin: 'AAAA\n0', expectedOutput: '4', explanation: 'An already uniform run needs no replacements.', isHidden: false },
            { stdin: 'ABCDE\n1', expectedOutput: '2', explanation: 'A pair can be unified with one replacement, but no length-three window can.', isHidden: true },
            { stdin: 'AABABBA\n1', expectedOutput: '4', explanation: 'The best valid span has four positions.', isHidden: true },
            { stdin: 'AABC\n1', expectedOutput: '3', explanation: 'One replacement unifies a three-letter window but not the entire word.', isHidden: true }
        ],
        hints: ['For a chosen window, changing every non-majority character is sufficient and necessary.', 'Track the most frequent letter count in the active range; validity is window length minus that count <= k.', 'As the left edge moves, a historical maximum-frequency count can remain as an upper bound for deciding whether to shrink.'],
        editorial: 'Grow a window while counting each uppercase letter and maintaining the greatest frequency observed. If window length minus that greatest frequency exceeds k, move left once and decrement the departing letter. Update the maximum valid width as right advances. The retained greatest frequency may be stale after shrinkage, but it is a safe upper bound: it can postpone a contraction, not cause an invalid larger answer to be accepted, because the best-width condition still corresponds to a window that was valid when established.',
        timeComplexity: 'O(n)', spaceComplexity: 'O(1) (26 counters)', method: 'longestUniformAfterReplacements', mission: 'Track letter frequencies in a sliding window and bound replacements by window length minus its dominant count.',
        args: [{ name: 'text', type: 'text' }, { name: 'replacements', type: 'int' }],
        reference: (text, replacements) => { const counts = Array(26).fill(0); let left = 0, maxFrequency = 0, best = 0; for (let right = 0; right < text.length; right++) { const i = text.charCodeAt(right) - 65; counts[i]++; maxFrequency = Math.max(maxFrequency, counts[i]); while (right - left + 1 - maxFrequency > replacements) counts[text.charCodeAt(left++) - 65]--; best = Math.max(best, right - left + 1); } return best; }
    },
    {
        id: 'ch-049', category: 'sliding-window', difficulty: 'medium', title: 'Longest Budgeted Activity',
        description: 'Given nonnegative per-day costs and a budget, return the longest contiguous interval whose total cost does not exceed that budget.',
        inputFormat: 'Whitespace-delimited stdin: n, n nonnegative costs, then budget.',
        outputFormat: 'One integer: the longest affordable interval length.',
        constraints: '0 <= n <= 200000; 0 <= costs[i], budget <= 10^9.',
        examples: [
            { input: '6\n2 1 3 2 4 1\n8', output: '4', explanation: 'The first four costs total 8 and fit the budget.' },
            { input: '4\n5 1 1 1\n3', output: '3', explanation: 'The final three days cost exactly 3.' }
        ],
        testCases: [
            { stdin: '5\n2 1 2 4 1\n5', expectedOutput: '3', explanation: 'The first three activities total five.', isHidden: false },
            { stdin: '3\n0 0 1\n0', expectedOutput: '2', explanation: 'Two zero-cost days fit a zero budget.', isHidden: false },
            { stdin: '0\n4', expectedOutput: '0', explanation: 'No days produce an interval of length zero.', isHidden: true },
            { stdin: '5\n11 0 0 10 0\n10', expectedOutput: '4', explanation: 'The final four costs total ten and are the longest valid span.', isHidden: true }
        ],
        hints: ['Nonnegative costs mean enlarging a window cannot reduce its total.', 'Add each new cost, then remove leftmost costs until the budget is met again.', 'Zero-cost entries can remain together even when the budget is zero; do not assume every valid window has a positive sum.'],
        editorial: 'Keep a running total for [left,right]. Add the next cost, then advance left while the total exceeds budget, subtracting each removed cost. Once valid, update the maximum length. Because all costs are nonnegative, the only way to restore affordability is to remove values from the left, and the method handles zero costs naturally.',
        timeComplexity: 'O(n)', spaceComplexity: 'O(1)', method: 'longestAffordableInterval', mission: 'Maintain a cost total that never exceeds budget after each right-edge expansion.',
        args: [{ name: 'costs', type: 'ints' }, { name: 'budget', type: 'int' }],
        reference: (costs, budget) => { let left = 0, sum = 0, best = 0; for (let right = 0; right < costs.length; right++) { sum += costs[right]; while (sum > budget) sum -= costs[left++]; best = Math.max(best, right - left + 1); } return best; }
    },
    {
        id: 'ch-050', category: 'sliding-window', difficulty: 'hard', title: 'Minimum Required Cover',
        description: 'Return the shortest substring of source containing every character in required with its full multiplicity. If several shortest covers exist, return the one with the earliest starting index; return an empty string when no cover exists.',
        inputFormat: 'Whitespace-delimited stdin: source string, then required string. Both contain no spaces.',
        outputFormat: 'The selected substring, or an empty line if no cover exists.',
        constraints: '1 <= source length, required length <= 200000; both strings contain ASCII letters.',
        examples: [
            { input: 'ADOBECODEBANC\nABC', output: 'BANC', explanation: 'BANC is the shortest substring containing A, B, and C.' },
            { input: 'a\naa', output: '', explanation: 'The source does not contain two copies of a.' }
        ],
        testCases: [
            { stdin: 'ADOBECODEBANC\nABC', expectedOutput: 'BANC', explanation: 'The minimum cover is the final four-character substring.', isHidden: false },
            { stdin: 'a\nb', expectedOutput: '', explanation: 'The required character never occurs in the source.', isHidden: false },
            { stdin: 'aaab\naab', expectedOutput: 'aab', explanation: 'The final aab segment contains two a characters and one b.', isHidden: true },
            { stdin: 'xyyzyzyx\nyyz', expectedOutput: 'yyz', explanation: 'The earliest shortest window includes two y characters and z.', isHidden: true }
        ],
        hints: ['Store required multiplicities, not just a set of required characters.', 'A window becomes complete once every required count is met; then shrink from the left while it stays complete.', 'When two covers have the same length, retain the earlier start and update only for a strictly shorter one.'],
        editorial: 'Count required characters in a frequency map and track how many required character instances have been matched. As the right pointer expands, increment the matching count only while the new occurrence does not exceed its required multiplicity. Once all required instances are covered, record the current window if strictly shorter, then move left inward; when removing a needed occurrence drops below its quota, the window is no longer complete. The multiplicity counter makes repeated requirements exact and the strict update preserves earliest-start ties.',
        timeComplexity: 'O(|source| + |required|)', spaceComplexity: 'O(number of distinct required characters)', method: 'minimumRequiredCover', mission: 'Track required character quotas while expanding and contracting candidate source windows.',
        args: [{ name: 'source', type: 'text' }, { name: 'required', type: 'text' }],
        reference: (source, required) => { if (!required.length) return ''; const need = new Map(); for (const c of required) need.set(c, (need.get(c) || 0) + 1); let matched = 0, left = 0, bestStart = -1, bestLength = Infinity; for (let right = 0; right < source.length; right++) { const c = source[right]; if (need.has(c)) { if (need.get(c) > 0) matched++; need.set(c, need.get(c) - 1); } while (matched === required.length) { const length = right - left + 1; if (length < bestLength) { bestLength = length; bestStart = left; } const removed = source[left++]; if (need.has(removed)) { need.set(removed, need.get(removed) + 1); if (need.get(removed) > 0) matched--; } } } return bestStart < 0 ? '' : source.slice(bestStart, bestStart + bestLength); }
    },
    {
        id: 'ch-051', category: 'binary-search', difficulty: 'easy', title: 'Lower Bound Position',
        description: 'Return the smallest zero-based index where target can be inserted into a nondecreasing sequence without changing its order.',
        inputFormat: 'Whitespace-delimited stdin: n, n sorted integers, then target.',
        outputFormat: 'One integer from 0 through n: the lower-bound insertion index.',
        constraints: '0 <= n <= 200000; -10^9 <= values[i], target <= 10^9; values are nondecreasing.',
        examples: [
            { input: '4\n1 3 5 6\n5', output: '2', explanation: 'The first existing value not less than 5 is at index 2.' },
            { input: '4\n1 3 5 6\n2', output: '1', explanation: 'Index 1 is the position before the first value greater than 2.' }
        ],
        testCases: [
            { stdin: '4\n1 3 5 6\n5', expectedOutput: '2', explanation: 'An existing target returns its first eligible position.', isHidden: false },
            { stdin: '4\n1 3 5 6\n7', expectedOutput: '4', explanation: 'A larger target belongs at the end.', isHidden: false },
            { stdin: '5\n2 2 2 4 8\n2', expectedOutput: '0', explanation: 'Duplicates require the first equal index, not any matching index.', isHidden: true },
            { stdin: '0\n\n-10', expectedOutput: '0', explanation: 'The only insertion position in an empty sequence is zero.', isHidden: true }
        ],
        hints: ['Use a half-open search range so n itself is a valid result.', 'When the middle value is at least target, preserve that middle position as a possible answer by moving the upper bound to it.', 'When the search interval becomes empty, its left endpoint is the first position satisfying the lower-bound condition.'],
        editorial: 'Binary-search the half-open interval [0,n). At each midpoint, if values[mid]>=target, discard the upper half starting after mid by setting right=mid; otherwise set left=mid+1. The loop ends at the first index whose value is not less than target, or n if all values are smaller. This naturally returns the first duplicate and handles an empty input.',
        timeComplexity: 'O(log n)', spaceComplexity: 'O(1)', method: 'lowerBoundIndex', mission: 'Find the first index whose sorted value is greater than or equal to target.',
        args: [{ name: 'values', type: 'ints' }, { name: 'target', type: 'int' }],
        reference: (values, target) => { let l = 0, r = values.length; while (l < r) { const m = Math.floor((l + r) / 2); if (values[m] >= target) r = m; else l = m + 1; } return l; }
    },
    {
        id: 'ch-052', category: 'binary-search', difficulty: 'easy', title: 'Integer Square Root',
        description: 'Return the greatest integer x such that x*x is no greater than a given nonnegative integer n, without floating-point square-root operations.',
        inputFormat: 'Whitespace-delimited stdin containing one nonnegative integer n.',
        outputFormat: 'One integer: floor(sqrt(n)).',
        constraints: '0 <= n <= 2^53-1; n is a safe integer and the result is floor(sqrt(n)).',
        examples: [
            { input: '8', output: '2', explanation: '2 squared is 4 and 3 squared is 9, which exceeds 8.' },
            { input: '16', output: '4', explanation: 'Sixteen is a perfect square.' }
        ],
        testCases: [
            { stdin: '8', expectedOutput: '2', explanation: 'The floor root sits immediately below 3.', isHidden: false },
            { stdin: '0', expectedOutput: '0', explanation: 'Zero is its own integer square root.', isHidden: false },
            { stdin: '1', expectedOutput: '1', explanation: 'The smallest positive input has root one.', isHidden: true },
            { stdin: '9007199254740991', expectedOutput: '94906265', explanation: 'The largest permitted exact integer is just below 94906266 squared.', isHidden: true }
        ],
        hints: ['The answer lies between zero and n for small values, but n/2+1 is already a sufficient upper bound when n>=2.', 'Compare mid with n divided by mid instead of multiplying mid by itself, which can overflow fixed-width integer languages.', 'Keep the greatest feasible midpoint and continue searching to its right.'],
        editorial: 'For n below 2, return n. Otherwise binary-search [1,n/2+1]. A midpoint is feasible when mid<=n/mid, avoiding multiplication overflow; feasible midpoints become the current answer and move the lower bound right, while infeasible ones lower the upper bound. The final stored feasible value is precisely the floor square root.',
        timeComplexity: 'O(log n)', spaceComplexity: 'O(1)', method: 'integerSquareRoot', mission: 'Binary-search the largest integer whose quotient comparison proves its square does not exceed n.',
        args: [{ name: 'n', type: 'long' }],
        reference: n => { if (n < 2) return n; let l = 1, r = Math.floor(n / 2) + 1, answer = 1; while (l <= r) { const m = Math.floor((l + r) / 2); if (m <= Math.floor(n / m)) { answer = m; l = m + 1; } else r = m - 1; } return answer; }
    },
    {
        id: 'ch-053', category: 'binary-search', difficulty: 'easy', title: 'Rotated Target Position',
        description: 'Search for target in a strictly increasing sequence that was rotated at an unknown pivot. Return its zero-based index, or -1 if it is absent.',
        inputFormat: 'Whitespace-delimited stdin: n, n distinct integers in rotated sorted order, then target.',
        outputFormat: 'One integer: the target index, or -1.',
        constraints: '0 <= n <= 200000; values are distinct; absolute values and target are at most 10^9.',
        examples: [
            { input: '7\n4 5 6 7 0 1 2\n0', output: '4', explanation: 'The target is at index 4 in the rotated sequence.' },
            { input: '7\n4 5 6 7 0 1 2\n3', output: '-1', explanation: 'The rotated order contains no entry equal to the requested target value.' }
        ],
        testCases: [
            { stdin: '7\n4 5 6 7 0 1 2\n0', expectedOutput: '4', explanation: 'The target is in the lower-valued sorted half.', isHidden: false },
            { stdin: '5\n1 3 5 7 9\n7', expectedOutput: '3', explanation: 'A rotation by zero is still valid input.', isHidden: false },
            { stdin: '1\n-4\n-4', expectedOutput: '0', explanation: 'A one-element sequence can contain the target.', isHidden: true },
            { stdin: '6\n8 10 12 1 3 6\n7', expectedOutput: '-1', explanation: 'The target falls in the gap between the two sorted regions.', isHidden: true }
        ],
        hints: ['At every midpoint, at least one of the two halves is sorted.', 'Check whether target falls within the inclusive value range of the sorted half before choosing which side to discard.', 'Strictly increasing values remove the ambiguity that duplicates would create at the pivot.'],
        editorial: 'Maintain inclusive bounds. At the midpoint, return if it matches. If left through mid is sorted, keep that half only when target lies in its inclusive range; otherwise search the other half. If the right half is sorted, use the symmetric range test. Each iteration discards at least half the remaining indexes, including when the input is unrotated or has one element.',
        timeComplexity: 'O(log n)', spaceComplexity: 'O(1)', method: 'searchRotatedValues', mission: 'At each midpoint, identify the sorted half and retain it only when its range contains the target.',
        args: [{ name: 'values', type: 'ints' }, { name: 'target', type: 'int' }],
        reference: (values, target) => { let l = 0, r = values.length - 1; while (l <= r) { const m = Math.floor((l + r) / 2); if (values[m] === target) return m; if (values[l] <= values[m]) { if (values[l] <= target && target < values[m]) r = m - 1; else l = m + 1; } else { if (values[m] < target && target <= values[r]) l = m + 1; else r = m - 1; } } return -1; }
    },
    {
        id: 'ch-054', category: 'binary-search', difficulty: 'medium', title: 'First True Schedule Slot',
        description: 'Given a boolean schedule that is false for an initial run and true thereafter, return the index of the earliest true slot, or -1 if every slot is false.',
        inputFormat: 'Whitespace-delimited stdin: n followed by n values, each 0 for false or 1 for true.',
        outputFormat: 'One integer: the first true zero-based index, or -1.',
        constraints: '0 <= n <= 200000; values are monotone nondecreasing and each is 0 or 1.',
        examples: [
            { input: '5\n0 0 1 1 1', output: '2', explanation: 'Index 2 is the first scheduled true slot.' },
            { input: '4\n0 0 0 0', output: '-1', explanation: 'The schedule has no true slot.' }
        ],
        testCases: [
            { stdin: '5\n0 0 1 1 1', expectedOutput: '2', explanation: 'The boundary between false and true is index 2.', isHidden: false },
            { stdin: '3\n1 1 1', expectedOutput: '0', explanation: 'A true first slot is already the earliest possible.', isHidden: false },
            { stdin: '0', expectedOutput: '-1', explanation: 'An empty schedule contains no true value.', isHidden: true },
            { stdin: '6\n0 0 0 0 0 1', expectedOutput: '5', explanation: 'The only true slot is the final index.', isHidden: true }
        ],
        hints: ['The monotone schedule is a predicate with a single false-to-true boundary.', 'Use a half-open search range so the insertion position can be n when every slot is false.', 'After finding the first candidate index, verify it is inside the schedule and actually true.'],
        editorial: 'Binary-search the first index whose value is true using a half-open range [0,n). Move right to mid when values[mid] is true, otherwise move left to mid+1. At termination, return the index only if it is below n; the end position n means all slots are false. This also handles schedules that begin true or are empty.',
        timeComplexity: 'O(log n)', spaceComplexity: 'O(1)', method: 'firstTrueSlot', mission: 'Find the monotone false-to-true boundary and distinguish it from the all-false end position.',
        args: [{ name: 'schedule', type: 'ints' }],
        reference: schedule => { let l = 0, r = schedule.length; while (l < r) { const m = Math.floor((l + r) / 2); if (schedule[m]) r = m; else l = m + 1; } return l < schedule.length ? l : -1; }
    },
    {
        id: 'ch-055', category: 'binary-search', difficulty: 'medium', title: 'Minimum Shipping Capacity',
        description: 'Find the smallest ship capacity that delivers all packages in their given order within at most the allowed number of days. Each day takes the longest next prefix that fits.',
        inputFormat: 'Whitespace-delimited stdin: n, n positive package weights, then the maximum number of days d.',
        outputFormat: 'One integer: the minimum feasible capacity.',
        constraints: '1 <= n <= 200000; 1 <= weights[i] <= 10^6; 1 <= d <= n.',
        examples: [
            { input: '5\n1 2 3 4 5\n3', output: '6', explanation: 'Capacity 6 ships [1,2,3], then [4], then [5] within three days.' },
            { input: '3\n3 2 2\n2', output: '4', explanation: 'Capacity 4 ships [3] on day one and [2,2] on day two.' }
        ],
        testCases: [
            { stdin: '5\n1 2 3 4 5\n3', expectedOutput: '6', explanation: 'Greedy consecutive loading with capacity six takes three days.', isHidden: false },
            { stdin: '3\n3 2 2\n2', expectedOutput: '4', explanation: 'The final two packages fit together at capacity four.', isHidden: false },
            { stdin: '4\n10 1 1 1\n4', expectedOutput: '10', explanation: 'One day per package makes the heaviest package the lower limit.', isHidden: true },
            { stdin: '6\n1 2 3 4 5 6\n1', expectedOutput: '21', explanation: 'One-day delivery requires the sum of all weights.', isHidden: true }
        ],
        hints: ['The capacity must be at least the heaviest package and need not exceed the sum of all weights.', 'For a proposed capacity, greedily fill the current day until the next ordered package does not fit.', 'Feasibility is monotone: every capacity larger than a feasible one is also feasible, so binary-search the first feasible value.'],
        editorial: 'Set the search interval to [max(weights),sum(weights)]. For a candidate capacity, scan packages in order, starting a new day whenever the next weight would exceed the current load; feasibility means the required day count is at most d. Binary-search the first feasible capacity. Keeping order during the feasibility scan is essential: packages cannot be rearranged to improve packing.',
        timeComplexity: 'O(n log(sum(weights)))', spaceComplexity: 'O(1)', method: 'minimumDeliveryCapacity', mission: 'Binary-search capacity and greedily count the consecutive shipping days required by each candidate.',
        args: [{ name: 'weights', type: 'ints' }, { name: 'days', type: 'int' }],
        reference: (weights, days) => { let l = weights.reduce((a, b) => Math.max(a, b), 0), r = weights.reduce((a, b) => a + b, 0); const fits = cap => { let used = 1, load = 0; for (const w of weights) { if (load + w > cap) { used++; load = 0; } load += w; } return used <= days; }; while (l < r) { const m = Math.floor((l + r) / 2); if (fits(m)) r = m; else l = m + 1; } return l; }
    },
    {
        id: 'ch-056', category: 'binary-search', difficulty: 'medium', title: 'Balanced Workload Limit',
        description: 'Split a sequence of positive work-unit counts into exactly m nonempty contiguous groups while minimizing the largest group sum. Return that minimum possible largest sum.',
        inputFormat: 'Whitespace-delimited stdin: n, n positive work-unit counts, then m.',
        outputFormat: 'One integer: the smallest achievable maximum group sum.',
        constraints: '1 <= m <= n <= 200000; 1 <= work[i] <= 10^6.',
        examples: [
            { input: '5\n7 2 5 10 8\n2', output: '18', explanation: 'The split [7,2,5] and [10,8] has largest sum 18, and no smaller maximum works.' },
            { input: '4\n1 2 3 4\n4', output: '4', explanation: 'Four nonempty groups force each unit into its own group.' }
        ],
        testCases: [
            { stdin: '5\n7 2 5 10 8\n2', expectedOutput: '18', explanation: 'The optimal contiguous partition balances the sums as 14 and 18.', isHidden: false },
            { stdin: '5\n1 2 3 4 5\n3', expectedOutput: '6', explanation: 'Groups [1,2,3], [4], [5] attain maximum six.', isHidden: false },
            { stdin: '3\n9 1 1\n3', expectedOutput: '9', explanation: 'Three groups require singleton workloads, so the largest is nine.', isHidden: true },
            { stdin: '6\n2 2 2 2 2 2\n1', expectedOutput: '12', explanation: 'One group must include every work unit.', isHidden: true }
        ],
        hints: ['A candidate maximum cannot be smaller than the largest single work item or larger than the total.', 'For a fixed candidate, greedily add values until the next would exceed the limit, then start a new group.', 'The greedy pass gives the fewest groups needed under a limit; it is feasible for exactly m groups when it uses no more than m, since groups can be split.'],
        editorial: 'Binary-search a limit between max(work) and sum(work). Scan left to right and greedily begin a new group whenever adding the next positive value exceeds the candidate; the candidate is feasible if this minimum group count is at most m. With positive values and m<=n, any group can be split until exactly m nonempty groups exist without increasing its sum. The predicate is monotone in the limit, so lower-bound search yields the optimum.',
        timeComplexity: 'O(n log(sum(work)))', spaceComplexity: 'O(1)', method: 'minimumLargestWorkload', mission: 'Search a candidate group-sum ceiling and count contiguous groups greedily.',
        args: [{ name: 'work', type: 'ints' }, { name: 'groups', type: 'int' }],
        reference: (work, groups) => { let l = work.reduce((a, b) => Math.max(a, b), 0), r = work.reduce((a, b) => a + b, 0); const needed = cap => { let count = 1, sum = 0; for (const x of work) { if (sum + x > cap) { count++; sum = 0; } sum += x; } return count; }; while (l < r) { const m = Math.floor((l + r) / 2); if (needed(m) <= groups) r = m; else l = m + 1; } return l; }
    },
    {
        id: 'ch-057', category: 'binary-search', difficulty: 'hard', title: 'Median of Two Sorted Runs',
        description: 'Return the median of two nondecreasing integer sequences as a number. The combined sequence is guaranteed to be nonempty.',
        inputFormat: 'Whitespace-delimited stdin: n, n values, m, then m values.',
        outputFormat: 'One numeric median; for an even total length it may end in .5.',
        constraints: '0 <= n,m <= 200000; n+m >= 1; each sequence is nondecreasing; values are within +/-10^9.',
        examples: [
            { input: '2\n1 3\n1\n2', output: '2', explanation: 'The merged order is 1,2,3 and its center value is 2.' },
            { input: '2\n1 2\n2\n3 4', output: '2.5', explanation: 'The middle values are 2 and 3, whose mean is 2.5.' }
        ],
        testCases: [
            { stdin: '2\n1 3\n1\n2', expectedOutput: '2', explanation: 'An odd combined size has one central value.', isHidden: false },
            { stdin: '2\n1 2\n2\n3 4', expectedOutput: '2.5', explanation: 'Even total length averages the two partition boundary values.', isHidden: false },
            { stdin: '0\n\n1\n7', expectedOutput: '7', explanation: 'An empty first run leaves the singleton second run.', isHidden: true },
            { stdin: '3\n-5 -1 9\n4\n-4 0 3 10', expectedOutput: '0', explanation: 'The seven combined values have zero at the middle position.', isHidden: true }
        ],
        hints: ['Partition both sequences so the total number of values on the left is half the combined count.', 'A valid partition has each left boundary no greater than the opposite sequence’s right boundary.', 'Binary-search the shorter sequence to reduce the partition condition to two cross-boundary comparisons.'],
        editorial: 'Always binary-search the shorter list. Choose a partition i in it and j=(n+m+1)//2-i in the other, then inspect leftA/rightA and leftB/rightB using infinities at missing boundaries. If leftA>rightB, move i left; if leftB>rightA, move i right. Otherwise the partition is valid: for odd total return the larger left boundary; for even total average the larger left boundary and smaller right boundary. This examines only logarithmically many partitions without merging.',
        timeComplexity: 'O(log(min(n,m)))', spaceComplexity: 'O(1)', method: 'medianOfSortedRuns', mission: 'Binary-search a balanced partition in the shorter sequence and derive the median from its four boundaries.',
        args: [{ name: 'first', type: 'ints' }, { name: 'second', type: 'ints' }],
        reference: (first, second) => { if (first.length > second.length) { const swap = first; first = second; second = swap; } let l = 0, r = first.length, half = Math.floor((first.length + second.length + 1) / 2); while (l <= r) { const i = Math.floor((l + r) / 2), j = half - i; const al = i ? first[i - 1] : -Infinity, ar = i < first.length ? first[i] : Infinity, bl = j ? second[j - 1] : -Infinity, br = j < second.length ? second[j] : Infinity; if (al > br) r = i - 1; else if (bl > ar) l = i + 1; else { const left = Math.max(al, bl); return (first.length + second.length) % 2 ? left : (left + Math.min(ar, br)) / 2; } } return NaN; }
    },
    {
        id: 'ch-058', category: 'binary-search', difficulty: 'hard', title: 'Kth Value in Sorted Grid',
        description: 'Return the one-based k-th smallest value in a rectangular integer matrix whose rows and columns are each nondecreasing.',
        inputFormat: 'Whitespace-delimited stdin: row count r, column count c, then r*c matrix entries in row-major order, then one-based k.',
        outputFormat: 'One integer: the k-th smallest matrix value, counting duplicates separately.',
        constraints: '1 <= r,c <= 1000; r*c <= 200000; 1 <= k <= r*c; values are within +/-10^9.',
        examples: [
            { input: '3 3\n1 5 9\n10 11 13\n12 13 15\n8', output: '13', explanation: 'The eighth value in sorted order is the second occurrence of 13.' },
            { input: '2 3\n-5 -2 0\n-4 -1 3\n4', output: '-1', explanation: 'The fourth smallest value among the six entries is -1.' }
        ],
        testCases: [
            { stdin: '3 3\n1 5 9\n10 11 13\n12 13 15\n8', expectedOutput: '13', explanation: 'Duplicate 13 entries each occupy a rank.', isHidden: false },
            { stdin: '1 4\n2 2 2 9\n2', expectedOutput: '2', explanation: 'Repeated values are counted as separate matrix cells.', isHidden: false },
            { stdin: '2 3\n-5 -2 0\n-4 -1 3\n6', expectedOutput: '3', explanation: 'The largest rank is the matrix maximum at the bottom right.', isHidden: true },
            { stdin: '3 2\n1 3\n2 4\n5 6\n3', expectedOutput: '3', explanation: 'A narrow grid still supports staircase counting.', isHidden: true }
        ],
        hints: ['The answer lies between the top-left and bottom-right values because of row and column ordering.', 'For a proposed value x, count entries <= x by walking from the bottom-left corner.', 'That staircase count is monotone in x; lower-bound search for the first value whose count reaches k.'],
        editorial: 'Binary-search the value range from matrix[0][0] through matrix[r-1][c-1]. To count cells no greater than a candidate, start at the bottom-left: if the current value is <= candidate, every cell above it in that column also qualifies, so add row+1 and move right; otherwise move up. The count takes O(r+c). Find the smallest candidate with count>=k, which remains correct with duplicate values because ranks count cells individually.',
        timeComplexity: 'O((r+c) log(maxValue-minValue+1))', spaceComplexity: 'O(1)', method: 'kthSortedGridValue', mission: 'Binary-search the numeric value range using a bottom-left staircase count of entries no greater than the candidate.',
        args: [{ name: 'grid', type: 'matrix' }, { name: 'k', type: 'int' }],
        reference: (grid, k) => { let lo = grid[0][0], hi = grid[grid.length - 1][grid[0].length - 1]; const countAtMost = x => { let row = grid.length - 1, col = 0, count = 0; while (row >= 0 && col < grid[0].length) { if (grid[row][col] <= x) { count += row + 1; col++; } else row--; } return count; }; while (lo < hi) { const mid = Math.floor(lo + (hi - lo) / 2); if (countAtMost(mid) >= k) hi = mid; else lo = mid + 1; } return lo; }
    }
];

const catalog = specs.map(defineProblem);

module.exports = catalog;
