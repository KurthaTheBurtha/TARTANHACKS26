/**
 * CareMap Integrations — Google Places API (New) Client
 * ======================================================
 * Fetch-based client for the new Places API.
 * https://developers.google.com/maps/documentation/places/web-service/op-overview
 */

const DEFAULT_BASE_URL = "https://places.googleapis.com";

/**
 * Minimal field mask for provider search.
 * Keeps response size small and avoids unnecessary billing.
 */
const DEFAULT_FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.location",
  "places.types",
  "places.nationalPhoneNumber",
  "places.websiteUri",
].join(",");

/**
 * Places API error with status code.
 */
export class PlacesApiError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(`Places API error (${status}): ${message}`);
    this.name = "PlacesApiError";
  }
}

/**
 * Options for text search.
 */
export interface PlacesTextSearchOptions {
  /** Search query (e.g., "cardiologist near Pittsburgh") */
  q: string;
  /** Center latitude for location bias */
  lat: number;
  /** Center longitude for location bias */
  lng: number;
  /** Search radius in meters */
  radiusMeters: number;
  /** Filter by place types (e.g., ["hospital", "doctor"]) */
  types?: string[];
  /** Max results to return */
  limit?: number;
  /** Google Maps API key */
  apiKey: string;
  /** Base URL (default: https://places.googleapis.com) */
  baseUrl?: string;
}

/**
 * Options for nearby search.
 */
export interface PlacesNearbySearchOptions {
  /** Center latitude */
  lat: number;
  /** Center longitude */
  lng: number;
  /** Search radius in meters */
  radiusMeters: number;
  /** Filter by place types (e.g., ["hospital", "doctor"]) */
  types?: string[];
  /** Max results to return */
  limit?: number;
  /** Google Maps API key */
  apiKey: string;
  /** Base URL (default: https://places.googleapis.com) */
  baseUrl?: string;
}

/**
 * Raw place result from Places API.
 * This is a partial type; actual response has more fields.
 */
export interface PlaceResult {
  id: string;
  displayName?: {
    text: string;
    languageCode?: string;
  };
  formattedAddress?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  types?: string[];
  nationalPhoneNumber?: string;
  websiteUri?: string;
}

/**
 * Search for places using text query with location bias.
 * Uses POST /v1/places:searchText
 */
export async function placesTextSearch(
  options: PlacesTextSearchOptions
): Promise<PlaceResult[]> {
  const {
    q,
    lat,
    lng,
    radiusMeters,
    types,
    limit = 20,
    apiKey,
    baseUrl = DEFAULT_BASE_URL,
  } = options;

  const url = `${baseUrl}/v1/places:searchText`;

  // Build request body
  const body: Record<string, unknown> = {
    textQuery: q,
    locationBias: {
      circle: {
        center: {
          latitude: lat,
          longitude: lng,
        },
        radius: radiusMeters,
      },
    },
    maxResultCount: Math.min(limit, 20), // API max is 20
  };

  // Add type filter if specified (only first type supported in text search)
  if (types && types.length > 0) {
    body.includedType = types[0];
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": DEFAULT_FIELD_MASK,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    // Don't log full response body (may contain sensitive info)
    const statusText = response.statusText || "Unknown error";
    throw new PlacesApiError(response.status, statusText);
  }

  const data = await response.json();
  return (data.places as PlaceResult[]) || [];
}

/**
 * Search for places nearby a location.
 * Uses POST /v1/places:searchNearby
 */
export async function placesNearbySearch(
  options: PlacesNearbySearchOptions
): Promise<PlaceResult[]> {
  const {
    lat,
    lng,
    radiusMeters,
    types,
    limit = 20,
    apiKey,
    baseUrl = DEFAULT_BASE_URL,
  } = options;

  const url = `${baseUrl}/v1/places:searchNearby`;

  // Build request body
  const body: Record<string, unknown> = {
    locationRestriction: {
      circle: {
        center: {
          latitude: lat,
          longitude: lng,
        },
        radius: radiusMeters,
      },
    },
    maxResultCount: Math.min(limit, 20), // API max is 20
  };

  // Add type filters if specified
  if (types && types.length > 0) {
    body.includedTypes = types;
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": DEFAULT_FIELD_MASK,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    // Don't log full response body (may contain sensitive info)
    const statusText = response.statusText || "Unknown error";
    throw new PlacesApiError(response.status, statusText);
  }

  const data = await response.json();
  return (data.places as PlaceResult[]) || [];
}

/**
 * Healthcare-related place types for filtering.
 * https://developers.google.com/maps/documentation/places/web-service/place-types
 */
export const HEALTHCARE_TYPES = [
  "hospital",
  "doctor",
  "dentist",
  "pharmacy",
  "physiotherapist",
  "health",
] as const;

/**
 * Check if a type is healthcare-related.
 */
export function isHealthcareType(type: string): boolean {
  return HEALTHCARE_TYPES.includes(type as (typeof HEALTHCARE_TYPES)[number]);
}
