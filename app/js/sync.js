/* Leanward — sync rules (no network or storage code here: the caller supplies `local` and `remote`).
 *
 * The same rules as PR Forge (js/sync.js there), per table:
 *  - The phone's copy is the working copy, so logging never waits for the internet.
 *  - Every item has an id made on the phone, so uploading it twice never duplicates it.
 *  - The server stamps updated_at, so a phone with a wrong clock can't confuse syncing.
 *  - Deleting marks the item deleted (a "tombstone") so the deletion reaches other devices.
 *  - If an item changed here and in the cloud, this phone's version wins (it's pushed after the pull),
 *    so the device that syncs last wins: last-write-wins per item (PRD §10 Offline).
 * Leanward adds: many tables, a "changed since" pull per table, and a short overlap on each pull so a
 * row stamped just before the last pull but committed after it is never missed (merging is idempotent).
 *
 * local (async):  pending(table) → records with dirty = 1
 *                 get(table, id) → record or undefined
 *                 applyRemote(table, row) → store a cloud row as clean (or remove it if row.deleted)
 *                 markSynced(table, id, rev, updatedAt) → always record updatedAt (the item now exists in
 *                   the cloud); clear dirty only if the record is still at `rev`, i.e. it wasn't changed
 *                   again while the upload was in flight
 *                 remove(table, id)
 * remote (async): pull(table, sinceIso | null) → rows ordered by updated_at
 *                 push(table, rows) → [{ id, updated_at }]
 * Local records are the table's columns plus `rev` (a counter bumped on every local change) and
 * `dirty` (1 until the change reaches the cloud). user_id is never sent: the server sets it.
 */
(function (root) {
  'use strict';

  var TABLES = ['lw_profiles', 'lw_goals', 'lw_phases', 'lw_target_sets', 'lw_custom_foods', 'lw_saved_meals',
    'lw_diary_entries', 'lw_weights', 'lw_measurements', 'lw_body_fat', 'lw_lifts', 'lw_recommendations', 'lw_food_reports'];
  var OVERLAP_MS = 5 * 60 * 1000;
  var LOCAL_ONLY = ['rev', 'dirty', 'user_id', 'updated_at'];

  function emptyMeta() { return { lastPulled: {}, lastSyncAt: null }; }

  /** A local change: bumps rev and marks the record for upload. Returns a new object. */
  function touch(record) {
    var r = {}; Object.keys(record).forEach(function (k) { r[k] = record[k]; });
    r.rev = (record.rev || 0) + 1;
    r.dirty = 1;
    if (r.deleted == null) r.deleted = false;
    return r;
  }

  /** The row sent to the server: the table's columns only. */
  function toRow(record) {
    var row = {};
    Object.keys(record).forEach(function (k) { if (LOCAL_ONLY.indexOf(k) < 0) row[k] = record[k]; });
    return row;
  }

  function sinceFor(meta, table) {
    var last = meta.lastPulled[table];
    if (!last) return null;
    return new Date(Date.parse(last) - OVERLAP_MS).toISOString();
  }

  /** Pull one table and merge it. Resolves to the number of local records changed. */
  function pullTable(table, meta, local, remote) {
    return remote.pull(table, sinceFor(meta, table)).then(function (rows) {
      var changed = 0;
      return (rows || []).reduce(function (p, row) {
        return p.then(function () {
          return local.get(table, String(row.id)).then(function (mine) {
            if (row.updated_at && (!meta.lastPulled[table] || row.updated_at > meta.lastPulled[table])) meta.lastPulled[table] = row.updated_at;
            if (mine && mine.dirty) return;                       // changed here too: this phone wins
            if (mine && mine.updated_at === row.updated_at && !!mine.deleted === !!row.deleted) return;   // already have it
            if (!mine && row.deleted) return;                     // never had it, nothing to delete
            changed++;
            return local.applyRemote(table, row);
          });
        });
      }, Promise.resolve()).then(function () { return changed; });
    });
  }

  /** Push one table's local changes. Resolves to the number of rows sent. */
  function pushTable(table, local, remote) {
    return local.pending(table).then(function (recs) {
      // A delete of something that never reached the cloud: just forget it.
      var drop = recs.filter(function (r) { return r.deleted && !r.updated_at; });
      var send = recs.filter(function (r) { return !(r.deleted && !r.updated_at); });
      return Promise.all(drop.map(function (r) { return local.remove(table, r.id); })).then(function () {
        if (!send.length) return 0;
        var revs = {}; send.forEach(function (r) { revs[r.id] = r.rev; });
        return remote.push(table, send.map(toRow)).then(function (res) {
          return Promise.all((res || []).map(function (x) { return local.markSynced(table, String(x.id), revs[x.id], x.updated_at); }));
        }).then(function () { return send.length; });
      });
    });
  }

  /**
   * One sync run over every table: pull and merge, then push. Resolves to { pulled, pushed }.
   * On failure the error carries `pulled` so the caller can refresh what already merged.
   */
  function run(meta, local, remote, tables) {
    tables = tables || TABLES;
    var pulled = 0, pushed = 0;
    return tables.reduce(function (p, t) {
      return p.then(function () { return pullTable(t, meta, local, remote); }).then(function (n) { pulled += n; });
    }, Promise.resolve()).then(function () {
      return tables.reduce(function (p, t) {
        return p.then(function () { return pushTable(t, local, remote); }).then(function (n) { pushed += n; });
      }, Promise.resolve());
    }).then(function () {
      return { pulled: pulled, pushed: pushed };
    }, function (err) {
      if (err && typeof err === 'object') err.pulled = pulled;
      throw err;
    });
  }

  /** How many local changes haven't reached the cloud yet. */
  function pendingCount(local, tables) {
    return Promise.all((tables || TABLES).map(function (t) { return local.pending(t); }))
      .then(function (lists) { return lists.reduce(function (n, l) { return n + l.length; }, 0); });
  }

  var api = { TABLES: TABLES, OVERLAP_MS: OVERLAP_MS, emptyMeta: emptyMeta, touch: touch, toRow: toRow, pullTable: pullTable, pushTable: pushTable, run: run, pendingCount: pendingCount };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else { root.LW = root.LW || {}; root.LW.sync = api; }
})(this);
