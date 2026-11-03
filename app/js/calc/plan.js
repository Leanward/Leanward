/* Leanward calculation engine — the whole plan for a profile and phase, with the working (ONB-7).
 *
 * plan() runs energy → safety → calorie target → macros and returns every number plus one list of
 * plain-language steps for the targets screen ("BMR 1,780 × 1.55 = 2,759 maintenance − 440 = 2,320").
 */
(function (root) {
  'use strict';

  var node = typeof module === 'object' && module.exports;
  var C = node ? {
    core: require('./core.js'), energy: require('./energy.js'), targets: require('./targets.js'), macros: require('./macros.js')
  } : root.LW.calc;

  var MIN_AGE = 18;

  /**
   * profile: { dob: 'YYYY-MM-DD', sex, kg, cm, activity, bodyFatPct?, useBodyFat?, pregnantOrBreastfeeding?,
   *            knownBmr?, knownBmrSource?, knownTdee?, knownTdeeSource? }   (ONB-10)
   * choice: { phase, rate? }
   * today: 'YYYY-MM-DD' (passed in so results never depend on the device clock)
   */
  function plan(profile, choice, today) {
    var age = C.core.ageOn(profile.dob, today);
    if (age < MIN_AGE) throw new Error('Leanward is for adults 18 and over.');
    var p = {
      kg: profile.kg, cm: profile.cm, age: age, sex: profile.sex, activity: profile.activity,
      bodyFatPct: profile.bodyFatPct, useBodyFat: profile.useBodyFat, pregnantOrBreastfeeding: !!profile.pregnantOrBreastfeeding,
      knownBmr: profile.knownBmr, knownBmrSource: profile.knownBmrSource, knownTdee: profile.knownTdee, knownTdeeSource: profile.knownTdeeSource
    };
    var e = C.energy.estimate(p);
    var base = { kg: p.kg, cm: p.cm, sex: p.sex, bmr: e.bmr, tdee: e.tdee, pregnantOrBreastfeeding: p.pregnantOrBreastfeeding };
    var options = C.targets.phaseOptions(base);
    var cal = C.targets.calorieTarget(Object.assign({}, base, { phase: choice.phase, rate: choice.rate }));
    var mac = C.macros.macroTargets({ phase: choice.phase, kcal: cal.kcal, kg: p.kg, cm: p.cm });
    return {
      calcVersion: C.core.CALC_VERSION, date: today, age: age, bmi: C.core.bmi(p.kg, p.cm),
      bmrMethod: e.method, energySource: e.source, bmr: e.bmr, tdee: e.tdee, formulaTdee: e.formulaTdee, energyWarnings: e.warnings, phaseOptions: options,
      calories: cal, macros: mac,
      steps: e.steps.concat(cal.steps, mac.steps)
    };
  }

  var api = { MIN_AGE: MIN_AGE, plan: plan };
  if (node) module.exports = api;
  else { root.LW.calc.plan = api; }
})(this);
