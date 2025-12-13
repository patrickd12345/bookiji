Verification Rules (Phase 12)
- Recompute every hash with the documented algorithm: deterministic JSON serialization with lexicographically sorted keys, SHA-256 digest.
- ReasoningArtifact integrity: zero out `artifact_id`, hash the artifact body, compare to `identity.artifact_id`.
- Governance binding: recompute `deterministicHash(provenance.governance)` and match `deployment.governance_snapshot_hash`.
- Deployment binding: recompute the DeploymentFingerprint hash (empty `fingerprint_id`) and match `fingerprint_id`; environment classification must match the declared verification target.
- Genome binding: `provenance.deployment.genome_hash` must equal `provenance.genome_hash`.
- External adapters: policy must be `external-adapter-policy/v1`; all adapter flags must be false; `external_adapter_usage` must be empty.
- Full Disclosure Audit Report integrity: zero out `report_id`, hash the report body, compare to `report_id`.
- Input closure: recompute `hash_closure` from the ordered `input_closure.inputs` array.
- Artifact evidence: each entry’s `artifact_hash` must equal the embedded artifact’s `artifact_id`; artifacts must share the deployment fingerprint declared in the report.
- Failure conditions: any mismatch above, missing uncertainty/disagreement entries, environment mismatch, or altered limits invalidates verification.

Guarantees
- Deterministic, hash-closed artifacts (reasoning-artifact/v1).
- Governance-bound provenance with preserved disagreement and mandatory uncertainty.
- Deployment fingerprint binding (deployment-fingerprint/v1) covering genome hash, governance snapshot, config allowlist, git commit, build id, and environment classification.
- Full Disclosure audit closure (full-disclosure-audit/v1) including input closure and artifact hashes.
- External orchestration adapters are non-authoritative and cannot emit, mutate, or verify artifacts.

Explicit Non-Guarantees
- No claim of correctness, truth, or completeness of reasoning.
- No promise of real-world outcomes, interventions, or actions.
- Inputs absent from the listed digests are excluded by design (closed world).
- Post-deployment drift or configuration outside the fingerprint is not captured.
- External adapters (LangChain, n8n, others) have zero authority; their outputs are rejected from artifact and audit paths.
