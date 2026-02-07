# Provider Search API

## Endpoint

```
POST /functions/v1/providers-search
```

## Headers

| Header | Required | Description |
|--------|----------|-------------|
| `Authorization` | ✅* | `Bearer <access_token>` — Supabase session access token from `supabase.auth.getSession()` |
| `Content-Type` | ✅ | `application/json` |

> **\*Note:** Authorization is required by default. For hackathon demos, set `DEV_BYPASS_AUTH=true` 
> on the backend to skip auth. The anon key is **not** a valid token for this header—you need the
> actual access token from a logged-in user session.

## Request Body

```typescript
interface ProviderSearchRequest {
  q?: string;           // Free-text search query (optional)
  types?: string[];     // Filter by Google Places types (optional, defaults apply in "places" mode)
  specialty?: string;   // Filter by medical specialty (optional)
  lat: number;          // Latitude of search origin (required)
  lng: number;          // Longitude of search origin (required)
  radius_miles: number; // Search radius in miles (required, max 50)
  limit: number;        // Max results to return (required, max 50)
  plan_id?: string;     // Optional plan ID for network status overlay
  source: "cache" | "places" | "mock"; // Data source (required)
}
```

> **Note:** When `source: "places"` and `types` is empty/undefined, defaults to 
> `["hospital", "doctor", "dentist", "physiotherapist", "pharmacy"]` to filter for healthcare providers.

### Validation Rules

- `lat`: Required number
- `lng`: Required number
- `radius_miles`: Required, must be > 0 and ≤ 50
- `limit`: Required, must be > 0 and ≤ 50
- `source`: Required, must be one of `"cache"`, `"places"`, `"mock"`

---

## Sample Requests

### Basic Mock Search

```json
{
  "lat": 40.4406,
  "lng": -79.9959,
  "radius_miles": 10,
  "limit": 20,
  "source": "mock"
}
```

### Cache Search with Specialty Filter

```json
{
  "lat": 40.4406,
  "lng": -79.9959,
  "radius_miles": 15,
  "limit": 20,
  "specialty": "cardiology",
  "source": "cache"
}
```

### Places API Search with Query

```json
{
  "q": "urgent care",
  "lat": 40.4406,
  "lng": -79.9959,
  "radius_miles": 5,
  "limit": 10,
  "source": "places"
}
```

### Search with Network Status Overlay

```json
{
  "lat": 40.4406,
  "lng": -79.9959,
  "radius_miles": 10,
  "limit": 20,
  "plan_id": "33333333-3333-3333-3333-333333333333",
  "source": "cache"
}
```

---

## Sample Response

