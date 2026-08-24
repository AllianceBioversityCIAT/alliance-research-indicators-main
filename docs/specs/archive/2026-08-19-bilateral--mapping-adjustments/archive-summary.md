# Archive Summary — bilateral / Mapping Adjustments (AC-1676)

> **Outcome:** the splitter did its job and is closed. It decomposed AC-1676 into four vertically-sliced chunks; **C1 and C2 were delivered and archived on 2026-08-13**, and **C3/C4 were descoped by PM agreement on 2026-08-12**. Nothing in this folder was ever implemented directly — by design.

## 1. Document Control

| Field | Value |
| --- | --- |
| **Original spec path** | `docs/specs/bilateral/mapping-adjustments/` |
| **Archive path** | `docs/specs/archive/2026-08-19-bilateral--mapping-adjustments/` |
| **Archive date** | 2026-08-19 |
| **Jira** | [AC-1676](https://cgiarmel.atlassian.net/browse/AC-1676) — *"Adjusments in the bilateral mapping process"* · Epic [AC-1385](https://cgiarmel.atlassian.net/browse/AC-1385) |
| **Type** | Change (BA-driven adjustment set) |
| **Final status** | ✅ **Closed — every chunk terminal.** Delivered scope (C1+C2) shipped; descoped scope (C3+C4) reassigned |
| **Artifact class** | **Splitter / umbrella proposal.** `proposal.md` only, by design |

## 2. What it was

AC-1676 arrived as one Jira ticket and turned out to be **eleven adjustments** spanning copy, validation, schema and two new PRMS integrations. The proposal's own finding: three adjustments were **already implemented** in the working module, two were one-file changes, and two were blocked on a PRMS API contract that did not exist in the repo.

**The problem it framed.** The bilateral mapping tab treated every Science Program as equal and interchangeable — `result_pool_funding_alignment_sp` stored a flat list of `sp_code` with no role column. PRMS routes a result to a **Primary** SP first; **Contributing** SPs are notified only after approval and cannot change the verdict. STAR had no way to express that. Separately, ToC mapping was all-or-nothing (`aligns_with_toc: true` demanded `level` + `toc_result_id` + `indicator_id` or returned `400`), while the BA required partial completion without blocking submission.

## 3. Chunk outcomes — the actual deliverable of a splitter

| Chunk | Slug | Adjustments | Outcome |
| --- | --- | --- | --- |
| **C1** | `bilateral/toc-optional-mapping` | A1, A5 + verify A2/A6/A10/A11 | ✅ **Delivered & archived 2026-08-13** — 16 commits, `/akili-test` PASS, `/akili-validate` FAIL on the evidence trail (not the code); gaps reviewed and accepted by the user → [`archive/2026-08-13-bilateral--toc-optional-mapping/`](../2026-08-13-bilateral--toc-optional-mapping/) |
| **C2** | `bilateral/primary-contributing-sp` | A3, A4, A7 | ✅ **Delivered & archived 2026-08-13** — specified Full depth (`R-BIL-120`–`129` + 3 NFRs), **A7 deferred** (OQ-1 unanswerable from the repo) → [`archive/2026-08-13-bilateral--primary-contributing-sp/`](../2026-08-13-bilateral--primary-contributing-sp/) |
| ~~C3~~ | ~~`bilateral/prms-submission`~~ | ~~A8~~ | **Descoped 2026-08-12** by agreement with the Product Manager; carried by a separate user story |
| ~~C4~~ | ~~`bilateral/prms-review-sync`~~ | ~~A9~~ | **Descoped 2026-08-12**, same agreement |

**Build order held.** C1 → C2, strictly sequential and explicitly *not* parallel-safe: both edit `bilateral.service.ts` and both edit `pool-funding-alignment.component.ts` / `sp-toc-alignment-block.component.ts`.

## 4. Files changed

**None by this folder.** A splitter produces no diff. All implementation lives in the two archived chunk specs and their own `execution.md` trails.

## 5. Test & validation evidence

**Held by the chunks, not here.** C1 carries `/akili-test` PASS and a `/akili-validate` FAIL on the evidence trail (not the code), with gaps reviewed and accepted by the user. C2 carries its own Full-depth spec and execution record.

**This folder has no `requirements.md`, `design.md` or `tasks.md` — and §13 explicitly forbade it acquiring any**, on the grounds that specifying it would re-specify shipped C1 work and duplicate C2. The readiness gate's usual document check is therefore satisfied by the chunks' own records; **the equivalent check for a splitter is that every chunk is terminal**, which was verified at archive time: both delivered chunks archived, both descoped chunks reassigned.

## 6. Correction recorded at archive time

**`proposal.md` §13 is stale and is left unedited as a point-in-time record.** It reads *"Next step — execute C2"* and links `../primary-contributing-sp/`. That folder no longer exists: C2 was archived to `archive/2026-08-13-bilateral--primary-contributing-sp` on the same day the pointer was written. The link has been dead since.

Both chunks reached terminal state on **2026-08-13**; this splitter stayed in active `docs/specs/` until **2026-08-19** — six days advertising a next step that had already been taken. It surfaced only because a `/akili-resume` briefing followed the link. Recorded as the Kaizen finding for this archive.

## 7. Accepted warnings and follow-ups

| # | Item | Disposition |
| --- | --- | --- |
| **1** | **C3 / C4 (PRMS submission + review sync, adjustments A8/A9)** — STAR must submit Primary+ToC+Contributing to PRMS and ingest 7 classes of review notification. `reviewDecision()` still throws *"Bilateral review decision is not implemented yet"* | **Descoped, not dropped.** Owned by a separate user story per PM agreement 2026-08-12. This archive does **not** close them |
| **2** | **A7 deferred within C2** — OQ-1 had no answer in the repository | Carried by C2's own archived record |
| **3** | **The 3 Jira attachments + Miro flow were never ingested** into a `mockup/` folder, though the 2026-05-24 decision named them canonical UX | Recorded in C2's `requirements.md` §8 as accepted risk (defect class D-5: the Primary/Contributing visual distinction has neither an automated gate nor its intended human reference) |
| **4** | **BA answers to OQ-3 and OQ-5** | Working assumptions documented and implementable; OQ-2 closed on technical and empirical grounds |

## 8. Historical notes

**The split was the value.** Option A (one spec for all of AC-1676) was rejected because it would couple a one-line copy change to two unspecified integrations, and nothing would ship until the PRMS contract existed. Option B (split by technical layer) was rejected because no layer is independently shippable — a schema-only chunk delivers zero user value and leaves the module half-migrated between merges. Option C's constraint was that **each chunk leaves the module fully working**, and it held: C1 and C2 shipped independently without an intermediate broken state.

**A splitter has no completion signal of its own.** Its children each get an archive; the parent gets nothing. That is the gap this archive closes late, and the reason it went unnoticed for six days — recorded as a Methodology lesson for upstreaming. The `family.md` manifest convention introduced since would have made this visible: a manifest carries per-child `Status`, and `/akili-resume` reads it. This proposal predates that convention and expressed its split in prose instead.
