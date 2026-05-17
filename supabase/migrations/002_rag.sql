-- supabase/migrations/002_rag.sql
-- RAG knowledge base + pgvector retrieval RPC. Depends on `destinations` from 001.
-- Run AFTER 001_itineraries.sql.

create extension if not exists vector;

-- 14 fixed content categories — see Part 3 of the build plan
do $$ begin
  create type content_type_enum as enum (
    'overview', 'attractions', 'activities', 'food', 'accommodation',
    'logistics', 'climate', 'safety', 'shopping', 'culture',
    'festivals', 'nature', 'nightlife', 'practical'
  );
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- knowledge_chunks — one row per scraped + embedded text chunk.
-- ---------------------------------------------------------------------------

create table if not exists knowledge_chunks (
  id              uuid primary key default gen_random_uuid(),
  destination_id  uuid not null references destinations(id) on delete cascade,
  content_type    content_type_enum not null,

  source_url      text not null,                  -- exact page URL
  source_name     text not null,                  -- 'wikivoyage' | 'wikipedia' | ...

  heading         text,                           -- immediate parent <h2>/<h3>
  heading_path    text[] default '{}',            -- ['Goa', 'Eat', 'Seafood']

  text            text not null,                  -- the chunk body (300-700 tokens)
  token_count     integer,
  embedding       vector(1536) not null,          -- text-embedding-3-small

  position        integer,                        -- order on the source page

  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),

  -- Re-runs of the scraper UPSERT on this (source URL + position).
  unique (source_url, position)
);

-- HNSW index for fast approximate nearest-neighbour search on the embedding.
-- Cosine distance (`<=>`) is what we use at query time.
create index if not exists knowledge_chunks_embedding_idx on knowledge_chunks
  using hnsw (embedding vector_cosine_ops)
  with (m = 16, ef_construction = 64);

create index if not exists knowledge_chunks_destination_idx
  on knowledge_chunks (destination_id);
create index if not exists knowledge_chunks_content_type_idx
  on knowledge_chunks (content_type);
create index if not exists knowledge_chunks_combined_idx
  on knowledge_chunks (destination_id, content_type);

drop trigger if exists knowledge_chunks_set_updated_at on knowledge_chunks;
create trigger knowledge_chunks_set_updated_at
  before update on knowledge_chunks
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- match_chunks — the retrieval RPC called by /api/generate and /api/chat.
-- Returns the top-K most-similar chunks, optionally filtered by destination
-- + content_type.
-- ---------------------------------------------------------------------------

create or replace function match_chunks(
  query_embedding       vector(1536),
  match_count           integer default 8,
  filter_destination    uuid default null,
  filter_content_types  content_type_enum[] default null
)
returns table (
  id              uuid,
  destination_id  uuid,
  content_type    content_type_enum,
  source_url      text,
  source_name     text,
  heading         text,
  text            text,
  similarity      float
)
language sql stable
as $$
  select
    c.id,
    c.destination_id,
    c.content_type,
    c.source_url,
    c.source_name,
    c.heading,
    c.text,
    1 - (c.embedding <=> query_embedding) as similarity
  from knowledge_chunks c
  where (filter_destination is null or c.destination_id = filter_destination)
    and (filter_content_types is null or c.content_type = any(filter_content_types))
  order by c.embedding <=> query_embedding
  limit match_count;
$$;

-- ---------------------------------------------------------------------------
-- RLS — knowledge is public-read. Writes go via the service_role key only,
-- which bypasses RLS entirely, so no insert/update/delete policies needed.
-- ---------------------------------------------------------------------------

alter table knowledge_chunks enable row level security;

drop policy if exists knowledge_chunks_public_read on knowledge_chunks;
create policy knowledge_chunks_public_read
  on knowledge_chunks for select using (true);
