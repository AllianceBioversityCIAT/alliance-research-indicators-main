# Tasks — CLARISA projects phase as an admin-editable variable

- **Spec id:** 2026-08-clarisa-phase-config-variable
- **Depth:** Standard
- **Budget:** 3 tasks · ~380 LOC · ~5 review rounds (`design.md` §11) — revised by the T-01 pivot, 2026-08-18
- **Last updated:** 2026-08-18

---

## Dependency graph

```
T-02 (endpoint, server) ─► T-03 (selector, client)

T-04 (.env.example) — independent, no dependencies

T-01 — DROPPED by pivot (2026-08-18); the work already exists and is merged
```

`T-02` and `T-04` both live in the server package — **do not run them concurrently** (root `CLAUDE.md` §4.3: two tasks in the same package are not parallel-safe), though `T-04` is documentation-only and runs no verification command.

---

## T-01 — ~~Seed the `app_config` row~~ **DROPPED (pivot, 2026-08-18)**

| Field | Value |
| --- | --- |
| **Status** | `[x]` — **satisfied by pre-existing merged work; no code owed by this spec** |
| **Resolution** | Option A, approved by the user 2026-08-18 |

**Why this task no longer exists.** A migration seeding this exact row already exists and is merged:
`src/db/migrations/1786738949211-seedClarisaMappingPhase.ts`, commit `8431dc4b`
(*"[SPEC:bugfix/bilateral-alliance-selector] feat(app-config): seed the mapping-phase row so the phase is admin-editable"*).

It seeds `simple_value = '2026'`, is idempotent (`ON DUPLICATE KEY UPDATE`), and its `down()` already parameterizes **and** backticks the reserved word `key` — i.e. it already satisfies what `DD-6` was written to protect. `key` is the entity's `@PrimaryColumn`, so a second INSERT would collide.

**`R-CPC-001` and `R-CPC-002` are therefore delivered by merged code, not by this spec.** The row is absent from the Dev database only because that migration is **pending, never applied** — an ops action, not a code deliverable.

> **Ops action owed (not a task):** apply `SeedClarisaMappingPhase1786738949211` to the Dev database. Until then the variable will not appear on the Configuration Variables screen and `T-03` cannot be visually checked end to end.

The task ID is **kept, not renumbered** — every reference already written in `execution.md`, `design.md`, and this file's coverage table resolves as written.

Full analysis: `execution.md` → *Pivot Record: T-01*.

---

## T-02 — Phases endpoint derived from the eligible cohort

| Field | Value |
| --- | --- |
| **Status** | `[x]` — PASS first attempt, 2026-08-18 (`execution.md` → T-02) |
| **Size** | M |
| **Package** | `server/researchindicators` |
| **Depends on** | none (do not run concurrently with `T-04` — same package) |
| **Requirements** | `R-CPC-003` scenario 1 + scenario 2 (server half), `NFR-CPC-002`, `NFR-CPC-003` |
| **Design** | `design.md` §5, §6.1, §6.2, `DD-2`, `DD-5`, `DD-7` |
| **Skills** | `nestjs-expert`, `api-design-principles` |

### Scope

- Read-only service method on `ClarisaProjectsService`: read `getCachedAll()`, apply `isBilateralFunding` **and** `isAllianceProject`, deliberately **not** `matchesPhase`, group survivors by phase with counts, count the phase-absent remainder separately, return years descending.
- Response DTO under the existing `dto/` folder.
- Controller handler on `ClarisaProjectsController`, sibling to `bilateral`: `@Roles(CENTER_ADMIN, SYSTEM_ADMIN)`, `ResponseUtils.format`, full Swagger annotations.
- Reuse the predicates from `project-selector.util.ts` — do not re-derive them.

### Clause coverage

