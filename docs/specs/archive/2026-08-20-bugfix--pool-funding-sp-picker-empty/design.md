# Design — Bilateral / Pool Funding SP Picker Renders Empty

- **Module:** bilateral (server `domain/entities/bilateral` + `domain/tools/clarisa`, client `pool-funding-alignment`)
- **Spec id:** 2026-08-pool-funding-sp-picker-empty
- **Status:** draft
- **Owner:** ARI squad — Juan Carlos Cadavid
- **Linked requirements:** [`./requirements.md`](./requirements.md)
- **Linked TRD:** `docs/trd/trd.md` — bilateral module, CLARISA integration
- **Last updated:** 2026-08-20

---

## 1. Goals & Non-Goals

**Goals**

1. Make the accepted CLARISA mapping-status set a **named, single-source-of-truth discriminator** (R-PSP-001, R-PSP-003).
2. Make the picker and the ToC catalog resolve SPs through **one function**, so they cannot disagree (R-PSP-002).
3. Give the mapping a **feed-stable resolution key** and a distinguishable `stale` state (R-PSP-004, R-PSP-005, R-PSP-006).
4. **Delete the CLARISA stub apparatus**, so no committed double survives to agree with the bug (R-PSP-007, revised 2026-08-20).

**Non-Goals:** as fenced in `requirements.md` §3 and `proposal.md § Non-Goals`. Additionally, this design does **not** unify the entity-code clause (`code === 22`) — see D-PSP-8.

---

## 2. Architecture

### 2.1 The real structural defect

The mapping-resolution chain is **duplicated verbatim** in two methods of `BilateralService`:

| | `getScienceProgramsForResult` | `getHlosIndicatorsForResult` |
| --- | --- | --- |
| Context lookup | `bilateral.service.ts:153` | `:267` |
| No agreement ⇒ unmapped | `:172` | `:293` |
| No mapping row ⇒ unmapped | `:186` | `:307` |
| `findProjectById` | `:192` | `:313` |
| Project missing ⇒ **unmapped** | `:202` | `:322` |

Two copies of the same five-step chain, including the same collapsing of "project not resolvable" onto `unmapped`. Any fix applied to one and not the other reintroduces the divergence this spec exists to remove — and R-PSP-002's `AND IT MUST` clause ("reach that result through the **same** predicate function") cannot be satisfied by discipline alone.

**Therefore the design's first move is extraction, not modification.** One private resolution seam returns a discriminated union (`unmapped` / `stale` / `mapped` + project + mapping row); both public methods consume it. `stale`, the stable key, and the divergence log then land in both surfaces **by construction**.

Same reasoning one level down: `isProjectScienceProgramMapping` and `deriveScienceProgramMetaByCode` already duplicate the four-clause filter, and `hasSciencePrograms` implements a third variant. One pure predicate module replaces all three status clauses.

### 2.2 Composition

| Path | Responsibility | New / changed |
| --- | --- | --- |
| `domain/entities/bilateral/utils/sp-mapping.predicate.ts` | **New.** Pure constants + functions: accepted-status set, the SP-row predicate, SP derivation from a project. No Nest imports — mirrors `project-selector.util.ts` | new |
| `domain/entities/bilateral/bilateral.service.ts` | Extract `resolveMappedProject()`; both public methods consume it; derivation delegates to the predicate module | changed |
| `domain/entities/bilateral/dto/bilateral-science-programs.response.dto.ts` | `MappingStatus` gains `stale`; item gains `mapping_status` | changed |
| `domain/tools/clarisa/projects/clarisa-projects.service.ts` | `findProjectByExternalCode()`; `hasSciencePrograms` delegates its status clause to the predicate module | changed |
| `domain/shared/utils/env.utils.ts` | `BILATERAL_ACCEPTED_SP_STATUSES` getter | changed |
| `.../bilateral-project-mapping/entities/bilateral-project-mapping.entity.ts` | `clarisa_external_code` column + index | changed |
| `.../bilateral-project-mapping/automapper.service.ts` | `newDerivedRow` populates the stable key | changed |
| `.../bilateral-project-mapping/bilateral-mapping-coverage.service.ts`, `automapper.service.ts#coverage` | Count via the stable key | changed |
| `db/migrations/<ts>-addClarisaExternalCodeToBilateralProjectMapping.ts` | Schema | new |
| `db/migrations/<ts>-backfillClarisaExternalCode.ts` | Data | new |
| `domain/tools/clarisa/stub/` (entire folder) | **Deleted** — router, mount, config, both specs, both tools, all four fixture artifacts | **removed** |
| `main.ts` | Stub mount call removed | changed |
| `.env.example` | `ARI_CLARISA_STUB_ENABLED` retired | changed |
| `client/.../pool-funding-alignment.component.{ts,html}` | Third empty state + `Pending` qualifier | changed |
| `client/.../interfaces/bilateral/pool-funding-alignment.interface.ts` | `PoolFundingMappingStatus` gains `stale` | changed |

