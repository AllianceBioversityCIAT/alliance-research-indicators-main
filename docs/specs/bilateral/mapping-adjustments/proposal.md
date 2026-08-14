# Proposal — Bilateral mapping adjustments (AC-1676)

> **Headline:** AC-1676 is not one change. It is **eleven adjustments** spanning copy, validation, schema, and two new PRMS integrations. **Three are already implemented** in the working module, **two are one-file changes**, and **two are new integrations blocked on a PRMS API contract that does not exist in this repo yet.**
>
> **Status — 2026-08-12:** the split was **approved**. The PRMS round-trip (C3, C4) is **descoped from AC-1676 by agreement with the Product Manager** and will be carried by a separate user story. **This spec area now delivers C1 and C2 only.**
>
> **Status — 2026-08-13:** **C1 delivered and archived.** C2 specified at Full depth (`R-BIL-120`–`129`), with **A7 deferred** — OQ-1 has no answer in the repository. This file is a **splitter and should never be specified directly**; see §13. Two amendments below correct premises that are now false — §9.1 (R-4/OQ-2 backfill) and §9.3 (kaizen log).

---

## 1. Document Control

| Field | Value |
| --- | --- |
| Spec path | `docs/specs/bilateral/mapping-adjustments/` |
| Slug | `mapping-adjustments` — **derived from free-text argument** (the `/akili-propose` argument was a sentence, not a slug); module folder `bilateral/` per `CLAUDE.md` §2 taxonomy |
| Jira | [AC-1676](https://cgiarmel.atlassian.net/browse/AC-1676) — *"Adjusments in the bilateral mapping process"* |
| Epic | [AC-1385](https://cgiarmel.atlassian.net/browse/AC-1385) — Module to map W3/Bilateral results to CGIAR Pool Funding (SP/A) |
| Jira status | In Progress · Priority **High** · Reporter Manuel Ricardo Almanzar Villa · Assignee Juan Carlos Cadavid |
| **Type** | **Change** (BA-driven adjustment set; the module is in working order — this is not a bug track) |
| **Approval Mode** | **gated** (no explicit end-to-end mandate given) |
| Branch | `JuankCadavid/AC-1676` |
| Depends on | none (this proposal); per-chunk dependencies in §10 |
| Parallel-safe | **no** — C1/C2 share `bilateral.service.ts`; see §10 |
| Scope decision | **2026-08-12** — split approved by the user; **C3/C4 descoped by agreement with the Product Manager**, to be re-raised as a separate US. Delivered scope = **C1 + C2**. |
| Prior art | `docs/specs/archive/2026-06-17-bilateral-module*`, `docs/specs/archive/2026-07-02-bilateral-module--mapping-drives-pool-funding-tag` |

---

## 2. Intent

Bring the bilateral mapping section in line with how PRMS actually governs a bilateral result: **one Primary Science Program owns the verdict, Contributing Science Programs only accept or decline their own slice**, Theory-of-Change mapping becomes genuinely optional, and PRMS review outcomes flow back into STAR and are displayed with history.

The module is live and working. Every adjustment below is scoped so the **currently-shipping behavior stays shippable at each step** — no chunk leaves the tab in a broken intermediate state.

---

## 3. Problem / Current Behavior

The bilateral mapping tab today treats every selected Science Program as **equal and interchangeable**:

| Concern | Today | Why it is wrong per AC-1676 |
| --- | --- | --- |
| SP roles | `result_pool_funding_alignment_sp` stores a flat list of `sp_code` rows. No role column. | PRMS routes the result to a **Primary** SP first; Contributing SPs are notified only after approval and cannot change the overall verdict. STAR cannot express this. |
| ToC scope | Any selected SP can carry a ToC alignment. | Only the Primary SP may be ToC-mapped **in STAR**. |
| ToC completeness | `aligns_with_toc: true` **requires** `level` + `toc_result_id` + `indicator_id`, else atomic `400 missing_required_fields` (`bilateral.service.ts:905-917`). | The BA now requires partial completion — HLO only, HLO+Indicator, HLO+Indicator+Contribution, or nothing at all — without blocking submission. |
| The question | *"Does this result align with the Program's TOC indicators?"* (`sp-toc-alignment-block.component.ts:160`) | Association with an SP already implies alignment. The question should ask whether the user **wants to complete the optional detailed mapping**. |
| PRMS round-trip | `reviewDecision()` throws `"Bilateral review decision is not implemented yet"` (`bilateral.service.ts:1218-1224`). No outbound submission. | STAR must submit Primary+ToC+Contributing to PRMS and ingest 7 classes of review notification. |

### 3.1 What is already correct — do not rebuild

Verified in the working code. These AC-1676 bullets need **confirmation tests, not implementation**:

| AC-1676 rule | Already satisfied by |
| --- | --- |
| Selector shows `SP06 – 10% – Climate Action` | `pool-funding-alignment.component.html:151,165` renders `{{code}} — {{allocation}}% - {{name}}`; `allocation` supplied by `BilateralScienceProgramItem` |
| Show indicator unit **and target** before requesting contribution | `TocAlignmentReadbackResponse` carries `unit_of_measurement`, `target_value`, `target_year`; FE has `UNIT_LABEL` / `TARGET_LABEL` |
| Read-only once submitted to PRMS | `is_read_only = isPrmsSourced \|\| isSyncedToPrms` (`bilateral.service.ts:575`), enforced as `409` on write (`:667`, `:1320`) |
| One SP's ToC must not overwrite another's | Partial-unique active row per `(result, sp)` in `result_pool_funding_toc_alignment` (migration `1779190000015`) |

---

## 4. Proposed Outcome

A contributor opening the bilateral mapping section on an approved result can:

1. Designate **exactly one Primary SP** and any number of **Contributing SPs**, visually distinct, mutually exclusive.
2. Be asked *"Would you like to complete the detailed Theory of Change mapping for this result?"* — for the **Primary SP only**.
3. Answer **Yes** and stop at any depth (Level → HLO/Outcome → Indicator → Quantitative Contribution) **without being blocked from submitting**.
4. Submit; the section locks; PRMS takes over.
5. See the **latest PRMS decision per SP** plus a **review history** identifying which SP did what, when, and why.

---

## 5. Scope

### 5.1 In scope

The eleven adjustments, grouped by the chunk that will own them (§10):

| # | Adjustment | Chunk | Delta size |
| --- | --- | --- | --- |
| A1 | Reword the alignment question | C1 | 1 line + specs |
| A2 | SP selector shows code – % – name | C1 | **verify only** |
| A5 | Allow partial / optional ToC completion | C1 | validator relaxation |
| A6 | Unit + target shown before contribution | C1 | **verify only** |
| A10 | Read-only after PRMS submission | C1 | **verify only** |
| A11 | Per-SP ToC isolation | C1 | **verify only** |
| A3 | Primary SP (exactly 1) vs Contributing SPs (0..n), mutually exclusive | C2 | migration + DTO + validation + read-back + FE |
| A4 | ToC mapping restricted to the Primary SP in STAR | C2 | validation + FE gating |
| A7 | Enable the section on Principal-Investigator approval | C2 | **blocked — see OQ-1** |
| ~~A8~~ | ~~Submit Primary + ToC + Contributing SPs to PRMS~~ | ~~C3~~ | **DESCOPED 2026-08-12** — separate US |
| ~~A9~~ | ~~Ingest 7 PRMS notification types; store + display history~~ | ~~C4~~ | **DESCOPED 2026-08-12** — separate US |

### 5.2 Non-goals

- **Reopening the ToC catalog source.** `toc-integration/` (lambda-toc, 5-min keyed cache) stays as-is.
- **Retiring `tools/prms-toc/`.** That is the still-gated T-10 follow-up under R-BIL-098 — explicitly out of this spec.
- **Changing pool-funding tag derivation.** `pool-funding.util.ts` and its three call sites are untouched.
- **PRMS-side UI or behavior.** ARI only produces and consumes the contract.
- **Resolving carried-over BA questions** OQ-V2-2/3/5/6 unless a chunk is blocked on one.
- **Fixing RB-5** (pre-existing lint error at `bilateral.service.ts:205`) — flagged, not owned here.
- **The PRMS round-trip (A8 / A9).** Descoped 2026-08-12 by PM agreement. Outbound submission and inbound review notifications move to their own user story. The analysis in §9–§10 is retained as **forward-looking design pressure** — C1 and C2 must not foreclose it (see §11 condition 2) — but neither is delivered here.

---

## 6. Affected Users, Systems, And Specs

| Surface | Impact |
| --- | --- |
| **Result Contributor** (PRD §3.1) | Primary changes: new SP-role selection, reworded question, submission no longer blocked by incomplete ToC |
| **MEL Regional Expert** (PRD §3.2) | Reads PRMS decisions + history on results in scope |
| **Server** `domain/entities/bilateral/` | `bilateral.service.ts` (1469 L), controller, DTOs, 2 entities, 3 repositories |
| **Server** `db/migrations/` | 1 append-only migration (SP role) |
| **Client** `pages/result/pages/pool-funding-alignment/` | Component (717 L) + block (480 L) + **2645 L of existing specs** that will need updating |
| **Socket** | `result.pool-funding-alignment.changed` payload (SP-role awareness in C2) |
| **OpenSearch** | `sp_code` is `@OpenSearchProperty`-decorated — a role column may warrant indexing |
| **Docs** | `docs/ux-ui/design.md` §12.2 decision entry; PRD OQ-2 role list |

---

## 7. Visual Reference

- **Source:** Jira attachments (3) + Miro reference flow — **not yet ingested**.
- **Location:**
  - Miro: `https://miro.com/app/board/uXjVHYHjK3s=/?moveToWidget=3458764677790590965&cot=14`
  - `image-20260717-140125.png` (302 KB) — ToC Alignment block
  - `image-20260721-135915.png` (54 KB) — post-submission / review state
  - `image-20260723-145821.png` (111 KB) — the reworded question
- **Notes:** The attachments sit behind Jira media auth and could not be fetched in this session. **They are the canonical UX for C1's copy change and C2's Primary/Contributing selector.** The 2026-05-24 decision in `docs/ux-ui/design.md` §12.2 established *"trust the Figma mockups as canonical UX"* for this exact tab — so these images must be pulled before `/akili-specify` runs on C1 or C2. Fastest path: download them from the ticket into `docs/specs/bilateral/mapping-adjustments/mockup/`.

---

## 8. Requirement Delta Preview

### ADDED

- **Primary SP** — exactly one per bilateral result; selected from the SPs associated with the bilateral; any allocation percentage is eligible; visually marked as Primary.
- **Contributing SPs** — zero or more; mutually exclusive with Primary; visually distinct.
- **Partial ToC completion** — a "Yes" answer may stop after Level, HLO/Outcome, Indicator, or Contribution. Missing ToC data must not block submission once a Primary SP exists.
- **PRMS outbound submission** carrying Primary SP + its ToC alignment (when present) + each Contributing SP.
- **PRMS inbound notifications** — 7 event types (Primary rejected / approved / updated ToC; Contributing accepted / declined / completed-updated ToC; PRMS error), each carrying result id, PRMS id, SP id + name, **SP role**, decision/status, timestamp, comment/justification, updated ToC, error detail.
- **Review history display** — latest status per SP plus a chronological trail attributing each action to an SP.

### MODIFIED

- **Alignment question copy** → *"Would you like to complete the detailed Theory of Change mapping for this result?"* — this also shifts the **semantics** of the persisted `aligns_with_toc` flag from *"is aligned"* to *"opted into detailed mapping"* (see §9 R-1).
- **`validateTocAlignments`** — `missing_required_fields` must no longer fire on a partially-completed "Yes"; catalog validation (`unknown_toc_result_id`, `unknown_indicator_id`, `level_not_allowed`) becomes **conditional on the field being present**.
- **ToC write authority** — restricted from *any selected SP* to *the Primary SP* (STAR-originated writes only; see OQ-3).
- **Section enablement gate** — from `eligible` (pool-funding contributor) to *PI-approved* (blocked on OQ-1).
- **`result_review_history`** — must accommodate a non-human PRMS actor and per-SP attribution.

### REMOVED

- Nothing removed. No endpoint retired, no column dropped. Contributing-SP ToC rows are **retained** (PRMS may populate them inbound per OQ-3), not deleted.

---

## 9. Risks, Dependencies, And Open Questions

### 9.1 Regression risks — the module works today

> **⚠ Amended 2026-08-13 by `/akili-specify` (C2).** The **R-4** row below states that post-migration *"existing results have no Primary → the new 'exactly one' invariant is violated by legacy data."* **Production holds no mapped SP data** (product owner, 2026-08-13); the mapped data is fake DEV test data. **OQ-2 is closed** — see [`../primary-contributing-sp/requirements.md` §1.1](../primary-contributing-sp/requirements.md) and [`design.md` D-C2-3](../primary-contributing-sp/design.md). Rows left unedited as a point-in-time record.

Ordered by blast radius. The user's explicit constraint is that current behavior must survive.

| # | Risk | Why it bites | Mitigation |
| --- | --- | --- | --- |
| **R-1** | **Semantic drift on `aligns_with_toc`** — the column keeps its name while its meaning changes. | Every reader (read-back, snapshots, future PRMS payload) silently reinterprets stored booleans. | Keep the column; record the semantic shift as a design decision; do **not** rename mid-flight. Values stay compatible (`true` = mapped). |
| **R-2** *(deferred)* | **`result_review_history.actor_user_id` is `NOT NULL`** and there is no `sp_code` / `sp_role` / `prms_id` / `source` column. | Belongs to the descoped PRMS story — recorded here so the future spec inherits it rather than rediscovering it. | Out of scope for C1/C2. Do not "pre-solve" it. |
| **R-3** | **Relaxing validation weakens the snapshot guarantee.** Today a "Yes" row always resolves to a catalog-validated indicator, so snapshot fields are populated. | Partial rows produce null `indicator_description` / `unit_of_measurement` / `target_value`. FE display — and, later, the PRMS payload — must tolerate nulls. | Make null-tolerance an explicit acceptance criterion in C1. This is the main way C1 could foreclose the deferred PRMS story, so the null contract must be documented, not implicit. |
| **R-4** | **Backfill of the Primary flag.** Existing results carry N SPs with no role. | Post-migration, existing results have no Primary → the new "exactly one" invariant is violated by legacy data. | **OQ-2.** Options: leave null and treat as "unset" in the UI, or auto-promote the highest-allocation SP. Must not retro-break `is_read_only` results. |
| **R-5** | **Atomic-validation contract change is FE-visible.** RB-4 already lists the six 400 codes as a frozen relay to the STAR FE. | Dropping `missing_required_fields` changes a contract the FE branches on. | Coordinate as a contract change in C1; update the RB-4 relay note. |
| **R-6** | **Large FE spec surface.** 1582 + 1063 lines of existing spec for the two components. | Copy and gating changes ripple widely; coverage floors are low (branches 20%) so a silent regression can pass. | Budget spec-update effort explicitly in C1/C2 tasks. |
| **R-7** | **OpenSearch drift.** `sp_code` is `@OpenSearchProperty`-decorated; D-pf-5 already records that the `agresso_contracts` doc indexes the raw pool-funding column. | A new role column that is not indexed adds a second drift axis. | Decide indexing in C2 design; record either way. |
| **R-8** | **`lambda-toc` DNS (RB-1, open).** Host did not resolve on the office resolver. | C1/C2 catalog-path testing 503s cold. | Confirm infra resolution before executing C1; otherwise pin a resolver locally. |
| **R-9** *(deferred)* | **Write-lock vs PRMS writes.** `is_read_only` blocks writes even for `SYSTEM_ADMIN`. | Belongs to the descoped PRMS story. **C1/C2 must not widen this guard** — the existing lock is load-bearing for A10. | Leave `is_read_only` semantics exactly as they are. |

### 9.2 Dependencies

- **Miro + 3 Jira attachments** — canonical UX (§7). **Blocking C1 and C2.**
- **CLARISA** SP list with allocations — already wired via `getScienceProgramsForResult`.
- ~~**PRMS API contract**~~ — no longer a dependency of this spec area; it moves with the descoped story. AC-1676 says notifications arrive *"through the agreed API integration"*, but no such contract exists in this repo, which is precisely why the split is the right call.
- **AC-1441 (US5, "push results to PRMS")** overlaps the descoped outbound work. When that story is raised, confirm with the BA whether it *is* AC-1441 or a sibling, to avoid a duplicate spec.

### 9.3 Open questions

| # | Question | Blocks |
| --- | --- | --- |
| **OQ-1** | **What is "approved by the Principal Investigator"?** No PI concept exists in the result lifecycle — the term appears only in OICR email templates. Is this an existing `result_status` transition, the OICR PI flow, or a new role? | A7 / C2 enablement gate |
| **OQ-2** | **Primary-SP backfill for existing results** — leave unset, or auto-promote highest allocation? (R-4) | C2 migration |
| **OQ-3** | **Ticket contradiction.** *"Only the Primary SP may be mapped to the TOC in STAR"* + *"Contributing SPs do not complete TOC alignment in STAR"* vs *"For each selected SP, the user must be able to indicate whether the result aligns with that program's TOC"* and *"The TOC mapping for each SP must be stored separately."* **Working assumption:** STAR **writes** ToC for the Primary SP only; the per-SP table is **retained** because PRMS may later return Contributing-SP ToC inbound. Needs BA confirmation. **Still blocking C2 even with C3/C4 descoped** — it decides whether C2 deletes or preserves Contributing-SP rows, and deleting them would foreclose the deferred story. | **C2** |
| **OQ-4** | Does the **version gate** (`MAPPABLE_LIVE_VERSION = 2026`, `409 toc_mapping_version_locked`) still apply once mapping is optional? | C1 |
| **OQ-5** | Can the **Primary SP be changed** after selection but before PRMS submission? Does that cascade-delete its ToC alignment (mirroring the existing SP-deselection cascade)? | C2 |
| ~~OQ-6~~ | ~~New socket event for PRMS review updates?~~ | **Moved** to the descoped PRMS story |
| **OQ-7** | Carried over and still open: **OQ-V2-2/3/5/6** (indicator-type filter, one-alignment-per-SP cardinality, level rules for other result types, target year). OQ-V2-3 in particular interacts with the Primary-only rule. | C2 |

*(~~No `docs/specs/kaizen-log.md` exists in this repo, so no Active Lessons apply.~~ — **Corrected 2026-08-13:** the kaizen log now exists and carries three Active Lessons produced by the C1 run: **K-001** `npm run lint` is `eslint --fix` and cannot serve as a verification gate; **K-002** the client tier can be certified green while type-checked by nothing (`isolatedModules: true`, ESLint ignores `*.spec.ts`); **K-003** correction-closure sweeps must grep the **literal** superseded string and re-grep to confirm. All three bind C2 — see [`../primary-contributing-sp/design.md` §9 and §13](../primary-contributing-sp/design.md).)*

---

## 10. Approach Options

### Option A — One spec for all of AC-1676

| | |
| --- | --- |
| **Pros** | 1:1 with the Jira ticket; single review thread. |
| **Cons** | Couples a 1-line copy change to two unspecified integrations. Nothing ships until the PRMS contract exists. Migration + validator + FE + 2 integrations in one diff is exactly the shape that regresses a working module. |
| **Verdict** | Rejected. |

### Option B — Split by technical layer (schema / API / FE)

| | |
| --- | --- |
| **Pros** | Clean ownership per layer. |
| **Cons** | No layer is independently shippable — a schema-only chunk delivers zero user value and leaves the module half-migrated between merges. Violates the "working at every step" constraint. |
| **Verdict** | Rejected. |

### Option C — Split into 4 vertically-sliced, independently shippable chunks ✅

Each chunk leaves the module fully working and delivers observable value on its own.

| Chunk | Slug | Adjustments | MoSCoW | Effort | RICE signal |
| --- | --- | --- | --- | --- | --- |
| **C1** | `bilateral/toc-optional-mapping` | A1, A5 + verify A2/A6/A10/A11 | **Must** | **S** | Highest — every contributor; unblocks submissions that 400 today; delta is one string + one validator; 4 of 6 items are verification |
| **C2** | `bilateral/primary-contributing-sp` | A3, A4, A7 | **Must** | **M–L** | High reach, high impact, medium confidence — schema + FE redesign; prerequisite for all PRMS routing |
| ~~C3~~ | ~~`bilateral/prms-submission`~~ | ~~A8~~ | **DESCOPED** | — | Moved to a separate US (PM agreement, 2026-08-12) |
| ~~C4~~ | ~~`bilateral/prms-review-sync`~~ | ~~A9~~ | **DESCOPED** | — | Moved to a separate US (PM agreement, 2026-08-12) |

**Build order (delivered scope):** `C1 → C2`

| Chunk | Depends on | Parallel-safe | Why |
| --- | --- | --- | --- |
| C1 | none | **no** | shares `validateTocAlignments` with C2 |
| C2 | C1 | **no** | same validator + same FE components |

C1 and C2 are strictly sequential. Both edit `bilateral.service.ts` and both edit `pool-funding-alignment.component.ts` / `sp-toc-alignment-block.component.ts`, so running them concurrently in separate worktrees would guarantee conflicts. Do not dispatch them as a fleet.

---

## 11. Recommended Approach

**Option C, reduced to C1 + C2** by the 2026-08-12 PM agreement — with two conditions:

1. **Ship C1 first, alone.** It is the smallest safe path to real user value: users currently cannot submit a result when they don't know the full ToC chain, and the fix is a validator relaxation plus a one-line copy change — in code already located to the line. Four of its six items are verification tests over behavior that already works, which also builds the regression net that protects C2.

2. **Do not foreclose the deferred PRMS story.** Descoping C3/C4 removes them from delivery, not from design pressure. Two decisions inside C1/C2 would be expensive to reverse later, so they must go the conservative way:
   - **Keep the per-SP ToC table** (`result_pool_funding_toc_alignment`) and its partial-unique `(result, sp)` row. Restrict *who STAR lets write it*; do not collapse it to a single Primary row (OQ-3).
   - **Leave `is_read_only` semantics untouched** (R-9). The existing lock is what already satisfies A10.

   Neither condition adds work to C1/C2 — both are "don't do the tempting simplification."

C2 is the substantive engineering chunk and should carry the migration, the backfill decision (OQ-2), and the Primary/Contributing UX from the Jira mockups.

**Descoping C3/C4 is the right call** independent of scheduling: AC-1676 assumes an "agreed API integration" with PRMS that does not exist in this repo. Specifying against an unagreed contract is how the archived module accumulated 83 open tasks.

---

## 12. Success Criteria

**Per chunk:**

- **C1** — a contributor answers "Yes" and saves with only an HLO selected; the result submits successfully. The reworded question renders. The four already-working behaviors have explicit regression tests. No change to `is_read_only`, pool-funding derivation, or catalog reads.
- **C2** — exactly one Primary SP is enforceable server-side; Contributing SPs cannot be Primary; ToC blocks render for the Primary SP only; legacy results behave per the OQ-2 decision without breaking `is_read_only` records; the per-SP ToC table survives intact (§11 condition 2).

**Global (all chunks):**

- Server Jest ≥ 60% all metrics; client floors held (statements 40 / branches 20 / lines 45 / functions 30); full suite green (baseline: 291 suites / 1790 tests).
- Every new/changed endpoint carries `@ApiTags` / `@ApiBearerAuth` / `@ApiOperation` / `@ApiBody`.
- Migrations append-only; no merged migration edited.
- No hex literals in client components — token utilities only.
- `docs/ux-ui/design.md` §12.2 gains a decision entry per chunk that changes UX.

---

## 13. Next Step

**Split approved 2026-08-12; C3/C4 descoped by PM agreement.** Status as of **2026-08-13**:

| Chunk | Status | Where |
| --- | --- | --- |
| **C1** `toc-optional-mapping` | ✅ **DELIVERED & ARCHIVED** 2026-08-13 — 16 commits, `/akili-test` PASS, `/akili-validate` FAIL on the evidence trail (not the code), gaps reviewed and accepted by the user | [`docs/specs/archive/2026-08-13-bilateral--toc-optional-mapping/`](../archive/2026-08-13-bilateral--toc-optional-mapping/) |
| **C2** `primary-contributing-sp` | 🔨 **SPECIFIED** 2026-08-13 — Full depth, `R-BIL-120`–`129` + 3 NFRs. **A7 deferred** (OQ-1 unanswerable from the repo) | [`../primary-contributing-sp/`](../primary-contributing-sp/) |

**This umbrella proposal is a splitter, not a specifiable target.** It has no `requirements.md` / `design.md` / `tasks.md` and should not acquire any — specifying it would re-specify shipped C1 work and duplicate C2. Work on the chunk folders.

Next step — execute C2:

```text
/akili-execute docs/specs/bilateral/primary-contributing-sp
```

**Still outstanding for C2** (none block execution of R-BIL-120–129):

1. **The 3 Jira attachments + Miro flow** into a `mockup/` folder (§7) — canonical UX per the 2026-05-24 decision. **Never ingested.** Their absence is recorded as an accepted risk in `requirements.md` §8 (defect class D-5: the Primary/Contributing visual distinction has neither an automated gate nor its intended human reference).
2. **BA answers to OQ-3 and OQ-5.** Working assumptions are documented and implementable; OQ-2 is now closed on both technical and empirical grounds.

---

## Authorship

AKILI-SPECS methodology by **Juan Carlos Cadavid** — [jcadavid.com](https://jcadavid.com). Licensed under the MIT License.
