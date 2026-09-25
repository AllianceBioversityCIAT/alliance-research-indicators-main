# Design — Changes / Organization count belongs to the unknown-organization path only

- **Module:** client — `innovation-use-details` (STAR result page), organization card
- **Spec id:** 2026-09-innovation-use-organization-count-known-path
- **Status:** draft
- **Owner:** D. Casañas
- **Depth:** **Lite**
- **Linked requirements:** [`./requirements.md`](./requirements.md) (`R-IUC-001`, `R-IUC-002`, `NFR-IUC-001`, `NFR-IUC-002`)
- **Linked baseline:** [`client/research-indicators/src/CLAUDE.md`](../../../../client/research-indicators/src/CLAUDE.md) (standalone components, signals)
- **Last updated:** 2026-09-03

---

## 1. Goals & non-goals

**Goals**
1. Make `organization_count` a **path-specific** field of the organization card, rendered and persisted only on the unknown path (`R-IUC-001`, `R-IUC-002`).
2. Reach that state by extending the pattern the file already uses, not by inventing one (`DD-2`, `DD-3`).
3. Leave the server tier and the unknown path byte-identical (`NFR-IUC-001`, `NFR-IUC-002`).

**Non-goals** — fenced in `requirements.md` §1 and the proposal §6. Not restated here.

---

## 2. Architecture

No architectural change. Two files in one client feature folder; no new file, no new symbol, no signature change, no service, no route.

```
innovation-use-details/
├── innovation-use-details.component.ts        ← buildOrganizationPayload()  (1 line)
└── components/innovation-use-organization-item/
    └── innovation-use-organization-item.component.html   ← template placement (block move)
```

The change is a **narrowing of an existing branch structure**, and both halves already exist in the surrounding code:

| Concern | Existing precedent in the same file / component | This change |
| --- | --- | --- |
| A control that belongs to one identity path | the whole `@if (body().is_organization_known) { … } @else { … }` block already partitions six controls | adds a seventh to the `@else` side |
| A count nulled on the branch that does not own it | `buildActorPayload()` nulls all five actor counts by branch; `buildOrganizationPayload()` already nulls four fields by branch | adds `organization_count` to the same rule |

### 2.1 Composition

No new files.

---

## 3. Data model

Unchanged. `result_institution_types.organization_count` stays `int NULL`. No migration. See `requirements.md` §5 for the backfill decision (none) and `OQ-1`.

---

## 4. API design

Unchanged. The client narrows what it *sends*; the contract keeps accepting the field on both paths (`NFR-IUC-001`).

---

## 5. Frontend component design

### 5.1 Template — `innovation-use-organization-item.component.html`

The `organization_count` `app-input` (currently lines 155–165) moves **inside the `@else` branch**, appended after the `Specify other` conditional block that today closes the branch at line 153. Its own `rs-mt-[12]` wrapper travels with it, so vertical rhythm on the unknown path is unchanged.

Everything after it — the `showNotIdentifiedMessage` outlet — stays outside both branches, exactly where it is.

### 5.2 Payload — `buildOrganizationPayload()` **and its interface**

`organization_count` joins the branch-keyed group already present in the same object literal, taking the same `known ? … : …` shape as its four neighbours. `known` is already bound on the line above; no new local, no new import.

**This requires a third production edit** (`DD-6`). `InnovationUseOrganizationPayload` (same file, lines 85–93) widened its four branch-nulled fields to `| null` but left `organization_count?: number;` un-widened at line 92. Emitting `null` into it is `TS2322` under `"strict": true`. Line 92 becomes `organization_count?: number | null;` — restoring the symmetry the rest of the interface already has.

### 5.3 What is deliberately NOT touched

| Site | Why |
| --- | --- |
| `onKnownToggle()` | Its documented invariant — *"Neither path clears the other's fields"* — is load-bearing for the `T-08 Issue 1 fix` behaviour (a row toggled to known keeps its `institution_type_id` so it is not silently dropped). `DD-2` makes clearing unnecessary. |
| `body` signal / `InnovationUseOrganization` | `DD-2`. The user's typed value survives a mis-click. |
| `organizationIdentitySatisfied()` | The count never participated in row inclusion and does not start now (`R-IUC-002`, third clause). |
| `syncSubTypes()`, `loadSubTypes()` | Sub-type cascade is unrelated to the count. |

---

## 6. Design decisions log

