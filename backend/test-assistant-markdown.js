const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const sourcePath = path.join(__dirname, '..', 'frontend', 'assets', 'shared-nav.js');
const source = fs.readFileSync(sourcePath, 'utf8');
const startMarker = '  function escapeHtml(value) {';
const endMarker = '  // Nav items configuration';
const start = source.indexOf(startMarker);
const end = source.indexOf(endMarker, start);

assert.notEqual(start, -1, 'Markdown renderer must remain in shared navigation');
assert.notEqual(end, -1, 'Markdown renderer must end before navigation configuration');

const rendererSource = source.slice(start, end);
const context = { window: {} };
vm.runInNewContext(rendererSource, context, { filename: sourcePath });
const render = context.window.renderCareerAssistantMarkdown;

assert.equal(typeof render, 'function');
assert.match(render('# Career plan\n\n## Next steps'), /<h2>Career plan<\/h2><h3>Next steps<\/h3>/);
assert.match(render('**Strong** and *clear* with `code`'), /<strong>Strong<\/strong> and <em>clear<\/em> with <code>code<\/code>/);
assert.match(render('- First\n- Second\n\n1. Third\n2. Fourth'), /<ul><li>First<\/li><li>Second<\/li><\/ul><ol><li>Third<\/li><li>Fourth<\/li><\/ol>/);
assert.match(render('```js\nconst answer = 42;\n```'), /<pre class="chat-code-block"><code class="language-js">const answer = 42;<\/code><\/pre>/);
assert.match(render('```js\nconst answer = 42;'), /<pre class="chat-code-block"><code>const answer = 42;<\/code><\/pre>/);

const hostile = '<img src=x onerror="alert(1)"><script>alert(1)</script>';
const safe = render(hostile);
assert.ok(safe.includes('&lt;img src=x onerror=&quot;alert(1)&quot;&gt;'));
assert.ok(safe.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
assert.ok(!safe.includes('<script>'));
assert.ok(!safe.includes('<img'));

const malformedFence = render('```js"\nonerror="alert(1)\n```');
assert.ok(!malformedFence.includes('language-js'));
assert.ok(malformedFence.includes('&quot;'));

console.log('Assistant Markdown renderer tests passed.');
