# Design — bilateral / CLARISA ↔ AGRESSO Auto-Mapper (S2)

- **Module:** bilateral — server + client
- **Spec id:** 2026-08-clarisa-automapper-s2
- **Status:** draft
- **Owner:** Juan Carlos Cadavid
- **Linked requirements:** [./requirements.md](./requirements.md)
- **Linked TRD:** [`docs/trd/trd.md`](../../../trd/trd.md)
- **Last updated:** 2026-08-19
- **Depth:** Standard

---

## 1. Goals & non-goals

**Goals**
- Read CLARISA's declared pairing and write it, **project-first** (R-CAM-001).
- Preview before writing; never surprise an admin with 194 rows (R-CAM-002).
- Report coverage against **reachable**, never against the contract table (R-CAM-004).
- Record what actually happened — a deterministic derivation, not AI (NFR-CAM-004).

**Non-goals**
- Name-similarity matching. S1 measured it at exactly zero; the proposal forbids building it.
- A cron schedule (deferred until the output is trusted).
- Any change to the shipped selection predicates, or to pool-funding tagging.
- Writing `confidence_score` (NFR-CAM-002).

---

## 2. Architecture

Three slices, one shared derivation.

```
external-code.util.ts   normalizeExternalCode()   ← the ONE normalization, shipped by S1 (NFR-CAM-003)
        │
        ├──► automapper.service.ts        the run: resolve → classify → preview | apply
        │           │
        │           ├─ reuses  isBilateralFunding / isAllianceProject / matchesPhase   (never reimplements)
        │           └─ reuses  ClarisaProjectsService + AgressoContract repository
        │
        ├──► automapper.controller.ts     POST preview · POST apply · GET coverage
        │
        └──► client: dashboard strip + run/review surface on Bilateral Mapping
```

### 2.1 Composition

| Path | Responsibility |
| --- | --- |
| `…/bilateral-project-mapping/utils/external-code.util.ts` | `normalizeExternalCode` — the single definition site, **already shipped by S1**. This spec consumes it and adds no strip of its own |
| `…/bilateral-project-mapping/automapper.service.ts` | Resolution, classification, idempotent apply, supersession |
| `…/bilateral-project-mapping/automapper.controller.ts` | HTTP edge, `@Roles`, Swagger |
| `…/bilateral-project-mapping/dto/automapper-run.dto.ts` | Run report shape |
| `src/db/migrations/<ts>-addAutoMappingSource.ts` | The enum value (NFR-CAM-004) |
| client: `bilateral-mapping-coverage` strip + run surface | Dashboard and review |

### 2.2 Reuse

The selection predicates and the CLARISA client are consumed as-is. The AGRESSO side is a repository lookup keyed on `agreement_id`. **Nothing here re-derives eligibility** — a second implementation of "which projects count" would diverge from the picker and the two would silently disagree (**K-005**, **KZ-013**).

---

## 3. Data model

**One migration, one enum value.** `bilateral_project_mapping.source` gains a non-AI value for automatically created rows; `MANUAL`, `AI_SUGGESTED` and `AI_AUTO` are untouched, the latter two now explicitly reserved for a future inferential matcher.

- No new column. `confidence_score` already exists and stays `null` (NFR-CAM-002).
- **No backfill.** All 5 existing rows are `MANUAL`.
- Reversible: the migration adds a value; the revert path removes it, and is only safe while no row uses it.

---

## 4. API surface

Three endpoints under the existing bilateral mapping module. All `@Roles`-guarded to the same admin role the screen already requires, all Swagger-annotated, all returning the standard envelope.

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `…/auto-map/preview` | Resolve and classify. **Writes nothing.** Returns the run report |
| `POST` | `…/auto-map/apply` | Perform the writes the preview described |
| `GET` | `…/coverage` | The dashboard figures |

**The run report is the same shape for preview and apply** — four buckets: `created` (or `toCreate`), `alreadyMapped`, `ambiguous`, `unresolved`. Each entry carries the project's `external_code`, derived contract id, `full_name` and `id`, so the review surface never has to show a bare number (R-5).

---

## 5. Workflows & business rules

**The run, project-first:**

1. Load the eligible cohort using the shipped predicates.
2. **Guard (NFR-CAM-001):** if the cohort is non-empty and **no** project carries `external_code`, abort with an explicit message and write nothing.
3. For each eligible project: derive the contract id via `normalizeExternalCode` (closed set `{B-, C-}`; a prefix outside the set passes through unchanged — S1 DD-4).
4. Group derived ids. Any id claimed by **two or more** projects → `ambiguous`; none is auto-applied.
5. Look the id up in AGRESSO. Absent → `unresolved`, recorded **with the derived id** so the gap is diagnosable.
6. Present → consult the existing mapping for that contract:

