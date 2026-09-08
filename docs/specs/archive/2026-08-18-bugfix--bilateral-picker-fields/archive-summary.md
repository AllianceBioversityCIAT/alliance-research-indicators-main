# Archive Summary — Clarisa / Bilateral Project Picker Fields

> **Outcome:** the picker was unusable — 342 of 342 options labelled with a bare code, and no way to search by name. It now shows readable names, searches them, orders by them, and no longer renders any name twice. **Seven tasks, six with an independent reviewer verdict, one closed under an explicit user waiver.** The one gap that ships unverified is the visual/layout behaviour, which the spec declared unautomatable from the start.

## 1. Document Control

| Field | Value |
| --- | --- |
| **Original spec path** | `docs/specs/bugfix/bilateral-picker-fields/` |
| **Archive date** | 2026-08-18 |
| **Type** | Bug · **Depth** Standard, Bug Mode · **Approval Mode** `gated` |
| **Final status** | **Completed**, with T-04 partial and three follow-ups carried forward |
| **Branch** | `JuankCadavid/AC-1676` — 10 commits, pushed |

## 2. Requirements delivered

| ID | Behaviour | Task(s) | Verdict |
| --- | --- | --- | --- |
| R-BPF-001 | Response carries `full_name` + `description` (additive) | T-01 | PASS |
| R-BPF-002 | Search matches `short_name` OR `full_name` OR `external_code` | T-01, T-05 | PASS |
| R-BPF-003 | Client filter stops discarding what the server matched | T-02, T-06 | PASS |
| R-BPF-004 | Label shows code + name, **once** when they are the same string | T-02, T-03, T-06, T-07 | PASS ×3 + 1 waived |
| R-BPF-005 | Long name clips and stays accessible | T-02 (accessible text) | partial — see §5 |
| R-BPF-006 | Deterministic order by name | T-01 | PASS |
| NFR-BPF-001/002/003 | Additive contract · accessible label · no new upstream call | T-01, T-02, T-05 | PASS, NFR-002 partial |

## 3. Files changed

| Package | File | Net |
| --- | --- | --- |
| server | `clarisa-projects.controller.ts` + spec | +33 / −12 prod, +244 test |
| server (admin) | `admin/client/pages/BilateralProjectMappings.tsx` | +26 / −5 |
| client | `bilateral-mapping.component.{ts,html}`, `bilateral-project-mapping.interface.ts`, spec | +16 prod, +294 test |

**No schema change, no migration, no new endpoint, no new dependency, no new CSS.**

## 4. Test evidence

Every red-before-green figure below was **captured by the Leader in isolation**, not accepted from an Implementer's report — a discipline adopted after T-01 claimed *"adhering to K-004 gates"* without supplying the output.

| Task | RED (on `HEAD`, new spec kept) | GREEN |
| --- | --- | --- |
| T-01 | 5 failed / 9 passed / 14 | 14 / 14 |
| T-02 | 8 failed / 63 passed / 71 | 71 / 71 |
| T-05 | 4 failed / 13 passed / 17 *(3 before rework)* | 17 / 17 |
| T-06 | **7 failed / 70 passed / 77 — all seven new, none passed on `HEAD`** | 77 / 77 |

**Full suites, re-measured with nothing else running:** server **326 suites / 2261 tests, all green**. Client **307 of 308 suites green**; the one failure is 3 pre-existing `ToPromiseService` tests, proven unrelated by stashing every change and re-running on a clean tree.

Raw output in `evidence/`.

## 5. Validation summary

No `/akili-validate` pass was run. Verification was the per-task reviewer gate plus the Leader's isolated re-measurement.

**What ships unverified, named rather than implied:** the visual and layout behaviour of the label (clipping, dialog width, tooltip reveal) and whether the accessible name reaches assistive technology (**OQ-4**). `requirements.md` §6 **D-4** declared this class unautomatable at specification time and named a human check as its substitute; that check ran only partially — see the T-04 entry in `execution.md`.

## 6. Accepted warnings and follow-ups

| # | Item | Why it is not in this spec |
| --- | --- | --- |
| **F-1** | **STAR's picker shows no identifier**, while the mappings table shows `(id 17)` and the admin panel shows `[17]`. Raised by the user at close | A requirement change (amend R-BPF-004). Offered as "Option B" during the Pivot and declined — then re-raised with new evidence: the id is *already on screen in two sibling surfaces*, which was not argued at decision time |
| **F-2** | **OQ-2** — the `clarisa_project_short_name` snapshot column still stores codes; STAR omits it on create (stored `NULL`) while the admin panel writes it | Touches stored data, the mapping-list search key and a user-facing read path. A data decision, deliberately out of scope throughout |
| **F-3** | **`phase = 2026` now returns 0 rows on both CLARISA hosts.** Any environment applying the archived Alliance-selector bugfix's default gets an **empty picker** | Discovered by this spec's Pivot re-measurement; belongs to that spec's owner, not this one. **The highest-severity item on this list** |
| **F-4** | **OQ-4** — is `[title]` sufficient for assistive technology? | Applies to both pickers, not just this change |
| **F-5** | 3 pre-existing `ToPromiseService` failures in the client suite | Proven unrelated; belongs to whoever owns client environment config |

## 7. Historical notes — what this cycle actually cost, and why

**A Pivot mid-implementation.** CLARISA's test feed reset while T-01–T-03 were landing: 1365 rows → 299, `phase 2026` 342 → 0, and `short_name == full_name` 25 of 367 → **25 of 25**. R-BPF-004 had specified "both present" and "name absent" only, because the third case was 0 of 342 when it was written. The shipped label consequently rendered every name twice — reported by the user from the running UI. The requirement was wrong, not the code. Options A + C were approved and became T-05…T-07.

**Reviewer transport was the dominant cost.** 12 reviewer dispatches; **4 genuine non-deliveries**, all stalling at the same phase — after ingesting the material, at the moment of emitting the verdict. Two mitigations worked: an **incremental report file** (T-01 attempt 4, which also made the verdict durable independent of the message) and a **hard N-short-lines output contract** (T-03, T-05, T-06, T-07).

**Four Leader errors, recorded in `execution.md` with names rather than smoothed over.** A file-swap that destroyed T-01's fix while leaving `git status` clean; a dispatch fired one second after terminal creation, swallowed by a booting CLI; a reviewer declared stalled that was in fact still working and then delivered; and **a 0-byte diff handed to a reviewer, which produced a confident FAIL against stale code**. The last is the one worth carrying: an empty artifact does not yield a null review — it yields a wrong one wearing a verdict.

**What went right and is worth repeating:** naming the concrete failing input in the brief. T-01 shipped 3 tests that passed on `HEAD`, T-05 shipped 1, **T-06 shipped 0**. The model did not change; the brief did.
