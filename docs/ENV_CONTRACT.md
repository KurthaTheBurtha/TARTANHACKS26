# CareMap — Environment variable contract

Canonical env vars and where they are used. **Never commit real keys.** There is a **single .env file at repo root**; copy `.env.example` to `.env` in the repo root and fill in values. All apps (backend, bill-parser, mobile) read from this file.

## Canonical list and usage

| Variable | Used by | Purpose | Mock if missing? |
|----------|--------|---------|------------------|
| **OPENAI_API_KEY** | backend | RAG, embeddings, doc analysis, LLM client | Yes (stub/mock) |
| **GEMINI_API_KEY** | backend, bill-parser | Backend: LLM client when LLM_PROVIDER=gemini; bill-parser: PDF parsing | Backend: mock; bill-parser: 500 if missing |
| **LLM_PROVIDER** | backend | `openai` or `gemini` for generate_text/summarize_document | Default openai |
| **ANTHROPIC_API_KEY** | bill-parser | Optional Claude-based parsing | N/A (optional) |
| **SUPABASE_URL** | backend, integrations-abhay (Edge), mobile | Supabase project URL | Backend: mock; Edge/mobile: requests fail |
| **SUPABASE_ANON_KEY** | backend, integrations-abhay (Edge), mobile | Public anon key (client-safe) | Backend: mock; Edge/mobile: requests fail |
| **SUPABASE_SERVICE_ROLE_KEY** | backend, integrations-abhay (Edge) | Server-only; never expose to client | Backend: mock; Edge: required for places mode |
| **SUPABASE_JWT_SECRET** | backend | JWT verification | Backend: mock |
| **GOOGLE_MAPS_API_KEY** | integrations-abhay (Edge) | Provider search (Places API) | Yes when `MOCK_MODE=true` |
| **BACKEND_PORT** | backend | Dev server port (default 8000) | Default 8000 |
| **PORT** | bill-parser | Next.js dev port (default 3000) | Default 3000 |
| **NEXT_PUBLIC_CAREMAP_BACKEND_URL** | bill-parser | Backend URL for CareMap page (default `http://localhost:8000`) | Default 8000 |
| **BILL_PARSER_URL** | backend | CareMap ingest → bill parsing (e.g. `http://localhost:3000`) | Backend uses mock bill |
| **FUNCTIONS_BASE_URL** | backend | CareMap ingest → provider search (e.g. `http://localhost:54321/functions/v1`) | Backend uses mock navigation |
| **EXPO_PUBLIC_SUPABASE_URL** | integrations-abhay/mobile | Supabase URL (client-safe) | App warns; search fails |
| **EXPO_PUBLIC_SUPABASE_ANON_KEY** | integrations-abhay/mobile | Anon key (client-safe) | App warns; search fails |
| **EXPO_PUBLIC_SUPABASE_FUNCTIONS_BASE_URL** | integrations-abhay/mobile | Local Edge Functions URL (optional) | Defaults to `{SUPABASE_URL}/functions/v1` |
| **DEV_BYPASS_AUTH** | integrations-abhay (Edge) | Skip JWT for local demos (never in production) | Default false |
| **MOCK_MODE** | integrations-abhay (Edge) | Use mock provider data | Default true for dev |
| **GOOGLE_PLACES_API_BASE** | integrations-abhay (Edge) | Places API base URL | Default `https://places.googleapis.com` |
| **DATABASE_URL** | backend | Postgres connection string | Backend: mock |
| **SUPABASE_STORAGE_BUCKET** | backend | Storage bucket name | Default `documents` |

## Loading and guardrails

All apps load from the **single root `.env`** (repo root). Copy `.env.example` to `.env` at repo root.

- **Backend:** `pydantic-settings` loads `[repo_root]/.env` (path resolved from `backend/app/core/config.py`). Falls back to `.env` in CWD if root file is missing. Startup logs a **warning** (no secrets) when Supabase or OpenAI are unset and mock mode is used.
- **Bill-parser:** `next.config.mjs` runs `dotenv.config({ path: '../.env' })` so the root `.env` is loaded before Next.js starts. No key values are logged or returned (e.g. `/api/check-api-key` returns only `configured: true/false`).
- **Integrations-abhay Edge:** When serving, use `supabase functions serve --env-file ../../.env` (from `integrations-abhay/`) so Edge functions read the root `.env`. Uses `Deno.env.get()`; no dotenv in Deno.
- **Mobile:** `app.config.js` runs `require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') })` so the root `.env` is loaded. Only `EXPO_PUBLIC_*` are passed to `extra`; app reads from `Constants.expoConfig?.extra` or `process.env`. Startup warns if Supabase vars are missing.

## Single .env location

- **Repo root:** `/.env` — single canonical file. Template: `/.env.example`. Do not commit `.env`.
