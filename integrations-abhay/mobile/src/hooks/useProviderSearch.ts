/**
 * CareMap Mobile — useProviderSearch Hook
 * ========================================
 *
 * React hook for provider search with loading state, error handling, and debounce.
 */

import { useState, useCallback, useRef, useEffect } from "react";
import type {
  Provider,
  ProviderSearchRequest,
  ProviderSearchResponse,
} from "../types/contracts";
import { searchProviders, DEFAULT_SEARCH_PARAMS } from "../api/providers";

export interface UseProviderSearchOptions {
  /** Debounce delay in ms (default: 300) */
  debounceMs?: number;
  /** Auto-search on mount */
  autoSearch?: boolean;
  /** Initial search params */
  initialParams?: Partial<ProviderSearchRequest>;
}

export interface UseProviderSearchResult {
  /** Search results */
  providers: Provider[];
  /** Loading state */
  loading: boolean;
  /** Error message if any */
  error: string | null;
  /** Response metadata */
  meta: ProviderSearchResponse["meta"] | null;
  /** Trigger a search */
  search: (params: Partial<ProviderSearchRequest>) => void;
  /** Search with debounce */
  searchDebounced: (params: Partial<ProviderSearchRequest>) => void;
  /** Clear results */
  clear: () => void;
}

/**
 * Hook for searching providers with loading/error states and debounce.
 */
export function useProviderSearch(
  options: UseProviderSearchOptions = {}
): UseProviderSearchResult {
  const { debounceMs = 300, autoSearch = false, initialParams = {} } = options;

  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<ProviderSearchResponse["meta"] | null>(null);

  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const abortController = useRef<AbortController | null>(null);

  /**
   * Execute a provider search.
   */
  const search = useCallback(
    async (params: Partial<ProviderSearchRequest>) => {
      // Cancel any pending request
      if (abortController.current) {
        abortController.current.abort();
      }
      abortController.current = new AbortController();

      // Build full request with defaults
      const request: ProviderSearchRequest = {
        lat: params.lat ?? DEFAULT_SEARCH_PARAMS.lat ?? 40.4406,
        lng: params.lng ?? DEFAULT_SEARCH_PARAMS.lng ?? -79.9959,
        radius_miles:
          params.radius_miles ?? DEFAULT_SEARCH_PARAMS.radius_miles ?? 10,
        limit: params.limit ?? DEFAULT_SEARCH_PARAMS.limit ?? 20,
        source: params.source ?? "mock",
        q: params.q,
        types: params.types,
        specialty: params.specialty,
        plan_id: params.plan_id,
      };

      setLoading(true);
      setError(null);

      try {
        const response = await searchProviders(request);
        setProviders(response.providers);
        setMeta(response.meta);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          // Request was cancelled, ignore
          return;
        }
        const message = err instanceof Error ? err.message : "Search failed";
        setError(message);
        setProviders([]);
        setMeta(null);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Search with debounce (useful for text input).
   */
  const searchDebounced = useCallback(
    (params: Partial<ProviderSearchRequest>) => {
      // Clear existing timer
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }

      // Set new timer
      debounceTimer.current = setTimeout(() => {
        search(params);
      }, debounceMs);
    },
    [search, debounceMs]
  );

  /**
   * Clear results.
   */
  const clear = useCallback(() => {
    setProviders([]);
    setMeta(null);
    setError(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
      if (abortController.current) {
        abortController.current.abort();
      }
    };
  }, []);

  // Auto-search on mount
  useEffect(() => {
    if (autoSearch) {
      search(initialParams);
    }
  }, [autoSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    providers,
    loading,
    error,
    meta,
    search,
    searchDebounced,
    clear,
  };
}
