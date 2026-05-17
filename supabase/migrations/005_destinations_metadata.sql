-- supabase/migrations/005_destinations_metadata.sql
-- Enriches the destinations table with structured metadata that comes from
-- Wikidata (lat/lng, elevation, population, destination_type, region, wiki
-- article references). These columns let the scraper auto-populate the 240+
-- destinations beyond the 6 that ship with rich curated content.
--
-- Idempotent.

alter table destinations
  add column if not exists region              text,
  add column if not exists destination_type    text,
  add column if not exists latitude            numeric(9, 6),
  add column if not exists longitude           numeric(9, 6),
  add column if not exists elevation_m         integer,
  add column if not exists population          integer,
  add column if not exists wikidata_id         text,
  add column if not exists wikipedia_title     text,
  add column if not exists wikivoyage_title    text,
  add column if not exists is_minimal          boolean default false;

create index if not exists destinations_region_idx on destinations (region);
create index if not exists destinations_type_idx   on destinations (destination_type);
create index if not exists destinations_latlng_idx on destinations (latitude, longitude);
