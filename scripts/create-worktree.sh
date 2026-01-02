#!/usr/bin/env bash
set -euo pipefail

# Usage: ./scripts/create-worktree.sh feature/short-desc
if [ $# -lt 1 ]; then
  echo "Usage: $0 <branch-name>"
  exit 2
fi

BRANCH="$1"
WT_DIR="../bookiji-${BRANCH//\//-}"

git fetch origin
if git rev-parse --verify --quiet "$BRANCH" >/dev/null; then
  echo "Branch exists locally: $BRANCH"
else
  git checkout -b "$BRANCH"
  git push -u origin "$BRANCH"
fi

echo "Creating worktree at $WT_DIR"
git worktree add "$WT_DIR" "$BRANCH"
echo "Worktree ready: $WT_DIR"

