# Kurt's Drop-In Integration Guide

> Quick integration guide for the CareMap mobile app. Copy-paste ready!

---

## Available Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/functions/v1/providers-search` | POST | Search healthcare providers by location |
| `/functions/v1/plans-search` | POST | Search insurance plans |

**Base URL:**
- Local: `http://localhost:54321/functions/v1`
- Production: `https://<project>.supabase.co/functions/v1`

---

## Provider Search

### Request

```typescript
interface ProviderSearchRequest {
  q?: string;              // Optional search query (e.g., "cardiologist")
  lat: number;             // Required: latitude
  lng: number;             // Required: longitude
  radius_miles: number;    // Required: 1-50
  limit: number;           // Required: 1-50
  source: "mock" | "cache" | "places";  // Required
  plan_id?: string;        // Optional: for network status
  specialty?: string;      // Optional: filter by specialty
  types?: string[];        // Optional: filter by types
}
```

### Response

```typescript
interface ProviderSearchResponse {
  request_id: string;
  providers: Provider[];
  meta: {
    total: number;
    returned: number;
    ts: string;
    source_used: string;
    warning?: string;      // Present if fallback or dev mode
    warnings?: string[];   // Multiple warnings
  };
}

interface Provider {
  id: string;
  name: string;
  address: {
    line1: string;
    city: string;
    state: string;
    zip?: string;
  };
  geo: { lat: number; lng: number };
  phone?: string;
  website?: string;
  types?: string[];
  specialties?: string[];
  distance_miles?: number;
  network_status?: {
    in_network: boolean;
    network_name?: string;
    confidence: number;    // 0.0 - 1.0
    source: "seed" | "heuristic" | "unknown";
  };
}
```

### Example Request

```json
{
  "lat": 40.4406,
  "lng": -79.9959,
  "radius_miles": 10,
  "limit": 20,
  "source": "mock",
  "plan_id": "33333333-3333-3333-3333-333333333333"
}
```

---

## Plans Search

### Request

```typescript
interface PlanSearchRequest {
  q?: string;       // Optional text search
  payer?: string;   // Optional filter by payer
  state?: string;   // Optional filter by state
  limit?: number;   // Optional, default 20, max 50
}
```

### Response

```typescript
interface PlanSearchResponse {
  request_id: string;
  plans: Plan[];
  meta: {
    returned: number;
    ts: string;
    warning?: string;
  };
}

interface Plan {
  id: string;          // Use this as plan_id in provider search
  payer: string;       // e.g., "UPMC", "Aetna"
  plan_name: string;   // e.g., "UPMC PPO Demo"
  network?: string;    // e.g., "PPO", "HMO"
  state?: string;      // e.g., "PA"
}
```

---

## Source Modes

| Mode | When to Use | API Cost | Speed |
|------|-------------|----------|-------|
| `"mock"` | Development, demos, no backend | Free | Instant |
| `"cache"` | Production, seeded data available | Free | Fast |
| `"places"` | Need fresh data, user search | $$ | Slower |

### Recommended Flow

```
1. Start with "mock" for UI development
2. Switch to "cache" when backend is ready
3. Use "places" only when user explicitly searches
   or cache returns empty
```

### Auto-Fallback

If `source: "places"` fails, the API automatically falls back to cache.
Check `meta.source_used` and `meta.warning` to detect this:

```typescript
if (response.meta.source_used === "cache (fallback)") {
  // Show subtle warning: "Showing cached results"
}
```

---

## Network Status Badges

### Display Logic

```typescript
function getNetworkBadge(provider: Provider, selectedPlan: Plan | null) {
  const status = provider.network_status;
  
  // No plan selected
  if (!selectedPlan || !status) {
    return { label: "Select a plan", color: "gray", show: false };
  }
  
  // High confidence (seed data)
  if (status.source === "seed") {
    return status.in_network
      ? { label: "In-Network", color: "green", show: true }
      : { label: "Out-of-Network", color: "red", show: true };
  }
  
  // Medium confidence (heuristic)
  if (status.source === "heuristic") {
    return status.in_network
      ? { label: "Likely In-Network", color: "green", show: true }
      : { label: "Likely Out-of-Network", color: "orange", show: true };
  }
  
  // Low confidence (unknown)
  return { label: "Network Unknown", color: "gray", show: true };
}
```

### Badge Wording by Confidence

| Source | In-Network | Out-of-Network |
|--------|------------|----------------|
| `seed` (0.7-0.95) | "In-Network" | "Out-of-Network" |
| `heuristic` (0.5-0.9) | "Likely In-Network" | "Likely Out-of-Network" |
| `unknown` (0.3) | "Network Unknown" | "Network Unknown" |

### Show Confidence Percentage (Optional)

```typescript
// Only show for non-seed sources
{status.source !== "seed" && (
  <Text style={styles.confidence}>
    {Math.round(status.confidence * 100)}% confidence
  </Text>
)}
```

---

## UI States

### Loading

```tsx
{loading && (
  <View style={styles.centered}>
    <ActivityIndicator size="large" color="#4ecdc4" />
    <Text>Searching providers...</Text>
  </View>
)}
```

