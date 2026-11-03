/* Leanward calculation engine — energy expenditure (PRD §8.1).
 *
 * BMR: Mifflin-St Jeor by default; Katch-McArdle when the user enters a body-fat % they trust.
 * Maintenance (TDEE) = BMR × activity factor. The activity descriptions include training, so
 * training sessions are never added on top (§8.1, §15 Q8).
 * Every function returns its numbers plus `steps`: the working, in plain words, for the UI (ONB-7).
 */
(function (root) {
  'use strict';

  var core = (typeof module === 'object' && module.exports) ? require('./core.js') : root.LW.calc.core;
  var fmt = core.fmt;

  // Mifflin-St Jeor sex constants. "Prefer not to say" uses the midpoint of +5 and −161.
  var SEX_CONSTANT = { male: 5, female: -161, unspecified: -78 };

  // Wording matches the prototype (prototype/app/index.html). Training is part of the level, never added on top.
  var ACTIVITY = [
    { id: 'sedentary', label: 'Sedentary', factor: 1.2, description: 'Desk job, little walking, no workouts' },
    { id: 'light', label: 'Lightly active', factor: 1.375, description: 'Desk job plus 1–3 workouts a week, or on your feet part of the day' },
    { id: 'moderate', label: 'Moderately active', factor: 1.55, description: 'Desk job plus 3–5 workouts a week, or an on-your-feet job' },
    { id: 'very', label: 'Very active', factor: 1.725, description: 'Hard training 6–7 days a week, or a physical job plus training' },
    { id: 'extreme', label: 'Extremely active', factor: 1.9, description: 'Physical job plus hard daily training' }
  ];
  function activityById(id) {
    for (var i = 0; i < ACTIVITY.length; i++) if (ACTIVITY[i].id === id) return ACTIVITY[i];
    throw new Error('Unknown activity level: ' + id);
  }

  /** Mifflin-St Jeor: 10·kg + 6.25·cm − 5·age + s. */
  function bmrMifflin(p) {
    core.checkPositive('weight', p.kg); core.checkPositive('height', p.cm); core.checkPositive('age', p.age); core.checkSex(p.sex);
    var s = SEX_CONSTANT[p.sex];
    // Rounded to whole kcal here, so the working shown on screen adds up exactly (as in the prototype).
    var kcal = core.round(10 * p.kg + 6.25 * p.cm - 5 * p.age + s);
    var sexNote = p.sex === 'unspecified' ? ' (midpoint, since sex wasn\'t given)' : '';
    return {
      method: 'mifflin', kcal: kcal,
      steps: ['BMR (Mifflin-St Jeor): 10 × ' + fmt(p.kg, 1) + ' kg + 6.25 × ' + fmt(p.cm) + ' cm − 5 × ' + p.age + ' years ' +
        (s < 0 ? '− ' + Math.abs(s) : '+ ' + s) + sexNote + ' = ' + fmt(kcal) + ' kcal']
    };
  }

  /** Katch-McArdle: 370 + 21.6 · lean mass (kg). */
  function bmrKatch(p) {
    core.checkPositive('weight', p.kg);
    if (!(p.bodyFatPct > 0 && p.bodyFatPct < 70)) throw new Error('body-fat % must be between 0 and 70');
    var lean = p.kg * (1 - p.bodyFatPct / 100);
    var kcal = core.round(370 + 21.6 * lean);
    return {
      method: 'katch', kcal: kcal, leanKg: lean,
      steps: [
        'Lean mass: ' + fmt(p.kg, 1) + ' kg × (1 − ' + fmt(p.bodyFatPct, 1) + '% body fat) = ' + fmt(lean, 1) + ' kg',
        'BMR (Katch-McArdle): 370 + 21.6 × ' + fmt(lean, 1) + ' kg lean mass = ' + fmt(kcal) + ' kcal'
      ]
    };
  }

  /**
   * BMR and maintenance for a profile.
   * p: { kg, cm, age, sex, activity, bodyFatPct?, useBodyFat? }
   * Katch-McArdle is used only when useBodyFat is true and a body-fat % is given.
   */
  var KNOWN_SOURCES = {
    bmr: { scan: 'body composition scan', calorimetry: 'metabolic test', other: 'your own source' },
    tdee: { tracking: 'tracking your intake and weight', coach: 'your coach or dietitian', other: 'your own source' }
  };
  var KNOWN_RANGE = { bmr: [800, 4000], tdee: [1000, 6000] };

  /**
   * BMR and maintenance for a profile.
   * p: { kg, cm, age, sex, activity, bodyFatPct?, useBodyFat?, knownBmr?, knownBmrSource?, knownTdee?, knownTdeeSource? }
   * Katch-McArdle is used only when useBodyFat is true and a body-fat % is given.
   * A measured BMR/RMR replaces the formula BMR; a known maintenance replaces the TDEE (ONB-10, §8.1).
   * The formula numbers are always returned too (formulaBmr, formulaTdee) for comparison, and
   * `warnings` holds the checks on entered numbers (never blocks).
   */
  function estimate(p) {
    var a = activityById(p.activity);
    var b = (p.useBodyFat && p.bodyFatPct != null) ? bmrKatch(p) : bmrMifflin(p);
    var formulaTdee = core.round(b.kcal * a.factor);
    var res = { method: b.method, source: 'formula', bmr: b.kcal, tdee: formulaTdee, formulaBmr: b.kcal, formulaTdee: formulaTdee, activity: a.id, activityFactor: a.factor, leanKg: b.leanKg, warnings: [] };

    if (p.knownTdee != null) {
      checkRange('maintenance', p.knownTdee, KNOWN_RANGE.tdee);
      var src = KNOWN_SOURCES.tdee[p.knownTdeeSource] || KNOWN_SOURCES.tdee.other;
      res.source = 'known-tdee'; res.tdee = core.round(p.knownTdee);
      res.steps = ['Maintenance: ' + fmt(res.tdee) + ' kcal a day, entered by you (from ' + src + ')',
        'For comparison, the formula estimate was ' + fmt(formulaTdee) + ' kcal (' + b.steps[b.steps.length - 1].replace(/^BMR \(([^)]+)\).*= ([\d,]+) kcal$/, '$1 BMR $2') + ' × ' + a.factor + ')',
        'Safety floor uses the formula BMR (' + fmt(b.kcal) + ' kcal)'];
      // A BMR typed as maintenance is the likeliest way to under-feed: scans report resting BMR.
      if (res.tdee <= b.kcal * 1.15) res.warnings.push({ id: 'looks-like-bmr', message: 'That\'s close to your estimated resting BMR (' + fmt(b.kcal) + ' kcal). Body composition scans usually report BMR, not maintenance. If this number came from a scan, enter it as a measured BMR instead, so your activity is added.' });
      else if (Math.abs(res.tdee - formulaTdee) / formulaTdee > 0.25) res.warnings.push({ id: 'far-from-estimate', message: 'That\'s more than 25% ' + (res.tdee < formulaTdee ? 'below' : 'above') + ' the formula estimate (' + fmt(formulaTdee) + ' kcal). Double-check it; if it\'s right, keep it.' });
      return res;
    }
    if (p.knownBmr != null) {
      checkRange('BMR', p.knownBmr, KNOWN_RANGE.bmr);
      var bs = KNOWN_SOURCES.bmr[p.knownBmrSource] || KNOWN_SOURCES.bmr.other;
      res.source = 'known-bmr'; res.bmr = core.round(p.knownBmr); res.tdee = core.round(res.bmr * a.factor);
      res.steps = ['BMR: ' + fmt(res.bmr) + ' kcal, measured (' + bs + '), entered by you',
        'Maintenance: ' + fmt(res.bmr) + ' kcal BMR × ' + a.factor + ' (' + a.label.toLowerCase() + ') = ' + fmt(res.tdee) + ' kcal a day',
        'For comparison, the formula estimate was ' + fmt(formulaTdee) + ' kcal'];
      if (Math.abs(res.bmr - b.kcal) / b.kcal > 0.25) res.warnings.push({ id: 'far-from-estimate', message: 'That BMR is more than 25% ' + (res.bmr < b.kcal ? 'below' : 'above') + ' the formula estimate (' + fmt(b.kcal) + ' kcal). Double-check it; if it\'s right, keep it.' });
      if (res.bmr > b.kcal * 1.6) res.warnings.push({ id: 'looks-like-tdee', message: 'That\'s high for a resting BMR. If it\'s your maintenance (what you burn in a normal day), enter it as maintenance instead, so activity isn\'t added twice.' });
      return res;
    }
    res.steps = b.steps.concat(['Maintenance: ' + fmt(b.kcal) + ' kcal BMR × ' + a.factor + ' (' + a.label.toLowerCase() + ') = ' + fmt(formulaTdee) + ' kcal a day']);
    return res;
  }
  function checkRange(name, v, r) {
    if (!(typeof v === 'number' && isFinite(v) && v >= r[0] && v <= r[1])) throw new Error('Your ' + name + ' should be between ' + fmt(r[0]) + ' and ' + fmt(r[1]) + ' kcal');
  }

  var api = { SEX_CONSTANT: SEX_CONSTANT, ACTIVITY: ACTIVITY, KNOWN_SOURCES: KNOWN_SOURCES, KNOWN_RANGE: KNOWN_RANGE, activityById: activityById, bmrMifflin: bmrMifflin, bmrKatch: bmrKatch, estimate: estimate };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else { root.LW.calc.energy = api; }
})(this);