### 2.3 Reuse

- `normalizeExternalCode` (`bilateral-project-mapping/utils/external-code.util.ts`) — the **only** normalization. NFR-CAM-003's rule stands: no second strip is written.
- `ENV.BILATERAL_ACTIVE_PORTFOLIO` — unchanged, still the portfolio clause.
- `LoggerUtil` — the id-divergence line.
- `AuditableEntity`, `ResponseInterceptor`, `GlobalExceptions` — untouched.

---

## 3. Data Model

| Item | Value |
| --- | --- |
| Entity | `BilateralProjectMapping` |
| Column | `clarisa_external_code` — `varchar(100)`, `NULL`, comment: normalized CLARISA `external_code`; feed-stable resolution key |
| Index | `idx_bpm_clarisa_external_code` |
| Nullable **by design** | Legacy rows before backfill, and rows whose project genuinely has no `external_code`. A `NOT NULL` column would make the schema migration fail on existing data and force the backfill into it — which template §5 forbids |
| Untouched | The MySQL generated column + partial-unique index (D-PI-9), `clarisa_project_id` (kept, still returned), every audit column |
| OpenSearch | none |

Two migrations, deliberately separate: schema, then data. **K-015 — the pipeline deploys code only.** Both are human-applied steps against the shared Dev DB.

---

## 4. API Surface

### `GET /api/v1/results/:result-code/pool-funding-alignment/science-programs`

- **Controller:** `bilateral.controller.ts:87`
- **Roles / guards / interceptors:** unchanged
- **Response data shape:** `mapping_status` widens `'mapped' | 'unmapped' | 'stale'`; each `science_programs[]` item gains `mapping_status: string` (the CLARISA status that admitted it)
- **Errors:** unchanged — `404` result not found; otherwise always `200`
- **Swagger:** `@ApiOperation` description updated for the third state
- **Breaking?** **No.** Purely additive; no `/v2`

### `GET /api/v1/results/:result-code/pool-funding-alignment/hlos-indicators`

Same `mapping_status` widening. Behavior change only: catalogs now resolve for `Pending`-only projects.

### `GET /api/bilateral-project-mappings` · `…/coverage`

Row shape gains `clarisa_external_code`. Coverage counts via the stable key.

---

## 5. Workflows & Business Rules

### 5.1 `resolveMappedProject(resultId, resultCode)` — the single seam

1. `findPoolFundingAlignmentContext(resultId)` → **404** if absent (unchanged).
2. No `agresso_agreement_id` ⇒ `unmapped`, `clarisa_project: null`.
3. No active mapping row ⇒ `unmapped`, `clarisa_project: null`.
4. **Resolve the project, in this order:**
   1. `findProjectByExternalCode(normalizeExternalCode(row.clarisa_external_code))` when the column is populated.
   2. Fallback `findProjectById(row.clarisa_project_id)`.
   3. Neither ⇒ **`stale`**, carrying the stored snapshot (`clarisa_project_id`, `clarisa_project_short_name`).
