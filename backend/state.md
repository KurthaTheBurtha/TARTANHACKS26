# CareMap — Backend state (changelog + legacy)

**→ For current project state (what works, mocked vs live, demo script): see [root STATE.md](../STATE.md).**

Last updated: 2026-02-07  
Owners: Abdoul (Backend/AI), Abhay (Integrations), Kurt (Frontend)

## 0) Mission
CareMap helps users:
1) understand medical bills/EOBs in plain English,
2) ask insurance-aware questions grounded in their policy,
3) find in-network care nearby with confidence.

## 1) Pillars (MVP Scope)
### Pillar A — Medical Doc Breakdown (OCR → Plain English)
- Input: photo/PDF of bill/EOB
- Output:
  - structured extraction (provider, dates, line items, CPT/HCPCS/ICD, totals)
  - plain-English summary
  - "what to do next" checklist
- **Status:** Not started

### Pillar B — Insurance-Aware RAG Chat
- Inputs: extracted bill + user question + policy/SBC/SOB documents
- Output: grounded answers with citations to policy chunks + clear cost-share logic
- Must avoid hallucinations; always cite sources (document chunks)
- **Status:** Not started

### Pillar C — In-Network Navigation ✅ INTEGRATIONS LAYER COMPLETE
- Input: user location + specialty/need + insurance plan
- Output: list of providers/facilities with distance and network status
- **Status:** Edge Functions + schema + seed data + mobile demo ready
- **Owner:** Abhay
- **Location:** `integrations-abhay/`

## 2) Non-Goals (for hackathon MVP)
- No real claims submission
- No real-time eligibility checks (unless easy via mock)
- No storing raw PHI in logs

## 3) Repo Layout (current)
```
/
  state.md                # This file
  
  integrations-abhay/     # ✅ COMPLETE — Pillar C integrations layer
    README.md
    .env.example
    shared/
      contracts.ts        # TypeScript interfaces
      contracts.py        # Pydantic models
    supabase/
      sql/
        schema.sql        # providers, insurance_plans, provider_networks
        seed.sql          # Demo data (~30 providers, 3 plans)
      functions/
        _shared/          # geo.ts, places.ts, normalize.ts
        providers-search/ # Edge Function + mock.json
        plans-search/     # Edge Function + mock.json
    mobile/               # Minimal Expo demo app
    docs/
      runbook.md          # Local dev guide
      merge-strategy.md   # Integration options
      kurt-dropin.md      # Frontend integration guide
      integrations/
        providers-search.md
        plans-search.md
    scripts/
      demo_smoke_test.sh  # One-command test
      curl_*.sh           # Manual testing
      promote_to_main.sh  # Safe copy to main repo

  backend/                # (Abdoul) FastAPI + AI services
    app/
      main.py
      api/
      core/
      models/
      services/
      tests/
    supabase/
      migrations/
      seed/
    Dockerfile
    pyproject.toml

  mobile/                 # (Kurt) Expo React Native
    app/ or src/
    components/
    screens/
    services/
    navigation/
    assets/

  docs/
    prompts/
    architecture/
```

## 4) Runtime Environments
### Backend
- FastAPI (Python)
- Supabase (Postgres + Auth + Storage + Edge Functions)
- OpenAI Vision for doc understanding
- Optional: LangChain (or lightweight custom RAG)

### Integrations Layer (Pillar C)
- Supabase Edge Functions (Deno/TypeScript)
- Google Places API (New) for provider search
- Supabase Postgres for caching + network mappings

### Mobile
- Expo + React Native
- NativeWind (Tailwind for RN)
- Map: Google Maps (via react-native-maps w/ Google provider)

## 5) Data & Privacy Guardrails (MVP)
- Never log raw document text or PII in plaintext logs.
- Store documents in Supabase Storage (private bucket).
- Store only:
  - redacted/structured fields needed for UX
  - embeddings for policy/bill chunks (no full PHI in vectors if avoidable; prefer redaction)
