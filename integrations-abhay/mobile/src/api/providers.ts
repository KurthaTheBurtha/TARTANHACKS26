/**
 * CareMap Mobile — Provider Search API
 * =====================================
 *
 * Client for the providers-search Edge Function.
 */

import { getFunctionsBaseUrl, ensureAuth } from "./supabase";
import type {
  ProviderSearchRequest,
  ProviderSearchResponse,
  ApiError,
} from "../types/contracts";

/**
 * Search for providers via the Edge Function.
 *
 * @param request Search parameters
 * @returns Provider search response
 * @throws Error on API failure
 */
export async function searchProviders(
  request: ProviderSearchRequest
): Promise<ProviderSearchResponse> {
  const baseUrl = getFunctionsBaseUrl();
  const url = `${baseUrl}/providers-search`;

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

  return data as ProviderSearchResponse;
}

/**
 * Search providers using cache source.
 */
export async function searchProvidersCache(
  params: Omit<ProviderSearchRequest, "source">
): Promise<ProviderSearchResponse> {
  return searchProviders({ ...params, source: "cache" });
}

/**
 * Search providers using Google Places API.
 */
export async function searchProvidersPlaces(
  params: Omit<ProviderSearchRequest, "source">
): Promise<ProviderSearchResponse> {
  return searchProviders({ ...params, source: "places" });
}

/**
 * Search providers using mock data.
 */
export async function searchProvidersMock(
  params: Omit<ProviderSearchRequest, "source">
): Promise<ProviderSearchResponse> {
  return searchProviders({ ...params, source: "mock" });
}

/**
 * Default search parameters for Pittsburgh area.
 */
export const DEFAULT_SEARCH_PARAMS: Partial<ProviderSearchRequest> = {
  lat: 40.4406,
  lng: -79.9959,
  radius_miles: 10,
  limit: 20,
};
