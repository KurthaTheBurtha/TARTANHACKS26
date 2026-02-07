#!/usr/bin/env bash
# =============================================================================
# CareMap — Demo Smoke Test
# =============================================================================
#
# Runs quick smoke tests against Edge Functions to verify deployment.
#
# USAGE:
#   ./integrations-abhay/scripts/demo_smoke_test.sh
#
# ENVIRONMENT VARIABLES:
#   FUNCTIONS_BASE_URL  Base URL for Edge Functions (required)
#                       e.g., http://localhost:54321/functions/v1
#
#   AUTH_BEARER         Supabase access token (optional)
#                       If not set, requires DEV_BYPASS_AUTH=true on backend
#
# EXAMPLES:
#   # Local development with auth bypass
#   export FUNCTIONS_BASE_URL="http://localhost:54321/functions/v1"
#   ./integrations-abhay/scripts/demo_smoke_test.sh
#
#   # With authentication
#   export FUNCTIONS_BASE_URL="http://localhost:54321/functions/v1"
#   export AUTH_BEARER="eyJhbGciOi..."
#   ./integrations-abhay/scripts/demo_smoke_test.sh
#
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0

# -----------------------------------------------------------------------------
# Helper functions
# -----------------------------------------------------------------------------

print_header() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

print_subheader() {
    echo ""
    echo -e "${YELLOW}▶ $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
    ((PASSED++))
}

print_failure() {
    echo -e "${RED}❌ $1${NC}"
    ((FAILED++))
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "   $1"
}

pretty_json() {
    if command -v python3 &> /dev/null; then
        python3 -m json.tool 2>/dev/null || cat
    elif command -v python &> /dev/null; then
        python -m json.tool 2>/dev/null || cat
    else
        cat
    fi
}

# Make a request and check response
# Usage: make_request "endpoint" "body" "test_name"
make_request() {
    local endpoint="$1"
    local body="$2"
    local test_name="$3"
    
    local url="${FUNCTIONS_BASE_URL}/${endpoint}"
    local http_code
    local response
    
    print_subheader "$test_name"
    print_info "POST $url"
    
    # Build curl command
    local curl_args=(-s -w "\n%{http_code}" -X POST "$url" -H "Content-Type: application/json" -d "$body")
    
    if [[ -n "$AUTH_BEARER" ]]; then
        curl_args+=(-H "Authorization: Bearer $AUTH_BEARER")
    fi
    
    # Execute request
    local result
    result=$(curl "${curl_args[@]}" 2>/dev/null) || {
        print_failure "$test_name — Connection failed"
        return 1
    }
    
    # Extract HTTP code (last line) and response (everything else)
    http_code=$(echo "$result" | tail -n1)
    response=$(echo "$result" | sed '$d')
    
    # Print response
    echo ""
    echo "$response" | pretty_json
    echo ""
    
    # Check status
    if [[ "$http_code" == "200" ]]; then
        # Check for error field in response
        if echo "$response" | grep -q '"error"'; then
            print_failure "$test_name — HTTP 200 but response contains error"
            return 1
        fi
        print_success "$test_name — HTTP $http_code"
        return 0
    elif [[ "$http_code" == "401" ]]; then
        print_failure "$test_name — HTTP 401 Unauthorized"
        print_warning "Set AUTH_BEARER or enable DEV_BYPASS_AUTH=true on backend"
        return 1
    else
        print_failure "$test_name — HTTP $http_code"
        return 1
    fi
}

# Check if endpoint is reachable
check_reachable() {
    local url="${FUNCTIONS_BASE_URL}/providers-search"
    curl -s -o /dev/null -w "%{http_code}" -X OPTIONS "$url" 2>/dev/null | grep -q "204\|200"
}

# -----------------------------------------------------------------------------
# Main
# -----------------------------------------------------------------------------

print_header "CareMap Demo Smoke Test"