| Existing row | Action |
| --- | --- |
| none | `toCreate` |
| active, same project | `alreadyMapped` — no write |
| active, `MANUAL`, different project | `divergent` — **reported, never touched** (R-CAM-003) |
| active, non-`MANUAL`, different project | **supersede**: deactivate + create (R-CAM-005) |

7. Preview stops here. Apply performs only steps the preview classified.

**Idempotency** comes from step 6, not from a transaction guard: a second run finds every row already mapped and writes nothing.

**Side effects:** none beyond the mapping rows. No OpenSearch reindex, no socket emit, no pool-funding tag change — tagging reads the contract's own `funding_type` and never consults CLARISA.

---

## 6. Frontend / UX

### 6.1 The coverage strip

Sits above the existing table on Bilateral Mapping. **Three cards, all actionable:**

```
┌──────────────┬──────────────┬──────────────┐
│   Mapped     │   Pending    │  Reachable   │
│      4       │     194      │     198      │
└──────────────┴──────────────┴──────────────┘
        Coverage 4 / 198 · 2%   (eligible CLARISA projects, phase 2026)
```

> **The `4 / 198` in the mockup above is illustrative, not a prediction** (D-7; annotated 2026-08-20).
> Against the measured 2026-08-19 feed the live strip reads ≈ `1 / 198` — only `D514 → 1516` is in the
> 2026 cohort. See the note under `requirements.md` R-CAM-004.

**The denominator is printed on screen**, so the figure cannot be quoted without it (R-CAM-004). The 1377 unpaired `BLR` contracts do not appear at all — they are not pending work, and a fourth grey card would invite exactly the misreading the requirement forbids.

States: loading (skeleton, no zeros — a flashed `0` reads as "nothing to do"), error (the strip reports unavailability and the table still renders), empty (reachable `0` → the strip explains the feed has no eligible projects rather than showing `0/0`).

### 6.2 The run surface

The run is initiated from the screen, shows the preview grouped by bucket, and requires an explicit apply. `ambiguous` and `divergent` are listed with both candidates so a human can act; `unresolved` shows the derived contract id.

Every project is labelled `short_name — full_name`, never a bare id — the picker already does this correctly and the table does not (R-5).

**Tokens:** existing utility classes only. No new colour, no new component primitive.

---

## 7. Integration impact

CLARISA read path and AGRESSO repository reads only. No new env var, no cron, no external contract. The matcher inherits `ClarisaProjectsService`'s 5-minute cache — **a run immediately after a feed change may read stale projects (K-016)**; the run report states the fetch timestamp so the reader can tell.

---

## 8. Security & authorization

`@Roles` on all three endpoints, matching the existing centre-admin gate on the screen. `apply` is the only mutating endpoint. No new secret, no PII. Read-only against both upstreams.

---

## 9. Observability

Each run writes one `LoggerUtil` summary: cohort size, the four bucket counts, feed timestamp, and whether it was preview or apply. That line is the audit trail for a bulk write and the answer to "why do I have 194 new rows".

---

## 10. Testing strategy

| Suite | Role |
| --- | --- |
| `external-code.util.spec.ts` | The strip, incl. no-prefix, multi-hyphen and **outside-the-closed-set pass-through** inputs |
| `automapper.service.spec.ts` | Resolution, the four buckets, idempotency, MANUAL immutability, supersession, the NFR-CAM-001 abort |
| `automapper.controller.spec.ts` | Roles, envelope, preview-writes-nothing |
| client specs | Coverage strip states and the mapped+pending=reachable invariant |

**Fixtures pin the measured cohort; live runs never assert a fixed count (D-7).**
Server gate `npx eslint` (K-001). Client targeted runs need `--coverage=false` (K-020).

---

## 11. Rollout

Migration first, then code — the enum value must exist before any row uses it. **Note K-015: the pipeline deploys code, not migrations.** Applying it is a separate, human-decided step; check `migration:show` before assuming the merge shipped it.

**Release gate:** production has **0 `external_code`** (measured). NFR-CAM-001 makes the matcher abort there rather than report "nothing to do", so shipping the code early is safe — it simply refuses to run until PRMS promotes. No feature flag needed; the guard *is* the flag.

Backout: revert the code; the migration's enum value is inert while unused.

---

## 12. Design decisions log

