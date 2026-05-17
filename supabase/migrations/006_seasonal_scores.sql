-- supabase/migrations/006_seasonal_scores.sql
-- Per-destination, per-month tourist comfort score (0-100) computed from
-- Open-Meteo historical climate data. Used by Surprise Me's ranking, the
-- chatbot's "where should I go in March" intent, and the generate route's
-- seasonal nudges.
--
-- ~3,000 rows (250 destinations × 12 months). Tiny table, fast queries.

create table if not exists seasonal_scores (
  id              uuid primary key default gen_random_uuid(),
  destination_id  uuid not null references destinations(id) on delete cascade,
  month           smallint not null check (month between 1 and 12),

  score           smallint not null check (score between 0 and 100),
  avg_temp_c      numeric(5, 2),
  rain_mm         numeric(7, 2),
  humidity_pct    smallint,

  source          text not null default 'open-meteo',
  computed_at     timestamptz default now(),

  unique (destination_id, month)
);

create index if not exists seasonal_scores_month_score_idx
  on seasonal_scores (month, score desc);
create index if not exists seasonal_scores_dest_idx
  on seasonal_scores (destination_id);

-- "Best destinations for month M" — Surprise Me + "where in March?" queries.
-- Optional tag filter restricts to e.g. beach / hill destinations.
create or replace function best_destinations_for_month(
  target_month   integer,
  min_score      integer default 60,
  result_limit   integer default 10,
  filter_tags    text[]  default null
)
returns table (
  destination_id   uuid,
  slug             text,
  name             text,
  state            text,
  destination_type text,
  score            smallint,
  avg_temp_c       numeric,
  rain_mm          numeric,
  tags             text[]
)
language sql stable
as $$
  select
    d.id, d.slug, d.name, d.state, d.destination_type,
    s.score, s.avg_temp_c, s.rain_mm,
    d.tags
  from seasonal_scores s
  join destinations d on d.id = s.destination_id
  where s.month = target_month
    and s.score >= min_score
    and (filter_tags is null or d.tags && filter_tags)
  order by s.score desc
  limit result_limit;
$$;

alter table seasonal_scores enable row level security;

drop policy if exists seasonal_scores_public_read on seasonal_scores;
create policy seasonal_scores_public_read
  on seasonal_scores for select using (true);
