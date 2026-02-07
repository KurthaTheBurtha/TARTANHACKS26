# Authentication and RLS Audit

## Overview

This document describes the authentication and Row-Level Security (RLS) architecture, ensuring zero cross-tenant data leakage.

## Authentication

### JWT Authentication (Production)

- **Source:** Supabase JWT tokens
- **Verification:** JWT secret or JWKS endpoint
- **User ID Extraction:** From `sub` or `user_id` claim
- **Middleware:** FastAPI dependency `get_current_user()`

### Test Override Mode

- **Activation:** `TEST_BYPASS_AUTH=true` (test environment only)
- **Mechanism:** `X-Test-User` header specifies user ID
- **Security:** Only active in test mode, never in production
- **Purpose:** Enable deterministic tests without generating real JWTs

## Row-Level Security (RLS)

### Database-Level RLS

Supabase RLS policies ensure users can only access their own data:

- **documents:** `auth.uid() = user_id`
- **doc_extractions:** Via JOIN with documents (user_id check)
- **line_items:** Via JOIN with doc_extractions → documents
- **policy_chunks:** Via JOIN with documents (user_id check)
- **chat_sessions:** `auth.uid() = user_id`
- **chat_messages:** Via JOIN with chat_sessions (user_id check)

### Application-Level Defense in Depth

Even with RLS, all queries include explicit `user_id` filters:

```python
# Example: Get document
doc = db_service.get_document(doc_id=doc_id, user_id=user_id)
# Always filters by user_id before RLS
```

## Isolation Guarantees

### Documents

- ✅ Users can only upload documents to their own account
- ✅ Users can only analyze their own documents
- ✅ Users can only retrieve their own documents
- ✅ Cross-tenant access returns **404** (not 403) to prevent enumeration

### Policies

- ✅ Users can only upload policies to their own account
- ✅ Users can only ingest their own policies
- ✅ Policy chunks are filtered by `user_id` in vector search
- ✅ Chat citations only reference user's own policy chunks

### Chat

- ✅ Users can only create sessions in their own account
- ✅ Users can only send messages to their own sessions
- ✅ Users cannot access other users' chat history
- ✅ Streaming endpoints enforce session ownership

### Providers Cache

- ✅ Cache keys include `user_id` in hash
- ✅ Search results are user-specific
- ✅ Provider lookups are scoped to user's cache

## Test Coverage

### Isolation Tests

- `test_rls_isolation_docs.py` - Document access isolation
- `test_rls_isolation_policies.py` - Policy chunk isolation
- `test_rls_isolation_chat.py` - Chat session isolation
- `test_rls_isolation_providers_cache.py` - Cache isolation

### Integration Tests

- `test_integration_smoke.py` - Happy path for all endpoints
- `test_auth_me.py` - Authentication and /me endpoint

## Security Best Practices

### 1. Never Log PHI

- No document text in logs
- No policy chunk text in logs
- No user messages in logs
- No addresses or provider names in logs

### 2. Consistent Error Responses

- **404** for cross-tenant access (prevents enumeration)
- **401** for missing/invalid authentication
- **403** for insufficient permissions (if needed)

### 3. Defense in Depth

- RLS at database level
- Application-level `user_id` filtering
- Service-level ownership checks
- Endpoint-level session verification

### 4. Test Mode Safety

- Test override only active when `TEST_BYPASS_AUTH=true`
- Never allow test override in production
- Test mode clearly marked in `/v1/me` response

## Audit Checklist

### ✅ Authentication

- [x] JWT verification implemented
- [x] User ID extraction from token
- [x] Test override mode (test only)
- [x] `/v1/me` endpoint returns user identity

### ✅ Documents

- [x] Upload scoped to user_id
- [x] Analyze checks document ownership
- [x] Get document checks ownership
- [x] Cross-tenant access returns 404

### ✅ Policies

- [x] Upload scoped to user_id
- [x] Ingest checks policy ownership
- [x] Vector search filters by user_id
- [x] Citations only reference user's chunks

### ✅ Chat

- [x] Session creation scoped to user_id
- [x] Message sending checks session ownership
- [x] Streaming checks session ownership
- [x] Cross-tenant access returns 404

### ✅ Providers

- [x] Cache keys include user_id
- [x] Search results are user-specific
- [x] Provider lookups scoped to user

## Running Isolation Tests

### Mock Mode (Default)

```bash
pytest tests/test_rls_isolation_*.py -v
```

Tests run without Supabase, validating application-level isolation logic.

### Supabase Mode (Optional)

```bash
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... pytest tests/test_rls_isolation_*.py -v -m integration
```

Tests run against real Supabase with RLS enabled.

## Future Enhancements

1. **Audit Logging:** Track all cross-tenant access attempts
2. **Rate Limiting:** Per-user rate limits
3. **Token Refresh:** Automatic token refresh mechanism
4. **Multi-Factor Auth:** Optional MFA support
5. **Session Management:** Session timeout and revocation
