# Archive Summary — PRMS Sync / Platform identity for TIP results

**Outcome: done.** TIP and STAR results that share an official code and a year no longer mix in PRMS sync. TIP references reach PRMS as `TIP-<code>`. TIP's Pool Funding (with its ToC) is visible read-only in STAR. The owner validated it on the test environment.

## 1. Document Control

| Field | Value |
| --- | --- |
| Spec | PRMS Sync / Platform identity for TIP results (`2026-10-prms-platform-identity`) |
| Family | `changes/tip-prms-phase-2` — child 1 of 3 (row flipped to `done`) |
| Owner | David Casañas |
| Ticket | AC-1761 (phase 2) |
| Branch | `AC-1761-TIP-integration-adjustments-to-push-Knowledge-Products` |

## 2. Original Spec Path

`docs/specs/changes/tip-prms-phase-2/prms-platform-identity/`

## 3. Archive Date

2026-10-22

## 4. Final Status

| Item | Value |
| --- | --- |
| Tasks | 10/10 `[x]` (7 planned + T-08, T-09 from Pivot Record T-07 + T-10 from the T-07 HITL; all owner-approved) |
| Validation | PASS with 4 WARN, no FAIL (`validation-report.md`) |
| Owner HITL | "ya esta en test todo ya lo probe y ya veo toda la data de tip esta perfecta" |
| Review rounds | 12 (budget 11; one over, owner-approved) |

## 5. Requirements Delivered

| Requirement | Delivered |
| --- | --- |
| R-PPI-001 | Sync log + decision history carry `platform_code`; existing rows backfilled reversibly (Dev-dump checksums equal) |
| R-PPI-002 | Status, attempt numbering, history and mapping diff/apply never mix platforms (real-MySQL integration spec) |
| R-PPI-003 | TIP → `TIP-<code>`, STAR bare (PRMS acceptance P-18 settles in child 3) |
| R-PPI-004 | Inbound decisions route by parsed platform; bare → STAR; unknown prefix → uncorrelated |
| R-PPI-005 | PRMS code copies to the live row of the pushed result's own platform |
| R-PPI-006 | Pool Funding tab visible read-only for TIP, incl. its ToC (via T-10) |
| NFR-PPI-001 / 002 | STAR regression-free (full suites); migrations up/down proven on a Dev copy |

## 6. Files Changed Summary

| Area | Files |
| --- | --- |
| Reference + builder | `tools/prms-normalizer/reference/prms-external-reference.ts` (new), `common-fields.builder.ts`, `dto/prms-sync-aggregate.ts`, `result-prms-sync-aggregate.repository.ts` |
| Migrations | `1792673320363-addPlatformCodeToPrmsSyncTables`, `1792681023849-convertPrmsSyncTablesCollation` (+ specs in `src/db/migration-specs/`) |
| Entities | `result-prms-sync-log.entity.ts`, `prms-webhook-delivery.entity.ts` |
| Readers / writers | `result-prms-sync-log.repository.ts`, `result-prms-sync-status.reader.ts`, `prms-webhook-delivery.repository.ts` / `.service.ts`, `result-prms-sync.service.ts`, `prms-sync-history.reader.ts` |
| Correlator / mapping | `delivery-correlator.service.ts`, `pool-funding-mapping-diff.service.ts`, `pool-funding-mapping-apply.service.ts` |
| Config | `orm.config.ts` (`extra.charset` → `utf8mb4_0900_ai_ci`) + spec |
| Bilateral rule | `utils/toc-level-rules.util.ts` (Knowledge Product → `OUTPUT`) |
| Client | `platform-code.util.ts`, `api.service.ts` (+ specs) |
| Tests | `test/prms-platform-identity.integration-spec.ts` (new) and co-located specs |
| Guides | `server/researchindicators/src/CLAUDE.md` §7 + `src/AGENTS.md` (connection collation) |

≈2,900 inserted lines across 48 code files, tests included.

## 7. Test Evidence Summary

| Suite | Result |
| --- | --- |
| Server unit | 434/434 suites, 4290/4290 |
| Client unit | 344/344, 8017/8017 |
| Integration (fresh Dev-dump container) | 8/8; falsifier red on MySQL |
| Migrations on Dev data | `CHECKSUM MATCH: true`; up/down/up identical |

## 8. Validation Summary

PASS, 4 WARN, 0 FAIL — see `validation-report.md`.

## 9. Accepted Warnings Or Follow-Ups

| # | Item | Status |
| --- | --- | --- |
| W1 | `docs/trd/trd.md:216,515` still say MySQL `utf8mb4_unicode_520_ci` | pending item in `docs/specs/kaizen/changes--tip-prms-phase-2--prms-platform-identity.md` (spec branch — applies on `main`) |
| W2 | R-PPI-006 "no save" covered by the owner's general HITL statement | accepted |
| W3 | Budget overrun (10 tasks, 12 rounds) | accepted, owner-approved |
| W4 | early `execution.md` "§10" pointers mean §8 | corrected in the log |
| F1 | RB-3: full `migration:test:bootstrap` blocked by `CreatePiDelegates1787600000000` (pre-existing) | open, needs its own spec |
| F2 | 4R advisories (duplicated `platformCodeOf`, stale automapper comments, legacy-collation tables, test-order mock) | optional future proposal |

## 10. Historical Notes

- T-02 was discarded once by the owner (2026-10-21) and restarted with six lessons carried; the restart's Dev-dump run found the `updated_at` overwrite the synthetic seed could not show.
- Pivot Record T-07: the integration spec on a Dev copy found MySQL 1267 twice (table collation, then connection collation) → T-08 and T-09, both owner decisions after the owner's own end-to-end test on a branch.
- The owner's first HITL look found a TIP Knowledge Product's ToC hidden by the archived OQ-V2-5 rule (`knowledge_product → []`); product confirmed `OUTPUT` → T-10, and the parent spec's R-TIP-004 STAR clause was annotated as superseded.
- Owner preference recorded: DB-touching verification runs on a read-only Dev dump restored into the TEST container.
