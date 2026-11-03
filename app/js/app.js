/* Leanward — app shell. Google sign-in first (required, ONB-1), then five tabs and the global +
 * button as placeholders, plus an "About this build" card that shows the version, the database
 * connection and offline status.
 * Real screens arrive milestone by milestone (docs/development-plan.md).
 */
(function (root) {
  'use strict';

  var C = root.LW.config, E = root.LW.errors, cloud = root.LW.cloud;
  var doc = root.document;

  /* ---------- storage (every key namespaced with STORAGE_PREFIX) ---------- */
  var store = {
    get: function (k, fallback) { try { var v = root.localStorage.getItem(C.STORAGE_PREFIX + k); return v === null ? fallback : JSON.parse(v); } catch (e) { return fallback; } },
    set: function (k, v) { try { root.localStorage.setItem(C.STORAGE_PREFIX + k, JSON.stringify(v)); } catch (e) { /* storage blocked */ } }
  };

  /* ---------- error reporting ---------- */
  var reporter = E.Reporter({
    send: cloud.sendError,
    storage: { get: function () { return store.get('error-queue', []); }, set: function (v) { store.set('error-queue', v); } },
    env: { version: C.VERSION, userAgent: root.navigator && root.navigator.userAgent }
  });
  E.install(root, reporter);

  /* ---------- state ---------- */
  var TABS = [
    ['home', 'Home', 'M5–M7', 'Calories left, protein, carbs and fat, your phase card and one tip.'],
    ['diary', 'Diary', 'M5', 'Your day by meal, the full nutrient review and copying meals.'],
    ['progress', 'Progress', 'M6', 'Weight trend, waist, key lifts from PR Forge and the charts.'],
    ['phase', 'Phase', 'M3, M6', 'Your current phase, targets with the working, and whether it is working.'],
    ['profile', 'Profile', 'M7', 'Settings, appearance, export and account.']
  ];
  // account: who signed in on this phone, kept locally so the app still opens offline.
  var state = { tab: store.get('tab', 'home'), sheet: false, ping: { ok: null, reason: 'Checking…' }, sw: 'Checking…',
    account: store.get('account', null), signingIn: false, sync: { state: 'idle', pending: 0 } };
  var data = null, syncer = null;   // the signed-in person's phone copy (js/db.js) and its sync

  var ICONS = {
    home: '<path d="M4 11l8-6 8 6v8a1 1 0 0 1-1 1h-4v-5h-6v5H5a1 1 0 0 1-1-1z" stroke-linejoin="round"/>',
    diary: '<rect x="5" y="4" width="14" height="16" rx="2"/><path d="M9 9h6M9 13h6M9 17h3" stroke-linecap="round"/>',
    progress: '<path d="M4 18l5-6 4 3 7-9" stroke-linecap="round" stroke-linejoin="round"/><path d="M4 21h16" stroke-linecap="round"/>',
    phase: '<circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor" stroke="none" opacity=".6"/>',
    profile: '<circle cx="12" cy="9" r="3.5"/><path d="M5 20c1.2-3.5 4-5 7-5s5.8 1.5 7 5" stroke-linecap="round"/>'
  };

  // Google's "G" logo, as Google's sign-in branding guidelines ask for on the button.
  var GOOGLE = '<svg class="g" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.6 13.2l7.9 6.2C12.4 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.4 5.7c4.3-4 6.9-9.9 6.9-17.1z"/><path fill="#FBBC05" d="M10.5 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.9-6.2C.9 16.5 0 20.1 0 24s.9 7.5 2.6 10.8l7.9-6.2z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.7c-2.1 1.4-4.8 2.3-8.5 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.2C6.6 42.6 14.6 48 24 48z"/></svg>';

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  /* ---------- views ---------- */
  function statusRow(label, ok, text) {
    var cls = ok === true ? 'ok' : ok === false ? 'bad' : 'wait';
    return '<div class="status"><span>' + label + '</span><span class="pill ' + cls + '">' + esc(text) + '</span></div>';
  }

  function signInView() {
    var err = cloud.auth.error();
    var busy = (cloud.auth.returning() && !err) || state.signingIn;
    var online = root.navigator.onLine !== false;
    return '<main class="view signin">' +
      '<div class="brand"><picture><source srcset="icons/mark-light.svg" media="(prefers-color-scheme: light)"><img src="icons/mark.svg" alt="" width="84" height="87"></picture><h1>Leanward</h1>' +
      '<p class="muted">Calories and macros, guided by the phase you\'re in.</p></div>' +
      '<section class="card">' +
        '<h2>' + (busy ? 'Signing you in…' : 'Sign in to get started') + '</h2>' +
        '<p class="small muted">Your account keeps your diary, phases and progress safe, and brings them back on a new phone. Only you can see your data.</p>' +
        (err ? '<p class="small warn">Sign-in didn\'t work: ' + esc(err) + '. Try again.</p>' : '') +
        (online ? '' : '<p class="small warn">You\'re offline. Signing in needs a connection the first time; after that the app opens without one.</p>') +
        '<button type="button" class="btn block google" data-a="signin"' + (busy ? ' disabled' : '') + '>' + GOOGLE + 'Continue with Google</button>' +
        '<p class="small muted center">Email sign-in is coming soon. For adults 18 and over.</p>' +
      '</section>' +
      '<p class="small center"><a class="link" href="privacy.html">Privacy</a></p>' +
    '</main>';
  }

  function accountCard() {
    var a = state.account;
    return '<section class="card" aria-labelledby="acct-h"><h2 id="acct-h">Account</h2>' +
      '<p class="small muted">Signed in with Google as <b>' + esc(a.email || a.name || 'your Google account') + '</b>.</p>' +
      '<div class="actions"><button type="button" class="btn ghost" data-a="signout">Sign out</button></div></section>';
  }

  function syncRow() {
    var s = state.sync, waiting = s.pending ? ' · ' + s.pending + ' waiting' : '';
    var map = { idle: [null, 'Starting…'], syncing: [null, 'Syncing…'], synced: [true, 'Up to date' + waiting], offline: [null, 'Offline' + waiting], signin: [false, 'Sign in again'], error: [false, 'Problem' + waiting] };
    var m = map[s.state] || map.idle;
    return statusRow('Backup', m[0], m[1]) + (s.message && (s.state === 'error' || s.state === 'signin') ? '<p class="small muted">' + esc(s.message) + '</p>' : '');
  }

  function aboutCard() {
    var online = root.navigator.onLine !== false;
    return '<section class="card" aria-labelledby="about-h">' +
      '<h2 id="about-h">About this build</h2>' +
      statusRow('Version', true, C.VERSION) +
      statusRow('Network', online, online ? 'Online' : 'Offline') +
      statusRow('Database', state.ping.ok, state.ping.ok ? state.ping.message : state.ping.ok === false ? 'Not connected' : 'Checking…') +
      (state.ping.ok === false ? '<p class="small muted">' + esc(state.ping.reason) + '</p>' : '') +
      statusRow('Works offline', state.sw === 'Ready', state.sw) +
      syncRow() +
      '<div class="actions"><button type="button" class="btn ghost" data-a="recheck">Check again</button>' +
      '<button type="button" class="btn ghost" data-a="testerror">Send a test error</button></div>' +
      '<p class="small muted">The test error goes to Leanward\'s own error table. It holds only technical details, never food or body data.</p>' +
      '</section>';
  }

  function tabView(id) {
    var t = TABS.filter(function (x) { return x[0] === id; })[0];
    var body = '<header class="top"><h1>' + esc(id === 'home' ? 'Today' : t[1]) + '</h1></header>' +
      '<section class="card"><span class="chip"><i></i>Coming in ' + esc(t[2]) + '</span><p>' + esc(t[3]) + '</p></section>';
    if (id === 'home') body += '<section class="card"><h2>Leanward is being built</h2><p class="muted">This is the foundation (M0): the app installs, opens offline and talks to its database. Try the clickable prototype to see the finished flows.</p><a class="btn" href="prototype/">Open the prototype</a></section>';
    if (id === 'profile') body += accountCard() + aboutCard() + '<section class="card"><a class="link" href="privacy.html">Privacy</a></section>';
    return body;
  }

  function sheet() {
    if (!state.sheet) return '';
    return '<div class="scrim" data-a="close"></div><div class="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-h">' +
      '<div class="grab"></div><h2 id="sheet-h">Add</h2><p class="muted">Logging food, weigh-ins and measurements arrives in M5 and M6.</p>' +
      '<button type="button" class="btn" data-a="close">Close</button></div>';
  }

  function render() {
    var app = doc.getElementById('app');
    if (!state.account) { app.innerHTML = signInView(); return; }
    app.innerHTML = '<main class="view" id="view">' + tabView(state.tab) + '</main>' +
      '<button type="button" class="plus" data-a="add" aria-label="Add">+</button>' +
      '<nav class="tabs" aria-label="Main">' + TABS.map(function (t) {
        return '<button type="button" data-a="tab" data-v="' + t[0] + '"' + (state.tab === t[0] ? ' aria-current="page"' : '') + '><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">' + ICONS[t[0]] + '</svg>' + t[1] + '</button>';
      }).join('') + '</nav>' + sheet();
  }

  /* ---------- actions ---------- */
  var actions = {
    tab: function (v) { state.tab = v; store.set('tab', v); render(); },
    add: function () { state.sheet = true; render(); },
    close: function () { state.sheet = false; render(); },
    signin: function () {
      state.signingIn = true; render();
      cloud.auth.signIn().catch(function (e) {
        state.signingIn = false; render();
        toast((e && e.message) || 'Sign-in didn\'t start. Try again.');
      });
    },
    signout: function () {
      var n = state.sync.pending;
      var msg = n ? n + ' change' + (n === 1 ? ' hasn\'t' : 's haven\'t') + ' reached your account yet and will be lost if you sign out now. Sign out anyway?'
        : 'Sign out of Leanward on this phone? Your data stays in your account.';
      if (!root.confirm(msg)) return;
      var id = state.account && state.account.id;
      stopData();
      cloud.auth.signOut().then(function () { return id ? root.LW.db.destroy(id) : null; }).then(function () { setAccount(null); state.tab = 'home'; store.set('tab', 'home'); render(); });
    },
    recheck: function () { state.ping = { ok: null, reason: 'Checking…' }; render(); checkConnection(); },
    testerror: function () {
      reporter.report({ message: 'Test error from About this build (' + new Date().toISOString() + ')', source: root.location.href, line: 1, col: 1 })
        .then(function (sent) { toast(sent ? 'Test error sent' : 'Saved to send when the database is reachable'); });
    }
  };
  doc.addEventListener('click', function (e) {
    var el = e.target.closest('[data-a]');
    if (el && actions[el.dataset.a]) { e.preventDefault(); actions[el.dataset.a](el.dataset.v); }
  });
  doc.addEventListener('keydown', function (e) { if (e.key === 'Escape' && state.sheet) actions.close(); });

  function toast(msg) {
    var t = doc.getElementById('toast');
    t.textContent = msg; t.hidden = false;
    clearTimeout(toast.timer); toast.timer = setTimeout(function () { t.hidden = true; }, 2600);
  }

  /* ---------- sign-in ---------- */
  function setAccount(a) { state.account = a; store.set('account', a); if (a) startData(a); }

  /* ---------- the phone copy and its backup (M2) ---------- */
  function startData(a) {
    if (data && data.userId === a.id) return;
    stopData();
    root.LW.db.open(a.id).then(function (d) {
      data = d;
      syncer = cloud.Syncer(d, function (st) { state.sync = Object.assign({}, st); render(); });
      syncer.now();
    }, function (e) { state.sync = { state: 'error', pending: 0, message: e && e.message }; render(); });
  }
  function stopData() {
    if (syncer) syncer.stop();
    if (data) data.close();
    syncer = null; data = null;
    state.sync = { state: 'idle', pending: 0 };
  }

  cloud.auth.init(function (account, event) {
    if (account) {
      var changed = !state.account || state.account.id !== account.id || state.account.email !== account.email;
      setAccount(account);
      cloud.auth.cleanUrl();
      if (changed) { state.signingIn = false; render(); }
    } else if (event === 'SIGNED_OUT') {
      setAccount(null); render();
    } else if (event === 'INITIAL_SESSION' && (cloud.auth.returning() || cloud.auth.error())) {
      // Back from Google, but the sign-in couldn't be finished (or Google sent an error).
      var why = cloud.auth.error();
      cloud.auth.cleanUrl(); state.signingIn = false; render();
      toast(why ? 'Sign-in didn\'t work: ' + why : 'Sign-in didn\'t finish. Try again.');
    }
    // A missing session at start-up while offline (e.g. an expired token) keeps the saved account,
    // so the app still opens; Supabase refreshes the session once the phone is back online.
  });

  /* ---------- connection + offline ---------- */
  function checkConnection() {
    cloud.ping().then(function (r) { state.ping = r; render(); if (r.ok) reporter.flush(); });
  }
  root.addEventListener('online', function () { render(); checkConnection(); });
  root.addEventListener('offline', render);

  function registerServiceWorker() {
    var local = /^(localhost|127\.0\.0\.1)$/.test(root.location.hostname);
    if (!('serviceWorker' in root.navigator)) { state.sw = 'Not supported here'; return; }
    // Off on localhost so a refresh always shows your latest edits; add ?sw=1 to test offline locally.
    if (local && !/[?&]sw=1/.test(root.location.search)) { state.sw = 'Off on localhost'; return; }
    root.navigator.serviceWorker.register('sw.js').then(function () { return root.navigator.serviceWorker.ready; })
      .then(function () { state.sw = 'Ready'; render(); }, function () { state.sw = 'Could not start'; render(); });
  }

  render();
  if (state.account) startData(state.account);
  registerServiceWorker();
  checkConnection();
  reporter.flush();
})(this);
