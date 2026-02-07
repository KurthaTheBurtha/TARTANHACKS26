#!/usr/bin/env bash
# Smoke test for CareMap ingest: health check then POST /v1/caremap/ingest.
# Usage: ./scripts/smoke_ingest.sh <bill_pdf_path> [sob_pdf_path] [BASE_URL]
# Example: ./scripts/smoke_ingest.sh billing_statement.pdf
# Example: ./scripts/smoke_ingest.sh billing_statement.pdf summary-of-benefits.pdf http://localhost:8000
set -e

BILL_PDF="${1:?Usage: $0 <bill_pdf_path> [sob_pdf_path] [BASE_URL]}"
SOB_PDF="${2:-}"
BASE_URL="${3:-http://localhost:8000}"

echo "==> CareMap smoke ingest"
echo "    BASE_URL=$BASE_URL"
echo "    bill_pdf=$BILL_PDF"
echo "    sob_pdf=${SOB_PDF:-<none>}"
echo ""

if [ ! -f "$BILL_PDF" ]; then
  echo "Error: Bill PDF not found: $BILL_PDF"
  echo "Place a sample PDF at repo root (e.g. billing_statement.pdf) or pass an absolute path."
  exit 1
fi

echo "==> 1. GET /v1/caremap/health"
HEALTH=$(curl -s "${BASE_URL}/v1/caremap/health")
echo "$HEALTH" | (command -v jq >/dev/null 2>&1 && jq . || python3 -m json.tool)
echo ""

echo "==> 2. POST /v1/caremap/ingest (multipart)"
CURL_ARGS=(
  -s -w "\n%{http_code}"
  -X POST
  -F "bill_pdf=@${BILL_PDF};type=application/pdf"
  -F 'user_context={"zip_code":"15213","radius_miles":10,"specialty_keywords":["primary care"]}'
)
if [ -n "$SOB_PDF" ] && [ -f "$SOB_PDF" ]; then
  CURL_ARGS+=(-F "sob_pdf=@${SOB_PDF};type=application/pdf")
fi
CURL_ARGS+=("${BASE_URL}/v1/caremap/ingest")

OUT=$(curl "${CURL_ARGS[@]}")
HTTP_CODE=$(echo "$OUT" | tail -1)
HTTP_BODY=$(echo "$OUT" | sed '$d')

echo "HTTP status: $HTTP_CODE"
if [ "$HTTP_CODE" -ge 400 ]; then
  echo "$HTTP_BODY" | (command -v jq >/dev/null 2>&1 && jq . 2>/dev/null || echo "$HTTP_BODY")
  exit 1
fi

echo "$HTTP_BODY" | (command -v jq >/dev/null 2>&1 && jq . || python3 -m json.tool)
echo ""
echo "==> Done. Check: bill.line_items (>=1), guidance.summary_plain_english (non-empty), navigation.results (>=1)."
