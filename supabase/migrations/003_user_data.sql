-- supabase/migrations/003_user_data.sql
-- Per-user state currently living in localStorage. Every user-owned table
-- has RLS so a user can only read/write their own rows.
--
-- Run AFTER 001_itineraries.sql and 002_rag.sql.

-- ---------------------------------------------------------------------------
-- user_preferences — Profile page travel defaults
-- ---------------------------------------------------------------------------

create table if not exists user_preferences (
  user_id           uuid primary key references auth.users(id) on delete cascade,
  preferred_group   group_type_enum,
  hotel_tier        text check (hotel_tier in ('budget', 'comfort', 'premium', 'luxury')),
  dietary           text check (dietary in ('none', 'vegetarian', 'vegan', 'jain', 'halal')),
  from_city         text,
  notes             text,
  updated_at        timestamptz default now()
);

drop trigger if exists user_preferences_set_updated_at on user_preferences;
create trigger user_preferences_set_updated_at
  before update on user_preferences
  for each row execute function set_updated_at();

alter table user_preferences enable row level security;
drop policy if exists user_prefs_all on user_preferences;
create policy user_prefs_all on user_preferences for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- wishlist — saved destinations OR itineraries
-- ---------------------------------------------------------------------------

create table if not exists wishlist (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  kind        text not null check (kind in ('destination', 'itinerary')),
  ref_id      text not null,                 -- destination slug or itinerary id
  label       text,
  added_at    timestamptz default now(),
  unique (user_id, kind, ref_id)
);

create index if not exists wishlist_user_idx on wishlist (user_id, added_at desc);

alter table wishlist enable row level security;
drop policy if exists wishlist_all on wishlist;
create policy wishlist_all on wishlist for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- budgets — one row per trip budget (linked to an itinerary or standalone)
-- ---------------------------------------------------------------------------

