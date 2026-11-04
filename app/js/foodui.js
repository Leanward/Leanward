/* Leanward — the add sheet: Recent and Frequent (LOG-2), Find a food (LOG-3), Quick add (LOG-7),
 * food detail with amount, unit and meal (NUT-5, LOG-5, FDB-1/3/5) and barcode scanning (LOG-4).
 * Opened from the global + button or a Diary slot's +. Logging writes a diary entry (js/diary.js).
 * Barcode scanning uses ZXing (js/vendor/zxing.min.js, Apache-2.0), loaded the first time you scan.
 */
(function (root) {
  'use strict';

  var FD = root.LW.foods, DY = root.LW.diary, fmt = root.LW.calc.core.fmt, doc = root.document;

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
        '<p class="small muted">USDA data is public domain (FoodData Central).</p>';
    }
    function where() { var a = S.sheet; return ctx.slotLabel(a.slot) + (a.date !== ctx.today() ? ', ' + ctx.dayName(a.date) : ''); }
    function recentHtml() {
      var all = S.rows.diary || [], rec = DY.recents(all, 12), freq = DY.frequents(all, ctx.today(), 30, 5);
      if (!rec.length) return '<p class="small muted">Foods you log show up here, so you can add them again in one tap, even offline.</p>';
      var row = function (e, extra) {
        return '<button type="button" class="item food" data-a="recent" data-v="' + esc(e.id) + '"><span><span class="t">' + esc(e.name) + '</span><span class="s">' + esc(e.unit || '') + ' · ' + fmt(Number(e.kcal)) + ' kcal' + (extra || '') + '</span></span><span class="badge">+</span></button>';
      };
      return (freq.length ? '<span class="sec">Frequent</span><div class="list">' + freq.map(function (f) { return row(f.entry, ' · ' + f.count + '× this month'); }).join('') + '</div>' : '') +
        '<span class="sec">Recent</span><div class="list">' + rec.map(function (e) { return row(e); }).join('') + '</div>';
    }
    function quickHtml() {
      var a = S.sheet;
      return '<p class="small muted">For when you just know the numbers. Quick adds have no vitamins or minerals.</p>' +
        '<div class="field"><label for="qa-l">Label (optional)</label><input type="text" id="qa-l" data-q="label" placeholder="e.g. Team lunch" value="' + esc(a.qa.label || '') + '"></div>' +
        '<div class="field"><label for="qa-k">Calories</label><input type="number" id="qa-k" inputmode="decimal" data-q="kcal" value="' + (a.qa.kcal == null ? '' : a.qa.kcal) + '"></div>' +
        '<div class="grid3"><div class="field"><label for="qa-p">Protein g</label><input type="number" id="qa-p" inputmode="decimal" data-q="protein_g" value="' + (a.qa.protein_g == null ? '' : a.qa.protein_g) + '"></div>' +
        '<div class="field"><label for="qa-c">Carbs g</label><input type="number" id="qa-c" inputmode="decimal" data-q="carbs_g" value="' + (a.qa.carbs_g == null ? '' : a.qa.carbs_g) + '"></div>' +
        '<div class="field"><label for="qa-f">Fat g</label><input type="number" id="qa-f" inputmode="decimal" data-q="fat_g" value="' + (a.qa.fat_g == null ? '' : a.qa.fat_g) + '"></div></div>' +
        slotField(a.slot, 'qa') + '<button type="button" class="btn block" data-a="qadd">Add to ' + esc(where()) + '</button>';
    }
    function slotField(cur, prefix) {
      return '<div class="field"><label for="' + prefix + '-slot">Meal</label><select id="' + prefix + '-slot" data-s="slot">' + DY.SLOTS.map(function (s) { return '<option value="' + s.id + '"' + (s.id === cur ? ' selected' : '') + '>' + s.label + '</option>'; }).join('') + '</select></div>';
    }
    function addView() {
      var a = S.sheet, online = root.navigator.onLine !== false;
      var tabs = '<div class="seg">' + [['foods', 'Foods'], ['quick', 'Quick add']].map(function (t) { return '<button type="button" data-a="addtab" data-v="' + t[0] + '" aria-pressed="' + (a.tab === t[0]) + '">' + t[1] + '</button>'; }).join('') + '</div>';
      if (a.tab === 'quick') return wrap('Quick add', '<div class="row"><h2>Add to ' + esc(where()) + '</h2></div>' + tabs + quickHtml(), ' tall');
      return wrap('Find a food',
        '<div class="row"><h2>Add to ' + esc(where()) + '</h2><button type="button" class="btn sm" data-a="scan">Scan barcode</button></div>' + tabs +
        '<input type="search" id="fd-q" placeholder="Search foods (e.g. greek yogurt, chicken breast cooked)" value="' + esc(a.q) + '" autocomplete="off" aria-label="Search foods" enterkeyhint="search">' +
        (online ? '' : '<p class="small warn">You\'re offline. Search needs a connection; your recent foods below still work.</p>') +
        '<div id="fd-results">' + (a.q.trim().length < 2 ? recentHtml() : resultsHtml()) + '</div>', ' tall');
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
    function paint() { var box = doc.getElementById('fd-results'); if (box) box.innerHTML = S.sheet.q.trim().length < 2 ? recentHtml() : resultsHtml(); }

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
        logControls(d, f) +
        (d.reporting ? reportForm() : '<button type="button" class="link" data-a="fdreport">Report a problem with this food</button>') +
        (d.back ? '<button type="button" class="btn ghost block" data-a="fdback">Back to results</button>' : ''), ' tall');
    }
    function logControls(d, f) {
      var units = DY.unitsFor(f), u = units[d.unitIdx || 0], qty = d.qty == null ? 1 : d.qty;
      return '<div class="card" style="display:grid;gap:10px"><div class="grid2"><div class="field"><label for="lg-q">Amount</label><input type="number" id="lg-q" inputmode="decimal" step="any" data-l="qty" value="' + qty + '"></div>' +
        '<div class="field"><label for="lg-u">Unit</label><select id="lg-u" data-l="unit">' + units.map(function (x, i) { return '<option value="' + i + '"' + (i === (d.unitIdx || 0) ? ' selected' : '') + '>' + esc(x.label) + '</option>'; }).join('') + '</select></div></div>' +
        slotField(d.slot, 'lg') + '<p class="small muted" id="lg-out">' + preview(f, qty, u) + '</p>' +
        '<button type="button" class="btn block" data-a="logfood">Add to ' + esc(ctx.slotLabel(d.slot) + (d.date !== ctx.today() ? ', ' + ctx.dayName(d.date) : '')) + '</button></div>';
    }
    function preview(f, qty, u) {
      if (!(qty > 0) || !u) return 'Enter an amount.';
      var a = DY.amountsFor(f, qty * u.g);
      return fmt(qty * u.g) + ' ' + (f.per === 'ml' ? 'ml' : 'g') + ' = ' + fmt(a.kcal) + ' kcal · P ' + fmt(a.protein_g, 1) + ' g · C ' + fmt(a.carbs_g, 1) + ' g · F ' + fmt(a.fat_g, 1) + ' g';
    }
    function reportForm() {
      var d = S.sheet;
      return '<div class="card" style="display:grid;gap:8px"><b>What\'s wrong?</b><div class="chips2">' + ISSUES.map(function (i) { return '<button type="button" data-a="fdissue" data-v="' + i[0] + '" aria-pressed="' + (d.issue === i[0]) + '">' + i[1] + '</button>'; }).join('') + '</div>' +
        '<input type="text" id="fd-note" placeholder="Details (optional)" maxlength="500">' +
        '<button type="button" class="btn block" data-a="fdsend">Send report</button><p class="small muted">Reports are checked by hand. Making your own corrected copy arrives with custom foods in M5.</p></div>';
    }
    function openFood(id, back, ctxs) {
      S.sheet = Object.assign({ kind: 'food', food: null, basis: '100', back: back || null }, ctxs);
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
      var log = logCtx();
      S.sheet = { kind: 'scan', msg: 'Starting the camera…', log: log };
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
            if (r.food) { S.sheet = Object.assign({ kind: 'food', food: r.food, basis: '100', scanMs: ms }, S.sheet.log, { via: 'barcode' }); ctx.render(); ctx.toast('Read in ' + (ms / 1000).toFixed(1) + ' s' + (r.source === 'off' ? ' · from Open Food Facts' : '')); return; }
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
    /** Where new entries go: the sheet's slot and date, or by time of day today. */
    function logCtx() {
      var sh = S.sheet || {};
      if (sh.slot && sh.date) return { slot: sh.slot, date: sh.date };
      if (sh.log) return sh.log;
      var now = new Date();
      return { slot: DY.slotForTime(now.getHours() * 60 + now.getMinutes()), date: ctx.today() };
    }
    function openAdd(slot, date, q) {
      stopCamera();
      var lc = logCtx();
      S.sheet = { kind: 'add', q: q || '', results: [], tab: 'foods', qa: {}, slot: slot || lc.slot, date: date || lc.date };
      ctx.render(); focusSearch();
    }
    var actions = {
      add: function () { var now = new Date(); S.sheet = false; openAdd(DY.slotForTime(now.getHours() * 60 + now.getMinutes()), S.tab === 'diary' && S.diaryDate ? S.diaryDate : ctx.today()); },
      addto: function (slot) { var now = new Date(); S.sheet = false; openAdd(slot || DY.slotForTime(now.getHours() * 60 + now.getMinutes()), S.tab === 'diary' && S.diaryDate ? S.diaryDate : ctx.today()); },
      addtab: function (v) { S.sheet.tab = v; ctx.render(); if (v === 'foods') focusSearch(); },
      food: function (id) { var a = S.sheet, back = a && a.kind === 'add' ? { q: a.q, results: a.results } : null; openFood(id, back, { slot: a.slot, date: a.date, via: 'search' }); },
      recent: function (id) {
        var a = S.sheet, e = (S.rows.diary || []).filter(function (x) { return x.id === id; })[0], f = e && DY.foodOfEntry(e);
        if (!f) return;
        var units = DY.unitsFor(f), lab = String(e.unit || '').replace(/^[\d.]+\s*(×\s*)?/, ''), ui = Math.max(0, units.map(function (u) { return u.label; }).indexOf(lab));
        S.sheet = { kind: 'food', food: f, basis: '100', back: { q: '', results: [] }, slot: a.slot, date: a.date, via: 'recent', qty: Number(e.qty) || 1, unitIdx: ui };
        ctx.render();
      },
      fdback: function () { var b = S.sheet.back, sh = S.sheet; S.sheet = { kind: 'add', q: b.q, results: b.results, tab: 'foods', qa: {}, slot: sh.slot, date: sh.date }; ctx.render(); },
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
      logfood: function () {
        var d = S.sheet, f = d.food, units = DY.unitsFor(f), u = units[d.unitIdx || 0], qty = d.qty == null ? 1 : d.qty;
        if (!(qty > 0)) { ctx.toast('Enter an amount above zero'); return; }
        var e = DY.entryFromFood({ food: f, qty: qty, unit: u, date: d.date || ctx.today(), slot: d.slot || 'snacks', via: d.via || 'search' });
        ctx.save([['lw_diary_entries', e]]).then(function () { S.sheet = false; ctx.toast('Added to ' + ctx.slotLabel(e.slot)); ctx.render(); }, function (err) { ctx.toast('Couldn\'t save: ' + (err && err.message)); });
      },
      qadd: function () {
        var a = S.sheet, q = a.qa;
        if (!(q.kcal >= 0) || q.kcal === null) { ctx.toast('Enter the calories'); return; }
        var e;
        try { e = DY.quickAdd({ kcal: q.kcal, protein_g: q.protein_g, carbs_g: q.carbs_g, fat_g: q.fat_g, label: q.label, date: a.date, slot: a.slot }); }
        catch (err) { ctx.toast(err.message); return; }
        ctx.save([['lw_diary_entries', e]]).then(function () { S.sheet = false; ctx.toast('Added to ' + ctx.slotLabel(e.slot)); ctx.render(); });
      },
      scan: function () { stopCamera(); startScan(); },
      scanstop: function () { var l = S.sheet && S.sheet.log; stopCamera(); S.sheet = false; openAdd(l && l.slot, l && l.date); }
    };
    function focusSearch() { root.setTimeout(function () { var i = doc.getElementById('fd-q'); if (i) i.focus(); }, 50); }

    function onInput(el) {
      var sh = S.sheet;
      if (!sh) return false;
      if (el.dataset.s === 'slot') { sh.slot = el.value; ctx.render(); return true; }
      if (el.dataset.q) { var v = el.value.trim(); sh.qa[el.dataset.q] = el.dataset.q === 'label' ? el.value : (v === '' ? null : Number(v)); return true; }
      if (el.dataset.l && sh.kind === 'food') {
        if (el.dataset.l === 'qty') sh.qty = el.value.trim() === '' ? null : Number(el.value);
        else sh.unitIdx = Number(el.value);
        var out = doc.getElementById('lg-out'), units = DY.unitsFor(sh.food);
        if (out) out.textContent = preview(sh.food, sh.qty == null ? 0 : sh.qty, units[sh.unitIdx || 0]);
        return true;
      }
      if (el.id !== 'fd-q' || sh.kind !== 'add') return false;
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
