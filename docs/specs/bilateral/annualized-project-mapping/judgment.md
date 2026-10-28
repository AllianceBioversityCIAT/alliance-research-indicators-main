# Judgment Day — `bilateral/annualized-project-mapping` design

- **Target:** `design.md` (+ `requirements.md`, `proposal.md`) @ `317e2d79`, frozen at launch
- **Judges:** A and B, blind, parallel, read-only, `sonnet` (author = `opus`; author ≠ auditor)
- **Skills passed to both:** nestjs-expert, angular-developer, api-design-principles
- **Round:** 1 — findings merged, awaiting owner approval for the fix round
- **Fallback note:** the skill's reference files (`review-ledger-contract.md`, `prompts-and-formats.md`) are not packaged; prompts were derived from the Hard Rules

## Confirmed severe (both judges)

| ID | Judges | Finding | Evidence as run |
| --- | --- | --- | --- |
| **J-1** | A-2 SEVERE · B-1 SEVERE | P-10's "26 lines" does not reproduce: the command returns **35**. The reader set is complete; the count is wrong and the requirements §1/§7/§8 gate cites it | P-10 command → `35` (both judges; architect re-run → `35`) |
| **J-2** | A-1 SEVERE · B-2 SEVERE | Deleting `AppConfigKey.ARI_CLARISA_PROJECTS_PHASE` breaks merged migration `1786738949211-seedClarisaMappingPhase.ts` (imports the enum in `up` and `down`). There was no ledger row | `src/db/migrations/1786738949211-seedClarisaMappingPhase.ts:11,22` |
| **J-3** | B-3 SEVERE · A-9 WARNING | Admin SSR React page is its own consumer of create/deactivate. After the change, its "Inactive — re-create instead" copy is false, and it has no Activate action. P-16 said "inherits list, no change". *Severity differs; classified severe because a triggered `consumer` class row is incomplete* | `src/admin/client/pages/BilateralProjectMappings.tsx:213-250, 259-269, 425-429` |
| **J-4** | B-4 SEVERE · A-12 WARNING | P-7 settling check is vacuous: "2026 cycle start" is undefined, and the table dates from 2026-05-19, so no row predates it. Phase-override rows are undetectable via `created_at`. Environments where supersede ran hold active+inactive pairs, so the collision pre-check aborts and no remediation exists. *Severity differs; both found the same defect* | `git log` on `1779190000011`; `automapper.service.ts` supersede write |

## Suspect → settled by architect re-run

| ID | Judge | Finding | Architect check |
| --- | --- | --- | --- |
| **J-5** | A-3 SEVERE | §5 preview/apply shapes contradict the source. The real shape is `{ feedFetchedAt, counts{…}, <bucket arrays> }`; the design's flat shape drops `feedFetchedAt`, `counts`, `ambiguous`, `unresolved` | `client/.../bilateral-project-mapping.interface.ts:119-150` → **confirmed** |

## Both judges — WARNING (info; fix offered, not automatic)

| ID | A | B | Finding |
| --- | --- | --- | --- |
| W-1 | A-4 | B-5 | §6.3 buckets ≠ R-APM-005 row 7 (inactive+MANUAL+different → *divergent*); buckets not disjoint; `AI_SUGGESTED`/`AI_AUTO` sources unaddressed |
| W-2 | A-7 | B-6 | DD-2 parity: JS `trim()` strips `\t \n` NBSP, MySQL `TRIM` only spaces; the integration harness does not reach the scratch schema (`PID_MYSQL_*` vs `ARI_TEST_MYSQL_*`) |
| W-3 | A-8 | B-7 | `namedPlaceholders: true` trap (`?`, `:word`, even in comments) for the new migrations/fragment; backtick `key`; `migration:scan` script missing |
| W-4 | A-6 | B-11 | concurrent create can deadlock (1213), not only 1062 |
| W-5 | A-14 | B-12 | coverage precedence when id and external-code matches hit different rows |
| W-6 | A-10 | B-13 | §3 / P-17 inventory gaps: `clarisa-projects.module.ts`, `bilateral-mapping-coverage.service.ts`, `coverage-report.query.dto.ts`, predicate-text specs, client fixture, the phase interfaces, positional-arg specs |

