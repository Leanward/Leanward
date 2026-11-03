/* Barcode normalization (js/gtin.js). Examples are the standard published ones for each format. */
const test = require('node:test');
const assert = require('node:assert/strict');
const G = require('../js/gtin.js');

test('UPC-A, EAN-13, EAN-8 and GTIN-14 become the same 14 digits', () => {
  assert.equal(G.toGtin14('036000291452'), '00036000291452');        // UPC-A (the GS1 textbook example)
  assert.equal(G.toGtin14('0 36000 29145 2'), '00036000291452');     // spaces as printed
  assert.equal(G.toGtin14('0036000291452'), '00036000291452');       // the same product as EAN-13
  assert.equal(G.toGtin14('4006381333931'), '04006381333931');       // EAN-13
  assert.equal(G.toGtin14('96385074'), '00000096385074');            // EAN-8
  assert.equal(G.toGtin14('00036000291452'), '00036000291452');      // already GTIN-14
});

test('UPC-E expands to UPC-A', () => {
  assert.equal(G.upcEtoA('04252614'), '042100005264');
  assert.equal(G.toGtin14('04252614'), '00042100005264');
});

test('bad check digits and wrong lengths are refused', () => {
  assert.equal(G.toGtin14('036000291453'), null);
  assert.equal(G.toGtin14('12345'), null);
  assert.equal(G.toGtin14(''), null);
  assert.equal(G.toGtin14(null), null);
  assert.equal(G.toGtin14('123456789012345'), null);
});
