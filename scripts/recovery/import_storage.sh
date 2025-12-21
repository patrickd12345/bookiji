#!/usr/bin/env bash
set -euo pipefail

if [ "${RECOVERY_ENV:-0}" != "1" ]; then
  echo "RECOVERY_ENV=1 is required."
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

apply=0
path=""
bucket=""
prefix=""

while [ "$#" -gt 0 ]; do
  case "$1" in
    --apply)
      apply=1
    ;;
    --dry-run)
      apply=0
    ;;
    --path)
      shift
      path="${1:-}"
    ;;
    --bucket)
      shift
      bucket="${1:-}"
    ;;
    --prefix)
      shift
      prefix="${1:-}"
    ;;
    *)
      if [ -z "$path" ]; then
        path="$1"
      else
        echo "Unknown argument: $1"
        exit 1
      fi
    ;;
  esac
  shift
 done

if [ -z "$path" ]; then
  echo "Usage: import_storage.sh --path <export-dir> [--bucket <bucket>] [--prefix <prefix>] [--apply]"
  exit 1
fi

if [ ! -d "$path" ]; then
  echo "Directory not found: $path"
  exit 1
fi

bucket="${bucket:-${STORAGE_BUCKET_RECOVERY:-}}"
if [ -z "$bucket" ]; then
  echo "STORAGE_BUCKET_RECOVERY (or --bucket) is required."
  exit 1
fi

run_id="${RECOVERY_RUN_ID:-$(date -u +%Y%m%d-%H%M%SZ)_import-storage}"
logdir="./recovery-logs/${run_id}"
mkdir -p "$logdir"
logfile="$logdir/run.log"

echo "Log: $logfile"

file_count=$(find "$path" -type f | wc -l | tr -d ' ')
echo "Files discovered: $file_count" | tee -a "$logfile"
find "$path" -type f | sed 's#^# - #' | tee -a "$logfile"

dest="sb://${bucket}"
if [ -n "$prefix" ]; then
  dest="${dest}/${prefix}"
fi

if [ "$apply" != "1" ]; then
  echo "Dry-run only. Use --apply to upload." | tee -a "$logfile"
  echo "Would run: supabase storage cp --recursive \"$path\" \"$dest\"" | tee -a "$logfile"
  exit 0
fi

if ! command -v supabase >/dev/null; then
  echo "supabase CLI not found. Install it or use an S3-compatible tool." | tee -a "$logfile"
  exit 1
fi

if supabase storage cp --help >/dev/null 2>&1; then
  echo "[command] supabase storage cp --recursive \"$path\" \"$dest\"" | tee -a "$logfile"
  supabase storage cp --recursive "$path" "$dest" 2>&1 | tee -a "$logfile"
  echo "Done. See logs: $logfile"
  exit 0
fi

echo "supabase storage cp is not available in this CLI version. Update supabase CLI." | tee -a "$logfile"
exit 1
