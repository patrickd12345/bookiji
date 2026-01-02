#!/usr/bin/env bash
set -euo pipefail

# Usage: ./scripts/create-supabase-migration.sh <name>
if [ $# -lt 1 ]; then
  echo "Usage: $0 <migration-name>"
  exit 2
fi

NAME="$1"

if ! command -v supabase >/dev/null 2>&1; then
  echo "Supabase CLI not found. Install: https://supabase.com/docs/guides/cli"
  exit 3
fi

echo "Creating supabase migration: $NAME"
supabase migration new "$NAME"
echo "Edit the generated file, then run 'supabase db push' from a controlled CI/release environment."

