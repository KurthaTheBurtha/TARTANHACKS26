import { NextResponse } from "next/server";

/**
 * GET /api/check-api-key — reports whether GEMINI_API_KEY is set.
 * Does not return the key value.
 */
export async function GET() {
  const configured = !!process.env.GEMINI_API_KEY?.trim();
  return NextResponse.json({
    configured,
    provider: "gemini",
    message: configured
      ? "API key configured (value never exposed)."
      : "Set GEMINI_API_KEY in .env.local for bill parsing.",
  });
}
