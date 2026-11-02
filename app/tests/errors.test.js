/* Error reports (js/errors.js): masking, trimming, de-duplication and the offline queue. */
const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../js/errors.js');

test('messages mask quoted text and numbers so food and body data cannot leak', () => {
  assert.equal(E.scrubMessage(`Cannot read 'Greek yogurt, plain' at 245 g`), 'Cannot read "…" at # g');
  assert.equal(E.scrubMessage('weight "194.2" lb, waist 34.6'), 'weight "…" lb, waist #');
  assert.equal(E.scrubMessage('x is `undefined` here'), 'x is "…" here');
  assert.equal(E.scrubMessage(null), '');
});

test("apostrophes in words don't swallow the rest of the message", () => {
  assert.equal(E.scrubMessage("Can't find variable: foo"), "Can't find variable: foo");
});

test('messages are capped at 500 characters', () => {
  assert.equal(E.scrubMessage('a'.repeat(900)).length, 500);
});

test('URLs lose query strings and fragments', () => {
  assert.equal(E.scrubUrl('https://kevo00012.github.io/Leanward/js/app.js?v=3#x'), 'https://kevo00012.github.io/Leanward/js/app.js');
  assert.equal(E.scrubUrl(''), null);
});

test('stacks keep only frame lines, never the message line, and drop query strings', () => {
  const stack = [
    "TypeError: Cannot read 'salmon 170 g'",
    '    at render (https://kevo00012.github.io/Leanward/js/app.js?v=2:120:15)',
    '    at https://kevo00012.github.io/Leanward/js/app.js:88:3',
    'render@https://kevo00012.github.io/Leanward/js/app.js:120:15'
  ].join('\n');
  const out = E.scrubStack(stack);
  assert.ok(!out.includes('salmon'));
  assert.deepEqual(out.split('\n'), [
    'at render (https://kevo00012.github.io/Leanward/js/app.js:120:15)',
    'at https://kevo00012.github.io/Leanward/js/app.js:88:3',
    'render@https://kevo00012.github.io/Leanward/js/app.js:120:15'
  ]);
  assert.equal(E.scrubStack('no frames here'), null);
});

test('a report has only the technical columns of lw_errors', () => {
  const row = E.buildReport({ message: 'Boom 42', source: 'https://x/app.js?q=1', line: '7', col: 3, stack: null }, { version: '0.1.0', userAgent: 'UA' });
  assert.deepEqual(Object.keys(row).sort(), ['app_version', 'col', 'line', 'message', 'source', 'stack', 'user_agent']);
  assert.equal(row.message, 'Boom #');
  assert.equal(row.source, 'https://x/app.js');
  assert.equal(row.line, 7);
  assert.equal(row.app_version, '0.1.0');
});

function memStorage() { let q = []; return { get: () => q, set: (v) => { q = v; }, peek: () => q }; }

test('the same error is sent once per session', async () => {
  const sent = [];
  const r = E.Reporter({ send: async (row) => { sent.push(row); }, storage: memStorage(), env: { version: 't' } });
  await r.report({ message: 'Same', source: 'a.js', line: 1 });
  await r.report({ message: 'Same', source: 'a.js', line: 1 });
  await r.report({ message: 'Other', source: 'a.js', line: 2 });
  assert.equal(sent.length, 2);
});

test('at most MAX_PER_SESSION reports go out in one session', async () => {
  let n = 0;
  const r = E.Reporter({ send: async () => { n++; }, storage: memStorage(), env: {} });
  for (let i = 0; i < 30; i++) await r.report({ message: 'err ' + String.fromCharCode(65 + i), line: i });
  assert.equal(n, E.MAX_PER_SESSION);
});

test('failed sends are queued and go out on flush', async () => {
  let online = false;
  const sent = [];
  const storage = memStorage();
  const r = E.Reporter({ send: async (row) => { if (!online) throw new Error('offline'); sent.push(row); }, storage, env: {} });
  assert.equal(await r.report({ message: 'Offline one', line: 1 }), false);
  assert.equal(storage.peek().length, 1);
  online = true;
  assert.equal(await r.flush(), 1);
  assert.equal(sent.length, 1);
  assert.equal(storage.peek().length, 0);
});

test('a flush that fails keeps the reports queued', async () => {
  const storage = memStorage();
  storage.set([{ message: 'a' }, { message: 'b' }]);
  const r = E.Reporter({ send: async () => { throw new Error('down'); }, storage, env: {} });
  assert.equal(await r.flush(), 0);
  assert.equal(storage.peek().length, 2);
});
