# Archive Summary — Bilateral / Pool Funding SP Picker Renders Empty

## Document Control

| Field | Value |
| --- | --- |
| Original spec path | `docs/specs/bugfix/pool-funding-sp-picker-empty` |
| Archive date | 2026-08-20 |
| Type | **Bug** · Depth **Standard** (Bug Mode) |
| Ticket | AC-1676 · branch `JuankCadavid/AC-1676` |
| Final status | **Complete** — 9/9 tasks PASS, shipped in 3 PR groups, 10 commits |
| Execution model | agy / `gemini-3.7-flash-high` implemented · Claude Opus audited (`author ≠ auditor`, cross-host and cross-family) |

---

## 1. Outcome

The Pool Funding Alignment Science Program picker was empty for **all 198 mapped bilateral projects**. It now populates. Verified against real CLARISA, not fixtures: `STAR-2227` → `SP01`; `STAR-3403` → `SP02` + `SP06`. Both previously returned `[]`.

Admin coverage moved **195/198 → 198/198**, and the increase is real: three cohort projects held an active mapping whose stored `clarisa_project_id` was not the cohort project's id, so the id-based count never saw them and `findProjectById` would have resolved them to the wrong project or to none.

---

## 2. Root causes and what closed them

| | Cause | Closed by |
| --- | --- | --- |
| **RC-A** | The SP filter accepted only CLARISA `status === 'Confirmed'`; **0 of 198** cohort projects have one — all 283 SP rows are `Pending`, a state CLARISA owns and ARI only reads | T-01, T-02, T-03 |
| **RC-B** | `clarisa_project_id` is feed-scoped with nothing pinning the feed; a host change silently dereferenced 197/198 mappings and the UI reported them as never linked | T-04, T-05, T-06, T-07 |
| **RC-C** | The stub fixture stamped `Confirmed` on the same 283 rows the live feed reports as `Pending` — the double agreed with the bug, so no test could redden | T-08 (stub deleted) |

RC-A answers **OQ-5**, carried unanswered through `clarisa-automapper-s1` and `s2` and closed there as *"does not affect the join"* — true for the join, and it decided the picker.

---

## 3. Requirements delivered

| ID | Requirement | Status |
| --- | --- | --- |
| R-PSP-001 | SP picker accepts the configured status set (`Confirmed,Pending`, env-overridable) | ✅ |
| R-PSP-002 | ToC catalog resolves the same SP set as the picker | ✅ |
| R-PSP-003 | One shared SP predicate; the entity-code divergence recorded, not silently harmonized | ✅ |
| R-PSP-004 | Three distinguishable empty states, each naming its true cause | ✅ |
| R-PSP-005 | Mappings resolve through a feed-stable key | ✅ |
| R-PSP-006 | Existing rows backfilled | ✅ |
| R-PSP-007 | **Re-scoped mid-execution** — the CLARISA stub apparatus deleted rather than repaired | ✅ |
| NFR-PSP-001 | Config visibility window (5-min TTL) stated in verification steps | ✅ |
| NFR-PSP-002 | No coverage regression | ✅ improved to 198/198 |
| NFR-PSP-003 | Every new gate proven able to fail | ✅ |
| NFR-PSP-004 | ~~Fixture reaches `dist`~~ | **Retired** — no fixture after R-PSP-007's revision; the K-017 rule still binds future artifacts |

---

## 4. Files changed

10 commits. Net **≈ −24,000 lines**, dominated by the 24k-line fixture deletion.

| Area | Change |
| --- | --- |
| `domain/entities/bilateral/` | `resolveMappedProject()` seam extracted (the chain was duplicated verbatim across two methods); new pure `utils/sp-mapping.predicate.ts`; `stale` added to both response unions; per-item `mapping_status` |
| `domain/tools/clarisa/projects/` | `findProjectByExternalCode`; `hasSciencePrograms` status clause delegated |
| `domain/tools/clarisa/stub/` | **Deleted in full** — router, mount, config, 2 specs, 2 tools, 4 fixture artifacts, plus the `main.ts` mount, the e2e spec, and the env flag |
| `bilateral-project-mapping/` | `clarisa_external_code` column + index; automapper writes it; coverage counts via it, with the OR group bracketed |
| `db/migrations/` | 2 new — schema and backfill, **both applied to Dev** |
| `shared/utils/env.utils.ts` | `BILATERAL_ACCEPTED_SP_STATUSES`, delegating to the predicate module so one literal defines the default |
| STAR client | Three empty states, `stale` in the type union, `Pending` qualifier chip |
| `docs/specs/archive/2026-08-19-…clarisa-fixture-stub/` | Annotated: removal condition fired; M-14 corrected, original text preserved |

---

## 5. Test evidence

**No `test-report.md`** — `/akili-test` was not run. This spec used **per-task adversarial audit** instead: every task was independently re-measured, and every claim probed by auditor mutation. Accepted as the substitute; recorded here rather than left implicit.

