import { GoogleGenerativeAI } from "@google/generative-ai";
// pdf-parse is CJS; type is optional
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse") as (buffer: Buffer) => Promise<{ text: string }>;

/**
 * Extract text from a PDF buffer. Uses pdf-parse (works for text-based PDFs).
 */
async function extractTextFromPdf(pdfBase64: string): Promise<string> {
  const buffer = Buffer.from(pdfBase64, "base64");
  const { text } = await pdfParse(buffer);
  const trimmed = (text || "").trim();
  if (!trimmed) {
    throw new Error(
      "No text could be extracted from this PDF. It may be a scanned image—use a text-based PDF or an OCR tool first."
    );
  }
  return trimmed;
}

/**
 * Parse a medical bill PDF: extract text, then send to Gemini for structured JSON.
 * Same signature as the previous Claude-based parseDocument for drop-in replacement.
 */
export async function parseDocument(
  pdfBase64: string,
  prompt: string
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey?.trim()) {
    throw new Error("GEMINI_API_KEY is not set in environment variables");
  }

  const pdfText = await extractTextFromPdf(pdfBase64);

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    generationConfig: {
      maxOutputTokens: 4096,
      temperature: 0.1,
    },
  });

  const fullPrompt = `${prompt}\n\n---\n\nDocument text to analyze:\n\n${pdfText}`;

  const result = await model.generateContent(fullPrompt);

  const response = result.response;
  if (!response?.candidates?.length) {
    const reason = response?.promptFeedback?.blockReason ?? "No response";
    throw new Error(`Gemini API error: ${reason}`);
  }

  const part = response.candidates[0].content?.parts?.[0];
  if (!part || !("text" in part)) {
    throw new Error("Gemini API error: Empty or invalid response");
  }

  return part.text;
}
