/**
 * CareMap Mobile — Plans Search API
 * ==================================
 *
 * Client for the plans-search Edge Function.
 */

import { getFunctionsBaseUrl, ensureAuth } from "./supabase";
import type {
  PlanSearchRequest,
  PlanSearchResponse,
  ApiError,
} from "../types/contracts";

/**
 * Search for insurance plans via the Edge Function.
 *
 * @param request Search parameters (all optional)
 * @returns Plan search response
 * @throws Error on API failure
 */
export async function searchPlans(
  request: PlanSearchRequest = {}
): Promise<PlanSearchResponse> {
  const baseUrl = getFunctionsBaseUrl();
  const url = `${baseUrl}/plans-search`;

  // Get auth token
  const token = await ensureAuth();

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(request),
  });

  const data = await response.json();

  if (!response.ok) {
    const error = data as ApiError;
    throw new Error(error.error || `API error: ${response.status}`);
  }

  return data as PlanSearchResponse;
}

/**
 * Get all available plans (up to limit).
 */
export async function getAllPlans(limit = 50): Promise<PlanSearchResponse> {
  return searchPlans({ limit });
}

/**
 * Search plans by payer name.
 */
export async function searchPlansByPayer(
  payer: string,
  limit = 20
): Promise<PlanSearchResponse> {
  return searchPlans({ payer, limit });
}

/**
 * Search plans by state.
 */
export async function searchPlansByState(
  state: string,
  limit = 20
): Promise<PlanSearchResponse> {
  return searchPlans({ state, limit });
}
