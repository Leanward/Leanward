/* M1 calculation engine: core helpers and energy (PRD §8.1). Every expected value is worked by hand
 * in the comment next to it. */
const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../js/calc/core.js');
const energy = require('../js/calc/energy.js');

test('rounding: halves go away from zero, steps work, float noise is cleaned', () => {
  assert.equal(core.round(2.5), 3);
  assert.equal(core.round(-2.5), -3);
  assert.equal(core.round(2.675, 0.01), 2.68);   // 2.675 is stored as 2.67499…; still 2.68
  assert.equal(core.round(2314, 10), 2310);
  assert.equal(core.round(2315, 10), 2320);
  assert.equal(core.round(0.1 + 0.2, 0.1), 0.3);
  assert.equal(core.ceilTo(1757, 10), 1760);
  assert.equal(core.ceilTo(1760, 10), 1760);
});

test('units: exact pound and inch definitions', () => {
  assert.equal(core.lbToKg(1), 0.45359237);
  assert.ok(Math.abs(core.kgToLb(core.lbToKg(194.2)) - 194.2) < 1e-9);
  assert.ok(Math.abs(core.ftInToCm(5, 11) - 180.34) < 1e-9);        // 71 in × 2.54
  assert.deepEqual(core.cmToFtIn(175), { ft: 5, in: 9 });            // 68.9 in → 69 → 5′9″
  assert.deepEqual(core.cmToFtIn(182.6), { ft: 6, in: 0 });          // 71.9 in → 72 → 6′0″ (carried)
  assert.ok(Math.abs(core.flOzToMl(12) - 354.88235475) < 1e-6);
});