### Empty Results

```tsx
{!loading && providers.length === 0 && (
  <View style={styles.centered}>
    <Text style={styles.emptyTitle}>No providers found</Text>
    <Text style={styles.emptyHint}>
      Try expanding your search radius or changing filters
    </Text>
  </View>
)}
```

### Error

```tsx
{error && (
  <View style={styles.errorBanner}>
    <Text style={styles.errorText}>⚠️ {error}</Text>
    <TouchableOpacity onPress={retry}>
      <Text style={styles.retryLink}>Retry</Text>
    </TouchableOpacity>
  </View>
)}
```

### Fallback Warning

```tsx
{meta?.warning && (
  <View style={styles.warningBanner}>
    <Text style={styles.warningText}>
      ℹ️ Showing cached results. Live search unavailable.
    </Text>
  </View>
)}
```

---

## Copy/Paste Code Snippets

### Provider Search (TypeScript/React Native)

```typescript
const FUNCTIONS_BASE_URL = process.env.EXPO_PUBLIC_SUPABASE_FUNCTIONS_BASE_URL 
  || "https://your-project.supabase.co/functions/v1";

interface SearchParams {
  lat: number;
  lng: number;
  radiusMiles: number;
  limit: number;
  source: "mock" | "cache" | "places";
  query?: string;
  planId?: string;
}

async function searchProviders(
  params: SearchParams,
  accessToken?: string  // Optional if DEV_BYPASS_AUTH=true on backend
): Promise<ProviderSearchResponse> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  
  // Include auth header if we have an access token
  // Access token comes from: supabase.auth.getSession() -> session.access_token
  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  const response = await fetch(`${FUNCTIONS_BASE_URL}/providers-search`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      lat: params.lat,
      lng: params.lng,
      radius_miles: params.radiusMiles,
      limit: params.limit,
      source: params.source,
      q: params.query,
      plan_id: params.planId,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

// Usage with auth (production)
const { data: { session } } = await supabase.auth.getSession();
const result = await searchProviders({
  lat: 40.4406,
  lng: -79.9959,
  radiusMiles: 10,
  limit: 20,
  source: "mock",
  planId: selectedPlan?.id,
}, session?.access_token);

// Usage without auth (hackathon demo with DEV_BYPASS_AUTH=true)
const demoResult = await searchProviders({
  lat: 40.4406,
  lng: -79.9959,
  radiusMiles: 10,
  limit: 20,
  source: "mock",
});

console.log(`Found ${result.meta.returned} providers`);
```

### Plans Search (TypeScript/React Native)

```typescript
async function searchPlans(
  query?: string,
  accessToken?: string  // Optional if DEV_BYPASS_AUTH=true on backend
): Promise<PlanSearchResponse> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  
  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  const response = await fetch(`${FUNCTIONS_BASE_URL}/plans-search`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      q: query,
      state: "PA",  // Filter to Pennsylvania
      limit: 20,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

// Usage with auth (production)
useEffect(() => {
  supabase.auth.getSession().then(({ data: { session } }) => {
    searchPlans(undefined, session?.access_token)
      .then(result => setPlans(result.plans))
      .catch(err => console.error("Failed to load plans:", err));
  });
}, []);

// Usage without auth (hackathon demo with DEV_BYPASS_AUTH=true)
useEffect(() => {
  searchPlans()
    .then(result => setPlans(result.plans))
    .catch(err => console.error("Failed to load plans:", err));
}, []);
```

### Simple React Hook

```typescript
function useProviders(params: SearchParams | null) {
  const [data, setData] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<ProviderSearchResponse["meta"] | null>(null);

  const search = useCallback(async () => {
    if (!params) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Get access token from current session (or undefined for DEV_BYPASS_AUTH mode)
      const { data: { session } } = await supabase.auth.getSession();
      const result = await searchProviders(params, session?.access_token);
      setData(result.providers);
      setMeta(result.meta);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [params]);

  return { data, loading, error, meta, search };
}
```

---

## Quick Test (No Auth)

If `DEV_BYPASS_AUTH=true` is set on the backend, you can test without a token:

```bash
curl -X POST http://localhost:54321/functions/v1/providers-search \
  -H "Content-Type: application/json" \
  -d '{
    "lat": 40.4406,
    "lng": -79.9959,
    "radius_miles": 10,
    "limit": 5,
    "source": "mock"
  }'
```

---

## Plan IDs for Testing

| Plan | ID |
|------|-----|
| UPMC PPO Demo | `33333333-3333-3333-3333-333333333333` |
| Aetna Open Choice PPO | `22222222-2222-2222-2222-222222222222` |
| BCBS Blue Choice PPO | `11111111-1111-1111-1111-111111111111` |

---

## Checklist

- [ ] Fetch plans on app load
- [ ] Let user select a plan (or "None")
- [ ] Pass `plan_id` to provider search
- [ ] Display network badges with appropriate wording
- [ ] Handle loading, empty, error states
- [ ] Show fallback warning when `meta.warning` exists
- [ ] Use `source: "mock"` during development

---

## Questions?

Ping Abhay for:
- API issues or bugs
- New filters or features
- Network status logic questions