| Clause | How it is covered |
| --- | --- |
| `R-CPC-003` scenario 1 — only real years offered | Test with a fixture whose only eligible phase is `2025` → response contains `2025` |
| `R-CPC-003` **BUT NOT** offer a year with no eligible projects | Same test asserts `2026` is **absent**; plus a fixture where a year has projects but none eligible → that year is absent |
| `R-CPC-003` scenario 2 — all phases `null` | Fixture with every `phase: null` → empty year set **and** a non-zero absent-phase count |
| `NFR-CPC-002` — no added upstream load | Test asserting the CLARISA connection's `get` call count is unchanged across a phases request served from a warm cache |
| `NFR-CPC-003` — roles unchanged | Allowed and denied test cases, per the server guide's rule for every role-restricted handler |

### Verification

```bash
# from server/researchindicators
npm test -- --silent
npx eslint src/domain/tools/clarisa/projects
```

**Input that makes this FAIL:** return the phases from `listBilateralProjects` (which already applies `matchesPhase`) instead of the pre-phase cohort — the derivation becomes circular and the all-`null` fixture stops producing an absent-phase count. Or bypass `getCachedAll()` with a direct upstream call — the `NFR-CPC-002` call-count assertion reddens.

**What the verification cannot prove:** that the years match **live** CLARISA. Fixtures prove the grouping logic, not the feed. The live check is `T-03`'s HITL visual pass against dev. Per **K-013**, the fixtures encode the 2026-08-18 measurement — if CLARISA's shape changes, these tests keep passing while reality diverges.

### Done

- [x] All five clause-coverage rows have a passing test.
- [x] Swagger shows the endpoint with tag, bearer lock, and operation summary (class-level `@ApiTags`/`@ApiBearerAuth` inherited; `@ApiOperation` on the handler).
- [x] `npx eslint` clean.

---

## T-03 — Editable year selector in the config edit modal

| Field | Value |
| --- | --- |
| **Status** | `[~]` — code PASS, **human visual check owed** (D-7), blocked by X-6 |
| **Size** | M |
| **Package** | `client/research-indicators` |
| **Depends on** | `T-02` (was `T-01`, `T-02` — `T-01` dropped by pivot) |
| **Requirements** | `R-CPC-004` (all clauses), `R-CPC-003` client half (configured-value injection, empty-state) |
| **Design** | `design.md` §7.1–§7.4, `DD-3`, `DD-4`, `DD-7` |
| **Skills** | `angular-developer`, `ui-ux-pro-max` |

### Scope

- One `GET` method on `ApiService` for the phases endpoint, plus its response interface.
- Key-aware control dispatch in `edit-environment-variable-modal`: a third branch ahead of the simple-input fallback, selected by a **client-side key constant** (`DD-4`) — not by entity metadata.
- `p-select` bound to `simple_value` with **`editable` ON** (`DD-3`), options labelled with their project count (`DD-7`), configured value always injected into the option set.
- The four states from `design.md` §7.3: loading, loaded-with-years, loaded-empty (hint that CLARISA publishes no phase data), request-failed (surfaced, **not** rendered as "no options").
- Token utilities / Aura preset only — no hex literals.

### Clause coverage

| Clause | How it is covered |
| --- | --- |
| `R-CPC-004` scenario — selector replaces text input | Test: modal opened for this key renders the select |
| `R-CPC-004` **BUT NOT** change any other key's control | Test: a different simple key still renders `app-input` |
| `R-CPC-004` **BUT NOT** disturb the JSON branch | Test: a JSON-valued key still renders the structured editor |
| `R-CPC-004` **AND MUST** stay read-only without the role | Test with `canEditAppConfiguration()` false |
| `R-CPC-003` **AND MUST** include the configured value when absent from the derived set | Test: derived `[2025]`, configured `2027` → both present |
| `R-CPC-003` scenario 2 **AND MUST NOT** render empty/unusable or block saving | Test: derived `[]`, configured `2026` → control usable, save enabled |
| `R-CPC-003` scenario 2 **AND MUST** state that no phase data is available | Test asserting the hint is rendered, distinct from a "no projects" message |
| `DD-3` — free entry preserved | Test asserting the select carries `editable` |

### Verification

```bash
# from client/research-indicators
npm test -- --silent
npm run lint -- --quiet
npm run build          # the client's real type gate
```

