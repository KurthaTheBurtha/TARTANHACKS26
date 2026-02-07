# CareMap — Integrations state

**→ For current project state (what works, mocked vs live, demo script): see [root STATE.md](../../STATE.md).**

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

## 9) Integration Notes

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

## 10) Milestones

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
