/* Leanward calculation engine — alcohol (PRD §8.9, LOG-14).
 *
 * A US standard drink is 14 g of alcohol. Alcohol has 7 kcal per gram; those calories count toward
 * the day's total but not toward protein, carbs or fat. Ethanol density: 0.789 g/ml.
 * Default daily limit (Dietary Guidelines for Americans 2020–2025): up to 2 drinks for men and 1 for
 * women, "less is better". "Prefer not to say" defaults to 1. Pregnant or breastfeeding: 0.
 */
(function (root) {
  'use strict';

  var node = typeof module === 'object' && module.exports;
  var core = node ? require('./core.js') : root.LW.calc.core;
  var fmt = core.fmt;

  var G_PER_STANDARD_DRINK = 14;
  var KCAL_PER_G = 7;
  var ETHANOL_G_PER_ML = 0.789;
  var DEFAULT_LIMIT = { male: 2, female: 1, unspecified: 1 };
  var MAX_USER_LIMIT = 3;

  /** Grams of alcohol in a drink. volumeMl and abvPct (e.g. 5 for 5%). */
  function grams(volumeMl, abvPct) {
    core.checkPositive('volume', volumeMl);
    if (!(abvPct >= 0 && abvPct <= 100)) throw new Error('ABV must be between 0 and 100%');
    return volumeMl * abvPct / 100 * ETHANOL_G_PER_ML;
  }

  /** { grams, standardDrinks, kcal, steps } for a drink. */
  function drink(volumeMl, abvPct) {
    var g = grams(volumeMl, abvPct), sd = g / G_PER_STANDARD_DRINK, kcal = g * KCAL_PER_G;
    return {
      grams: g, standardDrinks: sd, kcal: kcal,
      steps: [
        'Alcohol: ' + fmt(volumeMl) + ' ml × ' + fmt(abvPct, 1) + '% × 0.789 g/ml = ' + fmt(g, 1) + ' g',
        'Standard drinks: ' + fmt(g, 1) + ' g ÷ 14 g = ' + fmt(sd, 1),
        'Calories from alcohol: ' + fmt(g, 1) + ' g × 7 kcal = ' + fmt(kcal) + ' kcal (not counted as protein, carbs or fat)'
      ]
    };
  }

  /**
   * The daily limit in standard drinks.
   * p: { sex, pregnantOrBreastfeeding?, userLimit? (0–3) }
   */
  function dailyLimit(p) {
    core.checkSex(p.sex);
    if (p.pregnantOrBreastfeeding) return { drinks: 0, source: 'pregnancy', note: 'No amount of alcohol is known to be safe while pregnant or breastfeeding.' };
    if (p.userLimit != null) {
      if (!(p.userLimit >= 0 && p.userLimit <= MAX_USER_LIMIT) || Math.floor(p.userLimit) !== p.userLimit) throw new Error('The daily limit must be a whole number from 0 to 3');
      return { drinks: p.userLimit, source: 'user', note: 'Your own limit.' };
    }
    return { drinks: DEFAULT_LIMIT[p.sex], source: 'guidelines', note: 'Dietary Guidelines for Americans: up to ' + DEFAULT_LIMIT[p.sex] + ' a day, and less is better.' };
  }

  var api = { G_PER_STANDARD_DRINK: G_PER_STANDARD_DRINK, KCAL_PER_G: KCAL_PER_G, ETHANOL_G_PER_ML: ETHANOL_G_PER_ML, DEFAULT_LIMIT: DEFAULT_LIMIT, grams: grams, drink: drink, dailyLimit: dailyLimit };
  if (node) module.exports = api;
  else { root.LW.calc.alcohol = api; }
})(this);
