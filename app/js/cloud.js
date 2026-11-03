/* Leanward — Supabase connection.
 * M0 only checks the connection (reads the lw_ping test row) and sends error reports.
 * Sign-in arrives in M3 and sync in M2 (docs/development-plan.md).
 */
(function (root) {
  'use strict';

  var C = root.LW.config;
  var client = null;
  var PING_TIMEOUT_MS = 8000;

  function getClient() {
    if (client) return client;
    if (!root.supabase || !root.supabase.createClient) return null;
    // persistSession stays on (the default). Leanward has its own origin and its own Supabase
    // project, so its session is separate from PR Forge's.
    client = root.supabase.createClient(C.SUPABASE_URL, C.SUPABASE_KEY);
    return client;
  }

  /** Resolves { ok: true, message } or { ok: false, reason }. Never rejects. */
  function ping() {
    var c = getClient();
    if (!c) return Promise.resolve({ ok: false, reason: 'The Supabase library did not load.' });
    if (root.navigator && root.navigator.onLine === false) return Promise.resolve({ ok: false, reason: 'You are offline.' });
    var timeout = new Promise(function (resolve) { setTimeout(function () { resolve({ timedOut: true }); }, PING_TIMEOUT_MS); });
    return Promise.race([c.from('lw_ping').select('message').eq('id', 1).maybeSingle(), timeout]).then(function (res) {
      if (res.timedOut) return { ok: false, reason: 'Supabase did not answer within ' + PING_TIMEOUT_MS / 1000 + ' seconds. Check your connection and try again.' };
      if (res.error) {
        var missing = res.error.code === '42P01' || res.error.code === 'PGRST205' || /does not exist|schema cache/i.test(res.error.message || '');
        var network = /failed to fetch|network|load failed/i.test(res.error.message || '');
        return { ok: false, reason: missing ? 'Reached Supabase, but the Leanward tables are not set up yet. Run supabase/schema.sql.' : network ? 'Could not reach Supabase. Check your connection and try again.' : (res.error.message || 'Request failed.') };
      }
      return res.data ? { ok: true, message: res.data.message } : { ok: false, reason: 'Reached Supabase, but the test row is missing. Run supabase/schema.sql again.' };
    }, function (err) {
      return { ok: false, reason: (err && err.message) || 'Could not reach Supabase.' };
    });
  }

  /** Inserts one error report. Rejects on failure so the reporter can queue it. */
  function sendError(row) {
    var c = getClient();
    if (!c) return Promise.reject(new Error('No client'));
    return c.from('lw_errors').insert(row).then(function (res) {
      if (res.error) throw new Error(res.error.message);
      return true;
    });
  }

  root.LW.cloud = { ping: ping, sendError: sendError };
})(this);
