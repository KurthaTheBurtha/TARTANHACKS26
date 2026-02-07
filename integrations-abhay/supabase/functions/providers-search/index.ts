/**
 * CareMap Integrations — Provider Search Edge Function
 * =====================================================
 *
 * Searches for healthcare providers by location, specialty, and text query.
 * Supports three data sources: mock, cache (Supabase), and places (Google Places API).
 *
 * USAGE EXAMPLES:
 *
 * # Mock mode (no external calls)
 * curl -X POST https://<project>.supabase.co/functions/v1/providers-search \
 *   -H "Authorization: Bearer <JWT>" \
 *   -H "Content-Type: application/json" \
 *   -d '{"lat": 40.4406, "lng": -79.9959, "radius_miles": 10, "limit": 10, "source": "mock"}'
 *
 * # Cache mode (query Supabase only)
 * curl -X POST https://<project>.supabase.co/functions/v1/providers-search \
 *   -H "Authorization: Bearer <JWT>" \
 *   -H "Content-Type: application/json" \
 *   -d '{"lat": 40.4406, "lng": -79.9959, "radius_miles": 10, "limit": 20, "source": "cache", "specialty": "cardiology"}'
 *
 * # Places mode (fetch from Google, cache, then return)
 * curl -X POST https://<project>.supabase.co/functions/v1/providers-search \
 *   -H "Authorization: Bearer <JWT>" \
 *   -H "Content-Type: application/json" \
 *   -d '{"q": "cardiologist", "lat": 40.4406, "lng": -79.9959, "radius_miles": 5, "limit": 10, "source": "places"}'
 *
 * # With plan_id for network status overlay
 * curl -X POST https://<project>.supabase.co/functions/v1/providers-search \
 *   -H "Authorization: Bearer <JWT>" \
 *   -H "Content-Type: application/json" \
 *   -d '{"lat": 40.4406, "lng": -79.9959, "radius_miles": 10, "limit": 20, "source": "cache", "plan_id": "33333333-3333-3333-3333-333333333333"}'
 *
 * # DEV ONLY: Skip auth (requires DEV_BYPASS_AUTH=true env var)
 * curl -X POST http://localhost:54321/functions/v1/providers-search \
 *   -H "Content-Type: application/json" \
 *   -d '{"lat": 40.4406, "lng": -79.9959, "radius_miles": 10, "limit": 10, "source": "mock"}'
 */

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import type {
  Provider,
  ProviderSearchRequest,
  ProviderSearchResponse,
  NetworkStatus,
} from "../../../shared/contracts.ts";
import { haversineMiles, boundingBox, milesToMeters } from "../_shared/geo.ts";
import { placesTextSearch, placesNearbySearch, PlaceResult, PlacesApiError } from "../_shared/places.ts";
import { normalizePlacesToProviders } from "../_shared/normalize.ts";

// Import mock data
import mockData from "./mock.json" with { type: "json" };

// =============================================================================
// Constants
// =============================================================================

const MAX_RADIUS_MILES = 50;
const MAX_LIMIT = 50;

// Cap for Google Places API calls: never fetch more than limit * 2
const PLACES_FETCH_MULTIPLIER = 2;

// Conversion: 1 mile = 1609.344 meters (verified)
// Using milesToMeters from geo.ts

// DEV-ONLY auth bypass warning
const DEV_BYPASS_WARNING = "DEV_BYPASS_AUTH enabled — do not use in production.";

/**
 * Default healthcare types for Places API queries when no types specified.
 * These are the closest supported types in Google Places API (New).
 * See: https://developers.google.com/maps/documentation/places/web-service/place-types
 */
const DEFAULT_HEALTHCARE_TYPES = [
  "hospital",       // Hospitals and medical centers
  "doctor",         // Doctor offices, clinics
  "dentist",        // Dental offices
  "physiotherapist", // Physical therapy
  "pharmacy",       // Pharmacies (optional, common healthcare need)
] as const;

/**
 * Check if dev auth bypass is enabled.
 * DEFAULT IS SECURE: JWT required unless explicitly bypassed.
 */
function isDevBypassAuth(): boolean {
  const bypass = Deno.env.get("DEV_BYPASS_AUTH");
  return bypass === "true" || bypass === "1";
}

// Demo plan IDs (from seed data)
const UPMC_PLAN_ID = "33333333-3333-3333-3333-333333333333";
const AETNA_PLAN_ID = "22222222-2222-2222-2222-222222222222";
const BCBS_PLAN_ID = "11111111-1111-1111-1111-111111111111";