| # | Date | Decision | Rationale |
| --- | --- | --- | --- |
| **DD-1** | 2026-08-19 | **Iterate projects, not contracts** | The relationship is declared on the CLARISA side: `external_code` names the contract; AGRESSO knows nothing of CLARISA. Project-first reads a declaration and yields **198/198 = 100%**; contract-first guesses at 1345 non-pairings and yields 21.8% needing a denominator caveat. Same data, honest direction |
| **DD-2** | 2026-08-19 | **A new, non-AI `source` value** | The matcher performs no inference. Recording it as `AI_*` would make an admin distrust a deterministic derivation, and would make a future inferential matcher indistinguishable in the data. One migration, no backfill |
| **DD-3** | 2026-08-19 | **Preview and apply are separate calls** | 194 rows is a bulk write. The preview is also the artefact that answers "what changed and why" afterwards |
| **DD-4** | 2026-08-19 | **Ambiguity is handled even though today there is none** | Measured zero collisions — but the count is a property of *today's* feed, not of the design. A matcher with no ambiguity branch silently picks one when the feed changes (**D-7**) |
| **DD-5** | 2026-08-19 | **Supersede across phases; never re-point a row** | CLARISA ids are phase-scoped (2026 = 1368–2278; four existing rows sit at 22–246). The edit dialog already states the contract is immutable after creation — automation inherits that rule, and `Status: Active` carries the history |
| **DD-6** | 2026-08-19 | **The dashboard omits unpaired contracts entirely** | Showing 1377 as a fourth figure invites `4 / 1545`. They are not pending work. Omission is the design, not an oversight |
| **DD-7** | 2026-08-19 | **`confidence_score` stays `null`** | One deterministic tier gives it nothing to say, and a constant `1.0` is worse than empty (proposal R-4) |
| **DD-8** | 2026-08-19 | **The environment guard replaces a feature flag** | NFR-CAM-001 aborts on a feed with no `external_code`, which is exactly production today. The code can ship before PRMS promotes |
| **DD-9** | 2026-08-19 | **The strip is S1's shipped `normalizeExternalCode`, closed set `{B-, C-}` — no new function** | The design originally named a new `stripCentrePrefix` with an open `[A-Za-z]-` strip. S1 had already shipped a closed-set strip in the very file this spec named as *the* definition site, and chose the closed set deliberately (S1 DD-4: unknown prefixes must pass through rather than become silent false positives). Writing the open form meant a **second** strip (the NFR-CAM-003 violation this spec exists to avoid) or rewriting archived-spec behaviour listed as out of scope. The closed set is sufficient — §4.1 measures the eligible cohort at `{B: 53, C: 145}`, and both forms agree on every named input in T-01. `proposal.md` §K-005 had said this from the start; requirements and design drifted from it. **Leader amendment, user-approved 2026-08-19 before T-01 was dispatched; recorded in `execution.md`** |

---

## 13. Reversion challenge (Step 2.3)

**Does any decision remove shipped behaviour?** Reviewed each: DD-1 through DD-8 are all **additive** — a new service, a new endpoint set, a new enum value, a new dashboard strip. Nothing existing is removed, disabled or inverted. The picker, the table, the manual flow, `shouldHidePoolFundingTab` and the tagging path are untouched.

**One decision was checked anyway**, because it constrains future behaviour rather than removing current behaviour:

> **DD-2 reserves `AI_SUGGESTED`/`AI_AUTO` instead of using them.** Does that break anything? No consumer reads them — a repo-wide search finds the enum declared and never compared against. Nothing branches on `source` today beyond display. The reservation costs a migration and removes no capability.

Per the Lite skip rule this challenge was optional at Standard depth for a purely additive design; run and recorded because DD-2 is the decision a future engineer is most likely to reverse without knowing why it was made.

---

## 14. Budget (Step 2.4)

| Signal | Estimate |
| --- | --- |
| **Tasks** | **7** |
| **LOC** | **≈ 620** (server ≈ 260 · migration ≈ 20 · client ≈ 140 · tests ≈ 200) |
| **Review rounds** | **2** |

**Standard is correct.** The design spans a migration, three endpoints, a service with five classification branches, and a UI surface with defined states — comfortably past Lite and short of Full (no auth change, no destructive data path, no cross-service topology change).

**Above the ~400 LOC single-PR threshold → two PRs**, split at the API boundary (see `tasks.md` §4).

`/akili-execute` trips on this budget. A third PR, a fourth review round, or a diff materially past ~620 LOC means something leaked in — most likely the review surface growing into a full queue UI, or ambiguity handling expanding beyond DD-4's branch.

---

## 15. Open questions

- **OQ-5** — is `Confirmed` the right science-program status filter? Owner PRMS. **Does not affect the join.**
- All others closed in `requirements.md` §11.
