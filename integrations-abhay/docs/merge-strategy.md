# CareMap — Integration Merge Strategy

## STATE.md Summary

From the root `STATE.md`, the integration expectations are:

### Pillar C — In-Network Navigation (Abhay's Focus)
- **Input:** User location + specialty/need + insurance network hints
- **Output:** Map + list of providers/facilities, ranked; "in-network confidence" score

### Target Repo Structure
```
/
├── backend/           # FastAPI + Supabase + AI services (Abdoul)
│   └── supabase/
│       ├── migrations/
│       └── seed/
├── mobile/            # Expo + React Native (Kurt)
│   ├── screens/
│   ├── services/      # API clients
│   └── components/
├── docs/
└── STATE.md
```

### API Contracts (v0)
```
GET /v1/providers/search?query=&lat=&lng=&radius_miles=
GET /v1/providers/{provider_id}
```

### Dependency Map
- **Kurt depends on:** API contracts + mock endpoints OR local mocks
- **Abhay depends on:** Google Maps key + provider search abstraction
- **Abdoul depends on:** Supabase project + migrations + storage buckets

### Milestone M5
> Map search → in-network shell + provider list rendering

---

## What `integrations-abhay/` Provides

| Component | Location | Description |
|-----------|----------|-------------|
| **Shared Contracts** | `shared/contracts.ts` | TypeScript types for Provider, Plan, requests/responses |
| **Python Contracts** | `shared/contracts.py` | Pydantic models (same shapes as TS) |
| **Provider Search** | `supabase/functions/providers-search/` | Edge Function with mock/cache/places modes |
| **Plans Search** | `supabase/functions/plans-search/` | Edge Function for insurance plans |
| **Database Schema** | `supabase/sql/schema.sql` | Tables: providers, insurance_plans, provider_networks |
| **Seed Data** | `supabase/sql/seed.sql` | ~30 Pittsburgh providers, 3 plans, network mappings |
| **Mobile Demo** | `mobile/` | Expo app with ProviderDemoScreen |
| **API Docs** | `docs/integrations/` | Full endpoint documentation |

---

## Approach A: Vendor Mode (Recommended for Hackathon)

**Keep `integrations-abhay/` as a self-contained subproject.**

This is the fastest path to integration with minimal risk of merge conflicts.

### How It Works

1. **Edge Functions stay in `integrations-abhay/supabase/functions/`**
   - Deploy to same Supabase project
   - Accessible at `/functions/v1/providers-search` and `/functions/v1/plans-search`

2. **Kurt imports types from integrations-abhay**
   - Copy `shared/contracts.ts` into his mobile app
   - Or reference: `../../integrations-abhay/shared/contracts.ts`

3. **Abdoul uses Python contracts for backend**
   - Copy `shared/contracts.py` into `backend/app/models/`
   - Or import from integrations-abhay if path works

4. **Database schema merged manually**
   - Abdoul reviews `supabase/sql/schema.sql`
   - Adds tables to his migrations (avoiding conflicts with existing tables)

### File Paths for Kurt

```
# Option 1: Copy types
cp integrations-abhay/shared/contracts.ts mobile/src/types/provider-contracts.ts

# Option 2: Copy full API client
cp integrations-abhay/mobile/src/api/providers.ts mobile/src/services/providers.ts
cp integrations-abhay/mobile/src/api/plans.ts mobile/src/services/plans.ts
cp integrations-abhay/mobile/src/types/contracts.ts mobile/src/types/contracts.ts
```

### File Paths for Abdoul

```
# Copy Python contracts
cp integrations-abhay/shared/contracts.py backend/app/models/provider_contracts.py

# Review SQL for integration
cat integrations-abhay/supabase/sql/schema.sql
# → Add providers, insurance_plans, provider_networks to your migrations
```

### API Endpoint Mapping

| STATE.md Contract | integrations-abhay Implementation |
|-------------------|-----------------------------------|
| `GET /v1/providers/search` | `POST /functions/v1/providers-search` |
| `GET /v1/providers/{id}` | Not implemented (can add to cache query) |

> **Note:** We use POST for search because request bodies are complex (filters, geo, plan_id). Kurt can wrap this in a service function that matches the GET signature if needed.

