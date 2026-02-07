#!/usr/bin/env bash
set -euo pipefail

BASE="${API_BASE_URL:-http://localhost:8000}"

has_jq() { command -v jq >/dev/null 2>&1; }

echo "==> GET $BASE/health"
resp="$(curl -fsS "$BASE/health")"
if has_jq; then echo "$resp" | jq .; else echo "$resp"; fi

echo ""
echo "==> GET $BASE/v1/me (non-fatal if auth required)"
set +e
resp_me="$(curl -sS "$BASE/v1/me" 2>&1)"
code=$?
set -e
if [ $code -eq 0 ]; then
  if has_jq; then echo "$resp_me" | jq .; else echo "$resp_me"; fi
else
  echo "WARN: /v1/me failed (likely auth). Continuing..."
fi

echo ""
echo "==> GET $BASE/v1/providers/search (non-fatal if auth required)"
set +e
resp2="$(curl -sS "$BASE/v1/providers/search?query=Dermatologist&lat=40.4433&lng=-79.9436&radius_miles=10" 2>&1)"
code=$?
set -e
if [ $code -eq 0 ]; then
  if has_jq; then
    echo "$resp2" | jq '.providers[0] | {provider_id,name,network}' 2>/dev/null || echo "$resp2"
  else
    echo "$resp2"
  fi
else
  echo "WARN: /v1/providers/search failed (likely auth). Continuing..."
fi

echo ""
echo "✅ Smoke OK"