- Use Supabase Auth; backend verifies JWT on every request.
- **Integrations layer:** DEV_BYPASS_AUTH available for demos only; production requires JWT.

## 6) Core Entities

### Existing (integrations-abhay)
| Table | Description | Status |
|-------|-------------|--------|
| `providers` | Cached provider data (place_id, name, address, lat/lng, types, specialties) | ✅ Schema + seed |
| `insurance_plans` | Demo plans (UPMC, Aetna, BCBS, etc.) | ✅ Schema + seed |
| `provider_networks` | Network status mappings (provider_id, plan_id, in_network, confidence, source) | ✅ Schema + seed |

### Planned (backend)
| Table | Description | Status |
|-------|-------------|--------|
| `users` | Supabase Auth | Pending |
| `documents` | User-uploaded bills/EOBs/SOB | Pending |
| `doc_pages` | Optional page-level data | Pending |
| `doc_extractions` | Structured JSON from OCR | Pending |
| `policy_chunks` | Text chunks + embeddings for RAG | Pending |
| `chat_sessions` | Chat session metadata | Pending |
| `chat_messages` | Messages with citations | Pending |

## 7) API Contracts

### Pillar C — Care Navigation (✅ COMPLETE)

**Base URL:** `/functions/v1/` (Supabase Edge Functions)

| Endpoint | Method | Description | Status |
|----------|--------|-------------|--------|
| `/providers-search` | POST | Search providers by location, filters, network status | ✅ Complete |
| `/plans-search` | POST | Search insurance plans | ✅ Complete |

**Provider Search Request:**
```json
{
  "lat": 40.4406,
  "lng": -79.9959,
  "radius_miles": 10,
  "limit": 20,
  "source": "mock" | "cache" | "places",
  "plan_id": "uuid",        // Optional: for network status overlay
  "specialty": "cardiology", // Optional
  "types": ["hospital"],     // Optional, defaults to healthcare types
  "q": "urgent care"         // Optional: text search (places mode)
}
```

**Provider Search Response:**
```json
{
  "request_id": "req_abc123",
  "providers": [
    {
      "id": "uuid",
      "name": "UPMC Presbyterian",
      "address": { "line1": "...", "city": "Pittsburgh", "state": "PA" },
      "geo": { "lat": 40.44, "lng": -79.95 },
      "distance_miles": 2.3,
      "network_status": {
        "in_network": true,
        "network_name": "UPMC Health Plan",
        "confidence": 0.9,
        "source": "seed" | "heuristic" | "unknown"
      }
    }
  ],
  "meta": { "total": 15, "returned": 10, "ts": "...", "source_used": "cache" }
}
```

**Demo Plan IDs:**
| Plan | UUID |
|------|------|
| BCBS Blue Choice PPO | `11111111-1111-1111-1111-111111111111` |
| Aetna Open Choice PPO | `22222222-2222-2222-2222-222222222222` |
| UPMC PPO Demo | `33333333-3333-3333-3333-333333333333` |

### Pillar A & B — Doc Breakdown & RAG Chat (Pending)
```
POST /v1/docs/upload
POST /v1/docs/{doc_id}/analyze
GET  /v1/docs/{doc_id}
POST /v1/chat/sessions
POST /v1/chat/sessions/{session_id}/messages
GET  /v1/chat/sessions/{session_id}
```

## 8) Dependency Map

### Kurt (Frontend) depends on:
- ✅ Provider search API contracts (see `integrations-abhay/docs/kurt-dropin.md`)
- ✅ Plans search API contracts
- ✅ Mock mode for offline development (`source: "mock"`)
- ⏳ Doc upload/analyze endpoints (Abdoul)
- ⏳ Chat endpoints (Abdoul)

### Abhay (Integrations) depends on:
- ✅ Google Maps API key (configured in .env)
- ✅ Supabase project + Edge Functions
- ✅ Provider search abstraction (complete)

### Abdoul (Backend) depends on:
- ✅ Supabase project setup
- ⏳ Migrations for Pillar A/B tables
- ⏳ Storage buckets for documents
- ℹ️ Can use `integrations-abhay/shared/contracts.py` for provider types

