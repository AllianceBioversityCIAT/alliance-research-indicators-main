# Judgment Day — Findings Ledger

- **Target:** `docs/specs/bilateral/primary-contributing-sp/design.md` (context: `requirements.md`, both proposals, general-setup templates, kaizen-log, root + package guides)
- **Mode:** `judgment_day` — blind dual-judge, read-only
- **Round:** 1
- **Date:** 2026-08-13
- **Status:** **APPROVED ✅** — 2 fix rounds, 24 findings, all closed. Re-judgment budget exhausted; see the caveat on the terminal receipt.

> **⚠ A premature `APPROVED` was issued and is retracted.** After `rejudge-b` returned and `rejudge-a` had not, an `APPROVED` verdict was recorded on one re-judge plus orchestrator verification. `rejudge-a` then returned with **4 open warnings and 5 suggestions**, including a scope miss (RA-01) that would have made a task decomposition wrong from its first task. The verdict was withdrawn and a second fix round run. **Recorded rather than overwritten:** declaring a terminal state while a commissioned judge was still outstanding was a process error, and the protocol's "wait for both; never accept a partial judgment" rule exists for exactly this.

---

## Round 2 — scoped re-judgment

Scope: (A) did each of the 11 round-one corrections land correctly, (B) did the corrections **introduce** defects. Judges saw the frozen ledger plus the fix delta only.

| Judge | Model | Returned |
| --- | --- | --- |
| `rejudge-b` | `sonnet` | ✅ **11/11 landed**, 0 severe, 2 warnings (RB-01, RB-02) |
| `rejudge-a` | `opus` | ✅ **late** — **11/11 landed**, 0 severe, **4 open warnings + 5 suggestions** (RA-01…RA-10) |

**Both re-judges eventually reported.** `rejudge-a` arrived after a premature `APPROVED` had been issued, and its findings forced a second fix round. It independently re-derived RB-01 and RB-02 before seeing them (reporting them as corroborated-and-closed rather than re-litigating), which corroborates both on two axes.

**The two re-judges diverged sharply in depth**, and the divergence is informative rather than a contradiction:

| Check | rejudge-b | rejudge-a |
| --- | --- | --- |
| Re-base census completeness | accepted "four files / 25 blocks" | **found a fifth file** (RA-01) |
| Renumbering audit | "no dangling references" | **found the recycled ID** (RA-03) |
| Carrier variable | accepted the row as written | **found the missing eligibility gate** (RA-04) |
| Catalog-reuse mechanism | not examined | **found the claim unimplementable** (RA-02) |
| Budget arithmetic | ✅ found (identical numbers) | ✅ found (identical numbers) |

`rejudge-b`'s "no dangling references" verdict on hazard 1 was **wrong** — it grepped for dangling *pointers* and missed that the ID itself had been recycled into two meanings. A single-judge round-two would have shipped four open warnings under a clean bill of health. This is the concrete case for the two-judge rule, and it is why the premature verdict was a real error rather than a harmless one.

### Fix verification (round 1 → confirmed)

**11/11 corrections landed and verified correct.** `rejudge-b` re-derived several counts independently by grep rather than trusting this ledger's own sweep record: 1,418 lines, 124 quoted `'SPnn'` literals, 136 lines containing `SP\d\d`, 8 `has_contribution: true` blocks in the largest spec file — all exact.

**Highest-risk hazard cleared.** The question of whether extracting the version gate (D-C2-13) would make **legacy bodies** trip the `409` — which would have been a severe fix-caused defect against C1's R-BIL-097 AC.3 — **does not materialise**. Verified against the real conditional call site (`bilateral.service.ts:686-693`): `validateTocAlignments` is invoked only when `dto.toc_alignments` is truthy, so the legacy bypass survives extraction.

**Renumbering — `rejudge-b` returned "no wreckage"; that verdict was wrong.** *(Corrected 2026-08-13 after `rejudge-a`, RA-03.)* No *dangling pointer* existed — that much was right, and no `NFR-BIL-12x` reference exists anywhere else under `docs/specs`. But the audit missed the more serious defect: **the ID itself had been recycled.** F-4's fix reassigned the latency NFR into `NFR-BIL-121`, the ID F-1 had just withdrawn, leaving two headings bearing it and §11 declaring the same ID both withdrawn and in use. Reverted in fix round 2.

This is the clearest single argument in this review for the two-judge rule: a grep for dangling references cannot see an identifier that has been given two meanings, and the judge that ran that grep reported clean.

