/* M1 calculation engine: weight trend, weekly average and rate (PRD §8.5), estimated 1RM (§8.7),
 * alcohol (§8.9) and the whole plan (ONB-7). Every expected value is worked by hand next to it. */
const test = require('node:test');
const assert = require('node:assert/strict');
const W = require('../js/calc/trend.js');
const S = require('../js/calc/strength.js');
const A = require('../js/calc/alcohol.js');
const P = require('../js/calc/plan.js');

const close = (a, b, tol = 1e-6) => assert.ok(Math.abs(a - b) < tol, `${a} ≉ ${b}`);

test('trend: α = 0.1, first weigh-in of the day, gaps carried forward', () => {
  const s = W.trendSeries([
    { date: '2026-11-01', kg: 80 },
    { date: '2026-11-03', kg: 79.4, at: '19:30' },
    { date: '2026-11-03', kg: 79, at: '07:10' },     // earlier the same day: this one counts
    { date: '2026-11-04', kg: 78.5 }
  ]);
  // day 1: 80 (seed); day 2: no weigh-in → 80; day 3: 80 + 0.1 × (79 − 80) = 79.9; day 4: 79.9 + 0.1 × (78.5 − 79.9) = 79.76
  assert.deepEqual(s.map((d) => d.date), ['2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04']);
  assert.equal(s[1].kg, null);
  close(s[1].trendKg, 80);
  close(s[2].trendKg, 79.9);
  close(s[3].trendKg, 79.76);
});

test('trend runs on to a chosen end date without inventing weigh-ins', () => {
  const s = W.trendSeries([{ date: '2026-11-01', kg: 80 }], { endDate: '2026-11-05' });
  assert.equal(s.length, 5);
  assert.ok(s.every((d) => d.trendKg === 80));
  assert.deepEqual(W.trendSeries([]), []);
});

test('weekly average: Monday to Sunday by default, Sunday-first on request', () => {
  // 2026-11-01 is a Sunday; 2026-11-02 a Monday.
  const e = [{ date: '2026-11-01', kg: 81 }, { date: '2026-11-02', kg: 80 }, { date: '2026-11-04', kg: 79 }, { date: '2026-11-08', kg: 78 }];
  // Monday weeks: 10-26 week = [81]; 11-02 week = [80, 79, 78] → 79
  assert.deepEqual(W.weeklyAverages(e), [{ weekStart: '2026-10-26', avgKg: 81, count: 1 }, { weekStart: '2026-11-02', avgKg: 79, count: 3 }]);
  // Sunday weeks: 11-01 week = [81, 80, 79] → 80; 11-08 week = [78]
  assert.deepEqual(W.weeklyAverages(e, { weekStartsOn: 0 }), [{ weekStart: '2026-11-01', avgKg: 80, count: 3 }, { weekStart: '2026-11-08', avgKg: 78, count: 1 }]);
});

test('rate of change: slope of the last 14 days of trend', () => {
  // A trend falling exactly 0.1 kg a day from 80: slope −0.1/day = −0.7 kg a week.
  const series = [];
  for (let i = 0; i < 20; i++) series.push({ date: `2026-11-${String(i + 1).padStart(2, '0')}`, kg: null, trendKg: 80 - 0.1 * i });
  const r = W.rateOfChange(series);
  close(r.kgPerWeek, -0.7);
  // latest trend 80 − 1.9 = 78.1; −0.7 ÷ 78.1 = −0.896%
  close(r.pctPerWeek, -0.7 / 78.1 * 100);
  assert.equal(r.fromDate, '2026-11-06');   // 15 points: day 6 to day 20
  assert.equal(r.toDate, '2026-11-20');
  // Fewer than 14 days: no rate yet.
  assert.equal(W.rateOfChange(series.slice(0, 14)), null);
});