## 9) Next Milestones (48–72h hackathon cadence)
M1: Backend boots + Supabase schema migrated + healthcheck
M2: Mobile boots + chat-first UI + mock responses wired
M3: Doc upload + analyze → summary shown in app
M4: Policy ingest → embeddings → RAG answer with citations
M5: Map search → in-network shell + provider list rendering

## 10) Integration Notes

### For Kurt — Using the Integrations Layer
1. See `integrations-abhay/docs/kurt-dropin.md` for copy-paste code
2. Use `source: "mock"` during UI development (no backend needed)
3. Switch to `source: "cache"` when DB is seeded
4. Display network badges as "Likely In-Network" for `source: "heuristic"`

### For Abdoul — Merging to Main Repo
1. See `integrations-abhay/docs/merge-strategy.md`
2. **Option A (Vendor Mode):** Use integrations-abhay as-is, call Edge Functions directly
3. **Option B (Promote Mode):** Run `./integrations-abhay/scripts/promote_to_main.sh --dry-run`
4. SQL files in `integrations-abhay/supabase/sql/` can be merged into migrations

### Quick Test
```bash
cd integrations-abhay
export FUNCTIONS_BASE_URL="http://localhost:54321/functions/v1"
./scripts/demo_smoke_test.sh
```

## 11) Milestones (status)

| Milestone | Description | Status |
|-----------|-------------|--------|
| M1 | Backend boots + Supabase schema + healthcheck | ⏳ Pending |
| M2 | Mobile boots + chat UI + mock responses | ⏳ Pending |
| M3 | Doc upload + analyze → summary in app | ⏳ Pending |
| M4 | Policy ingest → embeddings → RAG with citations | ⏳ Pending |
| **M5** | **Provider search + network status + list rendering** | **✅ Complete (integrations-abhay)** |

### M5 Deliverables (Complete)
- [x] Edge Functions: `providers-search`, `plans-search`
- [x] Database schema: `providers`, `insurance_plans`, `provider_networks`
- [x] Seed data: ~30 Pittsburgh providers, 3 demo plans, network mappings
- [x] Google Places API integration with caching
- [x] Network status overlay (seed → heuristic → unknown)
- [x] Mock mode for offline development
- [x] Mobile demo app scaffold
- [x] Documentation + scripts
- [x] DEV_BYPASS_AUTH for hackathon demos

## Changelog

### 2026-02-06 23:12:01 EST
- **Owner:** Abdoul
- **Summary:** Enhanced Makefile with strict pre-push checks and demo workflow. Added `make check` target that fails on formatting/lint/syntax/test issues (no `|| true`), `make smoke` for endpoint smoke testing with demo seed, `make demo` for full bootstrap+seed+server workflow, and updated `test-quick` to use deterministic mock mode. Created `smoke.sh` script that tests key endpoints (health, me, providers/search) with graceful jq fallback. Updated README with dev commands section.
- **Files changed:**
  - `backend/Makefile` (Added check, check-ci, smoke, demo targets; updated test-quick to use mock mode)
  - `backend/scripts/smoke.sh` (NEW: Endpoint smoke testing script with jq fallback)
  - `backend/README.md` (Added "Dev Commands" section with quick reference)
- **Contracts changed?** No — Makefile targets and scripts are tooling only, no API contract changes.
- **Next TODO / dependencies:**
  - Run `make check` before every push to catch issues early
  - Use `make smoke` to verify backend is working before demos
  - Use `make demo` for one-command demo setup
  - Consider adding `make check` to pre-commit hook

