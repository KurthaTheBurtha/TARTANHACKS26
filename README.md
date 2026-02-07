# CareMap — TARTANHACKS26

Unified flow: medical bill breakdown + insurance-aware guidance + in-network navigation.

## Repo layout

- **backend/** — FastAPI + AI/RAG (Abdoul). Single orchestrator: `POST /v1/caremap/ingest`, `GET /v1/caremap/health`.
- **bill-parser/** — Next.js app: bill upload + CareMap full-flow page (Kurt).
- **integrations-abhay/** — Maps/network/provider utils + Supabase Edge (Abhay). Optional; backend uses mock when not configured.

## Quick start

### Backend

```bash
cd backend
pip install -r requirements.txt
# Optional: .env with SUPABASE_*, BILL_PARSER_URL, FUNCTIONS_BASE_URL
uvicorn app.main:app --reload --port 8000
```

- **Health:** `curl http://localhost:8000/health`
- **CareMap health (component status):** `curl http://localhost:8000/v1/caremap/health`
- **CareMap ingest (curl):** see `backend/README.md` for full example.

### Bill-parser (frontend)

```bash
cd bill-parser
npm install
npm run dev
```

- **CareMap full flow:** open http://localhost:3000/caremap — upload bill (+ optional SOB), enter ZIP/specialty, get breakdown + insurance chips + nearby providers (mock or live).

### Env (optional)

- **Backend:** `SUPABASE_URL`, `SUPABASE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`, `DATABASE_URL`. For CareMap: `BILL_PARSER_URL`, `FUNCTIONS_BASE_URL`. See `backend/README.md`.
- **Bill-parser:** `NEXT_PUBLIC_CAREMAP_BACKEND_URL` (default `http://localhost:8000`) for the CareMap ingest request.

## End-to-end flow

1. User uploads medical bill/EOB PDF (+ optional summary of benefits PDF).
2. Backend returns: (1) plain-English bill breakdown, (2) insurance-aware guidance, (3) in-network navigation (top nearby facilities/providers with map-ready coords).
3. Works when some modules are missing (mock fallbacks); no sensitive logging; stable Pydantic contracts.

See `state.md` and `backend/state.md` (if present) for module ownership and API contracts.
