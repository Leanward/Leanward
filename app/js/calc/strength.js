/* Leanward calculation engine — strength (PRD §8.7).
 *
 * Estimated 1RM (Epley 1985): weight × (1 + reps ÷ 30), only for sets of 12 reps or fewer.
 * A single rep is the weight itself. This matches PR Forge's js/metrics.js, so both apps show the
 * same estimate for the same set.
 */
(function (root) {
  'use strict';

  var node = typeof module === 'object' && module.exports;
  var core = node ? require('./core.js') : root.LW.calc.core;

  var MAX_REPS = 12;

  /** Returns { e1rm, steps } in the same unit as `weight`, or null if the set can't be used. */
  function e1rm(weight, reps) {
    if (!(weight > 0) || !(reps > 0) || Math.floor(reps) !== reps) return null;
    if (reps > MAX_REPS) return null;
    var est = reps === 1 ? weight : weight * (1 + reps / 30);
    return {
      e1rm: est,
      steps: [reps === 1
        ? 'Estimated 1RM: a single rep, so ' + core.fmt(weight, 1)
        : 'Estimated 1RM (Epley): ' + core.fmt(weight, 1) + ' × (1 + ' + reps + ' ÷ 30) = ' + core.fmt(est, 1)]
    };
  }

  var api = { MAX_REPS: MAX_REPS, e1rm: e1rm };
  if (node) module.exports = api;
  else { root.LW.calc.strength = api; }
})(this);
