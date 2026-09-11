# Proposal — PRMS Sync Engine (server)

## 1. Document Control

| Field | Value |
|---|---|
| Spec path | `bilateral/prms-sync/sync-engine` |
| Parent Spec | `bilateral/prms-sync` (see [`../family.md`](../family.md)) |
| Type | Change |
| Approval Mode | gated |
| Date | 2026-08-21 |
| Requirement source | Jira AC-1676 + PRMS Normalizer – Technical Field Documentation + 5 payload examples (cap-sharing, kp, policy, inno_dev, inno_use) |
| Slug | `sync-engine` — derived from free-text argument, not a path literal |

## 2. Intent

When an authorized user triggers PRMS SYNC on an Approved result with a complete Pool Funding Alignment, the server builds the type-specific PRMS Normalizer payload, POSTs it to the correct environment's `/ingest`, records the attempt and outcome durably, and on acceptance marks the result `is_synced_to_prms = true` and **stores the PRMS-assigned result code in `result.prms_result_code`** so STAR permanently references its PRMS counterpart (user requirement 2026-08-21; see family OQ-F7 for when that code becomes available).

## 3. Problem / Current Behavior

- No outbound PRMS ingest integration exists (`domain/tools/` has `prms-toc` — read-only ToC catalog — nothing that pushes results).
- `result.is_synced_to_prms` and `result.prms_result_code` exist (migration `1779190000002`) but **nothing ever writes them**; they are only read as the 409 read-only gate in `bilateral.service.ts` (:624, :752, :1659).
- The client button's future call has no endpoint to hit.
- No record of sync attempts/outcomes exists anywhere (no auditability, no retry basis).

## 4. Proposed Outcome

- New tool module `domain/tools/prms-normalizer/` (name TBD at design) following TRD §9.1 rules: one Nest service, transport encapsulated, host + credentials via `ARI_*` env vars, `BaseApi` reuse where it fits.
- **Payload builders per PRMS type** — `capacity_sharing`, `knowledge_product`, `policy_change`, `innovation_development`, `innovation_use` — mapping the Result aggregate + Pool Funding Alignment to the Normalizer contract: common fields (`created_date`, `created_by`, `submitted_by`, `lead_center`, `title`, `description`, `geo_focus`, `contributing_center`, `contributing_partners`, `evidence`, `contributing_bilateral_projects` from the AGRESSO grant title) + `toc_mapping` from the **Primary** SP alignment and `contributing_programs` from Contributing SPs + the type-specific block, honoring the doc's conditional validations (geo scope rules, policy_type id=1 amount rules, innovation-use disaggregation rules).
- **Sync endpoint** (shape at design; e.g. `POST /api/v1/results/:resultCode/prms-sync`) guarded by: result Approved, alignment complete, `@Roles` (+ `ResultStatusGuard` pattern), idempotency (already-synced → 409).
- **State persistence:** an append-only `result_prms_sync_log` (attempt, environment, request payload, response, `requestId`, outcome, actor, timestamps — `AuditableEntity`) + derived result-level status. Status vocabulary designed **extensible** to the future PRMS-side accept/reject phase.
- **Environment routing (K-005 / R-F2):** `ARI_PRMS_NORMALIZER_HOST` per environment — local/dev point to TEST, prod to PROD. Never a code-level `if (env)` fork beyond reading the var.
- Swagger decorators, `LoggerUtil` logging, sibling specs, ≥60% coverage on touched units.

## 5. Scope

Server package only. Integration tool + payload mapping + endpoint + persistence + migration (append-only) + unit/e2e tests + `.env.example` entry. A **TEST-env spike task** validating one real payload per type against the Normalizer TEST `/ingest` (closes OQ-F5 and proves the field mapping).

## 6. Non-Goals

- No client changes (child 2). No re-sync UI (child 3). No PI panel (child 4).
- No capture of PRMS-side SP-leader accept/reject (future family member; states only left extensible).
- No `op: delete`/un-sync, no bulk ingest endpoint (single-result normal ingest only; bulk API noted for a future need).
- No OICR mapping — **confirmed excluded** (OQ-F2 closed 2026-08-21). No `other_output`/`other_outcome` in v1 (no examples shared; add via manifest edit if ever needed).

## 7. Affected Users, Systems, And Specs

| Who/What | Effect |
|---|---|
| PRMS Normalizer (TEST/PROD) | New outbound consumer |
| `Result` entity | Writers appear for `is_synced_to_prms`, `prms_result_code` |
| `bilateral.service.ts` 409 gate | Now reachable end-to-end (was dormant) |
| MySQL | New sync-log table (migration) |
| Archived specs `bilateral--*` | Alignment data becomes the `toc_mapping` source |

## 8. Visual Reference

- Source: None (backend-only child). The family's mockup (Image #60) governs children 2–4.

## 9. Requirement Delta Preview

### ADDED
- Outbound PRMS Normalizer integration with per-type payload builders and conditional-validation compliance.
- Sync trigger endpoint with governance (status + alignment + role + idempotency).
- Durable sync attempt log + derived sync status; `is_synced_to_prms`/`prms_result_code` written on acceptance.
- Per-environment host configuration.

### MODIFIED
- Result aggregate gains a sync-state read surface (metadata endpoint enrichment for children 2–4).

### REMOVED
- None.

## 10. Approach Options

| Option | Description | Trade-off |
|---|---|---|
| **A (recommended)** | Synchronous request/response on the endpoint: build → POST → record → flip flag; failures recorded as `FAILED`, retry is manual (children 2–3) | Simplest honest v1; user waits ~1 network round-trip; matches "simple pero con efectividad" |
| B | Queue-backed (RabbitMQ `ARI_QUEUE`) async sync with automatic retries | More resilient, but hides outcome from the click, adds consumer complexity now; premature before verdict-capture phase |
| C | Cron-driven batch sync of all eligible results | Contradicts the requirement (explicit user-triggered sync) |

**Recommended: A.** The Normalizer is itself async downstream (R-F1); adding our own queue stacks two async hops before anyone needs it. Manual re-sync (child 3) covers failures.

## 11. Risks, Dependencies, And Open Questions

Inherits R-F1..R-F3 and the OQ statuses from [`../family.md`](../family.md) — **the transport/auth contract is changing to a hook model; do NOT start `/akili-specify` before the 2026-08-25 PRMS info lands** (family hold). `lead_center`: CIAT (46) and Bioversity (49) sent separately per the contract's Lead Center. Child-specific: mapping completeness per type is the main effort/risk — the spike task de-risks it first; `evidence.link` values in STAR may not be URIs the schema accepts.

## 12. Success Criteria

- One real result per supported type accepted by the TEST Normalizer (spike evidence: verbatim response with `requestId`), and the spike documents **where the PRMS result code appears** in the response metadata (OQ-F7).
- When the code is present in the acceptance response, it is persisted to `result.prms_result_code` in the same transaction that flips `is_synced_to_prms`; when absent, the log row records that fact instead of a silent NULL.
- A sync attempt always leaves a log row, success or failure; acceptance flips `is_synced_to_prms` and the alignment PATCH then 409s (existing gate test extended end-to-end).
- Guards proven with allowed + denied cases (role, status, incomplete alignment, already-synced).
- Zero PROD ingest calls possible from local/dev (env routing test, KZ-017: name what the test cannot reach).

## 13. Next Step

```text
/akili-specify bilateral/prms-sync/sync-engine
```
