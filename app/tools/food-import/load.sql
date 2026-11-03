-- Loads foods.csv (from import.js) into public.lw_foods for one source, in one transaction.
-- Run it from the folder that holds foods.csv (psql's \copy doesn't expand variables in file names):
--   psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -v source=usda-sr-legacy -v release=2018-04 -v rows_in=7793 -f load.sql
-- Foods of that source that are gone from the new release are removed (diary entries keep their own
-- nutrient snapshot, so history is unaffected). Run supabase/schema.sql first.
\set ON_ERROR_STOP on
begin;
-- psql variables can't reach inside DO blocks, so the source goes into a transaction setting.
select set_config('lw.source', :'source', true) \gset ignored_
create temp table staging (like public.lw_foods including defaults) on commit drop;
alter table staging drop column search, drop column imported_at;
\copy staging (id, source, source_id, verification, name, brand, gtin, category, kcal, protein_g, carbs_g, fat_g, energy_derived, per, serving_g, serving_label, servings, nutrients, preparation, published) from 'foods.csv' with (format csv, header true)

do $$ begin
  if exists (select 1 from staging where source <> current_setting('lw.source')) then raise exception 'foods.csv has rows from another source'; end if;
end $$;

-- A barcode moving to a new USDA record: free it first (one record per barcode, FDB-4).
update public.lw_foods f set gtin = null from staging s where f.gtin = s.gtin and f.id <> s.id;
delete from public.lw_foods f where f.source = current_setting('lw.source') and not exists (select 1 from staging s where s.id = f.id);
insert into public.lw_foods (id, source, source_id, verification, name, brand, gtin, category, kcal, protein_g, carbs_g, fat_g, energy_derived, per, serving_g, serving_label, servings, nutrients, preparation, published, imported_at)
  select id, source, source_id, verification, name, brand, gtin, category, kcal, protein_g, carbs_g, fat_g, energy_derived, per, serving_g, serving_label, servings, nutrients, preparation, published, now() from staging
on conflict (id) do update set source = excluded.source, source_id = excluded.source_id, verification = excluded.verification, name = excluded.name,
  brand = excluded.brand, gtin = excluded.gtin, category = excluded.category, kcal = excluded.kcal, protein_g = excluded.protein_g, carbs_g = excluded.carbs_g,
  fat_g = excluded.fat_g, energy_derived = excluded.energy_derived, per = excluded.per, serving_g = excluded.serving_g, serving_label = excluded.serving_label,
  servings = excluded.servings, nutrients = excluded.nutrients, preparation = excluded.preparation, published = excluded.published, imported_at = now();

insert into public.lw_food_imports (dataset, release, rows_in, rows_kept, table_mb)
  select current_setting('lw.source'), :'release', :rows_in, (select count(*) from staging), round(pg_total_relation_size('public.lw_foods') / 1048576.0, 1);
commit;

select source, count(*) as foods from public.lw_foods group by source order by source;
select round(pg_total_relation_size('public.lw_foods') / 1048576.0, 1) as catalog_mb, round(pg_database_size(current_database()) / 1048576.0, 1) as database_mb;