// =============================================================================
// CORS Headers
// =============================================================================

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// =============================================================================
// Helper Functions
// =============================================================================

function generateRequestId(): string {
  return `req_${crypto.randomUUID().slice(0, 12)}`;
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(message: string, status: number): Response {
  return jsonResponse({ error: message }, status);
}

/**
 * Validate the search request parameters.
 */
function validateRequest(req: ProviderSearchRequest): string | null {
  if (typeof req.lat !== "number" || typeof req.lng !== "number") {
    return "lat and lng are required numbers";
  }
  if (typeof req.radius_miles !== "number" || req.radius_miles <= 0) {
    return "radius_miles must be a positive number";
  }
  if (req.radius_miles > MAX_RADIUS_MILES) {
    return `radius_miles must be <= ${MAX_RADIUS_MILES}`;
  }
  if (typeof req.limit !== "number" || req.limit <= 0) {
    return "limit must be a positive number";
  }
  if (req.limit > MAX_LIMIT) {
    return `limit must be <= ${MAX_LIMIT}`;
  }
  if (!["mock", "cache", "places"].includes(req.source)) {
    return "source must be 'mock', 'cache', or 'places'";
  }
  return null;
}

/**
 * Payer network names for heuristic matching.
 */
const PAYER_NETWORKS: Record<string, string> = {
  upmc: "UPMC Health Plan",
  ahn: "Allegheny Health Network",
  allegheny: "Allegheny Health Network",
  medexpress: "MedExpress Urgent Care",
  convenientcare: "ConvenientCare",
};

/**
 * Apply heuristic network status based on provider name.
 * Used when no seeded mapping exists.
 *
 * Priority:
 * 1. Seeded mapping (handled in applyNetworkOverlay) → source="seed"
 * 2. Heuristic mapping (this function) → source="heuristic"
 * 3. Unknown → source="unknown", no network_name
 */
function applyHeuristicNetworkStatus(
  providerName: string,
  planId: string,
  planName?: string
): NetworkStatus {
  const nameLower = providerName.toLowerCase();

  // UPMC providers
  if (nameLower.includes("upmc")) {
    if (planId === UPMC_PLAN_ID) {
      return {
        in_network: true,
        network_name: PAYER_NETWORKS.upmc,
        confidence: 0.9,
        source: "heuristic",
      };
    }
    // Out of network for other plans, but we know the provider network
    return {
      in_network: false,
      network_name: PAYER_NETWORKS.upmc,
      confidence: 0.75,
      source: "heuristic",
    };
  }

  // AHN / Allegheny providers
  if (nameLower.includes("ahn") || nameLower.includes("allegheny")) {
    if (planId === AETNA_PLAN_ID) {
      return {
        in_network: true,
        network_name: PAYER_NETWORKS.ahn,
        confidence: 0.85,
        source: "heuristic",
      };
    }
    // Out of network for other plans, but we know the provider network
    return {
      in_network: false,
      network_name: PAYER_NETWORKS.ahn,
      confidence: 0.70,
      source: "heuristic",
    };
  }

  // Urgent care chains - typically in-network for most plans
  if (nameLower.includes("medexpress")) {
    return {
      in_network: true,
      network_name: PAYER_NETWORKS.medexpress,
      confidence: 0.6,
      source: "heuristic",
    };
  }

  if (nameLower.includes("convenientcare") || nameLower.includes("convenient care")) {
    return {
      in_network: true,
      network_name: PAYER_NETWORKS.convenientcare,
      confidence: 0.6,
      source: "heuristic",
    };
  }

  // Generic urgent care - in-network but unknown specific network
  if (nameLower.includes("urgent care")) {
    return {
      in_network: true,
      confidence: 0.5,
      source: "heuristic",
    };
  }

  // Unknown - no network_name, low confidence
  return {
    in_network: false,
    confidence: 0.3,
    source: "unknown",
  };
}

/**
 * Query providers from Supabase cache with filters.
 */
async function queryProvidersFromCache(
  supabase: SupabaseClient,
  req: ProviderSearchRequest
): Promise<{ providers: Provider[]; total: number }> {
  const bbox = boundingBox(req.lat, req.lng, req.radius_miles);

  // Build query
  let query = supabase
    .from("providers")
    .select("*")
    .gte("lat", bbox.minLat)
    .lte("lat", bbox.maxLat)
    .gte("lng", bbox.minLng)
    .lte("lng", bbox.maxLng);

  // Apply types filter (array overlap)
  if (req.types && req.types.length > 0) {
    query = query.overlaps("types", req.types);
  }

  // Apply specialty filter (array contains)
  if (req.specialty) {
    query = query.contains("specialties", [req.specialty]);
  }

  const { data: rows, error } = await query;

  if (error) {
    console.error("Supabase query error:", error.message);
    throw new Error("Database query failed");
  }

  if (!rows || rows.length === 0) {
    return { providers: [], total: 0 };
  }

  // Calculate distances and filter by actual radius
  const providersWithDistance: Provider[] = [];

  for (const row of rows) {
    const distance = haversineMiles(req.lat, req.lng, row.lat, row.lng);
    if (distance <= req.radius_miles) {
      providersWithDistance.push({
        id: row.id,
        place_id: row.place_id,
        name: row.name,
        types: row.types,
        specialties: row.specialties,
        address: row.address,
        geo: { lat: row.lat, lng: row.lng },
        phone: row.phone,
        website: row.website,
        distance_miles: Math.round(distance * 100) / 100,
      });
    }
  }

  // Sort by distance
  providersWithDistance.sort((a, b) => (a.distance_miles ?? 0) - (b.distance_miles ?? 0));

  const total = providersWithDistance.length;

  // Apply limit
  const limited = providersWithDistance.slice(0, req.limit);

  return { providers: limited, total };
}

/**
 * Apply network status overlay to providers.
 *
 * Priority:
 * 1. Seeded mapping from provider_networks table → source="seed", network_name from plan
 * 2. Heuristic mapping based on provider name → source="heuristic", network_name if known
 * 3. Unknown → source="unknown", no network_name
 */
async function applyNetworkOverlay(
  supabase: SupabaseClient,
  providers: Provider[],
  planId: string
): Promise<Provider[]> {
  if (providers.length === 0) return providers;

  const providerIds = providers.map((p) => p.id);

  // Fetch the plan details to get plan_name for network_name
  const { data: planData } = await supabase
    .from("insurance_plans")
    .select("id, payer, plan_name, network")
    .eq("id", planId)
    .single();

  const planName = planData?.plan_name ?? undefined;
  const planNetwork = planData?.network ?? planData?.payer ?? undefined;

  // Query seeded network mappings with join to get network info
  const { data: networkRows } = await supabase
    .from("provider_networks")
    .select("provider_id, in_network, confidence, source")
    .eq("plan_id", planId)
    .in("provider_id", providerIds);

  // Build lookup map for seeded mappings
  const networkMap = new Map<string, NetworkStatus>();
  if (networkRows) {
    for (const row of networkRows) {
      const status: NetworkStatus = {
        in_network: row.in_network,
        confidence: parseFloat(row.confidence),
        source: row.source as "seed" | "heuristic" | "unknown",
      };

      // Add network_name for seeded in-network providers
      // Use plan_name or network type from the plan
      if (row.in_network && planName) {
        status.network_name = planName;
      } else if (row.in_network && planNetwork) {
        status.network_name = planNetwork;
      }

      networkMap.set(row.provider_id, status);
    }
  }

  // Apply network status to each provider
  return providers.map((provider) => {
    // Priority 1: Seeded mapping
    const seeded = networkMap.get(provider.id);
    if (seeded) {
      return { ...provider, network_status: seeded };
    }

    // Priority 2 & 3: Heuristic or Unknown
    const heuristic = applyHeuristicNetworkStatus(provider.name, planId, planName);
    return { ...provider, network_status: heuristic };
  });
}

/**
 * Result from Places API fetch attempt.
 */
interface PlacesFetchResult {
  success: boolean;
  places: PlaceResult[];
  error?: string;
}

/**
 * Attempt to fetch from Google Places API.
 * Returns success/failure with error message (safe, no sensitive data).
 *
 * Type filtering:
 * - If request.types is provided and non-empty, use those types.
 * - Otherwise, use DEFAULT_HEALTHCARE_TYPES to limit results to healthcare providers.
 * - Types are applied in both text search (q present) and nearby search modes.
 */
async function tryFetchFromPlaces(
  req: ProviderSearchRequest
): Promise<PlacesFetchResult> {
  const apiKey = Deno.env.get("GOOGLE_MAPS_API_KEY");
  if (!apiKey) {
    return { success: false, places: [], error: "GOOGLE_MAPS_API_KEY not configured" };
  }

  const baseUrl = Deno.env.get("GOOGLE_PLACES_API_BASE") || "https://places.googleapis.com";
  
  // Convert radius_miles to meters correctly (1 mile = 1609.344 meters)
  const radiusMeters = milesToMeters(req.radius_miles);

  // Cap the fetch limit to avoid excessive API calls (limit * 2, max 20 per API call)
  const fetchLimit = Math.min(req.limit * PLACES_FETCH_MULTIPLIER, 20);

  // Use provided types or default to healthcare types
  // This ensures we don't return non-healthcare places (restaurants, gas stations, etc.)
  const effectiveTypes: string[] =
    req.types && req.types.length > 0
      ? req.types
      : [...DEFAULT_HEALTHCARE_TYPES];

  try {
    let places: PlaceResult[];

    // Use text search if query provided, otherwise nearby search
    // Both modes apply type filtering for consistent results
    if (req.q) {
      places = await placesTextSearch({
        q: req.q,
        lat: req.lat,
        lng: req.lng,
        radiusMeters,
        types: effectiveTypes,
        limit: fetchLimit,
        apiKey,
        baseUrl,
      });
    } else {
      places = await placesNearbySearch({
        lat: req.lat,
        lng: req.lng,
        radiusMeters,
        types: effectiveTypes,
        limit: fetchLimit,
        apiKey,
        baseUrl,
      });
    }

    // Cap results at limit * 2 before any further processing
    const cappedPlaces = places.slice(0, req.limit * PLACES_FETCH_MULTIPLIER);

    return { success: true, places: cappedPlaces };
  } catch (err) {
    // Extract safe error message (no API keys, no large dumps)
    let errorMsg = "Places API request failed";
    if (err instanceof PlacesApiError) {
      errorMsg = `Places API error (${err.status})`;
    } else if (err instanceof Error) {
      // Only include message if it's short and safe
      const msg = err.message;
      if (msg.length < 100 && !msg.includes("key") && !msg.includes("Key")) {
        errorMsg = msg;
      }
    }
    return { success: false, places: [], error: errorMsg };
  }
}

/**
 * Upsert places to cache.
 */
async function upsertPlacesToCache(
  supabaseServiceRole: SupabaseClient,
  places: PlaceResult[]
): Promise<void> {
  const normalized = normalizePlacesToProviders(places);

  // Upsert to cache using service role (bypasses RLS)
  // NOTE: We use service role key here because RLS blocks client inserts.
  // In production, consider a separate ingestion service.
  for (const provider of normalized) {
    const upsertData = {
      place_id: provider.place_id,
      name: provider.name,
      types: provider.types,
      specialties: provider.specialties,
      address: provider.address,
      lat: provider.geo.lat,
      lng: provider.geo.lng,
      phone: provider.phone,
      website: provider.website,
      last_fetched_at: new Date().toISOString(),
    };

    if (provider.place_id) {
      // Upsert by place_id
      await supabaseServiceRole
        .from("providers")
        .upsert(upsertData, { onConflict: "place_id" });
    } else {
      // Check for existing by name + location
      const { data: existing } = await supabaseServiceRole
        .from("providers")
        .select("id")
        .eq("name", provider.name)
        .gte("lat", provider.geo.lat - 0.0001)
        .lte("lat", provider.geo.lat + 0.0001)
        .gte("lng", provider.geo.lng - 0.0001)
        .lte("lng", provider.geo.lng + 0.0001)
        .limit(1);

      if (existing && existing.length > 0) {
        await supabaseServiceRole
          .from("providers")
          .update(upsertData)
          .eq("id", existing[0].id);
      } else {
        await supabaseServiceRole.from("providers").insert(upsertData);
      }
    }
  }
}

/**
 * Handle mock mode - return static mock data.
 */
function handleMockMode(req: ProviderSearchRequest): ProviderSearchResponse {
  const mockProviders = mockData.providers as Provider[];

  // Calculate distances for mock data
  const withDistances = mockProviders.map((p) => ({
    ...p,
    distance_miles: haversineMiles(req.lat, req.lng, p.geo.lat, p.geo.lng),
  }));

  // Sort by distance and limit
  withDistances.sort((a, b) => a.distance_miles - b.distance_miles);
  const limited = withDistances.slice(0, req.limit);

  return {
    request_id: generateRequestId(),
    providers: limited,
    meta: {
      total: mockProviders.length,
      returned: limited.length,
      ts: new Date().toISOString(),
      source_used: "mock",
    },
  };
}

// =============================================================================
// Main Handler
// =============================================================================

Deno.serve(async (request: Request) => {
  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // Only allow POST
  if (request.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  try {
    // Check for dev bypass mode
    const devBypass = isDevBypassAuth();

    // Verify JWT auth (unless dev bypass is enabled)
    const authHeader = request.headers.get("Authorization");
    if (!devBypass) {
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return errorResponse("Missing or invalid Authorization header", 401);
      }
    }

    const jwt = authHeader?.replace("Bearer ", "") ?? "";

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseAnonKey) {
      return errorResponse("Server configuration error", 500);
    }

    // Use anon key if dev bypass, otherwise use user JWT
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: devBypass ? {} : { Authorization: `Bearer ${jwt}` } },
    });

    // Verify the JWT is valid (unless dev bypass)
    if (!devBypass) {
      const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);
      if (authError || !user) {
        return errorResponse("Invalid or expired token", 401);
      }
    }

    // Parse request body (do not log it)
    const body = await request.json();
    const req = body as ProviderSearchRequest;

    // Validate request
    const validationError = validateRequest(req);
    if (validationError) {
      return errorResponse(validationError, 400);
    }

    // Handle based on source
    let response: ProviderSearchResponse;

    if (req.source === "mock") {
      response = handleMockMode(req);
      // Add dev bypass warning if applicable
      if (devBypass) {
        (response.meta as Record<string, unknown>).warning = DEV_BYPASS_WARNING;
      }
    } else if (req.source === "cache") {
      const { providers, total } = await queryProvidersFromCache(supabase, req);

      // Apply network overlay if plan_id provided
      let finalProviders = providers;
      if (req.plan_id) {
        finalProviders = await applyNetworkOverlay(supabase, providers, req.plan_id);
      }

      response = {
        request_id: generateRequestId(),
        providers: finalProviders,
        meta: {
          total,
          returned: finalProviders.length,
          ts: new Date().toISOString(),
          source_used: "cache",
          ...(devBypass && { warning: DEV_BYPASS_WARNING }),
        },
      };
    } else if (req.source === "places") {
      // Need service role for cache writes
      if (!supabaseServiceRoleKey) {
        return errorResponse("Places mode requires service role configuration", 500);
      }

      const supabaseServiceRole = createClient(supabaseUrl, supabaseServiceRoleKey);

      // Attempt to fetch from Places API
      const placesResult = await tryFetchFromPlaces(req);

      let sourceUsed = "places";
      let placesWarning: string | undefined;

      if (placesResult.success && placesResult.places.length > 0) {
        // Places API succeeded - upsert to cache
        await upsertPlacesToCache(supabaseServiceRole, placesResult.places);
      } else if (!placesResult.success) {
        // Places API failed - will fallback to cache
        placesWarning = `Places API failed: ${placesResult.error}. Falling back to cache.`;
        sourceUsed = "cache (fallback)";
        console.error("Places API error, falling back to cache:", placesResult.error);
      }

      // Query from cache (either after Places upsert or as fallback)
      const { providers, total } = await queryProvidersFromCache(supabase, req);

      // If both Places failed AND cache is empty, return 502
      if (!placesResult.success && providers.length === 0) {
        return jsonResponse(
          {
            error: "No providers found. Places API unavailable and cache is empty.",
            places_error: placesResult.error,
          },
          502
        );
      }

      // Apply network overlay if plan_id provided
      let finalProviders = providers;
      if (req.plan_id) {
        finalProviders = await applyNetworkOverlay(supabase, providers, req.plan_id);
      }

      // Build warnings array
      const warnings: string[] = [];
      if (devBypass) warnings.push(DEV_BYPASS_WARNING);
      if (placesWarning) warnings.push(placesWarning);

      response = {
        request_id: generateRequestId(),
        providers: finalProviders,
        meta: {
          total,
          returned: finalProviders.length,
          ts: new Date().toISOString(),
          source_used: sourceUsed,
          ...(warnings.length === 1 && { warning: warnings[0] }),
          ...(warnings.length > 1 && { warnings }),
        },
      };
    } else {
      return errorResponse("Invalid source", 400);
    }

    return jsonResponse(response);
  } catch (err) {
    console.error("Provider search error:", err instanceof Error ? err.message : "Unknown error");
    return errorResponse("Internal server error", 500);
  }
});