5. Resolved via (i) with a **different** numeric id than stored ⇒ emit one `LoggerUtil._warn` naming both ids and the agreement — the drift signal the original code comment intended and never produced (R-PSP-005 `AND IT MUST`).
6. Return `mapped` + the project + the mapping row.

No fuzzy matching at any step. Normalization is case/whitespace plus the closed `{B-, C-}` prefix set — R-PSP-005's `BUT it must NOT`.

### 5.2 SP derivation

`deriveSciencePrograms` and `deriveScienceProgramMetaByCode` keep their existing shapes but call the shared predicate. Clause order is unchanged; **only the status clause changes**, from `=== 'Confirmed'` to membership in the accepted set. Portfolio, AOW and `/^SP\d/i` evaluate exactly as before — R-PSP-001's `AND IT MUST`.

Each returned item carries the status of the row that admitted it. When one project has both a `Confirmed` and a `Pending` row for the same code, the **first accepted row wins** — the existing `if (!nameByCode.has(code))` dedup semantics, unchanged.

### 5.3 Save-path validation — verified unaffected

`normalizeLeverCodes` (`bilateral.service.ts:1504`) validates submitted `sp_codes` **by delegating to `getScienceProgramsForResult`**. It therefore inherits the widened set automatically: no split-brain between what the picker offers and what the PATCH accepts, and the `errors.unknown_sp_codes` contract is untouched.

The MySQL function `pool_funding_alignment_validation` reads only `result_pool_funding_alignment*`, `result_contracts`, `agresso_contracts` and `bilateral_project_mapping`. **It never reads a CLARISA status**, so widening the TS predicate cannot desynchronize it. *(Both verified by reading the sources during the Step 2.3 challenge — see §11.)*

### 5.4 Stub removal (revised 2026-08-20)

> Superseded: this section previously specified harvesting a `(external_code, smo_code) → status` map, sourcing `convert-export.ts` from it, deleting `CONFIRMED_STATUS`, regenerating the fixture, and inverting the fidelity spec's D-4.

The stub's own removal condition — written verbatim in five places — is now satisfied: CLARISA publishes `external_code` (**911/1210**, and **198/198** across the phase-2026 eligible cohort) and phase-2026 data (`{2025: 299, 2026: 911}`). Running the repo's shipped selection predicates over the live feed reproduces the fixture's cohort exactly: **198 eligible, 198 with `external_code`**.

Delete `domain/tools/clarisa/stub/` in full, remove the `main.ts` mount, retire the env flag. Blast radius is closed — every fixture consumer lives inside `stub/` plus that one mount.

Nothing replaces it: predicate branch coverage already lives in small in-test fixtures (**D-PSP-7**), which is where inputs can be chosen freely.

---

## 6. Frontend Impact

### 6.1 STAR client

`PoolFundingMappingStatus` widens to `'mapped' | 'unmapped' | 'stale'`. **This is the enforcement mechanism, not a side effect:** widening the union makes TypeScript surface every consumer that does not handle the new member, so R-PSP-004 AC.3 ("existing consumers handle `stale`") is checked by the compiler rather than by grep.

| Computed | Change |
| --- | --- |
| `isUnmapped` | Stays `=== 'unmapped'` — must **not** absorb `stale` |
| `isStale` | New — `=== 'stale'` |
| `hasNoSciencePrograms` | Unchanged: `mapped` + zero SPs |
| `showSpPicker` | Adds `&& !isStale()` |

Three constants replace two. The stale copy must not instruct the user to register a mapping (R-PSP-004 `AND IT MUST NOT`); it names the drift and points at ops for *reconciliation*, which is a different action.

`Pending` SPs render with a qualifier chip reusing the existing `.pf-stale-tag` visual treatment verbatim — the precedent set by `ORPHANED_TOC_TAG` (D-C2-10), where only the copy differed. No new token, no new component.

### 6.2 Admin SSR

`BilateralProjectMappings.tsx` — the hardcoded label *"Science Programs (Confirmed, P25)"* becomes accurate to the configured set, and the mappings table shows `clarisa_external_code`.

---

