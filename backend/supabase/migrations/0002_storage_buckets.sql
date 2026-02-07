-- Storage bucket setup for documents
-- Note: This migration documents the bucket configuration.
-- Actual bucket creation should be done via Supabase Dashboard or CLI.

-- Bucket: documents
-- Purpose: Store user-uploaded documents (bills, EOBs, policies, SOBs)
-- Access: Private (users can only access their own documents via RLS)
-- Path structure: user/{user_id}/docs/{doc_id}/{filename}

-- To create the bucket via Supabase Dashboard:
-- 1. Go to Storage > Create Bucket
-- 2. Name: "documents"
-- 3. Public: false (private)
-- 4. File size limit: 10MB (adjust as needed)
-- 5. Allowed MIME types: application/pdf, image/jpeg, image/png, image/heic

-- Storage policies (RLS) are handled by Supabase Auth + RLS on the documents table.
-- Users can only generate signed URLs for their own documents via the backend API.

-- Optional: Create a function to clean up orphaned files
-- (files in storage without corresponding documents table entry)
-- This can be run periodically via a cron job or scheduled task.
