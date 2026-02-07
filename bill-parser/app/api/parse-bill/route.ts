import { NextResponse } from "next/server";
import { parseDocument } from "@/lib/gemini";
import { BILL_PARSER_PROMPT } from "@/lib/prompts";
import type { BillData } from "@/lib/types";

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const REQUEST_TIMEOUT_MS = 60_000; // 60 seconds

const SCANNED_PDF_INDICATORS = [
  "unable to read",
  "could not read",
  "cannot read",
  "poor quality",
  "low resolution",
  "scanned image",
  "image quality",
  "illegible",
  "cannot extract",
  "unreadable",
  "no text could be extracted",
];

function extractJsonFromText(text: string): string {
  let cleaned = text.trim();

  // Strip markdown code blocks (```json ... ``` or ``` ... ```)
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, "");
  cleaned = cleaned.replace(/\s*```\s*$/, "");
  cleaned = cleaned.trim();

  // Remove any preamble text before the JSON (text before first { or [)
  const objectStart = cleaned.indexOf("{");
  const arrayStart = cleaned.indexOf("[");
  let startIndex = -1;
  if (objectStart !== -1 && arrayStart !== -1) {
    startIndex = Math.min(objectStart, arrayStart);
  } else if (objectStart !== -1) {
    startIndex = objectStart;
  } else if (arrayStart !== -1) {
    startIndex = arrayStart;
  }
  if (startIndex > 0) {
    cleaned = cleaned.slice(startIndex);
  }

  // Remove any trailing text after the JSON (text after matching } or ])
  const isObject = cleaned.startsWith("{");
  let depth = 0;
  let endIndex = -1;
  const openChar = isObject ? "{" : "[";
  const closeChar = isObject ? "}" : "]";

  for (let i = 0; i < cleaned.length; i++) {
    const c = cleaned[i];
    if (c === openChar) depth++;
    else if (c === closeChar) {
      depth--;
      if (depth === 0) {
        endIndex = i;
        break;
      }
    }
  }
  if (endIndex !== -1 && endIndex < cleaned.length - 1) {
    cleaned = cleaned.slice(0, endIndex + 1);
  }

  return cleaned.trim();
}

function isScannedOrPoorQualityResponse(text: string): boolean {
  const lower = text.toLowerCase();
  return SCANNED_PDF_INDICATORS.some((indicator) => lower.includes(indicator));
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error(`Request timed out after ${ms / 1000} seconds`)),
        ms
      )
    ),
  ]);
}

export async function POST(request: Request) {
  try {
    console.log("[parse-bill] Received POST request");

    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      console.log("[parse-bill] Error: No file provided");
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Check file type
    const isPdf =
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      console.log("[parse-bill] Error: Invalid file type:", file.type, "name:", file.name);
      return NextResponse.json(
        { error: "Invalid file type. Only PDF files are allowed." },
        { status: 400 }
      );
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE_BYTES) {
      console.log(
        "[parse-bill] Error: File too large:",
        file.size,
        "bytes, max:",
        MAX_FILE_SIZE_BYTES
      );
      return NextResponse.json(
        {
          error: `File too large. Maximum size is ${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB.`,
        },
        { status: 400 }
      );
    }

    console.log("[parse-bill] Processing file:", file.name, "Size:", file.size);

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const pdfBase64 = buffer.toString("base64");

    console.log("[parse-bill] Converted to base64, length:", pdfBase64.length);

    // Call LLM (Gemini) with timeout
    let rawResponse: string;
    try {
      rawResponse = await withTimeout(
        parseDocument(pdfBase64, BILL_PARSER_PROMPT),
        REQUEST_TIMEOUT_MS
      );
    } catch (parseDocError) {
      const err = parseDocError instanceof Error ? parseDocError : new Error(String(parseDocError));
      console.error("[parse-bill] parseDocument error:", err.message, err);

      if (err.message.includes("timed out")) {
        return NextResponse.json(
          { error: "Request timed out. Please try again with a smaller file." },
          { status: 504 }
        );
      }
      if (err.message.includes("No text could be extracted")) {
        return NextResponse.json(
          { error: err.message },
          { status: 422 }
        );
      }
      throw err;
    }

    console.log("[parse-bill] AI response length:", rawResponse.length);

    // Check for scanned/poor quality PDF indicators
    if (isScannedOrPoorQualityResponse(rawResponse)) {
      console.log("[parse-bill] Detected scanned or poor quality PDF - response indicates read failure");
      return NextResponse.json(
        {
          error:
            "Unable to read this document. It may be a scanned image with poor quality. Please use a text-based PDF or ensure scanned documents are high resolution.",
        },
        { status: 422 }
      );
    }

    // Extract and parse JSON with robust cleanup
    const jsonString = extractJsonFromText(rawResponse);
    let billData: BillData;

    try {
      billData = JSON.parse(jsonString) as BillData;
    } catch (parseError) {
      const err = parseError instanceof SyntaxError ? parseError : new SyntaxError(String(parseError));
      console.error("[parse-bill] JSON parse error:", err.message);
      console.error("[parse-bill] Extracted string length:", jsonString.length);
      console.error("[parse-bill] Extracted string start:", jsonString.slice(0, 200));
      console.error("[parse-bill] Extracted string end:", jsonString.slice(-200));
      console.error("[parse-bill] Raw response snippet (first 500 chars):", rawResponse.slice(0, 500));

      return NextResponse.json(
        {
          error:
            "Unable to extract structured data from the bill. The document may be unclear or in an unexpected format. Please try a different file.",
        },
        { status: 500 }
      );
    }

    // Validate required structure
    if (!billData.line_items || !Array.isArray(billData.line_items)) {
      billData.line_items = [];
    }
    if (!billData.insurance_info || typeof billData.insurance_info !== "object") {
      billData.insurance_info = {
        insurance_paid: null,
        patient_responsibility: null,
        deductible_applied: null,
        copay: null,
      };
    }

    console.log(
      "[parse-bill] Successfully parsed bill for patient:",
      billData.patient_name ?? "(unknown)"
    );

    return NextResponse.json(billData, { status: 200 });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error("[parse-bill] Unexpected error:", err.message);
    console.error("[parse-bill] Stack:", err.stack);

    if (err.message.includes("GEMINI_API_KEY")) {
      return NextResponse.json(
        {
          error:
            "API key not configured. Add GEMINI_API_KEY to .env.local (get a free key at aistudio.google.com/app/apikey) and restart the dev server.",
        },
        { status: 500 }
      );
    }
    if (err.message.includes("Gemini API")) {
      return NextResponse.json(
        { error: err.message.includes("Empty") ? "AI returned an empty response. Try again." : "Failed to process bill with AI service." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "Failed to parse bill. Please try again." },
      { status: 500 }
    );
  }
}
