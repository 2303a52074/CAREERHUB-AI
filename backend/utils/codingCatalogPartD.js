'use strict';

const referenceCode = {
    'ch-085': {
        python: `import sys
def count_components(n, edges):
    graph = [[] for _ in range(n)]
    for a, b in edges: graph[a].append(b); graph[b].append(a)
    seen = [False] * n
    count = 0
    for start in range(n):
        if not seen[start]:
            count += 1; seen[start] = True; stack = [start]
            while stack:
                for v in graph[stack.pop()]:
                    if not seen[v]: seen[v] = True; stack.append(v)
    return count
data = list(map(int, sys.stdin.buffer.read().split()))
n, m = data[:2]
edges = list(zip(data[2::2], data[3::2]))
print(count_components(n, edges))`,
        java: `import java.util.*;
public class Main {
 static int countComponents(int n, int[][] e) {
  List<Integer>[] g = new ArrayList[n]; for(int i=0;i<n;i++) g[i]=new ArrayList<>();
  for(int[] x:e){g[x[0]].add(x[1]);g[x[1]].add(x[0]);}
  boolean[] seen=new boolean[n]; int ans=0;
  for(int s=0;s<n;s++) if(!seen[s]) { ans++; ArrayDeque<Integer> q=new ArrayDeque<>(); q.push(s); seen[s]=true;
   while(!q.isEmpty()) for(int v:g[q.pop()]) if(!seen[v]){seen[v]=true;q.push(v);}
  } return ans;
 }
 public static void main(String[] z){Scanner s=new Scanner(System.in);int n=s.nextInt(),m=s.nextInt();int[][]e=new int[m][2];for(int i=0;i<m;i++){e[i][0]=s.nextInt();e[i][1]=s.nextInt();}System.out.println(countComponents(n,e));}
}`,
        cpp: `#include <bits/stdc++.h>
using namespace std;
int countComponents(int n, vector<pair<int,int>>& e){vector<vector<int>>g(n);for(auto [a,b]:e)g[a].push_back(b),g[b].push_back(a);vector<char>v(n);int c=0;for(int s=0;s<n;s++)if(!v[s]){c++;vector<int>q={s};v[s]=1;while(!q.empty()){int u=q.back();q.pop_back();for(int x:g[u])if(!v[x])v[x]=1,q.push_back(x);}}return c;}
int main(){ios::sync_with_stdio(false);cin.tie(nullptr);int n,m;if(!(cin>>n>>m))return 0;vector<pair<int,int>>e(m);for(auto&[a,b]:e)cin>>a>>b;cout<<countComponents(n,e)<<'\\n';}`,
        javascript: `const fs=require('fs');const a=fs.readFileSync(0,'utf8').trim().split(/\\s+/).map(Number);let p=0,n=a[p++],m=a[p++],g=Array.from({length:n},()=>[]);for(let i=0;i<m;i++){let x=a[p++],y=a[p++];g[x].push(y);g[y].push(x)}function countComponents(){let seen=Array(n).fill(false),c=0;for(let s=0;s<n;s++)if(!seen[s]){c++;let q=[s];seen[s]=true;while(q.length){for(const v of g[q.pop()])if(!seen[v]){seen[v]=true;q.push(v)}}}return c}console.log(countComponents());`
    },
    'ch-086': {
        python: `import sys
def shortest_hops(n, edges, source, target):
    g=[[] for _ in range(n)]
    for a,b in edges:g[a].append(b);g[b].append(a)
    d=[-1]*n;d[source]=0;q=[source]
    for u in q:
        for v in g[u]:
            if d[v]<0:d[v]=d[u]+1;q.append(v)
    return d[target]
x=list(map(int,sys.stdin.buffer.read().split()));n,m,s,t=x[:4];print(shortest_hops(n,list(zip(x[4::2],x[5::2])),s,t))`,
        java: `import java.util.*;
public class Main {
 static int shortestHops(int n,int[][]e,int s,int t){List<Integer>[]g=new ArrayList[n];for(int i=0;i<n;i++)g[i]=new ArrayList<>();for(int[]x:e){g[x[0]].add(x[1]);g[x[1]].add(x[0]);}int[]d=new int[n];Arrays.fill(d,-1);ArrayDeque<Integer>q=new ArrayDeque<>();q.add(s);d[s]=0;while(!q.isEmpty()){int u=q.remove();for(int v:g[u])if(d[v]<0){d[v]=d[u]+1;q.add(v);}}return d[t];}
 public static void main(String[]z){Scanner a=new Scanner(System.in);int n=a.nextInt(),m=a.nextInt(),s=a.nextInt(),t=a.nextInt();int[][]e=new int[m][2];for(int i=0;i<m;i++){e[i][0]=a.nextInt();e[i][1]=a.nextInt();}System.out.println(shortestHops(n,e,s,t));}
}`,
        cpp: `#include <bits/stdc++.h>
using namespace std;
int shortestHops(int n,vector<pair<int,int>>&e,int s,int t){vector<vector<int>>g(n);for(auto[a,b]:e)g[a].push_back(b),g[b].push_back(a);vector<int>d(n,-1),q={s};d[s]=0;for(int i=0;i<(int)q.size();i++)for(int v:g[q[i]])if(d[v]<0)d[v]=d[q[i]]+1,q.push_back(v);return d[t];}
int main(){int n,m,s,t;if(!(cin>>n>>m>>s>>t))return 0;vector<pair<int,int>>e(m);for(auto&[a,b]:e)cin>>a>>b;cout<<shortestHops(n,e,s,t)<<'\\n';}`,
        javascript: `const fs=require('fs');const x=fs.readFileSync(0,'utf8').trim().split(/\\s+/).map(Number);let p=0,n=x[p++],m=x[p++],s=x[p++],t=x[p++],g=Array.from({length:n},()=>[]);for(let i=0;i<m;i++){let a=x[p++],b=x[p++];g[a].push(b);g[b].push(a)}function shortestHops(){let d=Array(n).fill(-1),q=[s];d[s]=0;for(let i=0;i<q.length;i++)for(const v of g[q[i]])if(d[v]<0){d[v]=d[q[i]]+1;q.push(v)}return d[t]}console.log(shortestHops());`
    },
    'ch-087': {
        python: `import sys
def is_bipartite(n, edges):
 g=[[] for _ in range(n)]
 for a,b in edges:g[a].append(b);g[b].append(a)
 color=[-1]*n
 for s in range(n):
  if color[s]<0:
   color[s]=0;q=[s]
   for u in q:
    for v in g[u]:
     if color[v]<0:color[v]=color[u]^1;q.append(v)
     elif color[v]==color[u]:return False
 return True
x=list(map(int,sys.stdin.buffer.read().split()));print('YES' if is_bipartite(x[0],list(zip(x[2::2],x[3::2]))) else 'NO')`,
        java: `import java.util.*;
public class Main {
 static boolean isBipartite(int n,int[][]e){List<Integer>[]g=new ArrayList[n];for(int i=0;i<n;i++)g[i]=new ArrayList<>();for(int[]x:e){g[x[0]].add(x[1]);g[x[1]].add(x[0]);}int[]c=new int[n];Arrays.fill(c,-1);for(int s=0;s<n;s++)if(c[s]<0){ArrayDeque<Integer>q=new ArrayDeque<>();q.add(s);c[s]=0;while(!q.isEmpty()){int u=q.remove();for(int v:g[u])if(c[v]<0){c[v]=c[u]^1;q.add(v);}else if(c[v]==c[u])return false;}}return true;}
 public static void main(String[]z){Scanner a=new Scanner(System.in);int n=a.nextInt(),m=a.nextInt();int[][]e=new int[m][2];for(int i=0;i<m;i++){e[i][0]=a.nextInt();e[i][1]=a.nextInt();}System.out.println(isBipartite(n,e)?"YES":"NO");}
}`,
        cpp: `#include <bits/stdc++.h>
using namespace std;
bool isBipartite(int n,vector<pair<int,int>>&e){vector<vector<int>>g(n);for(auto[a,b]:e)g[a].push_back(b),g[b].push_back(a);vector<int>c(n,-1);for(int s=0;s<n;s++)if(c[s]<0){queue<int>q;q.push(s);c[s]=0;while(!q.empty()){int u=q.front();q.pop();for(int v:g[u])if(c[v]<0)c[v]=c[u]^1,q.push(v);else if(c[v]==c[u])return false;}}return true;}
int main(){int n,m;if(!(cin>>n>>m))return 0;vector<pair<int,int>>e(m);for(auto&[a,b]:e)cin>>a>>b;cout<<(isBipartite(n,e)?"YES":"NO")<<'\\n';}`,
        javascript: `const fs=require('fs');const x=fs.readFileSync(0,'utf8').trim().split(/\\s+/).map(Number);let p=0,n=x[p++],m=x[p++],g=Array.from({length:n},()=>[]);for(let i=0;i<m;i++){let a=x[p++],b=x[p++];g[a].push(b);g[b].push(a)}function isBipartite(){let c=Array(n).fill(-1);for(let s=0;s<n;s++)if(c[s]<0){let q=[s];c[s]=0;for(let i=0;i<q.length;i++)for(const v of g[q[i]])if(c[v]<0){c[v]=c[q[i]]^1;q.push(v)}else if(c[v]===c[q[i]])return false}return true}console.log(isBipartite()?'YES':'NO');`
    },
    'ch-088': {
        python: `import sys,heapq
def lexicographic_topological_order(n, edges):
 g=[[] for _ in range(n)];ind=[0]*n
 for a,b in edges:g[a].append(b);ind[b]+=1
 q=[i for i in range(n) if ind[i]==0];heapq.heapify(q);out=[]
 while q:
  u=heapq.heappop(q);out.append(u)
  for v in g[u]:
   ind[v]-=1
   if ind[v]==0:heapq.heappush(q,v)
 return out if len(out)==n else None
x=list(map(int,sys.stdin.buffer.read().split()));n,m=x[:2];r=lexicographic_topological_order(n,list(zip(x[2::2],x[3::2])));print('IMPOSSIBLE' if r is None else ' '.join(map(str,r)))`,
        java: `import java.util.*;
public class Main {
 static int[] lexicographicTopo(int n,int[][]e){List<Integer>[]g=new ArrayList[n];int[]d=new int[n];for(int i=0;i<n;i++)g[i]=new ArrayList<>();for(int[]x:e){g[x[0]].add(x[1]);d[x[1]]++;}PriorityQueue<Integer>q=new PriorityQueue<>();for(int i=0;i<n;i++)if(d[i]==0)q.add(i);int[]o=new int[n];int k=0;while(!q.isEmpty()){int u=q.remove();o[k++]=u;for(int v:g[u])if(--d[v]==0)q.add(v);}return k==n?o:null;}
 public static void main(String[]z){Scanner a=new Scanner(System.in);int n=a.nextInt(),m=a.nextInt();int[][]e=new int[m][2];for(int i=0;i<m;i++){e[i][0]=a.nextInt();e[i][1]=a.nextInt();}int[]o=lexicographicTopo(n,e);if(o==null)System.out.println("IMPOSSIBLE");else{for(int i=0;i<n;i++)System.out.print((i>0?" ":"")+o[i]);System.out.println();}}
}`,
        cpp: `#include <bits/stdc++.h>
using namespace std;
vector<int> lexicographicTopo(int n,vector<pair<int,int>>&e){vector<vector<int>>g(n);vector<int>d(n);for(auto[a,b]:e)g[a].push_back(b),d[b]++;priority_queue<int,vector<int>,greater<int>>q;for(int i=0;i<n;i++)if(!d[i])q.push(i);vector<int>o;while(!q.empty()){int u=q.top();q.pop();o.push_back(u);for(int v:g[u])if(--d[v]==0)q.push(v);}if((int)o.size()!=n)o.clear();return o;}
int main(){int n,m;if(!(cin>>n>>m))return 0;vector<pair<int,int>>e(m);for(auto&[a,b]:e)cin>>a>>b;auto o=lexicographicTopo(n,e);if(o.empty()&&n)cout<<"IMPOSSIBLE";else for(int i=0;i<n;i++)cout<<(i?" ":"")<<o[i];cout<<'\\n';}`,
        javascript: `const fs=require('fs');const x=fs.readFileSync(0,'utf8').trim().split(/\\s+/).map(Number);let p=0,n=x[p++],m=x[p++],g=Array.from({length:n},()=>[]),d=Array(n).fill(0);for(let i=0;i<m;i++){let a=x[p++],b=x[p++];g[a].push(b);d[b]++}function lexicographicTopo(){let h=[];function push(v){let i=h.length;h.push(v);while(i){let q=(i-1)>>1;if(h[q]<=v)break;h[i]=h[q];i=q;h[i]=v}}function pop(){let r=h[0],v=h.pop();if(h.length){let i=0;while(2*i+1<h.length){let c=2*i+1;if(c+1<h.length&&h[c+1]<h[c])c++;if(h[c]>=v)break;h[i]=h[c];i=c}h[i]=v}return r}for(let i=0;i<n;i++)if(!d[i])push(i);let o=[];while(h.length){let u=pop();o.push(u);for(const v of g[u])if(--d[v]===0)push(v)}return o.length===n?o:null}const r=lexicographicTopo();console.log(r===null?'IMPOSSIBLE':r.join(' '));`
    },
    'ch-089': {
        python: `import sys,heapq
def dijkstra(n, edges, source):
 g=[[] for _ in range(n)]
 for a,b,w in edges:g[a].append((b,w));g[b].append((a,w))
 d=[10**30]*n;d[source]=0;q=[(0,source)]
 while q:
  cost,u=heapq.heappop(q)
  if cost!=d[u]:continue
  for v,w in g[u]:
   if cost+w<d[v]:d[v]=cost+w;heapq.heappush(q,(d[v],v))
 return [-1 if x==10**30 else x for x in d]
x=list(map(int,sys.stdin.buffer.read().split()));n,m,s=x[:3];e=[tuple(x[i:i+3]) for i in range(3,len(x),3)];print(*dijkstra(n,e,s))`,
        java: `import java.util.*;
public class Main {
 static long[] dijkstra(int n,int[][]e,int s){List<long[]>[]g=new ArrayList[n];for(int i=0;i<n;i++)g[i]=new ArrayList<>();for(int[]x:e){g[x[0]].add(new long[]{x[1],x[2]});g[x[1]].add(new long[]{x[0],x[2]});}long[]d=new long[n];Arrays.fill(d,Long.MAX_VALUE);d[s]=0;PriorityQueue<long[]>q=new PriorityQueue<>(Comparator.comparingLong(a->a[0]));q.add(new long[]{0,s});while(!q.isEmpty()){long[]z=q.remove();long c=z[0];int u=(int)z[1];if(c!=d[u])continue;for(long[]a:g[u])if(c+a[1]<d[(int)a[0]]){d[(int)a[0]]=c+a[1];q.add(new long[]{d[(int)a[0]],a[0]});}}return d;}
 public static void main(String[]z){Scanner a=new Scanner(System.in);int n=a.nextInt(),m=a.nextInt(),s=a.nextInt();int[][]e=new int[m][3];for(int i=0;i<m;i++)for(int j=0;j<3;j++)e[i][j]=a.nextInt();long[]d=dijkstra(n,e,s);for(int i=0;i<n;i++)System.out.print((i>0?" ":"")+(d[i]==Long.MAX_VALUE?-1:d[i]));System.out.println();}
}`,
        cpp: `#include <bits/stdc++.h>
using namespace std;
vector<long long>dijkstra(int n,vector<tuple<int,int,int>>&e,int s){vector<vector<pair<int,int>>>g(n);for(auto[a,b,w]:e)g[a].push_back({b,w}),g[b].push_back({a,w});vector<long long>d(n,LLONG_MAX);priority_queue<pair<long long,int>,vector<pair<long long,int>>,greater<pair<long long,int>>>q;d[s]=0;q.push({0,s});while(!q.empty()){auto[c,u]=q.top();q.pop();if(c!=d[u])continue;for(auto[v,w]:g[u])if(c+w<d[v])d[v]=c+w,q.push({d[v],v});}return d;}
int main(){int n,m,s;if(!(cin>>n>>m>>s))return 0;vector<tuple<int,int,int>>e(m);for(auto&[a,b,w]:e)cin>>a>>b>>w;auto d=dijkstra(n,e,s);for(int i=0;i<n;i++)cout<<(i?" ":"")<<(d[i]==LLONG_MAX?-1:d[i]);cout<<'\\n';}`,
        javascript: `const fs=require('fs');const x=fs.readFileSync(0,'utf8').trim().split(/\\s+/).map(Number);let p=0,n=x[p++],m=x[p++],s=x[p++],g=Array.from({length:n},()=>[]);for(let i=0;i<m;i++){let a=x[p++],b=x[p++],w=x[p++];g[a].push([b,w]);g[b].push([a,w])}function dijkstra(){let d=Array(n).fill(Infinity),h=[];function less(a,b){return a[0]<b[0]||a[0]===b[0]&&a[1]<b[1]}function push(v){let i=h.length;h.push(v);while(i){let q=(i-1)>>1;if(!less(v,h[q]))break;h[i]=h[q];i=q;h[i]=v}}function pop(){let r=h[0],v=h.pop();if(h.length){let i=0;while(2*i+1<h.length){let c=2*i+1;if(c+1<h.length&&less(h[c+1],h[c]))c++;if(!less(h[c],v))break;h[i]=h[c];i=c}h[i]=v}return r}d[s]=0;push([0,s]);while(h.length){let[c,u]=pop();if(c!==d[u])continue;for(const[v,w]of g[u])if(c+w<d[v]){d[v]=c+w;push([d[v],v])}}return d.map(v=>v===Infinity?-1:v)}console.log(dijkstra().join(' '));`
    },
    'ch-090': {
        python: `import sys
def bridge_count(n, edges):
 g=[[] for _ in range(n)]
 for i,(a,b) in enumerate(edges):g[a].append((b,i));g[b].append((a,i))
 tin=[-1]*n;low=[0]*n;parent=[-1]*n;parent_edge=[-1]*n;next_edge=[0]*n;timer=ans=0
 for root in range(n):
  if tin[root]>=0:continue
  tin[root]=low[root]=timer;timer+=1;stack=[root]
  while stack:
   u=stack[-1]
   if next_edge[u]<len(g[u]):
    v,eid=g[u][next_edge[u]];next_edge[u]+=1
    if eid==parent_edge[u]:continue
    if tin[v]>=0:low[u]=min(low[u],tin[v])
    else:
     parent[v]=u;parent_edge[v]=eid;tin[v]=low[v]=timer;timer+=1;stack.append(v)
   else:
    stack.pop()
    if parent[u]>=0:
     p=parent[u];low[p]=min(low[p],low[u])
     if low[u]>tin[p]:ans+=1
 return ans
x=list(map(int,sys.stdin.buffer.read().split()));print(bridge_count(x[0],list(zip(x[2::2],x[3::2]))))`,
        java: `import java.util.*;
public class Main {
 static int bridgeCount(int n,int[][]e){List<int[]>[]g=new ArrayList[n];for(int i=0;i<n;i++)g[i]=new ArrayList<>();for(int i=0;i<e.length;i++){g[e[i][0]].add(new int[]{e[i][1],i});g[e[i][1]].add(new int[]{e[i][0],i});}int[]tin=new int[n],low=new int[n],par=new int[n],pe=new int[n],next=new int[n];Arrays.fill(tin,-1);Arrays.fill(par,-1);Arrays.fill(pe,-1);int timer=0,ans=0;ArrayDeque<Integer>st=new ArrayDeque<>();for(int root=0;root<n;root++)if(tin[root]<0){tin[root]=low[root]=timer++;st.push(root);while(!st.isEmpty()){int u=st.peek();if(next[u]<g[u].size()){int[]a=g[u].get(next[u]++);int v=a[0],id=a[1];if(id==pe[u])continue;if(tin[v]>=0)low[u]=Math.min(low[u],tin[v]);else{par[v]=u;pe[v]=id;tin[v]=low[v]=timer++;st.push(v);}}else{st.pop();if(par[u]>=0){int q=par[u];low[q]=Math.min(low[q],low[u]);if(low[u]>tin[q])ans++;}}}}return ans;}
 public static void main(String[]z){Scanner a=new Scanner(System.in);int n=a.nextInt(),m=a.nextInt();int[][]e=new int[m][2];for(int i=0;i<m;i++){e[i][0]=a.nextInt();e[i][1]=a.nextInt();}System.out.println(bridgeCount(n,e));}
}`,
        cpp: `#include <bits/stdc++.h>
using namespace std;
int bridgeCount(int n,vector<pair<int,int>>&e){vector<vector<pair<int,int>>>g(n);for(int i=0;i<(int)e.size();i++){auto[a,b]=e[i];g[a].push_back({b,i});g[b].push_back({a,i});}vector<int>tin(n,-1),low(n),par(n,-1),pe(n,-1),next(n);int timer=0,ans=0;vector<int>st;for(int root=0;root<n;root++)if(tin[root]<0){tin[root]=low[root]=timer++;st.push_back(root);while(!st.empty()){int u=st.back();if(next[u]<(int)g[u].size()){auto[v,id]=g[u][next[u]++];if(id==pe[u])continue;if(tin[v]>=0)low[u]=min(low[u],tin[v]);else{par[v]=u;pe[v]=id;tin[v]=low[v]=timer++;st.push_back(v);}}else{st.pop_back();if(par[u]>=0){int q=par[u];low[q]=min(low[q],low[u]);if(low[u]>tin[q])ans++;}}}}return ans;}
int main(){int n,m;if(!(cin>>n>>m))return 0;vector<pair<int,int>>e(m);for(auto&[a,b]:e)cin>>a>>b;cout<<bridgeCount(n,e)<<'\\n';}`,
        javascript: `const fs=require('fs');const x=fs.readFileSync(0,'utf8').trim().split(/\\s+/).map(Number);let p=0,n=x[p++],m=x[p++],g=Array.from({length:n},()=>[]);for(let i=0;i<m;i++){let a=x[p++],b=x[p++];g[a].push([b,i]);g[b].push([a,i])}function bridgeCount(){let tin=Array(n).fill(-1),low=Array(n),par=Array(n).fill(-1),pe=Array(n).fill(-1),next=Array(n).fill(0),time=0,count=0;for(let root=0;root<n;root++){if(tin[root]>=0)continue;let st=[root];tin[root]=low[root]=time++;while(st.length){let u=st[st.length-1];if(next[u]<g[u].length){let[v,id]=g[u][next[u]++];if(id===pe[u])continue;if(tin[v]>=0)low[u]=Math.min(low[u],tin[v]);else{par[v]=u;pe[v]=id;tin[v]=low[v]=time++;st.push(v)}}else{st.pop();if(par[u]>=0){let q=par[u];low[q]=Math.min(low[q],low[u]);if(low[u]>tin[q])count++}}}}return count}console.log(bridgeCount());`
    },
    'ch-091': {
        python: `import sys
def minimum_stair_cost(cost):
 a=b=0
 for v in cost:a,b=b,min(a+v,b+v)
 return min(a,b)
x=list(map(int,sys.stdin.buffer.read().split()));print(minimum_stair_cost(x[1:1+x[0]]))`,
        java: `import java.util.*;
public class Main {
 static long minimumStairCost(int[]c){long a=0,b=0;for(int v:c){long z=Math.min(a+v,b+v);a=b;b=z;}return Math.min(a,b);}
 public static void main(String[]z){Scanner s=new Scanner(System.in);int n=s.nextInt();int[]c=new int[n];for(int i=0;i<n;i++)c[i]=s.nextInt();System.out.println(minimumStairCost(c));}
}`,
        cpp: `#include <bits/stdc++.h>
using namespace std;
long long minimumStairCost(vector<int>&c){long long a=0,b=0;for(int v:c){long long z=min(a+v,b+v);a=b;b=z;}return min(a,b);}
int main(){int n;if(!(cin>>n))return 0;vector<int>c(n);for(int&v:c)cin>>v;cout<<minimumStairCost(c)<<'\\n';}`,
        javascript: `const fs=require('fs');const x=fs.readFileSync(0,'utf8').trim().split(/\\s+/).map(Number),n=x[0],cost=x.slice(1,n+1);function minimumStairCost(c){let a=0,b=0;for(const v of c){const z=Math.min(a+v,b+v);a=b;b=z}return Math.min(a,b)}console.log(minimumStairCost(cost));`
    },
    'ch-092': {
        python: `import sys
def maximum_nonadjacent_sum(values):
 take=skip=0
 for v in values:take,skip=skip+v,max(take,skip)
 return max(take,skip)
x=list(map(int,sys.stdin.buffer.read().split()));print(maximum_nonadjacent_sum(x[1:1+x[0]]))`,
        java: `import java.util.*;
public class Main {
 static long maximumNonadjacentSum(int[]a){long take=0,skip=0;for(int v:a){long t=skip+v;skip=Math.max(take,skip);take=t;}return Math.max(take,skip);}
 public static void main(String[]z){Scanner s=new Scanner(System.in);int n=s.nextInt();int[]a=new int[n];for(int i=0;i<n;i++)a[i]=s.nextInt();System.out.println(maximumNonadjacentSum(a));}
}`,
        cpp: `#include <bits/stdc++.h>
using namespace std;
long long maximumNonadjacentSum(vector<int>&a){long long take=0,skip=0;for(int v:a){long long t=skip+v;skip=max(take,skip);take=t;}return max(take,skip);}
int main(){int n;if(!(cin>>n))return 0;vector<int>a(n);for(int&v:a)cin>>v;cout<<maximumNonadjacentSum(a)<<'\\n';}`,
        javascript: `const fs=require('fs');const x=fs.readFileSync(0,'utf8').trim().split(/\\s+/).map(Number);function maximumNonadjacentSum(a){let take=0,skip=0;for(const v of a){const t=skip+v;skip=Math.max(take,skip);take=t}return Math.max(take,skip)}console.log(maximumNonadjacentSum(x.slice(1,1+x[0])));`
    },
    'ch-093': {
        python: `import sys
MOD=1000000007
def coin_combination_count(coins,target):
 dp=[0]*(target+1);dp[0]=1
 for c in coins:
  for s in range(c,target+1):dp[s]=(dp[s]+dp[s-c])%MOD
 return dp[target]
x=list(map(int,sys.stdin.buffer.read().split()));n,target=x[:2];print(coin_combination_count(x[2:2+n],target))`,
        java: `import java.util.*;
public class Main {
 static final long MOD=1000000007L;
 static long coinCombinationCount(int[]c,int t){long[]d=new long[t+1];d[0]=1;for(int v:c)for(int s=v;s<=t;s++)d[s]=(d[s]+d[s-v])%MOD;return d[t];}
 public static void main(String[]z){Scanner a=new Scanner(System.in);int n=a.nextInt(),t=a.nextInt();int[]c=new int[n];for(int i=0;i<n;i++)c[i]=a.nextInt();System.out.println(coinCombinationCount(c,t));}
}`,
        cpp: `#include <bits/stdc++.h>
using namespace std;const long long MOD=1000000007;
long long coinCombinationCount(vector<int>&c,int t){vector<long long>d(t+1);d[0]=1;for(int v:c)for(int s=v;s<=t;s++)d[s]=(d[s]+d[s-v])%MOD;return d[t];}
int main(){int n,t;if(!(cin>>n>>t))return 0;vector<int>c(n);for(int&v:c)cin>>v;cout<<coinCombinationCount(c,t)<<'\\n';}`,
        javascript: `const fs=require('fs');const x=fs.readFileSync(0,'utf8').trim().split(/\\s+/).map(Number),n=x[0],t=x[1],c=x.slice(2,2+n),MOD=1000000007;function coinCombinationCount(coins,target){let d=Array(target+1).fill(0);d[0]=1;for(const v of coins)for(let s=v;s<=target;s++)d[s]=(d[s]+d[s-v])%MOD;return d[target]}console.log(coinCombinationCount(c,t));`
    },
    'ch-094': {
        python: `import sys,bisect
def longest_increasing_subsequence(values):
 tails=[]
 for v in values:
  i=bisect.bisect_left(tails,v)
  if i==len(tails):tails.append(v)
  else:tails[i]=v
 return len(tails)
x=list(map(int,sys.stdin.buffer.read().split()));print(longest_increasing_subsequence(x[1:1+x[0]]))`,
        java: `import java.util.*;
public class Main {
 static int longestIncreasingSubsequence(int[]a){int[]t=new int[a.length];int n=0;for(int v:a){int l=0,r=n;while(l<r){int m=(l+r)/2;if(t[m]<v)l=m+1;else r=m;}t[l]=v;if(l==n)n++;}return n;}
 public static void main(String[]z){Scanner s=new Scanner(System.in);int n=s.nextInt();int[]a=new int[n];for(int i=0;i<n;i++)a[i]=s.nextInt();System.out.println(longestIncreasingSubsequence(a));}
}`,
        cpp: `#include <bits/stdc++.h>
using namespace std;
int longestIncreasingSubsequence(vector<int>&a){vector<int>t;for(int v:a){auto i=lower_bound(t.begin(),t.end(),v);if(i==t.end())t.push_back(v);else *i=v;}return t.size();}
int main(){int n;if(!(cin>>n))return 0;vector<int>a(n);for(int&v:a)cin>>v;cout<<longestIncreasingSubsequence(a)<<'\\n';}`,
        javascript: `const fs=require('fs');const x=fs.readFileSync(0,'utf8').trim().split(/\\s+/).map(Number);function longestIncreasingSubsequence(a){let t=[];for(const v of a){let l=0,r=t.length;while(l<r){let m=(l+r)>>1;if(t[m]<v)l=m+1;else r=m}t[l]=v}return t.length}console.log(longestIncreasingSubsequence(x.slice(1,1+x[0])));`
    },
    'ch-095': {
        python: `import sys
def edit_distance(a,b):
 row=list(range(len(b)+1))
 for i,x in enumerate(a,1):
  nxt=[i]+[0]*len(b)
  for j,y in enumerate(b,1):nxt[j]=min(nxt[j-1]+1,row[j]+1,row[j-1]+(x!=y))
  row=nxt
 return row[-1]
a,b=sys.stdin.buffer.read().decode().split();print(edit_distance(a,b))`,
        java: `import java.util.*;
public class Main {
 static int editDistance(String a,String b){int[]d=new int[b.length()+1];for(int j=0;j<=b.length();j++)d[j]=j;for(int i=1;i<=a.length();i++){int diag=d[0];d[0]=i;for(int j=1;j<=b.length();j++){int old=d[j];d[j]=Math.min(Math.min(d[j]+1,d[j-1]+1),diag+(a.charAt(i-1)==b.charAt(j-1)?0:1));diag=old;}}return d[b.length()];}
 public static void main(String[]z){Scanner s=new Scanner(System.in);System.out.println(editDistance(s.next(),s.next()));}
}`,
        cpp: `#include <bits/stdc++.h>
using namespace std;
int editDistance(string a,string b){vector<int>d(b.size()+1);iota(d.begin(),d.end(),0);for(int i=1;i<=(int)a.size();i++){int diag=d[0];d[0]=i;for(int j=1;j<=(int)b.size();j++){int old=d[j];d[j]=min({d[j]+1,d[j-1]+1,diag+(a[i-1]!=b[j-1])});diag=old;}}return d.back();}
int main(){string a,b;if(!(cin>>a>>b))return 0;cout<<editDistance(a,b)<<'\\n';}`,
        javascript: `const fs=require('fs');const[a,b]=fs.readFileSync(0,'utf8').trim().split(/\\s+/);function editDistance(a,b){let d=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){let diag=d[0];d[0]=i;for(let j=1;j<=b.length;j++){let old=d[j];d[j]=Math.min(d[j]+1,d[j-1]+1,diag+(a[i-1]===b[j-1]?0:1));diag=old}}return d[b.length]}console.log(editDistance(a,b));`
    },
    'ch-096': {
        python: `import sys
def matrix_chain_minimum(dimensions):
 n=len(dimensions)-1;dp=[[0]*n for _ in range(n)]
 for length in range(2,n+1):
  for i in range(n-length+1):
   j=i+length-1;dp[i][j]=min(dp[i][k]+dp[k+1][j]+dimensions[i]*dimensions[k+1]*dimensions[j+1] for k in range(i,j))
 return dp[0][n-1]
x=list(map(int,sys.stdin.buffer.read().split()));print(matrix_chain_minimum(x[1:2+x[0]]))`,
        java: `import java.util.*;
public class Main {
 static long matrixChainMinimum(int[]p){int n=p.length-1;long[][]d=new long[n][n];for(int len=2;len<=n;len++)for(int i=0;i+len<=n;i++){int j=i+len-1;d[i][j]=Long.MAX_VALUE;for(int k=i;k<j;k++)d[i][j]=Math.min(d[i][j],d[i][k]+d[k+1][j]+(long)p[i]*p[k+1]*p[j+1]);}return d[0][n-1];}
 public static void main(String[]z){Scanner s=new Scanner(System.in);int n=s.nextInt();int[]p=new int[n+1];for(int i=0;i<=n;i++)p[i]=s.nextInt();System.out.println(matrixChainMinimum(p));}
}`,
        cpp: `#include <bits/stdc++.h>
using namespace std;
long long matrixChainMinimum(vector<int>&p){int n=p.size()-1;vector<vector<long long>>d(n,vector<long long>(n));for(int len=2;len<=n;len++)for(int i=0;i+len<=n;i++){int j=i+len-1;d[i][j]=LLONG_MAX;for(int k=i;k<j;k++)d[i][j]=min(d[i][j],d[i][k]+d[k+1][j]+1LL*p[i]*p[k+1]*p[j+1]);}return d[0][n-1];}
int main(){int n;if(!(cin>>n))return 0;vector<int>p(n+1);for(int&v:p)cin>>v;cout<<matrixChainMinimum(p)<<'\\n';}`,
        javascript: `const fs=require('fs');const x=fs.readFileSync(0,'utf8').trim().split(/\\s+/).map(Number),p=x.slice(1,2+x[0]);function matrixChainMinimum(p){let n=p.length-1,d=Array.from({length:n},()=>Array(n).fill(0));for(let len=2;len<=n;len++)for(let i=0;i+len<=n;i++){let j=i+len-1;d[i][j]=Infinity;for(let k=i;k<j;k++)d[i][j]=Math.min(d[i][j],d[i][k]+d[k+1][j]+p[i]*p[k+1]*p[j+1])}return d[0][n-1]}console.log(matrixChainMinimum(p));`
    },
    'ch-097': {
        python: `import sys
def merge_sort(values):
 if len(values)<2:return values
 m=len(values)//2;a=merge_sort(values[:m]);b=merge_sort(values[m:]);out=[];i=j=0
 while i<len(a) and j<len(b):
  if a[i]<=b[j]:out.append(a[i]);i+=1
  else:out.append(b[j]);j+=1
 return out+a[i:]+b[j:]
x=list(map(int,sys.stdin.buffer.read().split()));print(*merge_sort(x[1:1+x[0]]))`,
        java: `import java.util.*;
public class Main {
 static void mergeSort(int[]a,int l,int r){if(r-l<2)return;int m=(l+r)/2;mergeSort(a,l,m);mergeSort(a,m,r);int[]t=new int[r-l];int i=l,j=m,k=0;while(i<m&&j<r)t[k++]=a[i]<=a[j]?a[i++]:a[j++];while(i<m)t[k++]=a[i++];while(j<r)t[k++]=a[j++];System.arraycopy(t,0,a,l,t.length);}
 public static void main(String[]z){Scanner s=new Scanner(System.in);int n=s.nextInt();int[]a=new int[n];for(int i=0;i<n;i++)a[i]=s.nextInt();mergeSort(a,0,n);for(int i=0;i<n;i++)System.out.print((i>0?" ":"")+a[i]);System.out.println();}
}`,
        cpp: `#include <bits/stdc++.h>
using namespace std;
void mergeSort(vector<int>&a,int l,int r){if(r-l<2)return;int m=(l+r)/2;mergeSort(a,l,m);mergeSort(a,m,r);vector<int>t;int i=l,j=m;while(i<m&&j<r)t.push_back(a[i]<=a[j]?a[i++]:a[j++]);while(i<m)t.push_back(a[i++]);while(j<r)t.push_back(a[j++]);copy(t.begin(),t.end(),a.begin()+l);}
int main(){int n;if(!(cin>>n))return 0;vector<int>a(n);for(int&v:a)cin>>v;mergeSort(a,0,n);for(int i=0;i<n;i++)cout<<(i?" ":"")<<a[i];cout<<'\\n';}`,
        javascript: `const fs=require('fs');const x=fs.readFileSync(0,'utf8').trim().split(/\\s+/).map(Number);function mergeSort(a){if(a.length<2)return a;let m=a.length>>1,l=mergeSort(a.slice(0,m)),r=mergeSort(a.slice(m)),o=[],i=0,j=0;while(i<l.length&&j<r.length)o.push(l[i]<=r[j]?l[i++]:r[j++]);return o.concat(l.slice(i),r.slice(j))}console.log(mergeSort(x.slice(1,1+x[0])).join(' '));`
    },
    'ch-098': {
        python: `import sys
def kth_smallest(values,k):
 a=sorted(values)
 return a[k-1]
x=list(map(int,sys.stdin.buffer.read().split()));n,k=x[:2];print(kth_smallest(x[2:2+n],k))`,
        java: `import java.util.*;
public class Main {
 static int kthSmallest(int[]a,int k){Arrays.sort(a);return a[k-1];}
 public static void main(String[]z){Scanner s=new Scanner(System.in);int n=s.nextInt(),k=s.nextInt();int[]a=new int[n];for(int i=0;i<n;i++)a[i]=s.nextInt();System.out.println(kthSmallest(a,k));}
}`,
        cpp: `#include <bits/stdc++.h>
using namespace std;
int kthSmallest(vector<int>a,int k){nth_element(a.begin(),a.begin()+k-1,a.end());return a[k-1];}
int main(){int n,k;if(!(cin>>n>>k))return 0;vector<int>a(n);for(int&v:a)cin>>v;cout<<kthSmallest(a,k)<<'\\n';}`,
        javascript: `const fs=require('fs');const x=fs.readFileSync(0,'utf8').trim().split(/\\s+/).map(Number),n=x[0],k=x[1];function kthSmallest(a,k){a.sort((x,y)=>x-y);return a[k-1]}console.log(kthSmallest(x.slice(2,2+n),k));`
    },
    'ch-099': {
        python: `import sys
def count_inversions(values):
 def sort(a):
  if len(a)<2:return a,0
  m=len(a)//2;l,x=sort(a[:m]);r,y=sort(a[m:]);o=[];i=j=0;c=x+y
  while i<len(l) and j<len(r):
   if l[i]<=r[j]:o.append(l[i]);i+=1
   else:o.append(r[j]);j+=1;c+=len(l)-i
  return o+l[i:]+r[j:],c
 return sort(values)[1]
x=list(map(int,sys.stdin.buffer.read().split()));print(count_inversions(x[1:1+x[0]]))`,
        java: `import java.util.*;
public class Main {
 static long sortCount(int[]a,int[]t,int l,int r){if(r-l<2)return 0;int m=(l+r)/2;long c=sortCount(a,t,l,m)+sortCount(a,t,m,r);int i=l,j=m,k=l;while(i<m&&j<r){if(a[i]<=a[j])t[k++]=a[i++];else{t[k++]=a[j++];c+=m-i;}}while(i<m)t[k++]=a[i++];while(j<r)t[k++]=a[j++];System.arraycopy(t,l,a,l,r-l);return c;}
 static long countInversions(int[]a){return sortCount(a,new int[a.length],0,a.length);}
 public static void main(String[]z){Scanner s=new Scanner(System.in);int n=s.nextInt();int[]a=new int[n];for(int i=0;i<n;i++)a[i]=s.nextInt();System.out.println(countInversions(a));}
}`,
        cpp: `#include <bits/stdc++.h>
using namespace std;
long long countInv(vector<int>&a,vector<int>&t,int l,int r){if(r-l<2)return 0;int m=(l+r)/2;long long c=countInv(a,t,l,m)+countInv(a,t,m,r);int i=l,j=m,k=l;while(i<m&&j<r)if(a[i]<=a[j])t[k++]=a[i++];else t[k++]=a[j++],c+=m-i;while(i<m)t[k++]=a[i++];while(j<r)t[k++]=a[j++];copy(t.begin()+l,t.begin()+r,a.begin()+l);return c;}
int main(){int n;if(!(cin>>n))return 0;vector<int>a(n),t(n);for(int&v:a)cin>>v;cout<<countInv(a,t,0,n)<<'\\n';}`,
        javascript: `const fs=require('fs');const x=fs.readFileSync(0,'utf8').trim().split(/\\s+/).map(Number);function countInversions(a){function f(l,r){if(r-l<2)return 0;let m=(l+r)>>1,c=f(l,m)+f(m,r),t=[],i=l,j=m;while(i<m&&j<r)if(a[i]<=a[j])t.push(a[i++]);else{t.push(a[j++]);c+=m-i}while(i<m)t.push(a[i++]);while(j<r)t.push(a[j++]);for(let k=0;k<t.length;k++)a[l+k]=t[k];return c}return f(0,a.length)}console.log(countInversions(x.slice(1,1+x[0])));`
    },
    'ch-100': {
        python: `import sys
import math
def kth_permutation(chars,k):
 chars=sorted(chars)
 if k<1 or k>math.factorial(len(chars)):return 'OUT_OF_RANGE'
 if len(chars)==1:return chars[0]
 block=math.factorial(len(chars)-1);index=(k-1)//block
 return chars[index]+kth_permutation(chars[:index]+chars[index+1:],(k-1)%block+1)
n,k=map(int,sys.stdin.buffer.readline().split());text=sys.stdin.buffer.readline().decode().strip()
print(kth_permutation(text,k))`,
        java: `import java.util.*;
public class Main {
 static long fact(int n){long f=1;for(int i=2;i<=n;i++)f*=i;return f;}
 static String choose(char[]a,long k){if(a.length==0)return "";long block=fact(a.length-1);int i=(int)((k-1)/block);char[]b=new char[a.length-1];System.arraycopy(a,0,b,0,i);System.arraycopy(a,i+1,b,i,a.length-i-1);return a[i]+choose(b,(k-1)%block+1);}
 static String kthPermutation(String text,long k){char[]a=text.toCharArray();Arrays.sort(a);return k<1||k>fact(a.length)?null:choose(a,k);}
 public static void main(String[]z){Scanner s=new Scanner(System.in);int n=s.nextInt();long k=s.nextLong();String text=s.next();System.out.println(kthPermutation(text,k)==null?"OUT_OF_RANGE":kthPermutation(text,k));}
}`,
        cpp: `#include <bits/stdc++.h>
using namespace std;
long long fact(int n){long long f=1;for(int i=2;i<=n;i++)f*=i;return f;}
string choose(const string&a,long long k){if(a.empty())return "";long long block=fact(a.size()-1);int i=(k-1)/block;string rest=a.substr(0,i)+a.substr(i+1);return string(1,a[i])+choose(rest,(k-1)%block+1);}
string kthPermutation(string a,long long k){sort(a.begin(),a.end());if(k<1||k>fact(a.size()))return "";return choose(a,k);}
int main(){int n;long long k;string s;if(!(cin>>n>>k>>s))return 0;string r=kthPermutation(s,k);cout<<(r.empty()?"OUT_OF_RANGE":r)<<'\\n';}`,
        javascript: `const fs=require('fs');const lines=fs.readFileSync(0,'utf8').trim().split(/\\s+/),n=Number(lines[0]),k=Number(lines[1]),text=lines[2];function fact(n){let r=1;for(let i=2;i<=n;i++)r*=i;return r}function kthPermutation(chars,k){chars=chars.split('').sort();if(k<1||k>fact(chars.length))return null;if(chars.length===1)return chars[0];let block=fact(chars.length-1),i=Math.floor((k-1)/block),rest=chars.slice();rest.splice(i,1);return chars[i]+kthPermutation(rest.join(''),(k-1)%block+1)}const answer=kthPermutation(text,k);console.log(answer===null?'OUT_OF_RANGE':answer);`
    }
};

