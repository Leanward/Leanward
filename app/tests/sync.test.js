/* Sync rules (js/sync.js) with an in-memory phone store and a stand-in for the Supabase tables that
 * stamps updated_at like the database trigger. Covers the M2 rules: offline entries sync exactly once,
 * replays don't duplicate, tombstones reach other devices, last sync wins, wrong phone clocks don't
 * matter, and edits made during an upload aren't lost. */
const test = require('node:test');
const assert = require('node:assert/strict');
const S = require('../js/sync.js');

const T = 'lw_diary_entries';
const clone = (x) => JSON.parse(JSON.stringify(x));

/** The cloud for one person. `lag` lets a test commit a row with an older timestamp than one already pulled. */
function cloud() {
  let clock = Date.parse('2026-11-03T08:00:00Z');
  const tables = {};
  const t = (name) => (tables[name] = tables[name] || new Map());
  const c = {
    tables, calls: { pushes: 0, rows: 0 }, failNextPush: false, failAfterWrite: false,
    stamp: (offsetMs) => new Date((clock += 1000) + (offsetMs || 0)).toISOString(),
    remote: {
      pull: async (table, since) => [...t(table).values()].filter((r) => !since || r.updated_at > since)
        .sort((a, b) => (a.updated_at < b.updated_at ? -1 : 1)).map(clone),
      push: async (table, rows) => {
        if (c.failNextPush) { c.failNextPush = false; throw new Error('network'); }
        c.calls.pushes++; c.calls.rows += rows.length;
        rows.forEach((r) => {
          assert.equal(r.user_id, undefined, 'user_id must not be sent');
          assert.equal(r.rev, undefined); assert.equal(r.dirty, undefined); assert.equal(r.updated_at, undefined);
          t(table).set(r.id, Object.assign(clone(r), { updated_at: c.stamp() }));
        });
        if (c.failAfterWrite) { c.failAfterWrite = false; throw new Error('connection dropped after the server saved'); }
        return rows.map((r) => ({ id: r.id, updated_at: t(table).get(r.id).updated_at }));
      }
    }
  };
  return c;
}

/** A phone: an in-memory version of js/db.js. */
function phone() {
  const tables = {};
  const t = (name) => (tables[name] = tables[name] || new Map());
  const p = {
    tables, meta: S.emptyMeta(),
    // What the app does when the user logs, edits or deletes something.
    write: (table, rec) => { const cur = t(table).get(rec.id) || {}; t(table).set(rec.id, S.touch(Object.assign({}, cur, rec))); },
    del: (table, id) => p.write(table, { id, deleted: true }),
    rec: (table, id) => t(table).get(id),
    visible: (table) => [...t(table).values()].filter((r) => !r.deleted),
    local: {
      pending: async (table) => [...t(table).values()].filter((r) => r.dirty).map(clone),
      get: async (table, id) => (t(table).has(id) ? clone(t(table).get(id)) : undefined),
      applyRemote: async (table, row) => { if (row.deleted) t(table).delete(row.id); else t(table).set(row.id, Object.assign(clone(row), { rev: 0, dirty: 0 })); },
      markSynced: async (table, id, rev, updatedAt) => {
        const r = t(table).get(id); if (!r) return;
        r.updated_at = updatedAt;
        if (r.rev === rev) r.dirty = 0;
      },
      remove: async (table, id) => { t(table).delete(id); }
    }
  };
  p.sync = (c) => S.run(p.meta, p.local, c.remote, [T]);
  return p;
}

const entry = (id, kcal) => ({ id, date: '2026-11-03', slot: 'breakfast', food_source: 'quick', name: 'Oats', kcal, logged_via: 'quick' });

test('an entry made offline reaches the cloud exactly once', async () => {
  const c = cloud(), a = phone();
  a.write(T, entry('e1', 300));
  assert.equal(await S.pendingCount(a.local, [T]), 1);
  assert.deepEqual(await a.sync(c), { pulled: 0, pushed: 1 });
  assert.equal(c.tables[T].size, 1);
  assert.equal(a.rec(T, 'e1').dirty, 0);
  assert.equal(await S.pendingCount(a.local, [T]), 0);
  // Syncing again sends nothing, and pulling our own row back changes nothing.
  assert.deepEqual(await a.sync(c), { pulled: 0, pushed: 0 });
  assert.equal(c.calls.rows, 1);
});

test('a replay after a dropped connection does not duplicate', async () => {
  const c = cloud(), a = phone();
  a.write(T, entry('e1', 300));
  c.failAfterWrite = true;                  // the server saved it, but the phone never heard back
  await assert.rejects(a.sync(c));
  assert.equal(a.rec(T, 'e1').dirty, 1);    // so it's still pending
  await a.sync(c);                          // and sent again
  assert.equal(c.tables[T].size, 1, 'same id → same row');
  assert.equal(a.rec(T, 'e1').dirty, 0);
});

test('a failed upload keeps the change for next time', async () => {
  const c = cloud(), a = phone();
  a.write(T, entry('e1', 300));
  c.failNextPush = true;
  await assert.rejects(a.sync(c), /network/);
  assert.equal(c.tables[T] ? c.tables[T].size : 0, 0);
  await a.sync(c);
  assert.equal(c.tables[T].size, 1);
});