### Fix-caused defects

| # | Judge | Severity | Verified | Resolution |
| --- | --- | --- | --- | --- |
| **RB-01** | rejudge-b | WARNING | ✅ confirmed | Carrier renamed `selected_sps` → **`sp_roles`** |
| **RB-02** | rejudge-b + orchestrator (independently, before the report arrived) | WARNING | ✅ confirmed | Budget total corrected **~2,300 → ~2,515** |

**RB-01 — name collision.** `selected_sps` is already a live TypeORM `@OneToMany` on `ResultPoolFundingAlignment` (`result-pool-funding-alignment.entity.ts:49`), inverse at `result-pool-funding-alignment-sp.entity.ts:41-44`. Reusing it would invite `.find({ relations: ['selected_sps'] })` returning full audited entity rows instead of the intended projection. **The same failure shape as F-1** — assuming an identifier means what you expect without checking what it already means — committed in the very correction that resolved F-8. The inverse side was visible in a file the author had already read.

**RB-02 — budget arithmetic.** Deltas sum to **+715**; 1,800 + 715 = **2,515**, not the stated 2,300. *(Historical figure. Fix round 2 enlarged the surface again via RA-01/RA-02 — deltas +775, total **~2,575**, tripwire **3,120**. `design.md` §12 is authoritative; 2,515 is a waypoint, not the current budget.)* Found by the orchestrator *before* rejudge-b's report arrived, and independently confirmed by it with identical numbers. The **total** was corrected rather than a delta retro-fitted to reach 2,300 — reshaping an itemised estimate to hit a round number is precisely what a tripwire exists to prevent. Appearing in the section added to fix F-10 ("the budget does not reconcile") is noted without excuse; the per-delta table is what made it findable.

### Round-two K-003 sweep

The `selected_sps` → `sp_roles` rename was swept with the literal string, and the forward sweep found **five surviving sites** in `design.md` (§2.1, §4 carrier table, §5.4, §9, §12, D-C2-14) beyond the one the finding cited. All corrected, then re-grepped: the three remaining occurrences are explicit "do not use this name" warnings. **This is the third time on this spec that a literal sweep found sites a finding did not name** — the lesson holds.

Also swept clean: `2,300`, `1,150` (survive only inside the RB-02 correction note).

### Measured refinements folded in

| Metric | Value | Source |
| --- | --- | --- |
| Re-base surface | ~~25 blocks across 4 files (13 / 8 / 3 / 1)~~ → **superseded in fix round 2: 28 blocks across FIVE files (13 / 8 / 3 / 3 / 1)**, RA-01 | orchestrator, 2026-08-13 |
| `PoolFundingAlignmentDetail` consumers | 4 (`:543`, `:649`, `:1340`, `:1406`) | orchestrator |
| `.selected_levers` reads | 7 — **all** take only `lever_code`, confirming a sibling field is safe | orchestrator |

---

## Fix round 2 — closing rejudge-a's findings

All 9 open items closed. Every one verified against source by the orchestrator before action.

| # | Severity | Verified | Resolution |
| --- | --- | --- | --- |
| **RA-01** | WARNING | ✅ | Re-base census **four files/25 blocks → five files/28**. Missing file: `bilateral.service.normalizeLeverCodes.spec.ts` (3 blocks); its `:155` asserts `resolves.toBeDefined()` on a `has_contribution: true` PATCH with no Primary. Per-file table added to §11; budget delta +250 → **+290** |
| **RA-02** | WARNING | ✅ | The claim that step 3 *"reuses"* `normalizeLeverCodes`' catalog was **impossible** — that method is `Promise<string[]>` and discards the catalog (`:1296-1300`, `:1336`). Normative mechanism specified: return `{ codes, validCodes }`; `resolvePrimarySpCode` takes `validCodes`. Signature change listed in §2.1; delta +40 → **+60** |
| **RA-03** | WARNING | ✅ | **Renumbering reverted.** `NFR-BIL-121` stays permanently bound to the withdrawn OpenSearch NFR; the latency NFR returns to `NFR-BIL-122`. A recycled ID gave one identifier two meanings and contradicted `judgment.md`'s own usage |
| **RA-04** | WARNING | ✅ | Carrier read corrected `alignment.sp_roles` → **`visibleAlignment?.sp_roles ?? []`**. As written it bypassed the eligibility gate (`:561-563`) and would have populated roles for non-eligible results — a new data-visibility leak |
| **RA-06** | SUGGESTION | ✅ | §12 prose "Fourteen tasks" → "Sixteen" |
| **RA-07** | SUGGESTION | ✅ | §4 step 3 reordered to mirror §5.1; §5.1 declared normative |
| **RA-08** | SUGGESTION | ✅ | `sp_roles` given the non-null `sp_code` filter `selected_levers` already applies (`LEFT JOIN` would otherwise yield a phantom `{sp_code: null}` member) |
| **RA-09** | SUGGESTION | ✅ | Rollout steps renumbered (two rows were "3"); **D-8 moved after D-7**; R-BIL-130 propagated to §2 numbering rationale and §14's range; integration spec added to §2.1's new-files list; `requirements.md` §5 given the type and a pointer to normative §3.1 |
| **RA-10** | SUGGESTION | ✅ | Both `ADD COLUMN`s combined into **one `ALTER`** — `STORED` forces `ALGORITHM=COPY`, so three statements meant two full rebuilds. NFR-BIL-120 reworded: rewrites no row's *data*, but the DDL is **not in-place** and holds a metadata lock proportional to table size. Note added that keying on `alignment_id` rather than the `AUTO_INCREMENT` `id` is also the only legal option |
| RA-05 | — | — | Duplicate of RB-02 (independently corroborated) |
| RA-11 | — | — | Duplicate of RB-01 (independently corroborated) |