## 7. Integration Impact

| Item | Detail |
| --- | --- |
| CLARISA | **Read-only, unchanged.** This spec removes ARI's dependency on a CLARISA curation state it cannot set |
| New env var | `ARI_BILATERAL_ACCEPTED_SP_STATUSES`, default `Confirmed,Pending`, declared in `.env.example` beside `ARI_BILATERAL_ACTIVE_PORTFOLIO` |
| Cron | none |
| Sockets / MQ / DynamoDB | none |

---

## 8. Security & Authorization

No change. No new endpoint, no role change, no secret, no PII. Machine-token visibility unchanged.

---

## 9. Observability

| Signal | Level | When |
| --- | --- | --- |
| Stable key resolved a **different** id than stored | `warn` | §5.1 step 5 — the drift signal, with agreement id, stored id, resolved id |
| Mapping unresolvable by either key | `warn` | `stale` returned, with the agreement id |
| Accepted-status set at boot | `log` | Once, so a support ticket can be answered from the logs instead of the env |

The third line exists because **K-016** has fired twice as "returns nothing, nothing broken". A log line naming the effective set converts that class of ticket into a lookup.

---

## 10. Testing Strategy

| Level | Coverage |
| --- | --- |
| **Unit — predicate** | Accepted/rejected per status, portfolio mismatch, AOW, non-`SP\d`. **Small in-test fixtures, not the 198-project stub** — see D-PSP-7 |
| **Unit — resolution seam** | Each of the four branches; the id-divergence warn |
| **Unit — cross-surface** | Picker and ToC catalog return identical SP-code sets for a `Pending`-only project (R-PSP-002 AC.1) |
| **Unit — client** | Three messages pairwise distinct; `showSpPicker` false on `stale`; `Pending` qualifier renders |
| **Stub removal** | Zero references remain; full suite green; build + boot clean |
| **Migration** | Forward + `migration:revert`; backfill idempotency; before/after row snapshot |
| **Manual (DC-8)** | **Dev, real CLARISA:** `STAR-2227` → `SP01`; `STAR-3403` → `SP02`+`SP06`. Not automatable — accepted risk |

Coverage floor unchanged (60% server / client floors per root guide).

---

## 11. Reversion Challenge (Step 2.3)

Two decisions remove behavior already shipped. Both were challenged with *"what does removing this break?"* before reaching `tasks.md`.

### Reversion 1 — removing the `Confirmed`-only guard

| Question | Finding |
| --- | --- |
| Does the **save path** validate SPs separately, so the picker could offer what the PATCH rejects? | **No split-brain.** `normalizeLeverCodes` delegates to `getScienceProgramsForResult`, so it widens in lockstep |
| Does the **MySQL validation function** read CLARISA status? | **No.** `pool_funding_alignment_validation` reads only ARI tables — read in full during the challenge |
| What happens when CLARISA later **rejects** a `Pending` SP a reporter already selected? | A real consequence — and a **designed recovery path already exists**: `REJECTED_SP_MESSAGE_PREFIX` ("These Science Programs are no longer valid for this result: … Remove them and save again"). Widening extends the population that can hit an existing, handled state |
| Does widening shrink anything? | No. It only **admits** rows. The admin `has_science_programs` flag turns `true` for more projects — a widening of the filtered picker list, not a loss |

**Verdict: proceed.** The one genuine consequence has an existing handler. Recorded so it is not re-litigated.

### Reversion 2 — deleting the stub apparatus *(re-challenged 2026-08-20; supersedes the D-4-inversion challenge)*

| Question | Finding |
| --- | --- |
| What did the stub exist for? | The feed published **no** `external_code` (M-7: 0/299) and no phase-2026 data (M-8), so the automapper had nothing to join on. That gap is closed: **198/198** of the eligible cohort now carry `external_code` |
| Does anything outside `stub/` depend on it? | **No.** Every consumer is inside the folder, plus one `main.ts` mount. Verified by `grep -rln "clarisa-projects.fixture\|clarisa-stub" src` |
| What is genuinely lost? | Offline/deterministic feed testing. Accepted: the suites mock the CLARISA service and never read the fixture, so no existing test loses its input |
| Does removal weaken RC-C's fix? | **No — it strengthens it.** No fixture means no 283 false `Confirmed` rows, so the double cannot agree with the bug at all |
| Does this affect production? | No. The archived R-1 (*production lacks `external_code`*) is a **release** constraint on the automapper and is unchanged either way — the stub was a development aid, never a production path |