test('another device receives entries, edits and deletes', async () => {
  const c = cloud(), a = phone(), b = phone();
  a.write(T, entry('e1', 300)); a.write(T, entry('e2', 150));
  await a.sync(c);
  assert.deepEqual((await b.sync(c)).pulled, 2);
  assert.deepEqual(b.visible(T).map((r) => r.id).sort(), ['e1', 'e2']);
  // Edit on A, delete on A
  a.write(T, { id: 'e1', kcal: 350 }); a.del(T, 'e2');
  await a.sync(c);
  assert.equal(c.tables[T].get('e2').deleted, true, 'a tombstone, not a hard delete');
  await b.sync(c);
  assert.equal(b.rec(T, 'e1').kcal, 350);
  assert.equal(b.rec(T, 'e2'), undefined);
});

test('when both devices change the same entry, the one that syncs last wins', async () => {
  const c = cloud(), a = phone(), b = phone();
  a.write(T, entry('e1', 300)); await a.sync(c); await b.sync(c);
  a.write(T, { id: 'e1', kcal: 400 });
  b.write(T, { id: 'e1', kcal: 500 });
  await a.sync(c);                          // cloud: 400
  await b.sync(c);                          // B's pull skips (B changed it too), then B pushes 500
  assert.equal(c.tables[T].get('e1').kcal, 500);
  await a.sync(c);
  assert.equal(a.rec(T, 'e1').kcal, 500);   // everyone ends on the same value
});

test('deleting something that never reached the cloud just forgets it', async () => {
  const c = cloud(), a = phone();
  a.write(T, entry('e1', 300)); a.del(T, 'e1');
  await a.sync(c);
  assert.equal(c.calls.pushes, 0);
  assert.equal(a.rec(T, 'e1'), undefined);
});

test('an edit made while the upload was in flight stays pending', async () => {
  const c = cloud(), a = phone();
  a.write(T, entry('e1', 300));
  const realPush = c.remote.push;
  c.remote.push = async (table, rows) => { a.write(T, { id: 'e1', kcal: 320 }); return realPush(table, rows); };
  await a.sync(c);
  c.remote.push = realPush;
  assert.equal(a.rec(T, 'e1').dirty, 1, 'the 320 edit still needs uploading');
  assert.ok(a.rec(T, 'e1').updated_at, 'but the phone knows the row exists in the cloud');
  await a.sync(c);
  assert.equal(c.tables[T].get('e1').kcal, 320);
  assert.equal(a.rec(T, 'e1').dirty, 0);
});

test('a delete during the first upload is still sent, so the row cannot come back', async () => {
  const c = cloud(), a = phone(), b = phone();
  a.write(T, entry('e1', 300));
  const realPush = c.remote.push;
  c.remote.push = async (table, rows) => { a.del(T, 'e1'); return realPush(table, rows); };
  await a.sync(c);
  c.remote.push = realPush;
  await a.sync(c);
  assert.equal(c.tables[T].get('e1').deleted, true);
  await b.sync(c);
  assert.equal(b.rec(T, 'e1'), undefined);
});

test('a wrong phone clock does not matter: only server times are compared', async () => {
  const c = cloud(), a = phone(), b = phone();
  // The phone thinks it's 2001; the data it writes carries no time the sync uses.
  a.write(T, Object.assign(entry('e1', 300), { created_at: '2001-01-01T00:00:00Z' }));
  await a.sync(c);
  await b.sync(c);
  assert.equal(b.rec(T, 'e1').kcal, 300);
  assert.ok(b.meta.lastPulled[T] > '2026-01-01');
});

test('a row committed late with an earlier timestamp is still pulled (overlap window)', async () => {
  const c = cloud(), b = phone();
  c.tables[T] = new Map([['e1', Object.assign(entry('e1', 300), { deleted: false, updated_at: c.stamp() })]]);
  await b.sync(c);
  // A row stamped 2 minutes before B's last pull, but only visible now (a slow transaction).
  c.tables[T].set('e2', Object.assign(entry('e2', 100), { deleted: false, updated_at: c.stamp(-120000) }));
  assert.ok(c.tables[T].get('e2').updated_at < b.meta.lastPulled[T]);
  await b.sync(c);
  assert.equal(b.rec(T, 'e2').kcal, 100);
});

test('touch and toRow', () => {
  const r = S.touch({ id: 'x', kcal: 1, rev: 2, dirty: 0 });
  assert.deepEqual([r.rev, r.dirty, r.deleted], [3, 1, false]);
  assert.deepEqual(S.toRow(Object.assign({ user_id: 'u', updated_at: 't' }, r)), { id: 'x', kcal: 1, deleted: false });
});

test('the synced table list matches the database', () => {
  const fs = require('fs'), path = require('path');
  const sql = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'schema.sql'), 'utf8');
  const list = /synced text\[\] := array\[([^\]]+)\]/.exec(sql)[1].match(/'(\w+)'/g).map((s) => s.slice(1, -1));
  assert.deepEqual(S.TABLES, list);
});