test('dates: age counts the birthday on the day itself', () => {
  assert.equal(core.ageOn('2008-11-03', '2026-11-03'), 18);
  assert.equal(core.ageOn('2008-11-04', '2026-11-03'), 17);
  assert.equal(core.ageOn('2000-02-29', '2026-02-28'), 25);          // leap-day birthday not reached yet
  assert.equal(core.addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(core.daysBetween('2026-11-01', '2026-11-15'), 14);
  assert.throws(() => core.parseDate('11/03/2026'));
});

test('formatting for explanations', () => {
  assert.equal(core.fmt(2759.4), '2,759');
  assert.equal(core.fmt(80.25, 1), '80.3');
  assert.equal(core.fmt(-0.4), '0');              // no "−0" on screen
  assert.equal(core.fmtSigned(-0.4009, 2), '−0.40');
  assert.equal(core.fmtSigned(0.37, 2), '+0.37');
});

test('BMI and the weight at a BMI', () => {
  assert.ok(Math.abs(core.bmi(80, 180) - 24.691) < 0.001);           // 80 ÷ 1.8²
  assert.ok(Math.abs(core.weightAtBmi(27.5, 172) - 81.356) < 0.001); // 27.5 × 1.72²
});

test('Mifflin-St Jeor: male, female and the "prefer not to say" midpoint', () => {
  // 10×80 + 6.25×180 − 5×31 + 5 = 800 + 1125 − 155 + 5 = 1775
  assert.equal(energy.bmrMifflin({ kg: 80, cm: 180, age: 31, sex: 'male' }).kcal, 1775);
  // 10×70 + 6.25×165 − 5×34 − 161 = 700 + 1031.25 − 170 − 161 = 1400.25 → 1400
  assert.equal(energy.bmrMifflin({ kg: 70, cm: 165, age: 34, sex: 'female' }).kcal, 1400);
  // 10×95 + 6.25×172 − 5×38 − 78 = 950 + 1075 − 190 − 78 = 1757
  const u = energy.bmrMifflin({ kg: 95, cm: 172, age: 38, sex: 'unspecified' });
  assert.equal(u.kcal, 1757);
  assert.match(u.steps[0], /− 78 \(midpoint/);
  assert.equal(energy.SEX_CONSTANT.unspecified, (5 + -161) / 2);
});

test('Katch-McArdle from body-fat %', () => {
  // lean = 80 × (1 − 0.15) = 68 kg; 370 + 21.6 × 68 = 370 + 1468.8 = 1838.8 → 1839
  const k = energy.bmrKatch({ kg: 80, bodyFatPct: 15 });
  assert.equal(k.kcal, 1839);
  assert.ok(Math.abs(k.leanKg - 68) < 1e-9);
  assert.throws(() => energy.bmrKatch({ kg: 80, bodyFatPct: 0 }));
});

test('maintenance = BMR × activity factor, with the working', () => {
  // 1775 × 1.55 = 2751.25 → 2751
  const e = energy.estimate({ kg: 80, cm: 180, age: 31, sex: 'male', activity: 'moderate' });
  assert.equal(e.bmr, 1775);
  assert.equal(e.tdee, 2751);
  assert.equal(e.steps[1], 'Maintenance: 1,775 kcal BMR × 1.55 (moderately active) = 2,751 kcal a day');
  // Each factor in §8.1
  assert.deepEqual(energy.ACTIVITY.map((a) => a.factor), [1.2, 1.375, 1.55, 1.725, 1.9]);
  // Body fat is only used when the user says they trust it.
  assert.equal(energy.estimate({ kg: 80, cm: 180, age: 31, sex: 'male', activity: 'sedentary', bodyFatPct: 15 }).method, 'mifflin');
  // 1839 × 1.2 = 2206.8 → 2207
  assert.equal(energy.estimate({ kg: 80, cm: 180, age: 31, sex: 'male', activity: 'sedentary', bodyFatPct: 15, useBodyFat: true }).tdee, 2207);
});

test('bad inputs are refused instead of producing a number', () => {
  assert.throws(() => energy.bmrMifflin({ kg: 80, cm: 180, age: 31, sex: 'm' }));
  assert.throws(() => energy.bmrMifflin({ kg: -1, cm: 180, age: 31, sex: 'male' }));
  assert.throws(() => energy.estimate({ kg: 80, cm: 180, age: 31, sex: 'male', activity: 'couch' }));
});

test('ONB-10: a known maintenance replaces the formula, with the working and the floor kept', () => {
  // Alex's formula: BMR 1,775, maintenance 2,751. He knows his maintenance is 2,200 from tracking.
  const e = energy.estimate({ kg: 80, cm: 180, age: 31, sex: 'male', activity: 'moderate', knownTdee: 2200, knownTdeeSource: 'tracking' });
  assert.equal(e.source, 'known-tdee');
  assert.equal(e.tdee, 2200);
  assert.equal(e.bmr, 1775, 'the floor still uses the formula BMR');
  assert.equal(e.formulaTdee, 2751);
  assert.equal(e.steps[0], 'Maintenance: 2,200 kcal a day, entered by you (from tracking your intake and weight)');
  assert.deepEqual(e.warnings, []);   // 2,200 is within 25% of 2,751 and well above the BMR
});

test('ONB-10: a measured BMR is multiplied by the activity level', () => {
  // 1,650 × 1.55 = 2,557.5 → 2,558
  const e = energy.estimate({ kg: 80, cm: 180, age: 31, sex: 'male', activity: 'moderate', knownBmr: 1650, knownBmrSource: 'scan' });
  assert.equal(e.source, 'known-bmr');
  assert.deepEqual([e.bmr, e.tdee], [1650, 2558]);
  assert.match(e.steps[0], /measured \(body composition scan\)/);
});

test('ONB-10 checks: a BMR typed as maintenance, a maintenance typed as BMR, and far-off numbers', () => {
  const base = { kg: 80, cm: 180, age: 31, sex: 'male', activity: 'moderate' };
  // 1,900 ≤ 1,775 × 1.15 = 2,041 → probably a BMR
  assert.deepEqual(energy.estimate(Object.assign({ knownTdee: 1900 }, base)).warnings.map((w) => w.id), ['looks-like-bmr']);
  // 3,600 is 31% above 2,751
  assert.deepEqual(energy.estimate(Object.assign({ knownTdee: 3600 }, base)).warnings.map((w) => w.id), ['far-from-estimate']);
  // A "BMR" of 3,000 is 69% above 1,775 and over 1.6 × → probably a maintenance
  assert.deepEqual(energy.estimate(Object.assign({ knownBmr: 3000 }, base)).warnings.map((w) => w.id), ['far-from-estimate', 'looks-like-tdee']);
  // Warnings never block, but impossible numbers do.
  assert.throws(() => energy.estimate(Object.assign({ knownTdee: 500 }, base)), /between 1,000 and 6,000/);
  assert.throws(() => energy.estimate(Object.assign({ knownBmr: 9000 }, base)), /between 800 and 4,000/);
});
