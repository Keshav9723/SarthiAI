# Sarthi

An AI-native, retrieval-augmented travel-planning web application built for the Indian domestic-travel market. Sarthi turns a vague intent — *"a four-day couple's trip to Goa under sixty thousand rupees"* — into a complete, day-by-day itinerary in under thirty seconds. The conversational chatbot streams its replies token-by-token over Server-Sent Events.

Built with Next.js 14, Supabase (PostgreSQL + pgvector), and a provider-agnostic LLM layer that supports Anthropic Claude, Google Gemini, and locally-hosted Ollama models.

---

## Table of contents

1. [What Sarthi does](#what-sarthi-does)
2. [Architecture overview](#architecture-overview)
3. [Tech stack](#tech-stack)
4. [Quick start](#quick-start)
5. [Environment variables](#environment-variables)
6. [Database setup](#database-setup)
7. [Knowledge base ingestion](#knowledge-base-ingestion)
8. [Available scripts](#available-scripts)
9. [Project structure](#project-structure)
10. [Deployment](#deployment)
11. [Team](#team)
12. [License](#license)

---

## What Sarthi does

- **Known-Destination wizard** — user supplies origin, destination, dates, budget, group composition; Sarthi generates a complete day-by-day itinerary with flights, hotels, daily activities, and an auto-populated budget.
- **Surprise Me** — user supplies only preferences (vibes, group, budget, duration); Sarthi ranks Indian destinations by a weighted composite of weather comfort, vibe affinity, budget feasibility, and trip duration.
- **Conversational chatbot** — a seven-intent classifier (`location_info`, `view_itineraries`, `surprise_me`, `weather`, `quick_plan`, `modify_itinerary`, `general_chat`) routes user messages to specialised handlers. The `modify_itinerary` handler edits an existing itinerary in place via a tool-calling orchestration loop.
- **RAG knowledge base** — 10,500+ classified chunks across 305 Indian destinations, embedded with `mxbai-embed-large` into a pgvector HNSW index for fast semantic retrieval.
- **Live external data** — Amadeus (flights, hotels), RapidAPI (Indian Railways), OpenWeatherMap (forecast + monthly climatology), Google Maps (distance matrix, places, embed).
- **Budget tracker** — auto-populated from live pricing at generation time; user records actual expenses and reconciles against the plan.
- **Row-level security** — every user-owned table is isolated at the database layer by the authenticated user's identifier.

---

## Architecture overview

```
                         +------------------+
   browser (React) <---->|  Next.js 14 App  |
                         |   App Router     |
                         +------------------+
                                 |
                                 | server actions / route handlers
                                 v
                +-----------------------------------+
                |        Sarthi server layer        |
                |  - intent classifier              |
                |  - tool-use orchestrator          |
                |  - RAG retrieval                  |
                |  - structured generation (Zod)    |
                +-----------------------------------+
                       |          |           |
                       v          v           v
              +-----------+  +--------+  +-------------+
              |  Supabase |  |  LLM   |  | External    |
              |  Postgres |  | layer  |  | APIs        |
              |  +pgvector|  |        |  |             |
              +-----------+  +--------+  +-------------+
                                   |
                            (Anthropic / Gemini /
                             Ollama: qwen3.5:9b,
                             qwen2.5:1.5b,
                             mxbai-embed-large)
```

The three database layers (Destination Knowledge / User Data / RAG) are described in detail in `supabase/migrations/`.

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript 5.5 |
| Styling | Tailwind CSS 3.4 |
| UI runtime | React 18 (Server + Client Components) |
| Database | PostgreSQL 15 (Supabase) |
| Vector search | pgvector with HNSW index (m=16, ef_construction=64) |
| Auth | Supabase Auth (email + Google OAuth) + RLS |
| Validation | Zod (runtime + compile-time) |
| LLM providers | Anthropic Claude, Google Gemini, Ollama (qwen3.5:9b for synthesis, qwen2.5:1.5b for classification) |
| Embeddings | mxbai-embed-large (1024 dimensions, via Ollama) |
| External APIs | Amadeus, OpenWeatherMap, RapidAPI Railways, Google Maps |
| Hosting | Vercel (serverless) |
| Monitoring | Sentry |

---

## Quick start

### Prerequisites

- Node.js 20 LTS
- A Supabase project (free tier is enough)
- One of: Anthropic API key, Google AI Studio key, or a local Ollama install
- Optional but recommended: Amadeus, OpenWeatherMap, RapidAPI, and Google Maps keys (the app degrades gracefully when any of these is missing)

### Install

```bash
git clone https://github.com/Keshav9723/SarthiAI.git
cd SarthiAI
npm install
```

### Configure environment

See the [Environment variables](#environment-variables) section for the complete list.

### Run the database migrations

In the Supabase SQL editor, run the files under `supabase/migrations/` in order:

```
001_itineraries.sql
002_rag.sql
003_user_data.sql
004_switch_to_1024_dim.sql
005_destinations_metadata.sql
006_seasonal_scores.sql
```

### Start the dev server

```bash
npm run dev
```

Open <http://localhost:3000>.

To verify all integrations are reachable, hit <http://localhost:3000/api/debug/health>.

---

## Environment variables

| Variable | Required | Purpose |
|---|:-:|---|
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | yes | Supabase anon / publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | for seeding | Service-role key used by `scripts/seed-templates.ts` |
| `LLM_PROVIDER` | yes | One of `anthropic`, `gemini`, `ollama` |
| `ANTHROPIC_API_KEY` | if `LLM_PROVIDER=anthropic` | Get one at <https://console.anthropic.com> |
| `ANTHROPIC_MODEL` | no | Defaults to `claude-sonnet-4-6` |
| `GEMINI_API_KEY` | if `LLM_PROVIDER=gemini` | Get one at <https://aistudio.google.com/apikey> |
| `GEMINI_MODEL` | no | Defaults to `gemini-2.5-flash` |
| `OLLAMA_BASE_URL` | if `LLM_PROVIDER=ollama` | Defaults to `http://localhost:11434` |
| `OLLAMA_LLM_MODEL` | no | Defaults to `qwen3.5:9b` |
| `OLLAMA_CHAT_MODEL` | no | Defaults to `qwen2.5:1.5b` |
| `AMADEUS_API_KEY` | no | Flight + hotel inventory |
| `AMADEUS_API_SECRET` | no | Amadeus client secret |
| `OPENWEATHERMAP_API_KEY` | no | Forecast + monthly climatology |
| `RAPIDAPI_KEY` | no | Indian Railways via RapidAPI |
| `GOOGLE_MAPS_API_KEY` | no | Server-side geocoding |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | no | Client-side Maps Embed (the map widget) |
| `CALENDARIFIC_API_KEY` | no | Festival data |
| `UNSPLASH_ACCESS_KEY` | no | Destination hero images |
| `NEXT_PUBLIC_SITE_URL` | no | Used in analytics headers |

If a non-required variable is missing, the corresponding feature degrades to a placeholder rather than crashing.

---

## Database setup

The migrations create three semantically distinct schemas:

- **Destination Knowledge** — `destinations`, `destination_experiences`, `destination_faqs`, `destinations_metadata`, `seasonal_scores`. Globally-shared, read-only from the application.
- **User Data** — `itineraries`, `budgets`, `budget_categories`, `budget_expenses`, `wishlist`, `checklist_state`, `trip_start_dates`, `user_preferences`. Every row carries a `user_id` and is protected by an RLS policy keyed on `auth.uid()`.
- **RAG** — `knowledge_chunks` with a 1024-dimensional `vector` column indexed under HNSW (cosine distance). A `match_chunks(query_embedding, match_count, filter_destination, filter_content_types)` RPC exposes retrieval as a single function call.

After running the migrations, seed the destination catalogue:

```bash
npx tsx scripts/seed-templates.ts
```

---

## Knowledge base ingestion

The RAG knowledge base is built offline. Scripts live under `scripts/scrape/` and `scripts/embed/`.

```bash
# 1. Scrape Wikivoyage / Wikipedia content for each destination
npx tsx scripts/scrape/run.ts

# 2. Chunk, classify into 14 content categories, embed, upsert
npx tsx scripts/embed/run.ts
```

Requires a running Ollama instance with `mxbai-embed-large` pulled:

```bash
ollama pull mxbai-embed-large
```

The pipeline is idempotent — re-running refreshes changed chunks rather than duplicating.

---

## Available scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start the Next.js dev server |
| `npm run build` | Production build |
| `npm run start` | Run the production build |
| `npm run lint` | ESLint pass |
| `npm run typecheck` | TypeScript strict-mode check |
| `npx tsx scripts/seed-templates.ts` | Seed destinations and template itineraries |
| `npx tsx scripts/scrape/run.ts` | Run the offline scraping pipeline |
| `npx tsx scripts/embed/run.ts` | Chunk + classify + embed scraped content |

---

## Project structure

```
SarthiAI/
├── app/                          # Next.js App Router (routes + API handlers)
│   ├── api/
│   │   ├── chat/                 # SSE streaming chatbot endpoint
│   │   ├── generate/             # Itinerary generation
│   │   ├── itinerary/[id]/       # Read / patch / delete
│   │   ├── surprise/score/       # Surprise-Me scoring
│   │   ├── budget/               # Budget CRUD
│   │   └── debug/                # Health checks + RAG debug
│   ├── itinerary/[id]/           # Itinerary detail page
│   ├── explore/                  # Explore index + destination pages
│   ├── generate/                 # Known-Destination wizard
│   ├── surprise/                 # Surprise-Me wizard
│   ├── budget/                   # Budget tracker
│   ├── my-itineraries/           # Saved trips
│   └── auth/                     # Login / signup
├── components/                   # React components, organised by feature
├── lib/
│   ├── api/llm/                  # Provider-agnostic LLM wrappers
│   ├── api/                      # External API integrations (Amadeus, weather, trains, maps)
│   ├── intents/                  # Chatbot intent classifier + handlers
│   ├── orchestrator/             # Tool-use orchestration loop
│   ├── schemas/                  # Zod schemas (single source of truth)
│   ├── queries/                  # Server-side Supabase queries
│   ├── itinerary/                # Itinerary patch + route optimiser
│   └── supabase/                 # Server + client Supabase factories
├── supabase/migrations/          # Schema migrations (run in order)
└── scripts/                      # Offline ingestion + seed scripts
```

---

## Deployment

Live at **<https://sarthitravel.vercel.app/>**

---

