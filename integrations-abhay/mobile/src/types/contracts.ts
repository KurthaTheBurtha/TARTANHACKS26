/**
 * CareMap Mobile — Shared Contracts (TypeScript)
 * ===============================================
 *
 * This is the contract. Frontend & backend must not diverge.
 *
 * Hackathon note: network status is heuristic/seeded, not insurer-official.
 *
 * No user PII storage; use only auth user_id if needed.
 *
 * NOTE: This is a copy of integrations-abhay/shared/contracts.ts
 * for React Native compatibility. Keep in sync!
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
// API Error
// =============================================================================

export interface ApiError {
  error: string;
}
