# Integrations — Abhay's Workspace

## Owner
**Abhay** — Integrations lead for CareMap

## What This Folder Contains
This is a self-contained subproject for all integration work:
- **Supabase Edge Functions** for provider/plan search
- **Mobile integration code** (Expo/React Native components)
- **Shared utilities** for API clients, types, and mocks
- **Scripts** for local development and testing
- **Documentation** specific to integrations

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Mobile Client                            │
│                   (Expo / React Native)                         │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Supabase Edge Functions                       │
│         /providers-search     /plans-search                     │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Provider Cache Layer                         │
│              (Supabase Postgres + PostGIS)                      │
│   - Cached provider records from Google Places                  │
│   - In-network overlay rules                                    │
│   - TTL-based cache invalidation                                │
└─────────────────────────┬───────────────────────────────────────┘
                          │ (cache miss)
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Google Places API (New)                       │
│           https://places.googleapis.com/v1/places               │
│   - Nearby Search for healthcare providers                      │
│   - Place Details for contact info, hours, etc.                 │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow
1. **Mobile** requests providers via Edge Function
2. **Edge Function** checks Supabase cache first
3. **Cache hit** → return cached providers with in-network overlay
4. **Cache miss** → fetch from Google Places API → cache → return
5. **In-network overlay** adds confidence scores based on network rules

## Running Modes

### Mock Mode (Default for Development)
Mock mode returns static test data without hitting Google Places API.

```bash
# In your .env
MOCK_MODE=true

# Run Edge Functions locally
supabase functions serve
```

Use mock mode when:
- No Google Maps API key available
- Testing UI/UX without API costs
- Running CI/CD pipelines
- Offline development

### Places Mode (Live Google Places API)
Places mode makes real requests to Google Places API.

```bash
# In your .env
MOCK_MODE=false
GOOGLE_MAPS_API_KEY=your_actual_key

# Run Edge Functions locally
supabase functions serve
```

Use places mode when:
- Testing real provider data
- Validating search radius/ranking logic
- Pre-production verification

## Folder Structure

```
integrations-abhay/
├── README.md              # This file
├── .env.example           # Environment template
├── shared/                # Shared types, utils, API clients
├── supabase/
│   ├── functions/
│   │   ├── _shared/       # Shared Edge Function utilities
│   │   ├── providers-search/   # Provider search endpoint
│   │   └── plans-search/       # Plan/network search endpoint
│   └── sql/               # Database migrations & seeds
├── mobile/                # React Native components for maps/providers
├── docs/
│   └── integrations/      # Integration-specific documentation
└── scripts/               # Dev scripts, test runners, etc.
```

## Quick Start

```bash
cd integrations-abhay

# Copy environment template
cp .env.example .env

# Edit .env with your keys (or keep MOCK_MODE=true)

# Start Supabase locally (if not already running)
supabase start

# Serve Edge Functions
supabase functions serve --env-file .env
```

## API Endpoints (Planned)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/providers-search` | GET | Search providers by location, specialty, radius |
| `/plans-search` | GET | Search insurance plans/networks |

See `docs/integrations/` for detailed API specs.
