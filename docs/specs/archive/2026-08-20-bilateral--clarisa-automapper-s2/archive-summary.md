# Archive Summary — bilateral / CLARISA ↔ AGRESSO Auto-Mapper (S2)

## 1. Document Control

| | |
| --- | --- |
| **Original spec path** | `docs/specs/bilateral/clarisa-automapper-s2` |
| **Archive date** | 2026-08-20 |
| **Spec id** | 2026-08-clarisa-automapper-s2 |
| **Module** | bilateral — server (`server/researchindicators`) + client (`client/research-indicators`) |
| **Owner** | Juan Carlos Cadavid · **Epic** AC-1385 |
| **Extends** | `archive/2026-08-14-bilateral--clarisa-project-automapping` (S1 — the measurement instrument) |
| **Branch** | `JuankCadavid/AC-1676` · **7 commits** `f63333d0` → `13eb862f` |
| **Approval mode** | `gated`, lifted to unattended by the user mid-run |

## 2. Final Status — **COMPLETE**

All 7 tasks Reviewer-PASSed. Both packages green, both builds exit 0.

| Task | Outcome | Commit |
| --- | --- | --- |
| T-00 Migration: `DERIVED` source | PASS attempt 1 | `8414bf94` |
| T-01 The single normalization | PASS attempt 1 | `1d1df009` |
| T-02 Resolution + environment guard | PASS attempt 2 | `c11e31fa` |
| T-03 Classify, apply, supersede | PASS attempt 2 | `b8354f0d` |
| T-04 Coverage computation | PASS attempt 1 | `a377a871` |
| T-05 Controller (closes PR 1) | PASS attempt 2 | `6a7d7567` |
| T-06 Client strip + run surface (PR 2) | PASS attempt 2 | `13eb862f` |

## 3. Requirements Delivered

| ID | Delivered as |
| --- | --- |
| **R-CAM-001** | Project-first resolution from CLARISA's declared `external_code`, via S1's shipped strip. No name matching anywhere; eligibility never re-derived |
| **R-CAM-002** | `POST auto-map/preview` (writes nothing) and `POST auto-map/apply` as separate calls; idempotency from step-6 re-classification inside the transaction; **no `@Cron`** |
| **R-CAM-003** | `MANUAL` rows immutable to automation — divergence **reported**, never touched. Byte-identity proven field-by-field, backed by `update`/`create`/`save` all asserted never called |
| **R-CAM-004** | `{mapped, pending, reachable}` keyed on the eligible cohort. No contract-table denominator anywhere; the denominator sentence is printed on screen and pinned in test |
| **R-CAM-005** | Supersession is deactivate + create — two rows, never a re-pointed one. No path updates `agresso_agreement_id` on an update |
| **NFR-CAM-001** | Non-empty cohort with zero `external_code` → 422 abort, zero writes. This is the release gate for production, which measures 31 eligible and **0** codes |
| **NFR-CAM-002** | `confidence_score` stays `null` — the matcher bypasses the DTO whose validator would have forced a value |
| **NFR-CAM-003** | One strip repo-wide, established by a sweep wider than a name grep (`replace(/^…`, `.slice(2)`, `startsWith`, `[A-Za-z]-`) |
| **NFR-CAM-004** | `DERIVED`, a new non-AI value. `AI_SUGGESTED`/`AI_AUTO` reserved, unwritten, and now rejected on the public DTOs |

## 4. Files Changed

**Server** — `bilateral-project-mapping/`: new `automapper.service.ts` (resolve → classify → apply → coverage), new `automapper.controller.ts` + `dto/automapper-run.dto.ts`, module registration, create/update DTO guards, and `db/migrations/1787175904293-addAutoMappingSource.ts` + `enum/mapping-source.enum.ts`. One read-only getter added to `clarisa-projects.service.ts` (declared out-of-scope, ruled justified).
**Client** — new `bilateral-mapping-coverage` and `automapper-dialog` component sets; `bilateral-mapping.component.{ts,html,spec.ts}`, `bilateral-mapping.service.{ts,spec.ts}`, `api.service.ts`, `bilateral-project-mapping.interface.ts`.

## 5. Test Evidence

| Gate | Result |
| --- | --- |
| Server suite | **333 suites / 2421 tests green** |
| Client suite | **310/311 suites · 6465/6468 tests** — the 3 failures are `to-promise.service.spec.ts` env URLs, **proven pre-existing** by stashing the client changes and re-running |
| Builds | `npm run build` **exit 0** on both packages |
| Migration | forward → revert → re-apply, **all three observed** against Dev; Dev left applied |
| Falsifiers | **Every task carried observed-red mutations**, not claimed ones — 4 in T-03, 3 each in T-02/T-04, 4 in T-05, 4 in T-06 |

⚠️ **`/akili-test` and `/akili-validate` were NEVER RUN.** No `test-report.md`, no `validation-report.md`.
There is no independent QA pass and no formal end-to-end requirement validation. **The user accepted this
absence explicitly on 2026-08-20.** Test evidence is per-task inside `execution.md`.

## 6. Validation

No `validation-report.md` (see above). **The visual check WAS performed — by the user, 2026-08-20**, who
reports the surface working correctly on screen.

⚠️ **One half it structurally could not cover:** the `ambiguous` bucket renders nothing against today's
data, because the measured feed has **zero collisions** (198/198 unique after the strip). Its two-row
collision layout is therefore visually unobserved — by absence of data, not omission. It becomes
observable the first time the feed collides, which is exactly why DD-4 built the branch.

