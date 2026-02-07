# CareMap — Project state (canonical)

Last updated: 2026-02-07  
Owners: **Abdoul** (Backend/AI), **Abhay** (Integrations), **Kurt** (Frontend)

---

## Local demo (after Step 1: .env + API keys)

- **Env:** A **single `.env` at repo root** is used by backend, bill-parser, and mobile. Copy `.env.example` to `.env` and fill in values. Use `OPENAI_API_KEY` and/or `GEMINI_API_KEY`; set `LLM_PROVIDER=openai` or `LLM_PROVIDER=gemini`. `DEMO_MODE=true` forces deterministic fixture (no external calls).
- **Active provider:** Whichever key is set and matches `LLM_PROVIDER`; `/v1/llm/health` reports `openai_configured` / `gemini_configured`.
- **UI backend URL:** `NEXT_PUBLIC_BACKEND_URL` or `NEXT_PUBLIC_CAREMAP_BACKEND_URL` (default `http://localhost:8000`). CareMap page shows a small **Connection** indicator (live/mock/unreachable) from `GET /v1/caremap/health`.
- **Ingest auth:** Ingest endpoint does not enforce auth currently. When `CAREMAP_INGEST_REQUIRE_AUTH` is implemented, set it to `false` in dev for local demo or wire JWT from the UI.

---

## What works end-to-end today

### Commands (from repo root)

| Command | What runs |
|--------|------------|
| `make dev-all` | Backend (FastAPI) + frontend (Next.js) in one terminal |
| `make dev-backend` | Backend only → http://0.0.0.0:8000 |
| `make dev-frontend` | Next.js (bill-parser) only → http://localhost:3000 |
| `make dev-mobile` | Expo app in `integrations-abhay/mobile` |

### Endpoints that work

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `GET /health` | GET | Backend liveness → `{"ok": true}` |
| `GET /v1/caremap/health` | GET | Component status (bill_parser, integrations, rag, guidance_llm, demo_mode) |
| `POST /v1/caremap/ingest` | POST | **Main demo:** multipart bill_pdf (+ optional sob_pdf, user_context, network_context) → bill breakdown + guidance + navigation |
| `GET /v1/llm/health` | GET | LLM provider and key status |
| `POST /v1/llm/smoke` | POST | LLM client smoke test |
| `GET /v1/providers/search` | GET | Provider search (backend cache or mock) |
| `POST /v1/chat/sessions` | POST | Create chat session (requires auth or test bypass) |
| `POST /v1/chat/sessions/{id}/messages` | POST | Chat message (RAG or stub) |

**Demo UI:** `bill-parser` at http://localhost:3000. CareMap flow: **Try full demo (CareMap)** or `/caremap` → upload bill PDF → **only** `POST /v1/caremap/ingest` (canonical backend) → show bill, guidance, navigation (+ “Open in Maps” links). Connection status (live/mock) shown from `/v1/caremap/health`.

---

## Mocked vs live

