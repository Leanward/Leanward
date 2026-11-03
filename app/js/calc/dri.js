/* Leanward calculation engine — Dietary Reference Intakes for the NUT-2 nutrients (PRD §8.8, NUT-3).
 *
 * Targets are the RDA where one exists, otherwise the AI. ULs are shown neutrally as "above UL";
 * where the UL covers only supplements, fortified foods or preformed vitamin A, the app says so
 * instead of flagging food intake.
 *
 * Source: National Academies of Sciences, Engineering, and Medicine, DRI summary tables (as printed
 * in Dietary Reference Intakes for Sodium and Potassium, 2019, Appendix J; sodium and potassium from
 * that report). Values entered on 2026-11-03.
 *
 * VERIFIED = false: the values were entered from the standard tables but not yet checked line by line
 * against the source document (the source sites were blocked from the build environment). They must be
 * checked before any screen shows them (development plan, M1b).
 *
 * Life stages: Leanward is 18+, but an 18-year-old is in the DRI "14–18" group.
 */
(function (root) {
  'use strict';

  var node = typeof module === 'object' && module.exports;
  var core = node ? require('./core.js') : root.LW.calc.core;

  var VERIFIED = false;
  var STAGES = ['14-18', '19-30', '31-50', '51-70', '71+'];

  // Per nutrient: unit, kind (RDA or AI), targets by sex then stage, pregnancy and lactation by stage
  // (14-18, 19-30, 31-50), the UL by stage (same for both sexes unless noted) and what the UL covers.
  // Stage arrays are [14-18, 19-30, 31-50, 51-70, 71+]; pregnancy/lactation arrays are [14-18, 19-30, 31-50].
  var N = {
    calcium:    { label: 'Calcium', unit: 'mg', kind: 'RDA', m: [1300, 1000, 1000, 1000, 1200], f: [1300, 1000, 1000, 1200, 1200], preg: [1300, 1000, 1000], lact: [1300, 1000, 1000],
                  ul: [3000, 2500, 2500, 2000, 2000], ulPreg: [3000, 2500, 2500], ulScope: 'total' },
    copper:     { label: 'Copper', unit: 'µg', kind: 'RDA', m: [890, 900, 900, 900, 900], f: [890, 900, 900, 900, 900], preg: [1000, 1000, 1000], lact: [1300, 1300, 1300],
                  ul: [8000, 10000, 10000, 10000, 10000], ulPreg: [8000, 10000, 10000], ulScope: 'total' },
    iron:       { label: 'Iron', unit: 'mg', kind: 'RDA', m: [11, 8, 8, 8, 8], f: [15, 18, 18, 8, 8], preg: [27, 27, 27], lact: [10, 9, 9],
                  ul: [45, 45, 45, 45, 45], ulPreg: [45, 45, 45], ulScope: 'total' },
    magnesium:  { label: 'Magnesium', unit: 'mg', kind: 'RDA', m: [410, 400, 420, 420, 420], f: [360, 310, 320, 320, 320], preg: [400, 350, 360], lact: [360, 310, 320],
                  ul: [350, 350, 350, 350, 350], ulPreg: [350, 350, 350], ulScope: 'supplements' },
    phosphorus: { label: 'Phosphorus', unit: 'mg', kind: 'RDA', m: [1250, 700, 700, 700, 700], f: [1250, 700, 700, 700, 700], preg: [1250, 700, 700], lact: [1250, 700, 700],
                  ul: [4000, 4000, 4000, 4000, 3000], ulPreg: [3500, 3500, 3500], ulLact: [4000, 4000, 4000], ulScope: 'total' },
    selenium:   { label: 'Selenium', unit: 'µg', kind: 'RDA', m: [55, 55, 55, 55, 55], f: [55, 55, 55, 55, 55], preg: [60, 60, 60], lact: [70, 70, 70],
                  ul: [400, 400, 400, 400, 400], ulPreg: [400, 400, 400], ulScope: 'total' },
    zinc:       { label: 'Zinc', unit: 'mg', kind: 'RDA', m: [11, 11, 11, 11, 11], f: [9, 8, 8, 8, 8], preg: [12, 11, 11], lact: [13, 12, 12],
                  ul: [34, 40, 40, 40, 40], ulPreg: [34, 40, 40], ulScope: 'total' },
    potassium:  { label: 'Potassium', unit: 'mg', kind: 'AI', m: [3000, 3400, 3400, 3400, 3400], f: [2300, 2600, 2600, 2600, 2600], preg: [2600, 2900, 2900], lact: [2500, 2800, 2800],
                  ul: null, ulScope: 'none' },
    sodium:     { label: 'Sodium', unit: 'mg', kind: 'AI', m: [1500, 1500, 1500, 1500, 1500], f: [1500, 1500, 1500, 1500, 1500], preg: [1500, 1500, 1500], lact: [1500, 1500, 1500],
                  ul: null, ulScope: 'none', limit: 2300, limitKind: 'CDRR' },
    vitaminA:   { label: 'Vitamin A', unit: 'µg RAE', kind: 'RDA', m: [900, 900, 900, 900, 900], f: [700, 700, 700, 700, 700], preg: [750, 770, 770], lact: [1200, 1300, 1300],
                  ul: [2800, 3000, 3000, 3000, 3000], ulPreg: [2800, 3000, 3000], ulScope: 'preformed' },
    vitaminC:   { label: 'Vitamin C', unit: 'mg', kind: 'RDA', m: [75, 90, 90, 90, 90], f: [65, 75, 75, 75, 75], preg: [80, 85, 85], lact: [115, 120, 120],
                  ul: [1800, 2000, 2000, 2000, 2000], ulPreg: [1800, 2000, 2000], ulScope: 'total' },
    vitaminD:   { label: 'Vitamin D', unit: 'µg', kind: 'RDA', m: [15, 15, 15, 15, 20], f: [15, 15, 15, 15, 20], preg: [15, 15, 15], lact: [15, 15, 15],
                  ul: [100, 100, 100, 100, 100], ulPreg: [100, 100, 100], ulScope: 'total' },
    vitaminE:   { label: 'Vitamin E', unit: 'mg', kind: 'RDA', m: [15, 15, 15, 15, 15], f: [15, 15, 15, 15, 15], preg: [15, 15, 15], lact: [19, 19, 19],
                  ul: [800, 1000, 1000, 1000, 1000], ulPreg: [800, 1000, 1000], ulScope: 'supplements' },
    vitaminK:   { label: 'Vitamin K', unit: 'µg', kind: 'AI', m: [75, 120, 120, 120, 120], f: [75, 90, 90, 90, 90], preg: [75, 90, 90], lact: [75, 90, 90],
                  ul: null, ulScope: 'none' },
    thiamin:    { label: 'Thiamin (B1)', unit: 'mg', kind: 'RDA', m: [1.2, 1.2, 1.2, 1.2, 1.2], f: [1.0, 1.1, 1.1, 1.1, 1.1], preg: [1.4, 1.4, 1.4], lact: [1.4, 1.4, 1.4],
                  ul: null, ulScope: 'none' },
    riboflavin: { label: 'Riboflavin (B2)', unit: 'mg', kind: 'RDA', m: [1.3, 1.3, 1.3, 1.3, 1.3], f: [1.0, 1.1, 1.1, 1.1, 1.1], preg: [1.4, 1.4, 1.4], lact: [1.6, 1.6, 1.6],
                  ul: null, ulScope: 'none' },
    niacin:     { label: 'Niacin (B3)', unit: 'mg NE', kind: 'RDA', m: [16, 16, 16, 16, 16], f: [14, 14, 14, 14, 14], preg: [18, 18, 18], lact: [17, 17, 17],
                  ul: [30, 35, 35, 35, 35], ulPreg: [30, 35, 35], ulScope: 'supplements' },
    vitaminB6:  { label: 'Vitamin B6', unit: 'mg', kind: 'RDA', m: [1.3, 1.3, 1.3, 1.7, 1.7], f: [1.2, 1.3, 1.3, 1.5, 1.5], preg: [1.9, 1.9, 1.9], lact: [2.0, 2.0, 2.0],
                  ul: [80, 100, 100, 100, 100], ulPreg: [80, 100, 100], ulScope: 'total' },
    vitaminB12: { label: 'Vitamin B12', unit: 'µg', kind: 'RDA', m: [2.4, 2.4, 2.4, 2.4, 2.4], f: [2.4, 2.4, 2.4, 2.4, 2.4], preg: [2.6, 2.6, 2.6], lact: [2.8, 2.8, 2.8],
                  ul: null, ulScope: 'none' },
    folate:     { label: 'Folate', unit: 'µg DFE', kind: 'RDA', m: [400, 400, 400, 400, 400], f: [400, 400, 400, 400, 400], preg: [600, 600, 600], lact: [500, 500, 500],
                  ul: [800, 1000, 1000, 1000, 1000], ulPreg: [800, 1000, 1000], ulScope: 'folic-acid' },
    choline:    { label: 'Choline', unit: 'mg', kind: 'AI', m: [550, 550, 550, 550, 550], f: [400, 425, 425, 425, 425], preg: [450, 450, 450], lact: [550, 550, 550],
                  ul: [3000, 3500, 3500, 3500, 3500], ulPreg: [3000, 3500, 3500], ulScope: 'total' },
    ala:        { label: 'Omega-3 ALA', unit: 'g', kind: 'AI', m: [1.6, 1.6, 1.6, 1.6, 1.6], f: [1.1, 1.1, 1.1, 1.1, 1.1], preg: [1.4, 1.4, 1.4], lact: [1.3, 1.3, 1.3],
                  ul: null, ulScope: 'none' }
  };

  var UL_NOTES = {
    supplements: 'The upper limit applies to supplements and fortified foods only, not to food.',
    'folic-acid': 'The upper limit applies to folic acid from supplements and fortified foods only, not to folate in food.',
    preformed: 'The upper limit applies to preformed vitamin A (retinol), not to beta-carotene from plants.'
  };

  function stageIndex(age) {
    if (age < 14) throw new Error('DRIs here start at age 14');
    return age <= 18 ? 0 : age <= 30 ? 1 : age <= 50 ? 2 : age <= 70 ? 3 : 4;
  }

  /**
   * Targets for every nutrient.
   * p: { age, sex: 'male' | 'female' | 'unspecified', reproductive?: 'pregnant' | 'lactating' }
   * "Prefer not to say" takes the higher of the male and female targets, so the target is enough
   * for either. (Adult ULs don't differ by sex.)
   * Returns { nutrientId: { label, unit, kind, target, ul, ulNote, limit?, limitKind? } }.
   */
  function targetsFor(p) {
    core.checkSex(p.sex);
    var i = stageIndex(p.age), out = {};
    var repro = p.reproductive === 'pregnant' || p.reproductive === 'lactating' ? p.reproductive : null;
    if (repro && p.age > 50) repro = null;   // DRI pregnancy/lactation groups stop at 50
    var ri = Math.min(i, 2);
    Object.keys(N).forEach(function (id) {
      var n = N[id], target, ul = null;
      if (repro) {
        target = (repro === 'pregnant' ? n.preg : n.lact)[ri];
        var u = repro === 'pregnant' ? n.ulPreg : (n.ulLact || n.ulPreg);
        ul = u ? u[ri] : null;
      } else {
        target = p.sex === 'male' ? n.m[i] : p.sex === 'female' ? n.f[i] : Math.max(n.m[i], n.f[i]);
        ul = n.ul ? n.ul[i] : null;
      }
      out[id] = { label: n.label, unit: n.unit, kind: n.kind, target: target, ul: ul, ulNote: UL_NOTES[n.ulScope] || null };
      if (n.limit) { out[id].limit = n.limit; out[id].limitKind = n.limitKind; }
    });
    return out;
  }

  var api = { VERIFIED: VERIFIED, STAGES: STAGES, NUTRIENTS: N, UL_NOTES: UL_NOTES, stageIndex: stageIndex, targetsFor: targetsFor };
  if (node) module.exports = api;
  else { root.LW.calc.dri = api; }
})(this);
