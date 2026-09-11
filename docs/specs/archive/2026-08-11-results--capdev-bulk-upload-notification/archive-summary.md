# Archive Summary — Results / CapDev Bulk Upload Notification

## 1. Document Control

- **Spec id:** 2026-08-capdev-bulk-upload-notification
- **Module / package:** `results` (implementation in `ai-reports`) — **server** (`server/researchindicators`)
- **Owner:** David Felipe Casañas Hernández
- **Ticket:** AC-1607 — *Send bulk upload completion email with CapDev metrics*
- **Branch:** `AC-1607-Send-bulk-upload-completion-email-with-CapDev-metrics` (19 commits carrying this spec's `[SPEC:…]` prefix)
- **Depth:** Full (DB migration + outbound email to external humans + AI-service contract change)

## 2. Original Spec Path

`docs/specs/results/capdev-bulk-upload-notification`

## 3. Archive Date

**2026-08-11**

## 4. Final Status

**Delivered and validated `PASS`. Ships dark — merged with the kill switch seeded `false`.**

| Phase | Outcome |
| --- | --- |
| Specify + Judgment Day | APPROVED after 2 blind dual-review rounds; 5 confirmed-SEVERE + 5 verified single-judge findings corrected **before any code** |
| Execute | **12/12 tasks, every one PASS on attempt 1.** Zero Reviewer FAILs, zero HALTs, zero pivots |
| Test | `PASS`, 0 `PRODUCT_BUG`. A coverage audit found and closed **6 ungated ACs** by mutation |
| Validate | `PASS` — 0 FAIL, 7 WARN, 8 advisories. All 4 documentation WARNs fixed during the phase |

## 5. Requirements Delivered

11 functional + 5 non-functional, all covered and gated. Full clause-level matrix in `test-report.md` §8.

| ID | Delivered |
| --- | --- |
| R-CBU-001 | Notification fires after a successful CapDev bulk upload; zero-CapDev batches send nothing |
| R-CBU-002 | One email per project group, scoped by primary contract; unattributed results named in a warn log |
| R-CBU-003 | PI from Agresso as the **sole** `To`; never backfilled from CC; 3-tier salutation |
| R-CBU-004 | CC assembled from 6 sources, sanitised, deduplicated case-insensitively; drops reported via a pure return value |
| R-CBU-005 | `metadata.contacts` on the AI bulk payload — optional, backward compatible, Swagger-documented |
| R-CBU-006 | Per-group metrics with every degenerate case resolved in TypeScript, including the `<1%` floor clause |
| R-CBU-007 | Rendered from a DB-stored Handlebars template; missing template ⇒ no blank email, one error log |
| R-CBU-008 | 9 additive nullable columns on `bulk_upload_processes`, written from the same values the email uses |
| R-CBU-009 | `EMAIL.CAPDEV_BULK_UPLOAD.ENABLED` kill switch; **absent config resolves to disabled** |
| R-CBU-010 | Two containment boundaries — nothing from the notification stage can fail a bulk upload |
| R-CBU-011 | Counts at info, addresses only at debug, durable status on the process row |
| NFR-CBU-001…005 | O(groups) queries · no duplicate per process · data minimisation · coverage · migration safety |

## 6. Files Changed Summary

Measured over the 19 spec commits (`git diff --shortstat <first>~1..HEAD`):

| Scope | Figure |
| --- | --- |
| Code (`src/` + `test/`) | **31 files, 6,215 insertions, 6 deletions** |
| Spec documents | 6 files, 3,052 lines |

**Only 6 deletions across the whole feature** — the design's "everything is additive" claim held literally. The one existing line changed in a non-additive way is `results.service.ts:1058`, where a discarded return value starts being captured.

| Area | What landed |
| --- | --- |
| New module surface | `ai-reports/notifications/` — service, repository, 2 pure modules (recipients builder, metrics formatter), 2 DTOs, 1 enum, all with sibling specs |
| Migrations (3, additive) | 9 nullable columns · 1 `sec_template` row · 2 `app_config` rows |
| Modified | `results.service.ts` (capture + wrapped dispatch), `ai-reports.module.ts` (imports/providers/exports), `result-ai.dto.ts` (`AiContactDto`), `template.enum.ts`, `env-app-config.util.ts` (2 non-throwing accessors), `app-config-catergory.enum.ts` |
| Tests | e2e suite for the payload contract + `jest-e2e.json` `forceExit`/`testTimeout` |

## 7. Test Evidence Summary

| Suite | Result |
| --- | --- |
| Backend unit | **328 suites / 2,214 tests passed** |
| Coverage (floor 60 ×4) | **83.98 / 75.06 / 85.15 / 83.99** — no breach |
| Backend e2e | **4/4, 5.175 s, exit 0** |
| `PRODUCT_BUG` | **0** |

The `/akili-test` audit's value was not the count but a single question asked of every AC: *would this test fail if the behavior broke?* For six ACs the answer was no. Each was proven ungated by mutation, closed, and re-proven red under the same mutation — **with zero production files touched**.

## 8. Validation Summary

`PASS` — **0 FAIL, 7 WARN, 8 advisories**. Every gate was re-run independently rather than inherited; the unit and e2e numbers reproduced exactly.

Validation also closed the spec's last blocking evidence item: `test-report.md` §9 **R1a** (the `testTimeout: 120000` fix was committed but never observed green) is now discharged by a measured 4/4 run.

Four documentation WARNs were **fixed during the phase**, each with its own correction-closure sweep:

| Fix | Beyond the original finding |
| --- | --- |
| `AGENTS.md` versioning claim synced with `CLAUDE.md` | the sweep also caught `.agents/implementer.md:45` — the persona briefing every Implementer |
| `design.md:190` "Stays on `/v1`" removed | — |
| `design.md` §6.1 query budget corrected (5 reads, not 4) | DD-2 and DD-3 carried the same stale figure |
| `requirements.md` §13 coverage table rebuilt | `tasks.md` §6 was *also* incomplete — R-CBU-004 and NFR-CBU-002 both omitted T-12 |

`docs/trd/trd.md:291` was also corrected: it documented **this spec's own endpoint** at `/api/v1/results/ai/formalize/bulk`, a path that returns `404`.

## 9. Accepted Warnings Or Follow-Ups

**None blocks the archive. Three block the rollout, and they are owned by humans.**

| ID | Item | Owner |
| --- | --- | --- |
| **V-5** | Migration `down()` never executed (O-2 waived on static review) — production rollback of T-02 is **unrehearsed**. Mitigated: the real rollback is the flag (one `UPDATE`, no deploy) and the migrations are additive | Spec owner |
| **V-6** | Re-confirm `EMAIL.CAPDEV_BULK_UPLOAD.ENABLED = 'false'` against dev **immediately before merge**, not from any record | Spec owner |
| **V-7** | `requirements.md` §14 sign-offs: engineering lead, MEL/product owner, **security**, DevOps — plus rollout steps 0–2 including the **human review of a real received email** (D7/D8 have no automated gate and cannot have one) | Named owners |
| **D-T12-b** | Security sign-off must adjudicate the debug-channel finding before rollout step 4: this app installs no log-level policy, so Nest's `DEFAULT_LOG_LEVELS` (including `debug`) are in force and the `recipient dropped` line reaches stdout at info's retention. **Not a merge blocker** — the line sits after the `ENABLED` gate, so a dark deployment logs nothing | Security |
| — | Wider `/v1` drift found by validation's backward sweep — `trd.md:95` (ADR-3), `prd.md:250`, `ux-ui/design.md:175-176`, `pr-staging-to-main.md`, and **`docs/specs/general-setup/requirements.md:126` (a template, so it propagates)**. Deliberately not fixed here: platform-wide claims about routes this spec never touched. **Recommend `/akili-audit`** | Eng lead |
| — | 9 non-severe judgment-ledger entries remain open. **JD-S7** (no timeout on `dispatch()`) is the one most likely to matter in production | Eng lead |
| — | TRD does not yet document the outbound notification stage. Deliberate: the TRD describes the *running* system, and the feature sends nothing until the flag is flipped. **Add at rollout step 4, not now** | Eng lead |

## 10. Historical Notes

### The defects were in the specification, not the implementation

This is the spec's defining statistic. **Zero Reviewer FAILs across 12 tasks, zero HALTs, zero pivots, zero product bugs** — and **30 recorded spec-owner decisions and corrections** (`OD-1…3`, `D-T01-a` … `D-T12-b`), three of which reopened closed tasks.

The process caught its own defects in the right order: Judgment Day removed 10 findings before a line was written, Reviewers surfaced the requirement contradictions, and the test audit found what the tests could not prove. What it could not do was prevent the requirement defects from existing.

### Three corrections worth remembering

- **OD-2 (the `<1%` floor).** A rule that lived **only in a test** — suppress any women's share that rounds to zero — which the T-07 Reviewer correctly refused to treat as a requirement while also declining to fail it. Left alone, a training with 4 women out of 1,240 would have been reported as though no women attended. The resolution chose the honest floor clause over both suppression and a literal `0%`, and reopened T-04 and T-07 to do it.
- **D-T11-b (the endpoint that never existed).** Three spec documents and the root guide all named `POST /api/v1/results/ai/formalize/bulk`. Nest mounts it unversioned; `/api/v1/...` returns `404`. Found only because T-11's Implementer booted the app and dumped the route table.
- **D-T12-a (a guarantee the architecture never provided).** R-CBU-010 AC.3 promised per-group isolation for a metric-query failure. The grouped reads run **before** the loop opens, so a read failure suppresses the whole batch. Corrected in the design's favour — per-group metric queries would reintroduce exactly the fan-out NFR-CBU-001 forbids.

### The budget tripwire fired twice and worked both times

~1,450 → ~4,600 (after T-05) → ~5,600 (before T-12). Final code measurement is **6,215**, ~11% above the last re-baseline — a third firing, had execution still been running. §14.2's diagnosis is the durable part: the ~1:1 test-to-production ratio was real, but PR 3's allocation gave four tasks ~1,500 lines when **T-09 alone consumed 1,098**.

Notably, the *advisory-never-becomes-a-task* rule held under that pressure: T-07's upper-clamp advisory and T-11's masked-open-handle advisory were both recorded and left unimplemented rather than folded into adjacent tasks.

### What is worth copying into the next spec

- **Two pure modules** (`capdev-recipients.builder`, `capdev-metrics.formatter`) holding every rule that the D1/D2 defect classes can break — exhaustively testable with plain objects, no DB, no broker, no template. Both landed at 100% statement coverage.
- **Byte-equality between the on-disk template and the migration literal**, enforced by a spec. The KZ-001 control that made every downstream rendering assertion trustworthy.
- **`Disqualifies` clauses on every task.** T-05's ("a fixture where every contract has exactly one result cannot distinguish a correct `GROUP BY` from a missing one") is the single best line in the spec — and its generalization is this archive's Kaizen lesson **KZ-004**.
