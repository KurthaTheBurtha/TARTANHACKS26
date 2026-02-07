#!/usr/bin/env bash
# =============================================================================
# CareMap — Promote integrations-abhay to Main Repo
# =============================================================================
#
# USAGE:
#   Run from repo root:
#   ./integrations-abhay/scripts/promote_to_main.sh [OPTIONS]
#
# OPTIONS:
#   --dry-run    Preview what would be copied without making changes
#   --force      Allow overwriting existing files (with confirmation)
#   --help       Show this help message
#
# WHAT IT DOES:
#   1. Copies Edge Functions to supabase/functions/
#   2. Copies shared contracts to shared/
#   3. Copies SQL to docs/sql/ for manual migration
#   4. Copies mobile types if mobile/src exists
#
# SAFETY:
#   - By default, refuses to overwrite existing files
#   - Shows exactly what would be copied/skipped
#   - Requires --force flag and confirmation to overwrite
#
# =============================================================================

set -e

# -----------------------------------------------------------------------------
# Parse arguments
# -----------------------------------------------------------------------------
DRY_RUN=false
FORCE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --force)
            FORCE=true
            shift
            ;;
        --help)
            head -30 "$0" | tail -27
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# -----------------------------------------------------------------------------
# Counters
# -----------------------------------------------------------------------------
COPIED=0
SKIPPED=0
OVERWRITTEN=0

# Track files for summary
declare -a COPIED_FILES
declare -a SKIPPED_FILES
declare -a OVERWRITTEN_FILES

# -----------------------------------------------------------------------------
# Helper: Safe copy function
# -----------------------------------------------------------------------------
safe_copy() {
    local src="$1"
    local dst="$2"
    
    # Check source exists
    if [ ! -f "$src" ]; then
        return
    fi
    
    # Determine target file path
    local dst_file="$dst"
    if [ -d "$dst" ]; then
        dst_file="$dst/$(basename "$src")"
    fi
    
    # Check if target exists
    if [ -f "$dst_file" ]; then
        if $FORCE; then
            if $DRY_RUN; then
                echo "  [WOULD OVERWRITE] $dst_file"
                echo "                    ← $src"
                ((OVERWRITTEN++))
                OVERWRITTEN_FILES+=("$dst_file")
            else
                echo "  [OVERWRITE] $dst_file"
                cp -v "$src" "$dst_file"
                ((OVERWRITTEN++))
                OVERWRITTEN_FILES+=("$dst_file")
            fi
        else
            echo "  [SKIP] Target exists: $dst_file"
            echo "         Source:        $src"
            echo "         Use --force to overwrite"
            ((SKIPPED++))
            SKIPPED_FILES+=("$dst_file")
        fi
    else
        if $DRY_RUN; then
            echo "  [WOULD COPY] $src"
            echo "            → $dst_file"
            ((COPIED++))
            COPIED_FILES+=("$dst_file")
        else
            # Create parent directory if needed
            mkdir -p "$(dirname "$dst_file")"
            echo "  [COPY] $src"
            echo "      → $dst_file"
            cp "$src" "$dst_file"
            ((COPIED++))
            COPIED_FILES+=("$dst_file")
        fi
    fi
}

# -----------------------------------------------------------------------------
# Check we're in repo root
# -----------------------------------------------------------------------------
if [ ! -f "STATE.md" ] && [ ! -f "state.md" ]; then
    echo "ERROR: Run this script from the repo root (where STATE.md is located)"
    echo "Usage: ./integrations-abhay/scripts/promote_to_main.sh"
    exit 1
fi

# Check integrations-abhay exists
if [ ! -d "integrations-abhay" ]; then
    echo "ERROR: integrations-abhay/ directory not found"
    exit 1
fi

# -----------------------------------------------------------------------------
# Header
# -----------------------------------------------------------------------------
echo "=============================================="
echo "CareMap: Promote integrations-abhay to main"
echo "=============================================="
echo ""

if $DRY_RUN; then
    echo "🔍 DRY RUN MODE — No files will be modified"
    echo ""
fi

if $FORCE; then
    echo "⚠️  FORCE MODE — Existing files may be overwritten"
    echo ""
    if ! $DRY_RUN; then
        read -p "Are you sure you want to proceed with --force? (y/N) " -n 1 -r
        echo ""
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "Aborted."
            exit 0
        fi
        echo ""
    fi
