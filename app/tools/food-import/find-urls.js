#!/usr/bin/env node
/* Finds the newest FoodData Central CSV download for each dataset on USDA's download page.
 * Prints { foundation: url, sr_legacy: url, survey: url, branded: url }. Node 20+ (global fetch). */
'use strict';
const PAGE = 'https://fdc.nal.usda.gov/download-datasets';
const KINDS = ['foundation_food', 'sr_legacy_food', 'survey_food', 'branded_food'];

/** Newest link per dataset from the page's HTML (dates in the file names sort as text). */
function pick(html) {
  const out = {};
  const re = /https?:\/\/fdc\.nal\.usda\.gov\/fdc-datasets\/FoodData_Central_(foundation_food|sr_legacy_food|survey_food|branded_food)_csv_(\d{4}-\d{2}(?:-\d{2})?)\.zip|\/fdc-datasets\/FoodData_Central_(foundation_food|sr_legacy_food|survey_food|branded_food)_csv_(\d{4}-\d{2}(?:-\d{2})?)\.zip/g;
  let m;
  while ((m = re.exec(html))) {
    const kind = m[1] || m[3], date = m[2] || m[4];
    const url = 'https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_' + kind + '_csv_' + date + '.zip';
    if (!out[kind] || out[kind].date < date) out[kind] = { url, date };
  }
  return out;
}

async function main() {
  const res = await fetch(PAGE, { headers: { 'User-Agent': 'Leanward food import (github.com/Leanward/leanward.github.io)' } });
  if (!res.ok) throw new Error('USDA download page returned ' + res.status);
  const found = pick(await res.text());
  const missing = KINDS.filter((k) => !found[k]);
  if (missing.length) throw new Error('Could not find download links for: ' + missing.join(', ') + '. USDA may have changed its download page; update the pattern in tools/food-import/find-urls.js.');
  console.log(JSON.stringify(found, null, 2));
}
if (require.main === module) main().catch((e) => { console.error(e.message); process.exit(1); });
module.exports = { pick, KINDS };
