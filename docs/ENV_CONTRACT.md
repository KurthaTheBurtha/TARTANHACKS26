# CareMap — Environment variable contract

Canonical env vars and where they are used. **Never commit real keys.** Copy from `.env.example` in each app directory.

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

- **Backend:** `pydantic-settings` loads `backend/.env`. Startup logs a **warning** (no secrets) when Supabase or OpenAI are unset and mock mode is used.
- **Bill-parser:** Next.js loads `.env.local` automatically. No key values are logged or returned (e.g. `/api/check-api-key` returns only `configured: true/false`).
- **Integrations-abhay Edge:** Load with `supabase functions serve --env-file .env`. Uses `Deno.env.get()`; no dotenv in Deno.
- **Mobile:** `app.config.js` runs `require('dotenv').config()` and passes only `EXPO_PUBLIC_*` into `extra`; app reads from `Constants.expoConfig?.extra` or `process.env`. Startup warns if Supabase vars are missing.

## .env.example locations

- **Root:** `/.env.example` — canonical reference.
- **Backend:** `/backend/.env.example`
- **Bill-parser:** `/bill-parser/.env.example` (copy to `.env.local`)
- **Integrations-abhay:** `/integrations-abhay/.env.example`
- **Mobile:** `/integrations-abhay/mobile/.env.example`
