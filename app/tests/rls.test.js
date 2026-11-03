/* Row level security tests for supabase/schema.sql, run against a real, throwaway PostgreSQL.
 *
 * A small stand-in for Supabase's auth (auth.users, auth.uid(), the anon and authenticated roles)
 * is created first, then schema.sql is applied twice (it must be safe to re-run), then every synced
 * table is checked: user B can't read, change, take over or delete user A's rows; nobody can
 * hard-delete; anon gets nothing; updated_at is stamped by the server; repeated uploads don't duplicate.
 *
 * Skipped when PostgreSQL isn't installed (initdb not found). GitHub's ubuntu runners have it.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

function findBin() {
  const dirs = (process.env.PATH || '').split(path.delimiter);
  try { fs.readdirSync('/usr/lib/postgresql').sort((a, b) => Number(b) - Number(a)).forEach((v) => dirs.push(`/usr/lib/postgresql/${v}/bin`)); } catch (e) { /* none */ }
  return dirs.find((d) => fs.existsSync(path.join(d, 'initdb')) && fs.existsSync(path.join(d, 'pg_ctl')));
}

const BIN = findBin();
const ROOT = path.resolve(__dirname, '..');
const A = '00000000-0000-4000-8000-00000000000a';
const B = '00000000-0000-4000-8000-00000000000b';

// One valid row per synced table (beyond the shared columns).
const SAMPLE = {
  lw_profiles: { id: "'me'", sex: "'female'", height_cm: '165', dob: "'1990-05-01'" },
  lw_goals: { type: "'lose-fat'", started_on: "'2026-11-01'" },
  lw_phases: { type: "'cut'", start_date: "'2026-11-01'", rate: '0.5', calc_version: "'1.0.0'" },
  lw_target_sets: { phase_id: "'p1'", effective_from: "'2026-11-01'", kcal: '2310', protein_g: '176', carbs_g: '246', fat_g: '69', origin: "'calculated'", calc_version: "'1.0.0'" },
  lw_custom_foods: { name: "'Overnight oats'", nutrients_per_100g: `'{"kcal":150}'` },
  lw_saved_meals: { name: "'Breakfast'", items: "'[]'" },
  lw_diary_entries: { date: "'2026-11-03'", slot: "'breakfast'", food_source: "'quick'", name: "'Quick add'", kcal: '450', logged_via: "'quick'" },
  lw_weights: { measured_at: "'2026-11-03T07:10:00Z'", date: "'2026-11-03'", kg: '80.4' },
  lw_measurements: { date: "'2026-11-03'", site: "'waist'", cm: '86.0' },
  lw_body_fat: { date: "'2026-11-03'", pct: '18.5', method: "'scale'" },
  lw_lifts: { date: "'2026-11-03'", lift: "'Back squat'", weight_kg: '120', reps: '5' },
  lw_recommendations: { type: "'maintenance-update'", proposed: `'{"to":2250}'` },
  lw_food_reports: { food_source: "'usda'", food_ref: "'171287'", issue: "'wrong-nutrients'" }
};

function prelude() {
  return `
create role anon nologin;
create role authenticated nologin;
create schema auth;
create table auth.users (id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
grant usage on schema public to anon, authenticated;
insert into auth.users values ('${A}'), ('${B}');
`;
}