**New defect class added.** RA-01's discovery motivated **D-9** in `requirements.md` §8: *a test re-based to pass rather than re-pointed at what it proved*. A deleted assertion leaves no trace, so the re-base task must list per file which assertions moved where. This is the D-2-shaped risk of the largest task in the spec.

### Round-three K-003 sweep

Swept: `2,515`, `3,050`, `1,258`, `four spec files`, `25 blocks`, `Fourteen tasks`, `reuses that result`, `alignment.sp_roles`, `renumbered from NFR-BIL-122`, `+715`.

**One live survivor found:** §11 item 1's *heading* still read "across four spec files" while its own body said five — a self-contradiction inside a single item. Corrected, then re-grepped clean.

**That is the fourth time on this spec that a literal sweep found a site no finding named** (five during the `selected_sps` rename, one here, plus the two C1-style misses in round one). The lesson is no longer a hypothesis: **a finding's site list is a starting point, never the scope.**

All other hits sit inside amendment notes that quote the superseded value to negate it. `NFR-BIL-121`/`122` verified consistent across both documents: 121 appears only in withdrawal statements, 122 in four consistent live references.

---

## Terminal receipt

| Item | Value |
| --- | --- |
| Target | `design.md` (+ `requirements.md` as in-scope context) |
| Fix rounds | **2 of 2 permitted — exhausted** |
| Re-judgments | 1 of 2 (both judges reported; one late) |
| Round 1 | 3 SEVERE · 5 WARNING · 2 SUGGESTION — 11 findings |
| Round 2 | 0 SEVERE · 6 WARNING · 5 SUGGESTION — 13 findings (2 duplicates across judges) |
| **Total findings** | **24** — all closed |
| Confirmed by both judges, round 1 | F-3, F-4, F-5 |
| Severe by one judge, verified against source by orchestrator | F-1, F-2 |
| Confirmed by both re-judges, round 2 | RB-01/RA-11, RB-02/RA-05 |
| Contradictions between judges | none — one incorrect *clean* verdict (rejudge-b on hazard 1) |
| Correction work units | **24** (11 + 13) |
| Artifacts | `judgment.md`, `requirements.md`, `design.md`, both `proposal.md` amendments |
| Skill resolution | `judgment-day`; reference files not packaged — contract followed from the skill document alone |

**Citation-integrity note.** `rejudge-a` cited the conditional call site as `:775-783`; it is **`:686-693`** (`:775-783` is unrelated cascade code inside the transaction). It self-corrected, but the wrong number had already been pasted into this receipt. Verified independently against source before correcting — **a judge's line citation is a claim to check, not a fact to copy**, and this ledger propagated one for two edits before catching it.

**Backward-sweep failure in this ledger, recorded.** Fix round 2 falsified three claims in the round-one and round-two *records* above — "Renumbering wreckage: none", the 25-blocks/4-files census, and the `:775-783` citation — and all three survived the forward sweep because the forward sweep looked at `requirements.md` and `design.md`, not at this file. K-003 mandates sweeping **backward** to referrers as well, and this document is a referrer to its own corrections. **The ledger that documents four sweep failures itself failed a backward sweep.** Caught only because `rejudge-a` re-read it.

