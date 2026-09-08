# Design — Bilateral / Primary vs Contributing Science Programs

- **Module:** bilateral
- **Spec id:** 2026-08-primary-contributing-sp
- **Status:** draft
- **Owner:** Juan Carlos Cadavid
- **Linked requirements:** [`./requirements.md`](./requirements.md)
- **Linked TRD:** [`docs/trd/trd.md`](../../../trd/trd.md) — architecture, data model, API contracts
- **Last updated:** 2026-08-13

---

## 1. Goals & non-goals

**Goals**

1. Persist a role per selected Science Program, with "exactly one Primary" enforced at both the service and the database (R-BIL-120, R-BIL-121, R-BIL-122).
2. Expose the role on the read-back without disturbing any existing field (R-BIL-123).
3. Restrict STAR's ToC write authority to the Primary SP while **retaining** every stored Contributing-SP row (R-BIL-124, R-BIL-125).
4. Migrate without touching a single existing row, so no PRMS-locked alignment is left unrepairable (R-BIL-126, NFR-BIL-120).
5. Render the two roles as a clear, non-colour-only distinction, with the ToC block bound to the Primary alone (R-BIL-127, R-BIL-128, R-BIL-129).

**Non-goals**

- Any PRMS outbound submission or inbound notification. `reviewDecision()` stays `NotImplementedException`.
- A7 — the PI-approval enablement gate (OQ-1). The `eligible` gate is untouched.
- Collapsing, reshaping, or pruning `result_pool_funding_toc_alignment`.
- Widening or narrowing `is_read_only`.
- Re-litigating C1's validator relaxation.
- Retiring `tools/prms-toc/` (still the gated T-10 follow-up under R-BIL-098).

---

## 2. Architecture

The change is confined to one existing vertical slice. No new module, no new endpoint, no new integration, no transport change.

```
PATCH /api/v1/results/:result-code/pool-funding-alignment
  │
  ├─ ValidationPipe (whitelist, forbidNonWhitelisted)   ← unchanged; gives R-5′ its loud failure
  ├─ RolesGuard + ResultOwnerGuard                      ← unchanged
  │
  └─ BilateralService.updateAlignment
       ├─ assertPrmsSourceWritable / eligible / synced gates   ← unchanged (R-9′)
       ├─ normalizeLeverCodes(dto)            → effective sp_codes[]     ← unchanged
       ├─ ▸ resolvePrimarySpCode(dto, effective)  → NEW  (R-BIL-121/122)
       ├─ validateTocAlignments(…, primarySpCode)  → +1 rejection rule   (R-BIL-124)
       ├─ cascade input: rows whose SP left sp_codes   ← unchanged (R-BIL-125)
       └─ transaction
            ├─ deactivate previous alignment + SP rows        ← unchanged
            ├─ insert SP rows  ▸ now carrying sp_role         (R-BIL-120)
            ├─ per-SP ToC upserts                              ← unchanged
            ├─ cascade deactivation                            ← unchanged
            └─ ResultReviewHistory  ▸ payload gains primary_sp_code
```

**Two-layer invariant.** The service guarantees **≥ 1** Primary; the database guarantees **≤ 1**. Neither alone is sufficient and they are not redundant: the service check produces the user-facing `400`, and the index protects against a write path that bypasses the service (a future PRMS ingest, an admin script, a migration). Together they yield "exactly one".

### 2.1 Composition

Server — modified:

- `entities/result-pool-funding-alignment-sp.entity.ts` — `sp_role` column. **No OpenSearch decoration** (F-1: this entity is not in the OpenSearch tree; a decorator here is inert)
- `dto/update-pool-funding-alignment.dto.ts` — `primary_sp_code` on the request; `role` on `SelectedScienceProgramResponse`
- `bilateral.service.ts` — role resolution, persistence, read-back, ToC restriction, **extracted version gate** (D-C2-13)
- `repositories/result-pool-funding-alignment.repository.ts` — select `sp_role` and surface it on a **new `sp_roles` field**, not on `selected_levers` (D-C2-14; the name `selected_sps` is already taken — see §4)
- `bilateral.controller.ts` — Swagger only

Server — **new files**:

- `db/migrations/<timestamp>-addSpRoleToAlignmentSp.ts`
- `repositories/result-pool-funding-alignment.repository.spec.ts` — this repository has **no spec today** (F-4). Required as NFR-BIL-122's only home.
- `test/` — the `TEST`-datasource integration spec covering the PATCH → read-back round-trip (D-6's substitute gate, §9). *(Added 2026-08-13, RA-09: F-7's own objection was that this artifact was "unnamed in §2.1"; the first correction fixed the gate but left the file unlisted.)*

Client, modified:

- `shared/interfaces/bilateral/pool-funding-alignment.interface.ts`
- `shared/services/bilateral.service.ts`
- `pages/.../pool-funding-alignment/pool-funding-alignment.component.{ts,html,scss}`
- `pages/.../components/sp-toc-alignment-block/` — **unchanged**; the block is already pure and role-agnostic. Gating happens in the parent template.

### 2.2 Reuse

- `AuditableEntity`, `LoggerUtil`, `ResponseUtils`, `RolesGuard`, `ResultOwnerGuard`, `ValidationPipe` — all as-is.
- The **STORED GENERATED column + UNIQUE index** partial-unique idiom, already proven twice in this module (`1779190000014`, `1779190000015`).
- The client's existing `staleSnapshots` read-only summary pattern is reused verbatim for R-BIL-129.

---

## 3. Data model

**Table:** `result_pool_funding_alignment_sp`

| Element | Definition | Why |
| --- | --- | --- |
| `sp_role` | `varchar(20) NULL` | Domain `PRIMARY` / `CONTRIBUTING`. Nullable so legacy rows need no backfill (R-BIL-126). `varchar` over MySQL `ENUM` — adding a third role later becomes a data change, not a DDL change. |
| `active_primary_alignment` | **`bigint`** STORED GENERATED — see the literal DDL below | Holds `alignment_id` when the row is an active Primary, else `NULL`. MySQL treats NULLs as distinct, so a UNIQUE index over it is a partial-unique over active Primary rows only. |
| `idx_rpfas_active_primary` | `UNIQUE INDEX (active_primary_alignment)` | Enforces ≤ 1 active Primary per alignment (R-BIL-121 AC.3). |