### 2026-02-06 23:04:32 EST
- **Owner:** Abdoul
- **Summary:** Implemented security boundary testing and RLS isolation validation. Added `/v1/me` whoami endpoint, test auth override mechanism (X-Test-User header when TEST_BYPASS_AUTH=true), and comprehensive isolation tests for docs, policies, chat, and providers ensuring zero cross-tenant data leakage. Created integration smoke test suite covering all major endpoints. All tests run in mock mode (no Supabase required) and optionally in Supabase mode with real RLS validation.
- **Files changed:**
  - `backend/app/api/v1/me.py` (NEW: GET /v1/me whoami endpoint)
  - `backend/app/api/router.py` (Added /v1/me router)
  - `backend/app/core/security.py` (Added test override support via X-Test-User header)
  - `backend/app/core/config.py` (Added test_bypass_auth and auth_mode settings)
  - `backend/app/models/schemas.py` (Added MeResponse schema)
  - `backend/tests/conftest.py` (Updated to use X-Test-User header, added TEST_USER_A/B constants)
  - `backend/tests/test_auth_me.py` (NEW: Auth and /me endpoint tests)
  - `backend/tests/test_rls_isolation_docs.py` (NEW: Document isolation tests)
  - `backend/tests/test_rls_isolation_policies.py` (NEW: Policy isolation tests)
  - `backend/tests/test_rls_isolation_chat.py` (NEW: Chat isolation tests)
  - `backend/tests/test_rls_isolation_providers_cache.py` (NEW: Provider cache isolation tests)
  - `backend/tests/test_integration_smoke.py` (NEW: Integration smoke test suite)
  - `docs/architecture/auth_rls_audit.md` (NEW: Authentication and RLS audit documentation)
- **Contracts changed?** Yes — Additive:
  - Added `GET /v1/me` endpoint returning `{ user_id, auth_source, scopes[], issued_at }`
  - Test override mechanism (X-Test-User header) only active when TEST_BYPASS_AUTH=true (test mode only)
- **Next TODO / dependencies:**
  - Run isolation tests in Supabase mode to validate RLS policies work correctly
  - Verify all cross-tenant access attempts return 404 (not 403) consistently
  - Consider adding audit logging for cross-tenant access attempts
  - Review RLS policies in Supabase dashboard to ensure they match test expectations

### 2026-02-06 23:03:17 EST
- **Owner:** Abdoul
- **Summary:** Added streaming chat endpoint with SSE and demo seed script. Implemented `POST /v1/chat/sessions/{id}/messages/stream` that streams responses token-by-token using Server-Sent Events, with support for both LLM streaming (OpenAI) and stub streaming (deterministic chunks). Created shared chat service to orchestrate persistence, retrieval, and generation for both streaming and non-streaming endpoints. Added demo seed script that populates database with sample policy chunks, analyzed documents, chat sessions, and providers for instant demos.
- **Files changed:**
  - `backend/app/api/v1/chat.py` (Added streaming endpoint, refactored to use shared chat service)
  - `backend/app/services/chat/chat_service.py` (NEW: Shared chat service for message creation and streaming)
  - `backend/app/services/rag/generator.py` (Added `_generate_with_llm_stream` async generator for OpenAI streaming)
  - `backend/app/core/sse.py` (NEW: SSE event formatting helpers)
  - `backend/app/models/schemas.py` (Added CreateChatStreamRequest schema)
  - `backend/app/core/config.py` (Added demo mode settings: demo_mode, demo_user_id, demo_policy_doc_id)
  - `backend/scripts/seed_demo.py` (NEW: Demo data seeding script)
  - `backend/tests/test_chat_stream.py` (NEW: Streaming endpoint contract tests)
  - `docs/architecture/streaming_chat.md` (NEW: Streaming chat architecture and mobile integration guide)
- **Contracts changed?** Yes — Additive:
  - Added `POST /v1/chat/sessions/{session_id}/messages/stream` endpoint returning `text/event-stream`
  - SSE events: `meta` (citations early), `delta` (incremental text), `final` (complete response), `error` (errors)
  - Final event JSON matches existing non-stream chat contract shape
  - Non-stream endpoint now uses shared chat service (same logic, different output format)
