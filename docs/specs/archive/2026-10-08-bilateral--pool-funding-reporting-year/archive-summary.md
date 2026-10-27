# Archive Summary — Bilateral / Pool Funding Reporting Year

> **Delivered.** All 11 tasks passed review. Validation came back **WARN** with 0 FAIL in code or tests, and its remediation was applied.
>
> - The reporting year now lives in `app_config` (`ARI_PRMS_SYNC`) and replaces both the env var and the `MAPPABLE_LIVE_VERSION` constant.
> - Pool Funding is read-only on past years.
> - Non-eligible snapshots and PRMS records display read-only.

## 1. Document Control

| Field | Value |
| --- | --- |
| Spec id | 2026-10-pool-funding-reporting-year |
| Owner | d.casanas@cgiar.org |
| Branch | `pull-prms-result` (unpushed at archive time) |
| Commit range | `ec490da3c..f4dae9bb4` |
| Archived by | `/akili-archive`, Claude Opus 5.5 |

## 2. Original Spec Path

`docs/specs/bilateral/pool-funding-reporting-year/`

## 3. Archive Date

2026-10-08

## 4. Final Status

| Field | Value |
| --- | --- |
| Tasks | 11 of 11 `[x]` (T-10 and T-11 were added by an owner-approved amendment) |
| Validation | **WARN**, 0 FAIL. R-1, R-3 and R-4 were applied; R-2 is carried |
| Reviewer gate | Every task closed on a Reviewer PASS. No `REVIEW_WAIVED`, no `REVIEW_SKIPPED` |
| Rework | 2 attempts: T-08 (dead 409 matcher) and T-09 (missing rollout note) |

## 5. Requirements Delivered

| ID | What |
| --- | --- |
| R-PRY-001 | The `app_config` row `ARI_PRMS_SYNC`, seeded `'2026'` with `INSERT IGNORE`. The uncached resolver falls back to 2026 with a `warn` |
| R-PRY-002 | Every year consumer reads that row. ToC and CLARISA caches are year-keyed. The env var and the constant are retired |
| R-PRY-003 | On a past year, the sidebar shows the section when it has data and hides PRMS SYNC. The page is read-only, has one banner and no Save |
| R-PRY-004 | The server returns 409 `pool_funding_year_locked` on past-year alignment and contribution writes. The client matches `errors.code` |
| R-PRY-005 | A PRMS push is refused by the `reporting_year` gate, with no Normalizer call and no log row |
| R-PRY-006 | The response carries `has_pool_funding_data` and `reporting_year` |
| R-PRY-007 *(amended)* | `display_only`: a non-eligible snapshot, synced result, or result with a PRMS code shows read-only |
| NFR-PRY-001/002 | Changes take effect on the next request (no TTL). A failed read falls back to 2026 |

## 6. Files Changed Summary

`git diff --shortstat ec490da3c..e5cb2d43d -- server client` gives **+2831 / −389**. Tests account for about 80% of the inserted lines.

| Area | Files |
| --- | --- |
| Server, new | `reporting-year.resolver.ts` and its spec; migration `1791488432640-seedPrmsSyncReportingYear` and its spec |
| Server, changed | `global-utils.module`, `app-config-key.enum`, `app-config.util`, `env.utils`, `.env.example`, `toc-integration.service`, `clarisa-projects.service`, `toc-level-rules.util`, `bilateral.service`/controller/DTOs, `pool-funding-mapping-apply.service`, `sync-gate`, `result-prms-sync-log.repository`, `result.repository`, plus specs and 2 integration specs |
| Client, changed | `pool-funding-alignment.interface`, `bilateral.service`, `result-sidebar`, `pool-funding-alignment` page, `navigation-buttons` (`hideSave`), plus specs |
| Docs | `docs/trd/trd.md`, `docs/ux-ui/design.md` |

## 7. Test Evidence Summary

| Suite | Result (final, `npm test -- --silent`) |
| --- | --- |
| Server | 424 suites / 4086 tests passed. `tsc`, build and eslint are clean |
| Client | 341 suites / 7892 tests passed. Lint and build are clean. `tsc` is at the 945 baseline |
| e2e boot | `app.e2e-spec.ts` passed. The DI falsifier was observed red |
| Falsifiers | Every task's falsifiers were observed red and then reverted. T-11 (a) is paraphrased |
| Integration | **Not run, environment-blocked (RB-4)** |
| HITL | Owner gave a blanket visual approval: "lo veo bien haz commit". Recorded as a KZ-002 exception |

## 8. Validation Summary

`validation-report.md` came back **WARN**:

- 26 of 29 clauses PASS and 3 WARN.
- 7 of 11 tasks PASS and 4 WARN.

The 4 task WARNs are about evidence wording. The 3 clause WARNs are:

- the live seeded value is unobserved
- there is no positive test that a 2027 result is writable
- the TIP/AICCRA source ordering is untested

The remediation applied fixed the TRD table name, added `display_only` to the docs, and corrected the spec metadata and budget.

## 9. Accepted Warnings Or Follow-Ups

| # | Item | Owner |
| --- | --- | --- |
| F-1 | **Prod:** apply `SeedPrmsSyncReportingYear1791488432640` by hand (K-015). The `dev` pipeline applies it on merge | owner |
| F-2 | After deploy, check that `GET /api/configuration/ARI_PRMS_SYNC` returns `"2026"` (validation R-2) | owner |
| F-3 | RB-4: the integration environment is blocked (credentials, scratch schema, bootstrap FK) | owner |
| F-4 | Outside this spec: the versioning SP moves Pool Funding rows from live to snapshot; the PRMS import sets no primary contract; the snapshot does not copy `is_synced_to_prms` | owner decision |
| F-5 | The `pi-delegates` e2e writes to the shared Dev DB through `.env` | owner |
| F-6 | Legacy client 409 matchers that read the top-level `description` are probably dead | follow-up |
| F-7 | Optional tests (validation R-5); Swagger 409 on the contribution routes; display-only section tokens | follow-up |
| F-8 | `requirements.md` §13 sign-off boxes were left for the owner | owner |
| F-9 | RB-3 / OQ-3: contribution endpoints have no external-source gate. Pre-existing, carried | owner |

## 10. Historical Notes

- **The year that hid Pool Funding came from a constant, not the env var.** It was the constant `MAPPABLE_LIVE_VERSION = 2026`. The owner chose to unify the constant and the env var into a single `app_config` row.
- **Two scope amendments were approved by the owner mid-run:**
  - Save is now absent off-year (the opt-in `hideSave` on the shared `NavigationButtonsComponent`).
  - R-PRY-007 display-only came from STAR-20081: its 2025 snapshot held a ToC, but none of its contracts is primary or contributing.
- **The Cursor (Grok) quota ran out at T-08.** The owner re-routed T-08 through T-11 to Claude Sonnet. Author ≠ auditor still held, because the Reviewer was Opus.
- **The budget tripwire fired after T-08.** Final actuals were 11 tasks, about 3.3× the planned LOC and 14 verdicts. The owner chose to continue.
- **The audit trail lives in `execution.md`:** every attempt, every Reviewer verdict, the rollout note, the pivot-lite record and the validation remediation.