**Input that makes this FAIL:** remove the key guard from the control dispatch — the JSON-branch test reddens because a structured key renders a year select. Or drop `editable` — the `DD-3` assertion reddens.

**What these checks cannot prove — and the substitute.** Every assertion above is a **presence-assertion**: it proves the select, the hint, and the `editable` attribute are in the DOM. It does **not** prove the control is legible, correctly aligned, or usable — jsdom cannot measure layout, and the repo has no visual-regression harness. This is defect class **D-7** in `requirements.md`, recorded there as having **no automated gate**.

> **Mandatory substitute — human visual check at the Phase-3 HITL pause.** Open the edit modal for `ARI_CLARISA_PROJECTS_PHASE` on the running dev stack and confirm: the selector renders, the years and counts are readable, typing a custom year works, and the empty-state hint reads as "no phase data upstream" rather than "no projects". **A green suite is not a substitute for this check and must not be reported as one.**

### Done

- [x] All eight clause-coverage rows have a passing test.
- [x] `npm run build` clean (the client's only real type gate).
- [ ] **The human visual check has been performed and its outcome recorded in `execution.md`.** ← blocks `[x]`; blocked by X-6

---

## T-04 — Document the variable in `.env.example`

| Field | Value |
| --- | --- |
| **Status** | `[x]` — PASS attempt 3 of 3, 2026-08-18 (`execution.md` → T-04) |
| **Size** | XS |
| **Package** | `server/researchindicators` |
| **Depends on** | none |
| **Requirements** | `R-CPC-005` (all clauses) |
| **Design** | `design.md` §3 |
| **Skills** | — |

### Scope

- Add `ARI_CLARISA_PROJECTS_PHASE` to `.env.example` with a comment stating that it is **Tier 3** — overridden by the `app_config` row — and naming the literal fallback `2026`.

### Clause coverage

| Clause | How it is covered |
| --- | --- |
| `R-CPC-005` scenario — present for a fresh environment | Manual read of the file |
| `R-CPC-005` **AND MUST** state the literal fallback | The comment names `2026` explicitly |

### Verification

```bash
grep -n "ARI_CLARISA_PROJECTS_PHASE" server/researchindicators/.env.example
```

**Input that makes this FAIL:** the grep returns nothing if the line is absent or misspelled.

**What this cannot prove:** that the comment is *accurate*. A grep confirms presence, not truth — if `DD-1`'s seeded value ever changes, this comment silently becomes wrong. Reviewer must read the line, not just the grep result.

### Done

- [x] Line present with the tier explanation and the literal fallback named.
- [x] Reviewer has read the comment for accuracy, not only confirmed its presence — **twice rejected it as inaccurate before passing**.

---

## Coverage closure

| Requirement | Scenarios / clauses | Owning task(s) |
| --- | --- | --- |
| `R-CPC-001` | 1 scenario + 2 clauses | **merged work** (`8431dc4b`) — see T-01 pivot |
| `R-CPC-002` | 1 scenario + 2 clauses | **merged work** (`8431dc4b`) — see T-01 pivot |
| `R-CPC-003` | 2 scenarios + 4 clauses | T-02 (server half), T-03 (client half) |
| `R-CPC-004` | 1 scenario + 3 clauses | T-03 |
| `R-CPC-005` | 1 scenario + 1 clause | T-04 |
| `NFR-CPC-001` | — | **merged work** (`8431dc4b`) |
| `NFR-CPC-002` | — | T-02 |
| `NFR-CPC-003` | — | T-02, T-03 |
| `NFR-CPC-004` | — | **merged work** (`8431dc4b`) — migration authored and reviewed under `bugfix/bilateral-alliance-selector` |

Every scenario and every `BUT` / `AND IT MUST` clause is owned by a named task. **D-7 (visual correctness) is the one defect class with no automated owner** — substituted by the mandatory human check in `T-03`, not silently absorbed.

---

## Authorship

AKILI-SPECS methodology by **Juan Carlos Cadavid** — [jcadavid.com](https://jcadavid.com). Licensed under the MIT License.
