/* Leanward — barcode normalization (LOG-4, M4). UPC-A, UPC-E, EAN-8, EAN-13 and GTIN-14 all become a
 * 14-digit GTIN with a valid check digit, so one product has one key whatever was scanned or imported.
 * Used by the app (scans) and tools/food-import (USDA's gtin_upc).
 */
(function (root) {
  'use strict';

  /** GS1 check digit for the first n−1 digits of a code. */
  function checkDigit(body) {
    var sum = 0;
    for (var i = body.length - 1, w = 3; i >= 0; i--, w = w === 3 ? 1 : 3) sum += Number(body[i]) * w;
    return String((10 - (sum % 10)) % 10);
  }
  function valid(code) { return code.length >= 8 && checkDigit(code.slice(0, -1)) === code.slice(-1); }

  /** UPC-E (8 digits: number system, 6 digits, check) → UPC-A (12 digits). Null if it isn't UPC-E. */
  function upcEtoA(e) {
    if (!/^[01]\d{7}$/.test(e)) return null;
    var ns = e[0], d = e.slice(1, 7), c = e[7], m;
    var last = d[5];
    if (last <= '2') m = d[0] + d[1] + last + '0000' + d[2] + d[3] + d[4];
    else if (last === '3') m = d[0] + d[1] + d[2] + '00000' + d[3] + d[4];
    else if (last === '4') m = d[0] + d[1] + d[2] + d[3] + '00000' + d[4];
    else m = d[0] + d[1] + d[2] + d[3] + d[4] + '0000' + last;
    var a = ns + m + c;
    return valid(a) ? a : null;
  }

  /**
   * Any scanned or printed code → GTIN-14, or null if it isn't a valid product barcode.
   * An 8-digit code is tried as EAN-8 first, then as UPC-E (both are 8 digits; the check digit decides).
   */
  function toGtin14(input) {
    var s = String(input == null ? '' : input).replace(/\D/g, '');
    if (!s) return null;
    if (s.length === 8) {
      if (valid(s)) return '000000' + s;          // EAN-8
      var a = upcEtoA(s);
      return a ? '00' + a : null;                 // UPC-E
    }
    if (s.length > 14 || s.length < 8) return null;
    var g = ('00000000000000' + s).slice(-14);
    return valid(g) ? g : null;
  }

  var api = { checkDigit: checkDigit, upcEtoA: upcEtoA, toGtin14: toGtin14 };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else { root.LW = root.LW || {}; root.LW.gtin = api; }
})(this);
