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
  function estimate(p) {
    var a = activityById(p.activity);
    var b = (p.useBodyFat && p.bodyFatPct != null) ? bmrKatch(p) : bmrMifflin(p);
    var tdee = core.round(b.kcal * a.factor);
    return {
      method: b.method, bmr: b.kcal, tdee: tdee, activity: a.id, activityFactor: a.factor, leanKg: b.leanKg,
      steps: b.steps.concat(['Maintenance: ' + fmt(b.kcal) + ' kcal BMR × ' + a.factor + ' (' + a.label.toLowerCase() + ') = ' + fmt(tdee) + ' kcal a day'])
    };
  }

  var api = { SEX_CONSTANT: SEX_CONSTANT, ACTIVITY: ACTIVITY, activityById: activityById, bmrMifflin: bmrMifflin, bmrKatch: bmrKatch, estimate: estimate };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else { root.LW.calc.energy = api; }
})(this);
