# Requirements — PRMS Sync / Platform identity for TIP results

- **Module:** prms-sync (server) + bilateral (client read)
- **Spec id:** 2026-10-prms-platform-identity
- **Status:** draft
- **Owner:** David Casañas
- **Linked PRD section:** `docs/prd.md` — PRMS as downstream consumer; external result ingestion (TIP)
- **Linked tickets:** AC-1761 (phase 2)
- **Family:** [`../family.md`](../family.md) — child 1 of 3
- **Depth:** Full (shared-table migration + webhook correlation)
- **Approval mode:** gated
- **Extends:** `docs/specs/bilateral/prms-sync/sync-engine`, `docs/specs/bilateral/prms-sync/decision-webhook`, `docs/specs/changes/tip-kp-project-pool-funding`
- **Last updated:** 2026-10-21

---

## 1. Executive summary

Before any TIP result is pushed to PRMS (child 3), STAR must be able to tell a TIP result from a STAR result **everywhere a PRMS sync is recorded or matched**. Today it cannot: official codes are numbered per platform, so TIP `123` and STAR `123` can both exist in the same year, and every sync record keys on code + year only.

This spec makes the sync log, the decision history, the webhook matching and the reference sent to PRMS carry the platform — and fixes the phase-1 defect that hides the Pool Funding section on TIP results in the STAR client.

STAR behavior does not change: existing STAR rows are backfilled as `STAR` (design §5 gives the exact rules), and STAR keeps sending the bare code.

## 2. Glossary

| Term | Meaning |
| --- | --- |
| Platform | `results.platform_code` — `STAR`, `PRMS`, `TIP`, `AICCRA`, `BILATERAL` (`ReportingPlatformEnum`) |
| Sync log | `result_prms_sync_log` — one row per outbound push attempt |
| Decision history | `result_prms_sync_history` — append-only record of outbound pushes and inbound PRMS decisions |
| External reference | The identifier STAR sends PRMS for a result, returned on every ingest row and on the decision webhook |
| Live row | The `results` row with `is_snapshot = false` |

## 3. System context & scope (current behavior, cited)

| Today | Evidence |
| --- | --- |
| Official codes are numbered per platform | `src/domain/entities/results/results.service.ts:496-515` |
| The sync log has no platform; attempts are counted per code + year | `result-prms-sync-log.entity.ts:14-19`; `result-prms-sync-log.repository.ts:310-318` |
| The decision history has no platform; `event_source` means sender (`STAR`/`PRMS`), not platform | `prms-webhook-delivery.entity.ts:28-35` |
| Inbound webhook matching is hard-wired to STAR | `delivery-correlator.service.ts:28-34` |
| Status/history readers, mapping diff/apply and the delivery repository key on code + year | `result-prms-sync-status.reader.ts:22-26,64-71`; `prms-sync-history.reader.ts:27-44`; `pool-funding-mapping-diff.service.ts:58-64`; `pool-funding-mapping-apply.service.ts:39`; `prms-webhook-delivery.repository.ts:286,304,378,426` |
| The external reference is the bare official code | `common-fields.builder.ts:430-437` |
| The PRMS code is copied onto the live row with `platform_code = 'STAR'` | `result-prms-sync-log.repository.ts:609-638` |
| The STAR client never requests Pool Funding for a non-STAR code | `client/research-indicators/src/app/shared/utils/platform-code.util.ts:38-42` (`POOL_FUNDING_PLATFORMS = [STAR]`); `client/…/shared/services/bilateral.service.ts:164-167`; tab hidden when `!alignment` — `result-sidebar.component.ts:125` |

(Paths without a package prefix are under `server/researchindicators/src/domain/`.) Citations come from a scout run against HEAD `1f56dda25`; `design.md` re-verifies each one it depends on in its Premise Ledger.

**In scope:** the two tables, their readers/writers, the webhook correlator, the external reference builder, the live-row PRMS code copy, the client Pool Funding fetch for TIP.
**Out of scope:** pushing TIP results (child 3), versioning TIP results (child 2), any change to the STAR gate, any UI beyond showing the existing section.

## 4. Stakeholders

