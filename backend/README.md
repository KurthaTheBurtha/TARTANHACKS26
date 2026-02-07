# Backend API

FastAPI backend for healthcare document analysis with Supabase integration.

## Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Create a `.env` file in the `backend/` directory with the following variables:
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_JWT_SECRET=your-jwt-secret
DATABASE_URL=postgresql://postgres:password@localhost:5432/postgres
ENVIRONMENT=development
LOG_LEVEL=INFO
API_V1_PREFIX=/v1
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8080
```

3. Run database migrations:
```bash
# Apply migrations to your Supabase project
# Use Supabase CLI or apply via Supabase dashboard
```

4. Start the server:
```bash
uvicorn app.main:app --reload --port 8000
```

## API Endpoints

### Health Check
- `GET /health` - Returns `{ "ok": true }`

### Documents
- `POST /v1/docs/upload` - Upload a document (returns doc_id)
- `POST /v1/docs/{doc_id}/analyze` - Analyze a document (returns extraction)

### Chat
- `POST /v1/chat/sessions` - Create a new chat session
- `POST /v1/chat/sessions/{session_id}/messages` - Send a message and get assistant response

### Providers
- `GET /v1/providers/search?query=...` - Search for healthcare providers

### CareMap orchestrator (unified bill + benefits + navigation)
- `POST /v1/caremap/ingest` - Upload bill PDF (+ optional SOB PDF); returns bill breakdown, insurance guidance, and in-network navigation in one response. Works with mock fallbacks when external services are unavailable.
- `GET /v1/caremap/health` - Returns which components are live vs mock: `bill_parser`, `integrations`, `rag`, `guidance_llm`; and `demo_mode` (if true, ingest returns a deterministic fixture).

**Optional env vars for CareMap:**
- `BILL_PARSER_URL` - Base URL of Kurt's bill-parser app (e.g. `http://localhost:3000`). If unset, bill breakdown uses mock data.
- `FUNCTIONS_BASE_URL` - Supabase Edge Functions base (e.g. `http://localhost:54321/functions/v1`) for provider search. If unset, navigation uses mock results.
- `CAREMAP_TEMP_DIR` - Directory for temporary uploads (default: system temp).
- `CAREMAP_INGEST_REQUIRE_AUTH` - Set to `false` to allow unauthenticated ingest for demos (default: true).
- `DEMO_MODE` - Set to `true` to make ingest return a deterministic fixture (stable for demos; no external calls).

**Example request (curl):**
```bash
curl -X POST http://localhost:8000/v1/caremap/ingest \
  -F "bill_pdf=@/path/to/billing_statement.pdf" \
  -F "sob_pdf=@/path/to/summary-of-benefits.pdf" \
  -F 'user_context={"zip_code":"15213","radius_miles":10,"specialty_keywords":["primary care"]}' \
  -F 'network_context={"insurance_carrier":"upmc"}'
```

**Example response snippet:**
```json
{
  "bill": {
    "provider_name": "Example Medical Group",
    "line_items": [{"description": "Office visit", "cpt_hcpcs": "99213", "amount_billed": 310.0}],
    "total_billed": 310.0,
    "patient_responsibility": 180.0
  },
  "insurance": { "disclaimers": ["..."] },
  "guidance": {
    "summary_plain_english": "Your estimated patient responsibility is $180.00...",
    "next_steps": ["Confirm the provider was in-network..."]
  },
  "navigation": {
    "query_used": "primary care",
    "results": [{ "name": "UPMC Presbyterian", "lat": 40.44, "lng": -79.96, "network_status": "in_network" }]
  },
  "errors": []
}
```

**Component health:**
```bash
curl -s http://localhost:8000/v1/caremap/health
# {"bill_parser":"mock","integrations":"mock","rag":"live"}
```

## Authentication

All endpoints (except `/health`) require a Bearer token in the Authorization header:
```
Authorization: Bearer <supabase-jwt-token>
```

The JWT token is verified against Supabase's JWT secret.

## Database Schema

See `supabase/migrations/0001_init.sql` for the complete schema including:
- `documents` - Document metadata
- `doc_extractions` - Extracted data from documents
- `line_items` - Individual line items from bills/EOBs
- `policy_chunks` - Policy document chunks for vector search
- `chat_sessions` - Chat session metadata
- `chat_messages` - Chat messages
- `providers_cache` - Cached provider information
- `network_rules` - Provider network status rules

## Development

The API currently returns mock data for all endpoints. This allows mobile to integrate immediately while the AI/ML components are being developed.

## Dev Commands

Quick reference for common development tasks:

```bash
# Start development server
make dev

# Run all tests (verbose)
make test

# Run tests quickly (quiet, mock mode)
make test-quick

# Run strict pre-push checks (format + lint + syntax + tests)
make check

# Run smoke tests (seed demo + hit key endpoints)
make smoke

# Full demo setup (bootstrap + seed + start server)
make demo

# Format code
make format

# Lint code (best-effort)
make lint

# Clean Python cache files
make clean
```

### Pre-Push Checklist

Before pushing code, run:
```bash
make check
```

This ensures:
- Code is properly formatted
- No linting errors
- Python syntax is valid
- All tests pass

### Smoke Testing

To verify the backend is working:
```bash
# Start server in one terminal
make dev

# In another terminal, run smoke tests
make smoke
```

The smoke script tests:
- `/health` endpoint
- `/v1/me` endpoint (non-fatal if auth required)
- `/v1/providers/search` endpoint
