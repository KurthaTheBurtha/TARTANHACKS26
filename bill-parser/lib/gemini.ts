import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Parse a medical bill PDF: send PDF directly to Gemini as inline data (no pdf-parse).
 * Works in Node.js without browser-only APIs (DOMMatrix, Canvas, etc.).
 */
export async function parseDocument(
  pdfBase64: string,
  prompt: string
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey?.trim()) {
    throw new Error("GEMINI_API_KEY is not set in environment variables");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash-lite", // PDF-supported; gemini-1.5-flash is deprecated/404
    generationConfig: {
      maxOutputTokens: 4096,
      temperature: 0.1,
    },
  });

  // Send PDF as inline data so Gemini reads it natively; no pdf-parse (Node-incompatible) needed
  const result = await model.generateContent([
    {
      inlineData: {
        mimeType: "application/pdf",
        data: pdfBase64,
      },
    },
    { text: prompt },
  ]);

  const response = result.response;
  if (!response?.candidates?.length) {
    const reason = response?.promptFeedback?.blockReason ?? "No response";
    throw new Error(`Gemini API error: ${reason}`);
  }

  const part = response.candidates[0].content?.parts?.[0];
  if (!part || !("text" in part) || typeof part.text !== "string") {
    throw new Error("Gemini API error: Empty or invalid response");
  }

  return part.text;
}