| Persona | Need |
| --- | --- |
| MEL / PRMS reviewers | A PRMS decision lands on the result it was made about |
| Project contributors (STAR) | Their synced results and history are unaffected |
| TIP knowledge-product owners | Imported pool-funding alignment is visible read-only (phase-1 promise) |

## 5. Functional requirements

### R-PPI-001 — Sync records carry the result's platform

The sync log and the decision history SHALL store the platform of the result each row belongs to.

#### Scenario: Existing rows
- GIVEN the tables hold rows written before this change
- WHEN the migration runs
- THEN every existing sync-log row reads platform `STAR`
- AND every existing history row that was correlated to a result, or was sent by STAR with a numeric code, reads `STAR`
- BUT a history row whose reference never matched a result keeps no platform
- AND IT MUST be reversible (the down migration removes the column and its index without losing other data)

#### Scenario: New push row
- GIVEN a result of platform P is pushed
- WHEN the sync log and the outbound history row are written
- THEN both rows carry platform P

### R-PPI-002 — Reads never mix platforms

Every read of the sync log or the decision history for a result SHALL be scoped by the result's platform as well as code and year.

#### Scenario: Same code and year on two platforms
- GIVEN STAR result `123` (2026) has 2 sync attempts and a PRMS decision
- AND TIP result `123` (2026) has none
- WHEN the sync status, the history, the attempt number, or the pool-funding mapping diff/apply is read for the TIP result
- THEN it sees no STAR row
- AND the next attempt number for the TIP result is 1
- BUT the STAR result's status, history and next attempt number are exactly what they were before the change

### R-PPI-003 — TIP results are identified to PRMS with a platform prefix

The external reference sent to PRMS SHALL be `TIP-<official_code>` for a TIP result.

#### Scenario: Reference by platform
- GIVEN a TIP result with official code `123`
- WHEN its ingest payload is built
- THEN `external_reference` is `TIP-123`
- BUT for a STAR result it MUST stay the bare code (`123`) — unchanged for results already synced

### R-PPI-004 — Inbound PRMS decisions match the right platform

An inbound decision SHALL be correlated to the result whose platform and code the external reference names.

#### Scenario: TIP decision
- GIVEN TIP `123` and STAR `123` exist for 2026
- WHEN a decision arrives with external reference `TIP-123`
- THEN it is recorded against TIP `123`
- AND STAR `123`'s history is unchanged

#### Scenario: Bare reference
- WHEN a decision arrives with external reference `123`
- THEN it is correlated to STAR `123`, exactly as today
- AND IT MUST NOT be matched to a TIP result

#### Scenario: Unknown prefix
- WHEN the reference carries a prefix that names no supported platform (e.g. `XYZ-123`)
- THEN the delivery is recorded as uncorrelated, as an unknown reference is today

### R-PPI-005 — The PRMS code reaches the live row of the result's own platform

When a push returns a PRMS result code, it SHALL be copied onto the live row of the same platform and official code (the live row may belong to another reporting year than the pushed version, as for STAR today).

#### Scenario: TIP push settles
- GIVEN TIP `123` and STAR `123` (2026) both have live rows
- WHEN a push of TIP `123` settles with a PRMS code
- THEN TIP `123`'s live row carries the code
- AND STAR `123`'s live row is untouched

### R-PPI-006 — Pool Funding section visible for TIP results

The STAR client SHALL request and show the Pool Funding alignment for TIP results, read-only, under the same visibility rule it applies today (`eligible || display_only`).

#### Scenario: TIP result with imported alignment
- GIVEN a TIP result whose server alignment read returns `display_only: true` (phase 1, R-TIP-006)
- WHEN the user opens the result in STAR
- THEN the Pool Funding tab is shown
- AND every field is read-only
- BUT it must NOT be editable, and no save is offered

#### Scenario: TIP result without alignment
- GIVEN a TIP result that is not eligible and has no imported alignment
- WHEN the user opens it
- THEN the tab stays hidden, as for a STAR result in the same state

#### Scenario: Other platforms
- GIVEN an AICCRA or PRMS result
- THEN the client behaves exactly as today (no request)

## 6. Non-functional requirements