### 3.1 Literal DDL — normative

*(Added 2026-08-13, Judgment Day F-3, raised SEVERE by both judges. The original table gave a column **width** and never the **expression**. Because defect class D-2 has no automated gate by this spec's own admission, the migration text is the single artifact most in need of being exact — a width without an expression is not a specification.)*

```sql
-- One ALTER for both columns: ADD COLUMN ... STORED forces ALGORITHM=COPY,
-- so splitting them would cause two full table rebuilds instead of one (RA-10).
ALTER TABLE `result_pool_funding_alignment_sp`
  ADD COLUMN `sp_role` varchar(20) NULL,
  ADD COLUMN `active_primary_alignment` bigint
    GENERATED ALWAYS AS (
      IF(`is_active` = 1 AND `sp_role` = 'PRIMARY', `alignment_id`, NULL)
    ) STORED;

ALTER TABLE `result_pool_funding_alignment_sp`
  ADD UNIQUE INDEX `idx_rpfas_active_primary` (`active_primary_alignment`);
```

**Key on `alignment_id`, never on `id`.** MySQL forbids referencing an `AUTO_INCREMENT` column in a generated expression, and `id` is the PK (`1779190000007`). Keying on `alignment_id` is both correct for the invariant and the only legal option.

**⚠ The expression's *value* must be `alignment_id` alone. It must NOT incorporate `sp_role`.**

This is the trap, and it is not hypothetical — it is the reading an implementer following the wrong precedent would arrive at. `CONCAT(alignment_id, ':', sp_role)` would be non-NULL for **CONTRIBUTING** rows too, so the UNIQUE index would reject a second active Contributing SP on the same alignment — directly violating R-BIL-121's own clause: *"AND IT MUST still permit any number of active `CONTRIBUTING` rows for that alignment."* The role belongs in the `IF` **condition**, never in the value.

**Why `bigint`, not `varchar`.** The correct precedent is migration `1779190000014`, which types an id-valued generated column as plain `bigint` for exactly this single-key shape. Migration `1779190000015` uses `varchar(71)` **only because it concatenates a composite key** (`result_id:sp_code` = 20 + 1 + 50). An earlier draft of this design copied the composite-key *type* for a single-key invariant, which is how the missing-expression ambiguity arose. `alignment_id` is `bigint NOT NULL` (`1779190000007-createResultPoolFundingAlignmentSp.ts:18`); copying it needs no cast and no width.

**Collation note.** The table is `utf8mb4_unicode_520_ci`, so `sp_role = 'PRIMARY'` is **case-insensitive**. `'primary'` would satisfy the condition. Role values are written only by `resolvePrimarySpCode` from a fixed literal, so this is benign today — but any future writer must not rely on case to distinguish roles.

The generated column is **not mapped on the entity** — TypeORM would attempt to write it. Same handling as `active_result_sp` on the ToC table.

**Backfill: none.** See R-BIL-126 and D-C2-3. Per `requirements.md` §1.1, production holds no mapped SP rows, so the migration's live blast radius today is DEV's seeded test data — but the DDL must still be correct for the production data that will follow, so nothing in the migration's verification is relaxed on that basis.

**Untouched:** `result_pool_funding_toc_alignment` — no column, no index, no row. This matters beyond tidiness; see §11.

---

## 4. API design

### PATCH /api/v1/results/:result-code/pool-funding-alignment

Existing handler. Additive request field, additive response field, three new error codes.

**Request** — `primary_sp_code?: string`, `@IsOptional() @IsString() @MaxLength(50)`.

Optional at the class-validator layer **by design**: the conditional requirement ("required only when `has_contribution === true`") belongs to the same structural-validation layer that already owns the per-alignment `400` contract, not to class-validator. This mirrors exactly how C1 placed the ToC field-presence rules (`design §6.1`, D-C1-3) and keeps one error vocabulary rather than two.

**Response** — `SelectedScienceProgramResponse.role: 'PRIMARY' | 'CONTRIBUTING' | null`.

**Carrier plumbing** *(specified 2026-08-13, Judgment Day F-8 — previously left as "select and surface `sp_role`", which does not connect the two ends)*:

`findActiveAlignmentByResultId` returns `PoolFundingAlignmentDetail`, whose `selected_levers` array `getAlignment` spreads **verbatim** into the response (`bilateral.service.ts:573`). Adding `sp_role` there would leak a new field onto the **deprecated back-compat array**, touching R-BIL-123 AC.3. Meanwhile `toSelectedSciencePrograms(codes: string[])` (`:621-639`) receives *only codes* (`:564-566`) and so cannot see a role at all.

Therefore:

| Change | Detail |
| --- | --- |
| `PoolFundingAlignmentDetail` | gains **`sp_roles: { sp_code: string; sp_role: SpRole \| null }[]`**, built from the same SQL rows **filtered on a non-null `sp_code`**, matching the guard `selected_levers` already applies. `selected_levers` is left **byte-identical** |
| `toSelectedSciencePrograms` | signature widens from `(codes: string[])` to `(sps: { sp_code, sp_role }[])`; enrichment from the CLARISA catalog is unchanged |
| `getAlignment` | passes **`visibleAlignment?.sp_roles ?? []`** — **not** `alignment.sp_roles` — instead of `selectedLevers.map(l => l.lever_code)` |

> **⚠ The field is `sp_roles`, NOT `selected_sps`.** *(Corrected 2026-08-13, round-two re-judgment RB-01.)* `selected_sps` is **already taken**: it is a live TypeORM `@OneToMany` relation on `ResultPoolFundingAlignment` (`result-pool-funding-alignment.entity.ts:49`), with its inverse at `result-pool-funding-alignment-sp.entity.ts:41-44`. Reusing the name in the same domain would invite an implementer to write `.find({ relations: ['selected_sps'] })` and receive full audited entity rows instead of this clean projection. Same failure shape as F-1: assuming an identifier means what you expect without checking what it already means.

**Two guards the carrier must inherit** *(added 2026-08-13, RA-04 + RA-08 — the first draft's one-line instruction silently dropped both)*:

1. **The eligibility gate.** `getAlignment` computes `visibleAlignment = eligible ? alignment : null` (`bilateral.service.ts:561`) and derives `selectedLevers` from **`visibleAlignment`** (`:563`) — which is why a non-eligible result returns `selected_science_programs: []` today. Reading the carrier off the raw `alignment` would populate roles for non-eligible results: a **new data-visibility leak**, against a gate `has_contribution`, `selected_levers` and `toc_alignments` all still honour (`:571-585`). The consumer census below does **not** catch this — it establishes type-safety for adding a sibling field, which is a different question from which variable the new read hangs off.
2. **The LEFT JOIN null guard.** The rows come from a `LEFT JOIN` (`result-pool-funding-alignment.repository.ts:43-45`), so an alignment with no active SP rows yields one row with a NULL `sp_code`. That is exactly why `selected_levers` filters `Boolean(row.lever_code)` before mapping (`:66-71`). Without the same filter, `sp_roles` gains a `{ sp_code: null }` entry and `selected_science_programs` grows a phantom member where it is `[]` today.

**Verified safe for every existing consumer** (2026-08-13). `PoolFundingAlignmentDetail` is consumed at four sites — `getAlignment` (`:543`), `updateAlignment` (`:649`), `getActiveAlignmentForLever` (`:1406`) and `toHistoryPayload` (`:1340`) — and all seven `.selected_levers` reads (`:563`, `:573`, `:1087`, `:1102`, `:1216`, `:1348`, `:1413`) take **only `lever_code`**. Adding a sibling field therefore breaks none of them, which is precisely why the role must ride a new field rather than being folded into the existing array.

Keeping the role off `selected_levers` is what makes R-BIL-123 AC.3 ("every other field unchanged in name, type, and nullability") true rather than merely asserted.

**Error vocabulary.** The envelope already carries two request-level keys (`unknown_sp_codes`) and one per-alignment array (`toc_alignments`). This adds a third request-level key rather than overloading either:

| Key | Shape | Codes |
| --- | --- | --- |
| `errors.primary_sp` | `{ code, description }` | `primary_sp_required`, `primary_sp_not_selected` |
| `errors.toc_alignments[]` | `{ sp_code, field, error }` — existing shape | `toc_alignment_not_primary_sp` (added to the existing union) |

**Validation ordering** — deliberate, because ordering is observable. *(Corrected 2026-08-13, Judgment Day F-2 — see D-C2-13. The previous ordering silently displaced a shipped `409` contract.)*

1. `normalizeLeverCodes` → `unknown_sp_codes` (unchanged; fires first)
2. **ToC version gate → `409 toc_mapping_version_locked`** — *extracted* from inside `validateTocAlignments` so it keeps firing first (R-BIL-130). Trigger condition unchanged: evaluated **only when `dto.toc_alignments` is present**, so legacy bodies still bypass it (R-BIL-097 AC.3)
3. `resolvePrimarySpCode` → `primary_sp_required`, then `unknown_sp_codes` (unknown Primary), then `primary_sp_not_selected` — mirroring §5.1 steps 2→3→4 exactly *(order aligned 2026-08-13, RA-07: this list and §5.1 previously disagreed, in a section that opens by calling ordering "deliberate, because ordering is observable". §5.1 is normative; this list restates it)*
4. `validateTocAlignments` (remainder) → `duplicate_sp_code`, `sp_not_selected`, **`toc_alignment_not_primary_sp`**, then the C1 chain (floor → `level_not_allowed` → `contribution_without_indicator` → catalog checks)

**Why the version gate must be extracted.** It is currently the *first statement inside* `validateTocAlignments` (`bilateral.service.ts:867-876`), which is called at step 4. Leaving it there while inserting Primary validation at step 3 would move a new `400 primary_sp_required` **in front of** the `409` — changing the observable outcome of C1's shipped, tested R-BIL-097 AC.2 contract. Extracting the gate to step 2 preserves the shipped ordering **and** makes the resolved Primary available to step 4, which needs it for the A4 restriction. Both requirements are satisfied without a compromise.

Step 3 precedes step 4 because the ToC restriction is *defined in terms of* the Primary — validating ToC against an unresolved Primary would produce a misleading error. All of steps 2–4 run **before the transaction opens**, preserving C1's atomicity guarantee (D-V2-8): nothing is persisted on any `400`/`409`/`503` path.

`toc_alignment_not_primary_sp` is collected, not thrown eagerly, so the `400` still carries every per-alignment error at once.

**Versioning: stays `/v1`.** See D-C2-2.

---

## 5. Backend workflows & business rules

### 5.1 Role resolution (`resolvePrimarySpCode`)

*(Step 3 added 2026-08-13, Judgment Day F-6.)*

1. `has_contribution === false` → return `null`; no SP rows are written and `primary_sp_code` is ignored. Preserves R-BIL-014.
2. Trim `primary_sp_code`. Empty or absent → `400 primary_sp_required`.
3. **Not a valid SP for this result at all** — absent from the per-result catalog `getScienceProgramsForResult` returns → the existing **`400 errors.unknown_sp_codes`** contract, carrying the offending code.
4. Valid for the result but not in the effective `sp_codes` → `400 primary_sp_not_selected`.
5. Return the resolved code. Each persisted SP row derives `sp_role = (sp_code === primary) ? 'PRIMARY' : 'CONTRIBUTING'`.

**Step 3 is not redundant with `normalizeLeverCodes`.** That method validates only codes drawn from `dto.sp_codes` / `dto.lever_codes` (`bilateral.service.ts:1296-1337`) — it **never inspects `primary_sp_code`**. Without step 3, `sp_codes: ["SP06"], primary_sp_code: "SP99"` returns `primary_sp_not_selected` and R-BIL-122 AC.2 becomes undischargeable, since the "invalid for the result" and "valid but unselected" cases would be indistinguishable.

**How step 3 gets the catalog — normative** *(specified 2026-08-13, RA-02)*:

An earlier draft claimed step 3 *"reuses"* the catalog `normalizeLeverCodes` computes. **It cannot:** that method is `Promise<string[]>` and returns `codes` only (`:1296-1300`, `:1336`); the catalog lives in a local `perResult` (`:1320-1323`) and is discarded. Two readings were reachable, one of them expensive — calling `getScienceProgramsForResult` again fans out to `findPoolFundingAlignmentContext` + `findActiveByAgreementId` + CLARISA (`:148-177`) on **every** PATCH.

Normative resolution: **`normalizeLeverCodes` returns `{ codes: string[]; validCodes: Set<string> }`**, and `resolvePrimarySpCode` takes `validCodes` as a parameter. It already builds that `Set` internally (`:1321`) — this only stops throwing it away. No second upstream call.

This is a **signature change**, listed in §2.1, and it forces edits to `bilateral.service.normalizeLeverCodes.spec.ts` — the same file RA-01 found missing from the re-base census.

Role is **derived at write time, stored explicitly**. Derived, so the wire cannot express a contradiction; stored, so the PRMS payload and OpenSearch document read correctly without re-deriving.

### 5.2 ToC restriction (R-BIL-124)

One rule added to `validateTocAlignments`, positioned after the existing `sp_not_selected` check and before the `aligns_with_toc` short-circuit: a selected SP that is not the Primary yields `toc_alignment_not_primary_sp` and skips the rest of that entry's checks.

Placement before the `aligns_with_toc` short-circuit is intentional — an explicit `aligns_with_toc: false` for a Contributing SP is also a write, and it too must be rejected rather than silently nulling a retained row.

### 5.3 What deliberately does not change

- **The cascade.** Rows are deactivated only when their SP leaves `sp_codes`. Role changes trigger nothing (R-BIL-125).
- **`is_read_only`** and `assertPrmsSourceWritable` (R-9′).
- **The read-back's ToC filter** — `toc_alignments[]` still returns all active rows regardless of role, which is what makes R-BIL-129 renderable.
- **The socket payload** — `result.pool-funding-alignment.changed` carries `result_code`, `by_user_id`, `at`. None are role-dependent. No new event, no shape change.

### 5.4 Audit

`ResultReviewHistory.payload_after` gains `primary_sp_code`.

`payload_before` is built by `toHistoryPayload` (`bilateral.service.ts:1339-1351`), which today reads **only** `selected_levers[].lever_code` and therefore cannot see a role at all. *(Gap identified 2026-08-13, Judgment Day F-8 — the earlier text addressed only the legacy case and left the non-legacy case unstated.)* It is widened to read the new `sp_roles` carrier (§4), giving:

| Previous alignment | `payload_before.primary_sp_code` |
| --- | --- |
| Had a Primary | that `sp_code` — a real before/after diff |
| Legacy, no role (`sp_role = NULL` on every row) | `null` — honestly records "there wasn't one" |
| No previous alignment | `payload_before` stays `null` entirely, as today |

Without this, every history entry would report `primary_sp_code: null` as its *before* value, making a Primary **change** indistinguishable from a Primary being **set for the first time** — precisely the distinction the audit trail exists to capture.

---

## 6. Frontend architecture

### 6.1 State

`AlignmentFormData` gains `primary_sp_code: string | null`. One field, not a per-SP flag — the same reason as the wire shape: two SPs cannot both be Primary if there is only one slot.

Derived signals:

| Signal | Purpose |
| --- | --- |
| `primarySpCode` | current Primary, or `null` |
| `isPrimary(code)` | selector row rendering |
| `contributingSps` | selected minus Primary |
| `orphanedTocAlignments` | saved active ToC rows whose `sp_code` ≠ Primary → R-BIL-129 |

`canSave()` gains one clause: with `has_contribution === true`, a Primary must be chosen. The existing ToC-completeness loop narrows from "every selected SP" to "the Primary's draft only" (R-BIL-128 AC.2).

### 6.2 Component boundary

`sp-toc-alignment-block` is **not modified**. It is already a pure presentational block driven by inputs. Role gating is a `@if` in the parent template that binds it to the Primary alone. Keeping the block untouched preserves its 1,255-line spec intact and confines client churn to the page component.

### 6.3 Selector treatment

The existing `app-multiselect` continues to own *which* SPs are selected. Primary designation is a **separate, single-choice control over the already-selected set** — not a second multiselect, and not a mode toggle on the existing one.

Rationale: overloading the multiselect with a two-state chip would make "select" and "promote" the same gesture, and deselecting the Primary would silently mean two different things. A separate control keeps one gesture per concept and keeps the existing picker's tested behavior (chips, rejected-code highlighting, destructive-deselect confirm) unchanged.

Both roles keep the shipped `SP06 — 10% - Climate Action` format (R-BIL-115, already passing).

**Accessibility (PRD C-4).** The distinction must carry a text label or icon in addition to any colour (R-BIL-127 AC.6). Colour-only role encoding fails WCAG 2.1 AA 1.4.1 and is the most likely way this ships wrong. Tokens only — no hex literals (client guide §Conventions).

### 6.4 Orphaned-alignment summary (R-BIL-129)

Reuses the existing stale-snapshot markup pattern. A row that is both orphaned and stale renders **once** — the two collections are unioned by `sp_code`, not concatenated (AC.5).

---

## 7. Security & authorization

No change. Same roles, same guards, same machine-token posture. `sp_role` is not PII and carries no donor-restricted content. The DB index is a correctness control, not a security control.

---

## 8. Observability

- No new log lines. Validation failures already flow through `GlobalExceptions` and are logged by `ResponseInterceptor` at the status-derived level.
- No new `sync_process_log` row types.
- **No OpenSearch change.** *(Corrected 2026-08-13, Judgment Day F-1.)* The earlier claim that "`sp_role` joins the OpenSearch document" was false, and rested on a false premise: `sp_code` is **not** indexed either. The `@OpenSearchProperty` on it is inert — the mapping generator reads only the registered `_openSearchEntity` (`ResultOpensearchDto`) and recurses via `nestedType`, and `ResultPoolFundingAlignmentSp` is not in that tree; nor is it in the hand-written `findDataForOpenSearch` projection. **Recorded platform gap:** bilateral SP alignment is invisible to search, `sp_code` included, and the inert decorator disguises that. Fixing it means touching `ResultOpensearchDto` *and* the SQL projection — cross-module work outside C2. See `requirements.md` §4.

---

## 9. Testing strategy

| Tier | Files | Focus |
| --- | --- | --- |
| Server unit | `bilateral.service.spec.ts`, `bilateral.service.updateAlignment.tocAlignments.spec.ts`, `bilateral.service.sourceReadOnlyGate.spec.ts`, `bilateral.controller.spec.ts` | Each `400`/`409` code, role derivation, persisted `sp_role`, read-back shape, cascade non-regression, **version-gate ordering (R-BIL-130)** |
| Server repository | `result-pool-funding-toc-alignment.repository.spec.ts` | **Per-SP isolation** — relocated evidence, see §11 |
| Server repository | **`result-pool-funding-alignment.repository.spec.ts` — NEW FILE** | `sp_role` surfaced on `sp_roles` without a second round-trip; `selected_levers` unchanged. **Sole home of NFR-BIL-122** (F-4) |
| Server integration | `TEST` datasource | PATCH → read-back round-trip carrying role, against a real schema (D-6). **Not an e2e** — see the note below |
| Client unit | `pool-funding-alignment.component.spec.ts` | Primary selection, demotion, save gate, block gating, orphan rendering |
| Migration | **manual** | `migration:dev:execute` → `migration:revert` with row checksums (NFR-BIL-120) |

**Why integration and not e2e** *(corrected 2026-08-13, Judgment Day F-7; user decision)*. The original plan named a server **e2e**. `server/researchindicators/test/` contains only `jest-e2e.json` and a 746-byte `app.e2e-spec.ts` asserting `GET /` — there is no auth/JWT stubbing, no result fixture, no datasource seeding, and booting `AppModule` pulls in MySQL, DynamoDB and RabbitMQ. Building that harness is **harness construction, not test authoring**, and it was neither named in §2.1 nor sized in §12.

**Stated limitation, recorded rather than glossed:** an integration test exercises service + repository against a real schema but **does not execute the client**. D-6 (cross-tier role drift) is therefore only *partially* gated — both sides of the contract are asserted independently, never in one run. This limit is recorded in the manner of C1's R-BIL-118 lapse condition; it must not be described downstream as full cross-tier coverage.

**Gate commands.** `npx eslint <path>` (never `npm run lint` — K-001). Client: `npm test` **and** `npm run build` **and** `npx tsc -p tsconfig.spec.json --noEmit` (K-002). Coverage: server ≥ 60% all metrics; client floors 40/20/45/30.

---

## 10. Rollout

| Step | Detail |
| --- | --- |
| 1. Migration | Additive and nullable — safe to deploy ahead of code. Reverts cleanly. |
| 2. **Server + client release together** | See the deployment-order note below. |
| ~~3. OpenSearch~~ | **REMOVED 2026-08-13 (Judgment Day F-1).** There is no mapping to regenerate and no reindex to run — this entity is not in the OpenSearch tree. The step would have been a no-op believed to be a feature. |
| **3.** Backout | Revert code; the migration may stay (nullable column, unread by the prior code). Full revert available via `migration:revert`. |
| **4.** Comms | MEL + bilateral ops: legacy alignments show no Primary until re-saved. |

*(Steps renumbered 2026-08-13, RA-09 — removing the OpenSearch step left two rows numbered "3".)*

**Deployment order — the mechanism, then its real severity.** These are two independently deployable packages. Once the server requires `primary_sp_code`, a deployed client that does not send it fails **every save** of this section.

*Severity, corrected against `requirements.md` §1.1:* production holds no mapped SP data, so **no production user can currently reach a state where this breaks** — there is nothing to select, so nothing to save. Calling this an outage would overstate it. The window is a **DEV-environment breakage** and a latent production hazard that activates the moment SP mapping data is loaded.

That reframing changes the urgency, not the instruction: **PR 2 and PR 3 ship in the same release.** The cost of coordinating them is near zero; the cost of discovering the coupling later — after production mapping data lands, when the same server-ahead window becomes a genuine outage — is not. If the pipeline cannot guarantee co-release, gate enforcement behind a config flag before PR 2 merges. Flagged rather than pre-built, because the flag is warranted only if the constraint cannot be met.

This remains a different concern from R-5′, and conflating them would be a mistake. R-5′ is about a *stale browser bundle* held by an individual user — that must fail loudly with a named code, and it does, permanently. Deployment order is about the *release*, and it is a transient window.

---

## 11. Reversion challenge (Step 2.3)

**Trigger.** R-BIL-124 and R-BIL-128 *remove* a shipped capability: today any selected SP may carry a ToC alignment (`sp_not_selected` is the only gate) and the client renders a block per selected SP. This is a reversion, so it gets a challenge: **what does removing this break?**

**Finding — it breaks the existing evidence, and one archived discharge needed re-checking.**

1. **Every `has_contribution: true` request without `primary_sp_code` changes outcome — across FIVE spec files, 28 blocks.**

   > **⚠ This finding was originally under-scoped, and the correction matters more than the original.** The first draft read: *"`bilateral.service.updateAlignment.tocAlignments.spec.ts` (1,418 lines, 63 SP-code literals) exercises **multi-SP** `toc_alignments` payloads that will now return `400`."* Two defects in one sentence (Judgment Day F-2, F-5):
   >
   > - **The scope was wrong.** Only 5 sites in that file are multi-entry, but **all 8** `has_contribution: true` blocks lose their current outcome — and the breakage reaches `bilateral.service.spec.ts`, `bilateral.service.sourceReadOnlyGate.spec.ts` and `bilateral.controller.spec.ts`, which also call `updateAlignment` with no `primary_sp_code`. The trigger is *the absence of a Primary*, not *multiple SPs*.
   > - **"63 SP-code literals" was mislabelled.** 63 is the count of the narrower pattern `sp_code: 'SP0[0-9]'`. The file holds **124** quoted `'SPnn'` literals across **136** lines containing an `SP\d\d`. Right number, wrong label — sitting beside a line count that *is* correct, so it read as verified precision while understating the surface.
   >
   > A reversion challenge that under-scopes the very breakage it exists to find is worth recording as a miss, not quietly amending. It also missed F-2 entirely — see item 4.

   **Corrected scope — third attempt, and the count was wrong twice.** *(RA-01, round two.)* The first correction said "four spec files / 25 blocks" and added per-file counts, which made the census **look audited while still omitting a file**. The real surface is **five spec files / 28 `has_contribution: true` blocks**:

   | Spec file | Blocks |
   | --- | --- |
   | `bilateral.service.spec.ts` | 13 |
   | `bilateral.service.updateAlignment.tocAlignments.spec.ts` | 8 |
   | `bilateral.service.sourceReadOnlyGate.spec.ts` | 3 |
   | **`bilateral.service.normalizeLeverCodes.spec.ts`** ← **missed twice** | **3** |
   | `bilateral.controller.spec.ts` | 1 |
   | **Total** | **28** |

   The missed file's `:155` — *"R-BIL-070 scenario 1 — code is in the per-result list → updateAlignment proceeds"* — PATCHes `has_contribution: true, sp_codes: ['SP09']` with **no `primary_sp_code`** and asserts `resolves.toBeDefined()`. Under §5.1 step 2 it receives `400 primary_sp_required`. Its scenarios 2 and 4 survive (`normalizeLeverCodes` still runs first) and scenario 3 is `has_contribution: false`.

   That this file is also the one RA-02's fix modifies makes the omission worse, not better. **Lesson:** adding per-file counts to a census does not make it complete — it makes an incomplete census look verified. The trigger is *the absence of a Primary on any `has_contribution: true` path*, so the census must be derived from that predicate across the whole suite, not from the files a reviewer happened to name.

   Reproducible metric for the largest file: 1,418 lines, 124 quoted `'SPnn'` literals, 136 lines matching `SP\d\d`, 8 `has_contribution: true` blocks. Re-basing carelessly would **delete the proof of per-SP isolation** rather than relocate it — see item 2.

2. **The isolation guarantee must be relocated, not dropped.** R-BIL-118 AC.1/AC.3 (one SP's ToC must not overwrite another's) can no longer be demonstrated through the service PATCH path, because that path will refuse to write two SPs. It moves to `result-pool-funding-toc-alignment.repository.spec.ts`, where `upsertForSp` isolation is already the subject and multi-SP state can be seeded directly. **Mandated as a task; not optional.** Under no circumstance may a re-based test be presented as evidence for an isolation property it no longer exercises.

3. **C1's structural discharge is checked and holds.** R-BIL-118 AC.2's DB-enforced half was discharged structurally with an explicit lapse condition: *"If any migration alters the `result_pool_funding_toc_alignment` table — its `active_result_sp` generated column or the `idx_rpfta_active_result_sp` index in particular — the discharge lapses."* This spec's migration alters **`result_pool_funding_alignment_sp`**, a different table. **The lapse condition is not tripped and the discharge survives.** Recorded explicitly because the two tables' names differ by one segment and the DDL idiom is identical — an assessor skimming for "a migration adding a generated column and a unique index" would plausibly conclude it lapsed.

4. **A shipped `409` contract is displaced — the challenge missed this entirely.** *(Added 2026-08-13, Judgment Day F-2.)* The ToC version gate is the first statement inside `validateTocAlignments`, so inserting Primary validation ahead of that call moves a `400` in front of a shipped `409`. The test at `bilateral.service.updateAlignment.tocAlignments.spec.ts:216` sends a **single**-SP payload with no `primary_sp_code` and asserts `toc_mapping_version_locked` (C1's R-BIL-097 AC.2) — it would receive a `400` instead. Resolved by extracting the version gate (D-C2-13) and pinned by R-BIL-130, whose AC.2 requires that test to pass **unmodified**.

   This is the more instructive miss of the two. The challenge asked "what does removing this break?" and looked only at the *removed capability's* own tests. The actual damage came from the **new check's position in the pipeline** — a class of breakage the question as posed could not surface. A reversion challenge should ask both "what did I remove?" and "what did I insert, and in front of what?"

**Design consequences:** §9 gains two repository rows and the integration row; §4 gains the extracted version gate; `tasks.md` carries the four-file re-base as a distinct task with the isolation relocation as its done criterion, and R-BIL-130 as a pinned non-regression.

---

## 12. Budget (Step 2.4)

Estimated from the design above, calibrated against C1's actuals rather than optimism — C1 estimated ~530 insertions and delivered **1,719 (3.2×)** with ≥14 review rounds against a budget of 10, and its `design.md` §9 required an escalation that was never raised.

**Revised 2026-08-13 after Judgment Day (F-10).** The round-one corrections enlarged the mandated surface; the original figures are kept visible because a budget that quietly grows to fit the work is not a tripwire.

| Signal | Original | **Revised** | Tripwire |
| --- | --- | --- | --- |
| Tasks | 14 | **16** | > 19 |
| Insertions (LOC) | ~1,800 | **~2,575** | > 3,120 |
| Review rounds | 14 | **16** | > 20 |

> **Revised twice on 2026-08-13.**
>
> **RB-02 (arithmetic).** The first revision read **~2,300**, which did not reconcile with its own delta table — the deltas summed to **+715**, giving 2,515. The **total** was corrected rather than a delta retro-fitted to reach the preferred figure; reshaping an itemised estimate to hit a round number is the exact behaviour a tripwire exists to prevent. *Noted without excuse: this error appeared in the section added specifically to fix an earlier "the budget does not reconcile" finding (F-10). The per-delta table is what made it findable — an argument for itemising estimates, not against.*
>
> **RA-01 / RA-02 (scope).** The re-base surface then grew from four spec files / 25 blocks to **five / 28**, and RA-02 forced a `normalizeLeverCodes` signature change. Deltas re-derived below sum to **+775**, giving **1,800 + 775 = 2,575**. Tripwire held at the original **+21%** margin (3,120/2,575 = +21.2%; the original was 2,200/1,800 = +22%), so it is re-derived rather than guessed.

**What changed and why:**

| Delta | LOC | Source |
| --- | --- | --- |
| Re-base **five** spec files, not one — **28** `has_contribution: true` blocks total (13 / 8 / 3 / 3 / 1; per-file census in §11 item 1) | **+290** | F-2, RA-01 |
| New `result-pool-funding-alignment.repository.spec.ts` | +120 | F-4 |
| `TEST`-datasource integration test | +180 | F-7 |
| Read-back carrier plumbing (`sp_roles`, widened signature, `toHistoryPayload`) | +80 | F-8 |
| Full-catalog Primary check, its two distinct tests, **and the `normalizeLeverCodes` signature change** (`Promise<string[]>` → `Promise<{ codes, validCodes }>`) | **+60** | F-6, RA-02 |
| Extracted version gate + R-BIL-130 pinned test | +50 | F-2 |
| OpenSearch decoration removed | −5 | F-1 |

**Where the test/spec share goes** — F-10 correctly objected that "45% of 1,800" was not reconcilable with the mandated work. Stated explicitly, ~**1,290 lines** (50% of 2,575) covers: the five-file server re-base (28 `has_contribution: true` blocks), the isolation relocation into the 451-line ToC repository spec, the new alignment-repository spec, the integration spec, and new server unit specs for the seven new error paths. It **does not** cover a rewrite of the 2,983-line client spec corpus — only targeted additions and the edits forced by the selector and block-gating changes. If the client spec work turns out to need more than ~400 lines, the tripwire should fire rather than the estimate stretch.

**Execute-time pressure point, flagged not hidden** (RA-10 note): 1,290 server-test lines + the ~400-line client-spec ceiling = 1,690 of 2,575 (66%), leaving ~885 lines for a migration, entity, DTO, service, repository, client interface, client service and three component files across both tiers. Tight but not incoherent. If production code alone exceeds ~885, that is the signal to escalate — not to quietly reallocate from the test share.

C1's calibration point stands: 1,719 insertions delivered against ~530 estimated, with a materially smaller reversion surface than this.

**This is a tripwire, not a quality cap.** `/akili-execute` compares actuals against it and, on breach, **stops and escalates to the user** rather than continuing. Exceeding the budget is information; continuing past it silently is the specific failure C1 recorded.

**Depth re-check:** the estimate confirms **Full**. Sixteen tasks with a migration, a contract change, and a two-tier redesign is not a Standard-depth shape. *(Figure corrected 2026-08-13, RA-06 — the prose still quoted "Fourteen" after two revisions of the table above it.)*

---

## 13. Design decisions

| # | Date | Decision | Rationale |
| --- | --- | --- | --- |
| **D-C2-1** | 2026-08-13 | Wire shape is `sp_codes[]` + `primary_sp_code`, **not** `[{ sp_code, role }]` | Makes "one SP in both roles" unrepresentable at the wire, so mutual exclusion needs no runtime check and cannot be forgotten (R-BIL-122 AC.3). A `[{sp_code, role}]` array permits duplicate entries with conflicting roles and would require a check the first shape makes unnecessary. Also leaves `normalizeLeverCodes`, the cascade, and the legacy `lever_codes` path untouched. Closes OQ-C2-1. |
| **D-C2-2** | 2026-08-13 | Keep `/v1`; do not add `/v2` | Both deployment orders fail loudly with a named code (`primary_sp_required` one way; `forbidNonWhitelisted` the other). With no silent-corruption path, a `/v2` would add a parallel surface that prevents nothing. Argued, not assumed — see requirements §6. |
| **D-C2-3** | 2026-08-13 | No backfill; `sp_role` nullable; invariant enforced on **write only** | Two independent reasons. *Technical:* auto-promoting by allocation is not implementable in a SQL migration — allocations live in CLARISA and are fetched per-result at request time, never persisted. *Empirical (`requirements.md` §1.1):* production holds no mapped SP rows, so there is nothing to promote. Write-only enforcement is also what keeps `is_read_only` legacy rows from becoming permanently unsaveable (R-9′) — which is the reason this decision would still hold even if production were full. Closes OQ-2. |
| **D-C2-4** | 2026-08-13 | Store the role explicitly even though it is derivable | The stored role is what the deferred PRMS payload and the OpenSearch document read. Re-deriving at every boundary is where a translation bug would live. Also follows the proposal's Option B. |
| **D-C2-5** | 2026-08-13 | Enforce at **both** service (≥1) and database (≤1) | Not redundant: they enforce different halves. The index protects against a non-service writer (future PRMS ingest, admin script, migration) that the service check cannot see. |
| **D-C2-6** | 2026-08-13 | `varchar(20)` rather than MySQL `ENUM` | A third role later becomes a data change, not a DDL change on a table that is now under a unique index. |
| **D-C2-7** | 2026-08-13 | Primary designation is a **separate single-choice control**, not a mode on the existing multiselect | Keeps one gesture per concept; avoids deselect meaning two different things; preserves the picker's tested chip/rejection/confirm behavior. |
| ~~**D-C2-8**~~ | 2026-08-13 | ~~Index `sp_role` in OpenSearch~~ — **WITHDRAWN same day (Judgment Day F-1)** | The rationale was *"`sp_code` is already indexed"* — **false**. `ResultPoolFundingAlignmentSp` is not reachable by the mapping generator (`base-open-search-api.ts:318` reads only the registered `ResultOpensearchDto` and recurses via `nestedType`) and is absent from the indexed document's SQL projection. The decorator on `sp_code` is inert metadata. Decorating `sp_role` would change nothing. **Root cause:** the proposal said `sp_code` was *decorated* (true); this design silently upgraded that to *indexed* (false) without checking whether the decorator is reached. **Decorated ≠ indexed.** R-7 restated in `requirements.md` §9; the real gap recorded in §4. |
| **D-C2-9** | 2026-08-13 | `sp-toc-alignment-block` is not modified; gating lives in the parent template | Preserves a 1,255-line spec and keeps the block pure. |
| **D-C2-10** | 2026-08-13 | Retain non-Primary ToC rows **and surface them read-only** (R-BIL-129) | Retention alone (parent §11 condition 2) would make live persisted data invisible after a demotion. Reuses the existing stale-snapshot pattern, so the cost is small. |
| **D-C2-11** | 2026-08-13 | Per-SP isolation evidence relocates to the repository spec | Forced by the §11 reversion challenge. The service path can no longer exercise it; the guarantee must not be dropped with the test. |
| **D-C2-12** | 2026-08-13 | `primary_sp_code` optional at class-validator, conditionally required in structural validation | Keeps one error vocabulary. Mirrors C1's D-C1-3 placement of ToC field-presence rules. |
| **D-C2-13** | 2026-08-13 | **Extract the ToC version gate** out of `validateTocAlignments` so it runs before Primary validation | Judgment Day F-2. Left in place, the new `400 primary_sp_required` would fire in front of C1's shipped `409 toc_mapping_version_locked` and silently displace a tested contract (R-BIL-097 AC.2). Extraction preserves the shipped ordering *and* makes the resolved Primary available to the A4 restriction — no trade-off. The gate's trigger condition is unchanged (only when `toc_alignments` is present), so R-BIL-097 AC.3's legacy bypass survives. Pinned by R-BIL-130. |
| **D-C2-14** | 2026-08-13 | Carry the role on a **new `sp_roles`** field, never on `selected_levers` — and **not** on a field named `selected_sps` | Judgment Day F-8, name corrected by round-two RB-01. `getAlignment` spreads `selected_levers` verbatim into the response, so adding `sp_role` there would leak a field onto the deprecated back-compat array and falsify R-BIL-123 AC.3. A separate carrier also gives `toSelectedSciencePrograms` and `toHistoryPayload` the role they cannot otherwise see. The first draft named it `selected_sps`, which is already a live `@OneToMany` relation on `ResultPoolFundingAlignment` (`:49`) — verified safe for all four `PoolFundingAlignmentDetail` consumers and all seven `.selected_levers` reads, which take only `lever_code`. |
| **D-C2-15** | 2026-08-13 | Validate `primary_sp_code` against the **full per-result catalog** before the selected-subset check | Judgment Day F-6. `normalizeLeverCodes` never inspects `primary_sp_code`, so without this an invalid Primary would return `primary_sp_not_selected` and R-BIL-122 AC.2 would be undischargeable — the "invalid for the result" and "valid but unselected" cases would be indistinguishable. |

**Kaizen lessons:**

- **K-001** (`npx eslint`, never `npm run lint`) → applied, §9. Independently verified against `server/.../src/CLAUDE.md` §11.
- **K-002** (`npm run build` + `tsc -p tsconfig.spec.json` are the only client type gates) → applied, §9. Independently verified.
- **K-003** (correction sweeps grep the **literal** superseded string, then re-grep to confirm) → **claimed but not applied on the first pass; now applied.**

  > **Recorded honestly rather than quietly fixed.** The first draft asserted K-003 "binds every Adjust round on this spec" while `requirements.md:13` still read *"a backfill over legacy production rows"* — contradicting four other sections. The sweep had grepped `auto-promote`, `Post-migration`, `every legacy result` and `backfill decided by OQ-2`, and never the literal phrase that actually survived. That is K-003's exact failure mode: a semantic grep missing its own literal target, with closure reported before re-grepping.
  >
  > Judgment Day caught it (F-9) — the author did not. **Naming a lesson is not applying it**, and this is the second consecutive spec in which a K-003 sweep reported closure it had not achieved (C1 recorded three such failures). The round-one sweep is documented in `judgment.md`, including which literals were re-grepped and which survive intentionally inside amendment notes.

No existing TRD ADR is superseded by this design.

---

## 14. Open questions

Carried from `requirements.md` §10; none block implementation of R-BIL-120–**130**.

- **OQ-1** — definition of PI approval. Owner: BA. **A7 excluded from this spec.**
- **OQ-2** — **closed** on two independent grounds (D-C2-3): technically unimplementable, and empirically moot (`requirements.md` §1.1). No confirmation outstanding.
- **OQ-3** — retention of Contributing ToC rows. Working assumption: retain (A-3).
- **OQ-5** — Primary changeable until read-only. Working assumption: yes (A-2).
- **OQ-7** — OQ-V2-3 cardinality, deferred to the PRMS story.
- **Mockups** — not ingested; degrades the D-5 gate to an accepted risk (requirements §8).

---

## 15. References

- [`./requirements.md`](./requirements.md) · [`./proposal.md`](./proposal.md) · [`../mapping-adjustments/proposal.md`](../mapping-adjustments/proposal.md)
- C1, shipped: `docs/specs/archive/2026-08-13-bilateral--toc-optional-mapping/`
- Prior art: `docs/specs/archive/2026-06-17-bilateral-module--toc-mapping-v2`, `docs/specs/archive/2026-07-02-bilateral-module--mapping-drives-pool-funding-tag`
- Partial-unique idiom: migrations `1779190000014`, `1779190000015`
- [`docs/specs/kaizen-log.md`](../../kaizen-log.md) — K-001, K-002, K-003
- [AC-1676](https://cgiarmel.atlassian.net/browse/AC-1676) · Epic [AC-1385](https://cgiarmel.atlassian.net/browse/AC-1385)

---

## Authorship

AKILI-SPECS methodology by **Juan Carlos Cadavid** — [jcadavid.com](https://jcadavid.com). Licensed under the MIT License.