### Deployment Checklist — Vendor Mode

#### For Abhay
- [ ] Ensure `.env` has all variables (SUPABASE_URL, keys, GOOGLE_MAPS_API_KEY)
- [ ] Deploy Edge Functions: `supabase functions deploy providers-search`
- [ ] Deploy Edge Functions: `supabase functions deploy plans-search`
- [ ] Verify with curl scripts

#### For Kurt
- [ ] Copy `integrations-abhay/shared/contracts.ts` → `mobile/src/types/`
- [ ] Copy API clients or write own using contracts
- [ ] Set `EXPO_PUBLIC_SUPABASE_FUNCTIONS_BASE_URL` (or use default)
- [ ] Call `/functions/v1/providers-search` with POST + Bearer token
- [ ] Wire up map view with provider results

#### For Abdoul
- [ ] Review `integrations-abhay/supabase/sql/schema.sql`
- [ ] Add `providers`, `insurance_plans`, `provider_networks` tables to migrations
- [ ] Run `integrations-abhay/supabase/sql/seed.sql` for demo data
- [ ] Copy `shared/contracts.py` if needed for backend validation

---

## Approach B: Promote Mode (Optional)

**Merge integrations-abhay code into the main repo structure.**

Use this if the team wants a unified codebase and is comfortable resolving conflicts.

### Promotion Script

Create and run this script to copy files (review before executing):

```bash
#!/usr/bin/env bash
# integrations-abhay/scripts/promote_to_main.sh
# Run from repo root: ./integrations-abhay/scripts/promote_to_main.sh

set -e

echo "=== CareMap: Promote integrations-abhay to main repo ==="
echo "This script copies files. Review changes before committing."
echo ""

# -----------------------------------------------------------------------------
# 1. Edge Functions → supabase/functions/
# -----------------------------------------------------------------------------
echo "[1/4] Copying Edge Functions..."

mkdir -p supabase/functions/_shared
mkdir -p supabase/functions/providers-search
mkdir -p supabase/functions/plans-search

# Shared helpers
cp -n integrations-abhay/supabase/functions/_shared/geo.ts supabase/functions/_shared/ 2>/dev/null || echo "  - geo.ts exists, skipping"
cp -n integrations-abhay/supabase/functions/_shared/places.ts supabase/functions/_shared/ 2>/dev/null || echo "  - places.ts exists, skipping"
cp -n integrations-abhay/supabase/functions/_shared/normalize.ts supabase/functions/_shared/ 2>/dev/null || echo "  - normalize.ts exists, skipping"

# Provider search
cp -n integrations-abhay/supabase/functions/providers-search/index.ts supabase/functions/providers-search/ 2>/dev/null || echo "  - providers-search/index.ts exists, skipping"
cp -n integrations-abhay/supabase/functions/providers-search/mock.json supabase/functions/providers-search/ 2>/dev/null || echo "  - providers-search/mock.json exists, skipping"

# Plans search
cp -n integrations-abhay/supabase/functions/plans-search/index.ts supabase/functions/plans-search/ 2>/dev/null || echo "  - plans-search/index.ts exists, skipping"
cp -n integrations-abhay/supabase/functions/plans-search/mock.json supabase/functions/plans-search/ 2>/dev/null || echo "  - plans-search/mock.json exists, skipping"

# -----------------------------------------------------------------------------
# 2. Shared Contracts → shared/ or backend/
# -----------------------------------------------------------------------------
echo "[2/4] Copying shared contracts..."

mkdir -p shared
cp -n integrations-abhay/shared/contracts.ts shared/ 2>/dev/null || echo "  - contracts.ts exists, skipping"
cp -n integrations-abhay/shared/contracts.py shared/ 2>/dev/null || echo "  - contracts.py exists, skipping"

# Also copy to backend if it exists
if [ -d "backend/app/models" ]; then
    cp -n integrations-abhay/shared/contracts.py backend/app/models/provider_contracts.py 2>/dev/null || echo "  - backend contracts exist, skipping"
fi

# -----------------------------------------------------------------------------
# 3. SQL → docs or supabase/migrations
# -----------------------------------------------------------------------------
echo "[3/4] Copying SQL files to docs (manual migration recommended)..."

mkdir -p docs/sql
cp integrations-abhay/supabase/sql/schema.sql docs/sql/providers_schema.sql
cp integrations-abhay/supabase/sql/seed.sql docs/sql/providers_seed.sql

echo "  - SQL copied to docs/sql/ for manual review"
echo "  - Abdoul should merge into supabase/migrations/"

# -----------------------------------------------------------------------------
# 4. Mobile types (if mobile/ exists)
# -----------------------------------------------------------------------------
echo "[4/4] Copying mobile types..."

if [ -d "mobile/src/types" ]; then
    cp -n integrations-abhay/mobile/src/types/contracts.ts mobile/src/types/provider-contracts.ts 2>/dev/null || echo "  - mobile types exist, skipping"
elif [ -d "mobile/src" ]; then
    mkdir -p mobile/src/types
    cp -n integrations-abhay/mobile/src/types/contracts.ts mobile/src/types/provider-contracts.ts 2>/dev/null || echo "  - mobile types exist, skipping"
fi

# -----------------------------------------------------------------------------
# Done
# -----------------------------------------------------------------------------
echo ""
echo "=== Promotion complete ==="
echo ""
echo "Next steps:"
echo "  1. Review all copied files"
echo "  2. Update import paths in Edge Functions (shared → _shared)"
echo "  3. Merge docs/sql/*.sql into supabase/migrations/"
echo "  4. Test Edge Functions: supabase functions serve"
echo "  5. Commit changes"
```

