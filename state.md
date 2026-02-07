# CareMap — STATE.md (Clean Start)
Last updated: 2026-02-06
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
  - “what to do next” checklist

### Pillar B — Insurance-Aware RAG Chat
- Inputs: extracted bill + user question + policy/SBC/SOB documents
- Output: grounded answers with citations to policy chunks + clear cost-share logic
- Must avoid hallucinations; always cite sources (document chunks)

### Pillar C — In-Network Navigation
- Input: user location + specialty/need + insurance network hints
- Output: map + list of providers/facilities, ranked; “in-network confidence” score

## 2) Non-Goals (for hackathon MVP)
- No real claims submission
- No real-time eligibility checks (unless easy via mock)
- No storing raw PHI in logs

## 3) Repo Layout (target)
/
  backend/              # FastAPI + Supabase + AI services
    app/
      main.py
      api/              # routers
      core/             # settings, security, logging
      models/           # Pydantic schemas only (DB via Supabase)
      services/         # OCR, RAG, billing parser, network logic
      tests/
    supabase/
      migrations/
      seed/
    Dockerfile
    pyproject.toml
  mobile/               # Expo (React Native)
    app/ or src/
    components/
    screens/
    services/           # API clients + mocks
    navigation/
    assets/
  docs/
    prompts/
    architecture/
  STATE.md

> If current repo differs, keep this as “desired structure” and adapt paths minimally.

## 4) Runtime Environments
### Backend
- FastAPI (Python)
- Supabase (Postgres + Auth + Storage + Vector)
- OpenAI Vision for doc understanding
- Optional: LangChain (or lightweight custom RAG)

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

## 6) Core Entities (initial)
- users (Supabase Auth)
- documents (user-uploaded bills/EOBs/SOB)
- doc_pages (optional)
- doc_extractions (structured JSON)
- policy_chunks (text chunks + embeddings)
- chat_sessions / chat_messages (with citations)
- providers (cached provider search results)
- network_rules (simple “in-network” logic parameters)

## 7) API Contracts (v0)
### Doc Breakdown
POST /v1/docs/upload
POST /v1/docs/{doc_id}/analyze
GET  /v1/docs/{doc_id}

### Insurance RAG Chat
POST /v1/chat/sessions
POST /v1/chat/sessions/{session_id}/messages
GET  /v1/chat/sessions/{session_id}

### Care Navigation
GET /v1/providers/search?query=&lat=&lng=&radius_miles=
GET /v1/providers/{provider_id}

## 8) Dependency Map (initial)
- Kurt depends on:
  - API contracts + mock endpoints OR local mocks
- Abhay depends on:
  - Google Maps key + provider search abstraction
- Abdoul depends on:
  - Supabase project + migrations + storage buckets

## 9) Next Milestones (48–72h hackathon cadence)
M1: Backend boots + Supabase schema migrated + healthcheck
M2: Mobile boots + chat-first UI + mock responses wired
M3: Doc upload + analyze → summary shown in app
M4: Policy ingest → embeddings → RAG answer with citations
M5: Map search → in-network shell + provider list rendering
