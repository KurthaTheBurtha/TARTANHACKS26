#!/usr/bin/env bash
# =============================================================================
# CareMap — Provider Search cURL Script
# =============================================================================
#
# USAGE:
#   ./curl_providers_search.sh [JSON_BODY_OR_FILE]
#
# ENVIRONMENT VARIABLES:
#   FUNCTIONS_BASE_URL  Base URL for Edge Functions (required)
#                       e.g., https://your-project.supabase.co/functions/v1
#                       or    http://localhost:54321/functions/v1
#
#   AUTH_BEARER         Supabase access token (optional)
#                       Get this from: supabase.auth.getSession() -> session.access_token
#                       If not set, request is sent without Authorization header.
#                       Use DEV_BYPASS_AUTH=true on backend for unauthenticated requests.
#
# EXAMPLES:
#   # Inline JSON body (with auth)
#   export FUNCTIONS_BASE_URL="http://localhost:54321/functions/v1"
#   export AUTH_BEARER="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
#   ./curl_providers_search.sh '{"lat": 40.4406, "lng": -79.9959, "radius_miles": 10, "limit": 10, "source": "mock"}'
#
#   # Without auth (requires DEV_BYPASS_AUTH=true on backend)
#   export FUNCTIONS_BASE_URL="http://localhost:54321/functions/v1"
#   ./curl_providers_search.sh '{"lat": 40.4406, "lng": -79.9959, "radius_miles": 10, "limit": 10, "source": "mock"}'
#
#   # From file
#   echo '{"lat": 40.4406, "lng": -79.9959, "radius_miles": 10, "limit": 20, "source": "cache"}' > request.json
#   ./curl_providers_search.sh request.json
#
#   # With plan_id for network status
#   ./curl_providers_search.sh '{"lat": 40.4406, "lng": -79.9959, "radius_miles": 10, "limit": 20, "source": "cache", "plan_id": "33333333-3333-3333-3333-333333333333"}'
#
#   # Places mode with query
#   ./curl_providers_search.sh '{"q": "cardiologist", "lat": 40.4406, "lng": -79.9959, "radius_miles": 5, "limit": 10, "source": "places"}'
#
# =============================================================================

set -e

# Check required environment variables
if [[ -z "$FUNCTIONS_BASE_URL" ]]; then
    echo "ERROR: FUNCTIONS_BASE_URL environment variable is required"
    echo "Example: export FUNCTIONS_BASE_URL=http://localhost:54321/functions/v1"
    exit 1
fi

# Check for auth token (optional, but warn if missing)
AUTH_HEADER=""
if [[ -z "$AUTH_BEARER" ]]; then
    echo "⚠️  No AUTH_BEARER provided; calling without Authorization header."
    echo "   For this to work, set DEV_BYPASS_AUTH=true on the backend."
    echo ""
else
    AUTH_HEADER="-H \"Authorization: Bearer $AUTH_BEARER\""
fi

# Determine JSON body
JSON_BODY=""
if [[ -n "$1" ]]; then
    if [[ -f "$1" ]]; then
        # Argument is a file path
        JSON_BODY=$(cat "$1")
    else
        # Argument is inline JSON
        JSON_BODY="$1"
    fi
else
    # Default request for testing
    JSON_BODY='{"lat": 40.4406, "lng": -79.9959, "radius_miles": 10, "limit": 10, "source": "mock"}'
    echo "No body provided, using default mock request..."
fi

# Build URL
URL="${FUNCTIONS_BASE_URL}/providers-search"

echo "=========================================="
echo "POST $URL"
echo "=========================================="
echo "Request Body:"
echo "$JSON_BODY" | python3 -m json.tool 2>/dev/null || echo "$JSON_BODY"
echo ""
echo "=========================================="
echo "Response:"
echo "=========================================="

# Make request and format output
if [[ -n "$AUTH_BEARER" ]]; then
    RESPONSE=$(curl -s -X POST "$URL" \
        -H "Authorization: Bearer $AUTH_BEARER" \
        -H "Content-Type: application/json" \
        -d "$JSON_BODY")
else
    RESPONSE=$(curl -s -X POST "$URL" \
        -H "Content-Type: application/json" \
        -d "$JSON_BODY")
fi

# Try to pretty-print with Python, fall back to raw output
if command -v python3 &> /dev/null; then
    echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
elif command -v python &> /dev/null; then
    echo "$RESPONSE" | python -m json.tool 2>/dev/null || echo "$RESPONSE"
else
    echo "$RESPONSE"
fi