### Post-Promotion Checklist

#### Import Path Updates

After promotion, Edge Function imports need updating:

```typescript
// Before (in integrations-abhay)
import type { Provider } from "../../../shared/contracts.ts";

// After (in main repo supabase/functions/)
import type { Provider } from "../../shared/contracts.ts";
// Or use relative to _shared if contracts moved there
```

#### For Abdoul

- [ ] Review `docs/sql/providers_schema.sql`
- [ ] Create proper migration file in `supabase/migrations/`
- [ ] Ensure no table name conflicts with existing schema
- [ ] Run seed data after migration

#### For Kurt

- [ ] Update imports to use `shared/contracts.ts` or `mobile/src/types/`
- [ ] Verify API client paths still work
- [ ] Test provider search from mobile app

#### For Abhay

- [ ] Verify Edge Functions still work after path changes
- [ ] Update any hardcoded paths in documentation
- [ ] Archive or delete `integrations-abhay/` if fully promoted

---

## Comparison

| Aspect | Vendor Mode | Promote Mode |
|--------|-------------|--------------|
| **Setup Time** | Minutes | 30+ minutes |
| **Merge Conflicts** | None | Possible |
| **Code Duplication** | Some (contracts) | Minimal |
| **Deployment** | Same | Same |
| **Recommended For** | Hackathon | Post-hackathon cleanup |

---

## Quick Reference — What Goes Where

### Kurt (Frontend/Mobile)

| Source | Destination | Required? |
|--------|-------------|-----------|
| `integrations-abhay/shared/contracts.ts` | `mobile/src/types/` | ✅ Yes |
| `integrations-abhay/mobile/src/api/providers.ts` | `mobile/src/services/` | Optional |
| `integrations-abhay/mobile/src/hooks/useProviderSearch.ts` | `mobile/src/hooks/` | Optional |

### Abdoul (Backend)

| Source | Destination | Required? |
|--------|-------------|-----------|
| `integrations-abhay/shared/contracts.py` | `backend/app/models/` | ✅ Yes |
| `integrations-abhay/supabase/sql/schema.sql` | `supabase/migrations/` | ✅ Yes |
| `integrations-abhay/supabase/sql/seed.sql` | `supabase/seed/` | ✅ For demo |

### Edge Functions (Deploy as-is)

| Source | Deployed To |
|--------|-------------|
| `integrations-abhay/supabase/functions/providers-search/` | `/functions/v1/providers-search` |
| `integrations-abhay/supabase/functions/plans-search/` | `/functions/v1/plans-search` |

---

## Questions?

Reach out to Abhay for:
- Edge Function behavior or modifications
- Google Places API integration
- Network status logic
- Mock data updates