| Component | Mocked when | Live when |
|-----------|-------------|-----------|
| **CareMap ingest** | `DEMO_MODE=true` or any dependency missing | All deps set; `DEMO_MODE` false |
| **Bill breakdown** | `BILL_PARSER_URL` unset | `BILL_PARSER_URL` points to running bill-parser (e.g. http://localhost:3000) |
| **Guidance (plain-English)** | No `OPENAI_API_KEY` / `GEMINI_API_KEY` | Either key set + `LLM_PROVIDER=openai|gemini` |
| **Navigation** | `FUNCTIONS_BASE_URL` unset (or Edge Functions down) | `FUNCTIONS_BASE_URL` set and Supabase Edge Functions reachable |
| **RAG / chat** | No OpenAI key or no policy chunks | OpenAI (or Gemini) key + ingested policy docs |
| **Integrations-abhay Edge** | `MOCK_MODE=true` or no Google key | `MOCK_MODE=false` + `GOOGLE_MAPS_API_KEY` + Supabase |

`GET /v1/caremap/health` reports per-component `"live"` or `"mock"`.

---

## Known gaps / bugs

- **CareMap ingest:** No auth required by default (config: `CAREMAP_INGEST_REQUIRE_AUTH`); if enabled, frontend must send JWT (not wired in bill-parser CareMap page).
- **Docs analyzer:** Uses LLM summarization when key present; structured extraction (line items from PDF) is still mock/template. No OCR/Vision for scanned bills.
- **Two Supabase contexts:** Backend has `backend/supabase/migrations/`; integrations-abhay has `integrations-abhay/supabase/sql/` + Edge Functions. No single “one DB” story; backend and Edge can point at same or different projects.
- **Expo mobile:** Separate app in `integrations-abhay/mobile`; calls Edge Functions (or mock). Not the same as the web CareMap flow (bill-parser).
- **Bill-parser /upload:** Uses Gemini for parse; separate from backend CareMap ingest (which can call bill-parser HTTP or use mock).

---

## Why did my bill fail to parse?

When you upload a PDF (e.g. `medical_bill.pdf`) on the CareMap page, the backend either uses **live** parsing (if `BILL_PARSER_URL` is set) or **mock** data. If you see mock bill data and an amber **“Partial results”** box with a bill_parser message, or a red error, common causes are:

| Cause | What you see | What to do |
|-------|----------------|------------|
| **Scanned/image PDF** | “No text could be extracted…” or “Unable to read this document… It may be a scanned image…” | The parser uses text extraction (no OCR). Use a **text-based PDF** (e.g. downloaded from a portal) or run the PDF through an OCR tool first, then upload the result. |
| **File too large** | “File too large. Maximum size is 10MB.” | Use a PDF under 10MB, or increase `MAX_FILE_SIZE_BYTES` in `bill-parser/app/api/parse-bill/route.ts`. |
| **Bill parser not configured** | “Bill parser not configured; using mock data.” | Set `BILL_PARSER_URL` in root `.env` (e.g. `http://localhost:3000`) and run the Next.js app so the backend can call `POST /api/parse-bill`. |
| **Bill parser unreachable** | “Bill parser unavailable; using mock data.” | Ensure the app at `BILL_PARSER_URL` is running; check URL (no trailing slash), port, and firewall. |
| **Gemini key missing (bill-parser)** | Bill parser returns 500; backend shows “API key not configured…” (or 500) in the amber box. | Add `GEMINI_API_KEY` to `bill-parser/.env.local` and restart the Next.js dev server. The **backend** uses its own keys for guidance; the **bill-parser** app needs Gemini for PDF → structured JSON. |
| **Unusual layout / format** | “Unable to extract structured data from the bill…” | The AI could not return valid JSON. Try a clearer bill or a different file. |
| **Timeout** | “Request timed out…” (or bill parser 504) | Use a shorter/simpler PDF or increase `REQUEST_TIMEOUT_MS` in the parse-bill route. |

The backend now forwards the **bill-parser’s error message** into the CareMap response, so the amber “Partial results” box should show the exact reason (e.g. “No text could be extracted…”) instead of only “Bill parser returned 422.”

---

## Manual testing: knowing the backend is running well

Use these to confirm the backend is up and healthy during manual testing:

1. **Health endpoints (curl or browser)**  
   - `GET http://localhost:8000/health` → `{"ok": true}`  
   - `GET http://localhost:8000/v1/llm/health` → see `openai_configured` / `gemini_configured` and `provider`  
   - `POST http://localhost:8000/v1/llm/smoke` → `mock_used: false` when a key is set  
   - `GET http://localhost:8000/v1/caremap/health` → see `bill_parser`, `guidance_llm`, etc. as `"live"` or `"mock"`

2. **Connection indicator on /caremap**  
   The CareMap page fetches `GET /v1/caremap/health` on load. You should see **“Connection: Backend live”** (or “mock” / “demo fixture”) when the backend is reachable, or **“Backend unreachable”** when it’s down or the URL is wrong.

3. **Backend terminal logs**  
   With `make dev-backend`, watch for startup lines (“Application startup complete”) and any request logs. Bill parser failures log “Bill parser non-200” or “Bill parser request failed” without printing secrets.

4. **Smoke ingest script**  
   From repo root:  
   `./scripts/smoke_ingest.sh billing_statement.pdf`  
   This calls health then `POST /v1/caremap/ingest`. A 200 response and JSON with `bill.line_items`, `guidance.summary_plain_english`, and `navigation.results` indicate the ingest pipeline is working (some components may still be mock).

5. **Quick checklist**  
   - Backend: `make dev-backend` → no traceback on startup.  
   - Health: all four calls above return 200 and expected JSON.  
   - UI: open http://localhost:3000/caremap → Connection shows “live” or “mock”, not “unreachable”.  
   - Upload: after uploading a PDF, you get either a full result (with possible amber partial errors) or a clear red error; no silent failure.

---

## Next 3 highest-leverage tasks (MVP demo polish)

1. **Wire auth for CareMap ingest (optional but production-relevant)** — If `CAREMAP_INGEST_REQUIRE_AUTH=true`, bill-parser CareMap page should send Supabase JWT (or document “demo only, auth off”). Owner: Kurt + Abdoul.
2. **Single E2E test for CareMap flow** — Script or pytest that: start backend (DEMO_MODE or mock), POST to `/v1/caremap/ingest` with a fixture PDF, assert response shape and no 5xx. Owner: Abdoul.
3. **Doc extraction beyond mock** — Replace or augment template line items in doc analyzer with real extraction (e.g. from bill-parser HTTP or backend PDF text + LLM). Owner: Abdoul.

---

## Demo script

### 1. Run locally

```bash
# From repo root
make dev-all
```

Or two terminals:

```bash
# Terminal 1
make dev-backend

# Terminal 2
make dev-frontend
```

Optional: set `DEMO_MODE=true` in root `.env` for deterministic responses (no external keys needed).

Verify backend:

```bash
curl -s http://localhost:8000/health
# {"ok":true}

curl -s http://localhost:8000/v1/llm/health
# {"provider":"openai","openai_configured":true,"gemini_configured":false,"message":"..."}

curl -s -X POST http://localhost:8000/v1/llm/smoke
# {"ok":true,"provider":"openai","response_preview":"OK","mock_used":false}

curl -s http://localhost:8000/v1/caremap/health
# {"bill_parser":"live"|"mock","integrations":"live"|"mock","rag":"live"|"mock","guidance_llm":"live"|"mock","demo_mode":true|false}
```

Smoke ingest (from repo root, sample PDFs at root):

```bash
./scripts/smoke_ingest.sh billing_statement.pdf
# With optional SOB and base URL:
./scripts/smoke_ingest.sh billing_statement.pdf summary-of-benefits.pdf http://localhost:8000
```

### 2. Steps in the UI

1. Open **http://localhost:3000**
2. Click **“Try full demo (CareMap)”** (or go to http://localhost:3000/caremap)
3. Under **Bill or EOB PDF (required)** choose a PDF (e.g. repo root `billing_statement.pdf`)
4. Optionally add **Summary of benefits PDF**, **ZIP** (e.g. `15213`), **Specialty** (e.g. `primary care`), **Insurance carrier** (e.g. `upmc`)
5. Click **“Get breakdown + navigation”**

### 3. Expected outputs

- **Loading:** Button shows spinner and “Processing…”; inline message: “Calling backend…”
- **Success:** Page shows:
  - **Bill breakdown** — provider, dates, line items (description, CPT, amount), patient responsibility
  - **Insurance summary** — deductibles/OOP if present, disclaimers
  - **Plain-English summary** — guidance text + next steps
  - **Nearby in-network options** — list of places with distance, network badge, **“Open in Maps”** link each
- **Partial errors:** If any component used mock (e.g. bill parser not configured), an amber box at bottom lists component + message; response still includes bill/guidance/navigation (mock where needed).
- **Hard error:** Red box with message (e.g. backend unreachable, 4xx/5xx body if returned). UI never crashes on missing optional response fields (defensive rendering).

With `DEMO_MODE=true`, the same steps always return the same fixture (Demo Medical Group, $180 responsibility, two Pittsburgh navigation results, no external calls).

---

## Remaining TODOs (max 5)

1. **Ingest auth** — When backend enforces `CAREMAP_INGEST_REQUIRE_AUTH`, wire JWT from bill-parser CareMap page or keep `false` for local demo.
2. **Bill parser HTTP** — Set `BILL_PARSER_URL` to a running bill-parser instance for live bill breakdown; otherwise mock/template is used.
3. **Navigation live** — Set `FUNCTIONS_BASE_URL` (and Supabase/Edge) for live provider search; otherwise mock results.
4. **E2E test** — Pytest or script: POST to `/v1/caremap/ingest` with fixture PDF, assert response shape and no 5xx.
5. **Doc extraction** — Real line-item extraction (e.g. bill-parser HTTP or PDF + LLM) instead of template/mock.
