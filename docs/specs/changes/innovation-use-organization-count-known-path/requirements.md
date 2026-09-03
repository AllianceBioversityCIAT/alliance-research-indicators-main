# Requirements — Changes / Organization count belongs to the unknown-organization path only

- **Module:** client — `innovation-use-details` (STAR result page), organization card
- **Spec id:** 2026-09-innovation-use-organization-count-known-path
- **Status:** draft
- **Owner:** D. Casañas
- **Depth:** **Lite**
- **Linked PRD section:** §5 Results capture (Innovation Use section field set)
- **Linked tickets:** —
- **Extends / amends:** [`docs/specs/archive/2026-08-26-innovation-use--details-page`](../../archive/2026-08-26-innovation-use--details-page/) — reverses its `§5.5` "both paths" row and `tasks.md:309`; leaves `R-IUP-008` in force on the surviving surface
- **Related (not changed):** [`docs/specs/archive/2026-08-20-innovation-use--details-api`](../../archive/2026-08-20-innovation-use--details-api/) — `R-IUA-007` server contract stays as-is
- **Source proposal:** [`proposal.md`](./proposal.md) (Option A)
- **Last updated:** 2026-09-03

---

## 1. Context

In the Innovation Use organization card, **Organization count** renders on both identity paths. On the *unknown* path the row names an institution **type** ("Research organizations and universities"), so "how many?" is the point of the field. On the *known* path the row names **one specific CLARISA institution**, so the answer is necessarily one and the question is meaningless.

The "both paths" rule came from `design.md` §5.5 with **no recorded rationale** — §5.5 claims to mirror the reference organization card, which (`requirements.md:984`, RK-1) has no `organization_count` at all. No requirement AC mandates it.

**Not changing:** the field's behaviour on the unknown path (`[min]="0"`, `[maxFractionDigits]="0"`, optional, `R-IUP-008` numeric hygiene); its label; row submission/drop rules; the actor and measure cards; the shared `app-input`; and the entire server tier — DTO, entity, column nullability, `SP_versioning`, and the integration test that pins known-path persistence.

---

## 2. Requirement numbering

`R-IUC-<NNN>` / `NFR-IUC-<NNN>`. IUC = **I**nnovation **U**se organization **C**ount.

---

## 3. Functional requirements

### R-IUC-001 — The count field renders only when the organization is not known

- **As a** STAR result submitter
- **I want** the Organization count question to disappear once I name a specific institution
- **So that** I am not asked a question that has only one possible answer

**Details:**
- Discriminator: `is_organization_known`. Falsy → render; `true` → do not render.
- The condition keys on the flag **alone**, not on whether an institution has actually been chosen (resolves proposal `OQ-2`).
- Presence is a **DOM** property, not a component-flag property (**KZ-001**).

#### Scenario: Known path hides the field

- GIVEN an organization row with `is_organization_known === true`
- WHEN the card renders
- THEN no Organization count input is present in the DOM
- AND the organization `p-select`, the selected-partner preview, and the request-institution callout still render
- BUT it must NOT remove or alter the count field on any other card (actor, measure)
- AND IT MUST hide the field even when `institution_id` is still unset — a ticked box with no institution chosen is still the known path

#### Scenario: Unknown path keeps the field unchanged

- GIVEN an organization row with `is_organization_known` falsy
- WHEN the card renders
- THEN the Organization count input is present
- AND it still carries `[min]="0"`, `[maxFractionDigits]="0"` and the `How many?` placeholder
- BUT it must NOT become required, gain an asterisk, or change label

#### Scenario: Toggling the checkbox updates the field live

- GIVEN a rendered card on the unknown path with the count field visible
- WHEN the user ticks **Is the organization known?**
- THEN the count field disappears without a reload
- AND unticking it brings the field back
- AND IT MUST be verified as a **transition** — arranged by toggling a rendered component, never by re-instantiating the fixture in the end state (**KZ-015**)

**Acceptance criteria:**
- [ ] AC.1 — Known-path render: DOM query for the Organization count input returns nothing.
- [ ] AC.2 — Unknown-path render: the same query returns the input, with its numeric attributes intact.
- [ ] AC.3 — A ticked box with `institution_id` unset still hides the field.
- [ ] AC.4 — Toggle in both directions on an already-rendered fixture flips visibility.

---