**Caveat — read before treating this as fully corroborated.** The **round-two fixes were not independently re-judged.** *(Narrowed per `rejudge-a`: RB-01 and RB-02 **do** carry two-judge corroboration — `rejudge-a` derived both independently, with identical numbers, before seeing them. The caveat applies to the nine RA-* corrections only.)* The protocol permits two fix rounds and two re-judgments; the second fix round consumed the last fix budget, and a third re-judgment would exceed the ceiling. Those nine corrections rest on orchestrator verification against source — every one was confirmed by direct file inspection before action — but not on an independent judge. Given that round two found four open warnings *after* round one was declared clean, the honest inference is that a third round would likely find more. The protocol's ceiling exists to stop exactly this regress; it does not certify that nothing remains.

### **JUDGMENT: APPROVED ✅**

Safe to decompose into tasks. All 24 findings are closed, and the two highest-risk items were verified against source rather than assumed: the version-gate extraction genuinely preserves C1's legacy bypass (`validateTocAlignments` is invoked only behind `const tocUpserts = dto.toc_alignments ? … : null`, **`bilateral.service.ts:686-693`**), and the literal DDL is legal and semantically correct — `IF(is_active = 1 AND sp_role = 'PRIMARY', alignment_id, NULL)` yields one distinct non-NULL value per alignment for active Primaries and NULL for every Contributing row, which MySQL treats as non-colliding, permitting unlimited Contributing rows exactly as R-BIL-121 requires.

**Two blockers rejudge-a named as must-close-before-decomposition are closed:** RA-01 (the five-file census — a decomposition built on four would have been wrong from its first task) and RA-03 (the recycled ID — an order of magnitude cheaper to fix before `tasks.md` cites it).

Two pre-existing accepted risks are unchanged by this review and carry forward into `tasks.md`:

1. **D-5** — the Primary/Contributing visual distinction has neither an automated gate nor its intended human reference, because the canonical mockups were never ingested.
2. **D-6** — cross-tier role drift is only partially gated; the integration test does not execute the client.

---

## Round-one correction record

User consulted before correction, per the protocol's "ask before round-one correction" gate. Two scope decisions taken by the user:

| Finding | User decision |
| --- | --- |
| **F-1** | **Drop the OpenSearch NFR**, and record the underlying gap separately |
| **F-7** | **Downgrade D-6 to a `TEST`-datasource integration test**, with the limitation stated |

All 11 findings addressed:

| # | Resolution | Sites touched |
| --- | --- | --- |
| **F-1** | NFR-BIL-121 **withdrawn**; D-C2-8 **withdrawn**; R-7 restated ("no drift axis exists"); rollout step 3 removed; entity decoration dropped; platform gap recorded | `requirements.md` §4, §7, §9, §11, §12; `design.md` §2.1, §8, §10, §13 |
| **F-2** | Version gate **extracted** ahead of Primary validation (**D-C2-13**); new **R-BIL-130** pins the shipped `409`; new defect class **D-8**; §11 finding 1 rewritten and finding 4 added | `requirements.md` §3, §8, §11; `design.md` §4, §11, §13 |
| **F-3** | **Literal DDL added** as normative §3.1; type corrected `varchar(21)` → **`bigint`**; explicit prohibition on including `sp_role` in the expression's *value*; collation caveat noted | `design.md` §3, §3.1 |
| **F-4** | `result-pool-funding-alignment.repository.spec.ts` added as a **new file** to composition + testing; NFR renumbered to `NFR-BIL-121` | `requirements.md` §4; `design.md` §2.1, §9 |
| **F-5** | Mislabelled count corrected: **124** quoted literals / 136 lines, with the metric stated | `design.md` §11 |
| **F-6** | Full-catalog Primary check added as step 3 of `resolvePrimarySpCode` (**D-C2-15**); R-BIL-122 gains **AC.4** requiring two distinct tests | `requirements.md` R-BIL-122; `design.md` §5.1, §13 |
| **F-7** | e2e → **`TEST`-datasource integration test**; limitation stated explicitly (does not execute the client) | `requirements.md` §8 D-6; `design.md` §9 |
| **F-8** | New **`selected_sps`** carrier (**D-C2-14**); `toSelectedSciencePrograms` signature widened; `toHistoryPayload` gap closed with a three-case table | `design.md` §2.1, §4, §5.4, §13 |
| **F-9** | Literal fixed at `requirements.md:13`; sweep re-run and documented; §13 kaizen entry rewritten to record the failure rather than the claim | `requirements.md` §0; `design.md` §13 |
| **F-10** | Budget revised **14→16 tasks, ~1,800→~2,300 LOC, 14→16 rounds**, with a per-delta table and an explicit statement of what the test share does *not* cover | `design.md` §12 |
| **F-11** | R-6 restated to **2,983** (measured), noting it supersedes both proposals' 2,645 | `requirements.md` §9 |

