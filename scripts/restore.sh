#!/usr/bin/env bash
set -euo pipefail

DUMP="${1:-}"

if [ -z "$DUMP" ] || [ ! -f "$DUMP" ]; then
  echo "Usage: $0 <path-to-backup.dump>" >&2
  echo "The dump must be a pg_dump custom-format file (-Fc)." >&2
  exit 1
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is required." >&2
  exit 1
fi

if ! command -v pg_restore >/dev/null 2>&1; then
  echo "pg_restore was not found. Install the PostgreSQL client tools." >&2
  exit 1
fi

echo "This will replace the current mirai-kin database."
echo "Dump:  $DUMP"
echo "Target: ${DATABASE_URL%%\?*}"
read -r -p "Continue? [y/N] " answer
if [[ ! "$answer" =~ ^[Yy]$ ]]; then
  echo "Aborted."
  exit 1
fi

pg_restore --clean --if-exists --no-owner --no-privileges -d "$DATABASE_URL" "$DUMP"
echo "Restore complete. Restart the app container and verify the dashboard."