create table if not exists budgets (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users(id) on delete cascade,
  itinerary_id    uuid references itineraries(id) on delete cascade,
  name            text not null,
  trip_image      text,
  trip_dates      text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create index if not exists budgets_user_idx on budgets (user_id);
create index if not exists budgets_itinerary_idx on budgets (itinerary_id);

drop trigger if exists budgets_set_updated_at on budgets;
create trigger budgets_set_updated_at
  before update on budgets
  for each row execute function set_updated_at();

alter table budgets enable row level security;
drop policy if exists budgets_all on budgets;
create policy budgets_all on budgets for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- budget_categories — Flights / Hotels / Food / etc. for each budget
-- Composite PK (budget_id, id) because the category id (e.g. "flights") is
-- a slug shared across budgets — uniqueness is per-budget.
-- ---------------------------------------------------------------------------

create table if not exists budget_categories (
  budget_id       uuid not null references budgets(id) on delete cascade,
  id              text not null,                -- "flights" | "hotels" | ...
  label           text not null,
  icon            text,
  planned         integer default 0,
  spent           integer default 0,
  display_order   integer default 0,
  primary key (budget_id, id)
);

alter table budget_categories enable row level security;
drop policy if exists budget_categories_all on budget_categories;
create policy budget_categories_all on budget_categories for all
  using (exists (select 1 from budgets b
                 where b.id = budget_categories.budget_id
                   and b.user_id = auth.uid()))
  with check (exists (select 1 from budgets b
                      where b.id = budget_categories.budget_id
                        and b.user_id = auth.uid()));

-- ---------------------------------------------------------------------------
-- budget_expenses — individual spend rows under a category
-- ---------------------------------------------------------------------------

create table if not exists budget_expenses (
  id              uuid primary key default gen_random_uuid(),
  budget_id       uuid not null references budgets(id) on delete cascade,
  category_id     text not null,
  label           text not null,
  amount          integer not null check (amount >= 0),
  date            date not null,
  created_at      timestamptz default now()
);

create index if not exists budget_expenses_budget_idx
  on budget_expenses (budget_id);
create index if not exists budget_expenses_category_idx
  on budget_expenses (budget_id, category_id);

alter table budget_expenses enable row level security;
drop policy if exists budget_expenses_all on budget_expenses;
create policy budget_expenses_all on budget_expenses for all
  using (exists (select 1 from budgets b
                 where b.id = budget_expenses.budget_id
                   and b.user_id = auth.uid()))
  with check (exists (select 1 from budgets b
                      where b.id = budget_expenses.budget_id
                        and b.user_id = auth.uid()));

-- ---------------------------------------------------------------------------
-- checklist_state — per-user, per-itinerary, per-item check status
-- ---------------------------------------------------------------------------

create table if not exists checklist_state (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  itinerary_id    uuid not null references itineraries(id) on delete cascade,
  item_id         text not null,
  checked         boolean default false,
  updated_at      timestamptz default now(),
  unique (user_id, itinerary_id, item_id)
);

create index if not exists checklist_state_user_idx
  on checklist_state (user_id, itinerary_id);

drop trigger if exists checklist_state_set_updated_at on checklist_state;
create trigger checklist_state_set_updated_at
  before update on checklist_state
  for each row execute function set_updated_at();

alter table checklist_state enable row level security;
drop policy if exists checklist_state_all on checklist_state;
create policy checklist_state_all on checklist_state for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- trip_start_dates — when does Day 1 begin? Used by Today-mode + .ics export
-- ---------------------------------------------------------------------------

create table if not exists trip_start_dates (
  user_id         uuid not null references auth.users(id) on delete cascade,
  itinerary_id    uuid not null references itineraries(id) on delete cascade,
  start_date      date not null,
  updated_at      timestamptz default now(),
  primary key (user_id, itinerary_id)
);

drop trigger if exists trip_start_dates_set_updated_at on trip_start_dates;
create trigger trip_start_dates_set_updated_at
  before update on trip_start_dates
  for each row execute function set_updated_at();

alter table trip_start_dates enable row level security;
drop policy if exists trip_start_dates_all on trip_start_dates;
create policy trip_start_dates_all on trip_start_dates for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- itinerary_edits — inline-edit overrides on the day grid
-- ---------------------------------------------------------------------------

create table if not exists itinerary_edits (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  itinerary_id    uuid not null references itineraries(id) on delete cascade,
  day_number      integer not null,
  slot            text not null check (slot in ('morning', 'afternoon', 'evening')),
  edited_text     text not null,
  updated_at      timestamptz default now(),
  unique (user_id, itinerary_id, day_number, slot)
);

create index if not exists itinerary_edits_lookup_idx
  on itinerary_edits (user_id, itinerary_id);

drop trigger if exists itinerary_edits_set_updated_at on itinerary_edits;
create trigger itinerary_edits_set_updated_at
  before update on itinerary_edits
  for each row execute function set_updated_at();

alter table itinerary_edits enable row level security;
drop policy if exists itinerary_edits_all on itinerary_edits;
create policy itinerary_edits_all on itinerary_edits for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- chat_messages — Ask Sarthi conversation history (per user, optionally per
-- itinerary). Insert-only from the client; bot replies inserted server-side.
-- ---------------------------------------------------------------------------

create table if not exists chat_messages (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid references auth.users(id) on delete cascade,
  itinerary_id     uuid references itineraries(id) on delete cascade,
  sender            text not null check (sender in ('user', 'bot')),
  text              text not null,
  intent            text,
  intent_confidence numeric,
  created_at        timestamptz default now()
);

create index if not exists chat_messages_user_idx
  on chat_messages (user_id, created_at desc);
create index if not exists chat_messages_itinerary_idx
  on chat_messages (itinerary_id, created_at);

alter table chat_messages enable row level security;

drop policy if exists chat_messages_select_own on chat_messages;
create policy chat_messages_select_own
  on chat_messages for select using (auth.uid() = user_id);

drop policy if exists chat_messages_insert_own on chat_messages;
create policy chat_messages_insert_own
  on chat_messages for insert with check (auth.uid() = user_id);
