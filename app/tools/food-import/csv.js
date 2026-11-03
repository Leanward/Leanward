/* Streaming CSV reader for USDA FoodData Central files (RFC 4180: quoted fields, "" escapes,
 * commas and newlines inside quotes). Reads big files a chunk at a time and calls onRow(object)
 * with fields named by the header row. No dependencies. */
'use strict';
const fs = require('fs');

function parser(onRecord) {
  let field = '', rec = [], quoted = false, afterQuote = false;
  return {
    push(chunk) {
      for (let i = 0; i < chunk.length; i++) {
        const c = chunk[i];
        if (quoted) {
          if (c === '"') { if (chunk[i + 1] === '"') { field += '"'; i++; } else if (i + 1 === chunk.length) { quoted = false; afterQuote = true; } else { quoted = false; } }
          else field += c;
          continue;
        }
        if (afterQuote && c === '"') { field += '"'; quoted = true; afterQuote = false; continue; }   // "" split across chunks
        afterQuote = false;
        if (c === '"') { quoted = true; continue; }
        if (c === ',') { rec.push(field); field = ''; continue; }
        if (c === '\n') { rec.push(field.endsWith('\r') ? field.slice(0, -1) : field); onRecord(rec); rec = []; field = ''; continue; }
        field += c;
      }
    },
    end() { if (field !== '' || rec.length) { rec.push(field.endsWith('\r') ? field.slice(0, -1) : field); onRecord(rec); } }
  };
}

/** Resolves when done. onRow gets { column: value } for each data row. */
function readCsv(file, onRow) {
  return new Promise((resolve, reject) => {
    let header = null;
    const p = parser((rec) => {
      if (!header) { header = rec.map((h) => h.replace(/^﻿/, '').trim()); return; }
      if (rec.length === 1 && rec[0] === '') return;
      const o = {};
      for (let i = 0; i < header.length; i++) o[header[i]] = rec[i] === undefined ? '' : rec[i];
      onRow(o);
    });
    const s = fs.createReadStream(file, { encoding: 'utf8', highWaterMark: 1 << 20 });
    s.on('data', (c) => p.push(c));
    s.on('end', () => { p.end(); resolve(); });
    s.on('error', reject);
  });
}

/** One CSV field for PostgreSQL COPY ... CSV. */
function csvField(v) {
  if (v === null || v === undefined) return '';
  const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
  return /[",\n\r]/.test(s) || s === '' ? '"' + s.replace(/"/g, '""') + '"' : s;
}

module.exports = { parser, readCsv, csvField };
