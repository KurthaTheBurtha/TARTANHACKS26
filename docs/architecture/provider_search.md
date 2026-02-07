# Provider Search Architecture

## Overview

Provider search enables users to find healthcare providers near them with in-network scoring. The system uses a cache-first approach, policy-aware scoring, and a pluggable provider source adapter for future integrations (e.g., Google Places).

## Components

### 1. Provider Source Adapter

**Interface:** `ProviderSource`
- Abstract base class for provider data sources
- `search(query, lat, lng, radius_miles)` → returns raw provider data

**Implementations:**
- `MockProviderSource`: Returns deterministic mock providers for MVP
- Future: `GooglePlacesSource`, `InsurerDirectorySource` (Abhay's integration)

**Location:** `backend/app/services/providers/source.py`

### 2. Provider Normalizer

**Service:** `normalize_provider()`
- Converts raw provider data to standard format
- Calculates distance from search center using Haversine formula
- Standardizes fields: `provider_id`, `name`, `lat`, `lng`, `address`, `phone`, `types`, `npi`, `distance_miles`

**Location:** `backend/app/services/providers/normalizer.py`

### 3. In-Network Scoring

**Service:** `evaluate_in_network()`
- Scores provider's in-network likelihood (0..1)
- Policy-aware: uses RAG to retrieve relevant policy chunks if `policy_doc_id` provided
- Applies heuristics with weighted scoring
- Returns: `{ status, confidence, reasons, evidence }`

**Heuristics:**
- +0.20: Provider name contains known in-network system keyword
- +0.15: Provider types match requested specialty
- +0.10: Provider within 5 miles
- +0.10: Policy indicates PPO-style network (if policy provided)
- -0.25: Provider name includes "Out of Network"

**Status Mapping:**
- >= 0.70 → `likely_in_network`
- 0.40-0.69 → `unknown`
- < 0.40 → `likely_out_of_network`

**Location:** `backend/app/services/network/in_network.py`, `heuristics.py`

### 4. Caching Strategy

**Cache Key:** SHA-256 hash of `(user_id, query, lat_rounded, lng_rounded, radius_miles)`
- Lat/lng rounded to 3 decimals for privacy + cache hit rate
- TTL: 24 hours

**Implementation:**
- MVP: In-memory cache (`SearchCache` class)
- Future: Redis or dedicated `search_cache` table

**Location:** `backend/app/services/providers/search.py`

### 5. Provider Repository

**Service:** `providers_repo.py`
- `upsert_provider()`: Store provider in `providers_cache` by NPI
- `get_provider_by_id()`: Retrieve cached provider
- Uses NPI as unique identifier when available

**Location:** `backend/app/services/db/providers_repo.py`

## API Endpoints

### `GET /v1/providers/search`

**Query Parameters:**
- `query` (required): Search query (name or specialty)
- `lat` (required): Latitude for search center
- `lng` (required): Longitude for search center
- `radius_miles` (optional, default=10): Search radius
- `policy_doc_id` (optional): Policy document ID for policy-aware scoring

**Response:**
```json
{
  "query": "Dermatologist",
  "center": { "lat": 40.4433, "lng": -79.9436 },
  "radius_miles": 10,
  "providers": [
    {
      "provider_id": "mock_001",
      "name": "UPMC Dermatology",
      "lat": 40.441,
      "lng": -79.95,
      "address": "Example St, Pittsburgh, PA",
      "phone": "+1-412-555-0101",
      "types": ["doctor", "health", "dermatology"],
      "distance_miles": 1.7,
      "network": {
        "status": "likely_in_network",
        "confidence": 0.75,
        "reasons": ["Provider appears affiliated with a major local health system"],
        "evidence": [
          { "doc_id": "policy_001", "chunk_id": "chunk_07", "label": "Network overview" }
        ]
      }
    }
  ],
  "cache": { "hit": false, "ttl_seconds": 86400 }
}
```

**Behavior:**
1. Check cache for non-expired entry
2. If cache miss:
   - Call `MockProviderSource.search()`
   - Normalize providers
   - Score each provider with `evaluate_in_network()`
   - Cache results
3. Sort by: `network.confidence DESC`, then `distance_miles ASC`
4. Return results with cache metadata

### `GET /v1/providers/{provider_id}`

**Response:** Single provider object (same shape as in search results)

**Behavior:**
1. Retrieve provider from `providers_cache`
2. Score network status
3. Return normalized provider with network scoring

## Policy-Aware Scoring

When `policy_doc_id` is provided:

1. **RAG Retrieval:**
   - Search policy chunks with queries: "in-network definition", "preferred provider network", "PPO network name", "out-of-network coverage"
   - Retrieve top 2-3 chunks

2. **Signal Extraction:**
   - Extract high-level signals (not raw text):
     - PPO-style network mentioned
     - No referrals required
     - Network name references

3. **Evidence:**
   - Store citations (doc_id, chunk_id, label) in response
   - Never log raw chunk text

## Database Schema

### `providers_cache` Table
```sql
CREATE TABLE providers_cache (
    id UUID PRIMARY KEY,
    npi VARCHAR(10) UNIQUE,
    name TEXT NOT NULL,
    specialty TEXT,
    address TEXT,
    city TEXT,
    state VARCHAR(2),
    zip VARCHAR(10),
    phone TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
);
```

**Future Enhancement:** Add `search_cache` table for search result caching:
```sql
CREATE TABLE search_cache (
    cache_key VARCHAR(64) PRIMARY KEY,
    user_id UUID,
    query TEXT,
    lat DECIMAL(10, 3),
    lng DECIMAL(10, 3),
    radius_miles INT,
    results JSONB,
    expires_at TIMESTAMPTZ
);
```

## Security & Privacy

- **Cache Keys:** Include `user_id` to prevent cross-user data leakage
- **Location Privacy:** Round lat/lng to 3 decimals (~100m precision)
- **Logging:** Never log addresses, names, or policy text
- **RLS:** Ensure `providers_cache` has RLS policies if storing user-specific data

## Future Enhancements

1. **Real Provider Sources:**
   - Google Places API integration
   - Insurer directory APIs
   - NPPES (National Plan and Provider Enumeration System)

2. **Advanced Scoring:**
   - Machine learning model for network prediction
   - Historical claim data analysis
   - Provider network directory lookups

3. **Caching:**
   - Redis for distributed caching
   - Dedicated `search_cache` table
   - Cache warming strategies

4. **Geospatial:**
   - PostGIS for efficient distance queries
   - Geohash-based indexing
   - Polygon-based network boundaries
