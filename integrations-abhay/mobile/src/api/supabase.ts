/**
 * CareMap Mobile — Supabase Client
 * =================================
 *
 * Initializes the Supabase client for auth and database access.
 *
 * Environment variables (via Expo):
 * - EXPO_PUBLIC_SUPABASE_URL
 * - EXPO_PUBLIC_SUPABASE_ANON_KEY
 * - EXPO_PUBLIC_SUPABASE_FUNCTIONS_BASE_URL (optional, defaults to {url}/functions/v1)
 */

import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Get environment variables
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "Supabase credentials not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY."
  );
}

/**
 * Supabase client instance.
 * Uses AsyncStorage for session persistence on mobile.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Use a simple in-memory storage for demo (AsyncStorage requires extra setup)
    storage: {
      getItem: (key: string) => {
        // For demo, return null (no persistence)
        return Promise.resolve(null);
      },
      setItem: (key: string, value: string) => {
        return Promise.resolve();
      },
      removeItem: (key: string) => {
        return Promise.resolve();
      },
    },
    autoRefreshToken: true,
    persistSession: false, // Disable for demo simplicity
    detectSessionInUrl: false,
  },
});

/**
 * Get the Edge Functions base URL.
 * Can be overridden via EXPO_PUBLIC_SUPABASE_FUNCTIONS_BASE_URL.
 */
export function getFunctionsBaseUrl(): string {
  const override = process.env.EXPO_PUBLIC_SUPABASE_FUNCTIONS_BASE_URL;
  if (override) {
    return override.replace(/\/$/, ""); // Remove trailing slash
  }
  return `${supabaseUrl}/functions/v1`;
}

/**
 * Get the current session access token.
 * Returns null if not authenticated.
 */
export async function getAccessToken(): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

/**
 * Sign in anonymously for demo purposes.
 * In production, use proper auth flow.
 */
export async function signInAnonymously(): Promise<string | null> {
  // For demo: use anon key directly as bearer token
  // This works because our RLS allows anon reads
  // In production, implement proper auth
  return supabaseAnonKey;
}

/**
 * Check if we have a valid session or can use anon access.
 */
export async function ensureAuth(): Promise<string> {
  // Try to get existing session
  const token = await getAccessToken();
  if (token) {
    return token;
  }

  // For demo, use anon key
  const anonToken = await signInAnonymously();
  if (anonToken) {
    return anonToken;
  }

  throw new Error("Unable to authenticate");
}
