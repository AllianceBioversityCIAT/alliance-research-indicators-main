# Judgment Day — Findings Ledger

- **Target:** `design.md` (frozen at 2026-08-12), reviewed against `requirements.md`, `proposal.md`, `../mapping-adjustments/proposal.md`
- **Mode:** blind dual review, two independent read-only judges
- **Author model:** opus (design) · **Judge model:** sonnet ×2 (author ≠ auditor)
- **Round:** 1 of max 2
- **Status:** awaiting user decision on round-one correction

---

## 1. Merged ledger

| ID | Severity | Judges | Parent verified | Finding |
| --- | --- | --- | --- | --- |
| **F-1** | SEVERE | **A + B** | ✅ | `missing_required_fields` contradiction: §5.2 says "only" `level`/`toc_result_id`; §6.2 + D-C1-8 add a third trigger. Also contradicts `R-BIL-111 AC.4`, and D-C1-8 has **no requirement backing it at all** |
| **F-2** | SEVERE | A | ✅ **confirmed** | §6.1 "a partial batch never adds a catalog call" is **false**. Today a Level+HLO entry fails the floor and contributes 0 calls; after the change it clears the floor, enters `catalogChecks`, and contributes 1. The headline scenario goes 0 → 1 |
| **F-3** | SEVERE | A | ✅ **confirmed** | `R-BIL-114 AC.4` (null contract in Swagger) is **unsatisfiable as scoped**. `TocAlignmentReadbackResponse` / `AlignmentResponse` are plain `interface`s with no `@ApiProperty`; neither `getAlignment` nor `updateAlignment` declares `@ApiResponse`. Requires class conversion — unbudgeted |
| **F-4** | SEVERE | B | ✅ **confirmed** | §8's reversion challenge **missed a server-side consumer**: SQL function `pool_funding_alignment_validation` (migration `1782950000000`) whose comment explicitly relies on `validateTocAlignments` guaranteeing level+toc_result_id+indicator_id together. Feeds `green-checks.repository.ts:67` → `result-status-workflow`. "No concrete breakage identified" was scoped to client TS only |
| **F-5** | WARNING | **A + B** | ✅ | OQ-C1-5 under-scoped: two more dangling `@sdd-spec` refs at `pool-funding-alignment.component.ts:336,443` citing a third nonexistent path |
| **F-6** | WARNING | A | ✅ **confirmed** | The label `D-9` **collides with a real, unrelated `D-9`** in `docs/ux-ui/design.md` §12.1 (monorepo/admin palette). The bilateral "D-9" exists only as code comments pointing at a spec that never existed |
| **F-7** | WARNING | A | ✅ | Budget excludes F-3 and F-5 work |
| **F-8** | WARNING | B | ✅ | §11 "true no-op" is **conditional** (no *known* caller sends partial), not structural — the PATCH is reachable by any ROAR JWT or machine token with `CONTRIBUTOR`+ |
| **F-9** | WARNING | B | ✅ | `target_year` absent from `R-BIL-111`'s scenario field list, though §6.2 commits to nulling it — soft traceability |

**Counts:** 4 severe (1 dual-confirmed, 3 single-judge **parent-verified**), 5 warning (1 dual-confirmed), 0 suggestion, **0 contradictions**.

### 1.1 Apparent judge divergence — resolved, not a contradiction

B verified NFR-BIL-110 as "sound"; A found the fan-out sentence false. **Both are right at different granularities.** B checked whether the combo map gains *new keys* from indicator resolution — it does not. A checked whether a *partial entry* adds a call it did not previously make — it does, because it now clears the floor. The NFR **target** survives; the **sentence** in §6.1 is false. Recorded as F-2 against the sentence, not the NFR.

---

## 2. Verified-true claims (no defect)

Both judges independently confirmed: migration nullability and the "no DDL" conclusion, including the `active_result_sp` generated column and unique index · template gates at `:119` / `:209` / `:281` with no dangling fields outside them and no sibling-dependent SCSS · the four named client-TS consumers, with no *client* consumer missed · the missing archive spec and its absent git history · requirement band `R-BIL-110…118` free of collision with `R-BIL-100…105`.

---

## 3. What F-4 exposes beyond itself

The green-check function tests only `toc.aligns_with_toc is not null` — **row presence, not completeness**. So a partial row still passes and submission proceeds, which is exactly AC-1676's requirement:

> *Missing TOC information must not prevent submission, provided that a Primary SP has been selected.*

