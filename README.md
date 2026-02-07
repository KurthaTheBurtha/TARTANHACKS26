# CareMap — TARTANHACKS26

Unified flow: medical bill breakdown + insurance-aware guidance + in-network navigation.

---

## Prerequisites

- **Python 3.11+** and **pip**
- **Node 18+** and **npm**
- (Optional) **Expo CLI** or **npx** for mobile: `integrations-abhay/mobile`

---

## Run locally (minimal friction)

### 1. Environment (optional for first run)

You can start without any keys; the backend and CareMap page use **mock data** when APIs are unset.

To use live services, use the **single .env at repo root** (all apps read from it):

  ```bash
  cp .env.example .env
  ```
  Edit `.env`. Important (see `docs/ENV_CONTRACT.md` for full list):
  - `SUPABASE_URL`, `SUPABASE_ANON_KEY` (and optionally `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`, `DATABASE_URL`) for real DB/auth
  - `OPENAI_API_KEY` or `GEMINI_API_KEY` + `LLM_PROVIDER=openai|gemini` for live guidance
  - `BILL_PARSER_URL=http://localhost:3000` so CareMap ingest can call the bill-parser app
  - `NEXT_PUBLIC_BACKEND_URL` or `NEXT_PUBLIC_CAREMAP_BACKEND_URL=http://localhost:8000` for the web app
  - `DEMO_MODE=true` for deterministic demo responses (no external calls)

