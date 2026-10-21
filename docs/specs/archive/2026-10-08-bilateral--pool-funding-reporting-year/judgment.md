# Judgment Day — bilateral/pool-funding-reporting-year (design)

- **Target:** `design.md` + `requirements.md` @ `ec490da3c` (docs uncommitted)
- **Mode:** judgment_day · two blind read-only judges (sonnet; author opus — author ≠ auditor)
- **Round:** 1 (pre-fix)
- **State:** awaiting round-one fix approval

## Ledger (frozen, round 1)

| ID | Judges | Severity | Status | Finding |
| --- | --- | --- | --- | --- |
| JD-1 | A-1, B-2 | SEVERE | confirmed | Year readers sit in sync helpers / `.map` callbacks / module-level arrows (`bilateral.service.ts:464,485,1098`; `pool-funding-mapping-apply.service.ts:229,252`). An async resolver needs a per-request resolve + parameter threading plan; no Premise Ledger row |
| JD-2 | A-2, B-3 | SEVERE | confirmed | Sync gate snapshot loader unnamed: `ResultPrmsSyncLogRepository.loadGateSnapshot` (`result-prms-sync-log.repository.ts:133`), raw SQL without `report_year_id`; `SyncGateSnapshot` fixtures in ≥6 files incl. `test/result-prms-sync-claim-concurrency.integration-spec.ts`; no consumer row |
| JD-3 | A-3, B-1 | SEVERE | confirmed | P-10 contradicted: `approved` (`persistsRow: true`) precedes `alignment_green`, so history can exist with `has_contribution = null`; D-6 places a persisted `reporting_year` before `approved` too → R-PRY-003 "card shown when history exists" violated for that case |
| JD-4 | A-4 (SEVERE), B-4 (WARNING) | SEVERE (rule: citation doesn't reproduce) | confirmed | P-2 file list wrong: 56 hits over 16–17 files; one bilateral spec, no controller hits |
| JD-5 | A-6, B-5 | WARNING | info | Reader counts inconsistent ("seven" vs C-3 vs "11 readers"); stale comments (sidebar :106-116, interface :46, util :25-30) not listed |
| JD-6 | A-5, B-6 | WARNING | info | C-1 count includes gitignored `.env`; command now hits the spec docs |
| JD-7 | A-11, B-11 | WARNING | info | §6 control table lists nonexistent controls (justification, levers, contribution add/edit/delete); client never calls contribution endpoints |
| JD-8 | A-10, B-12 | WARNING | info | `pf-alignment-version-locked-banner` and new reporting-year banner both render; `readOnlyCause` restructure needed |
| JD-9 | A-8, B-13 | WARNING | info | Guard order changes existing responses (400 → 409 non-contributor; "already synced" → year 409); `toc_mapping_version_locked` becomes unreachable on PATCH; contribution context lacks external-source gate |
| JD-10 | A-13, B-10 | WARNING | info | Budget unverifiable before `tasks.md`; ~600 LOC likely low |
| S-1 | B-8 | WARNING | suspect | Bilateral handlers carry `@Version('1')` → paths are `/api/v1/...`, docs say unversioned |
| S-2 | B-7 | WARNING | suspect | R-PRY-002 "grep `ARI_PRMS_SYNC` = 0 in src" unsatisfiable (key enum/migration contain it) |
| S-3 | B-9 | WARNING | suspect | §7/§12.1 assert P-6 as fact while row is UNVERIFIED |
| S-4 | A-7 | WARNING | suspect | `cacheKey()` shared by internal cache and public Map key; stale-on-error behavior after year change unspecified |
| S-5 | A-9 | WARNING | suspect | Client 409 matcher only knows `toc_mapping_version_locked` |
| S-6 | A-12 | WARNING | suspect | "`GET /configuration/:key` is public" — RolesGuard at class level; unverified |
| S-7 | B-14 | SUGGESTION | suspect | Resolver should validate 4-digit year |
| S-8 | B-15, A-14 | SUGGESTION | info | Resolver query cost; unused `AppConfig` in ClarisaProjectsService; INSERT IGNORE comment; line-cite drift |

**Counts:** confirmed severe 4 · confirmed warning 6 · suspect 8 · contradictions 0 (JD-4 severity differed, defect agreed).

## Round 1 fix delta (user approved "Fix and Re-judge", 2026-10-08)

| ID | Fix |
| --- | --- |
| JD-1 | D-10 + P-12: resolve once per entry point, helpers take `year`; module-level mapping-apply functions threaded |
| JD-2 | `loadGateSnapshot` named; SELECT + resolver; optional snapshot fields; P-13 + §10 consumer list (9 files) |
| JD-3 | P-10 reworded; `has_pool_funding_data` justified by the card's PRMS-code rule (req §2); `reporting_year` gate `persistsRow: false` (D-6); R-PRY-005 "no log row" |
| JD-4 | P-2 re-run: 56 hits / 17 files, list in P-2a |
| JD-5 | Counts normalized (8 code sites); stale comments listed in §2.1 |
| JD-6 | C-1 → `git grep` at baseline: 26 / 7 |
| JD-7 | §6 control table rebuilt from judges' P-9 tables; R-PRY-003 control list corrected |
| JD-8 | Cause table (§5); single banner; year-aware ToC banner |
| JD-9 | Per-function guard order; response changes stated; D-8 → remove `assertTocMappingVersionUnlocked`; P-14; OQ-3 for contribution external gate |
| JD-10 | Budget re-derived: 9 tasks · ~850 LOC · ~13 rounds |
| S-1 | Verified (8× `@Version('1')`); all paths → `/api/v1/results/:code/pool-funding-alignment…`; prms-sync unversioned |
| S-2 | R-PRY-002 grep clause targets `process.env.ARI_PRMS_SYNC`, `PRMS_SYNC_YEAR`, `MAPPABLE_LIVE_VERSION`, `appConfig.ARI_PRMS_SYNC` |
| S-3 | §7 / §12.1 now cite P-6 as UNVERIFIED |
| S-4 | `cacheKey()` split; stale-on-error only for same phase/year |
| S-5 | `isVersionLocked409` also matches `pool_funding_year_locked` |
| S-6 | §8 reworded (GET not used by the design) |
| S-7 | `^\d{4}$` validation (R-PRY-001 + design) |
| S-8 | Unused `AppConfig` drop, INSERT IGNORE comment (D-11), line cites refreshed |

## Round 2 — scoped re-judgment

| Judge | Ledger result | Fix-caused findings |
| --- | --- | --- |
| A | 16 RESOLVED, 2 PARTIAL (JD-1, JD-8) | RA-1..RA-5 WARNING, RA-6 SUGGESTION — no SEVERE |
| B | 16 RESOLVED, 2 PARTIAL (JD-1, S-4) | RB-1..RB-3 WARNING, RB-4..RB-8 SUGGESTION — no SEVERE |

Both judges re-confirmed P-2/P-2a (56/17), P-10, P-13 (9 files), P-14; P-12 partially contradicted (`withResolvedIndicator` reads no year).

**Info items applied by the parent (no severe remained, so no second fix round was needed):** RA-1/RB-1 mapping-apply chain corrected; RA-2/RB-2/RB-3/RB-5 year threading completed (`buildAlignment`, `getEditableContributionContext(resultId, year)`, `getTocResultsForSps(…, year)`); RA-3 synced badge re-keyed to `isSyncedToPrms()`; RA-4 requirements A-1 reworded; RA-5 R-PRY-004/005 wording; RA-6/RB-8 cites + client spec in P-14; RB-4 NFR-PRY-001; RB-6 gate coercion/null rule; RB-7 constructor sites.

**Terminal state:** `approved` — 0 confirmed severe after round 1 fix; scoped re-judgment raised no severe.

JUDGMENT: APPROVED ✅