```json
{
  "request_id": "req_a1b2c3d4e5f6",
  "providers": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "place_id": "ChIJ1234567890",
      "name": "UPMC Heart & Vascular Institute",
      "types": ["hospital", "doctor"],
      "specialties": ["cardiology", "cardiovascular_surgery"],
      "address": {
        "line1": "200 Lothrop St",
        "city": "Pittsburgh",
        "state": "PA",
        "zip": "15213"
      },
      "geo": {
        "lat": 40.4416,
        "lng": -79.9569
      },
      "phone": "+1-412-647-2345",
      "website": "https://www.upmc.com/heart",
      "network_status": {
        "in_network": true,
        "network_name": "UPMC Health Plan",
        "confidence": 0.95,
        "source": "seed"
      },
      "distance_miles": 2.3
    }
  ],
  "meta": {
    "total": 15,
    "returned": 1,
    "ts": "2026-02-06T22:00:00.000Z",
    "source_used": "cache"
  }
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `request_id` | string | Unique request identifier |
| `providers` | Provider[] | Array of provider results |
| `meta.total` | number | Total providers matching (before limit) |
| `meta.returned` | number | Number of providers returned |
| `meta.ts` | string | ISO 8601 timestamp |
| `meta.source_used` | string | Actual data source used (may be `"cache (fallback)"` if Places failed) |
| `meta.warning` | string? | Warning message (e.g., Places API failure, dev bypass) |
| `meta.warnings` | string[]? | Multiple warnings if applicable |

---

## Data Source Modes

### `"mock"` — Mock Mode

Returns static test data from `mock.json`. No external API calls.

**Use when:**
- Developing UI without backend
- Testing without API keys
- Running in CI/CD
- Offline development

### `"cache"` — Cache Mode

Queries the Supabase `providers` table directly.

**Behavior:**
1. Calculate bounding box from lat/lng + radius
2. Query providers within bounding box
3. Filter by exact haversine distance
4. Apply specialty/types filters if provided
5. Sort by distance, apply limit

**Use when:**
- Querying pre-seeded or previously-cached providers
- Avoiding Google Places API costs
- Need consistent, fast results

### `"places"` — Places API Mode

Fetches fresh data from Google Places API, caches results, then returns.

**Behavior:**
1. Apply type filter (see Default Type Filtering below)
2. Call Google Places API (text search if `q` provided, nearby search otherwise)
3. Normalize results to Provider format
4. Upsert into `providers` table (by `place_id` or name+location)
5. Query from cache to return consistent results with IDs

**Use when:**
- Searching for providers not in cache
- Need fresh/complete data
- User searching by specific query

**Requires:**
- `GOOGLE_MAPS_API_KEY` environment variable
- `SUPABASE_SERVICE_ROLE_KEY` for cache writes

**API Call Limits:**
- Fetch limit is capped at `limit * 2` (max 20 per API call)
- Results are capped at `limit * 2` before normalization
- This prevents excessive API costs while allowing for some filtering loss

### Default Type Filtering (Places Mode)

When `source: "places"` is used, the API applies healthcare type filtering:

| Scenario | Types Used |
|----------|------------|
| `types` provided | User-specified types |
| `types` empty/undefined | Default healthcare types |

**Default healthcare types:**
```json
["hospital", "doctor", "dentist", "physiotherapist", "pharmacy"]
```

These are the closest supported Google Places API types for healthcare.
See [Google Places types](https://developers.google.com/maps/documentation/places/web-service/place-types).

**Why default types?**
- Prevents returning non-healthcare results (restaurants, gas stations, etc.)
- Ensures relevant results even for broad text queries like "care near me"
- Types are applied in both text search (`q` provided) and nearby search modes

**Override default types:**

```json
{
  "lat": 40.4406,
  "lng": -79.9959,
  "radius_miles": 10,
  "limit": 20,
  "source": "places",
  "types": ["hospital"]
}
```

**Note for text search:** Google Places text search only uses the first type in the array as `includedType`. Nearby search uses all types as `includedTypes`.

---

## Places API Fallback Behavior

The `"places"` mode has robust error handling to ensure reliability:

### Success Flow
```
Request (source: "places")
    ↓
Google Places API call
    ↓ (success)
Upsert results to cache
    ↓
Query from cache
    ↓
Return providers with source_used: "places"
```

### Failure Flow (Automatic Fallback)
```
Request (source: "places")
    ↓
Google Places API call
    ↓ (error: network, 4xx, 5xx)
Log error (safe message only)
    ↓
Query from cache (fallback)
    ↓
├── Cache has results → Return with warning
│   source_used: "cache (fallback)"
│   warning: "Places API failed: ... Falling back to cache."
│
└── Cache is empty → Return 502
    error: "No providers found. Places API unavailable and cache is empty."
