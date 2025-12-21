#!/usr/bin/env bash
set -euo pipefail

if [ "${RECOVERY_ENV:-0}" != "1" ]; then
  echo "RECOVERY_ENV=1 is required."
  exit 1
fi

if [ -z "${DATABASE_URL_RECOVERY:-}" ]; then
  echo "DATABASE_URL_RECOVERY is required."
  exit 1
fi

if [ -z "${SUPABASE_PROJECT_REF_RECOVERY:-}" ]; then
  echo "SUPABASE_PROJECT_REF_RECOVERY is required."
  exit 1
fi

allow_list="${RECOVERY_ALLOWED_PROJECT_REFS:-}"
deny_list="${RECOVERY_DENY_PROJECT_REFS:-}"

if [ -n "$deny_list" ] && echo ",${deny_list}," | grep -qi ",${SUPABASE_PROJECT_REF_RECOVERY},"; then
  echo "Project ref is explicitly denied."
  exit 1
fi

if [ -n "$allow_list" ] && ! echo ",${allow_list}," | grep -qi ",${SUPABASE_PROJECT_REF_RECOVERY},"; then
  echo "Project ref is not in RECOVERY_ALLOWED_PROJECT_REFS."
  exit 1
fi

case "${SUPABASE_PROJECT_REF_RECOVERY}" in
  *prod*|*production*)
    echo "Project ref looks like production."
    exit 1
  ;;
esac

if echo "${DATABASE_URL_RECOVERY}" | grep -qi "prod"; then
  echo "DATABASE_URL_RECOVERY looks like production."
  exit 1
fi

dump="${1:-}"
if [ -z "$dump" ]; then
  echo "Usage: import_db.sh <dump.sql|dump.backup|dump.dump>"
  exit 1
fi

if [ ! -f "$dump" ]; then
  echo "File not found: $dump"
  exit 1
fi

run_id="${RECOVERY_RUN_ID:-$(date -u +%Y%m%d-%H%M%SZ)_import-db}"
logdir="./recovery-logs/${run_id}"
mkdir -p "$logdir"
logfile="$logdir/run.log"
echo "Log: $logfile"

ext="${dump##*.}"
cmd=()

if command -v pg_restore >/dev/null && [[ "$ext" =~ ^(backup|dump)$ ]]; then
  cmd=(pg_restore --no-owner --no-privileges --single-transaction --dbname "$DATABASE_URL_RECOVERY" "$dump")
  if [ "${DISABLE_TRIGGERS:-0}" = "1" ]; then
    cmd=(pg_restore --no-owner --no-privileges --disable-triggers --single-transaction --dbname "$DATABASE_URL_RECOVERY" "$dump")
  fi
elif command -v psql >/dev/null && [ "$ext" = "sql" ]; then
  cmd=(psql "$DATABASE_URL_RECOVERY" -v ON_ERROR_STOP=1 --single-transaction -f "$dump")
else
  echo "Missing pg_restore or psql (or unsupported dump extension)."
  exit 1
fi

if [ "${DISABLE_TRIGGERS:-0}" = "1" ] && [ "$ext" = "sql" ]; then
  echo "DISABLE_TRIGGERS=1 is only supported with pg_restore (custom dumps)."
fi

echo "[command] ${cmd[*]}" | tee -a "$logfile"
"${cmd[@]}" 2>&1 | tee -a "$logfile"
echo "Done. See logs: $logfile"
