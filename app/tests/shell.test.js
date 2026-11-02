/* Release and safety checks for the app shell: offline cache list, versions, manifest,
 * namespacing (PR Forge shares the origin), database rules and secrets. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const config = require('../js/config.js');
const sw = read('sw.js');
const shell = JSON.parse(sw.match(/var SHELL = (\[[\s\S]*?\]);/)[1].replace(/'/g, '"'));

test('every file in the offline cache list exists', () => {
  shell.filter((f) => f !== './').forEach((f) => assert.ok(fs.existsSync(path.join(ROOT, f)), `${f} is in sw.js SHELL but missing`));
});

test('every script and stylesheet index.html loads is in the offline cache list', () => {
  const html = read('index.html');
  const refs = [...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css|webmanifest|png))"/g)].map((m) => m[1]);
  assert.ok(refs.length >= 5);
  refs.forEach((r) => assert.ok(shell.includes(r), `${r} is loaded by index.html but not cached in sw.js`));
});

test('the cache name matches the app version, so phones fetch each release', () => {
  const cache = sw.match(/var CACHE = '([^']+)'/)[1];
  assert.equal(cache, config.CACHE_PREFIX + config.VERSION);
});

test('the service worker only deletes its own caches (PR Forge shares this origin)', () => {
  assert.match(sw, /k\.indexOf\(PREFIX\) === 0 && k !== CACHE/);
  assert.equal(sw.match(/var PREFIX = '([^']+)'/)[1], config.CACHE_PREFIX);
});

test('the manifest is valid and its icons exist', () => {
  const m = JSON.parse(read('manifest.webmanifest'));
  assert.equal(m.name, 'Leanward');
  assert.equal(m.start_url, './');
  m.icons.forEach((i) => assert.ok(fs.existsSync(path.join(ROOT, i.src)), `${i.src} missing`));
});

test('app code never touches localStorage without the Leanward prefix', () => {
  ['js/app.js', 'js/cloud.js'].forEach((f) => {
    const src = read(f);
    [...src.matchAll(/localStorage\.(?:getItem|setItem|removeItem)\(([^)]*)\)/g)].forEach((m) => {
      assert.match(m[1], /STORAGE_PREFIX/, `${f}: localStorage key ${m[1]} is not namespaced`);
    });
  });
  assert.equal(config.STORAGE_PREFIX, 'leanward:v1:');
});

test('every table in schema.sql is lw_-prefixed and has row level security on', () => {
  const sql = read('supabase/schema.sql');
  const tables = [...sql.matchAll(/create table if not exists public\.(\w+)/g)].map((m) => m[1]);
  assert.ok(tables.length >= 2);
  tables.forEach((t) => {
    assert.match(t, /^lw_/, `${t} must start with lw_`);
    assert.ok(sql.includes(`alter table public.${t} enable row level security`), `${t} has no RLS`);
  });
  assert.doesNotMatch(sql, /\b(drop|alter|truncate)\s+table\s+(?!public\.lw_)/i, 'schema.sql must not change non-Leanward tables');
});

test('no secret keys are committed', () => {
  const files = [];
  (function walk(dir) {
    fs.readdirSync(dir, { withFileTypes: true }).forEach((d) => {
      const p = path.join(dir, d.name);
      if (d.isDirectory()) { if (!['vendor', 'fonts', 'icons', 'tests'].includes(d.name)) walk(p); }
      else if (/\.(js|html|sql|json|webmanifest|css|md)$/.test(d.name)) files.push(p);
    });
  })(ROOT);
  files.forEach((f) => {
    const src = fs.readFileSync(f, 'utf8');
    assert.doesNotMatch(src, /sb_secret_|service_role|SUPABASE_SERVICE|eyJhbGciOi/, `${path.relative(ROOT, f)} looks like it holds a secret`);
  });
  assert.match(config.SUPABASE_KEY, /^sb_publishable_/);
});
