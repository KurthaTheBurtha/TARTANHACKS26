/**
 * CareMap Mobile — Supabase Client
 * =================================
 *
 * Environment: .env in mobile/ (loaded via app.config.js) or EXPO_PUBLIC_* at build time.
 * Only EXPO_PUBLIC_* vars are used; never log or expose secrets.
 */

import { createClient } from "@supabase/supabase-js";
import Constants from "expo-constants";

const extra = Constants.expoConfig?.extra ?? {};
const supabaseUrl =
  (extra.supabaseUrl as string | undefined) ??
  process.env.EXPO_PUBLIC_SUPABASE_URL ??
  "";
const supabaseAnonKey =
  (extra.supabaseAnonKey as string | undefined) ??
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  "";

if (!supabaseUrl?.trim() || !supabaseAnonKey?.trim()) {
  console.warn(
    "Supabase not configured. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to .env (see .env.example). Provider/plans search will fail until set."
  );
}

/**
 * Supabase client instance.
 * In-memory auth storage for demo; no secrets logged.
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
 * From .env: EXPO_PUBLIC_SUPABASE_FUNCTIONS_BASE_URL (e.g. http://localhost:54321/functions/v1).
 */
export function getFunctionsBaseUrl(): string {
  const override =
    (extra.functionsBaseUrl as string | undefined) ??
    process.env.EXPO_PUBLIC_SUPABASE_FUNCTIONS_BASE_URL;
  if (override?.trim()) {
    return override.replace(/\/$/, "");
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
