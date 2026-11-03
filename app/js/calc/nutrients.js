/* Leanward calculation engine — nutrient review: each nutrient against its target, the §8.8 limits,
 * guidelines and ratios (NUT-6, NUT-7), and the "furthest from target" summary.
 *
 * Limits (Dietary Guidelines for Americans 2020–2025): saturated fat and added sugar < 10% of
 * calories; sodium AI 1,500 mg with the 2,300 mg Chronic Disease Risk Reduction level.
 * Guideline without a DRI: EPA + DHA 250–500 mg a day. Cholesterol and trans fat: no numeric target.
 * Ratios: sodium-to-potassium by weight (lower is better), fiber per 1,000 kcal (target 14 g),
 * macro split as % of calories, protein g per kg.
 * Language stays neutral (§9): "above UL" / "over the limit", never red or "bad".
 */
(function (root) {
  'use strict';

  var node = typeof module === 'object' && module.exports;
  var core = node ? require('./core.js') : root.LW.calc.core;
  var fmt = core.fmt;

  var SAT_FAT_MAX_PCT = 10, ADDED_SUGAR_MAX_PCT = 10;
  var EPA_DHA_GUIDE = [250, 500];
  var FIBER_PER_1000 = 14;

  /**
   * One nutrient's day (or 7-day average) against its DRI entry from dri.targetsFor().
   * coverage: share of logged foods (0–1) that report this nutrient (NUT-4); shown when below 1.
   */
  function evaluate(id, amount, dri, coverage) {
    var pct = amount / dri.target * 100;
    var r = { id: id, label: dri.label, unit: dri.unit, kind: dri.kind, amount: amount, target: dri.target, pct: pct, coverage: coverage == null ? 1 : coverage, flags: [] };
    if (dri.ul != null && amount > dri.ul) {
      r.flags.push(dri.ulNote ? 'above-ul-supplements-only' : 'above-ul');
      r.ul = dri.ul; r.ulNote = dri.ulNote;
    }
    if (dri.limit != null) {
      r.limit = dri.limit; r.limitKind = dri.limitKind;
      if (amount > dri.limit) r.flags.push('over-limit');
    }
    return r;
  }

  /** Limits, guidelines and ratios for a day's (or average day's) totals. Missing totals are skipped. */
  function quality(t, p) {
    var out = [];
    var kcal = t.kcal;
    function share(g, perG) { return g * perG / kcal * 100; }
    if (kcal > 0 && t.satFatG != null) {
      var sf = share(t.satFatG, 9);
      out.push({ id: 'satFatPct', label: 'Saturated fat', value: sf, unit: '% kcal', kind: 'limit', max: SAT_FAT_MAX_PCT, flags: sf >= SAT_FAT_MAX_PCT ? ['over-limit'] : [],
        text: fmt(t.satFatG) + ' g = ' + fmt(sf, 1) + '% of calories (limit: under 10%)' });
    }
    if (kcal > 0 && t.addedSugarG != null) {
      var as = share(t.addedSugarG, 4);
      out.push({ id: 'addedSugarPct', label: 'Added sugar', value: as, unit: '% kcal', kind: 'limit', max: ADDED_SUGAR_MAX_PCT, flags: as >= ADDED_SUGAR_MAX_PCT ? ['over-limit'] : [],
        text: fmt(t.addedSugarG) + ' g = ' + fmt(as, 1) + '% of calories (limit: under 10%)' });
    }
    if (t.sodiumMg != null && t.potassiumMg > 0) {
      var r = t.sodiumMg / t.potassiumMg;
      out.push({ id: 'naK', label: 'Sodium to potassium', value: r, unit: 'ratio', kind: 'ratio', flags: [],
        text: fmt(t.sodiumMg) + ' mg ÷ ' + fmt(t.potassiumMg) + ' mg = ' + fmt(r, 2) + ' (lower is better)' });
    }
    if (kcal > 0 && t.fiberG != null) {
      var f = t.fiberG / kcal * 1000;
      out.push({ id: 'fiberPer1000', label: 'Fiber per 1,000 kcal', value: f, unit: 'g', kind: 'target', target: FIBER_PER_1000, flags: f < FIBER_PER_1000 ? ['below-target'] : [],
        text: fmt(t.fiberG) + ' g ÷ ' + fmt(kcal) + ' kcal × 1,000 = ' + fmt(f, 1) + ' g (target 14 g)' });
    }
    if (t.epaDhaMg != null) {
      var e = t.epaDhaMg;
      out.push({ id: 'epaDha', label: 'EPA + DHA', value: e, unit: 'mg', kind: 'guideline', range: EPA_DHA_GUIDE.slice(), flags: e < EPA_DHA_GUIDE[0] ? ['below-guideline'] : [],
        text: fmt(e) + ' mg (guideline 250–500 mg a day; not a DRI)' });
    }
    if (kcal > 0 && t.proteinG != null && t.fatG != null && t.carbsG != null) {
      var sp = { proteinPct: share(t.proteinG, 4), fatPct: share(t.fatG, 9), carbsPct: share(t.carbsG, 4) };
      if (t.alcoholG) sp.alcoholPct = share(t.alcoholG, 7);
      out.push({ id: 'split', label: 'Macro split', value: sp, unit: '% kcal', kind: 'ratio', flags: [],
        text: 'Protein ' + fmt(sp.proteinPct) + '% · fat ' + fmt(sp.fatPct) + '% · carbs ' + fmt(sp.carbsPct) + '%' + (sp.alcoholPct ? ' · alcohol ' + fmt(sp.alcoholPct) + '%' : '') + ' of calories' });
    }
    if (p && p.kg > 0 && t.proteinG != null) {
      var gk = t.proteinG / p.kg;
      out.push({ id: 'proteinPerKg', label: 'Protein per kg', value: gk, unit: 'g/kg', kind: 'ratio', flags: [],
        text: fmt(t.proteinG) + ' g ÷ ' + fmt(p.kg, 1) + ' kg = ' + fmt(gk, 2) + ' g per kg' });
    }
    return out;
  }

  /**
   * NUT-6 "Furthest from target": nutrients most below target, plus anything over a limit or UL,
   * so the high-yield items are seen first. Items with under 50% data coverage are left out, because
   * a low total may just be missing data.
   */
  function furthestFromTarget(rows, limitRows, n) {
    n = n || 5;
    var over = rows.filter(function (r) { return r.flags.indexOf('over-limit') >= 0 || r.flags.indexOf('above-ul') >= 0; })
      .concat((limitRows || []).filter(function (q) { return q.flags.indexOf('over-limit') >= 0; }));
    var below = rows.filter(function (r) { return r.pct < 100 && r.coverage >= 0.5 && r.limit == null; })
      .sort(function (a, b) { return a.pct - b.pct; });
    return over.concat(below).slice(0, n);
  }

  var api = { SAT_FAT_MAX_PCT: SAT_FAT_MAX_PCT, ADDED_SUGAR_MAX_PCT: ADDED_SUGAR_MAX_PCT, EPA_DHA_GUIDE: EPA_DHA_GUIDE, evaluate: evaluate, quality: quality, furthestFromTarget: furthestFromTarget };
  if (node) module.exports = api;
  else { root.LW.calc.nutrients = api; }
})(this);