- **Next TODO / dependencies:**
  - Test streaming endpoint with real OpenAI key to verify LLM streaming works
  - Run `python backend/scripts/seed_demo.py` to populate demo data
  - Mobile team can integrate SSE using EventSource API or react-native-sse
  - Verify streaming works in production with proper proxy configuration

### 2026-02-06 23:01:27 EST
- **Owner:** Abdoul
- **Summary:** Added reliability and repeatability infrastructure: contract tests for all endpoints, canonical contract examples, dev bootstrap workflow, and GitHub Actions CI. Tests run in mock mode (no Supabase/OpenAI required) and validate response shapes match guaranteed contracts. Added Makefile with dev/test/lint targets and bootstrap scripts for one-command local setup.
- **Files changed:**
  - `backend/app/core/contracts.py` (NEW: Canonical contract examples for all endpoints)
  - `backend/app/core/config.py` (Updated with dev/test defaults for mock mode)
  - `backend/tests/conftest.py` (NEW: Pytest fixtures with mocked JWT auth)
  - `backend/tests/test_health.py` (NEW: Health check contract test)
  - `backend/tests/test_docs_contract.py` (NEW: Document endpoints contract tests)
  - `backend/tests/test_chat_contract.py` (NEW: Chat endpoints contract tests)
  - `backend/tests/test_policies_contract.py` (NEW: Policy endpoints contract tests)
  - `backend/tests/test_providers_contract.py` (NEW: Provider endpoints contract tests)
  - `backend/Makefile` (NEW: Dev/test/lint/bootstrap targets)
  - `backend/scripts/dev_bootstrap.sh` (NEW: One-command dev environment setup)
  - `backend/scripts/run_migrations.sh` (NEW: Migration runner script)
  - `backend/requirements.txt` (Added pytest, pytest-asyncio, ruff)
  - `.github/workflows/backend_ci.yml` (NEW: GitHub Actions CI workflow)
  - `docs/architecture/contracts.md` (NEW: API contracts documentation)
- **Contracts changed?** No — Contract tests validate existing response shapes. All contracts documented in `contracts.py` match current API behavior. Tests ensure these shapes never break.
- **Next TODO / dependencies:**
  - Run `make test` locally to verify all contract tests pass
  - Verify CI workflow passes on PR
  - Frontend team can reference `contracts.py` for guaranteed response shapes
  - Consider adding integration tests for Supabase mode (when env vars present)

### 2026-02-06 23:00:02 EST
- **Owner:** Abdoul
- **Summary:** Implemented Pillar C backend v0: provider search with in-network scoring. Added cache-first provider search with MockProviderSource adapter, policy-aware in-network scoring using RAG retrieval, provider normalization and distance calculation, and weighted heuristics for network status evaluation. Upgraded `GET /v1/providers/search` to return providers sorted by network confidence and distance, and added `GET /v1/providers/{provider_id}` endpoint. All scoring is deterministic and debuggable with user-friendly reasons.
- **Files changed:**
  - `backend/app/api/v1/providers.py` (Rewrote with caching, scoring, policy-aware evaluation)
  - `backend/app/models/schemas.py` (Updated Provider schema with network status object, added NetworkStatus, NetworkEvidence, CenterPoint, CacheInfo schemas)
  - `backend/app/services/providers/source.py` (NEW: ProviderSource adapter interface with MockProviderSource implementation)
  - `backend/app/services/providers/normalizer.py` (NEW: Provider normalization and distance calculation)
  - `backend/app/services/providers/search.py` (NEW: Cache-first provider search service)
  - `backend/app/services/network/in_network.py` (NEW: Policy-aware in-network scoring)
  - `backend/app/services/network/heuristics.py` (NEW: Network scoring heuristics and weights)
  - `backend/app/services/db/providers_repo.py` (NEW: Provider cache repository operations)
  - `docs/architecture/provider_search.md` (NEW: Provider search architecture specification)
  - `docs/architecture/in_network_scoring.md` (NEW: In-network scoring specification)
