# Plans Search API

## Endpoint

```
POST /functions/v1/plans-search
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
interface PlanSearchRequest {
  q?: string;      // Free-text search query (optional)
  payer?: string;  // Filter by payer/insurer name (optional)
  state?: string;  // Filter by state (optional)
  limit?: number;  // Max results to return (optional, default 20, max 50)
}
```

All fields are optional. An empty request `{}` returns all plans up to the default limit.

### Validation Rules

- `limit`: If provided, must be > 0 and ≤ 50 (default: 20)
- `state`: Case-insensitive, normalized to uppercase

---

## Sample Requests

### Get All Plans

```json
{}
```

### Search by Text Query

Matches against `payer` OR `plan_name` using case-insensitive partial match.

```json
{
  "q": "PPO"
}
```

### Filter by Payer

```json
{
  "payer": "UPMC"
}
```

### Filter by State

```json
{
  "state": "PA"
}
```

### Combined Filters

```json
{
  "q": "advantage",
  "payer": "UPMC",
  "state": "PA",
  "limit": 10
}
```

---

## Sample Response

```json
{
  "request_id": "req_plan_a1b2c3d4",
  "plans": [
    {
      "id": "33333333-3333-3333-3333-333333333333",
      "payer": "UPMC",
      "plan_name": "UPMC PPO Demo",
      "network": "PPO",
      "state": "PA"
    },
    {
      "id": "44444444-4444-4444-4444-444444444444",
      "payer": "UPMC",
      "plan_name": "UPMC Advantage Gold HMO",
      "network": "HMO",
      "state": "PA"
    }
  ],
  "meta": {
    "returned": 2,
    "ts": "2026-02-06T22:00:00.000Z"
  }
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `request_id` | string | Unique request identifier |
| `plans` | Plan[] | Array of plan results |
| `meta.returned` | number | Number of plans returned |
| `meta.ts` | string | ISO 8601 timestamp |

### Plan Object

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | UUID of the plan (use as `plan_id` in provider search) |
| `payer` | string | Insurance company name |
| `plan_name` | string | Specific plan name |
| `network` | string? | Network type (PPO, HMO, EPO, etc.) |
| `state` | string? | State where plan is offered |

---

## Data Source Modes

### Database Mode (Default)

Queries the Supabase `insurance_plans` table directly.

**Query Logic:**
1. If `q` provided: `ilike` match on `payer` OR `plan_name`
2. If `payer` provided: `ilike` match on `payer`
3. If `state` provided: Exact match (case-insensitive)
4. Order by `payer`, then `plan_name`
5. Apply limit

### Mock Mode

When `MOCK_MODE=true` environment variable is set, returns data from `mock.json` with the same filtering logic applied in-memory.

**Use when:**
- Developing without Supabase connection
- Testing UI with consistent data
- Running in CI/CD

---

## Available Plans (Seed Data)

The seed data includes plans from major Pittsburgh-area insurers:

| Payer | Plans | Networks |
|-------|-------|----------|
| **UPMC** | PPO Demo, Advantage Gold HMO, For You (Medicaid) | PPO, HMO, Medicaid |
| **Aetna** | Open Choice PPO, Choice POS II, Medicare Advantage | PPO, POS, Medicare |
| **BCBSTX** | Blue Choice PPO, Blue Essentials HMO | PPO, HMO |
| **Highmark** | BCBS PPO, Freedom Blue | PPO, Medicare |
| **Cigna** | Open Access Plus, LocalPlus | PPO, EPO |
| **UnitedHealthcare** | Choice Plus PPO, Dual Complete | PPO, Medicare |
| **Geisinger** | Gold Medicare HMO | HMO |

### Demo Plan IDs

For testing provider network status overlay:

| Plan | ID |
|------|-------|
| BCBSTX Blue Choice PPO | `11111111-1111-1111-1111-111111111111` |
| Aetna Open Choice PPO | `22222222-2222-2222-2222-222222222222` |
| UPMC PPO Demo | `33333333-3333-3333-3333-333333333333` |

---

## Field Mask Rationale

Unlike the provider search, plans search returns all fields since:

1. **Small payload** — Plan objects are lightweight
2. **No external API** — Data comes from our database
3. **Full context needed** — UI needs payer, name, network, state for display

---

## Error Responses

### 401 Unauthorized

```json
{
  "error": "Missing or invalid Authorization header"
}
```

### 401 Invalid Token

```json
{
  "error": "Invalid or expired token"
}
```

### 500 Internal Server Error

```json
{
  "error": "Database query failed"
}
```

---

## cURL Examples

### With Authentication (Production)

```bash
# First, get an access token from Supabase Auth (e.g., after user login)
# In your app: const { data: { session } } = await supabase.auth.getSession()
# Use: session.access_token

# Get all plans
curl -X POST https://<project>.supabase.co/functions/v1/plans-search \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{}'

# Search by query
curl -X POST https://<project>.supabase.co/functions/v1/plans-search \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{"q": "UPMC"}'

# Filter by payer and state
curl -X POST https://<project>.supabase.co/functions/v1/plans-search \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{"payer": "Aetna", "state": "PA", "limit": 5}'
```

### Without Authentication (Hackathon Demo)

When `DEV_BYPASS_AUTH=true` is set on the backend:

```bash
# No Authorization header needed
curl -X POST http://localhost:54321/functions/v1/plans-search \
  -H "Content-Type: application/json" \
  -d '{}'
```

---

## Usage in Provider Search

After retrieving plans, use the `id` field as `plan_id` in provider search to get network status:

```bash
# 1. Get plans
curl -X POST .../plans-search -d '{"payer": "UPMC"}' | jq '.plans[0].id'
# Returns: "33333333-3333-3333-3333-333333333333"

# 2. Search providers with plan
curl -X POST .../providers-search \
  -d '{
    "lat": 40.4406,
    "lng": -79.9959,
    "radius_miles": 10,
    "limit": 20,
    "source": "cache",
    "plan_id": "33333333-3333-3333-3333-333333333333"
  }'
```

Each provider in the response will have `network_status` populated based on the selected plan.