**Verdict: proceed**, with the enabling measurement and its invalidating condition recorded in R-PSP-007 (**K-013**), and the archived spec annotated rather than overwritten.

---

## 12. Rollout

1. Merge code (pipeline deploys code only).
2. **Human step:** apply the schema migration, then the backfill migration, against Dev. Verify with `migration:show` — **and read the raw output for an error before counting**; ANSI escapes have made `grep '^\[ \]'` report a confident zero (K-014).
3. Confirm `ARI_CLARISA_HOST` on Dev points at real CLARISA (DEC-3). The stub flag no longer exists.
4. Set `ARI_BILATERAL_ACCEPTED_SP_STATUSES` explicitly rather than relying on the default, so the value is visible in config review.
5. **Wait out the 5-minute CLARISA TTL or restart the process** before judging any of it (K-016 — this has been misread as breakage twice).
6. Manual DC-8 verification on the two named results.

**Backout:** revert the code; the accepted set falls back to `Confirmed` via env without a deploy in environments where the var is set explicitly. The migrations are additive and revert cleanly; the column can stay in place harmlessly.

**Comms:** bilateral operations team (the support tickets stop), MEL/PRMS (OQ-1 on submission of `Pending`-based alignments).

---

## 13. Budget (Step 2.4 — tripwire for `/akili-execute`)

| Metric | Expected |
| --- | --- |
| Tasks | **9** |
| LOC | **~700** (server ~450 · client ~120 · stub removal ~130, now mostly **deletions**) |
| Review rounds | **2** |

Matches the declared **Standard** depth. Not a quality cap — if execution exceeds these, the Leader **stops and escalates** rather than continuing.

---

## 14. Design Decisions Log

| # | Date | Decision | Rationale |
| --- | --- | --- | --- |
| **D-PSP-1** | 2026-08-20 | Extract one `resolveMappedProject()` seam **before** changing behavior | The chain is duplicated verbatim in two methods; R-PSP-002's "same function" clause is otherwise a promise, not a structure |
| **D-PSP-2** | 2026-08-20 | One pure `sp-mapping.predicate.ts`; the three variant filters consume it | Mirrors `project-selector.util.ts`. The drift this bug is made of started as three copies of one rule |
| **D-PSP-3** | 2026-08-20 | Accepted set via **env**, not `app_config` | `app_config` sits behind the 5-min TTL (K-016) and would make the knob invisible for 5 minutes with re-saving restarting the window. Env matches the sibling `BILATERAL_ACTIVE_PORTFOLIO` precedent exactly. **Rejected alternative:** `app_config` for runtime tuning — this is a correctness default, not a frequently-tuned dial |
| **D-PSP-4** | 2026-08-20 | Keep the set a **discriminator**, never collapse to "accept everything" | **K-005.** AC.4 pins it: reverting the env to `Confirmed` must reproduce the old empty result, or the set is decoration |
| **D-PSP-5** | 2026-08-20 | `stale` is a **third** `mapping_status`, not a flag on `unmapped` | The union widening makes the compiler enumerate every consumer. A boolean flag would let a consumer ignore it silently — the exact failure that produced the false message |
| **D-PSP-6** | 2026-08-20 | Stable key **added beside** `clarisa_project_id`, not replacing it | The stored id is still the drift signal (§5.1 step 5). Dropping it would delete the evidence that a feed swap happened |
| **D-PSP-7** | 2026-08-20 | Predicate branches are proven by **small in-test fixtures**; the 198-project stub proves **shape fidelity only** | The two jobs are different, and conflating them is how the double came to agree with the bug (**KZ-001**, 12th occurrence). The stub stays faithful — all-`Pending` today; discrimination lives where inputs can be chosen |
| **D-PSP-8** | 2026-08-20 | `hasSciencePrograms` keeps its `cgiar_entity_type_object.code === 22` narrowing; **only the status clause is unified** | Per M-12, code 22 is SP01–SP08 only, so the admin flag stays blind to SP09–SP13. Harmonizing it is a **behavior change to the admin project list** that no requirement here asks for, and K-005 cuts both ways: do not collapse a discriminator, and do not silently redefine one. Recorded as **OQ-2**, with its consequence stated — this satisfies R-PSP-003 AC.3 |
| ~~**D-PSP-9**~~ | 2026-08-20 | ~~Fixture statuses **harvested**, never defaulted~~ — **SUPERSEDED by D-PSP-11** | Its rationale (a silent fallback to `Confirmed` rebuilds the defect) is preserved by deletion, which removes the fallback site entirely |
| **D-PSP-11** | 2026-08-20 | **Delete the stub** rather than make its fixture faithful | The removal condition written into the stub's own source is met — `external_code` 198/198 on the phase-2026 cohort, phase-2026 data present. Repairing an artifact the code says to delete would leave two copies of one cohort, which is the shape of the defect this spec exists to remove. **Rejected alternative:** regenerate from the Excel export (the file exists at `~/Downloads/prms-projects-20260818.xlsx`) — viable, but it maintains what the spec marks for deletion |
| **D-PSP-10** | 2026-08-20 | `clarisa_external_code` is **nullable** | `NOT NULL` would fail the schema migration against existing rows and force the backfill inside it, which template §5 forbids |