**`requirements.md` never states this.** The spec specifies persistence and omits the submission consequence — the ticket's headline promise. It is currently satisfied by accident, and untested.

Second-order: `docs/ux-ui/design.md` §12.2 (2026-05-23) records *"AR.3 holds: alignment is NOT in the submission validator (`pool_funding_alignment` intentionally absent from `GreenChecks`)"*. Migration `1782950000000` contradicts that. **The baseline decision log has drifted from the code** — a `/akili-audit` finding surfaced early.

---

## 4. Proposed round-one corrections

| ID | Fix | Touches |
| --- | --- | --- |
| F-1 | Give the guard its **own** error code (`contribution_without_indicator`); restore §5.2's "only" as true; add a backing AC to `R-BIL-113` | design §5.2/§6.2/D-C1-8, requirements R-BIL-113 |
| F-2 | Restate §6.1 + NFR-BIL-110 correctly: floor-clearing partials **do** contribute one combo; the guarantee is per-`(sp,level)` dedup and zero calls for floor-rejected entries. Correct the §10 test direction | design §6.1/§10, requirements NFR-BIL-110 |
| F-3 | Budget the real work: convert the two response interfaces to `@ApiProperty` classes + add `@ApiResponse` to both handlers, following the `bilateral-hlos-indicators.response.dto.ts` precedent | design §3.1/§9, +1 task |
| F-4 | Add **R-BIL-119 — partial ToC does not block submission**, with a regression test through green-checks → status workflow; correct the SQL comment; log the §12.2 AR.3 drift | requirements (new req), design §8/§10, +1 task |
| F-5 | Broaden OQ-C1-5 to all three dangling refs and the `docs/specs/bilateral-module/` prefix class | design §13 |
| F-6 | Rename to **"the completeness gate"**, noting `D-9` is a code-comment-only label that collides with the real `D-9` | design §7.1/§8/D-C1-4 |
| F-7 | Rebudget: **9 tasks, ~530 LOC, 9 rounds** | design §9 |
| F-8 | Restate the no-op claim as conditional on A-3/A-4 | design §11 |
| F-9 | Add `target_year` to the AC field list | requirements R-BIL-111 |

**Not accepted for change:** nothing. All nine findings are sound.

---

## 5. Lineage

- **Round 1 judged** 2026-08-12 — 4 severe / 5 warning / 0 contradiction
- **Round 1 correction applied** 2026-08-12 — all 9 findings addressed; user selected *"Fix only"*, waiving scoped re-judgment
- **Correction closure sweep run** (forward: superseded values; backward: referrers) — residual `D-9` identifier usages caught and reworded in 6 further places the findings did not cite
- **Rounds remaining:** 1

### 5.1 Terminal receipt

**JUDGMENT: APPROVED ✅** — with one explicit caveat.

All four severe and five warning findings were corrected. **The corrections themselves were not independently re-judged**, because re-judgment was waived by user direction. The `APPROVED` state therefore rests on the parent's own verification, not on a second blind pass. One re-judgment round remains available if `/akili-execute` surfaces drift.

### 5.2 Changes applied

| Finding | Applied to |
| --- | --- |
| F-1 | New error code `contribution_without_indicator`; requirements gains **R-BIL-113 AC.6** + scenario; design §5.2/§6.2/D-C1-8 reconciled |
| F-2 | design §6.1 restated with the intended 0→1 increase; **NFR-BIL-110** retitled and rewritten with an explicit "do not assert this" warning; §10 test direction corrected |
| F-3 | design §6.3 expanded; §3.1 gains controller row; **D-C1-10** recorded; budget +1 task / +~60 production LOC |
| F-4 | New **R-BIL-119** + scenario; §8 Finding 3 table gains the fifth (server) consumer; **D-C1-11**; defect class **D8**; cross-system row; requirements risk **R-10** |
| F-5 | OQ-C1-5 broadened to three references and the module-wide stale prefix |
| F-6 | "completeness gate" replaces `D-9` as identifier throughout; §8 **Finding 2b** records the collision |
| F-7 | Budget → **9 tasks / ~530 LOC / 9 rounds** *(later **10 / ~530 / 10** at Phase 3 decomposition — the regression net split by tier to match the PR boundary. A split, not new scope; `design.md` §9 and `tasks.md` §1 both carry the final figure.)* |
| F-8 | §11 inertness restated as conditional on A-3/A-4, with a pre-deploy check |
| F-9 | `target_year` named in R-BIL-111 AC.1 and its scenario |