## 7. Accepted Warnings & Follow-Ups

**Release-blocking**
- **Production has 0 `external_code`** (measured: 299 projects, 31 eligible, all codes null). The matcher aborts there rather than reporting "nothing to do". Ships safely ahead of the PRMS promotion — **the guard is the flag** (DD-8).
- **K-015:** the pipeline deploys code, not migrations. `1787175904293` is applied on Dev **by hand**; production needs the same deliberate step.

**Carried out of the spec — real, none in the approved task list**

| # | Item |
| --- | --- |
| 1 | No `@ApiResponse` on any handler, so **no output DTO reaches the Swagger schema** — despite the DTO file stating that is their purpose. `AutomapperCoverageResponseDto` is dead code. A human opening `/swagger` sees three endpoints with a bearer lock and no response schemas |
| 2 | `/swagger` render never verified (unavailable in-sandbox) |
| 3 | `apply()` could return its in-transaction classification, letting the client render post-apply divergence without a second round trip |
| 4 | `classify()` has no explicit `save`/`create`/`update` no-write assertion |
| 5 | The divergent panel shows a bare `Project ID 22` — `AutomapperReconciledEntry` carries no name for the *existing* project, and ids 22/138/246 sit outside the cohort where `full_name` is guaranteed. Server-side fix: the row already stores `clarisa_project_short_name` |
| 6 | `phase` is hardcoded to 2026 in three client places and always sent, so the surface **ignores the admin-configured phase** (`resolvePhase` treats the argument as an override). Needs a server-returned `phase_used` |
| 7 | **RB-7** concurrent applies are not serialized — no `pessimistic_write`, unlike the sibling `create()`. The unique index is the backstop, so no corruption; a race yields a 500 and a full rollback where the sibling returns a clean 409 |
| 8 | **RB-10** unbounded `IN` list at three sites. Fine at 198; if ever chunked it must be **one shared helper, not three copies** (K-005) |
| 9 | Two in-flight previews are not sequenced (open → close → reopen). Not user-visible: reopening sets `loadingPreview` synchronously, and RB-8's server-side re-resolution means a stale preview can never write |
| 10 | **OQ-5** — is `Confirmed` the right science-program status filter? Owner PRMS. Does not affect the join |

## 8. Historical Notes — what this spec actually taught

**The budget was exceeded 3× and the reason was not scope.** §14 budgeted 2 review rounds and predicted
the overrun would come from *"the review surface growing into a full queue UI"* or *"ambiguity handling
expanding beyond DD-4"*. **Neither happened.** Six rounds ran; **five went to one defect class — a gate
that could not go red** — and in every one the production code was already correct. The LOC estimate was
low by ~75% because it counted production lines while the falsifier discipline roughly doubles test volume.

**The failure mode escalated three levels, and each level was invisible to the one below.**

| Level | Instance |
| --- | --- |
| A fixture that does not discriminate | T-02's AGRESSO `is_active`, T-04's `IN` cohort scope — deleting the guard reddened nothing |
| A **scaffold** that cannot | T-03's shared mock had a **no-op `andWhere`**, so a correctly-written test still would not have reddened |
| A fixture testing a state the product **never reaches** | T-06 — every dialog test set `visible=true` before the first `detectChanges()`, so the construct-false-then-open sequence was never exercised |

**Only the third was a behaviour defect — and it was the only one.** Opening the auto-mapper dialog never
loaded its preview: R-CAM-002's trigger→preview flow did not run in production, and the suite was green.

**Cross-host dispatch caught it.** T-06 was sent to Antigravity (Gemini 3.7 Flash) to save context and
reviewed on Claude/opus. **The spec's only behaviour defect in seven tasks was written by one model family
and caught by another** — five same-family review rounds had never needed to catch one. `author ≠ auditor`
held on *family*, not just instance.

**Three Leader arguments reasoned from the design's own frame were wrong**, one exactly backwards (claiming
`C-D-514` catches a repeat-while-prefix bug that `C-C-A1` actually catches and it does not). Two false
claims reached committed test descriptions before review caught them.

**Two spec documents asserted things their own requirements forbade.** `design.md` §2 told the implementer
to inject `AgressoContractRepository`, which the module header explicitly bans (REQUEST-scope cascade,
NFR-BAS-001). §4 described four report buckets when R-CAM-003 and R-CAM-005 need six — `divergent` and
`supersede` as **data**, not counts. Both were amended; neither was an implementation deviation.

**A Leader brief was self-contradictory and the worker said so** rather than silently picking a horn —
"change no production code" alongside "implement the §9 log line", which is production by definition.

**Three near-misses on the orchestration path, all from the same root:** trusting a success signal.
`dispatch --inject` returned `injected: true` **before** agy accepted the prompt; a `check` call with an
invalid flag returned `ok: false` and was **nearly read as "no messages"** (K-014 — a count over a failed
command is a confident zero); and the worker's `worker_done` was a prose summary while the real jest `FAIL`
output sat unsent in its terminal buffer.

> **The lesson this spec earns is one sentence: K-004 binds the argument as tightly as it binds the
> command.** If the red has not been *seen*, it may not be asserted — not in a code comment, not in a
> dispatch brief, not in a review verdict, and not in a budget note.
