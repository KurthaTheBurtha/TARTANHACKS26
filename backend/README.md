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