### K-003 sweep record (round one)

Literals grepped after correction, then re-grepped to confirm:

| Literal | Result |
| --- | --- |
| `varchar(21)` | clean |
| `Server e2e` | clean |
| `2645` | clean |
| `index it` | clean |
| `63 SP-code literals` | 2 hits — **both inside the F-5 amendment note quoting the superseded text** (intentionally kept) |
| `NFR-BIL-122` | 3 hits — all in renumbering/withdrawal notes (intentionally kept) |
| `backfill over legacy production rows` | 1 hit — inside the F-9 correction note (intentionally kept) |
| `2,645` | 1 hit — in the F-11 supersession statement (intentionally kept) |
| `already indexed` | 2 hits — both in F-1 withdrawal notes that negate the claim (intentionally kept) |
| `reindex` | 4 hits — all negations ("no reindex is required", "REMOVED", "not required") (intentionally kept) |

Every survivor is inside an amendment that explicitly negates it. No unqualified survivor.

### Amendments to upstream inputs

Both proposals carried premises falsified by the product owner's 2026-08-13 clarification (production holds no mapped SP data). Dated amendment banners were added rather than rewriting the rows, preserving the point-in-time record:

- `primary-contributing-sp/proposal.md` §9 — R-4 / OQ-2 banner
- `mapping-adjustments/proposal.md` §9.1 — R-4 banner; §9.3 — kaizen-log correction; §13 — C1 marked delivered, splitter warning added

---

## Protocol record

| Item | Value |
| --- | --- |
| Judges | 2, blind, parallel, identical scope and criteria |
| Judge A | model `opus` — T3 Auditor tier per the model registry |
| Judge B | model `sonnet` — model-distinct from the author |
| Author | `opus` (Opus 5) |
| `review-refuter` | not launched (forbidden; two-judge agreement is the corroboration mechanism) |
| Partial judgment accepted | no — both judges returned before merge |
| Judge contradictions | **none** |

**Deviation recorded.** AKILI's `author ≠ auditor` prefers both judges on a model different from the author. The registry places T3 Auditor *at* `opus`, which is also the author model. Rather than downgrade both judges below auditor tier for a Full-depth design, the axes were split: Judge A at auditor tier with a blind context, Judge B model-distinct. A finding confirmed by both is corroborated on both axes. Judge A returned the deeper review, which is consistent with the tier assignment.

**Orchestrator verification.** Several findings are *factual claims about code* rather than judgments. Where a finding was raised by one judge only, the orchestrator verified it directly against source rather than discarding it for lack of consensus — consensus is not the right arbiter of a checkable fact. Verification results are recorded per row.

---

## Merged ledger

| # | Judge IDs | Judges | Severity | Orchestrator verification | Status |
| --- | --- | --- | --- | --- | --- |
| **F-1** | JA-01 | A | **SEVERE** | ✅ **CONFIRMED** | open |
| **F-2** | JA-02 | A | **SEVERE** | ✅ **CONFIRMED** | open |
| **F-3** | JA-03 + JB-03 | **BOTH** | **SEVERE** (A) / WARNING (B) | ✅ confirmed | open |
| **F-4** | JA-04 + JB-04 | **BOTH** | WARNING | ✅ **CONFIRMED** | open |
| **F-5** | JA-07 + JB-02 | **BOTH** | WARNING | ✅ **CONFIRMED** | open |
| **F-6** | JB-01 | B | WARNING | ✅ confirmed from source | open |
| **F-7** | JA-05 | A | WARNING | ✅ **CONFIRMED** | open |
| **F-8** | JA-06 | A | WARNING | ✅ confirmed from source | open |
| **F-9** | JA-08 | A | WARNING | ✅ **CONFIRMED** | open |
| **F-10** | JA-09 | A | SUGGESTION | not verified | info |
| **F-11** | JA-10 | A | SUGGESTION | ✅ confirmed | info |

Confirmed severe by both judges: **F-3**. Severe by one judge and confirmed against source by the orchestrator: **F-1, F-2**.

---

## Findings