| # | Date | Decision | Rationale |
| --- | --- | --- | --- |
| **DD-1** | 2026-09-03 | **The discriminator is `is_organization_known` alone**, never `institution_id`. | Closes proposal `OQ-2`. A ticked box with no institution yet is still the known path; keying on `institution_id` would make the field flicker back during the seconds between ticking and selecting — the worst of both behaviours. One boolean, matching how the template already partitions every other control. |
| **DD-2** | 2026-09-03 | **Null at the payload boundary; do not clear `body`.** (Rejects proposal Option C.) | Three reasons, in order of weight. (a) It covers the **stored** case — a legacy row arriving from a GET with a count set is nulled on save without any toggle ever firing, which a clear-on-toggle cannot reach. (b) It preserves `onKnownToggle`'s no-cross-clear invariant (§5.3). (c) **Verified, not assumed:** the existing test *"known-path row restores `institution_id` and `organization_count`"* (`innovation-use-organization-item.component.spec.ts:464`) asserts `component.body().organization_count === 7` (`:474`) on a **known-path** row. Clearing `body` would break it; nulling at the boundary leaves it passing untouched. |
| **DD-3** | 2026-09-03 | **Move the input inside the `@else` branch** rather than wrapping it in a second `@if (!body().is_organization_known)`. | Makes known-path rendering *structurally impossible* instead of conditionally suppressed, with one condition and one source of truth. A duplicated negated condition is a second thing to keep in sync, and `D-2` (over-application) is exactly the defect a drifted duplicate produces. |
| **DD-4** | 2026-09-03 | **Rewrite — never delete — the TWO Lens B "Fix 3" guards: `spec.ts:183` AND `spec.ts:384` (`c8`).** | Both exist because `execution.md:731` (Lens B) found that *"Deleting the count field from the known branch leaves the whole suite green"*; the reviewer added the pinning assertion **and** an anti-vacuity length guard. `c8`'s known-path case arranges `is_organization_known: true` and asserts `expect(appInputs().length).toBe(1)` — after this change that list is empty, so it **fails outright**, and its title still names a control that is gone. Both must be reworked and the `c8` title corrected. *(Found by the `DD-3` reversion challenge, §6.1 — the proposal accounted for `:183` only.)* Per **K-004** the rewritten guards must be observed **red** against the un-fixed template before they are trusted. |
| **DD-6** | 2026-09-03 | **Widen `InnovationUseOrganizationPayload.organization_count` to `number \| null`** (third production edit), and emit `null` rather than `undefined`. | The interface widened its four branch-nulled fields but not this one, so `DD-2`'s ternary does not compile under `"strict": true` (`TS2322`). `undefined` would compile with no interface edit and — **verified, not assumed** — reach the DB identically: `@IsOptional()` skips `null` and `undefined` alike, and `setNull(isEmpty(x) ? null : x)` (`object.utils.ts:77–85, 109–111`) maps both to `NULL`, while `isEmpty(0) === false` keeps a real `0` intact. It is rejected anyway: the four neighbours emit `null`, and that symmetry is this design's central argument. One widened line buys consistency. |
| **DD-5** | 2026-09-03 | **Amend the archived spec in place with a `⚠️ AMENDED` note**; do not rewrite §5.5's original text. | Matches the precedent set by `changes/measure-number-signed-decimal` (`S-10`, `DC-12`), which amended this same archived design without erasing what it originally said. Per **KZ-013**, grep the archive path across `docs/` first — this spec is the second document to cite §5.5, and a silent rewrite falsifies the first. |

### 6.1 Reversion challenge (Step 2.3)

**Status: ran 2026-09-03 — verdict FAIL, two blockers, both folded into this design before approval.** One read-only reviewer, one question: *"what does removing this break?"* The trigger applied (`DD-3` removes a rendered control that has covering tests), so Lite's skip did not.

| # | Finding | Disposition |
| --- | --- | --- |
| **1** | The planned payload edit **does not compile.** `InnovationUseOrganizationPayload.organization_count` was never widened to `\| null` like its four neighbours → `TS2322` under `"strict": true`. **And the gate is blind to it:** the jest transform sets `isolatedModules: true` (`jest.config.ts`), so `npm test` type-checks **nothing**. Only `npm run build` catches it — the component is in the build graph via the lazy route at `app.routes.ts:154`. | Accepted → **`DD-6`** (third edit) + **`D-10`** (new defect class, gated by `npm run build`, now mandatory in §7) |
| **2** | **A second test breaks, not just `:183`.** `c8` known-path (`spec.ts:366–390`) asserts `expect(appInputs().length).toBe(1)` — the same Lens B "Fix 3" anti-vacuity guard — and goes to 0. | Accepted → **`DD-4`** widened to cover both guards and the `c8` title |

**Both findings re-verified at source by the Leader before acceptance**, not taken on report (`file:line` read directly: the un-widened line 92; the `c8` arrange + length guard; `isolatedModules: true`; `@IsOptional()`; `setNull`/`isEmpty`).

**Everything else came back clean, and the clean half is load-bearing** — it is what makes `NFR-IUC-001` a verified claim rather than an assumption. Reported with evidence: **no consumer of `organization_count` exists anywhere** (repo-wide unrestricted grep, 246 occurrences / 47 files enumerated — no report handler, no Excel builder, no `@OpenSearchProperty`, no dashboard or print path; this card is the only renderer); row matching (`constructWhereClause`, `removeDuplicates`) and `validateOrganizationsAreIdentified` never read the count, so **no row can be matched, adopted or deactivated differently**; `SP_versioning` copies it positionally with no predicate on it; the Innovation Use green-check/Submit gate never references it; Innovation Dev never sets the property at all (`resolveOrganizationCount` returns `{}` off the Use role); and on the read path `InputComponent` has no `ngOnDestroy` and writes only from `setValue`/`handlePasteText`, so destroying it on the known branch neither clears nor rewrites the field.

