/**
 * CareMap — Geocode API Route
 * ============================
 * Geocoding (address → lat/lng) and reverse geocoding (lat/lng → address).
 * Uses Google Geocoding API. Enable "Geocoding API" in Google Cloud Console.
 */

import { NextRequest, NextResponse } from "next/server";

const GEOCODE_BASE = "https://maps.googleapis.com/maps/api/geocode/json";

export async function POST(req: NextRequest) {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) {
    return NextResponse.json({ error: "GOOGLE_MAPS_API_KEY not configured" }, { status: 500 });
  }

  try {
    const body = await req.json();
    const { address, lat, lng } = body;

    if (address && typeof address === "string") {
      // Geocode: address → lat/lng
      const res = await fetch(
        `${GEOCODE_BASE}?address=${encodeURIComponent(address.trim())}&key=${key}`
      );
      const data = await res.json();
      if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
        return NextResponse.json(
          { error: data.error_message ?? "Geocoding failed" },
          { status: 400 }
        );
      }
      const result = data.results?.[0];
      if (!result) {
        return NextResponse.json({ error: "No results for that address" }, { status: 404 });
      }
      const { lat: aLat, lng: aLng } = result.geometry?.location ?? {};
      return NextResponse.json({
        lat: aLat,
        lng: aLng,
        formatted_address: result.formatted_address,
      });
    }

    if (typeof lat === "number" && typeof lng === "number") {
      // Reverse geocode: lat/lng → address
      const res = await fetch(
        `${GEOCODE_BASE}?latlng=${lat},${lng}&key=${key}`
      );
      const data = await res.json();
      if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
        return NextResponse.json(
          { error: data.error_message ?? "Reverse geocoding failed" },
          { status: 400 }
        );
      }
      const result = data.results?.[0];
      if (!result) {
        return NextResponse.json({ error: "No results for that location" }, { status: 404 });
      }
      // Prefer locality + region for shorter display (e.g. "Pittsburgh, PA")
      const locality = result.address_components?.find((c: { types: string[] }) =>
        c.types.includes("locality")
      );
      const region = result.address_components?.find((c: { types: string[] }) =>
        c.types.includes("administrative_area_level_1")
      );
      const shortLabel = locality && region
        ? `${locality.long_name}, ${region.short_name}`
        : result.formatted_address;
      return NextResponse.json({
        formatted_address: result.formatted_address,
        short_label: shortLabel,
      });
    }

    return NextResponse.json({ error: "Provide address or lat/lng" }, { status: 400 });
  } catch (err) {
    console.error("Geocode error:", err);
    return NextResponse.json({ error: "Geocoding failed" }, { status: 500 });
  }
}