fi

# -----------------------------------------------------------------------------
# 1. Edge Functions → supabase/functions/
# -----------------------------------------------------------------------------
echo "[1/4] Edge Functions → supabase/functions/"
echo ""

if ! $DRY_RUN; then
    mkdir -p supabase/functions/_shared
    mkdir -p supabase/functions/providers-search
    mkdir -p supabase/functions/plans-search
fi

# Shared helpers
for file in geo.ts places.ts normalize.ts; do
    safe_copy "integrations-abhay/supabase/functions/_shared/$file" "supabase/functions/_shared/"
done

# Provider search
for file in index.ts mock.json; do
    safe_copy "integrations-abhay/supabase/functions/providers-search/$file" "supabase/functions/providers-search/"
done

# Plans search
for file in index.ts mock.json; do
    safe_copy "integrations-abhay/supabase/functions/plans-search/$file" "supabase/functions/plans-search/"
done

# -----------------------------------------------------------------------------
# 2. Shared Contracts → shared/
# -----------------------------------------------------------------------------
echo ""
echo "[2/4] Shared contracts → shared/"
echo ""

if ! $DRY_RUN; then
    mkdir -p shared
fi

safe_copy "integrations-abhay/shared/contracts.ts" "shared/contracts.ts"
safe_copy "integrations-abhay/shared/contracts.py" "shared/contracts.py"

# Also copy to backend if it exists
if [ -d "backend/app/models" ]; then
    echo ""
    echo "  → Found backend/app/models, adding Python contracts..."
    safe_copy "integrations-abhay/shared/contracts.py" "backend/app/models/provider_contracts.py"
fi

# -----------------------------------------------------------------------------
# 3. SQL → docs/sql/ (for manual migration)
# -----------------------------------------------------------------------------
echo ""
echo "[3/4] SQL files → docs/sql/"
echo ""

if ! $DRY_RUN; then
    mkdir -p docs/sql
fi

safe_copy "integrations-abhay/supabase/sql/schema.sql" "docs/sql/providers_schema.sql"
safe_copy "integrations-abhay/supabase/sql/seed.sql" "docs/sql/providers_seed.sql"

echo ""
echo "  ℹ Abdoul should merge docs/sql/*.sql into supabase/migrations/"

# -----------------------------------------------------------------------------
# 4. Mobile types (if mobile/ exists)
# -----------------------------------------------------------------------------
echo ""
echo "[4/4] Mobile types → mobile/src/types/"
echo ""

if [ -d "mobile/src" ]; then
    if ! $DRY_RUN; then
        mkdir -p mobile/src/types
    fi
    safe_copy "integrations-abhay/mobile/src/types/contracts.ts" "mobile/src/types/provider-contracts.ts"
else
    echo "  ℹ mobile/src/ not found, skipping mobile types"
fi

# -----------------------------------------------------------------------------
# Summary
# -----------------------------------------------------------------------------
echo ""
echo "=============================================="
if $DRY_RUN; then
    echo "DRY RUN SUMMARY (no changes made)"
else
    echo "PROMOTION SUMMARY"
fi
echo "=============================================="
echo ""
echo "  ✅ Copied:      $COPIED file(s)"
echo "  ⏭  Skipped:     $SKIPPED file(s)"
echo "  ♻️  Overwritten: $OVERWRITTEN file(s)"
echo ""

if [ $SKIPPED -gt 0 ] && ! $FORCE; then
    echo "⚠️  $SKIPPED file(s) skipped because targets exist."
    echo "   Run with --force to overwrite existing files."
    echo ""
fi

if [ $COPIED -gt 0 ] || [ $OVERWRITTEN -gt 0 ]; then
    if ! $DRY_RUN; then
        echo "NEXT STEPS:"
        echo "  1. Review all copied files"
        echo "  2. Update import paths in Edge Functions if needed"
        echo "  3. Abdoul: Merge docs/sql/*.sql into supabase/migrations/"
        echo "  4. Test: supabase functions serve"
        echo "  5. Commit changes"
        echo ""
    fi
fi

# Exit with error if nothing could be copied due to existing files
if [ $COPIED -eq 0 ] && [ $OVERWRITTEN -eq 0 ] && [ $SKIPPED -gt 0 ]; then
    echo "No files were copied. Use --force to overwrite existing files."
    exit 1
fi
