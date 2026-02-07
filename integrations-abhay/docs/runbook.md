# CareMap Integrations — Local Development Runbook

> Quick guide to get the integrations layer running locally for hackathon development.

---

## 1. Environment Variables

### Backend / Edge Functions

Create `integrations-abhay/.env` (copy from `.env.example`):

```bash
cd integrations-abhay
cp .env.example .env
```

Fill in:

```bash
# Supabase (from Project Settings > API)
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1...  # For cache writes in places mode

# Google Maps (from Google Cloud Console)
GOOGLE_MAPS_API_KEY=AIzaSy...

# Development settings
GOOGLE_PLACES_API_BASE=https://places.googleapis.com
MOCK_MODE=true  # Set to false to use real data
DEFAULT_LAT=40.4406
DEFAULT_LNG=-79.9959

# Auth bypass for demos (see section below)
DEV_BYPASS_AUTH=false
```

### Mobile App

Create `integrations-abhay/mobile/.env`:

```bash
cd integrations-abhay/mobile
cp .env.example .env
```

Fill in:

```bash
# Supabase
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1...

# Edge Functions URL (for local dev)
EXPO_PUBLIC_SUPABASE_FUNCTIONS_BASE_URL=http://localhost:54321/functions/v1
```

> **Tip:** For production, remove the `EXPO_PUBLIC_SUPABASE_FUNCTIONS_BASE_URL` to use the default Supabase Functions URL.

---

## 1.5 DEV_BYPASS_AUTH — Skip JWT for Demos

For quick demos or testing without Supabase Auth set up, you can bypass JWT verification.

### ⚠️ WARNING

**Never enable this in production!** This bypasses all authentication.

### How to Enable

In your `.env`:

```bash
DEV_BYPASS_AUTH=true
```

Then restart Edge Functions:

```bash
supabase functions serve --env-file .env
```

### How It Works

When `DEV_BYPASS_AUTH=true`:
- Requests **do not require** an `Authorization` header
- Edge Functions use the anon key for database access
- Response `meta` includes a warning field:

```json
{
  "meta": {
    "returned": 10,
    "ts": "2026-02-06T...",
    "warning": "DEV_BYPASS_AUTH enabled — do not use in production."
  }
}
```

### When to Use

✅ **Use for:**
- Live demos without auth setup
- Quick testing during hackathon
- Sharing API with teammates who don't have JWT
- Testing curl commands without token

❌ **Never use for:**
- Production deployment
- Any environment with real data
- Publicly accessible endpoints

### Example: Test Without JWT

```bash
# With DEV_BYPASS_AUTH=true, no Authorization header needed
curl -X POST http://localhost:54321/functions/v1/providers-search \
  -H "Content-Type: application/json" \
  -d '{"lat": 40.4406, "lng": -79.9959, "radius_miles": 10, "limit": 10, "source": "mock"}'
```

### Disable After Demo

```bash
# In .env
DEV_BYPASS_AUTH=false

# Restart functions
supabase functions serve --env-file .env
```

---

## 2. Load Schema & Seed Data

SQL files are located in:

```
integrations-abhay/supabase/sql/
├── schema.sql   # Tables, indexes, RLS policies
└── seed.sql     # Demo plans, providers, network mappings
```

### Option A: Supabase Dashboard (Easiest)

1. Go to your Supabase project → **SQL Editor**
2. Copy contents of `schema.sql` → Run
3. Copy contents of `seed.sql` → Run

### Option B: Supabase CLI

```bash
# If you have Supabase CLI linked to your project
supabase db push

# Or run SQL directly
supabase db execute --file integrations-abhay/supabase/sql/schema.sql
supabase db execute --file integrations-abhay/supabase/sql/seed.sql
```

### Option C: psql (Direct Connection)

```bash
# Get connection string from Supabase Dashboard > Settings > Database
psql "postgresql://postgres:password@db.xxx.supabase.co:5432/postgres" \
  -f integrations-abhay/supabase/sql/schema.sql

psql "postgresql://postgres:password@db.xxx.supabase.co:5432/postgres" \
  -f integrations-abhay/supabase/sql/seed.sql
```

