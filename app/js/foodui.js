/* Leanward — M4b screens: Find a food (LOG-3), food detail (NUT-5, FDB-1/3/5) and barcode scanning
 * (LOG-4). Opened from the global + button. Logging a food arrives in M5; until then the detail
 * shows the food and lets you report a problem with it.
 * Barcode scanning uses ZXing (js/vendor/zxing.min.js, Apache-2.0), loaded the first time you scan.
 */
(function (root) {
  'use strict';

  var FD = root.LW.foods, fmt = root.LW.calc.core.fmt, doc = root.document;

  // Labels and units for the nutrients a food can carry (per 100 g).
  var NUTRIENTS = [
    ['fiber', 'Fiber', 'g'], ['sugar', 'Sugars', 'g'], ['addedSugar', 'Added sugars', 'g'], ['satFat', 'Saturated fat', 'g'],
    ['monoFat', 'Monounsaturated fat', 'g'], ['polyFat', 'Polyunsaturated fat', 'g'], ['transFat', 'Trans fat', 'g'], ['cholesterol', 'Cholesterol', 'mg'],
    ['sodium', 'Sodium', 'mg'], ['potassium', 'Potassium', 'mg'], ['calcium', 'Calcium', 'mg'], ['magnesium', 'Magnesium', 'mg'],
    ['phosphorus', 'Phosphorus', 'mg'], ['iron', 'Iron', 'mg'], ['zinc', 'Zinc', 'mg'], ['copper', 'Copper', 'mg'], ['selenium', 'Selenium', 'µg'],
    ['vitaminA', 'Vitamin A', 'µg RAE'], ['vitaminC', 'Vitamin C', 'mg'], ['vitaminD', 'Vitamin D', 'µg'], ['vitaminE', 'Vitamin E', 'mg'],
    ['vitaminK', 'Vitamin K', 'µg'], ['thiamin', 'Thiamin (B1)', 'mg'], ['riboflavin', 'Riboflavin (B2)', 'mg'], ['niacin', 'Niacin (B3)', 'mg'],
    ['vitaminB6', 'Vitamin B6', 'mg'], ['vitaminB12', 'Vitamin B12', 'µg'], ['folate', 'Folate', 'µg DFE'], ['choline', 'Choline', 'mg'],
    ['ala', 'Omega-3 ALA', 'g'], ['epa', 'Omega-3 EPA', 'g'], ['dha', 'Omega-3 DHA', 'g'], ['alcohol', 'Alcohol', 'g'], ['caffeine', 'Caffeine', 'mg'], ['water', 'Water', 'g']
  ];
  var ISSUES = [['wrong-nutrients', 'Wrong nutrients'], ['wrong-serving', 'Wrong serving size'], ['wrong-name', 'Wrong name or brand'], ['duplicate', 'Duplicate'], ['other', 'Something else']];

  function create(ctx) {
    var S = ctx.state, esc = ctx.esc, timer = null, seq = 0, reader = null, scanStart = 0;

    function wrap(title, body, extra) {
      return '<div class="scrim" data-a="close"></div><div class="sheet' + (extra || '') + '" role="dialog" aria-modal="true" aria-label="' + esc(title) + '"><div class="grab"></div>' + body + '</div>';
    }
    function amount(v, unit) { return (v >= 100 ? fmt(v) : v >= 10 ? fmt(v, 1) : fmt(v, v >= 1 ? 1 : 2)) + ' ' + unit; }

    /* ---------- Find a food ---------- */
    function resultRow(f) {
      var b = FD.badge(f), per = f.per === 'ml' ? 'ml' : 'g';
      var serving = f.serving_g ? ' · ' + esc(f.serving_label || fmt(f.serving_g) + ' ' + per) + ' = ' + fmt(Number(f.kcal) * f.serving_g / 100) + ' kcal' : '';
      return '<button type="button" class="item food" data-a="food" data-v="' + esc(f.id) + '"><span><span class="t">' + esc(f.name) + '</span>' +
        '<span class="s">' + (f.brand ? esc(f.brand) + ' · ' : '') + fmt(Number(f.kcal)) + ' kcal · P ' + fmt(Number(f.protein_g), 1) + ' g per 100 ' + per + serving + '</span></span>' +
        '<span class="badge ' + b.kind + '">' + b.text + '</span></button>';
    }
    function resultsHtml() {
      var a = S.sheet;
      if (a.error) return '<p class="small warn">' + esc(a.error) + '</p>';
      if (a.q.trim().length < 2) return '<p class="small muted">Type at least 2 letters, or scan a barcode.</p>';
      if (a.loading && !a.results.length) return '<p class="small muted">Searching…</p>';
      if (!a.results.length) return '<p class="small muted">No foods match "' + esc(a.q) + '". Try fewer words, or scan the barcode.</p>';
      return '<div class="list">' + a.results.map(resultRow).join('') + '</div>' +
        '<p class="small muted">USDA data is public domain (FoodData Central). Logging arrives in M5.</p>';
    }
    function addView() {
      var a = S.sheet, online = root.navigator.onLine !== false;
      return wrap('Find a food',
        '<div class="row"><h2>Find a food</h2><button type="button" class="btn sm" data-a="scan">Scan barcode</button></div>' +
        '<input type="search" id="fd-q" placeholder="Search foods (e.g. greek yogurt, chicken breast cooked)" value="' + esc(a.q) + '" autocomplete="off" aria-label="Search foods" enterkeyhint="search">' +
        (online ? '' : '<p class="small warn">You\'re offline. Food search needs a connection; recent foods offline arrive in M5.</p>') +
        '<div id="fd-results">' + resultsHtml() + '</div>', ' tall');
    }
    function runSearch() {
      var a = S.sheet, my = ++seq, started = Date.now();
      a.loading = true; a.error = '';
      paint();
      FD.search(a.q).then(function (rows) {
        if (my !== seq || !S.sheet || S.sheet.kind !== 'add') return;
        a.results = rows; a.loading = false; a.ms = Date.now() - started; paint();
      }, function (e) {
        if (my !== seq || !S.sheet) return;
        a.loading = false; a.error = root.navigator.onLine === false ? 'You\'re offline. Food search needs a connection.' : 'Search didn\'t work: ' + (e && e.message); paint();
      });
    }
    function paint() { var box = doc.getElementById('fd-results'); if (box) box.innerHTML = resultsHtml(); }

    /* ---------- Food detail ---------- */
    function detailView() {
      var d = S.sheet, f = d.food;
      if (!f) return wrap('Food', '<h2>Loading…</h2>' + (d.error ? '<p class="small warn">' + esc(d.error) + '</p>' : ''));
      var per = f.per === 'ml' ? 'ml' : 'g', useServing = d.basis === 'serving' && f.serving_g;
      var grams = useServing ? f.serving_g : 100, v = FD.scale(f, grams), b = FD.badge(f);
      var label = useServing ? (f.serving_label || fmt(f.serving_g) + ' ' + per) + ' (' + fmt(f.serving_g) + ' ' + per + ')' : '100 ' + per;
      var rows = NUTRIENTS.filter(function (n) { return v.nutrients[n[0]] != null; }).map(function (n) {
        return '<div class="status"><span>' + n[1] + '</span><span>' + amount(v.nutrients[n[0]], n[2]) + '</span></div>';
      }).join('');
      var src = FD.SOURCE_LABEL[f.source] || f.source;
      return wrap(f.name,
        '<div class="row"><span class="badge ' + b.kind + '">' + b.text + '</span>' + (f.brand ? '<span class="small muted">' + esc(f.brand) + '</span>' : '') + '</div>' +
        '<h2>' + esc(f.name) + '</h2>' +
        (f.serving_g ? '<div class="seg">' + [['100', 'Per 100 ' + per], ['serving', 'Per serving']].map(function (o) { return '<button type="button" data-a="fdbasis" data-v="' + o[0] + '" aria-pressed="' + ((d.basis || '100') === o[0]) + '">' + o[1] + '</button>'; }).join('') + '</div>' : '') +
        '<p class="small muted">' + esc(label) + '</p>' +
        '<div class="targets"><div><b>' + fmt(v.kcal) + '</b><span>kcal</span></div><div><b>' + fmt(v.protein_g, 1) + '</b><span>protein g</span></div><div><b>' + fmt(v.carbs_g, 1) + '</b><span>carbs g</span></div><div><b>' + fmt(v.fat_g, 1) + '</b><span>fat g</span></div></div>' +
        (f.energy_derived ? '<p class="small muted">Calories worked out from protein, carbs and fat (the source didn\'t list them).</p>' : '') +
        (rows ? '<details' + (rows.length < 400 ? ' open' : '') + '><summary>Nutrients</summary>' + rows + '</details>' : '<p class="small muted">No vitamins or minerals listed for this food.</p>') +
        (f.servings && f.servings.length ? '<p class="small muted">Servings: ' + f.servings.map(function (s) { return esc(s.label) + ' = ' + fmt(s.g) + ' g'; }).join(' · ') + '</p>' : '') +
        '<p class="small muted">Source: ' + esc(src) + (f.source_id ? ' (FoodData Central #' + esc(f.source_id) + ')' : '') + (f.gtin ? ' · barcode ' + esc(f.gtin.replace(/^0+(?=\d{12})/, '')) : '') + '. ' +
          (f.verification === 'community' ? '' : 'USDA data: public domain.') + '</p>' +
        (f.attribution ? '<p class="small muted">' + esc(f.attribution) + '</p>' : '') +
        '<button type="button" class="btn block" disabled>Log this food (arrives in M5)</button>' +
        (d.reporting ? reportForm() : '<button type="button" class="link" data-a="fdreport">Report a problem with this food</button>') +
        (d.back ? '<button type="button" class="btn ghost block" data-a="fdback">Back to results</button>' : ''), ' tall');
    }
    function reportForm() {
      var d = S.sheet;
      return '<div class="card" style="display:grid;gap:8px"><b>What\'s wrong?</b><div class="chips2">' + ISSUES.map(function (i) { return '<button type="button" data-a="fdissue" data-v="' + i[0] + '" aria-pressed="' + (d.issue === i[0]) + '">' + i[1] + '</button>'; }).join('') + '</div>' +
        '<input type="text" id="fd-note" placeholder="Details (optional)" maxlength="500">' +
        '<button type="button" class="btn block" data-a="fdsend">Send report</button><p class="small muted">Reports are checked by hand. Making your own corrected copy arrives with custom foods in M5.</p></div>';
    }
    function openFood(id, back) {
      S.sheet = { kind: 'food', food: null, basis: '100', back: back || null };
      ctx.render();
      FD.get(id).then(function (f) { if (S.sheet && S.sheet.kind === 'food') { S.sheet.food = f || null; if (!f) S.sheet.error = 'This food is no longer in the catalog.'; ctx.render(); } },
        function (e) { if (S.sheet) { S.sheet.error = 'Couldn\'t load this food: ' + (e && e.message); ctx.render(); } });
    }

    /* ---------- Scan ---------- */
    function scanView() {
      var s = S.sheet;
      return wrap('Scan a barcode',
        '<div class="row"><h2>Scan a barcode</h2><button type="button" class="btn ghost sm" data-a="scanstop">Cancel</button></div>' +
        (s.found === undefined ? '<div class="scanbox"><video id="fd-video" playsinline muted autoplay></video><i></i></div><p class="small muted center" id="fd-scanmsg">' + esc(s.msg || 'Starting the camera…') + '</p>'
          : notFound()), ' tall');
    }
    function notFound() {
      var s = S.sheet;
      return '<div class="card"><b>' + esc(s.reason || 'Not found') + '</b><p class="small muted">Barcode ' + esc(s.code || '') + (s.ms ? ' · read in ' + (s.ms / 1000).toFixed(1) + ' s' : '') + '</p>' +
        '<p class="small muted">Creating this food with the barcode filled in arrives with custom foods in M5.</p></div>' +
        '<button type="button" class="btn block" data-a="scan">Scan another</button><button type="button" class="btn ghost block" data-a="add">Search instead</button>';
    }
    function loadZxing() {
      if (root.ZXing) return Promise.resolve(root.ZXing);
      return new Promise(function (resolve, reject) {
        var t = doc.createElement('script'); t.src = 'js/vendor/zxing.min.js';
        t.onload = function () { resolve(root.ZXing); }; t.onerror = function () { reject(new Error('The barcode reader didn\'t load. Check your connection.')); };
        doc.head.appendChild(t);
      });
    }
    function startScan() {
      S.sheet = { kind: 'scan', msg: 'Starting the camera…' };
      ctx.render();
      if (!(root.navigator.mediaDevices && root.navigator.mediaDevices.getUserMedia)) { setMsg('This browser can\'t use the camera here. Open Leanward in Safari (or from the Home Screen icon) over https.'); return; }
      loadZxing().then(function (Z) {
        var hints = new Map();
        hints.set(Z.DecodeHintType.POSSIBLE_FORMATS, [Z.BarcodeFormat.EAN_13, Z.BarcodeFormat.EAN_8, Z.BarcodeFormat.UPC_A, Z.BarcodeFormat.UPC_E]);
        reader = new Z.BrowserMultiFormatReader(hints, 150);
        var video = doc.getElementById('fd-video');
        if (!video || !S.sheet || S.sheet.kind !== 'scan') return;
        scanStart = Date.now();
        setMsg('Point the camera at the barcode. Hold it steady about a hand\'s width away.');
        return reader.decodeFromConstraints({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } } }, video, function (result) {
          if (!result || !S.sheet || S.sheet.kind !== 'scan' || S.sheet.found !== undefined) return;
          var ms = Date.now() - scanStart, code = result.getText();
          stopCamera();
          S.sheet.found = null; S.sheet.code = code; S.sheet.ms = ms; S.sheet.reason = 'Looking it up…';
          ctx.render();
          FD.byBarcode(code).then(function (r) {
            if (!S.sheet || S.sheet.kind !== 'scan') return;
            if (r.food) { S.sheet = { kind: 'food', food: r.food, basis: '100', scanMs: ms }; ctx.render(); ctx.toast('Read in ' + (ms / 1000).toFixed(1) + ' s' + (r.source === 'off' ? ' · from Open Food Facts' : '')); return; }
            S.sheet.reason = r.reason; ctx.render();
          }, function (e) { if (S.sheet) { S.sheet.reason = root.navigator.onLine === false ? 'You\'re offline. Looking up a barcode needs a connection.' : 'Lookup failed: ' + (e && e.message); ctx.render(); } });
        });
      }).catch(function (e) {
        var denied = e && (e.name === 'NotAllowedError' || /permission|denied/i.test(String(e.message)));
        setMsg(denied ? 'Leanward needs camera access to scan. Allow it in Settings → Safari → Camera (or the prompt), then try again.' : (e && e.message) || 'The camera didn\'t start.');
      });
    }
    function setMsg(m) { if (S.sheet) S.sheet.msg = m; var el = doc.getElementById('fd-scanmsg'); if (el) el.textContent = m; }
    function stopCamera() { try { if (reader) reader.reset(); } catch (e) { /* already stopped */ } reader = null; }

    /* ---------- wiring ---------- */
    var actions = {
      add: function () { stopCamera(); S.sheet = { kind: 'add', q: '', results: [] }; ctx.render(); focusSearch(); },
      food: function (id) { var back = S.sheet && S.sheet.kind === 'add' ? { q: S.sheet.q, results: S.sheet.results } : null; openFood(id, back); },
      fdback: function () { var b = S.sheet.back; S.sheet = { kind: 'add', q: b.q, results: b.results }; ctx.render(); },
      fdbasis: function (v) { S.sheet.basis = v; ctx.render(); },
      fdreport: function () { S.sheet.reporting = true; ctx.render(); },
      fdissue: function (v) { S.sheet.issue = v; ctx.render(); },
      fdsend: function () {
        var d = S.sheet, f = d.food, note = (doc.getElementById('fd-note') || {}).value || '';
        if (!d.issue) { ctx.toast('Choose what\'s wrong'); return; }
        var src = f.source === 'off' ? 'off' : f.source === 'custom' ? 'custom' : 'usda';
        ctx.save([['lw_food_reports', { id: root.LW.model.newId(), food_source: src, food_ref: String(f.id).slice(0, 64), issue: d.issue, note: note.trim().slice(0, 1000) || null }]])
          .then(function () { d.reporting = false; d.issue = null; ctx.toast('Thanks, report sent'); ctx.render(); }, function (e) { ctx.toast('Couldn\'t save the report: ' + (e && e.message)); });
      },
      scan: function () { stopCamera(); startScan(); },
      scanstop: function () { stopCamera(); S.sheet = { kind: 'add', q: '', results: [] }; ctx.render(); focusSearch(); }
    };
    function focusSearch() { root.setTimeout(function () { var i = doc.getElementById('fd-q'); if (i) i.focus(); }, 50); }

    function onInput(el) {
      if (el.id !== 'fd-q' || !S.sheet || S.sheet.kind !== 'add') return false;
      S.sheet.q = el.value;
      root.clearTimeout(timer);
      if (el.value.trim().length < 2) { S.sheet.results = []; seq++; paint(); return true; }
      timer = root.setTimeout(runSearch, 250);
      return true;
    }
    function sheetView() {
      var k = S.sheet && S.sheet.kind;
      return k === 'add' ? addView() : k === 'food' ? detailView() : k === 'scan' ? scanView() : null;
    }
    return { actions: actions, onInput: onInput, sheetView: sheetView, stop: stopCamera };
  }

  root.LW.foodui = { create: create, NUTRIENTS: NUTRIENTS };
})(this);