test('estimated 1RM matches PR Forge (Epley, 1 rep = the weight, ≤ 12 reps)', () => {
  // 100 × (1 + 5 ÷ 30) = 116.667
  close(S.e1rm(100, 5).e1rm, 116.6666667, 1e-6);
  assert.equal(S.e1rm(100, 1).e1rm, 100);
  // 12 reps: 100 × 1.4 = 140; 13 reps: not used
  close(S.e1rm(100, 12).e1rm, 140);
  assert.equal(S.e1rm(100, 13), null);
  assert.equal(S.e1rm(0, 5), null);
  assert.equal(S.e1rm(100, 2.5), null);
});

test('alcohol: the three US standard-drink examples are each about 14 g', () => {
  // 12 oz beer at 5%: 354.88 ml × 0.05 × 0.789 = 14.0 g → 1.0 drink, 98 kcal
  const beer = A.drink(354.88235475, 5);
  close(beer.grams, 14.0001, 1e-3);
  close(beer.standardDrinks, 1.0, 1e-3);
  close(beer.kcal, 98.0, 0.01);
  // 5 oz wine at 12%: 147.87 × 0.12 × 0.789 = 14.0 g; 1.5 oz spirits at 40%: 44.36 × 0.40 × 0.789 = 14.0 g
  close(A.drink(147.867647813, 12).grams, 14.0, 0.01);
  close(A.drink(44.360294344, 40).grams, 14.0, 0.01);
});

test('alcohol daily limit: guideline defaults, user choice 0–3, and 0 when pregnant', () => {
  assert.equal(A.dailyLimit({ sex: 'male' }).drinks, 2);
  assert.equal(A.dailyLimit({ sex: 'female' }).drinks, 1);
  assert.equal(A.dailyLimit({ sex: 'unspecified' }).drinks, 1);
  assert.equal(A.dailyLimit({ sex: 'male', userLimit: 0 }).drinks, 0);
  assert.throws(() => A.dailyLimit({ sex: 'male', userLimit: 4 }));
  assert.equal(A.dailyLimit({ sex: 'female', userLimit: 2, pregnantOrBreastfeeding: true }).drinks, 0);
});

test('plan: Alex\'s full working for a 0.5% cut, in order', () => {
  const r = P.plan({ dob: '1995-06-15', sex: 'male', kg: 80, cm: 180, activity: 'moderate' }, { phase: 'cut', rate: 0.5 }, '2026-11-03');
  assert.equal(r.age, 31);
  assert.equal(r.calories.kcal, 2310);
  assert.deepEqual([r.macros.proteinG, r.macros.fatG, r.macros.carbsG, r.macros.fiberG], [176, 69, 246, 32]);
  assert.equal(r.calcVersion, '1.0.0');
  assert.deepEqual(r.steps.slice(0, 4), [
    'BMR (Mifflin-St Jeor): 10 × 80.0 kg + 6.25 × 180 cm − 5 × 31 years + 5 = 1,775 kcal',
    'Maintenance: 1,775 kcal BMR × 1.55 (moderately active) = 2,751 kcal a day',
    'Deficit for 0.5% a week: 0.5% × 80.0 kg × 7,700 kcal ÷ 7 days = 440 kcal a day',
    'Before rounding: 2,751 − 440 = 2,311 kcal'
  ]);
});

test('plan: under 18 is refused', () => {
  assert.throws(() => P.plan({ dob: '2008-11-04', sex: 'male', kg: 70, cm: 175, activity: 'light' }, { phase: 'maintenance' }, '2026-11-03'), /18 and over/);
  assert.equal(P.plan({ dob: '2008-11-03', sex: 'male', kg: 70, cm: 175, activity: 'light' }, { phase: 'maintenance' }, '2026-11-03').age, 18);
});

test('calc modules are pure: no DOM, network, storage or clock', () => {
  const fs = require('fs'), path = require('path');
  const dir = path.join(__dirname, '..', 'js', 'calc');
  fs.readdirSync(dir).forEach((f) => {
    // Code only: comments may mention the browser (e.g. how the file is loaded).
    const src = fs.readFileSync(path.join(dir, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    assert.doesNotMatch(src, /\b(document|window|localStorage|fetch|XMLHttpRequest|Date\.now|new Date\(\))\b/, `${f} must stay pure`);
  });
});
