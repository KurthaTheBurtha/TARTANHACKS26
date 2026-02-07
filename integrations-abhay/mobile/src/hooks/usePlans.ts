/**
 * CareMap Mobile — usePlans Hook
 * ===============================
 *
 * React hook for fetching and managing insurance plans.
 */

import { useState, useCallback, useEffect } from "react";
import type { Plan, PlanSearchResponse } from "../types/contracts";
import { searchPlans } from "../api/plans";

export interface UsePlansOptions {
  /** Auto-fetch on mount */
  autoFetch?: boolean;
  /** Initial state filter */
  state?: string;
  /** Max plans to fetch */
  limit?: number;
}

export interface UsePlansResult {
  /** Available plans */
  plans: Plan[];
  /** Currently selected plan */
  selectedPlan: Plan | null;
  /** Loading state */
  loading: boolean;
  /** Error message if any */
  error: string | null;
  /** Fetch/refresh plans */
  fetchPlans: (query?: string) => void;
  /** Select a plan by ID */
  selectPlan: (planId: string | null) => void;
  /** Clear selection */
  clearSelection: () => void;
}

/**
 * Hook for managing insurance plans.
 */
export function usePlans(options: UsePlansOptions = {}): UsePlansResult {
  const { autoFetch = true, state, limit = 50 } = options;

  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch plans from API.
   */
  const fetchPlans = useCallback(
    async (query?: string) => {
      setLoading(true);
      setError(null);

      try {
        const response = await searchPlans({
          q: query,
          state,
          limit,
        });
        setPlans(response.plans);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load plans";
        setError(message);
        setPlans([]);
      } finally {
        setLoading(false);
      }
    },
    [state, limit]
  );

  /**
   * Select a plan by ID.
   */
  const selectPlan = useCallback(
    (planId: string | null) => {
      if (!planId) {
        setSelectedPlan(null);
        return;
      }

      const plan = plans.find((p) => p.id === planId);
      setSelectedPlan(plan ?? null);
    },
    [plans]
  );

  /**
   * Clear plan selection.
   */
  const clearSelection = useCallback(() => {
    setSelectedPlan(null);
  }, []);

  // Auto-fetch on mount
  useEffect(() => {
    if (autoFetch) {
      fetchPlans();
    }
  }, [autoFetch]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    plans,
    selectedPlan,
    loading,
    error,
    fetchPlans,
    selectPlan,
    clearSelection,
  };
}