### Verify Seed Data

```sql
SELECT COUNT(*) FROM providers;        -- Should be ~30
SELECT COUNT(*) FROM insurance_plans;  -- Should be 3
SELECT COUNT(*) FROM provider_networks; -- Should be ~90
```

---

## 3. Serve Edge Functions Locally

### Using Supabase CLI

```bash
cd integrations-abhay

# Start Supabase local dev stack (if not using hosted)
supabase start

# Serve Edge Functions with environment variables
supabase functions serve --env-file .env
```

Functions will be available at:
```
http://localhost:54321/functions/v1/providers-search
http://localhost:54321/functions/v1/plans-search
```

### Using Deno Directly (Alternative)

```bash
cd integrations-abhay/supabase/functions

# Serve a single function
deno run --allow-net --allow-env --allow-read providers-search/index.ts
```

> **Note:** Deno direct mode won't have Supabase client auto-configured. Best to use `supabase functions serve`.

### Check Functions Are Running

```bash
curl http://localhost:54321/functions/v1/providers-search \
  -X OPTIONS -I
# Should return 204 with CORS headers
```

---

## 4. Test with cURL Scripts

### Set Up Environment

```bash
cd integrations-abhay/scripts

# For local development
export FUNCTIONS_BASE_URL="http://localhost:54321/functions/v1"

# Option A: Use a real Supabase access token (from supabase.auth.getSession())
export AUTH_BEARER="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Option B: For hackathon demos, skip auth entirely
# Set DEV_BYPASS_AUTH=true in your .env and restart Edge Functions
# Then you can omit AUTH_BEARER and calls will work without auth

# For hosted Supabase
# export FUNCTIONS_BASE_URL="https://your-project.supabase.co/functions/v1"
```

### Test Plans Search

```bash
# Get all plans
./curl_plans_search.sh '{}'

# Search by payer
./curl_plans_search.sh '{"payer": "UPMC"}'

# Expected: List of plans with request_id and meta
```

### Test Provider Search — Mock Mode

```bash
./curl_providers_search.sh '{
  "lat": 40.4406,
  "lng": -79.9959,
  "radius_miles": 10,
  "limit": 10,
  "source": "mock"
}'
# Expected: 10 mock providers with distances
```

### Test Provider Search — Cache Mode

```bash
./curl_providers_search.sh '{
  "lat": 40.4406,
  "lng": -79.9959,
  "radius_miles": 15,
  "limit": 20,
  "source": "cache"
}'
# Expected: Providers from seed data
```

### Test Provider Search — With Network Status

```bash
# UPMC plan ID from seed
./curl_providers_search.sh '{
  "lat": 40.4406,
  "lng": -79.9959,
  "radius_miles": 15,
  "limit": 20,
  "source": "cache",
  "plan_id": "33333333-3333-3333-3333-333333333333"
}'
# Expected: Providers with network_status populated
```

### Test Provider Search — Places Mode

```bash
./curl_providers_search.sh '{
  "q": "urgent care",
  "lat": 40.4406,
  "lng": -79.9959,
  "radius_miles": 5,
  "limit": 10,
  "source": "places"
}'
# Expected: Fresh results from Google Places API
# Requires: GOOGLE_MAPS_API_KEY and SUPABASE_SERVICE_ROLE_KEY
```

---

## 5. Run Mobile App

```bash
cd integrations-abhay/mobile

# Install dependencies
npm install

# Start Expo
npx expo start
```

Then:
- Press `i` for iOS Simulator
- Press `a` for Android Emulator
- Scan QR code with Expo Go app on device

### Test the Demo Screen

1. App loads with **ProviderDemoScreen**
2. Select a plan from the horizontal picker (or "None")
3. Optionally enter a search query
4. Tap **Mock** / **Cache** / **Places** buttons
5. View results with network badges

---

## 6. Troubleshooting

### 400 Bad Request from Places API

**Symptom:** `Places API error (400): Bad Request`

**Causes:**
- Missing or invalid `X-Goog-FieldMask` header
- Invalid request body structure
- API key not enabled for Places API (New)

