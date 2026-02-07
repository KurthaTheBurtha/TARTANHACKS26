# Document Processing Pipeline

## Overview

The document processing pipeline handles the complete lifecycle of user-uploaded healthcare documents (bills, EOBs, policies, SOBs) from upload through analysis and storage.

## Flow

### 1. Document Upload (`POST /v1/docs/upload`)

**Input:**
- `doc_type` query parameter (EOB, BILL, SOB, POLICY)
- JWT token (authenticated user)

**Process:**
1. Extract `user_id` from JWT token
2. Generate UUID for `doc_id`
3. Create `documents` row in database with status `pending_upload`
4. Generate storage path: `user/{user_id}/docs/{doc_id}/{filename}`
5. Create signed upload URL via Supabase Storage (expires in 600s)
6. Update `documents.storage_path` with generated path

**Output:**
```json
{
  "doc": {
    "id": "uuid",
    "type": "EOB",
    "status": "pending_upload",
    "created_at": "ISO timestamp"
  },
  "upload": {
    "bucket": "documents",
    "path": "user/{user_id}/docs/{doc_id}/document.pdf",
    "signed_url": "https://...",
    "expires_in": 600
  }
}
```

**Mobile Action:**
- Mobile app uploads file directly to `signed_url` using PUT request
- No file data passes through backend API

### 2. Document Analysis (`POST /v1/docs/{doc_id}/analyze`)

**Input:**
- `doc_id` path parameter
- JWT token

**Process:**
1. Verify document ownership (user_id match)
2. Check if extraction already exists → return cached result
3. Update document status to `processing`
4. Fetch file bytes from Supabase Storage using `storage_path`
5. Run analyzer:
   - If `OPENAI_API_KEY` exists: call OpenAI Vision API (TODO: implement)
   - Else: return deterministic mock extraction
6. Normalize extraction result to database schema
7. Persist to `doc_extractions` table
8. Persist `line_items` array to `line_items` table
9. Update document status to `analyzed`

**Output:**
```json
{
  "doc": {
    "id": "uuid",
    "type": "EOB",
    "status": "analyzed",
    "created_at": "ISO timestamp"
  },
  "extraction": {
    "patient_responsibility": 215.44,
    "provider": "Example Medical Group",
    "service_date": "2025-11-03",
    "line_items": [...],
    "plain_english_summary": "...",
    "next_steps": [...]
  }
}
```

### 3. Get Document (`GET /v1/docs/{doc_id}`)

**Input:**
- `doc_id` path parameter
- JWT token

**Process:**
1. Verify document ownership
2. Fetch document record
3. If extraction exists, fetch `doc_extractions` and `line_items`
4. Return document + extraction (or `extraction: null` if not analyzed)

**Output:**
Same shape as analysis endpoint, but `extraction` may be `null`.

## Storage Architecture

### Supabase Storage Bucket: `documents`

- **Access:** Private (not publicly accessible)
- **Path Structure:** `user/{user_id}/docs/{doc_id}/{filename}`
- **Signed URLs:** Used for both upload and download
- **Expiration:** 600 seconds (10 minutes) for upload URLs
- **File Size Limit:** 10MB (configurable)
- **Allowed MIME Types:** `application/pdf`, `image/jpeg`, `image/png`, `image/heic`

### Security

- Row Level Security (RLS) ensures users can only access their own documents
- Backend verifies JWT and user_id before generating signed URLs
- Storage paths include user_id for additional scoping
- No PHI logged in application logs

## Database Schema

### `documents` Table
- `id` (UUID, primary key)
- `user_id` (UUID, foreign key to auth.users)
- `type` (VARCHAR: EOB, BILL, SOB, POLICY)
- `status` (VARCHAR: pending_upload, uploaded, processing, analyzed, error)
- `storage_path` (TEXT: path in Supabase Storage)
- `file_name`, `file_size`, `mime_type`
- `created_at`, `updated_at`

### `doc_extractions` Table
- `id` (UUID, primary key)
- `doc_id` (UUID, foreign key to documents)
- `patient_responsibility` (DECIMAL)
- `provider` (TEXT)
- `service_date` (DATE)
- `plain_english_summary` (TEXT)
- `next_steps` (JSONB: array of strings)
- `raw_extraction` (JSONB: full extraction data)

### `line_items` Table
- `id` (UUID, primary key)
- `extraction_id` (UUID, foreign key to doc_extractions)
- `description`, `cpt`, `billed`, `allowed`, `plan_paid`, `you_owe`
- `network_status` (VARCHAR)
- `line_number` (INTEGER)

## Error Handling

### Mock Fallback
If Supabase Storage or database is not configured, endpoints return deterministic mock responses with a `warning` field:
```json
{
  "warning": "Storage not configured; returned mock response.",
  ...
}
```

This ensures mobile can continue development even if backend services aren't fully set up.

### Status Tracking
- `pending_upload`: Document record created, waiting for file upload
- `uploaded`: File uploaded to storage (optional intermediate state)
- `processing`: Analysis in progress
- `analyzed`: Analysis complete, extraction available
- `error`: Analysis failed

## Future Enhancements

1. **OpenAI Vision Integration:** Replace mock extraction with real OCR/vision analysis
2. **Async Processing:** Move analysis to background job queue
3. **Webhook Notifications:** Notify mobile when analysis completes
4. **Retry Logic:** Automatic retry for failed analyses
5. **File Validation:** Validate file type and size before storage
6. **Chunking:** Split large documents into pages for processing
