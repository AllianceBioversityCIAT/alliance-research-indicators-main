# Archive Summary — Bilateral module / ToC Mapping v2 (lambda-toc integration)

> Generated at archive time by `/sdd-archive`. Condenses the full decision and execution trail preserved in the sibling files (`proposal.md`, `requirements.md`, `design.md`, `tasks.md`, `execution.md`).

---

## 1. Document control

| Field | Value |
| --- | --- |
| Spec id | 2026-06-toc-mapping-v2 |
| Module | bilateral-module |
| Branch | `AC-1594-bilateral-module-v2` |
| Personas | `.agents/leader.md` / `.agents/implementer.md` / `.agents/reviewer.md` (JCSPECS triad) |
| Archived by | Leader (sdd-archive) |

## 2. Original spec path

`docs/specs/bilateral-module/toc-mapping-v2/`

## 3. Archive date

2026-06-17

## 4. Final status

**Archived with one accepted follow-up (T-10).** T-01…T-09 complete, each Reviewer PASS on attempt 1/3. **T-10 (post-cutover PRMS-pair-path deletion) deliberately NOT executed** — it is gated on a cutover-verified note that was never recorded (cutover not verified as of archive). T-10 is accepted as follow-up work tracked under AC-1594 / R-BIL-098; see §9.

Final verification at last green run (2026-06-10): **284 suites / 1660 tests pass**; coverage 80.2 / 71.5 / 80.9 / 80.0 (global floor 60%); lint + build clean; migration `1779190000015` applied on the dev DB.

## 5. Requirements delivered

| Requirement | Title | Delivered by | Status |
| --- | --- | --- | --- |
| R-BIL-090 | Level-based ToC catalog read (frozen FE envelope) | T-01, T-03, T-04 | ✅ |
| R-BIL-091 | Server-owned `result_type` → `allowed_levels` rule | T-02, T-03, T-04 | ✅ |
| R-BIL-092 | Per-SP ToC alignment write | T-05, T-06, T-08 | ✅ |
| R-BIL-093 | SP removal cascades its ToC alignment | T-06, T-08 | ✅ |
| R-BIL-094 | Write validation with per-alignment errors | T-06, T-08 | ✅ |
| R-BIL-095 | Display snapshots survive catalog drift | T-05, T-06, T-07, T-08 | ✅ |
| R-BIL-096 | Read-back of saved ToC alignments | T-07, T-08 | ✅ |
| R-BIL-097 | Version gate (live version 2026) | T-02, T-06, T-08 | ✅ |
| R-BIL-098 | Retirement of the AOW-pair read path (post-cutover) | T-09 (prep ✅), **T-10 (code deletion ⏳ follow-up)** | ⏳ partial |
| NFR-BIL-090/091/092 | Catalog resilience / fan-out latency / observability | T-01, T-04, T-08 | ✅ |

## 6. Files changed summary

Per-task detail lives in `execution.md`. Landed commits on `AC-1594-bilateral-module-v2`:

| Task | Commit | Summary |
| --- | --- | --- |
| T-01 | `92001d43` | New `domain/tools/toc-integration/` lambda-toc client (5-min keyed cache, warm-stale / cold-503 resilience, fan-out helper); env `ARI_TOC_INTEGRATION_HOST`. |
| T-02 | `0217a320` | `bilateral/utils/toc-level-rules.util.ts` — `resolveResultTypeKey`, `allowedLevelsFor`, `MAPPABLE_LIVE_VERSION = 2026`; sole-consumer verification (RB-2). |
| T-03 | `b590cee4` | `getHlosIndicatorsForResult` reshaped to the frozen §5 envelope; `pairs`/`aow_status`/`no_aow_mappings` removed from the wire; `indicator_id` added to `findPoolFundingAlignmentContext`. |
| T-04 | `b0cce611` | Full R-BIL-090/091 read AC matrix (handoff-parity fixtures) + `@ApiProperty` response classes / typed `@ApiResponse` 200/404/503. |
| T-05 | `a13d7875` | Migration `1779190000015` + `ResultPoolFundingTocAlignment` entity + repository (partial-unique active row per result+SP); verified live on dev DB. |
| T-06 | `9a6a3449` | PATCH `toc_alignments[]` write path: 2026 version gate (409), six-code atomic 400 validation, per-SP upsert with snapshots, SP-deselection cascade; legacy bodies byte-identical. |
| T-07 | `44c42f69` | `getAlignment` read-back: `version_locked` + snapshot-sourced `toc_alignments[]` (11 fields, wire rename, decimal→number); PATCH response ≡ GET. |
| T-08 | `539e27bc` | Exhaustive R-BIL-092…097 + NFR-BIL-090 test matrix incl. real RolesGuard allow/deny (test-only). |
| T-09 | `cf59295d` | Superseded/archive banners across parent + sibling bilateral specs; OQ-V2-9 + D-V2-* recorded; rollout-checklist env/envelope updated. PRMS code retirement explicitly left gated on T-10. |
| Follow-ups (post-spec) | `5aef25ae` | Removed committed ` 2.ts` Finder-duplicate spec files. |
| | `263a0bd9` | `chore(format)` for the three prettier-dirty quirk files. |
| | `9caf9fd8` | Fixed pre-existing e2e supertest typing issue. |
| | `f3af8b2c` | Merge staging into the branch. |

