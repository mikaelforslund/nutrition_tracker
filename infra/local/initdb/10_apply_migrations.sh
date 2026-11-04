#!/bin/sh
# Runs on first database boot only. Use `pnpm db:reset` to re-apply.
set -eu

for migration in /supabase/migrations/*.sql; do
  echo "Applying ${migration}"
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -f "$migration"
done

echo "Applying seed data"
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -f /supabase/seed.sql
