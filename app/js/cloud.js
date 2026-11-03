/* Leanward — Supabase connection: Google sign-in, the connection check (lw_ping) and error reports.
 * Sign-in works like PR Forge's: Supabase handles Google, with the PKCE flow and a redirect back here.
 * Email/password sign-in arrives in M3 and sync in M2 (docs/development-plan.md).
 */
(function (root) {
  'use strict';

  var C = root.LW.config;
  var client = null;
  var PING_TIMEOUT_MS = 8000;

  function getClient() {
    if (client) return client;
    if (!root.supabase || !root.supabase.createClient) return null;
    // Leanward has its own origin and its own Supabase project, so its session is separate from
    // PR Forge's. The session is stored under the Leanward prefix like every other key.
    client = root.supabase.createClient(C.SUPABASE_URL, C.SUPABASE_KEY, {
      auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: C.STORAGE_PREFIX + 'auth' }
    });
    return client;
  }

  /* ---------- sign-in ---------- */
  function accountOf(s) {
    var u = s && s.user;
    if (!u) return null;
    var m = u.user_metadata || {};
    return { id: u.id, email: u.email || '', name: m.full_name || m.name || '' };
  }

  var auth = {
    /** Calls onChange(account or null, event) whenever the sign-in changes, and once at start. */
    init: function (onChange) {
      var c = getClient();
      if (!c) { onChange(null, 'UNAVAILABLE'); return; }
      c.auth.onAuthStateChange(function (event, s) {
        // Supabase asks that no other Supabase calls run inside this callback.
        setTimeout(function () { onChange(accountOf(s), event); }, 0);
      });
    },
    /** True while Google has just sent the user back and the sign-in is being finished. */
    returning: function () { return /[?&]code=/.test(root.location.search); },
    /** The reason Google or Supabase gave if a sign-in failed, else ''. */
    error: function () {
      var m = /[?&#]error_description=([^&#]*)/.exec(root.location.search + root.location.hash);
      return m ? decodeURIComponent(m[1].replace(/\+/g, ' ')) : '';
    },
    /** Removes ?code= / error details from the address once they've been used. */
    cleanUrl: function () {
      if (/[?&](code|error)=/.test(root.location.search) || /error=/.test(root.location.hash)) {
        try { root.history.replaceState(null, '', root.location.pathname); } catch (e) { /* ignore */ }
      }
    },
    signIn: function () {
      var c = getClient();
      if (!c) return Promise.reject(new Error('Sign-in could not load. Check your connection and reload.'));
      return c.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: root.location.origin + root.location.pathname }
      }).then(function (res) { if (res.error) throw res.error; });
    },
    /** Signs out on this phone only. */
    signOut: function () {
      var c = getClient();
      return c ? c.auth.signOut({ scope: 'local' }).then(function () {}, function () {}) : Promise.resolve();
    }
  };

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

  root.LW.cloud = { ping: ping, sendError: sendError, auth: auth };
})(this);