## 7. Test evidence summary

No standalone `test-report.md` (validation/test reports were not generated for this spec). Test evidence is the in-spec matrices recorded in `execution.md`:
- **T-04** — R-BIL-090 AC.1–AC.5, R-BIL-091 AC.1–AC.2, NFR-BIL-091; handoff-§2 fixture parity with the STAR FE Jest fixtures; programmatic Swagger metadata assertions.
- **T-08** — every AC of R-BIL-092…097 + NFR-BIL-090's validation-path 503; all six per-alignment 400 codes individually with atomicity asserted; real `RolesGuard` allow/deny; save→drift→read snapshot survival via the real `getAlignment`.
- **T-05** — repository unit spec + **live migration verification** (apply, `ER_DUP_ENTRY` unique-index proof, revert, re-apply) on dev DB `192.168.20.210`.
- Aggregate at last green run: 284 suites / 1660 tests; coverage 80.2/71.5/80.9/80.0 (floor 60).
- **Live smoke (2026-06-17):** `GET …/19793/…/hlos-indicators` exercised the full new read path end-to-end against the running server; upstream lambda-toc reachable only with DNS pinned (see RB-1) — returned 25 ToC results for SP06/OUTPUT once resolved; cold-cache path returned the designed 503 with structured log. Human `/swagger` schema + testing-env smoke during the FE-demo window were the remaining manual checks.

## 8. Validation summary

No standalone `validation-report.md`. Conformance was enforced per-task by the read-only Reviewer persona (`.agents/reviewer.md`) — every task carries a recorded `STATUS: PASS` verdict in `execution.md` with independent re-runs of lint / scoped + full jest / build. No unresolved FAIL findings. Reviewer-surfaced doc drifts were corrected in-flight: design §3.2 (`findPoolFundingAlignmentContext` did not previously return the result-type linkage) and design §4 ("FK-by-value" → real FK constraint).

## 9. Accepted warnings / follow-ups

Accepted at archive (owner: Juanca / AC-1594 unless noted):

1. **T-10 — Post-cutover PRMS cleanup (NOT done).** `src/domain/tools/prms-toc/` still exists; `PrmsTocService` + `ARI_PRMS_TOC_HOST` still referenced (intentionally compilable-but-unused since T-03). Must land as its own PR per R-BIL-098 AC.2 once cutover is verified. **Gate (never recorded): a cutover-verified note — FE integration green in testing + cache behavior observed.**
2. **RB-1 (open) — lambda-toc DNS.** `lambda-toc.clarisa.cgiar.org` did not resolve on the office resolver (NXDOMAIN); resolves via 8.8.8.8 → `3.90.182.187`. Local fix is a per-domain resolver (`/etc/resolver/clarisa.cgiar.org`). **Infra must ensure the testing/prod servers resolve the host** or the read 503s cold.
3. **RB-4 (open) — FE relay (D-V2-5).** Extended read-back + write error contracts to send to STAR FE: `version_locked` + snapshot `toc_alignments[]` (11 fields, `unit_of_measurement` rename, `quantitative_contribution` as JSON number, `[]` when ineligible); hlos null→`''` coercion; 400 `errors.toc_alignments[{sp_code,field,error}]` (six codes; `missing_required_fields` one-per-field) and 409 `errors.code: 'toc_mapping_version_locked'`. Wire examples in `execution.md` T-06/T-07.
4. **OQ-V2-2/3/5/6 (open) — BA decisions.** Indicator-type filter; one-alignment-per-SP cardinality; level rules for other result types; target year 2026 vs mockup 2025. Build shipped on recorded assumptions (requirements §11–12); schema leaves the cardinality flip one index-drop away.
5. No standalone test-report / validation-report — accepted; evidence is the in-spec Reviewer trail above.

## 10. Historical notes

- **Scope reduction (2026-05-28):** mapping is **indicator-level only**; HLO-level grouping is display-only, no HLO persistence (PRMS/Pyramids team decision — predates this spec; see parent `pending-items`).
- **Key design decisions (design §13):** D-V2-1 new tool module + new table (proposal Option A, settles OQ-V2-9); D-V2-2 in-place reshape, no `/v2` (sole consumer is the unshipped STAR FE); D-V2-3 single `allowed_levels` rule shared by read + write; D-V2-4 snapshot stores upstream spelling `unit_messurament`, wire exposes `unit_of_measurement`; D-V2-7 version gate on `report_year_id` vs hardcoded `2026`; D-V2-8 atomic validation (whole PATCH 400s, no partial persist).
- **Cascade semantics (Reviewer-adjudicated, T-06):** the SP-deselection cascade runs on *every* PATCH including legacy bodies (R-BIL-093 keys on effective `sp_codes`, not on `toc_alignments` presence); only the version gate is `toc_alignments`-scoped (R-BIL-097 AC.3).
- **Environment hazard during execution (2026-06-10):** the repo lives under iCloud-synced `~/Desktop`; iCloud produced `… 2`/`… 3` conflict duplicates (incl. committed ` 2.ts` specs, since removed in `5aef25ae`) and hung `nest start` on a corrupted `dist/`. Recommended durable fix: move the repo out of `~/Desktop` or disable Desktop iCloud sync.
