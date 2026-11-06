#!/usr/bin/env bash
# Leanward — search check against the real catalog (read only). Runs each query through the live
# lw_search_foods and through the version in supabase/schema.sql (as a temporary function that
# disappears when the connection closes), with timings, so a search change can be judged on real
# data before anyone runs the schema. Changes nothing in the database.
#   SUPABASE_DB_URL=... SEARCH_QUERIES='chobani greek yogurt;quest bar' bash tools/food-import/search-check.sh
set -euo pipefail
cd "$(dirname "$0")/../.."
: "${SUPABASE_DB_URL:?Set SUPABASE_DB_URL}"
QUERIES="${SEARCH_QUERIES:-chobani greek yogurt;chob;greek yog;oikos triple zero;fairlife milk;premier protein shake;quest bar;kind bar;rxbar;clif bar;cheerios;frosted flakes;kelloggs frosted flakes;daves killer bread;kirkland;great value whole milk;siggis;ben and jerrys;banana;chicken breast cooked}"
NEWFN=$(node -e "
  const s = require('fs').readFileSync('supabase/schema.sql', 'utf8');
  const a = s.indexOf('create or replace function public.lw_search_foods('), b = s.indexOf('\$\$;', a) + 3;
  process.stdout.write(s.slice(a, b).replace('public.lw_search_foods(', 'pg_temp.lw_search_foods_new('));
")
{
  echo '\set ON_ERROR_STOP 1'
  echo "$NEWFN"
  echo '\unset ON_ERROR_STOP'
  echo "set default_transaction_read_only = on;"
  echo "set statement_timeout = '90s';"
  echo '\echo === catalog'
  echo "select source, count(*) as foods, count(*) filter (where brand is null) as no_brand, count(*) filter (where gtin is not null) as with_barcode from public.lw_foods group by source order by source;"
  echo "select rolname, rolconfig from pg_roles where rolname in ('authenticated', 'authenticator');"
  echo "select pg_size_pretty(pg_database_size(current_database())) as database_size;"
  echo '\echo Searches below use the 8 s limit the app has; a time-out shows as an ERROR line.'
  echo "set statement_timeout = '8s';"
  echo '\timing on'
  IFS=';' read -ra QS <<< "$QUERIES"
  for t in "${QS[@]}"; do
    t=$(echo "$t" | sed "s/'/''/g")
    echo "\\echo"
    echo "\\echo === \"$t\": live search"
    echo "select left(name, 60) as name, left(coalesce(brand, ''), 30) as brand, source, round(score::numeric, 2) as score from public.lw_search_foods('$t', 8);"
    echo "\\echo --- \"$t\": new search"
    echo "select left(name, 60) as name, left(coalesce(brand, ''), 30) as brand, source, round(score::numeric, 2) as score from pg_temp.lw_search_foods_new('$t', 8);"
  done
} | psql "$SUPABASE_DB_URL" -X -q -P pager=off
