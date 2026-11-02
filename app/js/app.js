/* Leanward — app shell (M0). Five tabs and the global + button as placeholders, plus an
 * "About this build" card that shows the version, the database connection and offline status.
 * Real screens arrive milestone by milestone (docs/development-plan.md).
 */
(function (root) {
  'use strict';

  var C = root.LW.config, E = root.LW.errors, cloud = root.LW.cloud;
  var doc = root.document;

  /* ---------- storage (namespaced: PR Forge shares this origin) ---------- */
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
  var state = { tab: store.get('tab', 'home'), sheet: false, ping: { ok: null, reason: 'Checking…' }, sw: 'Checking…' };

  var ICONS = {
    home: '<path d="M4 11l8-6 8 6v8a1 1 0 0 1-1 1h-4v-5h-6v5H5a1 1 0 0 1-1-1z" stroke-linejoin="round"/>',
    diary: '<rect x="5" y="4" width="14" height="16" rx="2"/><path d="M9 9h6M9 13h6M9 17h3" stroke-linecap="round"/>',
    progress: '<path d="M4 18l5-6 4 3 7-9" stroke-linecap="round" stroke-linejoin="round"/><path d="M4 21h16" stroke-linecap="round"/>',
    phase: '<circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor" stroke="none" opacity=".6"/>',
    profile: '<circle cx="12" cy="9" r="3.5"/><path d="M5 20c1.2-3.5 4-5 7-5s5.8 1.5 7 5" stroke-linecap="round"/>'
  };

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  /* ---------- views ---------- */
  function statusRow(label, ok, text) {
    var cls = ok === true ? 'ok' : ok === false ? 'bad' : 'wait';
    return '<div class="status"><span>' + label + '</span><span class="pill ' + cls + '">' + esc(text) + '</span></div>';
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
    if (id === 'profile') body += aboutCard() + '<section class="card"><a class="link" href="privacy.html">Privacy</a></section>';
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
  registerServiceWorker();
  checkConnection();
  reporter.flush();
})(this);
