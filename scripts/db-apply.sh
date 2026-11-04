#!/bin/sh
# Applies one migration to the running local database, keeping existing data:
#   ./scripts/db-apply.sh 20261104000100_food_log_notes.sql
# Fresh databases get every migration on first boot, so this is only for
# databases created before the migration was added.
set -eu

cd "$(dirname "$0")/.."

exec ./scripts/compose.sh exec -T db \
  psql -v ON_ERROR_STOP=1 -U postgres -d postgres -f "/supabase/migrations/$1"
