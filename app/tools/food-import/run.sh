#!/usr/bin/env bash
# Leanward food catalog import (run by .github/workflows/food-import.yml).
#   DATASETS="foundation_food sr_legacy_food survey_food"  DRY_RUN=true|false  SUPABASE_DB_URL=postgres://...
# For each dataset: download USDA's CSV zip, convert with import.js, and (unless DRY_RUN) load with load.sql.
# Writes a report to $GITHUB_STEP_SUMMARY when it runs in GitHub Actions.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
work="${RUNNER_TEMP:-/tmp}/lw-food-import"
rm -rf "$work"; mkdir -p "$work"
summary="${GITHUB_STEP_SUMMARY:-/dev/stdout}"
declare -A SOURCE=([foundation_food]=usda-foundation [sr_legacy_food]=usda-sr-legacy [survey_food]=usda-fndds [branded_food]=usda-branded)
declare -A ONLY=([foundation_food]=foundation_food [sr_legacy_food]=sr_legacy_food [survey_food]=survey_fndds_food [branded_food]=branded_food)

if [ "${DRY_RUN:-true}" != "true" ]; then
  : "${SUPABASE_DB_URL:?Add the SUPABASE_DB_URL secret (Settings → Secrets and variables → Actions)}"
  if ! has_table="$(psql "$SUPABASE_DB_URL" -At -c "select to_regclass('public.lw_foods') is not null" 2>&1)"; then
    echo "Couldn't connect to the database with the SUPABASE_DB_URL secret:" >&2
    echo "$has_table" | sed 's/^/  /' >&2
    echo "Check the secret: the session pooler string, with your database password in place of [YOUR-PASSWORD] (no brackets)." >&2
    exit 1
  fi
  if [ "$has_table" != "t" ]; then
    echo "The lw_foods table is missing. Run app/supabase/schema.sql in Supabase first." >&2; exit 1
  fi
fi

failed=0
node "$here/find-urls.js" > "$work/urls.json"
echo "## Food catalog import ($( [ "${DRY_RUN:-true}" = "true" ] && echo 'dry run, nothing loaded' || echo 'loaded' ))" >> "$summary"
for ds in ${DATASETS}; do
  url="$(node -e "console.log(require('$work/urls.json')['$ds'].url)")"
  release="$(echo "$url" | sed -E 's/.*_csv_([0-9-]+)\.zip/\1/')"
  echo "::group::$ds ($release)"
  d="$work/$ds"; mkdir -p "$d"
  curl -fsSL --retry 3 -o "$d/data.zip" "$url"
  unzip -q -o "$d/data.zip" -d "$d"
  rm -f "$d/data.zip"
  # Some USDA zips nest a second zip or a folder; find food.csv wherever it is (any capitalisation).
  find "$d" -iname '*.zip' -type f -exec unzip -q -o {} -d "$d" \;
  foodcsv="$(find "$d" -iname food.csv -type f | head -1)"
  if [ -z "$foodcsv" ]; then
    # Unknown layout: show each file's size and first lines, so the converter can be updated, then go on.
    echo "No food.csv in the $ds download. Its files (size, then the first 3 lines):"
    find "$d" -type f | sort | while read -r f; do
      echo "--- ${f#$d/} ($(du -h "$f" | cut -f1))"
      case "$f" in *.csv) head -c 600 "$f" | head -3;; esac
    done
    { echo "### ${SOURCE[$ds]} · release $release"; echo "Skipped: no food.csv in this download (layout changed; see the log)."; } >> "$summary"
    failed=1; rm -rf "$d"; echo "::endgroup::"; continue
  fi
  csvdir="$(dirname "$foodcsv")"
  echo "Files: $(ls "$csvdir" | tr '\n' ' ')"
  if ! report="$(node --max-old-space-size=6144 "$here/import.js" "$csvdir" "$csvdir/foods.csv" --only "${ONLY[$ds]}" 2>&1)"; then
    echo "$report"
    { echo "### ${SOURCE[$ds]} · release $release"; echo "Not converted:"; echo '```'; echo "$report"; echo '```'; } >> "$summary"
    failed=1; rm -rf "$d"; echo "::endgroup::"; continue
  fi
  echo "$report"
  rows_in="$(node -e "console.log(JSON.parse(process.argv[1]).rowsIn)" "$report")"
  { echo "### ${SOURCE[$ds]} · release $release"; echo '```json'; echo "$report"; echo '```'; } >> "$summary"
  if [ "${DRY_RUN:-true}" != "true" ]; then
    (cd "$csvdir" && psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -v source="${SOURCE[$ds]}" -v release="$release" -v rows_in="$rows_in" -f "$here/load.sql") | tee -a "$summary"
  fi
  rm -rf "$d"
  echo "::endgroup::"
done
exit "$failed"