- **Where to get keys**
  - Supabase: [supabase.com](https://supabase.com) → project → Settings → API
  - OpenAI: [platform.openai.com](https://platform.openai.com/api-keys)
  - Gemini: [aistudio.google.com](https://aistudio.google.com/app/apikey)

### 2. Start commands (root Makefile)

From the **repo root**:

| Command | What it does |
|--------|----------------|
| `make dev-backend` | Start FastAPI at **http://0.0.0.0:8000** (reload, port from `BACKEND_PORT` if set) |
| `make dev-frontend` | Start Next.js (bill-parser) at **http://localhost:3000** — CareMap page: `/caremap` |
| `make dev-all` | Start backend + frontend together (backend in background) |
| `make dev-mobile` | Start Expo app in `integrations-abhay/mobile` (optional) |
| `make install` | Install backend + frontend deps only |

**Quick demo (one terminal):**
```bash
make dev-all
```
Then open **http://localhost:3000/caremap** and upload a bill PDF.

**Separate terminals (recommended for development):**
```bash
# Terminal 1
make dev-backend

# Terminal 2
make dev-frontend
```

- **Backend health:** `curl http://localhost:8000/health`
- **CareMap health (component status):** `curl http://localhost:8000/v1/caremap/health`
- **CareMap ingest:** see `backend/README.md` for curl examples.

### 3. CORS and ports

- Backend binds to **0.0.0.0** and port **8000** (or `BACKEND_PORT`). Allowed CORS origins include `localhost:3000`, `localhost:8081`, and `127.0.0.1` variants so the Next.js app and Expo dev server can call the API.
- To add more origins, set `ALLOWED_ORIGINS` in root `.env` (comma-separated).

### 4. Launch the UI and run the demo

1. **Start backend and frontend** (from repo root):
   ```bash
   make dev-all
   ```
   Or in two terminals: `make dev-backend` then `make dev-frontend`.

2. **Open the app:** [http://localhost:3000](http://localhost:3000)

3. **Go to the demo:** Click **“Try full demo (CareMap)”** on the home page, or open [http://localhost:3000/caremap](http://localhost:3000/caremap).

4. **Test the flow:**
   - **Bill PDF (required):** Click “Bill or EOB PDF” and choose a PDF (e.g. `billing_statement.pdf` in the repo).
   - **SOB PDF (optional):** Add a summary-of-benefits PDF if you have one.
   - **Optional:** Enter ZIP (e.g. `15213`), specialty (e.g. `primary care`), or insurance carrier (e.g. `upmc`).
   - Click **“Get breakdown + navigation”**.
   - You should see: **Bill breakdown** (line items), **Plain-English summary** (guidance), **Nearby in-network options** (list + “Open in Maps” links). Partial errors (if any) appear at the bottom.

5. **Demo mode (no keys):** With `DEMO_MODE=true` in root `.env`, the backend returns a fixed fixture; the same UI works without any API keys. Restart the backend after changing `.env`.

**Web app backend URL:** Set `NEXT_PUBLIC_BACKEND_URL` or `NEXT_PUBLIC_CAREMAP_BACKEND_URL` in root `.env` if the backend is not at `http://localhost:8000`.

---

## Repo layout

- **backend/** — FastAPI + AI/RAG. Key endpoint: `POST /v1/caremap/ingest`, `GET /v1/caremap/health`. Uses `backend/Makefile` for tests/lint.
- **bill-parser/** — Next.js: bill upload + CareMap full-flow page at `/caremap`.
- **integrations-abhay/** — Supabase Edge Functions + Expo mobile demo (optional); backend works with mocks if not configured.

---

## End-to-end flow

1. User uploads medical bill/EOB PDF (+ optional summary of benefits PDF) on the CareMap page.
2. Backend returns: (1) plain-English bill breakdown, (2) insurance-aware guidance, (3) in-network navigation (top nearby facilities with map-ready coords).
3. Works when some modules are missing (mock fallbacks); no sensitive logging; stable Pydantic contracts.

See **`STATE.md`** for current project state, mocked vs live, and demo script. See `docs/ENV_CONTRACT.md` for env vars and `backend/state.md` for API history.

---

## Local hosting

Local setup is validated for demo: run `make dev-all`, open http://localhost:3000/caremap, upload a bill PDF. Backend responds at http://localhost:8000; use `curl http://localhost:8000/health` and `curl http://localhost:8000/v1/caremap/health` to confirm. **Focus remains on local demo;** deployment is optional.

---

## Deployment checklist (optional)

If you deploy later, use this as a reference. **No deployment is performed from this repo.**

### Backend (e.g. Render)

- **Build:** `pip install -r requirements.txt` (or leave empty if Render detects `requirements.txt`).
- **Start:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT` (Render sets `PORT`).
- **Required env (minimal for demo):** `DEMO_MODE=true` (or set Supabase/OpenAI/Gemini keys for live). See root `.env.example` and `docs/ENV_CONTRACT.md`.
- **Verify:** `GET /health` → `{"ok": true}`; `GET /v1/caremap/health` → component status.

### Frontend — Web (e.g. Vercel)

- **Build:** `npm install && npm run build` (in `bill-parser/`).
- **Start:** `npm start` (or Vercel runs this automatically).
- **Required env:** In root `.env`, set `NEXT_PUBLIC_BACKEND_URL` or `NEXT_PUBLIC_CAREMAP_BACKEND_URL` = your backend URL. Optional: `GEMINI_API_KEY` for bill parsing.
- **Verify:** Open the deployed URL and hit `/caremap`; health is implied if the CareMap ingest request succeeds.

### Frontend — Mobile (Expo)

- **Build:** In `integrations-abhay/mobile/`, use EAS Build or `expo build`; point `EXPO_PUBLIC_SUPABASE_URL` (and optional Edge Functions URL) at your deployed services.
- **Verify:** Run the built app and use the provider search demo screen.

### Checklist summary

| Item | Backend | Frontend (web) |
|------|--------|-----------------|
| **Required env** | `PORT` (set by host); for demo only: `DEMO_MODE=true` | `NEXT_PUBLIC_BACKEND_URL` or `NEXT_PUBLIC_CAREMAP_BACKEND_URL` |
| **Build** | `pip install -r requirements.txt` | `npm run build` in `bill-parser/` |
| **Start** | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` | `npm start` (Next.js) |
| **Health** | `GET /health`, `GET /v1/caremap/health` | App loads and `/caremap` calls backend |