## Single judge — WARNING / SUGGESTION (info)

| ID | Judge | Finding |
| --- | --- | --- |
| I-1 | A-5 | create/PATCH never write `clarisa_external_code`; a user edit of a DERIVED row stays DERIVED and is overwritten by the next Apply |
| I-2 | A-11 | ID collision: "P-7" means the proposal's defect in DD-1/DD-4 and the backfill premise in §14 |
| I-3 | A-13 | §8 cites a non-existent "Falsifiability #4"; task IDs cited before `tasks.md` exists |
| I-4 | B-8 | migration LOC understated (~330, not ~100) |
| I-5 | B-9 | year read several times per operation; resolve once and carry it |
| I-6 | B-10 | deploy order: an old client sends `phase` → 400 on preview/apply |
| I-7 | B-14 | function migration must inline literal SQL, not import the TS constant |
| I-8 | B-15, A-16 | `down` order and multi-year refusal; entity must declare the new unique index |
| I-9 | B-16, A-18 | client year source before coverage loads; Pending list excludes inactive/updated |
| I-10 | A-15 | `app_config.key` is the PK — add a row; consider resolver running the fragment |
| I-11 | A-17 | `:id/deactivate` has no pipe; activate `notes` unvalidated |
| I-12 | B-17 | P-23 wording: the gate compares `report_year` / `reporting_year` |

## Ledger audit (merged)
Confirmed by both: P-1…P-6, P-8, P-9, P-11…P-15, P-18…P-25. **Refuted:** P-10 (count). **Incomplete:** P-16, P-17. **Still UNVERIFIED, check vacuous:** P-7. Missing rows: J-2, J-5 shapes, `app_config.key` PK, harness link, placeholder constraint.

## Counts
Confirmed severe **4** + architect-confirmed **1** · both-judge warnings **6** · single-judge info **12** · contradictions **0**.

## Round 1 → fix
Owner approved the fix round on 2026-10-28 (J-2 → keep the enum `@deprecated`; J-4 → archive duplicates to a history table; Excel export out of scope). Fixed: J-1…J-5, W-1…W-6, and the cheap info items I-1, I-2, I-4…I-11.

## Re-judgment 1 (scoped to the fix delta)
| Judge | Result |
| --- | --- |
| A | 8 RESOLVED, 3 PARTIAL (J-1, J-3, W-6). Fix-caused: RA-1 SEVERE (§6.2 table sums to 16, not the stated 17), RA-2…RA-7 |
| B | 9 RESOLVED, 2 PARTIAL (J-1, W-1, W-6 noted). Fix-caused: RB-1 (same 16-vs-17 count), RB-2…RB-10 |

Both judges confirmed the count defect (RA-1 / RB-1). The remaining items were citation and wording fixes.

## Round 2 → fix (final bounded round)
Fixed:
- 35 = 16 code + 1 Swagger string + 18 comment/doc;
- R-APM-005 row 2 reads "active";
- the apply envelope in requirements;
- the P-17 providers statement;
- the P-11 and P-22 citations;
- forced `MANUAL` on human edits, and `clarisaProjectsService` no longer `@Optional`;
- SSR copy at `:439` and `:534`;
- the DTO line in §3;
- the copy-drift test;
- budget ~1,500;
- the `automapper-s2 DD-6` prefix;
- the backticked `key`.

## Re-judgment 2 (final, scoped)
| Judge | Result |
| --- | --- |
| A | 11/11 RESOLVED. FA-1 SUGGESTION: the ID "DD-6" is reused across specs (requirements already prefixes it) |
| B | 11/11 RESOLVED. FB-1 SUGGESTION: R-APM-006 says "change of project"; design forces `MANUAL` on any present-branch upsert |

Both are recorded as INFO and not fixed. FB-1 is carried to `tasks.md` as a clarification for the owning task.

## Terminal receipt
- Rounds: 2 fix rounds, 2 scoped re-judgments (ceiling reached cleanly)
- Open severe: 0 · open warnings: 0 · INFO: FA-1, FB-1, I-3 (task IDs resolved once `tasks.md` exists), I-12
- Skills: nestjs-expert, angular-developer, api-design-principles

JUDGMENT: APPROVED ✅
