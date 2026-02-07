# How to Run CareMap

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  FRONTEND (port 3000)                                            │
│  - Next.js app                                                   │
│  - Bill-parser: POST /api/parse-bill (Gemini PDF → structured    │
│    JSON)                                                         │
│  - CareMap page, Documents, etc.                                 │
└──────────────────────────┬──────────────────────────────────────┘
                           │ calls
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  BACKEND (port 8000)                                             │
│  - FastAPI                                                       │
│  - CareMap ingest, documents, chat, providers                    │
│  - Calls frontend's /api/parse-bill when BILL_PARSER_URL is set  │
└─────────────────────────────────────────────────────────────────┘
```

- **Frontend** uses its own bill-parser (`/api/parse-bill`) for document parsing.
- **Backend** handles CareMap orchestration, storage, chat, providers. When processing a bill, it calls the frontend's parse-bill API.

---

## Quick Start

### 1. Environment

```bash
cp .env.example .env
```

Edit `.env` and set at minimum:

- `BILL_PARSER_URL=http://localhost:3000` — backend → frontend parse-bill
- `NEXT_PUBLIC_BACKEND_URL=http://localhost:8000` — frontend → backend
- `GEMINI_API_KEY=...` — for bill parsing (or use mock mode)

### 2. Install dependencies

```bash
make install
```

### 3. Run both services

**Option A — Single terminal**

```bash
make dev-all
```

**Option B — Two terminals (recommended for development)**

```bash
# Terminal 1: Backend
make dev-backend

# Terminal 2: Frontend (includes bill-parser)
make dev-frontend
```

### 4. Open the app

- **App:** http://localhost:3000
- **CareMap:** http://localhost:3000/caremap
- **Documents:** http://localhost:3000/documents

---

## Verify

```bash
# Backend health
curl http://localhost:8000/health

# CareMap component status (bill_parser, llm, etc.)
curl http://localhost:8000/v1/caremap/health

# Bill-parser (via frontend)
curl -X POST http://localhost:3000/api/parse-bill -F "file=@your-bill.pdf"
```

---

## Flow Summary

| Action | Path |
|--------|------|
| User uploads bill on CareMap | Frontend → Backend `/v1/caremap/ingest` |
| Backend parses bill | Backend → Frontend `/api/parse-bill` |
| User uploads on Documents | Frontend → Backend (or fallback to `/api/parse-bill`) |
