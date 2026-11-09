# Judgment Day — update-result-year-prompt (design)

| Field | Value |
| --- | --- |
| Target | `requirements.md` + `design.md` at baseline `162348264` |
| Judges | Two blind read-only judges (Sonnet; author is Opus, so author ≠ auditor) |
| Owner limit | Two rounds at most |

## Round 1 — frozen ledger

| ID | Judges | Severity | Finding | Fix applied (design / requirements) |
| --- | --- | --- | --- | --- |
| JD-1 | A F-04, B B-02 | severe (confirmed) | The offered year can be arbitrary. On first load nothing is selected, and `versionsList()[0]` has no order | Glossary updated; D-3 = selected chip, otherwise max year; S-10; P-14 |
| JD-2 | A F-01, B B-03 | severe (confirmed) | The exclusion had no named binding (`[options]="this.service?.list()"`); a per-pass filter destabilises `p-select` | `ExcludeYearsPipe` (pure) on the binding; D-7; P-10 |
| JD-3 | A F-03, B B-12 | severe (confirmed) | 5 breaking tests, not 4; the mock lacks a years source; `:294` cannot hold | §9 lists `:135 :294 :312 :324 :341`, owned by T-03 |
| JD-4 | A F-05, B B-07 | warning (confirmed) | `ToPromiseService` never throws; `data` may be non-array | D-8 uses `GetYearsByCodeService.main()` (Array.isArray guard); P-7, P-9b |
| JD-5 | A F-06, B B-05 | warning (confirmed) | Double click stacks prompts; `offered` was computed before the await | D-9 in-flight guard; `offered` computed after the await; S-11 |
| JD-6 | A F-07, B B-08 | warning (confirmed) | The Cancel template always closes; no reset of `showReportedWarning`; single-use configs | `onCancel` method; reset list; single-use note §7.1 |
| JD-7 | A F-08, B B-04 | warning (confirmed) | The swap's `clearService` caused a second request and an empty flash | D-8: no `clearService` on swap |
| JD-8 | A F-11, B B-13 | suggestion (confirmed) | Hex literals in new code; the all-modals rule was not cited | Tokens on `infoCard`; prompt omits `buttonColor`; D-1 cites the rule |
| JD-9 | B B-01 | severe (suspect, single judge; verified by architect: `new Date(null)` is the epoch) | A null `updated_at` would print 1970 | S-4 widened; non-empty-string guard; P-12 |
| JD-10 | A F-02 | warning (suspect) | RK-1 reasoning wrong (last alert, not last with service) | RK-1 reworded; P-11 |
| JD-11 | A F-09 | warning (suspect) | "Yes" always overwrites without a warning | D-5 marked open; owner asked; HITL T-04 |
| JD-12 | A F-12 | suggestion (suspect) | The global-alert spec mocks lack `replaceGlobalAlert` | To T-02 scope |
| JD-13 | B B-06, B-14, B-11; A F-10 | info | Button-visibility wording; `GetVersions` typing; provisional task IDs | Requirements §4 reworded; P-13; budget marks IDs provisional |

## Round 2 — scoped re-judgment

Both judges: JD-1..JD-13 RESOLVED; ledger count re-run and correct.

| ID | Judges | Severity | Finding | Fix |
| --- | --- | --- | --- | --- |
| N-1 | A (suggestion), B (warning) | warning (confirmed) | The prompt omitted `buttonColor`, but `getIcon('confirm')` has no default, so Yes would get the PrimeNG default colour | `buttonColor: 'var(--ac-light-blue-400)'`; P-15 |
| N-2 | A, B | suggestion | The pipe import and the spec mocks were not stated | §7.1 bullets added |
| N-3 | A, B | info | RK-3 placed the constructor race wrongly | RK-3 reworded |

No severe findings remain. Lineage exhausted at round 2 (owner limit).

JUDGMENT: APPROVED ✅
