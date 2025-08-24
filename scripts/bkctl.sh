#!/usr/bin/env bash
# bkctl rollback --booking <id>
set -euo pipefail
cmd="${1:-}"; shift || true
if [[ "$cmd" == "rollback" ]]; then
  if [[ "${1:-}" != "--booking" || -z "${2:-}" ]]; then
    echo "Usage: bkctl rollback --booking <id>" >&2; exit 1
  fi
  booking="$2"
  echo "[bkctl] Rolling back booking $booking ..."
  # TODO: invoke refund + state reversion + audit append
  echo "[bkctl] Done."
else
  echo "bkctl: unknown command '$cmd'"; exit 1
fi
