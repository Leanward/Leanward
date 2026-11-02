/* Leanward — error reports (PRD §15 Q13, decided: Leanward's own Supabase table, no third party).
 *
 * A report holds only technical facts: a masked message, the file, line and column, the stack
 * frames, the app version and the browser. Quoted text and numbers in messages are masked, so food
 * names, weights or measurements can't ride along inside an error string. App state is never sent.
 *
 * The pure helpers (scrub*, buildReport, Reporter) run in Node for tests; install() is browser-only.
 */
(function (root) {
  'use strict';

  var MAX_MESSAGE = 500;
  var MAX_STACK = 4000;
  var MAX_FRAMES = 15;
  var MAX_PER_SESSION = 10;
  var MAX_QUEUED = 20;

  /** Masks quoted text and numbers, then trims. "Can't read 'Greek yogurt' 245" → "Can't read "…" #". */
  function scrubMessage(text) {
    var s = String(text == null ? '' : text);
    s = s.replace(/"[^"]*"|'[^'\s][^']*'|`[^`]*`/g, '"…"');
    s = s.replace(/\d+(?:[.,]\d+)?/g, '#');
    return s.slice(0, MAX_MESSAGE);
  }

  /** Drops query strings and fragments from a URL so nothing typed into the address bar is sent. */
  function scrubUrl(url) {
    if (!url) return null;
    return String(url).split(/[?#]/)[0].slice(0, 300);
  }

  /** Keeps only stack frame lines (they hold file:line:col), never the message line at the top. */
  function scrubStack(stack) {
    if (!stack) return null;
    var frames = String(stack).split('\n')
      .map(function (l) { return l.trim(); })
      .filter(function (l) { return /:\d+:\d+\)?$/.test(l); })
      .slice(0, MAX_FRAMES)
      .map(function (l) { return l.replace(/\?[^:)]*(?=:\d+:\d+)/g, ''); });
    return frames.length ? frames.join('\n').slice(0, MAX_STACK) : null;
  }

  function toInt(v) { var n = parseInt(v, 10); return isFinite(n) ? n : null; }

  /** Builds one row for the lw_errors table. */
  function buildReport(info, env) {
    info = info || {}; env = env || {};
    return {
      app_version: String(env.version || 'unknown').slice(0, 20),
      message: scrubMessage(info.message) || 'Unknown error',
      source: scrubUrl(info.source),
      line: toInt(info.line),
      col: toInt(info.col),
      stack: scrubStack(info.stack),
      user_agent: env.userAgent ? String(env.userAgent).slice(0, 300) : null
    };
  }

  /**
   * Sends reports, at most MAX_PER_SESSION per session and each distinct error once. Reports that
   * can't be sent (offline, server down) wait in a small queue and go out on the next flush().
   * storage: { get(): array, set(array) }. send(row): Promise.
   */
  function Reporter(opts) {
    var seen = {};
    var sent = 0;
    var storage = opts.storage;
    var send = opts.send;
    var env = opts.env || {};

    function queue() { try { return storage.get() || []; } catch (e) { return []; } }
    function save(list) { try { storage.set(list.slice(-MAX_QUEUED)); } catch (e) { /* storage full or blocked */ } }

    function report(info) {
      var row = buildReport(info, env);
      var key = row.message + '|' + row.source + '|' + row.line;
      if (seen[key] || sent >= MAX_PER_SESSION) return Promise.resolve(false);
      seen[key] = true;
      sent++;
      return send(row).then(function () { return true; }, function () {
        var q = queue(); q.push(row); save(q);
        return false;
      });
    }

    function flush() {
      var q = queue();
      if (!q.length) return Promise.resolve(0);
      save([]);
      var failed = [];
      return q.reduce(function (p, row) {
        return p.then(function () { return send(row).catch(function () { failed.push(row); }); });
      }, Promise.resolve()).then(function () {
        if (failed.length) save(queue().concat(failed));
        return q.length - failed.length;
      });
    }

    return { report: report, flush: flush };
  }

  /** Browser only: catches uncaught errors and rejected promises. */
  function install(win, reporter) {
    win.addEventListener('error', function (ev) {
      if (!ev || (ev.target && ev.target !== win)) return; // resource load errors (images, fonts) are not code errors
      reporter.report({ message: ev.message, source: ev.filename, line: ev.lineno, col: ev.colno, stack: ev.error && ev.error.stack });
    });
    win.addEventListener('unhandledrejection', function (ev) {
      var r = ev && ev.reason;
      reporter.report({ message: r && r.message ? r.message : 'Unhandled promise rejection', stack: r && r.stack });
    });
    win.addEventListener('online', function () { reporter.flush(); });
  }

  var api = { scrubMessage: scrubMessage, scrubUrl: scrubUrl, scrubStack: scrubStack, buildReport: buildReport, Reporter: Reporter, install: install, MAX_PER_SESSION: MAX_PER_SESSION };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else { root.LW = root.LW || {}; root.LW.errors = api; }
})(this);
