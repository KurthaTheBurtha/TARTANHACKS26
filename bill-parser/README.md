# CareMap

**AI-powered medical bill analysis that finds errors and helps you save money.**

Upload your medical bill PDF and get a structured breakdown of charges, line items, CPT codes, and insurance information—powered by Google Gemini (free tier).

---

## Features

- **PDF bill parsing** — Upload medical bill PDFs and extract structured data automatically
- **Line item breakdown** — See every charge with description, CPT code, quantity, unit price, and total
- **Insurance summary** — View insurance paid, patient responsibility, deductible, and copay
- **Client-side validation** — File type and size checks (PDF only, max 10MB) with clear error messages
- **Robust error handling** — Handles scanned images, timeouts, malformed responses, and invalid files
- **Modern UI** — Drag-and-drop upload, loading states, responsive design with dark mode

---

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| AI | Google Gemini (gemini-1.5-flash, free tier) |
| Icons | Lucide React |
| UI Components | Radix UI (Slot) |

---

## Setup Instructions

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd TARTANHACKS2026
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env.local` file in the project root:

```env
GEMINI_API_KEY=your_api_key_here
```

Get a free API key from [Google AI Studio](https://aistudio.google.com/app/apikey).

### 4. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production build

```bash
npm run build
npm start
```

---

## How to Use

1. **Go to the app** — Open the landing page and click "Analyze Your Bill" or navigate to `/upload`.
2. **Upload your bill** — Drag and drop a PDF medical bill or click to browse. Only PDF files up to 10MB are accepted.
3. **Analyze** — Click "Analyze Bill" and wait 10–20 seconds while the AI processes your document.
4. **Review results** — View patient info, provider details, total charges, line items, and insurance information in a structured format.
5. **Upload another** — Use "Upload Another Bill" to process additional documents.

---

## API Endpoints

### `POST /api/parse-bill`

Parses a medical bill PDF and returns structured data.

**Request:**
- Method: `POST`
- Content-Type: `multipart/form-data`
- Body: FormData with `file` key (PDF file)

**Response (200):**
```json
{
  "patient_name": "string | null",
  "date_of_service": "YYYY-MM-DD | null",
  "provider_name": "string | null",
  "provider_address": "string | null",
  "total_charges": number | null,
  "line_items": [
    {
      "description": "string",
      "cpt_code": "string | null",
      "quantity": number,
      "unit_price": number,
      "total": number,
      "date": "YYYY-MM-DD | null"
    }
  ],
  "insurance_info": {
    "insurance_paid": number | null,
    "patient_responsibility": number | null,
    "deductible_applied": number | null,
    "copay": number | null
  }
}
```

**Error responses:**

| Status | Condition |
|--------|-----------|
| 400 | No file provided, invalid file type (non-PDF), or file exceeds 10MB |
| 422 | Scanned/low-quality PDF that cannot be read |
| 500 | JSON parse error, API configuration error, or general failure |
| 504 | Request timeout (60 seconds) |

---

## Project Structure

```
├── app/
│   ├── api/
│   │   └── parse-bill/
│   │       └── route.ts      # POST endpoint for bill parsing
│   ├── upload/
│   │   └── page.tsx          # Upload page
│   ├── layout.tsx            # Root layout
│   ├── page.tsx              # Landing page
│   └── globals.css           # Global styles
├── components/
│   ├── bill-results.tsx      # Displays parsed bill data (cards, table, insurance)
│   └── bill-upload.tsx       # Upload UI with drag-drop, validation, loading
├── lib/
│   ├── claude.ts             # Anthropic SDK client & parseDocument()
│   ├── prompts.ts            # BILL_PARSER_PROMPT for the LLM
│   └── types.ts              # BillData, LineItem, InsuranceInfo types
├── .env.local                # API key (not committed)
└── package.json
```

---

## Known Limitations

- **PDF format only** — Text-based PDFs work best; scanned images may fail if quality is poor
- **File size** — Maximum 10MB per file
- **Timeout** — Requests timeout after 60 seconds; large or complex documents may fail
- **CPT codes** — Relies on AI extraction; accuracy depends on bill clarity
- **No storage** — Bills are processed in-memory and not persisted
- **English only** — Optimized for English-language medical bills

---

## Future Enhancements

- [ ] **Appeal letter generation** — Auto-generate professional dispute letters for overcharges
- [ ] **Fair pricing comparison** — Compare extracted charges against regional benchmarks
- [ ] **Batch processing** — Upload multiple bills at once
- [ ] **Export** — Download results as PDF or CSV
- [ ] **User accounts** — Save and compare bills over time
- [ ] **OCR for scanned bills** — Improved support for image-based PDFs

---

## License

MIT
