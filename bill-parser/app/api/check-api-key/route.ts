import { NextResponse } from "next/server";

/**
 * GET /api/check-api-key — reports whether GEMINI_API_KEY is set.
 * Does not return the key value.
 */
export async function GET() {
  const key = process.env.GEMINI_API_KEY;
  const configured = !!key?.trim();
  return NextResponse.json({
    configured,
    provider: "gemini",
    ...(configured && { keyPrefix: key!.slice(0, 10) + "..." }),
  });
}
