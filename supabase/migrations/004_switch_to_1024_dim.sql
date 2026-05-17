-- supabase/migrations/004_switch_to_1024_dim.sql
-- Switches knowledge_chunks.embedding from vector(1536) (OpenAI) to vector(1024)
-- (Ollama mxbai-embed-large). Drops + recreates the HNSW index and match_chunks
-- RPC because both have the dimension baked into their signatures.
--
-- Destructive: truncates knowledge_chunks. Run before the first scrape — the
-- table is empty at this point anyway.

drop index if exists knowledge_chunks_embedding_idx;
drop function if exists match_chunks(vector(1536), integer, uuid, content_type_enum[]);

truncate table knowledge_chunks;
alter table knowledge_chunks alter column embedding type vector(1024);

create index knowledge_chunks_embedding_idx on knowledge_chunks
  using hnsw (embedding vector_cosine_ops)
  with (m = 16, ef_construction = 64);

create or replace function match_chunks(
  query_embedding       vector(1024),
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
    c.id, c.destination_id, c.content_type, c.source_url, c.source_name,
    c.heading, c.text,
    1 - (c.embedding <=> query_embedding) as similarity
  from knowledge_chunks c
  where (filter_destination is null or c.destination_id = filter_destination)
    and (filter_content_types is null or c.content_type = any(filter_content_types))
  order by c.embedding <=> query_embedding
  limit match_count;
$$;