const scaffoldSpecs = {
    'ch-085': { kind: 'edges', name: 'count_components', javaName: 'countComponents', returnType: 'int', javaType: 'int', parameters: 'n, edges', javaParameters: 'int n, int[][] edges', cppParameters: 'int n, const vector<pair<int,int>>& edges', guide: 'Build undirected adjacency lists, then traverse each still-unvisited vertex to count one connected component.' },
    'ch-086': { kind: 'path', name: 'shortest_hops', javaName: 'shortestHops', returnType: 'int', javaType: 'int', parameters: 'n, edges, source, target', javaParameters: 'int n, int[][] edges, int source, int target', cppParameters: 'int n, const vector<pair<int,int>>& edges, int source, int target', guide: 'Use a FIFO breadth-first traversal from source; assign a vertex distance only on first discovery and return target distance, or -1.' },
    'ch-087': { kind: 'edges', name: 'is_bipartite', javaName: 'isBipartite', returnType: 'bool', javaType: 'boolean', parameters: 'n, edges', javaParameters: 'int n, int[][] edges', cppParameters: 'int n, const vector<pair<int,int>>& edges', guide: 'Color every graph component with two alternating labels; reject an edge whose endpoints receive the same label.' },
    'ch-088': { kind: 'edges', name: 'lexicographic_topological_order', javaName: 'lexicographicTopo', returnType: 'vector<int>', javaType: 'int[]', parameters: 'n, directed_edges', javaParameters: 'int n, int[][] edges', cppParameters: 'int n, const vector<pair<int,int>>& edges', guide: 'Track indegrees and repeatedly remove the smallest ready label; report the cycle case if fewer than n vertices are emitted.' },
    'ch-089': { kind: 'weighted', name: 'dijkstra_distances', javaName: 'dijkstraDistances', returnType: 'vector<long long>', javaType: 'long[]', parameters: 'n, weighted_edges, source', javaParameters: 'int n, int[][] edges, int source', cppParameters: 'int n, const vector<tuple<int,int,int>>& edges, int source', guide: 'Relax nonnegative edge weights from the least tentative distance; preserve 64-bit path sums and map unreachable vertices to -1.' },
    'ch-090': { kind: 'edges', name: 'count_bridges', javaName: 'countBridges', returnType: 'int', javaType: 'int', parameters: 'n, edges', javaParameters: 'int n, int[][] edges', cppParameters: 'int n, const vector<pair<int,int>>& edges', guide: 'Compute discovery and low-link times in a DFS forest; compare each child low-link against its parent discovery time, identifying the parent edge by ID.' },
    'ch-091': { kind: 'array', name: 'minimum_stair_cost', javaName: 'minimumStairCost', returnType: 'long long', javaType: 'long', parameters: 'costs', javaParameters: 'int[] costs', cppParameters: 'const vector<int>& costs', guide: 'For each stair, add its landing cost to the smaller cost of reaching the previous one or two stairs; the exit may follow either final stair.' },
    'ch-092': { kind: 'array', name: 'maximum_nonadjacent_sum', javaName: 'maximumNonadjacentSum', returnType: 'long long', javaType: 'long', parameters: 'rewards', javaParameters: 'int[] rewards', cppParameters: 'const vector<int>& rewards', guide: 'Maintain the best prefix totals for taking or skipping the current reward; initialize both to zero because choosing nothing is allowed.' },
    'ch-093': { kind: 'coins', name: 'coin_combination_count', javaName: 'coinCombinationCount', returnType: 'long long', javaType: 'long', parameters: 'coins, target', javaParameters: 'int[] coins, int target', cppParameters: 'const vector<int>& coins, int target', guide: 'Initialize ways[0] to one, then process each denomination outside an increasing subtotal loop to count unordered unlimited-use combinations modulo 1000000007.' },
    'ch-094': { kind: 'array', name: 'longest_increasing_subsequence', javaName: 'longestIncreasingSubsequence', returnType: 'int', javaType: 'int', parameters: 'values', javaParameters: 'int[] values', cppParameters: 'const vector<int>& values', guide: 'Maintain the smallest tail for each achievable length and replace the first tail greater than or equal to each new value.' },
    'ch-095': { kind: 'words', name: 'edit_distance', javaName: 'editDistance', returnType: 'int', javaType: 'int', parameters: 'source, target', javaParameters: 'String source, String target', cppParameters: 'const string& source, const string& target', guide: 'Apply the insertion, deletion, and match-or-substitute prefix recurrence; a rolling row is enough to retain only the needed prior state.' },
    'ch-096': { kind: 'matrix', name: 'matrix_chain_minimum', javaName: 'matrixChainMinimum', returnType: 'long long', javaType: 'long', parameters: 'dimensions', javaParameters: 'int[] dimensions', cppParameters: 'const vector<int>& dimensions', guide: 'Fill interval costs by increasing chain length and try every final split; multiply the three boundary dimensions using 64-bit arithmetic.' },
    'ch-097': { kind: 'array', name: 'stable_merge_sort', javaName: 'stableMergeSort', returnType: 'int[]', javaType: 'int[]', parameters: 'values', javaParameters: 'int[] values', cppParameters: 'const vector<int>& values', guide: 'Recursively sort two halves, then merge with a temporary buffer; take the left element first on equality to preserve stability.' },
    'ch-098': { kind: 'kth', name: 'kth_smallest', javaName: 'kthSmallest', returnType: 'int', javaType: 'int', parameters: 'values, k', javaParameters: 'int[] values, int k', cppParameters: 'vector<int> values, int k', guide: 'Select zero-based rank k-1. Sorting is a correct baseline; for selection, partition around a pivot and continue only in the side containing that rank.' },
    'ch-099': { kind: 'array', name: 'count_inversions', javaName: 'countInversions', returnType: 'long long', javaType: 'long', parameters: 'values', javaParameters: 'int[] values', cppParameters: 'const vector<int>& values', guide: 'Count recursively within each half; during merge, a right value smaller than the current left value forms inversions with every remaining left value.' },
    'ch-100': { kind: 'kth-permutation', name: 'kth_permutation', javaName: 'kthPermutation', returnType: 'String', javaType: 'String', parameters: 'letters, k', javaParameters: 'String letters, long k', cppParameters: 'const string& letters, long long k', guide: 'Sort the distinct letters and use factorial-sized lexicographic blocks to choose one character per position without enumerating earlier permutations.' }
};