```

### Error Response (502)

When Places API fails AND cache is empty:

```json
{
  "error": "No providers found. Places API unavailable and cache is empty.",
  "places_error": "Places API error (403)"
}
```

### Fallback Response Example

When Places API fails but cache has data:

```json
{
  "request_id": "req_abc123",
  "providers": [...],
  "meta": {
    "total": 15,
    "returned": 10,
    "ts": "2026-02-06T...",
    "source_used": "cache (fallback)",
    "warning": "Places API failed: Places API error (500). Falling back to cache."
  }
}
```

### Safe Error Messages

Error messages in responses are sanitized:
- No API keys or credentials
- No large response dumps
- Short, descriptive messages only

Examples:
- `"Places API error (403)"`
- `"Places API error (500)"`
- `"GOOGLE_MAPS_API_KEY not configured"`
- `"Places API request failed"`

---

## Radius Conversion

The `radius_miles` parameter is converted to meters for the Google Places API:

```
radius_meters = radius_miles × 1609.344
```

| Miles | Meters |
|-------|--------|
| 1 | 1,609 |
| 5 | 8,047 |
| 10 | 16,093 |
| 25 | 40,234 |
| 50 | 80,467 |

---

## Network Status Overlay

When `plan_id` is provided, each provider gets a `network_status` object:

```json
{
  "in_network": true,
  "network_name": "UPMC Health Plan",
  "confidence": 0.95,
  "source": "seed"
}
```

### Source Values

| Source | Description | Confidence Range |
|--------|-------------|------------------|
| `seed` | From seeded `provider_networks` table | 0.7 - 0.95 |
| `heuristic` | Inferred from provider name patterns | 0.6 - 0.9 |
| `unknown` | No data available | 0.3 - 0.5 |

### Heuristic Rules (Hackathon Demo)

| Pattern | UPMC Plan | Aetna Plan | BCBS Plan |
|---------|-----------|------------|-----------|
| Name contains "UPMC" | ✅ In (0.9) | ❌ Out (0.75) | ✅ In (0.6) |
| Name contains "AHN"/"Allegheny" | ❌ Out (0.7) | ✅ In (0.85) | ✅ In (0.7) |
| Name contains "MedExpress"/"Urgent Care" | ✅ In (0.6) | ✅ In (0.6) | ✅ In (0.6) |
| Other | ❌ Out (0.3) | ❌ Out (0.3) | ❌ Out (0.3) |

> ⚠️ **Hackathon Note:** Network status is heuristic/seeded for demo. Not official insurer data.

---

## Field Mask Rationale

When calling Google Places API, we request minimal fields to:

1. **Reduce response size** — Faster network transfer
2. **Lower API costs** — Places API charges per field
3. **Privacy** — Avoid fetching unnecessary data

### Requested Fields

```
places.id
places.displayName
places.formattedAddress
places.location
places.types
places.nationalPhoneNumber
places.websiteUri
```

### Excluded Fields

- `places.photos` — Large, not needed for list view
- `places.reviews` — Privacy concerns, not needed
- `places.priceLevel` — Not relevant for healthcare
- `places.businessStatus` — Can check separately if needed
- `places.openingHours` — Complex, can fetch on detail view

---

## Error Responses

### 401 Unauthorized

```json
{
  "error": "Missing or invalid Authorization header"
}
```

### 400 Bad Request

```json
{
  "error": "radius_miles must be <= 50"
}
```

### 500 Internal Server Error

```json
{
  "error": "Internal server error"
}
```

### 502 Bad Gateway (Places Mode Only)

When Places API fails AND cache is empty:

```json
{
  "error": "No providers found. Places API unavailable and cache is empty.",
  "places_error": "Places API error (503)"
}
```

This only occurs when:
1. `source` is `"places"`
2. Google Places API returns an error (network, 4xx, 5xx)
3. Cache has no providers in the search area

**Resolution:** Seed the cache with providers, or fix the Places API issue.

---

## cURL Examples

### With Authentication (Production)

```bash
# First, get an access token from Supabase Auth (e.g., after user login)
# In your app: const { data: { session } } = await supabase.auth.getSession()
# Use: session.access_token

# Mock mode
curl -X POST https://<project>.supabase.co/functions/v1/providers-search \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{"lat": 40.4406, "lng": -79.9959, "radius_miles": 10, "limit": 10, "source": "mock"}'

# Cache mode with plan
curl -X POST https://<project>.supabase.co/functions/v1/providers-search \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{"lat": 40.4406, "lng": -79.9959, "radius_miles": 10, "limit": 20, "source": "cache", "plan_id": "33333333-3333-3333-3333-333333333333"}'

# Places mode with query
curl -X POST https://<project>.supabase.co/functions/v1/providers-search \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{"q": "cardiologist", "lat": 40.4406, "lng": -79.9959, "radius_miles": 5, "limit": 10, "source": "places"}'
```

### Without Authentication (Hackathon Demo)

When `DEV_BYPASS_AUTH=true` is set on the backend:

```bash
# No Authorization header needed
curl -X POST http://localhost:54321/functions/v1/providers-search \
  -H "Content-Type: application/json" \
  -d '{"lat": 40.4406, "lng": -79.9959, "radius_miles": 10, "limit": 10, "source": "mock"}'
```
