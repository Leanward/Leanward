/* Leanward — M5a: the Diary tab (LOG-1, NUT-1), editing, moving and deleting entries (LOG-11),
 * copying yesterday and repeating yesterday's breakfast (LOG-10), and the Home "today" card.
 * Over target is shown neutrally (LOG-13). Logic lives in js/diary.js; flows follow the prototype.
 */
(function (root) {
  'use strict';

  var DY = root.LW.diary, M = root.LW.model, fmt = root.LW.calc.core.fmt;

  function create(ctx) {
    var S = ctx.state, esc = ctx.esc;

    function entriesOn(date) { return (S.rows.diary || []).filter(function (e) { return !e.deleted && e.date === date; }); }
    function targetsFor(date) {
      var ph = (S.rows.phases || []).filter(function (p) { return !p.deleted && p.start_date <= date && (!p.end_date || p.end_date >= date); })
        .sort(function (a, b) { return a.start_date < b.start_date ? 1 : -1; })[0];
      return ph ? M.targetsOn(S.rows.sets, ph.id, date) : null;
    }
    function dayName(date) {
      var t = ctx.today();
      if (date === t) return 'Today';
      if (date === DY.addDays(t, -1)) return 'Yesterday';
      return new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    }
    function slotLabel(id) { var s = DY.SLOTS.filter(function (x) { return x.id === id; })[0]; return s ? s.label : id; }

    function totalsCard(date) {
      var t = DY.totals(entriesOn(date)), tg = targetsFor(date), v = DY.versusTarget(t, tg);
      if (!v) return '<section class="card"><b>' + fmt(t.kcal) + ' kcal</b><p class="small muted">No targets for this day.</p></section>';
      var bar = function (eaten, target) { return '<div class="bar"><i style="width:' + Math.min(100, target ? eaten / target * 100 : 0) + '%"></i></div>'; };
      var macro = function (label, m, unit) { return '<div><span class="small muted">' + label + '</span><b>' + fmt(m.eaten) + '<span class="small muted"> / ' + fmt(m.target) + ' ' + unit + '</span></b>' + bar(m.eaten, m.target) + '</div>'; };
      return '<section class="card"><div class="row"><span><b style="font-size:22px">' + fmt(t.kcal) + '</b><span class="small muted"> / ' + fmt(tg.kcal) + ' kcal</span></span>' +
        '<span class="pill ' + (v.kcal.left >= 0 ? '' : 'wait') + '">' + v.kcal.text + '</span></div>' + bar(t.kcal, tg.kcal) +
        '<div class="macros">' + macro('Protein', v.protein, 'g') + macro('Carbs', v.carbs, 'g') + macro('Fat', v.fat, 'g') + macro('Fiber', v.fiber, 'g') + '</div>' +
        (t.entries && !(t.coverage.fiber >= 1) ? '<p class="small muted">Fiber is known for ' + Math.round((t.coverage.fiber || 0) * 100) + '% of this day\'s calories (quick adds and some foods don\'t list it), so the real total may be higher.</p>' : '') +
        '</section>';
    }

    function entryRow(e) {
      var badge = e.food_source === 'quick' ? 'Quick add' : e.food_source === 'off' ? 'Community' : e.food_source === 'custom' ? 'Yours' : 'USDA';
      return '<button type="button" class="item food" data-a="entry" data-v="' + esc(e.id) + '"><span><span class="t">' + esc(e.name) + '</span>' +
        '<span class="s">' + (e.unit ? esc(e.unit) + (e.grams && !/ (g|ml)$/.test(e.unit) ? ' · ' + fmt(Number(e.grams)) + ' g' : '') + ' · ' : '') + badge + '</span></span>' +
        '<span class="k">' + fmt(Number(e.kcal)) + '<small>' + (e.protein_g != null ? 'P ' + fmt(Number(e.protein_g)) + ' g' : '') + '</small></span></button>';
    }

    function view() {
      var date = S.diaryDate || ctx.today(), today = ctx.today(), es = entriesOn(date), y = DY.addDays(date, -1), yEntries = entriesOn(y);
      var out = '<header class="top row"><button type="button" class="iconbtn" data-a="day" data-v="-1" aria-label="Previous day">‹</button>' +
        '<h1 style="text-align:center;font-size:20px">' + esc(dayName(date)) + '</h1>' +
        '<button type="button" class="iconbtn" data-a="day" data-v="1" aria-label="Next day"' + (date >= today ? ' disabled style="opacity:.35"' : '') + '>›</button></header>' +
        totalsCard(date);
      if (!es.length && yEntries.length) out += '<section class="card"><div class="row"><span class="small">Nothing logged yet.</span><button type="button" class="btn sm" data-a="copyday">Copy ' + (y === DY.addDays(today, -1) ? 'yesterday' : 'the day before') + '</button></div></section>';
      DY.SLOTS.forEach(function (sl) {
        var se = es.filter(function (e) { return e.slot === sl.id; });
        var t = DY.totals(se);
        var small = !se.length && (sl.id === 'beverages' || sl.id === 'supplements');
        var repeat = sl.id === 'breakfast' && !se.length && yEntries.some(function (e) { return e.slot === 'breakfast'; });
        out += '<section class="card' + (small ? ' slim' : '') + '"><div class="row"><h2 style="margin:0' + (small ? ';font-size:14px;color:var(--muted)' : '') + '">' + sl.label + '</h2>' +
          '<span class="row" style="gap:8px">' + (se.length ? '<span class="small muted">' + fmt(t.kcal) + ' kcal</span>' : '') +
          '<button type="button" class="iconbtn" data-a="addto" data-v="' + sl.id + '" aria-label="Add to ' + sl.label + '">+</button></span></div>' +
          (se.length ? '<p class="small muted" style="margin:2px 0 0">P ' + fmt(t.protein_g) + ' g · C ' + fmt(t.carbs_g) + ' g · F ' + fmt(t.fat_g) + ' g</p><div class="list">' + se.map(entryRow).join('') + '</div>'
            : small ? '' : '<p class="small muted">' + (repeat ? '<button type="button" class="link" data-a="repeatbf">Repeat yesterday\'s breakfast</button>' : 'Nothing here yet.') + '</p>') +
          '</section>';
      });
      return out;
    }

    function homeCard() {
      var today = ctx.today(), t = DY.totals(entriesOn(today)), tg = targetsFor(today), ph = M.currentPhase(S.rows.phases);
      if (!tg || !ph) return '';
      var v = DY.versusTarget(t, tg);
      return '<section class="card"><div class="row"><h2 style="margin:0">Calories</h2><span class="small muted">' + esc(M.dayOf(ph, today).label) + '</span></div>' +
        '<div class="row" style="margin-top:8px"><span><b style="font-size:26px">' + fmt(Math.abs(v.kcal.left)) + '</b> <span class="small muted">kcal ' + (v.kcal.left >= 0 ? 'left' : 'over') + '</span></span>' +
        '<span class="small muted">' + fmt(t.kcal) + ' eaten of ' + fmt(tg.kcal) + '</span></div>' +
        '<div class="bar"><i style="width:' + Math.min(100, t.kcal / tg.kcal * 100) + '%"></i></div>' +
        '<p class="small muted">Protein ' + fmt(t.protein_g) + ' / ' + tg.protein_g + ' g · Carbs ' + fmt(t.carbs_g) + ' / ' + tg.carbs_g + ' g · Fat ' + fmt(t.fat_g) + ' / ' + tg.fat_g + ' g · Fiber ' + fmt(t.nutrients.fiber || 0) + ' / ' + tg.fiber_g + ' g</p>' +
        '<button type="button" class="btn block" data-a="addto" data-v="">Log food</button></section>';
    }

    /* ---------- edit an entry (LOG-11) ---------- */
    function entrySheet() {
      var sh = S.sheet, e = (S.rows.diary || []).filter(function (x) { return x.id === sh.id; })[0];
      if (!e) return '';
      var food = DY.foodOfEntry(e), units = food ? DY.unitsFor(food) : [], isQuick = e.food_source === 'quick';
      var slotSel = '<div class="field"><label for="en-slot">Meal</label><select id="en-slot" data-x="slot">' + DY.SLOTS.map(function (s) { return '<option value="' + s.id + '"' + (s.id === (sh.slot || e.slot) ? ' selected' : '') + '>' + s.label + '</option>'; }).join('') + '</select></div>';
      var dateIn = '<div class="field"><label for="en-date">Day</label><input type="date" id="en-date" data-x="date" value="' + esc(sh.date || e.date) + '" max="' + ctx.today() + '"></div>';
      var amount = isQuick
        ? '<div class="grid2"><div class="field"><label for="en-k">Calories</label><input type="number" id="en-k" inputmode="decimal" data-x="kcal" value="' + (sh.kcal != null ? sh.kcal : e.kcal) + '"></div><div class="field"><label for="en-l">Label</label><input type="text" id="en-l" data-x="label" value="' + esc(sh.label != null ? sh.label : e.name) + '"></div></div>'
        : (food ? '<div class="grid2"><div class="field"><label for="en-q">Amount</label><input type="number" id="en-q" inputmode="decimal" step="any" data-x="qty" value="' + (sh.qty != null ? sh.qty : e.qty) + '"></div>' +
          '<div class="field"><label for="en-u">Unit</label><select id="en-u" data-x="unit">' + units.map(function (u, i) { return '<option value="' + i + '"' + (i === (sh.unit != null ? sh.unit : unitIndex(units, e)) ? ' selected' : '') + '>' + esc(u.label) + '</option>'; }).join('') + '</select></div></div>' : '');
      return '<div class="scrim" data-a="close"></div><div class="sheet" role="dialog" aria-modal="true" aria-label="Edit entry"><div class="grab"></div>' +
        '<h2>' + esc(e.name) + '</h2><p class="small muted">' + fmt(Number(e.kcal)) + ' kcal' + (e.protein_g != null ? ' · P ' + fmt(Number(e.protein_g)) + ' g · C ' + fmt(Number(e.carbs_g)) + ' g · F ' + fmt(Number(e.fat_g)) + ' g' : '') + '</p>' +
        amount + '<div class="grid2">' + slotSel + dateIn + '</div>' +
        '<button type="button" class="btn block" data-a="entrysave">Save</button><button type="button" class="btn ghost block" data-a="entrydelete">Delete</button></div>';
    }
    function unitIndex(units, e) {
      // The entry's unit label looks like "1.5 × 1 container" or "150 g".
      var lab = String(e.unit || '').replace(/^[\d.]+\s*(×\s*)?/, '');
      var i = units.map(function (u) { return u.label; }).indexOf(lab);
      return i < 0 ? units.length - 1 : i;
    }
    function onInput(el) {
      if (!S.sheet || S.sheet.kind !== 'entry' || !el.dataset.x) return false;
      var k = el.dataset.x, v = el.value;
      S.sheet[k] = (k === 'qty' || k === 'kcal') ? (v === '' ? null : Number(v)) : k === 'unit' ? Number(v) : v;
      return true;
    }

    var actions = {
      day: function (v) {
        var d = DY.addDays(S.diaryDate || ctx.today(), Number(v));
        if (d > ctx.today()) return;
        S.diaryDate = d; ctx.render();
      },
      entry: function (id) { S.sheet = { kind: 'entry', id: id }; ctx.render(); },
      entrysave: function () {
        var sh = S.sheet, e = S.rows.diary.filter(function (x) { return x.id === sh.id; })[0];
        if (!e) return;
        var next;
        if (e.food_source === 'quick') {
          next = Object.assign({}, e, { kcal: sh.kcal != null ? sh.kcal : e.kcal, name: (sh.label != null ? sh.label : e.name) || 'Quick add', slot: sh.slot || e.slot, date: sh.date || e.date });
          if (!(next.kcal >= 0)) { ctx.toast('Enter the calories'); return; }
        } else {
          var food = DY.foodOfEntry(e), units = food ? DY.unitsFor(food) : [];
          var change = { slot: sh.slot, date: sh.date };
          if (food && (sh.qty != null || sh.unit != null)) {
            change.qty = sh.qty != null ? sh.qty : Number(e.qty) || 1;
            change.unit = units[sh.unit != null ? sh.unit : unitIndex(units, e)];
            if (!(change.qty > 0)) { ctx.toast('Enter an amount above zero'); return; }
          }
          next = DY.updateEntry(e, change);
        }
        if (next.date > ctx.today()) { ctx.toast('That day hasn\'t happened yet'); return; }
        ctx.save([['lw_diary_entries', next]]).then(function () { S.sheet = false; ctx.toast(next.date !== e.date || next.slot !== e.slot ? 'Moved to ' + slotLabel(next.slot) + ', ' + dayName(next.date) : 'Saved'); ctx.render(); });
      },
      entrydelete: function () {
        var id = S.sheet.id;
        ctx.remove('lw_diary_entries', id).then(function () { S.sheet = false; ctx.toast('Deleted'); ctx.render(); });
      },
      copyday: function () {
        var date = S.diaryDate || ctx.today();
        var rows = DY.copyEntries(entriesOn(DY.addDays(date, -1)), date).map(function (r) { return ['lw_diary_entries', r]; });
        ctx.save(rows).then(function () { ctx.toast('Copied ' + rows.length + ' item' + (rows.length === 1 ? '' : 's')); ctx.render(); });
      },
      repeatbf: function () {
        var date = S.diaryDate || ctx.today();
        var src = entriesOn(DY.addDays(date, -1)).filter(function (e) { return e.slot === 'breakfast'; });
        ctx.save(DY.copyEntries(src, date).map(function (r) { return ['lw_diary_entries', r]; })).then(function () { ctx.toast('Breakfast repeated'); ctx.render(); });
      }
    };

    return { view: view, homeCard: homeCard, entrySheet: entrySheet, onInput: onInput, actions: actions, entriesOn: entriesOn, slotLabel: slotLabel, dayName: dayName };
  }

  root.LW.diaryui = { create: create };
})(this);