### NFR-PPI-001 — STAR regression
- **Category:** reliability
- **Target:** for STAR results, sync status, history, attempt numbering, webhook correlation, external reference and the PRMS code copy are byte-for-byte unchanged.
- **How verified:** the existing `result-prms-sync`, `prms-webhook` and `bilateral` suites stay green unchanged, plus a platform-collision test per reader.

### NFR-PPI-002 — Migration safety
- **Category:** reliability
- **Target:** append-only migration; up + down both run on the disposable TEST schema; no lock-heavy rewrite beyond the two sync tables.
- **How verified:** `migration:test:bootstrap` + `migration:test:revert` on a fresh container (FP-49).

## 7. Defect classes → gate

| Defect class | Gate |
| --- | --- |
| A reader still keys on code + year only (cross-platform leak) | Unit test per reader with a same-code/same-year STAR+TIP fixture — falsifier: drop the platform condition → red |
| A filter lives only in the mocked call, not the SQL | **KZ-001 / KZ-017** — assert on generated SQL or run against the TEST schema (`test:integration`), never on the query-builder call sequence |
| Migration does not run / down loses data | `migration:test:bootstrap` then `migration:test:revert` on a fresh container |
| External reference regresses for STAR | Builder unit test asserting the bare code for STAR and `TIP-123` for TIP |
| Correlator matches a TIP decision to STAR | Correlator test with both results present |
| Client still skips TIP | Client unit test on `getAlignment` for a `TIP-` code + sidebar tab visibility |
| PRMS rejects `TIP-` references | **No automated gate** — premise `UNVERIFIED` (design P-18); settled by child 3's first TEST-env push |
| Rendered read-only state of the TIP tab | Human check at the HITL pause (Dev), after deploy |

## 8. Data requirements

- `result_prms_sync_log`: add `platform_code` (`varchar(50)`, as `results.platform_code`), not null; backfilled from the result each row names (STAR when STAR is among the matches or nothing matches) — exact rule in design §5.
- `result_prms_sync_history`: add `platform_code`, nullable (an uncorrelated inbound reference has no platform); backfilled `STAR` for correlated rows and for STAR-sent rows with a canonical numeric code, NULL otherwise — exact rule in design §5.
- Indexes: the current `(code, year)` indexes become `(platform_code, code, year)`.
- Migration: `<timestamp>-addPlatformCodeToPrmsSyncTables.ts`. No data correction beyond the backfill.

## 9. Cross-system impact

- **PRMS Normalizer:** new reference format `TIP-<code>` for TIP only (FD-2).
- **Client:** `platform-code.util.ts` / `bilateral.service.ts` read path only.

## 10. Assumptions, dependencies, risks

| # | Item | Mitigation |
| --- | --- | --- |
| A-1 | PRMS stores and echoes `external_reference` verbatim (prms-sync OQ-F7) | Settle `TIP-` acceptance in design |
| R-1 | A reader missed by the sweep keeps mixing platforms | Repository-wide consumer sweep in design (Premise Ledger `consumer` row) |
| R-2 | No TIP push exists yet, so TIP rows only appear after child 3 | Tests use fixtures; child 3 re-verifies end to end |

## 11. Open questions

| # | Question | Owner | Target |
| --- | --- | --- | --- |
| OQ-1 | Does PRMS accept `TIP-<code>` as `external_reference` (length/charset)? | David Casañas — evidence recorded in design P-18; settled by child 3's first TEST-env push | child 3 |

## 12. Requirement ID index

| ID | Title |
| --- | --- |
| R-PPI-001 | Sync records carry the result's platform |
| R-PPI-002 | Reads never mix platforms |
| R-PPI-003 | TIP results identified to PRMS with a platform prefix |
| R-PPI-004 | Inbound decisions match the right platform |
| R-PPI-005 | PRMS code reaches the live row of the result's own platform |
| R-PPI-006 | Pool Funding section visible for TIP results |
| NFR-PPI-001 | STAR regression |
| NFR-PPI-002 | Migration safety |

## 13. Sign-off

- [ ] Engineering lead — David Casañas
- [ ] MEL / product owner — TBD
