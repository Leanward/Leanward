/* Leanward — app settings shared by every other file.
 *
 * The Supabase URL and publishable key are public by design: row level security means each
 * signed-in person can only reach their own rows (see supabase/schema.sql). The project is shared
 * with PR Forge (PRD §15 Q6b). Never put a secret key, service-role key or password here.
 */
(function (root) {
  'use strict';

  var config = {
    // Bump on every release, together with CACHE in sw.js (a test checks they match).
    VERSION: '0.1.0',
    SUPABASE_URL: 'https://pvtcqdtqycihlontmirl.supabase.co',
    SUPABASE_KEY: 'sb_publishable_00yYlGDJceDwbjp_B25oLg_FOEW6ZwE',
    // PR Forge lives on the same origin (kevo00012.github.io), so every key and cache Leanward
    // creates starts with this prefix and Leanward never touches anything else.
    STORAGE_PREFIX: 'leanward:v1:',
    CACHE_PREFIX: 'leanward-'
  };

  if (typeof module === 'object' && module.exports) module.exports = config;
  else { root.LW = root.LW || {}; root.LW.config = config; }
})(this);
