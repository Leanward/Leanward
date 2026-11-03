#!/usr/bin/env node
/* Converts one unzipped USDA FoodData Central CSV folder into foods.csv for load.sql.
 *   node tools/food-import/import.js <csv folder> <out.csv> [--only branded_food]
 * Prints a JSON report (rows in, kept, dropped by reason, release date, estimated size). */
'use strict';
const fs = require('fs');
const { convert, COLUMNS } = require('./usda.js');
const { csvField } = require('./csv.js');

async function main() {
  const [dir, out] = process.argv.slice(2);
  const i = process.argv.indexOf('--only');
  if (!dir || !out) { console.error('usage: import.js <csv folder> <out.csv> [--only <data_type>]'); process.exit(2); }
  const { rows, stats } = await convert(dir, { onlyTypes: i > 0 ? [process.argv[i + 1]] : null });
  const w = fs.createWriteStream(out);
  w.write(COLUMNS.join(',') + '\n');
  for (const r of rows) w.write(COLUMNS.map((c) => csvField(r[c])).join(',') + '\n');
  await new Promise((res) => w.end(res));
  stats.csvMb = Math.round(fs.statSync(out).size / 1048576 * 10) / 10;
  console.log(JSON.stringify(stats, null, 2));
}
main().catch((e) => { console.error(e.message || e); process.exit(1); });
