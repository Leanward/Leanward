/* Leanward — the phone's copy of the user's data, in IndexedDB (M2).
 *
 * IndexedDB, not localStorage: a food diary with nutrient snapshots outgrows localStorage's few MB.
 * One database per signed-in person ("leanward-v1-<user id>"), so two accounts on one phone never mix.
 * One object store per synced table (keyed by id, indexed by dirty) plus a "meta" store for sync state.
 * The methods under `local` are the interface js/sync.js expects.
 */
(function (root) {
  'use strict';

  var SY = root.LW.sync;
  var PREFIX = root.LW.config.CACHE_PREFIX + 'v1-';   // "leanward-v1-"
  var VERSION = 1;

  function req(r) { return new Promise(function (resolve, reject) { r.onsuccess = function () { resolve(r.result); }; r.onerror = function () { reject(r.error); }; }); }

  function open(userId, idb) {
    idb = idb || root.indexedDB;
    if (!idb) return Promise.reject(new Error('This browser has no IndexedDB, so Leanward can\'t keep data on the phone.'));
    var r = idb.open(PREFIX + userId, VERSION);
    r.onupgradeneeded = function () {
      var d = r.result;
      SY.TABLES.forEach(function (t) {
        if (!d.objectStoreNames.contains(t)) d.createObjectStore(t, { keyPath: 'id' }).createIndex('dirty', 'dirty');
      });
      if (!d.objectStoreNames.contains('meta')) d.createObjectStore('meta', { keyPath: 'key' });
    };
    return req(r).then(function (d) { return wrap(d, userId); });
  }

  function wrap(d, userId) {
    /** Runs fn(store) in one transaction; resolves with the result of the request fn returns, once committed. */
    function tx(store, mode, fn) {
      return new Promise(function (resolve, reject) {
        var t = d.transaction(store, mode), r;
        t.oncomplete = function () { resolve(r ? r.result : undefined); };
        t.onerror = function () { reject(t.error); };
        t.onabort = function () { reject(t.error || new Error('Saving on the phone was cancelled.')); };
        r = fn(t.objectStore(store)) || null;
      });
    }
    function getOne(table, id) { return tx(table, 'readonly', function (s) { return s.get(id); }); }

    var db = {
      userId: userId,
      /** Save a new or changed record (marks it for upload). */
      put: function (table, rec) {
        return getOne(table, rec.id).then(function (cur) {
          var next = SY.touch(Object.assign({}, cur || {}, rec));
          return tx(table, 'readwrite', function (s) { s.put(next); }).then(function () { return next; });
        });
      },
      /** Delete: keeps a tombstone until the cloud has it. */
      remove: function (table, id) { return db.put(table, { id: id, deleted: true }); },
      get: function (table, id) { return getOne(table, id).then(function (r) { return r && !r.deleted ? r : undefined; }); },
      /** Every record that isn't deleted. */
      all: function (table) {
        return tx(table, 'readonly', function (s) { return s.getAll(); }).then(function (list) { return list.filter(function (x) { return !x.deleted; }); });
      },
      getMeta: function (key, fallback) { return getOne('meta', key).then(function (r) { return r ? r.value : fallback; }); },
      setMeta: function (key, value) { return tx('meta', 'readwrite', function (s) { s.put({ key: key, value: value }); }); },
      close: function () { d.close(); },

      local: {
        pending: function (table) { return tx(table, 'readonly', function (s) { return s.index('dirty').getAll(1); }); },
        get: getOne,
        applyRemote: function (table, row) {
          return tx(table, 'readwrite', function (s) {
            if (row.deleted) { s.delete(row.id); return; }
            var rec = Object.assign({}, row, { rev: 0, dirty: 0 });
            delete rec.user_id;
            s.put(rec);
          });
        },
        markSynced: function (table, id, rev, updatedAt) {
          return tx(table, 'readwrite', function (s) {
            var r = s.get(id);
            r.onsuccess = function () {
              var rec = r.result;
              if (!rec) return;
              rec.updated_at = updatedAt;
              if (rec.rev === rev) rec.dirty = 0;
              s.put(rec);
            };
          });
        },
        remove: function (table, id) { return tx(table, 'readwrite', function (s) { s.delete(id); }); }
      }
    };
    return db;
  }

  /** Deletes one person's copy from this phone (sign-out). The cloud copy stays. */
  function destroy(userId, idb) {
    idb = idb || root.indexedDB;
    return idb ? req(idb.deleteDatabase(PREFIX + userId)).then(function () {}, function () {}) : Promise.resolve();
  }

  root.LW.db = { PREFIX: PREFIX, open: open, destroy: destroy };
})(this);