### R-IUC-002 — A known-path row persists no organization count

- **As a** MEL data consumer
- **I want** a row that names a specific institution to carry no organization count
- **So that** a meaningless — or stale, invisible — number is never stored against a named institution

**Details:**
- `buildOrganizationPayload` emits `organization_count: null` when `is_organization_known` is true, symmetric with the four fields it already nulls on the opposite path and with `buildActorPayload`'s treatment of every count field.
- Nulling happens at the **payload boundary**, not by clearing the card's `body`. The user's typed value is not destroyed mid-session; it simply is not sent while the row is on the known path.
- This covers both the session case (type on unknown → tick the box) and the stored case (a legacy row loaded from a GET with a count already set).

#### Scenario: A known-path row nulls a carried count

- GIVEN an organization row with `is_organization_known === true`, a valid `institution_id`, and `organization_count` set to a number in the component body
- WHEN the page builds the save payload
- THEN that row's `organization_count` is `null`
- AND its `institution_id` is still sent
- BUT it must NOT null `organization_count` for any row whose `is_organization_known` is falsy
- AND IT MUST leave the row's inclusion in the payload unchanged — `organizationIdentitySatisfied` never consulted the count, and this spec does not make it

#### Scenario: An unknown-path row round-trips its count

- GIVEN an organization row on the unknown path with `institution_type_id` set and `organization_count` set to `12`
- WHEN the page builds the save payload
- THEN that row's `organization_count` is `12`
- AND `institution_id` is `null`, as today

**Acceptance criteria:**
- [ ] AC.1 — Known-path row with a body count emits `organization_count: null`.
- [ ] AC.2 — Unknown-path row emits its count verbatim.
- [ ] AC.3 — Mixed payload (one row per path) emits both outcomes in one build.
- [ ] AC.4 — The set of rows included in the payload is byte-identical to today for the same input.

---

## 4. Non-functional requirements

### NFR-IUC-001 — The server tier is untouched

- **Category:** compliance / regression safety
- **Target:** **zero** changed files under `server/researchindicators/`. The API keeps accepting `organization_count` on both paths; no DTO tightening, no migration, no stored-procedure edit. The integration test `result-institution-types.service.spec.ts:301` (*"update path, `is_organization_known` branch: `organization_count` is still carried through"*) remains valid and unedited — it asserts the service persists what it is given, which stays true.
- **How verified:** `git diff --name-only` contains no `server/` path; server suite not re-run because nothing in it changes (declared scope limit, **KZ-017**).

### NFR-IUC-002 — Numeric hygiene survives on the surviving surface

- **Category:** compliance
- **Target:** `R-IUP-008` (no negatives, no fractions, enforced at input/blur/paste) continues to hold for `organization_count` wherever it still renders.
- **How verified:** the existing `c6` describe block in `innovation-use-organization-item.component.spec.ts` must still pass **unmodified**. If it needs editing to stay green, the change has leaked beyond its scope.

---

## 5. Data requirements

No schema change. `result_institution_types.organization_count` stays `int NULL`.

**Backfill: none in this spec, by decision.** Existing rows with `is_organization_known = 1` and a non-null count keep that value until the result is next saved, at which point R-IUC-002 nulls it. Historical versions are unaffected — `SP_versioning` copied the column at version time and is not rewritten.

This makes the blast radius a **data** question, not a code one, and it is tracked as `OQ-1` in §7. It must be answered before `/akili-execute`, not before this spec is approved.

---

## 6. Defect classes and their gates

Named per the specify contract: each class this spec can produce, and the command that catches it. A class with no automated check is substituted or accepted — never left implied.

