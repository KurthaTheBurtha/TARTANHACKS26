/**
 * CareMap Integrations — Places API Response Normalizer
 * ======================================================
 * Transforms Google Places API responses into our Provider contract.
 *
 * Address parsing is best-effort for demo.
 */

import type { Provider, Address, GeoPoint } from "../../../shared/contracts.ts";
import type { PlaceResult } from "./places.ts";

/**
 * Parse a formatted address string into an Address struct.
 * Best-effort parsing for demo purposes.
 *
 * Expected format (US): "123 Main St, Pittsburgh, PA 15213, USA"
 * May not work perfectly for all address formats.
 */
function parseFormattedAddress(formattedAddress: string): Address {
  // Default fallback
  const fallback: Address = {
    line1: formattedAddress,
    city: "Unknown",
    state: "Unknown",
  };

  if (!formattedAddress) {
    return fallback;
  }

  // Split by comma and trim
  const parts = formattedAddress.split(",").map((p) => p.trim());

  if (parts.length < 3) {
    return fallback;
  }

  // Try to extract components
  // Typical US format: "Street, City, State ZIP, Country"
  // or: "Street, Suite, City, State ZIP, Country"

  let line1 = parts[0];
  let line2: string | undefined;
  let city: string;
  let stateZipPart: string;

  if (parts.length >= 4) {
    // Check if second part looks like a suite/unit number
    const secondPart = parts[1];
    if (
      secondPart.match(/^(suite|ste|unit|apt|#|floor|fl|room|rm)/i) ||
      secondPart.match(/^\d+$/)
    ) {
      line2 = secondPart;
      city = parts[2];
      stateZipPart = parts[3];
    } else {
      // Second part is probably the city
      city = parts[1];
      stateZipPart = parts[2];
    }
  } else {
    // 3 parts: assume "Street, City, State ZIP"
    city = parts[1];
    stateZipPart = parts[2];
  }

  // Parse state and ZIP from "PA 15213" or just "PA"
  const stateZipMatch = stateZipPart.match(/^([A-Z]{2})\s*(\d{5}(?:-\d{4})?)?/i);
  let state = "Unknown";
  let zip: string | undefined;

  if (stateZipMatch) {
    state = stateZipMatch[1].toUpperCase();
    zip = stateZipMatch[2];
  } else {
    // Maybe it's just the state or country
    state = stateZipPart.substring(0, 2).toUpperCase();
  }

  return {
    line1,
    line2,
    city,
    state,
    zip,
  };
}

/**
 * Infer medical specialties from Google Places types.
 * Best-effort heuristic mapping for demo.
 */
function inferSpecialtiesFromTypes(types: string[]): string[] {
  const specialties: string[] = [];

  const typeToSpecialty: Record<string, string> = {
    hospital: "hospital",
    doctor: "general_practice",
    dentist: "dentistry",
    pharmacy: "pharmacy",
    physiotherapist: "physical_therapy",
    veterinary_care: "veterinary",
    health: "healthcare",
  };

  for (const type of types) {
    const specialty = typeToSpecialty[type];
    if (specialty && !specialties.includes(specialty)) {
      specialties.push(specialty);
    }
  }

  return specialties;
}

/**
 * Generate a UUID v4.
 * Uses crypto API if available, otherwise falls back to random.
 */
function generateUuid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  // Fallback for environments without crypto.randomUUID
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Normalize a Google Places API result to our Provider contract.
 *
 * @param place Raw place result from Places API
 * @returns Normalized Provider object
 */
export function normalizePlacesToProvider(place: PlaceResult): Provider {
  // Extract geo coordinates
  const geo: GeoPoint = {
    lat: place.location?.latitude ?? 0,
    lng: place.location?.longitude ?? 0,
  };

  // Parse address
  const address = parseFormattedAddress(place.formattedAddress ?? "");

  // Extract types (pass-through)
  const types = place.types ?? [];

  // Infer specialties from types
  const specialties = inferSpecialtiesFromTypes(types);

  // Build provider object
  const provider: Provider = {
    id: generateUuid(),
    place_id: place.id,
    name: place.displayName?.text ?? "Unknown Provider",
    types: types.length > 0 ? types : undefined,
    specialties: specialties.length > 0 ? specialties : undefined,
    address,
    geo,
    phone: place.nationalPhoneNumber,
    website: place.websiteUri,
    // network_status and distance_miles will be filled in later
  };

  return provider;
}

/**
 * Normalize multiple places to providers.
 */
export function normalizePlacesToProviders(places: PlaceResult[]): Provider[] {
  return places.map(normalizePlacesToProvider);
}