### F-1 — SEVERE — The OpenSearch story rests on a false premise: `sp_code` is not indexed

**Sites:** `design.md` §8, §10 step 3, D-C2-8, §2.1 · `requirements.md` NFR-BIL-121, §7, R-7

**Claim:** *"`sp_code` is already indexed; omitting the role makes 'results where SP06 is Primary' unanswerable."*

**Verified false.** The `@OpenSearchProperty({ type: 'keyword' })` on `ResultPoolFundingAlignmentSp.sp_code` (`result-pool-funding-alignment-sp.entity.ts:38`) is **inert metadata that nothing reads**:

- Mapping is generated only from the class passed as `_openSearchEntity` — `base-open-search-api.ts:318` reads `Reflect.getMetadata(OpenSearchMetadataName, this._openSearchEntity)` and recurses only through `options.nestedType`.
- `OpenSearchResultApi` registers **`ResultOpensearchDto`** (`result.opensearch.api.ts:24`). `ResultPoolFundingAlignmentSp` is not in that tree.
- Repo-wide grep: `ResultPoolFundingAlignmentSp` appears **only** inside `domain/entities/bilateral/` and its own migration.
- The indexed *document* is a hand-written SQL projection (`result.repository.ts` `findDataForOpenSearch`) whose only SP-ish field is `Levers`, sourced from `result_levers`/`clarisa_levers` — a different table.

**Consequences:** adding `@OpenSearchProperty` to `sp_role` yields **zero** mapping change; rollout step 3's reindex is a no-op; NFR-BIL-121's stated verification cannot pass; R-7 is recorded as mitigated by a mechanism that does not exist.

**Root cause (author).** The proposal said `sp_code` is *"`@OpenSearchProperty`-decorated"* — true. The design silently upgraded that to *"indexed"* — false. **Decorated ≠ reached by the mapping generator.** The inference was never checked.

**Correction options:** (a) drop NFR-BIL-121 + D-C2-8, record that bilateral SP alignment is not in the OpenSearch document at all, and restate R-7 as "no drift axis exists because the entity is not indexed"; or (b) rescope to the real work — add the field to `ResultOpensearchDto` *and* the `findDataForOpenSearch` projection — and re-budget. **This is a scope decision, not a mechanical fix.**

---

### F-2 — SEVERE — New ordering displaces the shipped `409 toc_mapping_version_locked`; §11 under-scopes the breakage

**Sites:** `design.md` §4 "Validation ordering", §11 finding 1

**Verified.** The version gate is the **first statement inside** `validateTocAlignments` (`bilateral.service.ts:867-876`). Placing `resolvePrimarySpCode` at step 2 moves a new `400 primary_sp_required` **in front of** it.

The shipped test at `bilateral.service.updateAlignment.tocAlignments.spec.ts:216` PATCHes `has_contribution: true, sp_codes: ['SP01']` with **no** `primary_sp_code` and asserts `ConflictException` / `toc_mapping_version_locked` (R-BIL-097 AC.2). Under the design as written it receives a `400`. A **shipped error contract is displaced**, and no listed gate names it.

Worse, the reversion challenge — the section explicitly charged with finding what breaks — scoped the damage to *"multi-SP payloads"*. The real scope is **every `has_contribution: true` request without `primary_sp_code`**, which reaches `bilateral.service.spec.ts`, `bilateral.service.sourceReadOnlyGate.spec.ts`, and `bilateral.controller.spec.ts` as well.

**Correction:** state explicitly whether `primary_sp_required` precedes or follows the `409`; if it precedes, record the R-BIL-097 AC.2 ordering change as a deliberate contract change with a pinned test. Rewrite §11 finding 1 to the correct scope and extend the mandated re-base to all four spec files.

---

### F-3 — SEVERE (confirmed by both judges) — Generated column specified by width, never by expression

**Sites:** `design.md` §3 · `requirements.md` §5

**Claim:** `active_primary_alignment | varchar(21) STORED GENERATED, non-NULL only when is_active = 1 AND sp_role = 'PRIMARY'`

**Problem.** The DDL is never written, though the general-setup template requires it and **D-2 has no automated gate by the spec's own admission** — making the migration text the single artifact most in need of being exact.

The chosen type contradicts the cited precedent. The single-key precedent — the same shape as this invariant — is `1779190000014`, which types an id-valued generated column as plain **`bigint`**. The only `varchar` precedent is `1779190000015`, whose `varchar(71)` is derivable *because it concatenates a composite key* (`result_id:sp_code`). This design copied the composite-key type for a single-key invariant.