| # | Defect class | Gate | Catches it? |
| --- | --- | --- | --- |
| **D-1** | Field still renders on the known path (fix not applied) | DOM query in `innovation-use-organization-item.component.spec.ts` | ✅ |
| **D-2** | Field stops rendering on the **unknown** path (over-application) | positive DOM assertion, same spec | ✅ |
| **D-3** | Payload still sends the count on the known path | payload assertion in `innovation-use-details.component.spec.ts` | ✅ |
| **D-4** | Payload stops sending the count on the unknown path | payload assertion, same spec | ✅ |
| **D-5** | Visibility does not track a live toggle (stale render) | transition-arranged test per **KZ-015** | ✅ |
| **D-6** | Row inclusion/drop behaviour changes as a side effect | the existing `T-08 buildPayload() — c2: blank organization rows are dropped` and `T-08 buildPayload() — Issue 1 fix: organization identity is an OR over both paths` blocks must pass **unmodified** (only an *added* assertion is permitted in the latter) | ✅ |
| **D-7** | **Card layout/spacing regresses** where the field was removed — the `rs-mt-[12]` rhythm between the preview block and the warning message | ❌ **No automated gate.** jsdom cannot measure layout, and no test in this repo asserts spacing | **Substitute:** human browser check at the HITL pause, on both paths. Recorded, not assumed |
| **D-8** | Server behaviour changes | `git diff --name-only` shows no `server/` path (NFR-IUC-001) | ✅ |
| **D-9** | Existing stored counts silently wiped on next save | ❌ Not a code defect — an intended consequence whose *scale* is unknown | **Substitute:** `OQ-1` DB count + explicit user decision before execute |
| **D-10** | **Type error in the payload edit.** Emitting `null` into a field the payload interface never widened is `TS2322` under `"strict": true` | `npm run build` — **mandatory**. `npm test` is structurally blind: `jest.config.ts` sets `isolatedModules: true`, so the suite compiles without type-checking and goes fully green over the error (**KZ-017**) | ✅ build only |
| **D-11** | **A second Lens B guard left un-reworked.** `c8`'s known-path case asserts `expect(appInputs().length).toBe(1)` and goes to 0 | `npx jest --testPathPattern innovation-use` reddens on `c8` | ✅ |

**Falsifiability (per the specify contract — name the input that makes each check fail).** D-1's gate fails if the template's `@if` is omitted; D-3's fails if the ternary is omitted. Both must be observed **red against the un-fixed code** before they are trusted (**K-004**) — a green written after the fix proves nothing. D-2/D-4 fail if the condition is inverted. D-6 fails if `organizationIdentitySatisfied` is touched. D-10's failing input is free — the ternary *without* the interface widening is itself the error. D-11 reddens on the un-reworked `c8`.

> **D-10 and D-11 were added after the design's Step 2.3 reversion challenge** (`design.md` §6.1) found both: the payload edit as originally scoped did not compile, and a *second* Lens B guard breaks, not only the pinning test at `:183`. Neither was visible from the proposal.

**What the presence-assertions cannot prove.** D-1/D-2 are DOM presence checks. They prove the element is or is not in the tree; they prove **nothing** about how the card looks once it is gone — that is D-7's territory, and D-7 has no automated gate by design.

---

## 7. Assumptions, dependencies, risks, open questions

| # | Item | Owner | Status |
| --- | --- | --- | --- |
| **AR-1** | Nulling a count on the known path is *cleanup*, not data loss, because under this spec's definition the value is meaningless there. Accepted by the user in approving the proposal's Option A. | User | Accepted |
| **AR-2** | No API consumer other than the STAR client writes Innovation Use organizations. If one exists, it could still write a known-path count — the invariant is client-enforced only (proposal R-3). | — | Accepted risk |
| **OQ-1** | **CLOSED 2026-09-03 by user decision.** Innovation Use is still in development, the captured counts are consumed by nothing, and any matching rows are test data that can be deleted. No query was run and none is owed; `AR-1` stands and no backfill or MEL comms are needed. Also confirmed at source: `resolveOrganizationCount` never sets the column on an Innovation **Dev** row, so this change cannot reach Dev. | User | **Closed** |
| **OQ-2** | *Resolved in this document:* the field hides on `is_organization_known` alone, not on `institution_id`. See R-IUC-001 Details. | — | Closed |

---

## 8. Requirement ID index

| ID | Title | Tasks |
| --- | --- | --- |
| `R-IUC-001` | The count field renders only when the organization is not known | T-01, T-03 |
| `R-IUC-002` | A known-path row persists no organization count | T-02, T-03 |
| `NFR-IUC-001` | The server tier is untouched | T-04 |
| `NFR-IUC-002` | Numeric hygiene survives on the surviving surface | T-03, T-04 |

---

## 9. Sign-off

- [ ] Engineering lead — <name>
- [x] MEL / product owner — D. Casañas (raised and approved the intent, 2026-09-03)
- [ ] Security review — n/a (no auth/secrets touched)
- [ ] DevOps — n/a (no infra touched)