function createLearnerStarter(problemId) {
    const spec = scaffoldSpecs[problemId];
    const nl = '\n';
    const pythonGuide = `    # ${spec.guide}${nl}    raise RuntimeError("Implement ${spec.name} as described above.")`;
    const javaGuide = `        // ${spec.guide}${nl}        throw new UnsupportedOperationException("Implement ${spec.javaName} as described above.");`;
    const cppGuide = `    // ${spec.guide}${nl}    throw logic_error("Implement ${spec.javaName} as described above.");`;
    const jsGuide = `  // ${spec.guide}${nl}  throw new Error("Implement ${spec.name} as described above.");`;
    let pyParse, jsParse, javaParse, cppParse, pyCall, javaCall, cppCall, jsCall;
    if (spec.kind === 'edges' || spec.kind === 'path' || spec.kind === 'weighted') {
        const prefix = spec.kind === 'path' ? 4 : spec.kind === 'weighted' ? 3 : 2;
        const edgeWidth = spec.kind === 'weighted' ? 3 : 2;
        const extras = spec.kind === 'path' ? ['source', 'target'] : spec.kind === 'weighted' ? ['source'] : [];
        pyParse = [
            'data = list(map(int, sys.stdin.buffer.read().split()))',
            'n, m = data[0], data[1]',
            spec.kind === 'path' ? 'source, target = data[2], data[3]' : spec.kind === 'weighted' ? 'source = data[2]' : '',
            `edges = [tuple(data[i:i+${edgeWidth}]) for i in range(${prefix}, ${prefix} + ${edgeWidth} * m, ${edgeWidth})]`
        ].filter(Boolean).join(nl);
        pyCall = `${spec.name}(n, edges${extras.map(x => `, ${x}`).join('')})`;
        javaParse = [
            '        Scanner in = new Scanner(System.in);',
            '        int n = in.nextInt(), m = in.nextInt();',
            spec.kind === 'path' ? '        int source = in.nextInt(), target = in.nextInt();' : spec.kind === 'weighted' ? '        int source = in.nextInt();' : '',
            `        int[][] edges = new int[m][${edgeWidth}];`,
            `        for (int i = 0; i < m; i++) for (int j = 0; j < ${edgeWidth}; j++) edges[i][j] = in.nextInt();`
        ].filter(Boolean).join(nl);
        javaCall = `${spec.javaName}(n, edges${extras.map(x => `, ${x}`).join('')})`;
        cppParse = [
            '    int n, m; if (!(cin >> n >> m)) return 0;',
            spec.kind === 'path' ? '    int source, target; cin >> source >> target;' : spec.kind === 'weighted' ? '    int source; cin >> source;' : '',
            `    vector<${spec.kind === 'weighted' ? 'tuple<int,int,int>' : 'pair<int,int>'}> edges(m);`,
            spec.kind === 'weighted' ? '    for (auto& [u, v, w] : edges) cin >> u >> v >> w;' : '    for (auto& [u, v] : edges) cin >> u >> v;'
        ].filter(Boolean).join(nl);
        cppCall = `${spec.javaName}(n, edges${extras.map(x => `, ${x}`).join('')})`;
        jsParse = [
            `const data = fs.readFileSync(0, 'utf8').trim().split(/\\s+/).map(Number);`,
            'let p = 0;',
            'const n = data[p++], m = data[p++];',
            spec.kind === 'path' ? 'const source = data[p++], target = data[p++];' : spec.kind === 'weighted' ? 'const source = data[p++];' : '',
            `const edges = Array.from({ length: m }, () => data.slice(p, p += ${edgeWidth}));`
        ].filter(Boolean).join(nl);
        jsCall = `${spec.jsName}(n, edges${extras.map(x => `, ${x}`).join('')})`;
    } else if (spec.kind === 'array' || spec.kind === 'coins' || spec.kind === 'matrix') {
        pyParse = [
            'data = list(map(int, sys.stdin.buffer.read().split()))',
            spec.kind === 'coins' ? 'n, target = data[0], data[1]' : spec.kind === 'matrix' ? 'k = data[0]' : 'n = data[0]',
            spec.kind === 'coins' ? 'values = data[2:2 + n]' : spec.kind === 'matrix' ? 'dimensions = data[1:2 + k]' : 'values = data[1:1 + n]'
        ].join(nl);
        pyCall = spec.kind === 'coins' ? `${spec.name}(values, target)` : `${spec.name}(${spec.kind === 'matrix' ? 'dimensions' : 'values'})`;
        javaParse = [
            '        Scanner in = new Scanner(System.in);',
            spec.kind === 'coins' ? '        int n = in.nextInt(), target = in.nextInt();' : spec.kind === 'matrix' ? '        int k = in.nextInt();' : '        int n = in.nextInt();',
            spec.kind === 'coins' ? '        int[] values = new int[n];' : spec.kind === 'matrix' ? '        int[] dimensions = new int[k + 1];' : '        int[] values = new int[n];',
            spec.kind === 'coins' ? '        for (int i = 0; i < n; i++) values[i] = in.nextInt();' : spec.kind === 'matrix' ? '        for (int i = 0; i <= k; i++) dimensions[i] = in.nextInt();' : '        for (int i = 0; i < n; i++) values[i] = in.nextInt();'
        ].join(nl);
        javaCall = spec.kind === 'coins' ? `${spec.javaName}(values, target)` : `${spec.javaName}(${spec.kind === 'matrix' ? 'dimensions' : 'values'})`;
        cppParse = [
            `    int ${spec.kind === 'matrix' ? 'k' : 'n'}; if (!(cin >> ${spec.kind === 'matrix' ? 'k' : 'n'})) return 0;`,
            spec.kind === 'coins' ? '    int target; cin >> target;' : '',
            spec.kind === 'coins' ? '    vector<int> values(n);' : spec.kind === 'matrix' ? '    vector<int> dimensions(k + 1);' : '    vector<int> values(n);',
            spec.kind === 'coins' || spec.kind === 'array' ? '    for (int& value : values) cin >> value;' : '    for (int& value : dimensions) cin >> value;'
        ].filter(Boolean).join(nl);
        cppCall = spec.kind === 'coins' ? `${spec.javaName}(values, target)` : `${spec.javaName}(${spec.kind === 'matrix' ? 'dimensions' : 'values'})`;
        jsParse = [
            `const data = fs.readFileSync(0, 'utf8').trim().split(/\\s+/).map(Number);`,
            spec.kind === 'coins' ? 'const n = data[0], target = data[1], values = data.slice(2, 2 + n);' : spec.kind === 'matrix' ? 'const k = data[0], dimensions = data.slice(1, 2 + k);' : 'const n = data[0], values = data.slice(1, 1 + n);'
        ].join(nl);
        jsCall = spec.kind === 'coins' ? `${spec.jsName}(values, target)` : `${spec.jsName}(${spec.kind === 'matrix' ? 'dimensions' : 'values'})`;
    } else if (spec.kind === 'words') {
        pyParse = 'source, target = sys.stdin.buffer.read().decode().split()'; pyCall = `${spec.name}(source, target)`;
        javaParse = ['        Scanner in = new Scanner(System.in);', '        String source = in.next(), target = in.next();'].join(nl); javaCall = `${spec.javaName}(source, target)`;
        cppParse = `    string source, target; if (!(cin >> source >> target)) return 0;`; cppCall = `${spec.javaName}(source, target)`;
        jsParse = `const [source, target] = fs.readFileSync(0, 'utf8').trim().split(/\\s+/);`; jsCall = `${spec.jsName}(source, target)`;
    } else {
        pyParse = ['data = sys.stdin.buffer.read().decode().split()', 'n, k, letters = int(data[0]), int(data[1]), data[2]'].join(nl); pyCall = `${spec.name}(letters, k)`;
        javaParse = ['        Scanner in = new Scanner(System.in);', '        int n = in.nextInt(); long k = in.nextLong(); String letters = in.next();'].join(nl); javaCall = `${spec.javaName}(letters, k)`;
        cppParse = `    int n; long long k; string letters; if (!(cin >> n >> k >> letters)) return 0;`; cppCall = `${spec.javaName}(letters, k)`;
        jsParse = [`const [nText, kText, letters] = fs.readFileSync(0, 'utf8').trim().split(/\\s+/);`, 'const n = Number(nText), k = Number(kText);'].join(nl); jsCall = `${spec.jsName}(letters, k)`;
    }
    const pyArgTypes = spec.kind === 'array' || spec.kind === 'coins' ? 'values' : spec.kind === 'matrix' ? 'dimensions' : spec.kind === 'words' ? 'source, target' : spec.kind === 'kth-permutation' ? 'letters, k' : spec.kind === 'path' ? 'n, edges, source, target' : spec.kind === 'weighted' ? 'n, edges, source' : 'n, edges';
    const javaSignature = spec.kind === 'array' ? `int[] values` : spec.kind === 'coins' ? `int[] values, int target` : spec.kind === 'matrix' ? `int[] dimensions` : spec.kind === 'words' ? `String source, String target` : spec.kind === 'kth-permutation' ? `String letters, long k` : spec.kind === 'path' ? `int n, int[][] edges, int source, int target` : spec.kind === 'weighted' ? `int n, int[][] edges, int source` : `int n, int[][] edges`;
    const javaReturn = spec.javaType;
    const cppSignature = spec.kind === 'array' ? `const vector<int>& values` : spec.kind === 'coins' ? `const vector<int>& values, int target` : spec.kind === 'matrix' ? `const vector<int>& dimensions` : spec.kind === 'words' ? `const string& source, const string& target` : spec.kind === 'kth-permutation' ? `const string& letters, long long k` : spec.kind === 'path' ? `int n, const vector<pair<int,int>>& edges, int source, int target` : spec.kind === 'weighted' ? `int n, const vector<tuple<int,int,int>>& edges, int source` : `int n, const vector<pair<int,int>>& edges`;
    const cppReturn = spec.kind === 'kth-permutation' ? 'string' : spec.kind === 'array' && spec.name === 'stable_merge_sort' ? 'vector<int>' : spec.kind === 'edges' && spec.name === 'lexicographic_topological_order' ? 'vector<int>' : spec.kind === 'weighted' ? 'vector<long long>' : spec.returnType;
    const jsParams = pyArgTypes;
    const javaOutput = spec.javaType === 'int[]' || spec.javaType === 'long[]'
        ? `        ${spec.javaType} result = ${javaCall};\n        for (int i = 0; i < result.length; i++) System.out.print((i == 0 ? "" : " ") + result[i]);\n        System.out.println();`
        : `        System.out.println(${javaCall});`;
    const cppOutput = cppReturn.startsWith('vector<')
        ? `    auto result = ${cppCall};\n    for (size_t i = 0; i < result.size(); i++) cout << (i ? " " : "") << result[i];\n    cout << '\\n';`
        : `    cout << ${cppCall} << '\\n';`;
    const pythonOutput = spec.name === 'lexicographic_topological_order'
        ? `result = ${pyCall}\nprint('IMPOSSIBLE' if result is None else ' '.join(map(str, result)))`
        : spec.name === 'dijkstra_distances' || spec.name === 'stable_merge_sort'
            ? `print(*${pyCall})`
            : `print(${pyCall})`;
    const javascriptOutput = spec.name === 'lexicographic_topological_order'
        ? `const result = ${jsCall};\nconsole.log(result === null ? 'IMPOSSIBLE' : result.join(' '));`
        : spec.name === 'dijkstra_distances' || spec.name === 'stable_merge_sort'
            ? `console.log(${jsCall}.join(' '));`
            : `console.log(${jsCall});`;
    return {
        python: ['import sys', '', `def ${spec.name}(${pyArgTypes}):`, pythonGuide, '', pyParse, pythonOutput, ''].join(nl),
        java: ['import java.util.*;', '', 'public class Main {', `    static ${javaReturn} ${spec.javaName}(${javaSignature}) {`, javaGuide, '    }', '', '    public static void main(String[] args) {', javaParse, javaOutput, '    }', '}',''].join(nl),
        cpp: ['#include <bits/stdc++.h>', 'using namespace std;', '', `${cppReturn} ${spec.javaName}(${cppSignature}) {`, cppGuide, '}', '', 'int main() {', '    ios::sync_with_stdio(false);', '    cin.tie(nullptr);', cppParse, cppOutput, '    return 0;', '}', ''].join(nl),
        javascript: [`const fs = require('fs');`, jsParse, `function ${spec.jsName}(${jsParams}) {`, jsGuide, '}', javascriptOutput, ''].join(nl)
    };
}