# Check environment variables
echo ""
echo "Environment:"

if [[ -z "$FUNCTIONS_BASE_URL" ]]; then
    print_failure "FUNCTIONS_BASE_URL is not set"
    echo ""
    echo "Set it with:"
    echo "  export FUNCTIONS_BASE_URL=http://localhost:54321/functions/v1"
    echo ""
    exit 1
else
    print_success "FUNCTIONS_BASE_URL = $FUNCTIONS_BASE_URL"
fi

if [[ -z "$AUTH_BEARER" ]]; then
    print_warning "No AUTH_BEARER. For demo, set DEV_BYPASS_AUTH=true in function envs."
else
    print_success "AUTH_BEARER = ${AUTH_BEARER:0:20}..."
fi

# Check connectivity
echo ""
echo "Connectivity:"

if check_reachable; then
    print_success "Edge Functions reachable"
else
    print_failure "Edge Functions not reachable at $FUNCTIONS_BASE_URL"
    echo ""
    echo "Make sure Edge Functions are running:"
    echo "  cd integrations-abhay && supabase functions serve --env-file .env"
    echo ""
    exit 1
fi

# -----------------------------------------------------------------------------
# Test 1: Plans Search (Mock Mode)
# -----------------------------------------------------------------------------

print_header "Test 1: Plans Search (Mock)"

PLANS_BODY='{}'

if make_request "plans-search" "$PLANS_BODY" "Plans Search — Get all plans"; then
    :  # Success, continue
else
    print_warning "Plans search failed. Continuing with other tests..."
fi

# -----------------------------------------------------------------------------
# Test 2: Provider Search (Mock Mode)
# -----------------------------------------------------------------------------

print_header "Test 2: Provider Search (Mock)"

PROVIDERS_MOCK_BODY='{
  "lat": 40.4406,
  "lng": -79.9959,
  "radius_miles": 10,
  "limit": 5,
  "source": "mock"
}'

if make_request "providers-search" "$PROVIDERS_MOCK_BODY" "Provider Search — Mock mode"; then
    :  # Success, continue
else
    print_warning "Mock provider search failed. Continuing with other tests..."
fi

# -----------------------------------------------------------------------------
# Test 3: Provider Search (Cache Mode with Plan)
# -----------------------------------------------------------------------------

print_header "Test 3: Provider Search (Cache + Network Status)"

PROVIDERS_CACHE_BODY='{
  "lat": 40.4406,
  "lng": -79.9959,
  "radius_miles": 15,
  "limit": 5,
  "source": "cache",
  "plan_id": "33333333-3333-3333-3333-333333333333"
}'

if make_request "providers-search" "$PROVIDERS_CACHE_BODY" "Provider Search — Cache mode with UPMC plan"; then
    :  # Success, continue
else
    print_warning "Cache provider search failed."
    print_info "This may be expected if seed data hasn't been loaded."
    print_info "Load seed data: Run supabase/sql/seed.sql in Supabase SQL Editor"
fi

# -----------------------------------------------------------------------------
# Summary
# -----------------------------------------------------------------------------

print_header "Summary"

echo ""
echo -e "  ${GREEN}Passed:${NC} $PASSED"
echo -e "  ${RED}Failed:${NC} $FAILED"
echo ""

if [[ $FAILED -eq 0 ]]; then
    echo -e "${GREEN}🎉 All smoke tests passed!${NC}"
    echo ""
    exit 0
else
    echo -e "${YELLOW}⚠️  Some tests failed. Check output above.${NC}"
    echo ""
    
    if [[ -z "$AUTH_BEARER" ]]; then
        echo "Common fixes:"
        echo "  1. Ensure DEV_BYPASS_AUTH=true in your .env"
        echo "  2. Restart Edge Functions: supabase functions serve --env-file .env"
        echo "  3. Or provide AUTH_BEARER with a valid access token"
        echo ""
    fi
    
    exit 1
fi