| Suite | Final |
| --- | --- |
| Server unit | **332 suites / 2,364 tests** green; `test:cov` completed with no threshold violation (60% floor) |
| Server e2e | 1 suite / 1 test green |
| Client unit | **311 suites / 6,471 tests** green; statements 98.4 %, branches 97.11 %, functions 98.22 %, lines 98.62 % |
| `tsc --noEmit`, `eslint`, `ng lint` | clean |

**Auditor mutations that caught real defects** — each reddened only after the defect was reintroduced:

| Mutation | Caught |
| --- | --- |
| `DEFAULT_ACCEPTED_SP_STATUSES → ['Confirmed']` | **F-1** — the constant was inert; the real default was a second literal in `env.utils.ts` |
| `.where(A).orWhere(B).andWhere(C)` restored | **F-12** — `A OR (B AND C)`; `is_active` stopped gating the project-id branch |
| Dangling import left behind | **F-6** — an orphaned e2e spec surviving the stub deletion |
| `KNOWN_CENTRE_PREFIXES` widened with `X-` | prefix-widening guard confirmed genuine (**F-13** evidence was not) |
| `!isStale()` removed from `showSpPicker` | T-09 guard confirmed genuine (**M1** evidence was not) |
| No-mapping-row branch → `stale` | `stale` confined to its own branch |

---

## 6. Validation

**No `validation-report.md`** — `/akili-validate` was not run; accepted, with per-task audit as the substitute. **16 findings** (F-1…F-16) were raised and resolved or explicitly accepted during execution; all are recorded in `execution.md` with their evidence.

**DC-8** (real-feed behaviour) and **DC-9** (rendered UI) have **no automated gate** and were discharged by human/auditor checks:

- **DC-8** — endpoints queried against real CLARISA with the fixed code. Passed.
- **DC-9** — `evidence/01-picker-populated-STAR-2227.png`, `evidence/02-empty-state-no-sps-available.png`, plus the `Pending` chip confirmed by the user on `STAR-3403` at the HITL pause.

---

## 7. Accepted gaps and follow-ups

| # | Item | Why accepted |
| --- | --- | --- |
| **F-9** | ~~unverified~~ **Resolved 2026-08-20 (post-archive):** the suite now runs — **6/9 pass**. The 3 failures are `Table 'ari_t13.clarisa_levers' doesn't exist`, in R-BIL-126 cases belonging to `primary-contributing-sp` | **Not attributable to this spec** — `t13-schema.ts` untouched by all 13 commits, no lever/SP entity file touched. A later spec added a relation the minimal schema builder never creates, unnoticed because `test:integration` is a third jest config no habitual command runs (**KZ-017**). Belongs to that spec's owner |
| **F-15** | The backfill's `down()` nulls every non-null key, not only the rows `up()` set | A backfill cannot identify its own rows without a marker; the realistic revert path drops the column anyway |
| **DC-9 / `stale`** | The `stale` state is verified by test, not by view | Producing it needs a key the feed cannot resolve, which the admin UI cannot express. The clean alternative — repointing at CLARISA **production** — was declined rather than send read traffic to another team's production API for one screenshot |
| **OQ-1** | May a reporter *submit* an alignment built on `Pending` SPs, or should submit warn? | Product + PRMS. Visibility was settled (DEC-1); submission was not |
| **OQ-2** | Should `hasSciencePrograms` drop its `code === 22` narrowing (SP01–SP08 only)? | Recorded as **D-PSP-8**: harmonizing it changes the admin project list, which no requirement here asked for |

**OQ-3** (should the stub stay the local default) — **closed**: the user pinned local to real CLARISA, and R-PSP-007 deleted the stub.

---

## 8. Historical notes

**The proposal carried a correction.** RC-B was first presented as the cause of the reported screenshot. It was not: Dev reads real CLARISA and reported `195/198` healthy; the `2/198` figure came from a local stub-backed stack. RC-B is latent fragility, and **RC-A alone blocked Dev.** Superseded text preserved.

**R-PSP-007 was re-scoped mid-execution.** A user question — *"why the Excel and not the endpoint?"* — prompted measuring the stub's own removal condition, written verbatim into five of its files. Both halves were satisfied: CLARISA now publishes `external_code` (**198/198** across the phase-2026 cohort, against **0/299** when the stub was built) and phase-2026 data. Repairing the fixture would have meant maintaining an artifact the code says to delete. **D-PSP-9 superseded by D-PSP-11**, with the rejected alternative recorded.

**An unbuildable PR ordering was found and fixed** (`36164be8`): T-06 depended on T-04, but the PR table placed T-04 in a later PR. Not caught by any check — the dependency graph and the PR table were written in the same pass and never cross-read.

**Three rework rounds against a budget of two.** The overrun was escalated, not absorbed. All three were real defects — an inert discriminator, an ungated `is_active`, and an orphaned e2e spec — and **none was found by the test suite**; all three came from auditor mutation.

**Two repo defects surfaced, unrelated to this spec:** `migration:show` is not an npm script (the root guide instructs using it), and `migration:scan` points at a deleted file and exits non-zero.

---

## 9. Next command

```text
/akili-resume        # or /akili-propose for new work
```

Before merging: run `npm run test:integration` with the T13 container (F-9), and re-index CodeGraph — the graph was last built at 16:52, before the stub deletion landed.