for (const spec of Object.values(scaffoldSpecs)) {
    spec.jsName = spec.name.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

const catalog = [
    {
        problemId: 'ch-085', title: 'Island Count in an Undirected Network',
        description: 'A network has numbered vertices and undirected links. Count its connected components, including isolated vertices; repeated links do not create extra components.',
        category: 'graphs', difficulty: 'easy',
        inputFormat: 'The first line contains n m. The next m lines each contain endpoints u v of an undirected edge. Vertices are numbered 0 through n-1.',
        outputFormat: 'Print the number of connected components followed by a newline.',
        constraints: '1 <= n <= 200000; 0 <= m <= 300000; 0 <= u,v < n; self-loops and repeated edges may occur.',
        examples: [
            { stdin: '5 3\n0 1\n1 2\n3 4\n', stdout: '2\n', explanation: 'Vertices 0, 1, and 2 form one component; 3 and 4 form another.' },
            { stdin: '4 0\n', stdout: '4\n', explanation: 'With no links, every vertex is an isolated component.' }
        ],
        testCases: [
            { stdin: '5 3\n0 1\n1 2\n3 4\n', expectedOutput: '2\n', explanation: 'Two connected groups are present.', isHidden: false },
            { stdin: '4 0\n', expectedOutput: '4\n', explanation: 'All four vertices are isolated.', isHidden: false },
            { stdin: '6 6\n0 1\n1 2\n2 0\n3 4\n3 4\n4 4\n', expectedOutput: '3\n', explanation: 'A cycle and duplicate links still form one component; vertex 5 is isolated.', isHidden: true },
            { stdin: '1 1\n0 0\n', expectedOutput: '1\n', explanation: 'A self-loop does not split its single vertex into another component.', isHidden: true }
        ],
        hints: ['Treat every vertex as a possible component start, not only vertices mentioned by an edge.', 'Store each undirected edge in both adjacency lists.', 'A stack or queue traversal marks exactly one reachable component at a time.'],
        editorial: 'Build an adjacency list and keep a visited flag per vertex. Scan vertex labels in order; whenever an unvisited vertex is found, increment the component count and run an iterative depth-first traversal from it, marking neighbors when they are pushed. Iteration avoids call-stack limits on long chains. Isolated vertices naturally start a traversal containing only themselves. Duplicate edges and self-loops are harmless because visited vertices are skipped.',
        timeComplexity: 'O(n + m)', spaceComplexity: 'O(n + m)',
        functionSignature: 'count_components(n, undirected_edges) -> integer',
        starterCode: createLearnerStarter('ch-085'),
        referenceCode: referenceCode['ch-085']
    },
    {
        problemId: 'ch-086', title: 'Fewest Links Between Two Stations',
        description: 'Given an undirected unweighted transport network, find the minimum number of links needed to travel from a source station to a destination. Return -1 if they are disconnected.',
        category: 'graphs', difficulty: 'easy',
        inputFormat: 'The first line contains n m s t. The next m lines contain undirected edge endpoints u v. Vertices are numbered 0 through n-1.',
        outputFormat: 'Print the minimum edge count from s to t, or -1 if no route exists.',
        constraints: '1 <= n <= 200000; 0 <= m <= 300000; 0 <= s,t < n; edges are unweighted.',
        examples: [
            { stdin: '6 5 0 5\n0 1\n1 2\n2 5\n0 3\n3 5\n', stdout: '2\n', explanation: 'The route 0-3-5 uses two links, fewer than the alternative route.' },
            { stdin: '4 1 1 3\n1 2\n', stdout: '-1\n', explanation: 'Station 3 cannot be reached from station 1.' }
        ],
        testCases: [
            { stdin: '6 5 0 5\n0 1\n1 2\n2 5\n0 3\n3 5\n', expectedOutput: '2\n', explanation: 'Breadth-first search finds the two-link route.', isHidden: false },
            { stdin: '4 1 1 3\n1 2\n', expectedOutput: '-1\n', explanation: 'Destination lies in a different component.', isHidden: false },
            { stdin: '3 2 2 2\n0 1\n1 2\n', expectedOutput: '0\n', explanation: 'A station is zero links from itself.', isHidden: true },
            { stdin: '5 4 0 4\n0 1\n1 2\n2 3\n3 4\n', expectedOutput: '4\n', explanation: 'A single chain requires all four links.', isHidden: true }
        ],
        hints: ['Explore vertices in nondecreasing distance layers.', 'Record a vertex distance the first time it enters the queue.', 'Do not confuse an unreachable destination with a distance of zero.'],
        editorial: 'Create adjacency lists and initialize all distances to -1. Set the source distance to zero and process a FIFO queue. For each newly discovered neighbor, assign the current distance plus one and enqueue it. FIFO order guarantees that the first assigned distance is shortest. Return the destination distance after the search; it remains -1 when unreachable. The source-equals-destination case is correctly handled by the initial zero assignment.',
        timeComplexity: 'O(n + m)', spaceComplexity: 'O(n + m)',
        functionSignature: 'shortest_hops(n, undirected_edges, source, target) -> integer',
        starterCode: createLearnerStarter('ch-086'),
        referenceCode: referenceCode['ch-086']
    },
    {
        problemId: 'ch-087', title: 'Two-Shift Team Assignment',
        description: 'Assign every worker to one of two shifts so that no pair who must collaborate is assigned to the same shift. Decide whether such an assignment exists.',
        category: 'graphs', difficulty: 'medium',
        inputFormat: 'The first line contains n m. Each of the next m lines gives a collaboration pair u v. Workers are numbered 0 through n-1.',
        outputFormat: 'Print YES if a valid two-shift assignment exists; otherwise print NO.',
        constraints: '1 <= n <= 200000; 0 <= m <= 300000; 0 <= u,v < n. Collaboration is mutual.',
        examples: [
            { stdin: '4 3\n0 1\n1 2\n2 3\n', stdout: 'YES\n', explanation: 'Alternating shift labels along the chain satisfies every collaboration.' },
            { stdin: '3 3\n0 1\n1 2\n2 0\n', stdout: 'NO\n', explanation: 'The odd cycle forces two adjacent workers onto the same shift.' }
        ],
        testCases: [
            { stdin: '4 3\n0 1\n1 2\n2 3\n', expectedOutput: 'YES\n', explanation: 'An even-length path is two-colorable.', isHidden: false },
            { stdin: '3 3\n0 1\n1 2\n2 0\n', expectedOutput: 'NO\n', explanation: 'A triangle is an odd cycle.', isHidden: false },
            { stdin: '5 2\n0 1\n3 4\n', expectedOutput: 'YES\n', explanation: 'Disconnected components can each be colored independently; vertex 2 is isolated.', isHidden: true },
            { stdin: '2 1\n1 1\n', expectedOutput: 'NO\n', explanation: 'A self-collaboration edge requires a worker to differ from their own shift.', isHidden: true }
        ],
        hints: ['A valid assignment corresponds to coloring adjacent vertices differently.', 'Start a traversal for each still-uncolored component.', 'When a colored neighbor is encountered, compare its color with the current vertex.'],
        editorial: 'Represent collaborations as an undirected graph and color vertices with two labels. For each uncolored component, start a BFS with one label and assign the opposite label to every newly reached neighbor. If any edge joins equal labels, no valid assignment exists; otherwise all components can be assigned independently. A self-loop immediately violates the condition. The traversal is linear in the graph size.',
        timeComplexity: 'O(n + m)', spaceComplexity: 'O(n + m)',
        functionSignature: 'is_bipartite(n, collaboration_edges) -> boolean',
        starterCode: createLearnerStarter('ch-087'),
        referenceCode: referenceCode['ch-087']
    },
    {
        problemId: 'ch-088', title: 'Earliest-Ready Course Schedule',
        description: 'Courses have prerequisite requirements. Return a valid order that always chooses the currently available course with the smallest number; if requirements contain a cycle, report that no complete order exists.',
        category: 'graphs', difficulty: 'medium',
        inputFormat: 'The first line contains n m. Each of the next m lines contains prerequisite a followed by course b, meaning a must precede b. Course labels are 0 through n-1.',
        outputFormat: 'Print the lexicographically smallest valid topological order as space-separated labels, or IMPOSSIBLE if no full order exists.',
        constraints: '1 <= n <= 100000; 0 <= m <= 300000; 0 <= a,b < n; duplicate prerequisite pairs may occur and each occurrence is a distinct constraint.',
        examples: [
            { stdin: '4 3\n0 2\n1 2\n2 3\n', stdout: '0 1 2 3\n', explanation: 'Courses 0 and 1 are initially available; choosing the smaller one first yields this order.' },
            { stdin: '3 3\n0 1\n1 2\n2 0\n', stdout: 'IMPOSSIBLE\n', explanation: 'Every course depends indirectly on itself, so no course can begin.' }
        ],
        testCases: [
            { stdin: '4 3\n0 2\n1 2\n2 3\n', expectedOutput: '0 1 2 3\n', explanation: 'A min-priority queue resolves the initial tie as 0 before 1.', isHidden: false },
            { stdin: '3 3\n0 1\n1 2\n2 0\n', expectedOutput: 'IMPOSSIBLE\n', explanation: 'The directed cycle prevents processing all courses.', isHidden: false },
            { stdin: '5 2\n3 4\n1 4\n', expectedOutput: '0 1 2 3 4\n', explanation: 'The two independent labels 0 and 2 are chosen before 3; then 4 becomes ready.', isHidden: true },
            { stdin: '3 2\n0 1\n0 1\n', expectedOutput: '0 1 2\n', explanation: 'Once course 0 is removed, course 1 becomes ready and wins the smallest-label tie over course 2.', isHidden: true }
        ],
        hints: ['Track the number of unmet incoming prerequisites for every course.', 'A minimum-priority queue gives the required tie-breaking among ready courses.', 'A partial order containing fewer than n labels indicates a cycle.'],
        editorial: 'Build outgoing adjacency lists and compute indegrees, counting duplicate edges consistently. Add every zero-indegree course to a min-heap. Repeatedly remove the smallest label, append it to the result, and decrement the indegree of each outgoing neighbor; push a neighbor exactly when its indegree becomes zero. If n labels were emitted, the result is the lexicographically smallest order under the stated ready-course rule. Otherwise at least one directed cycle remains.',
        timeComplexity: 'O((n + m) log n)', spaceComplexity: 'O(n + m)',
        functionSignature: 'lexicographic_topological_order(n, prerequisite_edges) -> list or None',
        starterCode: createLearnerStarter('ch-088'),
        referenceCode: referenceCode['ch-088']
    },
    {
        problemId: 'ch-089', title: 'Lowest-Fare Network Routes',
        description: 'A weighted undirected network has nonnegative fares on each link. From one source, report the minimum fare to every vertex, using -1 for unreachable vertices.',
        category: 'graphs', difficulty: 'hard',
        inputFormat: 'The first line contains n m s. Each of the next m lines contains u v w for an undirected edge with fare w. Vertices are 0 through n-1.',
        outputFormat: 'Print n space-separated minimum fares in vertex order; print -1 for a vertex with no route from s.',
        constraints: '1 <= n <= 100000; 0 <= m <= 200000; 0 <= u,v < n; 0 <= w <= 10^9; every shortest distance fits signed 64-bit.',
        examples: [
            { stdin: '5 5 0\n0 1 7\n0 2 2\n2 1 1\n1 3 4\n2 4 9\n', stdout: '0 3 2 7 11\n', explanation: 'The least fare to 1 uses 0-2-1; the route to 3 then costs 7.' },
            { stdin: '4 1 2\n0 1 5\n', stdout: '-1 -1 0 -1\n', explanation: 'Only source 2 is reachable; vertices 0 and 1 form another component.' }
        ],
        testCases: [
            { stdin: '5 5 0\n0 1 7\n0 2 2\n2 1 1\n1 3 4\n2 4 9\n', expectedOutput: '0 3 2 7 11\n', explanation: 'The cheaper route through vertex 2 improves the direct fare to vertex 1.', isHidden: false },
            { stdin: '4 1 2\n0 1 5\n', expectedOutput: '-1 -1 0 -1\n', explanation: 'Unreachable vertices retain the specified -1 marker.', isHidden: false },
            { stdin: '3 3 0\n0 1 0\n1 2 0\n0 2 5\n', expectedOutput: '0 0 0\n', explanation: 'Zero-weight links are valid and produce zero minimum fares.', isHidden: true },
            { stdin: '4 3 0\n0 1 1000000000\n1 2 1000000000\n2 3 1000000000\n', expectedOutput: '0 1000000000 2000000000 3000000000\n', explanation: 'Three valid one-billion fares accumulate to a three-billion route, requiring a wide distance type.', isHidden: true }
        ],
        hints: ['Maintain the best known fare and process the unsettled vertex with the smallest current fare.', 'Ignore a priority-queue entry if a better route has already replaced it.', 'Use a wide integer type for path sums, even though each edge fare is bounded.'],
        editorial: 'Use Dijkstra’s algorithm because all edge weights are nonnegative. Store both directions in adjacency lists, initialize the source distance to zero and all others to infinity, and push the source into a min-priority queue. On each pop, discard stale entries; otherwise relax every incident edge and push improved distances. Convert remaining infinities to -1 for output. Distances and additions must use 64-bit integers.',
        timeComplexity: 'O((n + m) log n)', spaceComplexity: 'O(n + m)',
        functionSignature: 'dijkstra_distances(n, weighted_edges, source) -> integer array',
        starterCode: createLearnerStarter('ch-089'),
        referenceCode: referenceCode['ch-089']
    },
    {
        problemId: 'ch-090', title: 'Critical Link Counter',
        description: 'A bridge is an undirected network link whose removal increases the number of connected components. Count every bridge, including in disconnected networks and networks with repeated links.',
        category: 'graphs', difficulty: 'hard',
        inputFormat: 'The first line contains n m. The next m lines contain undirected endpoints u v. Vertices are numbered 0 through n-1; each input edge has its own identity.',
        outputFormat: 'Print the number of bridge edges followed by a newline.',
        constraints: '1 <= n <= 200000; 0 <= m <= 300000; 0 <= u,v < n; parallel edges and self-loops are allowed.',
        examples: [
            { stdin: '5 5\n0 1\n1 2\n2 0\n1 3\n3 4\n', stdout: '2\n', explanation: 'The links 1-3 and 3-4 are the only links whose removal disconnects a component.' },
            { stdin: '4 4\n0 1\n1 2\n2 0\n2 3\n', stdout: '1\n', explanation: 'The triangle links are redundant; the sole link to vertex 3 is a bridge.' }
        ],
        testCases: [
            { stdin: '5 5\n0 1\n1 2\n2 0\n1 3\n3 4\n', expectedOutput: '2\n', explanation: 'Both links on the tail after the cycle are bridges.', isHidden: false },
            { stdin: '4 4\n0 1\n1 2\n2 0\n2 3\n', expectedOutput: '1\n', explanation: 'Removing a triangle edge leaves the cycle connected; the tail edge is the only bridge.', isHidden: false },
            { stdin: '4 4\n0 1\n0 1\n1 2\n2 3\n', expectedOutput: '2\n', explanation: 'The parallel 0-1 links protect each other; the remaining chain edges are bridges.', isHidden: true },
            { stdin: '5 2\n0 1\n3 4\n', expectedOutput: '2\n', explanation: 'Each edge is the only link in its own component.', isHidden: true }
        ],
        hints: ['A DFS tree edge is a bridge only if its child subtree has no back edge reaching the parent or an ancestor.', 'Track discovery time and the minimum discovery time reachable from each subtree.', 'Skip the parent edge by its input identity, not merely by its endpoint, so parallel links work.'],
        editorial: 'Run Tarjan’s bridge search in every connected component. Assign each vertex a discovery time and low-link value. For a DFS tree edge u-v, after visiting v, the edge is a bridge precisely when low[v] is greater than discovery[u]. Update low[u] with discovery times for back edges. Give each input edge a unique ID and skip only the exact DFS parent edge; a second parallel edge is a valid back edge and prevents a false bridge report. Use a DFS implementation that can safely handle the maximum path depth.',
        timeComplexity: 'O(n + m)', spaceComplexity: 'O(n + m)',
        functionSignature: 'count_bridges(n, undirected_edges) -> integer',
        starterCode: createLearnerStarter('ch-090'),
        referenceCode: referenceCode['ch-090']
    },
    {
        problemId: 'ch-091', title: 'Least Cost to Leave the Stairs',
        description: 'Each stair has an entry cost. Starting just before stair 0, move one or two steps at a time; the cost of a path is the sum of costs for stairs landed on. Find the minimum cost to reach position n, just beyond the final stair.',
        category: 'dynamic-programming', difficulty: 'easy',
        inputFormat: 'The first line contains n, the number of stairs. The second line contains n integer landing costs c0 through c(n-1).',
        outputFormat: 'Print the minimum total cost to reach position n.',
        constraints: '1 <= n <= 200000; -10^9 <= ci <= 10^9; the answer fits signed 64-bit.',
        examples: [
            { stdin: '3\n5 1 8\n', stdout: '1\n', explanation: 'Land on stair 1 for cost 1, then jump two positions to the exit.' },
            { stdin: '4\n2 7 3 9\n', stdout: '5\n', explanation: 'Landing on stairs 0 and 2 costs 2 + 3, then one step reaches the exit.' }
        ],
        testCases: [
            { stdin: '3\n5 1 8\n', expectedOutput: '1\n', explanation: 'The cheapest route pays only the middle stair cost.', isHidden: false },
            { stdin: '4\n2 7 3 9\n', expectedOutput: '5\n', explanation: 'Costs 2 and 3 are the least-cost sequence of landings.', isHidden: false },
            { stdin: '1\n-6\n', expectedOutput: '-6\n', explanation: 'From the start, the single stair can be landed on before exiting.', isHidden: true },
            { stdin: '5\n0 0 0 0 0\n', expectedOutput: '0\n', explanation: 'Every route has zero total cost.', isHidden: true }
        ],
        hints: ['The exit can be reached from either of the last two positions.', 'Define the best cost to reach each stair, not the cost to stand before it.', 'Keep only the previous two dynamic-programming values to use constant extra space.'],
        editorial: 'Let dp[i] be the least cost to land on stair i. The start position before stair 0 has cost zero, so dp[0] is c0; for each later stair, dp[i] = ci + min(dp[i-1], dp[i-2]), treating the start as a valid predecessor for the first two stairs. The final jump to position n costs nothing, so the answer is the smaller cost of the last two stairs. A rolling pair suffices. Negative landing costs are permitted and do not break the recurrence.',
        timeComplexity: 'O(n)', spaceComplexity: 'O(1)',
        functionSignature: 'minimum_stair_cost(landing_costs) -> 64-bit integer',
        starterCode: createLearnerStarter('ch-091'),
        referenceCode: referenceCode['ch-091']
    },
    {
        problemId: 'ch-092', title: 'Maximum Nonadjacent Reward',
        description: 'Select any subset of rewards arranged in a row, but two neighboring rewards cannot both be selected. Return the greatest total, with selecting nothing allowed.',
        category: 'dynamic-programming', difficulty: 'easy',
        inputFormat: 'The first line contains n. The second line contains n signed integer rewards.',
        outputFormat: 'Print the maximum obtainable total reward.',
        constraints: '1 <= n <= 200000; -10^9 <= reward[i] <= 10^9; the result fits signed 64-bit.',
        examples: [
            { stdin: '5\n4 1 8 3 6\n', stdout: '18\n', explanation: 'Select rewards 4, 8, and 6; none are adjacent.' },
            { stdin: '4\n-5 -2 -9 -1\n', stdout: '0\n', explanation: 'Because the empty selection is allowed, negative rewards need not be taken.' }
        ],
        testCases: [
            { stdin: '5\n4 1 8 3 6\n', expectedOutput: '18\n', explanation: 'The best nonadjacent selection totals 4 + 8 + 6.', isHidden: false },
            { stdin: '4\n-5 -2 -9 -1\n', expectedOutput: '0\n', explanation: 'Taking no elements beats every negative selection.', isHidden: false },
            { stdin: '1\n7\n', expectedOutput: '7\n', explanation: 'A single positive reward can be selected.', isHidden: true },
            { stdin: '6\n2 10 1 1 10 2\n', expectedOutput: '20\n', explanation: 'The two 10-valued rewards can both be selected and are nonadjacent.', isHidden: true }
        ],
        hints: ['At each position, compare skipping it with taking it and therefore skipping its predecessor.', 'Maintain the best total for prefixes ending before the current position.', 'Initialize the recurrence so all-negative input returns zero.'],
        editorial: 'Maintain two prefix optima: best[i-1] and best[i-2]. For a reward x, the new optimum is max(best[i-1], best[i-2] + x). Initialize both states to zero because an empty subset is legal. Iterate once and keep only the two rolling values. This recurrence covers negative values naturally, avoids adjacency violations by construction, and uses constant additional memory.',
        timeComplexity: 'O(n)', spaceComplexity: 'O(1)',
        functionSignature: 'maximum_nonadjacent_sum(rewards) -> 64-bit integer',
        starterCode: createLearnerStarter('ch-092'),
        referenceCode: referenceCode['ch-092']
    },
    {
        problemId: 'ch-093', title: 'Distinct Coin Combination Total',
        description: 'Count the different multisets of coins that add to a target. Each denomination can be used without limit, but reordering the same coins does not create a new combination.',
        category: 'dynamic-programming', difficulty: 'medium',
        inputFormat: 'The first line contains n target. The next line contains n distinct positive coin denominations.',
        outputFormat: 'Print the number of combinations modulo 1000000007.',
        constraints: '1 <= n <= 100; 0 <= target <= 100000; denominations are distinct integers in [1,100000].',
        examples: [
            { stdin: '3 5\n1 2 5\n', stdout: '4\n', explanation: 'The combinations are 5, 2+2+1, 2+1+1+1, and five 1-coins.' },
            { stdin: '2 3\n2 4\n', stdout: '0\n', explanation: 'No sum of 2- and 4-value coins equals 3.' }
        ],
        testCases: [
            { stdin: '3 5\n1 2 5\n', expectedOutput: '4\n', explanation: 'Four unordered combinations form the amount 5.', isHidden: false },
            { stdin: '2 3\n2 4\n', expectedOutput: '0\n', explanation: 'The target is not representable.', isHidden: false },
            { stdin: '3 0\n1 3 7\n', expectedOutput: '1\n', explanation: 'The empty multiset is the one way to make amount zero.', isHidden: true },
            { stdin: '2 6\n1 3\n', expectedOutput: '3\n', explanation: 'The combinations use zero, one, or two 3-value coins, with 1-value coins filling the remainder.', isHidden: true }
        ],
        hints: ['Use one DP entry for each amount from zero through target.', 'Process denominations in the outer loop so each unordered combination is counted once.', 'For a fixed denomination, update amounts in increasing order to permit unlimited reuse.'],
        editorial: 'Set ways[0] to one and all other entries to zero. For each distinct denomination c, scan amounts from c through target in increasing order and add ways[amount-c] into ways[amount], reducing modulo 1000000007. The denomination-first loop assigns every multiset a unique ordering by denomination, while the forward amount scan allows the same coin to be used repeatedly. For target zero, the empty combination remains the sole result.',
        timeComplexity: 'O(n * target)', spaceComplexity: 'O(target)',
        functionSignature: 'coin_combination_count(denominations, target) -> integer modulo 1000000007',
        starterCode: createLearnerStarter('ch-093'),
        referenceCode: referenceCode['ch-093']
    },
    {
        problemId: 'ch-094', title: 'Strictly Rising Sequence Length',
        description: 'Find the length of the longest subsequence whose values strictly increase from left to right. A subsequence may omit elements but must preserve their original order.',
        category: 'dynamic-programming', difficulty: 'medium',
        inputFormat: 'The first line contains n. The second line contains n integers in their original order.',
        outputFormat: 'Print the length of the longest strictly increasing subsequence.',
        constraints: '1 <= n <= 200000; -10^9 <= value[i] <= 10^9.',
        examples: [
            { stdin: '8\n10 4 6 3 8 9 2 11\n', stdout: '5\n', explanation: 'One longest subsequence is 4, 6, 8, 9, 11.' },
            { stdin: '5\n7 7 7 7 7\n', stdout: '1\n', explanation: 'Equal values cannot extend a strictly increasing subsequence.' }
        ],
        testCases: [
            { stdin: '8\n10 4 6 3 8 9 2 11\n', expectedOutput: '5\n', explanation: 'The sequence 4, 6, 8, 9, 11 has maximum length.', isHidden: false },
            { stdin: '5\n7 7 7 7 7\n', expectedOutput: '1\n', explanation: 'Only one copy of an equal value can appear in a strict increase.', isHidden: false },
            { stdin: '6\n-8 -3 -5 -1 0 4\n', expectedOutput: '5\n', explanation: 'The values -8, -5, -1, 0, 4 form a longest valid subsequence.', isHidden: true },
            { stdin: '4\n9 6 3 0\n', expectedOutput: '1\n', explanation: 'A strictly decreasing sequence has no increasing pair.', isHidden: true }
        ],
        hints: ['Maintain the smallest possible ending value for each achievable subsequence length.', 'Binary-search the first maintained tail that is not smaller than the next value.', 'Using lower-bound behavior is what enforces strict rather than nondecreasing order.'],
        editorial: 'Maintain a tails array where tails[k] is the smallest ending value found for an increasing subsequence of length k+1. For each input value, binary-search the first tail greater than or equal to it and replace that tail; if no such tail exists, append the value. The array length is the answer. The tails array is a compact summary rather than an actual subsequence, but its length is exact. Lower-bound replacement ensures equal values do not extend a strict subsequence.',
        timeComplexity: 'O(n log n)', spaceComplexity: 'O(n)',
        functionSignature: 'longest_increasing_subsequence(values) -> integer',
        starterCode: createLearnerStarter('ch-094'),
        referenceCode: referenceCode['ch-094']
    },
    {
        problemId: 'ch-095', title: 'Minimum Typing Corrections',
        description: 'Given two lowercase words, find the minimum number of single-character insertions, deletions, and substitutions needed to transform the first word into the second.',
        category: 'dynamic-programming', difficulty: 'hard',
        inputFormat: 'One line contains two nonempty lowercase words separated by one space.',
        outputFormat: 'Print the minimum edit count.',
        constraints: '1 <= length of each word <= 3000; strings contain lowercase English letters only.',
        examples: [
            { stdin: 'kitten sitting\n', stdout: '3\n', explanation: 'Replace k with s, replace e with i, then insert g.' },
            { stdin: 'book back\n', stdout: '2\n', explanation: 'Two substitutions transform book into back.' }
        ],
        testCases: [
            { stdin: 'kitten sitting\n', expectedOutput: '3\n', explanation: 'Two replacements and one insertion are sufficient and necessary.', isHidden: false },
            { stdin: 'book back\n', expectedOutput: '2\n', explanation: 'The first and fourth characters differ.', isHidden: false },
            { stdin: 'same same\n', expectedOutput: '0\n', explanation: 'Identical words require no edits.', isHidden: true },
            { stdin: 'a abcde\n', expectedOutput: '4\n', explanation: 'Four insertions extend the one-character word.', isHidden: true }
        ],
        hints: ['Let each state represent the best conversion cost for prefixes of both words.', 'The final characters either match or are handled by one of three edit operations.', 'Only the previous DP row is needed when traversing the first word one character at a time.'],
        editorial: 'Use the Levenshtein recurrence on prefixes: deleting the current source character costs one plus the previous-row value in the same target column; inserting costs one plus the current-row value to the left; matching or substituting uses the previous diagonal plus zero or one. Initialize the empty-prefix row with target-prefix lengths and the first column with source-prefix lengths. A rolling row reduces storage from O(|a||b|) to O(|b|).',
        timeComplexity: 'O(|a| * |b|)', spaceComplexity: 'O(|b|)',
        functionSignature: 'edit_distance(source_word, target_word) -> integer',
        starterCode: createLearnerStarter('ch-095'),
        referenceCode: referenceCode['ch-095']
    },
    {
        problemId: 'ch-096', title: 'Cheapest Matrix Multiplication Plan',
        description: 'A chain of matrices must be multiplied in order. Parenthesization may change the number of scalar multiplications; determine the smallest possible count without performing the matrix operations.',
        category: 'dynamic-programming', difficulty: 'hard',
        inputFormat: 'The first line contains k, the number of matrices. The second line contains k+1 positive dimensions p0 through pk; matrix i has shape p(i-1) by pi.',
        outputFormat: 'Print the minimum scalar multiplication count.',
        constraints: '1 <= k <= 300; 1 <= pi <= 10000; the optimal answer fits signed 64-bit.',
        examples: [
            { stdin: '3\n10 30 5 60\n', stdout: '4500\n', explanation: 'Multiplying the first two matrices costs 1500, then combining the result with the third costs 3000.' },
            { stdin: '2\n5 10 3\n', stdout: '150\n', explanation: 'Two matrices have only one parenthesization, costing 5*10*3.' }
        ],
        testCases: [
            { stdin: '3\n10 30 5 60\n', expectedOutput: '4500\n', explanation: 'The split after matrix 2 is cheaper than multiplying the final two first.', isHidden: false },
            { stdin: '2\n5 10 3\n', expectedOutput: '150\n', explanation: 'The sole product uses 150 scalar multiplications.', isHidden: false },
            { stdin: '4\n1 2 3 4 5\n', expectedOutput: '38\n', explanation: 'Splitting as (A1 A2)(A3 A4) costs 6 + 60 + 15 = 81; the best chain arrangement evaluates as ((A1 A2)A3)A4 for 6+12+20=38.', isHidden: true },
            { stdin: '3\n100 1 100 1\n', expectedOutput: '200\n', explanation: 'Multiplying the first pair costs 10000, while multiplying the last pair first costs 100; the combined cost is 100.', isHidden: true }
        ],
        hints: ['For every contiguous matrix interval, try each possible final split.', 'The dimensions at a split determine the scalar cost of multiplying its two resulting products.', 'Compute intervals from shorter chains to longer chains.'],
        editorial: 'Let dp[i][j] be the minimum cost to multiply matrices i through j, using zero for a one-matrix interval. For each interval length from two upward, try every split k and minimize dp[i][k] + dp[k+1][j] + p[i]*p[k+1]*p[j+1] with zero-based matrix indices. The dimension product and accumulated costs must use 64-bit arithmetic. The answer is the full interval cost. This interval DP is cubic in the number of matrices and quadratic in memory.',
        timeComplexity: 'O(k^3)', spaceComplexity: 'O(k^2)',
        functionSignature: 'matrix_chain_minimum(dimensions) -> 64-bit integer',
        starterCode: createLearnerStarter('ch-096'),
        referenceCode: referenceCode['ch-096']
    },
    {
        problemId: 'ch-097', title: 'Stable Recursive Number Ordering',
        description: 'Sort a sequence of integers into nondecreasing order using recursive divide-and-merge. The result must preserve equal values as equal entries; stability is part of the algorithmic requirement.',
        category: 'sorting-recursion', difficulty: 'easy',
        inputFormat: 'The first line contains n. The second line contains n signed integers.',
        outputFormat: 'Print the sorted values separated by single spaces, followed by a newline.',
        constraints: '1 <= n <= 200000; -10^9 <= value[i] <= 10^9.',
        examples: [
            { stdin: '7\n5 1 4 1 9 -2 0\n', stdout: '-2 0 1 1 4 5 9\n', explanation: 'Each half is sorted recursively, then merged in order.' },
            { stdin: '4\n3 3 3 3\n', stdout: '3 3 3 3\n', explanation: 'Repeated equal values remain present in the output.' }
        ],
        testCases: [
            { stdin: '7\n5 1 4 1 9 -2 0\n', expectedOutput: '-2 0 1 1 4 5 9\n', explanation: 'The merge process orders negative, zero, and positive values.', isHidden: false },
            { stdin: '4\n3 3 3 3\n', expectedOutput: '3 3 3 3\n', explanation: 'No values are lost when all entries are equal.', isHidden: false },
            { stdin: '1\n-12\n', expectedOutput: '-12\n', explanation: 'A one-element input is already sorted.', isHidden: true },
            { stdin: '6\n8 -1 8 0 -1 4\n', expectedOutput: '-1 -1 0 4 8 8\n', explanation: 'Duplicate negative and positive values appear with their original multiplicity.', isHidden: true }
        ],
        hints: ['Divide the half-open interval until it contains at most one element.', 'The merge should compare the fronts of both sorted halves.', 'Choose the left value on equality to retain stability.'],
        editorial: 'Apply merge sort to half-open index ranges. Recursively sort each half, then merge into a temporary buffer by repeatedly selecting the smaller front value; on equality, take the left value first to preserve stability. Copy remaining values and write the merged range back. A reusable auxiliary array avoids repeated allocations in a tuned implementation. The recursion depth is logarithmic and the total merge work per level is linear.',
        timeComplexity: 'O(n log n)', spaceComplexity: 'O(n)',
        functionSignature: 'stable_merge_sort(values) -> sorted integer array',
        starterCode: createLearnerStarter('ch-097'),
        referenceCode: referenceCode['ch-097']
    },
    {
        problemId: 'ch-098', title: 'Kth Value in an Unordered Batch',
        description: 'Return the value that would appear at one-based position k if the input batch were sorted in nondecreasing order. Equal values occupy separate positions.',
        category: 'sorting-recursion', difficulty: 'medium',
        inputFormat: 'The first line contains n k. The second line contains n signed integers. k is one-based.',
        outputFormat: 'Print the value at sorted position k.',
        constraints: '1 <= n <= 200000; 1 <= k <= n; -10^9 <= value[i] <= 10^9.',
        examples: [
            { stdin: '6 3\n7 2 9 2 5 1\n', stdout: '2\n', explanation: 'The sorted values are 1, 2, 2, 5, 7, 9, so position 3 contains 2.' },
            { stdin: '5 1\n-4 8 0 3 2\n', stdout: '-4\n', explanation: 'The smallest value occupies the first one-based position.' }
        ],
        testCases: [
            { stdin: '6 3\n7 2 9 2 5 1\n', expectedOutput: '2\n', explanation: 'Duplicates each contribute a rank position.', isHidden: false },
            { stdin: '5 1\n-4 8 0 3 2\n', expectedOutput: '-4\n', explanation: 'The first order statistic is the minimum.', isHidden: false },
            { stdin: '4 4\n6 6 6 6\n', expectedOutput: '6\n', explanation: 'The maximum rank is valid even when every value ties.', isHidden: true },
            { stdin: '7 5\n12 -5 7 0 19 3 8\n', expectedOutput: '8\n', explanation: 'The ordered batch is -5, 0, 3, 7, 8, 12, 19.', isHidden: true }
        ],
        hints: ['The desired rank is a partition boundary, not a one-based array index after selection.', 'A partition places values no greater than the pivot on one side and larger values on the other.', 'Handle duplicates consistently and narrow the recursive or iterative search to the side containing rank k-1.'],
        editorial: 'A direct solution sorts the values and returns index k-1, requiring O(n log n) time. To practice selection, quickselect repeatedly partitions around a pivot and continues only in the partition containing target index k-1; randomized pivots give expected linear time, while a worst-case-safe deterministic selection method can guarantee linear time. Duplicates must be included in rank counts, and the input bounds ensure sorting is also a practical valid implementation.',
        timeComplexity: 'O(n log n) for the provided sorting starter; expected O(n) with randomized selection', spaceComplexity: 'O(1) auxiliary for in-place selection; O(n) for a copied array',
        functionSignature: 'kth_smallest(values, one_based_k) -> integer',
        starterCode: createLearnerStarter('ch-098'),
        referenceCode: referenceCode['ch-098']
    },
    {
        problemId: 'ch-099', title: 'Count Out-of-Order Pairs',
        description: 'Count index pairs (i,j) such that i is before j but value[i] is greater than value[j]. Equal values are not inversions.',
        category: 'sorting-recursion', difficulty: 'medium',
        inputFormat: 'The first line contains n. The second line contains n signed integers in original order.',
        outputFormat: 'Print the number of inversion pairs.',
        constraints: '1 <= n <= 200000; -10^9 <= value[i] <= 10^9; the count fits signed 64-bit.',
        examples: [
            { stdin: '5\n2 4 1 3 5\n', stdout: '3\n', explanation: 'The inversions are (2,1), (4,1), and (4,3) by value.' },
            { stdin: '4\n4 3 2 1\n', stdout: '6\n', explanation: 'Every earlier-later pair is out of order in a decreasing sequence.' }
        ],
        testCases: [
            { stdin: '5\n2 4 1 3 5\n', expectedOutput: '3\n', explanation: 'Three pairs violate ascending order.', isHidden: false },
            { stdin: '4\n4 3 2 1\n', expectedOutput: '6\n', explanation: 'A decreasing sequence of length four has 4*3/2 inversions.', isHidden: false },
            { stdin: '5\n1 1 1 1 1\n', expectedOutput: '0\n', explanation: 'Strict greater-than excludes equal pairs.', isHidden: true },
            { stdin: '6\n3 -1 2 -1 0 4\n', expectedOutput: '6\n', explanation: 'Value 3 contributes four inversions, and value 2 contributes two.' , isHidden: true }
        ],
        hints: ['Count pairs wholly inside each half recursively, then count cross-half pairs during merge.', 'When a right-half value is smaller than the current left value, it is smaller than every remaining left value.', 'Use a 64-bit counter because the maximum pair count grows quadratically.'],
        editorial: 'Use a merge-sort recursion that returns a sorted range and its inversion count. Add the counts from both halves. While merging, if the next left value is at most the next right value, emit the left value; otherwise emit the right value and add the number of unmerged left values, since each is greater than it. Taking the left value on equality prevents equal pairs from being counted. The total requires a 64-bit integer.',
        timeComplexity: 'O(n log n)', spaceComplexity: 'O(n)',
        functionSignature: 'count_inversions(values) -> 64-bit integer',
        starterCode: createLearnerStarter('ch-099'),
        referenceCode: referenceCode['ch-099']
    },
    {
        problemId: 'ch-100', title: 'Kth Alphabetical Arrangement',
        description: 'Given n distinct lowercase letters, return the one-based kth permutation in lexicographic order without generating all earlier arrangements. Report OUT_OF_RANGE when k exceeds n factorial.',
        category: 'sorting-recursion', difficulty: 'medium',
        inputFormat: 'The first line contains n k. The second line contains a string of n pairwise-distinct lowercase English letters. k is one-based.',
        outputFormat: 'Print the kth permutation in lexicographic order, or OUT_OF_RANGE if k is greater than n factorial.',
        constraints: '1 <= n <= 9; 1 <= k <= 400000; the string contains exactly n distinct lowercase letters.',
        examples: [
            { stdin: '4 9\nabcd\n', stdout: 'bcad\n', explanation: 'The ninth lexicographic arrangement is bcad.' },
            { stdin: '3 6\nabc\n', stdout: 'cba\n', explanation: 'The last of the six arrangements is the letters in descending order.' }
        ],
        testCases: [
            { stdin: '4 9\nabcd\n', expectedOutput: 'bcad\n', explanation: 'Factorial blocks place the ninth arrangement in the b-prefix block.', isHidden: false },
            { stdin: '3 6\nabc\n', expectedOutput: 'cba\n', explanation: 'Rank six is the final permutation.', isHidden: false },
            { stdin: '3 7\nabc\n', expectedOutput: 'OUT_OF_RANGE\n', explanation: 'There are only 3! = 6 distinct arrangements.', isHidden: true },
            { stdin: '1 1\nz\n', expectedOutput: 'z\n', explanation: 'A one-letter string has exactly one permutation.', isHidden: true }
        ],
        hints: ['Sort the letters first so each recursive choice follows lexicographic order.', 'After fixing one letter, all permutations of the remaining n-1 letters form a block of (n-1) factorial arrangements.', 'Use k-1 when selecting a zero-based block index, then convert the remainder back to a one-based rank.'],
        editorial: 'Sort the distinct letters. At a recursion level with r letters remaining, each possible first letter owns a contiguous lexicographic block of (r-1)! permutations. Subtracting one from k gives the zero-based block index and within-block offset. Select that letter, remove it, and recurse with the offset converted back to one-based rank. The total number of arrangements is n!, which also detects an out-of-range rank. At most n recursive levels and small array operations are needed.',
        timeComplexity: 'O(n^2) including letter removal; O(n) recursive levels', spaceComplexity: 'O(n)',
        functionSignature: 'kth_permutation(distinct_letters, one_based_rank) -> string or OUT_OF_RANGE',
        starterCode: createLearnerStarter('ch-100'),
        referenceCode: referenceCode['ch-100']
    }
];

module.exports = catalog;