### Cross-check against `requirements.md` (KZ-016)

Read back against every `AND IT MUST` / `BUT it must NOT` clause and against the constraints written into the modules touched:

- R-PSP-001 `AND IT MUST` (other clauses unchanged) → §5.2 states clause order and scope explicitly.
- R-PSP-002 `AND IT MUST` (same function) → satisfied structurally by D-PSP-1, not by instruction.
- R-PSP-004 `AND IT MUST NOT` (never instruct registering an existing mapping) → §6.1 separates *register* from *reconcile*.
- R-PSP-005 `BUT it must NOT` (no fuzzy match) → §5.1 closes normalization to the existing util.
- R-PSP-006 `BUT it must NOT` (no audit-column mutation) → §3 lists the untouched columns.
- R-PSP-007 `AND IT MUST` (other invariants intact) → §5.4 keeps the dictionary-verbatim rule and the loud-failure behavior.
- **Module constraint honored:** `AutomapperService` is singleton-scoped and must inject **only** `ClarisaProjectsService` + `DataSource` (NFR-BAS-001, its own module header). The stable-key write in `newDerivedRow` needs no new dependency — the value is derived from data the candidate already carries.

---

## 15. Open Questions

| # | Question | Owner | Due |
| --- | --- | --- | --- |
| **OQ-1** | May a reporter *submit* an alignment built on `Pending` SPs, or should submit warn? DEC-1 settled visibility only | Product + PRMS | before execute |
| **OQ-2** | Should `hasSciencePrograms` drop the `code === 22` narrowing? (D-PSP-8) | ARI squad | before archive |
| ~~**OQ-3**~~ | ~~Should the stub stay the local default?~~ **CLOSED 2026-08-20** — user pinned local to real CLARISA; **D-PSP-11** deletes the stub | ARI squad | done |

---

## 16. References

- [`./requirements.md`](./requirements.md) · [`./proposal.md`](./proposal.md)
- `docs/specs/archive/2026-08-20-bilateral--clarisa-automapper-s2` — OQ-5, answered here
- `docs/specs/archive/2026-08-19-bilateral--clarisa-fixture-stub` — M-11/M-12/M-14, D-4
- `docs/specs/kaizen-log.md` — K-005, K-013, K-014, K-015, K-016, KZ-001, KZ-007, KZ-016