**Fix:**
```bash
# Verify API key works
curl -X POST "https://places.googleapis.com/v1/places:searchNearby" \
  -H "Content-Type: application/json" \
  -H "X-Goog-Api-Key: YOUR_API_KEY" \
  -H "X-Goog-FieldMask: places.displayName" \
  -d '{"locationRestriction":{"circle":{"center":{"latitude":40.44,"longitude":-79.99},"radius":1000}}}'
```

### 401 Unauthorized

**Symptom:** `Missing or invalid Authorization header`

**Causes:**
- No access token provided
- Token expired
- Using the wrong token (anon key is NOT a JWT)

**Fix:**

```bash
# Option 1: Get a real access token from Supabase Auth
# In your app, after login: supabase.auth.getSession() -> session.access_token

# Option 2: Enable dev bypass for demos (easiest for hackathon)
# In .env: DEV_BYPASS_AUTH=true
# Then restart Edge Functions and omit the Authorization header
```

> **Note:** The Supabase anon key is an API key, not a JWT. For authenticated requests,
> you need the `access_token` from a logged-in user session.

### 500 Server Configuration Error

**Symptom:** `Server configuration error` or `Places mode requires service role`

**Causes:**
- Environment variables not loaded
- Service role key missing for places mode

**Fix:**
```bash
# Check env vars are loaded in Edge Function
supabase functions serve --env-file .env --debug

# Verify .env has all required vars
cat .env | grep -E "SUPABASE|GOOGLE"
```

### Rate Limits / Billing

**Google Places API:**
- Free tier: ~$200/month credit
- Nearby Search: $32 per 1000 requests
- Text Search: $32 per 1000 requests

**Mitigation:**
- Use `source: "mock"` or `source: "cache"` during development
- Only use `source: "places"` for demos or when cache is empty
- Set up billing alerts in Google Cloud Console

### CORS Issues (Mobile)

**Symptom:** Network request fails from Expo app

**Note:** CORS is a browser security feature. React Native's `fetch` doesn't enforce CORS, so mobile apps should work without issues.

**If testing in Expo Web:**
- Edge Functions include CORS headers for `*` origin
- Ensure you're calling the correct URL
- Check browser DevTools Network tab for actual error

**Fix for web testing:**
```bash
# Verify CORS headers
curl -X OPTIONS http://localhost:54321/functions/v1/providers-search \
  -H "Origin: http://localhost:8081" \
  -H "Access-Control-Request-Method: POST" \
  -v 2>&1 | grep -i "access-control"
```

### Empty Results from Cache

**Symptom:** `"providers": []` with `source: "cache"`

**Causes:**
- Seed data not loaded
- Search location too far from Pittsburgh
- Radius too small

**Fix:**
```bash
# Verify seed data exists
# In Supabase SQL Editor:
SELECT name, lat, lng FROM providers LIMIT 5;

# Use Pittsburgh coordinates
"lat": 40.4406, "lng": -79.9959, "radius_miles": 15
```

---

## Quick Reference

| Task | Command |
|------|---------|
| Serve functions locally | `supabase functions serve --env-file .env` |
| Run mobile app | `cd mobile && npx expo start` |
| Test mock search | `./scripts/curl_providers_search.sh '{"lat":40.44,"lng":-79.99,"radius_miles":10,"limit":10,"source":"mock"}'` |
| Load seed data | Copy `supabase/sql/*.sql` to Supabase SQL Editor |
| Check function logs | `supabase functions logs providers-search` |
| Enable auth bypass | Set `DEV_BYPASS_AUTH=true` in `.env`, restart functions |
| Test without auth | `curl -X POST localhost:54321/functions/v1/plans-search -H "Content-Type: application/json" -d '{}'` (requires DEV_BYPASS_AUTH=true) |

---

## Demo Checklist

- [ ] Supabase project created
- [ ] Schema + seed loaded
- [ ] Environment variables configured
- [ ] Edge Functions serving (local or hosted)
- [ ] Mobile app running
- [ ] Mock search returns results
- [ ] Cache search returns seeded providers
- [ ] Network badges display correctly
