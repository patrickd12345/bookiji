# How to Update the Genome

This guide outlines how to propose changes to the Bookiji OS 11.0 Genome. The Genome is declarative and intentionally **not** imported by runtime code; it is validated by tooling only.

## Steps to propose a change
1. Edit `genome/master-genome.yaml` with the new module, audit feed, or governance attribute.
2. If the rule behavior changes, update `genome/linter-rules.md` to describe how the linter should interpret the new spec fields.
3. Run `pnpm install` (first time) and `pnpm genome:validate` to ensure the linter passes locally.
4. Commit your changes and open a pull request. The CI workflow `.github/workflows/genome-check.yml` will enforce the linter on PRs and pushes to protected branches.

## Governance and evolution notes
- Governance and evolution flags are **not auto-applied**. They rely on humans reviewing the referenced documents for approval.
- Empty roadmap or change-control documents will raise warnings; missing files will fail CI.
- Keep the spec descriptive rather than prescriptive for runtime behavior—the linter is the only consumer.

## Troubleshooting
- If the linter fails to load the YAML, ensure it is valid and that required sections (especially `domains.core.modules`) are present.
- Warnings indicate optional-but-encouraged coverage (e.g., empty drills or documentation gaps). Use them to guide follow-up work without blocking merges.
