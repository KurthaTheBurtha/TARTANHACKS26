#!/bin/bash
# Run Supabase migrations
# This script assumes you have Supabase CLI installed or will apply migrations manually

set -e

echo "🔄 Running database migrations..."

# Check if Supabase CLI is available
if command -v supabase &> /dev/null; then
    echo "Using Supabase CLI..."
    # Note: Adjust these commands based on your Supabase setup
    supabase db push || echo "⚠️  Supabase CLI push failed"
    echo "⚠️  Supabase CLI migration not configured. Please apply migrations manually via Supabase dashboard."
else
    echo "⚠️  Supabase CLI not found."
    echo "   Please apply migrations manually:"
    echo "   1. Go to your Supabase project dashboard"
    echo "   2. Navigate to SQL Editor"
    echo "   3. Run migrations from supabase/migrations/"
    echo ""
    echo "   Migration files:"
    ls -1 supabase/migrations/*.sql 2>/dev/null || echo "   No migration files found"
fi

echo ""
echo "✅ Migration script complete"
