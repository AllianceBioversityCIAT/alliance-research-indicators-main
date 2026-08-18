# Design — Bilateral / Optional & partial Theory-of-Change mapping

- **Module:** bilateral
- **Spec id:** 2026-08-toc-optional-mapping
- **Status:** draft
- **Owner:** Juan Carlos Cadavid (bilateral squad)
- **Linked requirements:** [`./requirements.md`](./requirements.md)
- **Linked TRD:** [`../../../trd/trd.md`](../../../trd/trd.md)
- **Depth:** Standard
- **Last updated:** 2026-08-12

---

## 1. Executive summary

**Five code changes and a test net. No migration, no new file, no template change.**

| Change | Where | Size |
| --- | --- | --- |
| Per-field conditional validation + new `contribution_without_indicator` code | `bilateral.service.ts` `validateTocAlignments` | ~30 LOC |
| Snapshot builder tolerates a missing indicator | `bilateral.service.ts` (same method's return map) | ~15 LOC |
| Save gate + payload writer accept partial | client `pool-funding-alignment.component.ts`, `bilateral.service.ts` | ~20 LOC |
| Question copy | `sp-toc-alignment-block.component.ts:160` | 1 LOC |
| **Swagger response classes** (interfaces → `@ApiProperty` classes + `@ApiResponse`) | `dto/update-pool-funding-alignment.dto.ts`, `bilateral.controller.ts` | ~60 LOC |
| **SQL comment correction** | migration-documented function `pool_funding_alignment_validation` | ~4 LOC |

The exploration produced two findings that shrink the work materially:

1. **Every ToC column is already nullable.** Migration `1779190000015` declares `level`, `toc_result_id`, `indicator_id`, `quantitative_contribution`, and all five snapshot columns `NULL`; only `aligns_with_toc` is `NOT NULL`. **No DDL.**
2. **The template already renders every partial state correctly.** `sp-toc-alignment-block.component.html` is progressively disclosed — `@if (d.level)` gates the HLO field (:119), `@if (d.toc_result_id !== null)` gates the indicator field (:209), and `@if (selectedIndicator(); as indicator)` gates unit, target, and contribution (:281). A partial row renders exactly the DOM a user already sees mid-entry. **No template change, and R-BIL-116 AC.3 is satisfied by construction.**
> **⚠ DRIFT — this finding was HALF WRONG (recorded 2026-08-13, surfaced by T-11 after independent validation).**
> The *progressive-disclosure* half is correct and held: the `@if` gating needed no change and R-BIL-116 AC.3 is
> indeed satisfied by construction. The **"no template change"** half was **false**. The template rendered the
> **Indicator** and **Contribution** fields as unconditionally required — asterisk plus `aria-required="true"` —
> the two fields *this very spec* made optional server-side and in the save gate. A contributor stopping at the
> Level + HLO floor saw two starred fields and a screen reader announced two required fields, contradicting the
> shipped behavior. **A template change was required and landed under T-11** (4 sites). No automated gate in this
> spec could see it; **D7 — the human visual check — is the gate that would have.**

The change is therefore *removing* restrictions, not adding machinery.

---

## 2. Goals & non-goals

**Goals**

1. Persist a "Yes" carrying Level + HLO, with anything deeper optional — R-BIL-111.
2. Stop the client blocking and silently discarding partial drafts — R-BIL-112, NFR-BIL-112.
3. Keep every supplied reference catalog-validated — R-BIL-113.
4. Publish a defined null contract for partial rows — R-BIL-114.
5. Lock four already-working behaviors behind regression tests — R-BIL-115…118.

**Non-goals**

- SP role model (C2), PRMS integration (descoped), version-gate changes (A-2), renaming `aligns_with_toc`, schema changes, template restructuring, `is_read_only` changes, touching `pool-funding.util.ts`.

---

## 3. Architecture

The changed slice, top to bottom. **Bold = modified.**

```
STAR client  pool-funding-alignment.component.ts
             ├── isDraftSaveable()          ← BOLD: accept Level+HLO
             └── save() → bilateral.service.ts
                          └── writeDtoFromDrafts()  ← BOLD: emit partial
             sp-toc-alignment-block.component.ts
             └── ALIGN_QUESTION             ← BOLD: reworded
             sp-toc-alignment-block.component.html   ← unchanged (already correct)
                    │
                    ▼  PATCH /api/v1/results/:code/pool-funding-alignment
ARI server   bilateral.controller.ts        ← unchanged
             bilateral.service.ts
             ├── updateAlignment()          ← unchanged
             ├── validateTocAlignments()    ← BOLD: conditional checks + partial snapshot
             └── getAlignment()             ← unchanged (nulls already flow)
                    │
                    ▼
             result_pool_funding_toc_alignment   ← unchanged (already nullable)
```

No module boundary moves. No new dependency. `TocIntegrationService` is consumed exactly as today.

### 3.1 Composition

**No new files.** Modified only:

| Path | Change |
| --- | --- |
| `server/.../bilateral/bilateral.service.ts` | `validateTocAlignments` — conditional validation + partial snapshot construction |
| `server/.../bilateral/dto/update-pool-funding-alignment.dto.ts` | `TocAlignmentInputDto` descriptions; **convert `TocAlignmentReadbackResponse` + `AlignmentResponse` to `@ApiProperty` classes** with the null contract (§6.3, D-C1-10) |
| `server/.../bilateral/bilateral.controller.ts` | Typed `@ApiResponse` on `getAlignment` + `updateAlignment` (D-C1-10) |
| `server/.../green-checks/` (SQL function comment) | Correct the now-false invariant comment in `pool_funding_alignment_validation` (D-C1-11) |
| `client/.../pool-funding-alignment/pool-funding-alignment.component.ts` | `isDraftSaveable` |
| `client/.../shared/services/bilateral.service.ts` | `writeDtoFromDrafts` |
| `client/.../sp-toc-alignment-block/sp-toc-alignment-block.component.ts` | `ALIGN_QUESTION` |
| Sibling `*.spec.ts` for each | new + regression coverage |
| `docs/ux-ui/design.md` §12.2 | decision entry |

### 3.2 Reuse

Consumed unchanged: `TocIntegrationService` (cached catalog), `allowedLevelsFor` / `resolveResultTypeKey` (`toc-level-rules.util.ts`), `ResultPoolFundingTocAlignmentRepository` (upsert + cascade), `RolesGuard`, `ResultStatusGuard`, `ResponseUtils`, `LoggerUtil`, the `all-modals` host, and the `.label` / `.description` form-label contract (`docs/ux-ui/design.md` §7.1).

---

## 4. Data model

**No data model changes.**

Verified against migration `1779190000015-createResultPoolFundingTocAlignment.ts`: `level varchar(10) NULL`, `toc_result_id int NULL`, `indicator_id int NULL`, `quantitative_contribution decimal(18,2) NULL`, `toc_result_title text NULL`, `indicator_description text NULL`, `unit_messurament varchar(100) NULL`, `target_value varchar(50) NULL`, `target_year int NULL`. Only `aligns_with_toc tinyint(1) NOT NULL`.

Partial rows are representable today — the columns already hold `null` for every `aligns_with_toc: false` row. The partial-unique `active_result_sp` generated column and `idx_rpfta_active_result_sp` are untouched, so R-BIL-118 holds structurally.

---

## 5. API design

**`PATCH /api/v1/results/:result-code/pool-funding-alignment`** — same route, same guards, same roles, same version.

### 5.1 Field-presence rules for `aligns_with_toc: true`

| Field | Before | After |
| --- | --- | --- |
| `level` | required | **required** |
| `toc_result_id` | required | **required** |
| `indicator_id` | required | **optional** |
| `quantitative_contribution` | optional | optional |

### 5.2 Error vocabulary

| Code | Change |
| --- | --- |
| `missing_required_fields` | Fires only for absent `level` / `toc_result_id` |
| `level_not_allowed` | Conditional on `level` present |
| `unknown_toc_result_id` | Conditional on `toc_result_id` present |
| `unknown_indicator_id` | Conditional on `indicator_id` present |
| **`contribution_without_indicator`** | **New.** Fires when `quantitative_contribution` is supplied without `indicator_id` (R-BIL-113 AC.6, D-C1-8) |
| `duplicate_sp_code`, `sp_not_selected` | Unchanged |
| `409 toc_mapping_version_locked` | Unchanged (A-2) |

Atomicity (D-V2-8) preserved: errors accumulate, one `400`, nothing persists.

### 5.3 Compatibility

**Strictly widening.** Every previously-valid request stays valid; the change only removes rejection cases. No `/v2`. A consumer branching on `missing_required_fields` sees it less often, never unexpectedly (R-5; A-4 bounds the consumer set to this monorepo).

---

## 6. Backend module design

### 6.1 `validateTocAlignments` — conditional checks

Current shape (`bilateral.service.ts:905-929`): a `missingFields` guard over all three fields, `continue` on failure, then an unconditional `allowedLevels` check, then catalog resolution.

New shape, same single pass:

1. **Required floor** — collect `missing_required_fields` for absent `level` or `toc_result_id` only; `continue` on failure.
2. **Level check** — unchanged in effect (`level` is now guaranteed present at this point).
3. **Catalog resolution** — resolve the ToC result as today. **Indicator resolution runs only when `indicator_id` is present.** Absent → record the ToC result with a null indicator and proceed.
4. `validatedCatalogRefs` carries `{ tocResult, indicator: TocIndicator | null }`.

The `(sp_code, level)` combo map is built from entries that passed the floor — every such entry has a `level`, so the map's **keying is unchanged** and dedup still holds: at most one `getTocResults` call per distinct `(sp_code, level)`.

**A Level + HLO entry does add one call it did not make before**, and that is correct. Today such an entry fails the three-field `missingFields` check and `continue`s before reaching `catalogChecks` — zero calls. After the change it clears the floor and must be fetched to validate its `toc_result_id` (R-BIL-113 AC.2). So the headline "Level + HLO only" scenario goes **0 → 1** call.

> **Test authors:** do **not** assert that partial entries add zero calls. Assert (a) one call per distinct `(sp_code, level)` combo, and (b) zero calls when every entry fails the floor. *(Judgment round 1, F-2: the original text claimed "a partial batch never adds a catalog call", which is false and would have produced a backwards assertion and a false-green NFR gate.)*

### 6.2 Snapshot construction

The return map (`:993-1019`) gains one branch. Today it destructures `{ tocResult, indicator }` unconditionally and reads five indicator fields. New behavior:

- `tocResult` fields (`toc_result_title`) always populated.
- Indicator-derived fields (`indicator_id`, `indicator_description`, `unit_messurament`, `target_value`) populated **only when an indicator resolved**; otherwise `null`.
- `target_year` — set to `MAPPABLE_LIVE_VERSION` only alongside a resolved indicator, so a partial row does not claim a target year for a target it has no indicator for.
- `quantitative_contribution` — `?? null` as today.

**Guard:** `quantitative_contribution` must not be persisted without an `indicator_id`. A contribution is measured *in the indicator's unit* (`CONTRIBUTION_CALLOUT`); a unitless number is meaningless. Since the template only reveals the contribution input after an indicator is selected (:281), this state is unreachable from STAR — but the API must not accept it.

Rejected with the **dedicated code `contribution_without_indicator`** on field `quantitative_contribution` — **not** `missing_required_fields`, which §5.2 reserves for the Level + HLO floor. Backed by R-BIL-113 AC.6. *(Judgment round 1, F-1: the original design reused `missing_required_fields` here, contradicting its own §5.2 table and `R-BIL-111 AC.4`, and had no requirement backing.)*

### 6.3 Read path

`getAlignment` and the read-back **mapper logic** need no change — they already project nullable columns through `TocAlignmentReadbackResponse`, whose fields are all `| null` typed. Partial rows flow through untouched.

**But R-BIL-114 AC.4 (null contract documented in Swagger) requires real work.** `TocAlignmentReadbackResponse` and `AlignmentResponse` are plain TypeScript **`interface`s** with no `@ApiProperty` decorators, and neither `getAlignment` nor `updateAlignment` declares an `@ApiResponse({ status: 200, type: … })`. NestJS Swagger cannot introspect an interface — a TSDoc comment would render nowhere.

Satisfying AC.4 therefore means:

1. Convert `TocAlignmentReadbackResponse` and `AlignmentResponse` to `@ApiProperty`-decorated **classes**, following the precedent already set in this module by `dto/bilateral-hlos-indicators.response.dto.ts` (whose own header comment records exactly this reasoning: classes, not interfaces, so Swagger works).
2. Add typed `@ApiResponse` to both handlers — mirroring what T-04 did for `getHlosIndicatorsForResult` in toc-mapping-v2.
3. Document `nullable: true` + the partial-row semantics on the indicator-derived properties.

*(Judgment round 1, F-3: originally scoped as a one-line "Swagger descriptions" edit and excluded from the budget. §9 rebudgeted.)*

---

## 7. Frontend component architecture

### 7.1 `isDraftSaveable` — the real fix

Current (`pool-funding-alignment.component.ts:679-689`) requires all four fields including `quantitative_contribution`. New rule:

- `aligns_with_toc === null` → **not saveable** (unchanged — this half of the completeness gate is kept, R-BIL-112 AC.4).
- `aligns_with_toc === false` → saveable (unchanged).
- `aligns_with_toc === true` → saveable when `level` **and** `toc_result_id` are non-null. `indicator_id` free. `quantitative_contribution` free, but if non-null must be `>= 0`.

### 7.2 `writeDtoFromDrafts` — remove the silent drop

Current (`shared/services/bilateral.service.ts:370-378`) `continue`s on an incomplete "Yes", silently omitting it. Its own comment says the branch is *"defensive only, `canSave` gates completeness upstream"* — which is exactly why relaxing the gate without fixing the writer would convert a dead branch into a live data-loss path.

New behavior: emit the draft with whatever fields are set, omitting undefined optionals rather than the whole entry. The unanswered (`aligns_with_toc !== true` and `!== false`) skip is **kept** — it pairs with the save gate that already blocks on unanswered.

**Invariant (NFR-BIL-112):** after this change, no branch in the save path discards a user-entered draft without either persisting it or surfacing an error.

### 7.3 Template — unchanged

Progressive disclosure already produces the correct partial UI at every depth:

| Depth | Rendered |
| --- | --- |
| Yes, no Level | Level field only |
| Yes + Level | + HLO field (`@if (d.level)`, :119) |
| Yes + Level + HLO | + Indicator field (`@if (d.toc_result_id !== null)`, :209) |
| Yes + … + Indicator | + unit, target, contribution (`@if (selectedIndicator(); as indicator)`, :281) |

A **saved** partial row reloads through `draftsFromSaved`, which already null-coalesces every field (`shared/services/bilateral.service.ts:347-356`), landing in the identical DOM. No dangling label, no stale unit — R-BIL-116 AC.3 holds by construction.

### 7.4 Copy

`ALIGN_QUESTION` → *"Would you like to complete the detailed Theory of Change mapping for this result?"*. Rendered through the canonical `.label` class per `docs/ux-ui/design.md` §7.1 — no Tailwind substitute.

---

## 8. Reversion challenge (Step 2.3)

**Reverted behavior:** the **client completeness gate** — *"a rendered 'Yes' draft blocks save until the full cascade is complete"* — plus its paired defensive omit. Code comments label this `D-9`; see Finding 2b for why that label is not used as an identifier here.

**Challenge: what does removing this break?**

**Finding 1 — the source spec does not exist.** The code cites `docs/specs/archive/2026-06-17-bilateral-module--toc-mapping-save-gating-ux` (`pool-funding-alignment.component.ts:226`). That path is absent from the archive and has **no git history under any name**. The gate's recorded rationale survives only as inline comments. *Consequence: the challenge is answered from code, not from the decision record — and the dangling reference is logged as a follow-up.*

**Finding 2 — the gate bundles two rules; only one is reverted.**

| Rule | Origin | Disposition |
| --- | --- | --- |
| Unanswered (`null`) blocks save | the refinement of `OQ-UX-3` ("unanswered was previously treated as non-blocking") | **KEPT** — R-BIL-112 AC.4 |
| Incomplete "Yes" blocks save + is omitted | the completeness rule (code label `D-9`) | **REVERTED** |

`OQ-UX-3` is closed by the rule we keep. **The revert does not re-open it.**

**Finding 2b — the label `D-9` is not a baseline decision.** `docs/ux-ui/design.md` §12.1 already has a real, unrelated **D-9** (2026-07-22, monorepo governance / admin `--ari-*` palette migration). The bilateral "D-9" exists **only as inline code comments** pointing at a spec that never existed. Throughout this spec the reverted rule is therefore called **"the completeness gate"**; `D-9` is quoted only when citing the code comments verbatim. *(Judgment round 1, F-6 — anyone reading "D-9" in the baseline log would find the wrong decision.)*

**Finding 3 — concrete breakage search.** **Five** consumers of the completeness invariant were checked — four client-TS, one server-side:

| Consumer | Tier | Verdict |
| --- | --- | --- |
| `sameDraftSet` dirty-check (`:699-716`) | client | Compares every field individually — partial drafts diff correctly. No break. |
| `isStaleSaved` (`:667-674`) | client | Keys on `toc_result_id`, which a partial row has. Returns `false` when null — correct. No break. |
| Template reveal chain | client | Already gated per §7.3. No break. |
| `draftsFromSaved` reload | client | Already null-coalesces. No break. |
| **`pool_funding_alignment_validation`** (migration `1782950000000`) → `green-checks.repository.ts` → `result-status-workflow` | **server** | **No behavioral break — but its comment becomes false.** The function tests only `toc.aligns_with_toc is not null` (row presence), never the individual fields, so a partial row still reads complete. That matches AC-1676's "must not prevent submission" — **and not by accident.** **CORRECTED 2026-08-12 (Pivot Record: T-06):** `pool_funding_alignment` is a member of `VISUAL_ONLY_GREEN_CHECKS` (`green-checks/dto/find-green-checks.dto.ts:5-7`) and is skipped outright at `green-checks.service.ts:65` and `function-handler.service.ts:325` — the only two consumption sites in the tree. The function's return value does not gate the **server's** submit path. ~~Even a function returning `false` cannot block submission.~~ **CORRECTED 2026-08-12 (3rd pass, T-06 re-audit):** server-side only — the client gates Submit on the raw payload (`cache.service.ts:43`, `submission.service.ts:35-38`), so a `false` DOES disable Submit. The guarantee that a *partial row* does not block submission is structural — it rests on **row-presence semantics**, not on the visual-only exclusion. Its comment, however, asserts persisted "Yes" rows "already carry level/toc_result_id/indicator_id (enforced at save by `validateTocAlignments`)" — the exact guarantee this spec removes. |

**Outcome: no behavioral breakage identified across five consumers.** The revert is narrow — it removes a save-gate bolted onto a UI that already supported partial entry, while preserving the `OQ-UX-3` refinement. Recorded as **D-C1-4**.

> *(Judgment round 1, F-4: the original challenge searched **client TypeScript only** and stated its "no breakage" conclusion as a general verdict. The server-side green-check consumer was missed. Two consequences: the SQL comment must be corrected, and the submission guarantee is pinned by the new **R-BIL-119**.)* **CORRECTED 2026-08-12:** the clause "previously satisfied only by accident and untested" was **false on both counts** — the guarantee is structural (visual-only exclusion), and it was already covered by a pre-existing test at `function-handler.service.spec.ts` `HEAD:496`. See Pivot Record: T-06.

**Follow-ups raised:**

- **Dangling `@sdd-spec` references (§14 OQ-C1-5)** *(section number corrected 2026-08-12 — this line said §13, which is "Design decisions"; OQ-C1-5 lives in §14 "Open questions". The wrong number propagated from here into the Leader's T-10 brief and then into two landed code comments, which T-10's audit caught)* — not one, but at least three, across two distinct nonexistent paths: `:226` cites `docs/specs/archive/2026-06-17-bilateral-module--toc-mapping-save-gating-ux`; `:336` and `:443` cite `docs/specs/bilateral-module/toc-mapping-save-gating-ux`. The whole `docs/specs/bilateral-module/` prefix is stale module-wide — the real folder is `docs/specs/bilateral/`.
- **Baseline drift** — `docs/ux-ui/design.md` §12.2 (2026-05-23) states `pool_funding_alignment` is "intentionally absent from `GreenChecks`". ~~Migration `1782950000000` contradicts~~ **CORRECTED 2026-08-12 — it does not; see Pivot Record: T-06** ~~contradicts~~ it (requirements R-10).

---

## 9. Budget (Step 2.4)

Estimated from the design above. `/akili-execute` trips against these — exceeding one is an **escalation to the user**, not a silent continue.

| Metric | Estimate | Round-1 revision |
| --- | --- | --- |
| **Tasks** | **10** | was 7 → 9 after judgment round 1 (**+1** Swagger response classes F-3, **+1** submission green-check + SQL comment F-4) → **10** at decomposition: the regression net splits by tier (T-01 server / T-02 client) because the PR boundary is by tier. A split, not new scope — LOC unchanged |
| **LOC** | **~530 total — ~130 production, ~400 test/docs** | was ~430 / ~65 production — the interface→class conversion is real production code |
| **Review rounds** | **10** (one per task; first-attempt PASS expected) | was 7 → 9 → 10, tracking the task count |

The production/test ratio is still the point: this spec is mostly a **test net**, five of whose requirements assert behavior that already works (four regressions plus R-BIL-119, which holds today **structurally** — corrected 2026-08-12, see Pivot Record: T-06).

**Depth re-check:** Standard remains correct and is now better supported — the change spans both tiers, alters an FE-visible error contract, adds an error code, reverts a recorded gate, and touches the submission-workflow surface. Full would still be over-scoped: no schema change, no new integration, no auth surface, strictly-widening API compatibility.

---

## 10. Testing strategy

| Layer | Coverage |
| --- | --- |
| **Server unit** | `validateTocAlignments` matrix: Level+HLO saves; Level-only rejects; bare Yes rejects; each catalog code fires when its field is present and not when absent; contribution-without-indicator rejects with `contribution_without_indicator`; atomicity |
| **Server unit** | **Fan-out (NFR-BIL-110), assertions stated correctly:** one call per distinct `(sp_code, level)`; zero calls when every entry fails the floor. **Not** "partial adds zero calls" — see §6.1 |
| **Server unit** | **Submission (R-BIL-119):** a partial row passes `pool_funding_alignment_validation` / the pool-funding green check; an SP with no active ToC row still fails it |
| **Server** | Swagger metadata assertions on the new `@ApiResponse` classes (R-BIL-114 AC.4), mirroring toc-mapping-v2 T-04 |
| **Server unit** | Snapshot construction: partial row nulls indicator fields and `target_year`; complete row unchanged |
| **Client unit** | `isDraftSaveable` truth table; `writeDtoFromDrafts` **emits** the partial entry (the anti-regression for the silent drop); unanswered still blocks |
| **Client unit** | Reload of a saved partial row through `draftsFromSaved` → correct draft state |
| **Client unit** | Regression: R-BIL-115 selector format, R-BIL-116 unit/target gating, R-BIL-118 isolation |
| **Server unit** | Regression: R-BIL-117 read-only 409 including `SYSTEM_ADMIN` |
| **Human visual** | **D7** — copy placement/styling against the mockup, and a saved partial row's layout. No automated gate covers this (requirements §8.1) |

Mock strategy unchanged: `jest.fn()` repository factories, `TocIntegrationService` stubbed. **No MySQL in unit tests** (`src/CLAUDE.md` §9).

**Disqualifying conditions** (requirements §8.2): scoped-only runs, `lambda-toc`-unreachable skips counted as green (RB-1), or an unperformed visual check all make the verification **inconclusive**, not passing.

---

## 11. Rollout

**Two independently deployable stages** — a property worth exploiting:

| Stage | Contents | User-visible effect |
| --- | --- | --- |
| **1 — server** | §6 validation + snapshot + Swagger classes | **None *for the STAR client*.** The server accepts more; the un-updated client still gates completeness, so nothing sends partial. |
| **2 — client** | §7 save gate, writer, copy | Partial saving becomes available. |

No migration, so no schema/code ordering constraint. **Backout** is `git revert` per stage; reverting stage 2 alone restores today's behavior completely, and any partial rows already written remain readable (the read path never required completeness). No feature flag needed.

> **The inertness of stage 1 is conditional, not structural.** `PATCH /pool-funding-alignment` is reachable by **any** caller holding a ROAR JWT or a machine token whose responsible user carries `CONTRIBUTOR`, `CENTER_ADMIN`, or `SYSTEM_ADMIN`. Stage 1 is inert because **no known caller sends partial payloads** (assumptions A-3/A-4), not because the server structurally prevents it. No `test/` e2e suite exercises this route either. Before deploying stage 1, confirm no script, integration harness, or partner credential drives this endpoint directly. *(Judgment round 1, F-8 — the original text asserted "a true no-op deploy" as an unconditional guarantee.)*

**Comms:** STAR team on stage 2 (behavior change); BA/PO that AC-1676's partial-completion rule is live. No partner-platform impact.

---

## 12. Observability

No new log lines required. Existing `LoggerUtil` structured logging on the PATCH path already records `toc_alignment_count`; partial rows flow through it unchanged. No new `sync_process_log` rows, no metrics change.

---

## 13. Design decisions

| # | Date | Decision | Rationale |
| --- | --- | --- | --- |
| D-C1-1 | 2026-08-12 | Relax validation **in place** with per-field conditionals; no draft/complete state machine. | Smallest diff, one code path, preserves atomicity and the other five error codes. Rejected: a `draft` state (invents a concept AC-1676 never asks for, and C2 would have to reconcile it). |
| D-C1-2 | 2026-08-12 | Keep the `aligns_with_toc` column and wire name; document the semantic shift to "opted into detailed mapping". | Stored values stay compatible (`true` = mapped). A rename mid-flight breaks the FE for no user benefit. |
| D-C1-3 | 2026-08-12 | **Level + HLO is the floor** for a "Yes". | User decision 2026-08-12; matches AC-1676's shallowest listed stop ("HLO/Outcome only"). Level is implied — it filters the catalog the HLO is picked from. "No" expresses "not mapping". |
| D-C1-4 | 2026-08-12 | **Partially revert the client completeness gate**: drop the completeness rule, keep the required-answer rule. (Code comments label it `D-9`; that label is **not** in the baseline log and collides with the real `D-9` — see §8 Finding 2b.) | §8 challenge found no behavioral breakage across five consumers. The kept half is what closes `OQ-UX-3`, so the revert does not re-open it. |
| D-C1-5 | 2026-08-12 | `writeDtoFromDrafts` **emits** partial "Yes" drafts; the incomplete-Yes `continue` is removed. | It was documented as unreachable defense behind `canSave`. Relaxing the gate without this turns a dead branch into silent data loss — the exact defect AC-1676 is fixing (NFR-BIL-112). |
| D-C1-6 | 2026-08-12 | **No template change.** | Progressive disclosure (`@if` chain at :119 / :209 / :281) already renders every partial depth correctly; `draftsFromSaved` already null-coalesces on reload. |
| D-C1-7 | 2026-08-12 | Version gate unchanged (`MAPPABLE_LIVE_VERSION = 2026`, `409`). | User decision 2026-08-12. Orthogonal to optionality — it controls *which year* may be mapped, not *how completely*. |
| D-C1-8 | 2026-08-12 | Reject `quantitative_contribution` supplied without `indicator_id`, using the **dedicated code `contribution_without_indicator`**. | A contribution is expressed in the indicator's unit; unitless it is meaningless. Unreachable from STAR (template gating) but the API must not accept it. **Revised in judgment round 1 (F-1):** originally reused `missing_required_fields`, which contradicted §5.2 and `R-BIL-111 AC.4` and had no requirement backing. Now traced to `R-BIL-113 AC.6`. |
| D-C1-10 | 2026-08-12 | Convert `TocAlignmentReadbackResponse` / `AlignmentResponse` from interfaces to `@ApiProperty` classes and add typed `@ApiResponse` to both handlers. | Only way to satisfy `R-BIL-114 AC.4` — Swagger cannot introspect an interface. Follows the module's own precedent (`bilateral-hlos-indicators.response.dto.ts`, toc-mapping-v2 T-04). Added in judgment round 1 (F-3). |
| D-C1-11 | 2026-08-12 | Correct the `pool_funding_alignment_validation` SQL comment and pin the submission guarantee with `R-BIL-119` + a regression test. | The function's comment documents an invariant this spec removes. Behavior is already correct (row-presence check). **CORRECTED 2026-08-12 (Pivot Record: T-06):** it was NOT "correct by accident and untested" — the check is **visual-only** (`VISUAL_ONLY_GREEN_CHECKS`), excluded from every completeness computation, so correctness is structural; and it was **already tested** at `HEAD:496`. The surviving half of this decision is the comment correction alone. Added in judgment round 1 (F-4). |
| D-C1-9 | 2026-08-12 | Ship **server-first as an inert deploy**, client second. | Stage 1 widens acceptance while no client sends partial — zero user-visible risk, and it de-risks stage 2 to a pure client change. |

*Decisions affecting the baseline (D-C1-2 semantic shift, D-C1-3 floor) must also be appended to `docs/ux-ui/design.md` §12.2.*

---

## 14. Open questions

| # | Question | Owner | Target |
| --- | --- | --- | --- |
| OQ-C1-3 | Should a saved partial row be visually marked incomplete so contributors can find rows to finish? Not requested by AC-1676. | PO / BA | Before Phase 3 |
| OQ-C1-4 | Clearing an indicator from a complete row — partial update (assumed) or validation error? | BA | Before Phase 3 |
| **OQ-C1-5** | **At least three dangling `@sdd-spec` references** in `pool-funding-alignment.component.ts` across two nonexistent paths: `:226` → `docs/specs/archive/2026-06-17-bilateral-module--toc-mapping-save-gating-ux`; `:336` and `:443` → `docs/specs/bilateral-module/toc-mapping-save-gating-ux`. Neither exists, and the `docs/specs/bilateral-module/` prefix is stale **module-wide** (real folder: `docs/specs/bilateral/`). Correct all three, or delete? Sweep the prefix separately? | Eng lead | During execution |
| **OQ-C1-6** | `docs/ux-ui/design.md` §12.2 (2026-05-23) asserts `pool_funding_alignment` is "intentionally absent from `GreenChecks`", ~~contradicted by migration `1782950000000`~~ **— CORRECTED 2026-08-13 (3rd closure pass, found by independent validation): the migration does NOT contradict the entry.** The check is emitted but excluded from **server-side** completeness; the 2026-05-23 wording was imprecise, not wrong. See `execution.md` → Pivot Record: T-06. Correct the entry as part of this spec, or raise a separate `/akili-audit` item? | Eng lead / PO | Before Phase 3 |

---

## 15. References

- Requirements: [`./requirements.md`](./requirements.md) · Proposal: [`./proposal.md`](./proposal.md) · Parent: [`../mapping-adjustments/proposal.md`](../mapping-adjustments/proposal.md)
- Prior art: `docs/specs/archive/2026-06-17-bilateral-module--toc-mapping-v2/` (R-BIL-092…097, D-V2-1…D-V2-8)
- Baseline: `docs/ux-ui/design.md` §7.1 (form-label contract), §12.2 (decision log); `server/researchindicators/src/CLAUDE.md` §9 (test rules); `client/research-indicators/src/CLAUDE.md`
- Migration: `1779190000015-createResultPoolFundingTocAlignment.ts`
- Jira: [AC-1676](https://cgiarmel.atlassian.net/browse/AC-1676)
