/**
 * CareMap Integrations — Shared Contracts (TypeScript)
 * =====================================================
 *
 * This is the contract. Frontend & backend must not diverge.
 *
 * Hackathon note: network status is heuristic/seeded, not insurer-official.
 *
 * No user PII storage; use only auth user_id if needed.
 */

// =============================================================================
// Core Types
// =============================================================================

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface Address {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  zip?: string;
}

export interface NetworkStatus {
  in_network: boolean;
  network_name?: string;
  /** Confidence score 0.0 - 1.0 */
  confidence: number;
  /** Source of network determination */
  source: "seed" | "heuristic" | "unknown";
}

// =============================================================================
// Provider Types
// =============================================================================

export interface Provider {
  /** UUID string */
  id: string;
  /** Google Places ID (if sourced from Places API) */
  place_id?: string;
  name: string;
  /** Google Places types (e.g., "hospital", "doctor") */
  types?: string[];
  /** Medical specialties (e.g., "cardiology", "pediatrics") */
  specialties?: string[];
  address: Address;
  geo: GeoPoint;
  phone?: string;
  website?: string;
  network_status?: NetworkStatus;
  /** Distance from search origin in miles */
  distance_miles?: number;
}

// =============================================================================
// Plan Types
// =============================================================================

export interface Plan {
  id: string;
  payer: string;
  plan_name: string;
  network?: string;
  state?: string;
}

// =============================================================================
// Provider Search
// =============================================================================

export interface ProviderSearchRequest {
  /** Free-text search query */
  q?: string;
  /** Filter by Google Places types */
  types?: string[];
  /** Filter by medical specialty */
  specialty?: string;
  /** Latitude of search origin */
  lat: number;
  /** Longitude of search origin */
  lng: number;
  /** Search radius in miles */
  radius_miles: number;
  /** Max results to return */
  limit: number;
  /** Optional plan ID to check network status */
  plan_id?: string;
  /** Data source preference */
  source: "cache" | "places" | "mock";
}

export interface ProviderSearchResponseMeta {
  total: number;
  returned: number;
  /** ISO 8601 timestamp */
  ts: string;
  source_used: string;
}

export interface ProviderSearchResponse {
  request_id: string;
  providers: Provider[];
  meta: ProviderSearchResponseMeta;
}

// =============================================================================
// Plan Search
// =============================================================================

export interface PlanSearchRequest {
  /** Free-text search query */
  q?: string;
  /** Filter by payer/insurer name */
  payer?: string;
  /** Filter by state */
  state?: string;
  /** Max results to return */
  limit?: number;
}

export interface PlanSearchResponseMeta {
  returned: number;
  /** ISO 8601 timestamp */
  ts: string;
}

export interface PlanSearchResponse {
  request_id: string;
  plans: Plan[];
  meta: PlanSearchResponseMeta;
}

// =============================================================================
// Example JSON
// =============================================================================

/**
 * Example ProviderSearchRequest:
 * ```json
 * {
 *   "q": "cardiologist",
 *   "types": ["doctor"],
 *   "specialty": "cardiology",
 *   "lat": 40.4406,
 *   "lng": -79.9959,
 *   "radius_miles": 10,
 *   "limit": 20,
 *   "plan_id": "plan_upmc_advantage_gold",
 *   "source": "cache"
 * }
 * ```
 */
export const EXAMPLE_PROVIDER_SEARCH_REQUEST: ProviderSearchRequest = {
  q: "cardiologist",
  types: ["doctor"],
  specialty: "cardiology",
  lat: 40.4406,
  lng: -79.9959,
  radius_miles: 10,
  limit: 20,
  plan_id: "plan_upmc_advantage_gold",
  source: "cache",
};

/**
 * Example ProviderSearchResponse:
 * ```json
 * {
 *   "request_id": "req_abc123",
 *   "providers": [
 *     {
 *       "id": "550e8400-e29b-41d4-a716-446655440000",
 *       "place_id": "ChIJ1234567890",
 *       "name": "UPMC Heart & Vascular Institute",
 *       "types": ["hospital", "doctor"],
 *       "specialties": ["cardiology", "cardiovascular surgery"],
 *       "address": {
 *         "line1": "200 Lothrop St",
 *         "city": "Pittsburgh",
 *         "state": "PA",
 *         "zip": "15213"
 *       },
 *       "geo": { "lat": 40.4416, "lng": -79.9569 },
 *       "phone": "+1-412-647-2345",
 *       "website": "https://www.upmc.com/heart",
 *       "network_status": {
 *         "in_network": true,
 *         "network_name": "UPMC Health Plan",
 *         "confidence": 0.95,
 *         "source": "seed"
 *       },
 *       "distance_miles": 2.3
 *     }
 *   ],
 *   "meta": {
 *     "total": 15,
 *     "returned": 1,
 *     "ts": "2026-02-06T22:00:00.000Z",
 *     "source_used": "cache"
 *   }
 * }
 * ```
 */
export const EXAMPLE_PROVIDER_SEARCH_RESPONSE: ProviderSearchResponse = {
  request_id: "req_abc123",
  providers: [
    {
      id: "550e8400-e29b-41d4-a716-446655440000",
      place_id: "ChIJ1234567890",
      name: "UPMC Heart & Vascular Institute",
      types: ["hospital", "doctor"],
      specialties: ["cardiology", "cardiovascular surgery"],
      address: {
        line1: "200 Lothrop St",
        city: "Pittsburgh",
        state: "PA",
        zip: "15213",
      },
      geo: { lat: 40.4416, lng: -79.9569 },
      phone: "+1-412-647-2345",
      website: "https://www.upmc.com/heart",
      network_status: {
        in_network: true,
        network_name: "UPMC Health Plan",
        confidence: 0.95,
        source: "seed",
      },
      distance_miles: 2.3,
    },
  ],
  meta: {
    total: 15,
    returned: 1,
    ts: "2026-02-06T22:00:00.000Z",
    source_used: "cache",
  },
};

/**
 * Example PlanSearchRequest:
 * ```json
 * {
 *   "q": "advantage",
 *   "payer": "UPMC",
 *   "state": "PA",
 *   "limit": 10
 * }
 * ```
 */
export const EXAMPLE_PLAN_SEARCH_REQUEST: PlanSearchRequest = {
  q: "advantage",
  payer: "UPMC",
  state: "PA",
  limit: 10,
};

/**
 * Example PlanSearchResponse:
 * ```json
 * {
 *   "request_id": "req_plan_xyz789",
 *   "plans": [
 *     {
 *       "id": "plan_upmc_advantage_gold",
 *       "payer": "UPMC Health Plan",
 *       "plan_name": "UPMC Advantage Gold HMO",
 *       "network": "UPMC Premium",
 *       "state": "PA"
 *     }
 *   ],
 *   "meta": {
 *     "returned": 1,
 *     "ts": "2026-02-06T22:00:00.000Z"
 *   }
 * }
 * ```
 */
export const EXAMPLE_PLAN_SEARCH_RESPONSE: PlanSearchResponse = {
  request_id: "req_plan_xyz789",
  plans: [
    {
      id: "plan_upmc_advantage_gold",
      payer: "UPMC Health Plan",
      plan_name: "UPMC Advantage Gold HMO",
      network: "UPMC Premium",
      state: "PA",
    },
  ],
  meta: {
    returned: 1,
    ts: "2026-02-06T22:00:00.000Z",
  },
};