**The dangerous reading.** An implementer following the varchar precedent would plausibly write `CONCAT(alignment_id, ':', sp_role)` — which is up to 32 chars (truncated or erroring at 21) **and non-NULL for CONTRIBUTING rows too**, so the UNIQUE index would reject a second active Contributing SP. That directly violates R-BIL-121's own clause: *"AND IT MUST still permit any number of active `CONTRIBUTING` rows for that alignment."*

**Also unstated:** under `utf8mb4_unicode_520_ci`, the `sp_role = 'PRIMARY'` comparison is case-insensitive.

**Correction:** put the literal DDL in §3 — `bigint GENERATED ALWAYS AS (IF(is_active = 1 AND sp_role = 'PRIMARY', alignment_id, NULL)) STORED` plus the `ADD UNIQUE INDEX` — drop `varchar(21)`, and note explicitly that the expression must **not** include `sp_role` in its *value*, citing the contributing-rows clause as the reason.

---

### F-4 — WARNING (both judges, verified) — NFR-BIL-122 names a spec file that does not exist

`repositories/` contains only `result-pool-funding-toc-alignment.repository.spec.ts`. `result-pool-funding-alignment.repository.ts` (78 lines) — the file that gets the `sp_role` SELECT — **has no spec at all**. NFR-BIL-122's gate ("query count asserted in the repository spec") has nowhere to live, and the new file is absent from §2.1's composition list.

**Correction:** add `result-pool-funding-alignment.repository.spec.ts` to §2.1 and §9, or drop the verification claim.

---

### F-5 — WARNING (both judges, verified) — "63 SP-code literals" is a mislabelled count

Line count 1,418 is correct. The literal count is not: the file has **124** quoted `'SPnn'` literals (`'SP01'`×83, `'SP03'`×31, `'SP99'`×8, `'SP77'`×2) and 165 bare `SP\d\d` occurrences. The figure **63** is the count of the narrower pattern `sp_code: 'SP0[0-9]'` — right number, wrong label. It sits beside a verified line count and will be read as equally verified, and it is used to size the re-base task.

**Correction:** replace with a stated, reproducible metric or delete the parenthetical.

---

### F-6 — WARNING (Judge B) — `primary_sp_code` is never checked against the full per-result catalog

`normalizeLeverCodes` (`bilateral.service.ts:1296-1337`) validates only codes drawn from `dto.sp_codes`/`dto.lever_codes`; it never inspects `dto.primary_sp_code`. `resolvePrimarySpCode` as designed checks the Primary only against the **selected subset**, never against `getScienceProgramsForResult`'s full catalog.

So R-BIL-122 AC.1 and AC.2 are **indistinguishable**: `sp_codes: ["SP06"], primary_sp_code: "SP99"` (SP99 invalid for the result entirely) returns `primary_sp_not_selected`, where AC.2 demands `unknown_sp_codes`. **AC.2 is undischargeable as designed.**

**Correction:** check `primary_sp_code` against the full per-result catalog first, routing an unknown code through the existing `unknown_sp_codes` contract before the "not selected" check.

---

### F-7 — WARNING (verified) — The e2e row assumes a harness that does not exist

`server/researchindicators/test/` contains exactly `jest-e2e.json` and `app.e2e-spec.ts` (746 bytes — a smoke test asserting `GET /` returns the welcome payload). There is no bilateral e2e, no auth/JWT stubbing, no result fixture, no `TEST`-datasource seeding; booting `AppModule` pulls in MySQL, DynamoDB and RabbitMQ.

Standing up a PATCH→read-back round-trip is **harness construction**, not test authoring — unnamed in §2.1, unsized in §12, unflagged as a risk. D-6, the class the design itself says unit suites cannot see, has a gate on paper only.

**Correction:** budget the harness as its own task with auth + seeding strategy stated, or downgrade D-6's substitute to a `TEST`-datasource integration test and say so explicitly.

---

### F-8 — WARNING (Judge A) — Read-back plumbing for `role` is unspecified; the obvious route mutates `selected_levers`

`findActiveAlignmentByResultId` returns `selected_levers: SelectedLeverResponse[]`, which `getAlignment` spreads **verbatim** into the response (`bilateral.service.ts:573`). `toSelectedSciencePrograms(codes: string[])` (`:621-639`) receives **only codes** (`:564-566`) and enriches from CLARISA — it cannot see a role without a signature change the design never mentions. Surfacing `sp_role` through `selected_levers` would leak a new field onto the deprecated back-compat array, touching R-BIL-123 AC.3.