---

## 7. Testing strategy

Co-located `*.spec.ts`, per the client guide. Mapped to `requirements.md` §6's defect classes.

| Defect class | Test | File |
| --- | --- | --- |
| D-1 | known-path DOM query returns nothing (rewritten `:183`) | `innovation-use-organization-item.component.spec.ts` |
| D-2 | unknown-path DOM query returns the input, attributes intact | same |
| D-5 | **transition**: render unknown → toggle the checkbox on the live fixture → assert it disappears → toggle back (**KZ-015**; the file's existing tests use the end-state pattern this must not copy) | same |
| D-3 | known-path row with a body count emits `organization_count: null` — added as an assertion to the **existing** `T-08 buildPayload() — Issue 1 fix` block (line 693), whose fixture already carries `is_organization_known: true` + `organization_count: 12` | `innovation-use-details.component.spec.ts` |
| D-4 | unknown-path row emits its count verbatim | same |
| D-6 | the `c2: blank organization rows are dropped` block passes **unmodified** | same |
| D-7 | ❌ no automated gate — **human browser check at the HITL pause**, both paths (`requirements.md` §6) | — |
| D-8 | `git diff --name-only` shows no `server/` path | — |
| D-9 | ❌ not a code defect — `OQ-1` + user decision | — |
| **D-10** | **type error in the payload edit** — `npm run build` (**mandatory**, not optional) | added by §6.1 finding 1 |
| **D-11** | **the `c8` known-path anti-vacuity guard left un-reworked** — `npx jest --testPathPattern innovation-use` reddens on `c8`, not silently | added by §6.1 finding 2 |

**The `npm test` gate is structurally blind to D-10 (KZ-017).** `jest.config.ts` sets `isolatedModules: true` on the `jest-preset-angular` transform, so the suite compiles without type-checking: the whole client suite goes green over a `TS2322`. `npm run build` is therefore **not** a nice-to-have in this spec's verification — it is the *only* gate for D-10, and a task that reports green on `npm test` alone has not verified the payload edit.

**Disqualifier.** These are boolean DOM/object/compile assertions, not measurements: no reading can be "inconclusive". The one thing that *would* invalidate them is a green written after the fix — per **K-004**, D-1, D-3 and D-11 are not evidence until each has been observed **red** against the un-fixed code, and the execution record must quote that red. D-10's red is available for free: the ternary without `DD-6`'s widening *is* the failing input.

**What the presence-assertions cannot prove:** D-1/D-2 prove tree membership, nothing about how the card *looks* once the field is gone. That is D-7, and D-7 has no automated gate by design.

---

## 8. Security & authorization

None. No endpoint, role, guard, token, secret, or PII surface is touched.

---

## 9. Observability

None. No new log line or metric.

---

## 10. Rollout

- **Migration order:** n/a — no schema change.
- **Feature flag:** none. The change is small, reversible in one commit, and gated behind nothing.
- **Backout:** revert the commit. No data migration to unwind; rows nulled before a revert stay null, which `OQ-1` prices.
- **Comms:** if `OQ-1` returns a non-zero count, MEL should be told that known-path organization counts stop being stored — the user decides at the `OQ-1` gate.

---

## 11. Budget (Step 2.4 — tripwire for `/akili-execute`)

| Metric | Expected |
| --- | --- |
| Tasks | **3** |
| LOC | **~90** (production **~13** — an 11-line block move + 2 changed lines; tests ~65; docs ~12) |
| Review rounds | **1** |

*Revised upward after §6.1: production went from 2 changed lines to 3 (the `DD-6` widening), and the test work from one rewritten guard to two.*

Sizing verdict: the estimate **still matches Lite** — three changed production lines plus a block move, across two files. It sits at the top of Lite's range on task count (Lite's ideal is one task; this is three) purely because the archive amendment and the verification sweep are genuinely separate units of work from the code change, not because the code change is large. Standard depth would add ceremony without adding information.

Exceeding any row is information, not failure: `/akili-execute` stops and escalates rather than continuing past it.

---

## 12. Open questions

- **`OQ-1`** (carried from `requirements.md` §7) — the live row count for `is_organization_known = 1 AND organization_count IS NOT NULL`. Owner: user. **Due before `/akili-execute`**, not before this design is approved.

---

## 13. References

- [`docs/specs/archive/2026-08-26-innovation-use--details-page`](../../archive/2026-08-26-innovation-use--details-page/) — `design.md` §5.5 (the row this spec reverses), `tasks.md:309`, `execution.md:731` (Lens B)
- [`docs/specs/archive/2026-08-20-innovation-use--details-api`](../../archive/2026-08-20-innovation-use--details-api/) — `R-IUA-007`, the unchanged server contract
- [`docs/specs/changes/measure-number-signed-decimal`](../measure-number-signed-decimal/) — the amendment-note precedent cited by `DD-5`
- Kaizen Active Lessons: `KZ-001` (assert on rendered output), `KZ-013` (backward grep before touching an archive), `KZ-015` (arrange the transition), `KZ-017` (declare what a check cannot reach), `K-004` (prove the gate can fail)