- **Contracts changed?** Yes — Response shape updated:
  - `GET /v1/providers/search` now returns `{ query, center, radius_miles, providers[], cache: { hit, ttl_seconds } }` with providers including `network` object `{ status, confidence, reasons[], evidence[] }`
  - Provider schema updated: `provider_id`, `lat`, `lng`, `distance_miles`, `types[]`, `network` object (replaces simple `network_status` string)
  - Added `GET /v1/providers/{provider_id}` endpoint returning single provider with network scoring
- **Next TODO / dependencies:**
  - Test provider search with caching (verify cache hits on repeated queries)
  - Test policy-aware scoring with ingested policy documents
  - Abhay can integrate Google Places API by implementing ProviderSource interface
  - Consider adding dedicated `search_cache` table for persistent caching (currently in-memory)
  - Mobile team can now display providers on map with in-network confidence indicators

### 2026-02-06 22:58:20 EST
- **Owner:** Abdoul
- **Summary:** Implemented insurance-aware RAG pipeline for Pillar B. Added policy document ingestion (upload, PDF extraction, chunking, embedding, vector storage), RAG retrieval with vector search, and upgraded chat endpoint to return grounded responses with citations. All services include fallback behavior (deterministic embeddings, stub responses) when OpenAI key missing. Chat now persists messages and citations to database.
- **Files changed:**
  - `backend/app/core/config.py` (Added embedding model and dimension settings)
  - `backend/app/api/v1/policies.py` (NEW: POST /upload, POST /{doc_id}/ingest endpoints)
  - `backend/app/api/v1/chat.py` (Rewrote with RAG retrieval, citation generation, message persistence)
  - `backend/app/api/router.py` (Added policies router)
  - `backend/app/models/schemas.py` (Added PolicyIngestResponse schema)
  - `backend/app/services/policies/pdf_extract.py` (NEW: PDF text extraction with pdfplumber/pypdf)
  - `backend/app/services/policies/chunker.py` (NEW: Text chunking with overlap)
  - `backend/app/services/policies/ingest.py` (NEW: Policy ingestion orchestrator)
  - `backend/app/services/rag/embedder.py` (NEW: Embedding service with OpenAI and deterministic hash fallback)
  - `backend/app/services/rag/retriever.py` (NEW: Vector search in policy_chunks with user filtering)
  - `backend/app/services/rag/generator.py` (NEW: Response generation with LLM or stub)
  - `backend/app/services/db/policies_repo.py` (NEW: Policy chunks database operations)
  - `backend/app/services/storage/supabase_storage.py` (Updated to handle policy paths)
  - `backend/requirements.txt` (Added pdfplumber, pypdf, openai)
  - `docs/architecture/rag_pipeline.md` (NEW: RAG pipeline architecture specification)
- **Contracts changed?** Yes — Additive changes only:
  - `POST /v1/policies/upload` returns same shape as docs/upload (reuses DocumentUploadResponse)
  - `POST /v1/policies/{doc_id}/ingest` returns `{ doc_id, status, chunks_created, embedding_model, notes }`
  - `POST /v1/chat/sessions/{session_id}/messages` now returns citations from actual policy chunks (same response shape, but citations reference real chunks)
  - Chat messages persisted to database with citations in `assistant_response` JSONB field
- **Next TODO / dependencies:**
  - Test policy upload → ingest → chat flow end-to-end
  - Verify pgvector cosine similarity search works correctly in Supabase
  - Consider implementing proper vector search via Supabase RPC if client-side approach insufficient
  - Mobile team can now upload policies and get grounded chat responses with citations
  - Abhay can reuse policy language for network rules