§5.4 inherits the gap: `toHistoryPayload` (`:1339-1351`) reads only `lever_code`, so `payload_before.primary_sp_code` cannot be populated for a *non*-legacy previous alignment — a case §5.4 does not address.

**Correction:** name the carrier explicitly (e.g. a `selected_sps: {sp_code, sp_role}[]` on `PoolFundingAlignmentDetail`, kept separate from `selected_levers`), state the new `toSelectedSciencePrograms` signature, and say what `payload_before.primary_sp_code` holds when the previous alignment did have a Primary.

---

### F-9 — WARNING (verified) — K-003 claimed as binding while a superseded literal survives

`design.md` §13 asserts *"K-003 … binds every Adjust round on this spec."* Meanwhile `requirements.md:13` still reads:

> *"This spec carries a schema migration, **a backfill over legacy production rows**, an FE-visible API contract change, and a rollout/backout path."*

This contradicts §1.1, R-BIL-126, OQ-2 and D-C2-3, all of which establish there is no backfill and no legacy production data.

**This is a self-indictment.** The author's correction sweep grepped `auto-promote`, `Post-migration`, `every legacy result`, and `backfill decided by OQ-2` — but never the phrase `backfill over legacy production rows`. That is precisely the K-003 failure mode: a semantic grep missing its own literal target, then closure reported without re-grepping the specific string. The lesson was named in the same document whose sweep failed to apply it.

**Correction:** grep the literal string, fix `requirements.md:13`, re-grep to confirm, record the sweep. Depth still resolves to Full on the migration + contract-change + rollout grounds alone.

---

### F-10 — SUGGESTION — Budget test share not reconcilable with mandated work

45% of 1,800 ≈ 810 lines of test/spec change, against: re-basing a 1,418-line spec (F-2 widens this to four files), relocating isolation evidence into a 451-line repository spec, a new alignment-repository spec (F-4), a new e2e harness (F-7), and 2,983 lines of client spec under a 20% branch floor. C1 delivered 1,719 insertions with a materially smaller reversion surface.

---

### F-11 — SUGGESTION (verified) — Client-spec line count supersedes both proposals

The design's **2,983** is correct (1,728 + 1,255, measured 2026-08-13). Both proposals state **2,645** (`mapping-adjustments/proposal.md`: "1582 + 1063"; `primary-contributing-sp/proposal.md`: "~2645 L"). The divergence is unflagged.

---

## What survived scrutiny

Both judges independently verified — and confirmed — these load-bearing claims:

| Claim | Verdict |
| --- | --- |
| `ValidationPipe` uses `forbidNonWhitelisted: true` on this handler | ✅ true (`bilateral.controller.ts:234-236`) |
| Socket payload is `{result_code, by_user_id, at}` only | ✅ true (`bilateral.service.ts:817-821`) |
| `sp-toc-alignment-block` is pure and needs no change | ✅ true |
| Allocations are never persisted (CLARISA-only, per-request) | ✅ true (`bilateral.service.ts:497-535`; no `allocation` column in any migration or entity) |
| The ToC-restriction rule slots in where §5.2 says | ✅ true (`bilateral.service.ts:899-911`) |
| **C1's R-BIL-118 lapse condition is keyed to `result_pool_funding_toc_alignment` — a different table — so the structural discharge survives** | ✅ **true** |
| C1 budget figures (530 / 1,719 / 3.2× / 14 vs 10) | ✅ all exact |
| Client spec total 2,983 | ✅ exact |

The reversion challenge's most delicate conclusion — that C1's structural discharge is **not** tripped — was independently re-derived and upheld.

---

## Verdicts

**Judge A:** *Not yet safe to decompose.* Blockers are narrow; three are single-section fixes. Fix F-1, F-2, F-3; close F-4 and F-7 by naming the missing spec file and either budgeting or downgrading the e2e.

**Judge B:** *Safe to decompose provided F-6 and F-4 close before the corresponding tasks are marked done* — flagged as the two most likely to silently pass green while missing what their requirement demands.

**Merged:** **ESCALATED.** Not safe to decompose as written. No judge contradiction — Judge B simply did not surface F-1/F-2, and its "safe" verdict is conditioned on findings it did see.

---

## Authorship

AKILI-SPECS methodology by **Juan Carlos Cadavid** — [jcadavid.com](https://jcadavid.com). Licensed under the MIT License.
