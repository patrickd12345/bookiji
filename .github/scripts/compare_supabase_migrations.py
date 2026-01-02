import argparse
import json
import os
import re
import sys
from pathlib import Path


MIGRATION_FILE_RE = re.compile(r"^\d{14}_.+\.sql$")


def _normalize(name: str) -> str:
    n = (name or "").strip()
    if n.endswith(".sql"):
        n = n[: -len(".sql")]
    return n


def _extract_remote_names(payload) -> list[str]:
    # `supabase migration list --output json` shape can vary by CLI versions.
    # Handle common shapes:
    # - [ { name: "20250101_x" , ... }, ... ]
    # - { migrations: [ ... ] }
    # - [ "20250101_x", ... ]
    if isinstance(payload, dict):
        for key in ("migrations", "data", "result", "items"):
            value = payload.get(key)
            if isinstance(value, list):
                payload = value
                break

    if not isinstance(payload, list):
        raise ValueError(f"Unexpected JSON shape for remote migrations: {type(payload).__name__}")

    names: list[str] = []
    for item in payload:
        if isinstance(item, str):
            names.append(_normalize(item))
            continue

        if isinstance(item, dict):
            # Prefer explicit name-like fields.
            for key in ("name", "migration", "version", "file", "filename"):
                value = item.get(key)
                if isinstance(value, str) and value.strip():
                    names.append(_normalize(value))
                    break
            continue

    # Remove empties while preserving order
    out: list[str] = []
    seen: set[str] = set()
    for n in names:
        if not n:
            continue
        if n in seen:
            continue
        seen.add(n)
        out.append(n)
    return out


def _list_local_migrations(repo_root: Path) -> list[str]:
    migrations_dir = repo_root / "supabase" / "migrations"
    if not migrations_dir.exists():
        raise FileNotFoundError(f"Missing migrations directory: {migrations_dir}")

    local = []
    for p in migrations_dir.glob("*.sql"):
        if MIGRATION_FILE_RE.match(p.name):
            local.append(_normalize(p.name))

    # Lexicographic order matches timestamp order for yyyyMMddHHmmss_* format.
    local.sort()
    return local


def _append_summary(lines: list[str]) -> None:
    summary_path = os.environ.get("GITHUB_STEP_SUMMARY")
    if not summary_path:
        return
    try:
        with open(summary_path, "a", encoding="utf-8") as f:
            for line in lines:
                f.write(line.rstrip("\n") + "\n")
    except Exception:
        # Never crash the check because summary writing failed.
        return


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--env", required=True, help="Environment label for reporting (e.g. staging, production)")
    parser.add_argument("--remote-json", required=True, help="Path to JSON from `supabase migration list --output json`")
    args = parser.parse_args()

    repo_root = Path(__file__).resolve().parents[2]
    local = _list_local_migrations(repo_root)

    with open(args.remote_json, "r", encoding="utf-8") as f:
        payload = json.load(f)
    remote = _extract_remote_names(payload)

    local_set = set(local)
    remote_set = set(remote)

    missing_on_remote = [m for m in local if m not in remote_set]
    extra_on_remote = [m for m in remote if m not in local_set]

    # Order check: all local migrations must appear in remote in the same order.
    remote_index = {name: idx for idx, name in enumerate(remote)}
    order_errors = []
    last_idx = -1
    for name in local:
        idx = remote_index.get(name)
        if idx is None:
            continue
        if idx < last_idx:
            order_errors.append(name)
        last_idx = idx

    summary_lines = [
        "",
        f"## Supabase migrations drift check ({args.env})",
        "",
        f"- Repo migrations: **{len(local)}**",
        f"- Remote migrations: **{len(remote)}**",
    ]

    if missing_on_remote:
        summary_lines += ["", "### ❌ Missing on remote", "```"]
        summary_lines += missing_on_remote
        summary_lines += ["```"]

    if extra_on_remote:
        summary_lines += ["", "### ❌ Present on remote but missing in repo", "```"]
        summary_lines += extra_on_remote
        summary_lines += ["```"]

    if order_errors:
        summary_lines += [
            "",
            "### ❌ Order mismatch",
            "Remote contains local migrations out of order (this indicates history divergence).",
            "```",
            *order_errors,
            "```",
        ]

    if not missing_on_remote and not extra_on_remote and not order_errors:
        summary_lines += ["", "✅ Repo and remote migrations match (no drift detected)."]

    _append_summary(summary_lines)

    if missing_on_remote or extra_on_remote or order_errors:
        print(f"[FAIL] Supabase migrations drift detected ({args.env}).", file=sys.stderr)
        if missing_on_remote:
            print(f"Missing on remote ({len(missing_on_remote)}): {', '.join(missing_on_remote[:20])}", file=sys.stderr)
        if extra_on_remote:
            print(f"Extra on remote ({len(extra_on_remote)}): {', '.join(extra_on_remote[:20])}", file=sys.stderr)
        if order_errors:
            print(f"Order mismatch ({len(order_errors)}): {', '.join(order_errors[:20])}", file=sys.stderr)
        return 1

    print(f"[OK] Supabase migrations match ({args.env}).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

