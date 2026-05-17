-- supabase/migrations/001_itineraries.sql
-- Pre-saved itineraries + the supporting destinations + destination_extras tables.
-- Run this FIRST in Supabase Studio → SQL Editor (or via Supabase CLI).
--
-- Idempotent: every CREATE uses IF NOT EXISTS so re-running is safe.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Shared enums
-- ---------------------------------------------------------------------------

do $$ begin
  create type group_type_enum as enum ('couple', 'family', 'friends', 'solo');
exception when duplicate_object then null; end $$;

do $$ begin
  create type trip_status_enum as enum ('upcoming', 'past', 'draft', 'active');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- destinations — the 6 destinations the homepage Trending row + Explore page
-- iterate over. Pre-seeded by scripts/seed.ts after migrations finish.
-- ---------------------------------------------------------------------------

create table if not exists destinations (
  id                  uuid primary key default gen_random_uuid(),
  slug                text unique not null,
  name                text not null,
  state               text not null,
  tagline             text,
  description         text,
  image               text,
  gallery             text[] default '{}',
  tags                text[] default '{}',
  best_for            text[] default '{}',  -- ['couple','family',...]
  season              text,
  best_months         text[] default '{}',
  budget_from         integer,
  recommended_duration text,
  weather             text,
  temperature         text,

  parent_destination_id uuid references destinations(id),
  is_active           boolean default true,
  trending_rank       integer,

  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

create index if not exists destinations_slug_idx on destinations (slug);
create index if not exists destinations_active_idx on destinations (is_active) where is_active = true;

-- ---------------------------------------------------------------------------
-- destination_experiences — "top experiences" for /explore/[destination]
-- ---------------------------------------------------------------------------

create table if not exists destination_experiences (
  id              uuid primary key default gen_random_uuid(),
  destination_id  uuid not null references destinations(id) on delete cascade,
  emoji           text,
  title           text not null,
  description     text,
  display_order   integer default 0
);

create index if not exists destination_experiences_dest_idx
  on destination_experiences (destination_id, display_order);

-- ---------------------------------------------------------------------------
-- destination_faqs — accordion content on /explore/[destination]
-- ---------------------------------------------------------------------------

create table if not exists destination_faqs (
  id              uuid primary key default gen_random_uuid(),
  destination_id  uuid not null references destinations(id) on delete cascade,
  question        text not null,
  answer          text not null,
  display_order   integer default 0
);

create index if not exists destination_faqs_dest_idx
  on destination_faqs (destination_id, display_order);

-- ---------------------------------------------------------------------------
-- itineraries — the BIG one. Stores both pre-saved templates AND user trips.
--   is_template = true  → pre-saved demo (anyone can SELECT)
--   is_template = false → user-owned trip (RLS: only owner can read/write)
-- ---------------------------------------------------------------------------

create table if not exists itineraries (
  id                  uuid primary key default gen_random_uuid(),

  -- Ownership
  user_id             uuid references auth.users(id) on delete cascade,
  is_template         boolean default false,
  slug                text unique,            -- only set for templates

  -- Basic info
  title               text not null,
  destination         text not null,
  state               text not null,
  duration            text not null,          -- "7 nights / 8 days"
  nights              integer not null check (nights >= 0),
  total_days          integer not null check (total_days >= 1),
  group_type          group_type_enum not null,
  group_size          integer not null check (group_size >= 1),

  -- Media
  image               text,
  gallery             text[] default '{}',

  -- Pricing
  total_budget        integer not null,
  price_per_person    integer not null,

  -- Highlights & meta
  highlights          text[] default '{}',
  weather             text,
  weather_icon        text,
  status              trip_status_enum default 'upcoming',
  from_city           text,
  posted_ago          text,

  -- Structured trip detail (kept as JSONB — easier to read/write atomically
  -- than splitting into 4 normalised tables, and the FE already shapes it
  -- this way)
  --
  -- days   = [{day_number, location, morning, afternoon, evening, type}, ...]
  -- route  = [{city, nights, transfer_to_next: {mode,label,duration} | null}, ...]
  days                jsonb not null default '[]'::jsonb,
  route               jsonb not null default '[]'::jsonb,
  inclusions          text[] default '{}',
  exclusions          text[] default '{}',

  saved_at            timestamptz default now(),
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

create index if not exists itineraries_user_idx on itineraries (user_id);
create index if not exists itineraries_template_idx on itineraries (is_template) where is_template = true;
create index if not exists itineraries_slug_idx on itineraries (slug) where slug is not null;

-- Auto-touch updated_at on every UPDATE
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists itineraries_set_updated_at on itineraries;
create trigger itineraries_set_updated_at
  before update on itineraries
  for each row execute function set_updated_at();

drop trigger if exists destinations_set_updated_at on destinations;
create trigger destinations_set_updated_at
  before update on destinations
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Row-Level Security
-- ---------------------------------------------------------------------------

alter table destinations enable row level security;
alter table destination_experiences enable row level security;
alter table destination_faqs enable row level security;
alter table itineraries enable row level security;

-- Public-read for destination tables — these are static reference data.
drop policy if exists destinations_public_read on destinations;
create policy destinations_public_read
  on destinations for select using (true);

drop policy if exists destination_experiences_public_read on destination_experiences;
create policy destination_experiences_public_read
  on destination_experiences for select using (true);

drop policy if exists destination_faqs_public_read on destination_faqs;
create policy destination_faqs_public_read
  on destination_faqs for select using (true);

-- Templates are public; everything else requires ownership.
drop policy if exists itineraries_templates_public_read on itineraries;
create policy itineraries_templates_public_read
  on itineraries for select using (is_template = true);

drop policy if exists itineraries_owner_read on itineraries;
create policy itineraries_owner_read
  on itineraries for select using (auth.uid() = user_id);

drop policy if exists itineraries_owner_insert on itineraries;
create policy itineraries_owner_insert
  on itineraries for insert
  with check (auth.uid() = user_id and is_template = false);

drop policy if exists itineraries_owner_update on itineraries;
create policy itineraries_owner_update
  on itineraries for update
  using (auth.uid() = user_id and is_template = false)
  with check (auth.uid() = user_id and is_template = false);

drop policy if exists itineraries_owner_delete on itineraries;
create policy itineraries_owner_delete
  on itineraries for delete
  using (auth.uid() = user_id and is_template = false);
