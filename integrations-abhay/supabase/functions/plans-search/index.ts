/**
 * CareMap Integrations — Plans Search Edge Function
 * ==================================================
 *
 * Searches for insurance plans by payer, name, and state.
 * Used to select a plan for network status overlay in provider search.
 *
 * USAGE EXAMPLES:
 *
 * # Search all plans (default limit 20)
 * curl -X POST https://<project>.supabase.co/functions/v1/plans-search \
 *   -H "Authorization: Bearer <JWT>" \
 *   -H "Content-Type: application/json" \
 *   -d '{}'
 *
 * # Search by text query (matches payer or plan_name)
 * curl -X POST https://<project>.supabase.co/functions/v1/plans-search \
 *   -H "Authorization: Bearer <JWT>" \
 *   -H "Content-Type: application/json" \
 *   -d '{"q": "UPMC"}'
 *
 * # Filter by payer
 * curl -X POST https://<project>.supabase.co/functions/v1/plans-search \
 *   -H "Authorization: Bearer <JWT>" \
 *   -H "Content-Type: application/json" \
 *   -d '{"payer": "Aetna"}'
 *
 * # Filter by state
 * curl -X POST https://<project>.supabase.co/functions/v1/plans-search \
 *   -H "Authorization: Bearer <JWT>" \
 *   -H "Content-Type: application/json" \
 *   -d '{"state": "PA", "limit": 10}'
 *
 * # Combined filters
 * curl -X POST https://<project>.supabase.co/functions/v1/plans-search \
 *   -H "Authorization: Bearer <JWT>" \
 *   -H "Content-Type: application/json" \
 *   -d '{"q": "PPO", "payer": "BCBS", "state": "PA", "limit": 5}'
 *
 * # DEV ONLY: Skip auth (requires DEV_BYPASS_AUTH=true env var)
 * curl -X POST http://localhost:54321/functions/v1/plans-search \
 *   -H "Content-Type: application/json" \
 *   -d '{}'
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import type {
  Plan,
  PlanSearchRequest,
  PlanSearchResponse,
} from "../../../shared/contracts.ts";

// Import mock data
import mockData from "./mock.json" with { type: "json" };

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

// DEV-ONLY auth bypass warning
const DEV_BYPASS_WARNING = "DEV_BYPASS_AUTH enabled — do not use in production.";

/**
 * Check if dev auth bypass is enabled.
 * DEFAULT IS SECURE: JWT required unless explicitly bypassed.
 */
function isDevBypassAuth(): boolean {
  const bypass = Deno.env.get("DEV_BYPASS_AUTH");
  return bypass === "true" || bypass === "1";
}

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
  return `req_plan_${crypto.randomUUID().slice(0, 8)}`;
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
 * Check if mock mode is enabled via environment variable.
 */
function isMockMode(): boolean {
  const mockMode = Deno.env.get("MOCK_MODE");
  return mockMode === "true" || mockMode === "1";
}

/**
 * Handle mock mode - return static mock data with optional filtering.
 */
function handleMockMode(req: PlanSearchRequest, devBypass: boolean): PlanSearchResponse {
  let plans = mockData.plans as Plan[];
  const limit = Math.min(req.limit ?? DEFAULT_LIMIT, MAX_LIMIT);

  // Apply text search filter
  if (req.q) {
    const qLower = req.q.toLowerCase();
    plans = plans.filter(
      (p) =>
        p.payer.toLowerCase().includes(qLower) ||
        p.plan_name.toLowerCase().includes(qLower)
    );
  }

  // Apply payer filter
  if (req.payer) {
    const payerLower = req.payer.toLowerCase();
    plans = plans.filter((p) => p.payer.toLowerCase().includes(payerLower));
  }

  // Apply state filter
  if (req.state) {
    const stateUpper = req.state.toUpperCase();
    plans = plans.filter((p) => p.state?.toUpperCase() === stateUpper);
  }

  // Apply limit
  const limited = plans.slice(0, limit);

  return {
    request_id: generateRequestId(),
    plans: limited,
    meta: {
      returned: limited.length,
      ts: new Date().toISOString(),
      ...(devBypass && { warning: DEV_BYPASS_WARNING }),
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

    if (!supabaseUrl || !supabaseAnonKey) {
      return errorResponse("Server configuration error", 500);
    }

    // Use anon key if dev bypass, otherwise use user JWT
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: devBypass ? {} : { Authorization: `Bearer ${jwt}` } },
    });

    // Verify the JWT is valid (unless dev bypass)
    if (!devBypass) {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser(jwt);

      if (authError || !user) {
        return errorResponse("Invalid or expired token", 401);
      }
    }

    // Parse request body
    let req: PlanSearchRequest = {};
    try {
      const body = await request.json();
      req = body as PlanSearchRequest;
    } catch {
      // Empty body is valid - use defaults
    }

    // Normalize limit
    const limit = Math.min(Math.max(req.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);

    // Check for mock mode
    if (isMockMode()) {
      return jsonResponse(handleMockMode({ ...req, limit }, devBypass));
    }

    // Query database
    let query = supabase.from("insurance_plans").select("*");

    // Apply text search (ilike on payer or plan_name)
    if (req.q) {
      const pattern = `%${req.q}%`;
      query = query.or(`payer.ilike.${pattern},plan_name.ilike.${pattern}`);
    }

    // Apply payer filter
    if (req.payer) {
      query = query.ilike("payer", `%${req.payer}%`);
    }

    // Apply state filter
    if (req.state) {
      query = query.eq("state", req.state.toUpperCase());
    }

    // Apply limit
    query = query.limit(limit);

    // Order by payer, then plan name
    query = query.order("payer").order("plan_name");

    const { data: rows, error } = await query;

    if (error) {
      console.error("Supabase query error:", error.message);
      return errorResponse("Database query failed", 500);
    }

    // Map to Plan objects
    const plans: Plan[] = (rows ?? []).map((row) => ({
      id: row.id,
      payer: row.payer,
      plan_name: row.plan_name,
      network: row.network,
      state: row.state,
    }));

    const response: PlanSearchResponse = {
      request_id: generateRequestId(),
      plans,
      meta: {
        returned: plans.length,
        ts: new Date().toISOString(),
        ...(devBypass && { warning: DEV_BYPASS_WARNING }),
      },
    };

    return jsonResponse(response);
  } catch (err) {
    console.error("Plans search error:", err instanceof Error ? err.message : "Unknown error");
    return errorResponse("Internal server error", 500);
  }
});