### 2026-02-06 22:52:16 EST
- **Owner:** Abdoul
- **Summary:** Implemented real document lifecycle with Supabase Storage integration. Added storage service for signed upload/download URLs, document analyzer service with OpenAI stub, database service for persistence, and PHI-safe logging. Updated `/v1/docs/upload` to create document records and return signed upload URLs, `/v1/docs/{doc_id}/analyze` to fetch files, run analysis, and persist extractions, and added `GET /v1/docs/{doc_id}` endpoint. All endpoints maintain mock fallback when storage/DB not configured.
- **Files changed:**
  - `backend/app/core/config.py` (Added storage bucket, signed URL expiration, OpenAI API key env vars)
  - `backend/app/core/logging.py` (NEW: PHI-safe logging utilities)
  - `backend/app/api/v1/docs.py` (Rewrote with real storage/DB logic + mock fallback; added GET endpoint)
  - `backend/app/models/schemas.py` (Updated DocumentUploadResponse to include upload info object; made extraction optional in DocumentAnalysisResponse)
  - `backend/app/services/storage/supabase_storage.py` (NEW: Supabase Storage service with signed URLs)
  - `backend/app/services/db/supabase_db.py` (NEW: Database service for documents, extractions, line_items)
  - `backend/app/services/docs/analyzer.py` (NEW: Document analyzer with OpenAI stub, mock fallback)
  - `backend/app/services/docs/parser.py` (NEW: Normalize extraction results to DB schema)
  - `backend/supabase/migrations/0002_storage_buckets.sql` (NEW: Storage bucket setup documentation)
  - `docs/architecture/doc_pipeline.md` (NEW: Document processing pipeline specification)
- **Contracts changed?** Yes — Additive changes only:
  - `POST /v1/docs/upload` now returns `{ doc: {...}, upload: { bucket, path, signed_url, expires_in } }` (added `upload` object, kept `doc` object)
  - `POST /v1/docs/{doc_id}/analyze` and `GET /v1/docs/{doc_id}` now include optional `warning` field when using mock fallback
  - `GET /v1/docs/{doc_id}` returns `extraction: null` if not analyzed (backward compatible)
- **Next TODO / dependencies:**
  - Create Supabase Storage bucket "documents" via dashboard/CLI
  - Configure `SUPABASE_STORAGE_BUCKET` and `SIGNED_URL_EXPIRES_IN` in .env
  - Test full upload → analyze → get flow with real Supabase instance
  - Implement OpenAI Vision API integration in analyzer (currently stub)
  - Mobile team can now upload files directly to signed URLs

### 2026-02-06 22:47:14 EST
- **Owner:** Abdoul
- **Summary:** Stand up backend "spine" with FastAPI app, versioned /v1 API endpoints (docs, chat, providers), JWT auth via Supabase, and complete database schema with migrations. All endpoints return deterministic mock responses matching specified contract shapes for immediate mobile integration.
- **Files changed:**
  - `backend/app/main.py` (FastAPI app with CORS, health check, router setup)
  - `backend/app/core/config.py` (Pydantic Settings configuration)
  - `backend/app/core/security.py` (JWT verification with Supabase)
  - `backend/app/api/router.py` (API router aggregation)
  - `backend/app/api/v1/docs.py` (POST /upload, POST /{doc_id}/analyze)
  - `backend/app/api/v1/chat.py` (POST /sessions, POST /sessions/{id}/messages)
  - `backend/app/api/v1/providers.py` (GET /search)
  - `backend/app/models/schemas.py` (Pydantic schemas matching mock payload shapes)
  - `backend/supabase/migrations/0001_init.sql` (Complete schema: documents, doc_extractions, line_items, policy_chunks, chat_sessions, chat_messages, providers_cache, network_rules with pgvector and RLS)
  - `backend/supabase/seed/dev_seed.sql` (Sample provider data)
  - `backend/pyproject.toml` (Poetry dependencies)
  - `backend/requirements.txt` (pip dependencies)
  - `backend/README.md` (Setup and API documentation)
- **Contracts changed?** Yes — Established initial API contracts matching state.md v0 contracts with mock implementations. Endpoints return deterministic mock JSON matching specified shapes (document analysis with extraction, chat responses with citations, provider search results).
- **Next TODO / dependencies:**
  - Apply Supabase migration to project database
  - Configure Supabase Storage bucket for document uploads
  - Mobile team can start integrating against mock endpoints
  - Replace mock responses with real AI/ML logic (OCR, RAG, provider search) as components become available