function checks() {
  const sql = [];
  const as = (uid) => `reset role; set role authenticated; set request.jwt.claim.sub = '${uid}';`;
  const expectError = (name, stmt, code) => `
do $t$ begin
  begin ${stmt}; raise exception 'FAIL ${name}: no error';
  exception when sqlstate '${code}' then raise notice 'ok: ${name}';
  end;
end $t$;`;
  for (const [t, cols] of Object.entries(SAMPLE)) {
    const c = Object.assign({ id: "'r1'" }, cols);
    const names = Object.keys(c).join(', '), vals = Object.values(c).join(', ');
    // A adds a row, claiming an old updated_at; the server must overwrite it.
    sql.push(as(A));
    sql.push(`insert into public.${t} (${names}, updated_at) values (${vals}, '2000-01-01');`);
    // Uploading the same row again (an upsert, as the app does) must not duplicate it.
    sql.push(`insert into public.${t} (${names}) values (${vals}) on conflict (user_id, id) do update set deleted = excluded.deleted;`);
    sql.push(`do $t$ declare n int; u timestamptz; begin
      select count(*), max(updated_at) into n, u from public.${t};
      if n <> 1 then raise exception 'FAIL ${t}: A sees % rows after a repeated upload', n; end if;
      if u < now() - interval '1 minute' then raise exception 'FAIL ${t}: updated_at not stamped by the server'; end if;
      raise notice 'ok: ${t} insert, upsert, server time';
    end $t$;`);
    // A can't hard-delete, even their own row.
    sql.push(expectError(`${t} no hard delete`, `delete from public.${t}`, '42501'));
    // A can't hand the row to B: the owner is kept.
    sql.push(`update public.${t} set user_id = '${B}', deleted = true;`);
    sql.push(`do $t$ begin
      if (select count(*) from public.${t} where deleted) <> 1 then raise exception 'FAIL ${t}: A lost the row by changing user_id'; end if;
      raise notice 'ok: ${t} owner kept';
    end $t$;`);
    // B sees nothing of A's, can't change it, and can't write rows as A.
    sql.push(as(B));
    sql.push(`do $t$ declare n int; begin
      select count(*) into n from public.${t};
      if n <> 0 then raise exception 'FAIL ${t}: B can read % of A''s rows', n; end if;
      update public.${t} set deleted = false;
      get diagnostics n = row_count;
      if n <> 0 then raise exception 'FAIL ${t}: B changed % of A''s rows', n; end if;
      raise notice 'ok: ${t} B cannot read or change A';
    end $t$;`);
    sql.push(expectError(`${t} B cannot insert as A`, `insert into public.${t} (user_id, ${names}) values ('${A}', ${vals.replace("'r1'", "'r2'")})`, '42501'));
    // Signed-out visitors get nothing.
    sql.push(`reset role; set role anon;`);
    sql.push(expectError(`${t} anon cannot read`, `perform 1 from public.${t}`, '42501'));
    sql.push(`reset role;`);
    sql.push(`do $t$ begin
      if (select count(*) from public.${t}) <> 1 then raise exception 'FAIL ${t}: wrong row count at the end'; end if;
    end $t$;`);
  }
  // Error reports: anyone can add one, nobody can read them through the API.
  sql.push(`reset role; set role anon; insert into public.lw_errors (app_version, message) values ('0.2.0', 'test');`);
  sql.push(expectError('lw_errors anon cannot read', 'perform 1 from public.lw_errors', '42501'));
  sql.push(`reset role; set role authenticated; set request.jwt.claim.sub = '${A}';`);
  sql.push(expectError('lw_errors signed-in cannot read', 'perform 1 from public.lw_errors', '42501'));
  sql.push(`reset role; set role anon;`);
  sql.push(`do $t$ begin if (select message from public.lw_ping where id = 1) <> 'Connected' then raise exception 'FAIL lw_ping'; end if; raise notice 'ok: lw_ping readable'; end $t$;`);
  // Deleting the account removes the person's rows (ACC-1).
  sql.push(`reset role; delete from auth.users where id = '${A}';`);
  sql.push(`do $t$ begin
    if (select count(*) from public.lw_diary_entries) <> 0 then raise exception 'FAIL account deletion left rows behind'; end if;
    raise notice 'ok: account deletion cascades';
  end $t$;`);
  return sql.join('\n');
}

test('row level security on every Leanward table (real PostgreSQL)', { skip: BIN ? false : 'PostgreSQL not installed' }, () => {
  const root = process.getuid && process.getuid() === 0;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lw-rls-'));
  const run = (cmd, args, opts) => execFileSync(root ? 'runuser' : path.join(BIN, cmd), root ? ['-u', 'postgres', '--', path.join(BIN, cmd)].concat(args) : args, Object.assign({ encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }, opts));
  const port = String(54000 + Math.floor(Math.random() * 900));
  fs.writeFileSync(path.join(dir, 'prelude.sql'), prelude());
  fs.copyFileSync(path.join(ROOT, 'supabase', 'schema.sql'), path.join(dir, 'schema.sql'));
  fs.writeFileSync(path.join(dir, 'checks.sql'), checks());
  if (root) execFileSync('chown', ['-R', 'postgres', dir]);
  const data = path.join(dir, 'data');
  let started = false;
  try {
    run('initdb', ['-D', data, '-A', 'trust', '-U', 'postgres', '--no-sync', '--no-instructions']);
    run('pg_ctl', ['-D', data, '-o', `-k ${dir} -c listen_addresses= -p ${port} -c fsync=off`, '-w', '-s', 'start', '-l', path.join(dir, 'log')]);
    started = true;
    const psql = (file) => run('psql', ['-h', dir, '-p', port, '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-q', '-f', path.join(dir, file)]);
    psql('prelude.sql');
    psql('schema.sql');
    psql('schema.sql');   // safe to run again
    const { spawnSync } = require('child_process');
    const r = spawnSync(root ? 'runuser' : path.join(BIN, 'psql'), (root ? ['-u', 'postgres', '--', path.join(BIN, 'psql')] : []).concat(['-h', dir, '-p', port, '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-q', '-f', path.join(dir, 'checks.sql')]), { encoding: 'utf8' });
    const fails = (r.stderr || '').split('\n').filter((l) => /FAIL|ERROR/.test(l));
    assert.equal(r.status, 0, fails.join('\n') || r.stderr);
    // 6 checks per synced table, plus 4 for errors, ping and account deletion.
    const oks = (r.stderr.match(/NOTICE:\s+ok:/g) || []).length;
    assert.equal(oks, Object.keys(SAMPLE).length * 6 + 4, r.stderr);
  } finally {
    if (started) try { run('pg_ctl', ['-D', data, '-w', '-s', '-m', 'immediate', 'stop']); } catch (e) { /* already stopped */ }
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('every synced table in schema.sql has a sample row in this test', () => {
  const sql = fs.readFileSync(path.join(ROOT, 'supabase', 'schema.sql'), 'utf8');
  const list = /synced text\[\] := array\[([^\]]+)\]/.exec(sql)[1].match(/'(\w+)'/g).map((s) => s.slice(1, -1));
  assert.deepEqual(list.sort(), Object.keys(SAMPLE).sort());
});
