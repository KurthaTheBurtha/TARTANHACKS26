/**
 * CareMap — Provider Search API Route
 * ====================================
 * Proxies to Google Places API (New) to find healthcare providers.
 * No in-network logic; returns any healthcare places nearby.
 *
 * Requires: GOOGLE_MAPS_API_KEY in .env (same key as Places API)
 * Enable "Places API (New)" in Google Cloud Console.
 */

import { NextRequest, NextResponse } from "next/server";

const PLACES_BASE = "https://places.googleapis.com";
const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.location",
  "places.types",
  "places.nationalPhoneNumber",
  "places.websiteUri",
].join(",");

/** Valid Table A types for Places API (New) - "health" is Table B and not supported */
const HEALTHCARE_TYPES = ["hospital", "doctor", "dentist", "pharmacy", "physiotherapist", "medical_lab"];

/** Map UI category labels to Google Places types (Table A only) */
const CATEGORY_TO_TYPE: Record<string, string> = {
  "Primary Care": "doctor",
  "Urgent Care": "doctor",
  Hospitals: "hospital",
  Labs: "medical_lab",
};

function haversineMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function inferType(types: string[]): string {
  if (types?.includes("hospital")) return "Hospitals";
  if (types?.includes("doctor")) return "Primary Care";
  if (types?.includes("dentist")) return "Dental";
  if (types?.includes("pharmacy")) return "Pharmacy";
  if (types?.includes("physiotherapist")) return "Physical Therapy";
  if (types?.includes("medical_lab")) return "Labs";
  return types?.[0] ? types[0].replace(/_/g, " ") : "Healthcare";
}


export interface ProviderSearchParams {
  lat: number;
  lng: number;
  radius_miles?: number;
  limit?: number;
  q?: string;
  type?: string;
}

export interface ProviderResult {
  id: string;
  placeId: string;
  name: string;
  type: string;
  address: string;
  distance: string;
  distanceMiles: number;
  rating: number | null;
  reviews: number | null;
  hours: string;
  copay: null;
  accepting: boolean;
  geo: { lat: number; lng: number };
  phone?: string;
  website?: string;
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey?.trim()) {
    return NextResponse.json(
      { error: "GOOGLE_MAPS_API_KEY not configured. Add it to .env and enable Places API (New) in Google Cloud Console." },
      { status: 500 }
    );
  }

  let body: ProviderSearchParams;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const lat = Number(body.lat);
  const lng = Number(body.lng);
  const radiusMiles = Math.min(Math.max(body.radius_miles ?? 10, 1), 25);
  const limit = Math.min(Math.max(body.limit ?? 20, 1), 20);
  const radiusMeters = Math.round(radiusMiles * 1609.344);

  if (Number.isNaN(lat) || Number.isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return NextResponse.json({ error: "Valid lat and lng are required" }, { status: 400 });
  }

  const query = (body.q ?? "").trim();
  const categoryType = body.type ?? null;
  const placesType = categoryType && CATEGORY_TO_TYPE[categoryType] ? CATEGORY_TO_TYPE[categoryType] : null;

  try {
    const url = query
      ? `${PLACES_BASE}/v1/places:searchText`
      : `${PLACES_BASE}/v1/places:searchNearby`;

    const reqBody: Record<string, unknown> = query
      ? {
          textQuery: query || "healthcare",
          locationBias: {
            circle: {
              center: { latitude: lat, longitude: lng },
              radius: radiusMeters,
            },
          },
          maxResultCount: limit,
          includedType: placesType ?? "doctor",
        }
      : {
          locationRestriction: {
            circle: {
              center: { latitude: lat, longitude: lng },
              radius: radiusMeters,
            },
          },
          maxResultCount: limit,
          includedTypes: placesType ? [placesType] : HEALTHCARE_TYPES,
        };

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": FIELD_MASK,
      },
      body: JSON.stringify(reqBody),
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: `Places API error: ${res.status} - ${text.slice(0, 200)}` },
        { status: res.status >= 500 ? 502 : 400 }
      );
    }

    const data = (await res.json()) as { places?: Array<Record<string, unknown>> };
    const places = data.places ?? [];

    const results: ProviderResult[] = places.map((p) => {
      const placeLat = (p.location as { latitude?: number })?.latitude ?? lat;
      const placeLng = (p.location as { longitude?: number })?.longitude ?? lng;
      const distanceMiles = haversineMiles(lat, lng, placeLat, placeLng);
      const types = (p.types as string[]) ?? [];
      const displayName = (p.displayName as { text?: string })?.text ?? "Unknown";
      const hours = "Call for hours";

      return {
        id: (p.id as string) ?? `place-${Math.random().toString(36).slice(2)}`,
        placeId: (p.id as string) ?? "",
        name: displayName,
        type: inferType(types),
        address: (p.formattedAddress as string) ?? "Address not available",
        distance: `${distanceMiles.toFixed(1)} miles`,
        distanceMiles,
        rating: null,
        reviews: null,
        hours,
        copay: null,
        accepting: true,
        geo: { lat: placeLat, lng: placeLng },
        phone: p.nationalPhoneNumber as string | undefined,
        website: p.websiteUri as string | undefined,
      };
    });

    results.sort((a, b) => a.distanceMiles - b.distanceMiles);

    return NextResponse.json({
      providers: results,
      meta: { total: results.length, returned: results.length },
    });
  } catch (err) {
    console.error("[providers-search]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to search providers" },
      { status: 500 }
    );
  }
}
