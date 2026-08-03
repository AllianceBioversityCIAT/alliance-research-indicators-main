# US5 — Push Results into the PRMS

| Field | Value |
| --- | --- |
| Jira id | [AC-1441](https://cgiarmel.atlassian.net/browse/AC-1441) |
| Epic | [AC-1385](https://cgiarmel.atlassian.net/browse/AC-1385) |
| Discovery | [PARI-194](https://cgiarmel.atlassian.net/browse/PARI-194) |
| Status | Open |
| Priority | Medium |
| Source | **DRAFT (PO-authored)** — Jira ticket has no description yet |
| Designs | [Figma — push-to-PRMS flow (AC-1413 mockups)](https://www.figma.com/design/5a9xZJdb2rZAQm2wdk1CNT/STAR?node-id=32470-3149&t=jann4Va7PNDV3drp-4) |

> ⚠️ **DRAFT.** This file is a PO proposal. The BA must validate and replace before the SDD feature spec is written.

---

## Story (DRAFT)

> **As a** STAR system (and an admin who needs to retry on failure),
> **I want** STAR (via ARI) to push approved Pool-Funding-aligned results into PRMS using PRMS's bilateral ingestion contract,
> **so that** centers do not have to double-report and PRMS becomes the aggregated reporting destination for bilateral results.

---

## Context (DRAFT)

When a STAR result is **Approved** and has Pool Funding Alignment (US2) + indicator mapping (US4) saved, it must be transmitted to PRMS in the **exact payload shape** PRMS expects on `POST /api/bilateral/create` (or equivalent endpoint after integration is agreed). The contract is the authoritative one documented in [`../prms-context/01-prms-backend-summary.md` §5–§9](../prms-context/01-prms-backend-summary.md) and [`../prms-context/integration-contracts.md`](../prms-context/) — including the type-specific blocks, the user creation rules, the geography rules, and the `idempotencyKey` semantics.

This story is the **integration bridge** between STAR's data and PRMS's bilateral pipeline.

---

## Acceptance criteria (DRAFT)

- **AC.1** When a STAR result transitions to `Approved` AND has at least one Pool Funding mapping saved (US4), a push to PRMS is **triggered automatically**.
- **AC.2** The payload follows the **PRMS bilateral ingestion contract** documented in [`../prms-context/01-prms-backend-summary.md`](../prms-context/01-prms-backend-summary.md) — common DTO + the correct type-specific block for the result type.
- **AC.3** Push includes an **idempotency key** so that retries do not duplicate the result in PRMS.
- **AC.4** Push is authenticated using the **agreed mechanism** between ARI and PRMS (machine token / API key / mTLS — to be confirmed).
- **AC.5** Result of push is **logged** with: result code, target endpoint, request ID, response code, response body summary (no tokens, no PII).
- **AC.6** Successful push:
  - Sets STAR-side `is_synced_to_prms = true` (or equivalent) on the result.
  - Records the PRMS-side `result_code` returned by PRMS (for cross-system traceability).
  - Emits a real-time event (Socket.IO) so STAR UI reflects the new sync state.
  - Locks the Pool Funding Alignment + indicator-mapping sections (US2 AR.2 + US4 AC.7).
- **AC.7** Failed push:
  - Result remains editable.
  - Failure reason is surfaced to admins on a "Sync issues" view.
  - **Retry policy**: exponential backoff for transient errors (5xx, timeouts), no retry on 4xx until human review.
  - Admins can **manually trigger retry** from STAR (matches mockup decision **D-MK-6**).
- **AC.8** Push is **idempotent** end-to-end — retrying the same result with the same idempotency key never creates duplicates in PRMS.
- **AC.9** Authorization for **manual retry**: only `SecRolesEnum.CENTER_ADMIN`, `SecRolesEnum.SYSTEM_ADMIN`, `SecRolesEnum.TECHNICAL_SUPPORT`.
- **AC.10** Operational metrics emitted: pushes/min, success rate, p95 latency, retry count.

---

## Out of scope (DRAFT)

- Modifying PRMS's bilateral ingestion implementation (PRMS owns it).
- Pushing results that are **not** Pool-Funding-aligned.
- Bidirectional sync (PRMS → STAR is US6, scoped differently — W3 Registry, not result data).

---

## Dependencies

| Type | Dependency |
| --- | --- |
| Other US | **US1**, **US2**, **US4** must be live. Out-of-scope for **US3** (display-only) and **US7** (catalog sync). |
| ARI backend | New service `BilateralPushService` under `domain/tools/bilateral-push/` (or under the existing `domain/entities/bilateral/` module). Builds the PRMS-shaped payload from the result + alignment + mapping. Uses HTTP (axios) to call PRMS. Logs to `sync_process_log`. |
| ARI status workflow | Approving a result triggers the push via a hook on `result_status_workflow` transitions, OR via a scheduled job that scans for approved-and-not-yet-synced results. |
| PRMS integration | PRMS exposes the bilateral ingestion endpoint and accepts the agreed auth mechanism. Without this in place, US5 cannot ship. |
| External | Network reachability between ARI and PRMS environments. |

---

## Open questions

- **OQ-US5-1.** **Auth mechanism between ARI and PRMS**: machine token (ARI-style), API key (PRMS-style), or mTLS? Cross-reference decision **D1** in `../prms-context/03-reuse-and-decisions.md` — but that decision is about INBOUND auth to ARI, not OUTBOUND from ARI to PRMS. New decision needed.
- **OQ-US5-2.** **Trigger mechanism**: synchronous on the Approve transaction (slower, simpler, riskier), OR async via a scheduled job / queue worker (faster perceived UX, more reliable, more moving parts)?
- **OQ-US5-3.** **PRMS error model**: how does PRMS communicate per-row failures in bulk pushes? Do we always push one-at-a-time?
- **OQ-US5-4.** **Idempotency key strategy** — UUIDv4 per push attempt, or deterministic from `result_code + version_id`? Deterministic is safer for true idempotency.
- **OQ-US5-5.** **Backwards-compatibility typos** (`has_unkown_using`, `readinness_level_id`) — confirmed preservation per **D12**.
- **OQ-US5-6.** **Re-push policy**: if a synced result is **un-locked** and edited (per US2 AR.2 exception path — OQ-US2-3), does that trigger a re-push? PRMS bilateral contract doesn't define UPDATE semantics today.
- **OQ-US5-7.** **Rate limits**: any PRMS-side throttling we must respect?
- **OQ-US5-8.** **Result-type coverage in Phase 1** — does Phase 1 push types 1, 5, 6, 7 only (per Phase 1 recommended scope in `../prms-context/03-reuse-and-decisions.md` §6)?

---

## Traceability

- Jira: https://cgiarmel.atlassian.net/browse/AC-1441
- Epic: https://cgiarmel.atlassian.net/browse/AC-1385
- Discovery: https://cgiarmel.atlassian.net/browse/PARI-194
- Figma: https://www.figma.com/design/5a9xZJdb2rZAQm2wdk1CNT/STAR?node-id=32470-3149&t=jann4Va7PNDV3drp-4
- PRMS-context (full ingestion contract): [`../prms-context/01-prms-backend-summary.md` §4–§14](../prms-context/01-prms-backend-summary.md)
- PRMS-context (ARI mapping): [`../prms-context/02-ari-mapping.md`](../prms-context/02-ari-mapping.md) §5
- PRMS-context (decisions D11, D12, D15): [`../prms-context/03-reuse-and-decisions.md`](../prms-context/03-reuse-and-decisions.md)

---

## Notes for the SDD feature spec

- **ARI side**:
  - New module `domain/tools/bilateral-push/` (or `domain/entities/bilateral/` sub-folder) holding the service + DTO mappers + HTTP client.
  - Mappers per result type: STAR/ARI entity → PRMS bilateral DTO (common DTO + typed block).
  - `sync_process_log` rows per attempt (status, target endpoint, response).
  - Schedule via existing `domain/tools/cron-jobs/` if OQ-US5-2 = async.
  - Real-time event `result.bilateral.pushed` via Socket.IO (per **D16** in prms-context).
  - Snapshots: per **D10**, approval already snapshots; push reads the snapshot to send PRMS an immutable version.
- **STAR side**:
  - "Sync issues" admin view consuming a new endpoint (e.g. `GET /api/v1/bilateral/push-failures`).
  - Manual retry button gated to admin roles.
  - Status badge on the result detail page reflecting `is_synced_to_prms`.
- **Test coverage**:
  - Payload-shape tests against `bilateral-result-summaries.en.md` (the field-level contract).
  - Idempotency — same key never creates a duplicate.
  - Retry behavior on transient vs permanent errors.
  - Authorization on manual retry.
  - Lock/unlock behavior of US2/US4 sections.
- **This is the highest-risk US** — it crosses a system boundary. Coordinate with the PRMS team early and confirm OQ-US5-1, OQ-US5-2, OQ-US5-3 before specifying.
