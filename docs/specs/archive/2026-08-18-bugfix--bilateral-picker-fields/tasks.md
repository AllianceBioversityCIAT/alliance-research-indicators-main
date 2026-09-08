# Tasks — Clarisa / Bilateral Project Picker Fields

- **Module:** clarisa (server) + center-admin bilateral-mapping (client) + admin-panel
- **Spec id:** 2026-08-bilateral-picker-fields
- **Status:** completed (T-04 partial; follow-ups carried forward)
- **Owner:** Juan Cadavid
- **Linked requirements:** [`./requirements.md`](./requirements.md)
- **Linked design:** [`./design.md`](./design.md)
- **Mode:** **Bug Mode** — regression evidence is mandatory and is owned by the tasks that change the buggy paths (**K-010**)
- **Last updated:** 2026-08-18

---

## 1. Dependency graph

```
T-01 (server: fields + search + sort)  ──┐
                                          ├──> T-04 (human visual check)
T-02 (client: label + filter)  ───────────┤
                                          │
T-01 ──> T-03 (admin SSR label) ──────────┘

--- Pivot, 2026-08-18 (Option A + C) ---
T-05 (server: external_code) ──> T-06 (client: prefer code + de-duplicate) ──> T-07 (admin: same rule) ──> T-04
```

- **T-01 ∥ T-02** — different packages. Root `CLAUDE.md` §4.3: cross-package parallelism is safe; two tasks in the same package are not.
- **T-03 after T-01** — both live in `server/researchindicators`, so they must be sequential even though they touch different files.
- **T-04 last** — it verifies the rendered result of all three.

---

## 2. Task list

### T-01 — Server: return the name, search it, and order by it

- **Requirements covered:** R-BPF-001, R-BPF-002, R-BPF-006, NFR-BPF-001, NFR-BPF-003
- **Design references:** §5, §6, DD-1, DD-2, DD-3, DD-7
- **Files touched (intended):**
  - `server/researchindicators/src/domain/tools/clarisa/projects/clarisa-projects.controller.ts`
  - `server/researchindicators/src/domain/tools/clarisa/projects/clarisa-projects.controller.spec.ts`
- **Description:** Add `full_name` and `description` to the picker projection, widen the `search` predicate to match `short_name` OR `full_name`, sort the filtered set by name, and correct the `search` Swagger description which currently claims `short_name` only. The service layer is not touched.
- **Implementation notes:**
  - The fields already arrive in the fetched payload — do **not** add an upstream call. Adding one fails NFR-BPF-003 regardless of response size.
  - An item missing `full_name` must fall through to the `short_name` comparison, never throw.
  - `description` is returned but **not** matched (DD-2).
  - The comparator must be deterministic — a non-deterministic order makes T-01's own gate flaky rather than false.
  - Fixtures pinned to `evidence/` spellings: `A1806`, `B-A1080`, `C-A480`, plus a 255-character `full_name` (**KZ-001** / DD-7). An invented `PROJ-1` fixture is a Reviewer FAIL.

- **Clauses owned (scenario-level closure):**
  | Requirement | Clause |
  | --- | --- |
  | R-BPF-001 | THEN both fields present · AND `description` empty-value when upstream absent · BUT NOT rename/retype/remove · AND IT MUST leave the other five fields byte-identical in shape |
  | R-BPF-002 | THEN name term matches · AND code term still matches · AND case-insensitive · BUT NOT match on `description` · AND IT MUST tolerate absent `full_name` without throwing |
  | R-BPF-006 | THEN ordered case-insensitively by `full_name` · AND absent-name items sort by `short_name` in sequence · BUT NOT change which options are returned · AND IT MUST be stable across two calls |

- **Tests:** `clarisa-projects.controller.spec.ts` — strict `toEqual` on the whole item; name-term search; code-term search; case-insensitivity; absent-`full_name` non-throw; `description` non-match; order assertion over a mixed fixture; identical-set assertion; stability across two invocations.

- **Verification:**
  ```
  cd server/researchindicators && npm test -- --silent
  npx eslint src/domain/tools/clarisa/projects/clarisa-projects.controller.ts src/domain/tools/clarisa/projects/clarisa-projects.controller.spec.ts
  ```
- **Red-before-green (K-004, mandatory):** run the new spec against `HEAD` **before** editing the controller and paste the failure output verbatim into `execution.md`. Expected red: the name-term search returns an empty array, and the strict `toEqual` fails on the two missing keys.
- **The input that would make this check FAIL:** a project whose `full_name` contains the search term and whose `short_name` does not — e.g. `{ short_name: 'A1806', full_name: 'WTO-Phase 1: MusaSentinel' }` searched as `musasentinel`. On current code the assertion returns `[]`.
- **Disqualifier:** a green run in which the new assertions never executed is not evidence. If any regression assertion cannot be made to fail on `HEAD`, delete it and record the gap — do not count it as coverage.

- **Skills:** `nestjs-expert`, `api-design-principles`, `systematic-debugging`
- **Effort:** `medium`
- **Estimated effort:** M · **~110 LOC** (~35 production, ~75 tests)
- **Status:** done

---

### T-02 — Client: label with the name, and stop discarding what the server matched

- **Requirements covered:** R-BPF-003, R-BPF-004, R-BPF-005, NFR-BPF-002
- **Design references:** §7, §8, DD-4, DD-5, DD-6
- **Files touched (intended):**
  - `client/research-indicators/src/app/shared/interfaces/bilateral/bilateral-project-mapping.interface.ts`
  - `client/.../administration/center-admin/bilateral-mapping/bilateral-mapping.component.ts`
  - `client/.../administration/center-admin/bilateral-mapping/bilateral-mapping.component.html`
  - `client/.../administration/center-admin/bilateral-mapping/bilateral-mapping.component.spec.ts`
- **Description:** Add `full_name?` / `description?` to the option interface; add a label method composing `"<short_name> — <full_name>"`; bind it through `item` and `selectedItem` templates with `[title]`; widen `filterBy` to `short_name,full_name`. Mirror the AGRESSO picker at `html:285-318` exactly.
- **Implementation notes:**
  - **Keep `optionLabel="short_name"`** (DD-4). Removing it breaks the `searchFields()` fallback and the a11y label path — this was decided by the reversion challenge, not left over.
  - Reuse `.bil-picker-option-label` / `.bil-picker-selected-label` (`scss:118,130`). **No new CSS** (DD-6).
  - The label method is the single source for both templates — assert that by test, not by inspection.
  - `filterBy` must mirror T-01's server predicate exactly (DD-5 / **K-005**). Add a comment at the site naming the coupling; the next person to widen one will not otherwise know the other exists.
  - Fixtures pinned to `evidence/` spellings (**KZ-001**), including a 255-character `full_name`.

- **Clauses owned:**
  | Requirement | Clause |
  | --- | --- |
  | R-BPF-003 | THEN name-matched option stays visible · AND code term keeps it visible · BUT NOT filtered out by a narrower client field set · AND IT MUST hold when `full_name` is absent |
  | R-BPF-004 | THEN label reads `code — name` · AND absent name renders the code alone · BUT NOT render `undefined`/`null`/trailing separator · AND IT MUST use one composition for collapsed and list states |
  | R-BPF-005 | AND complete string reachable without selecting *(the visual clipping clauses belong to T-04; the assistive-tech announcement is an accepted gap pending **OQ-4** — see below)* |

- **Tests:** `bilateral-mapping.component.spec.ts` — the filter test resolves the **real** `Select` instance from the fixture (`debugElement.queryAll(d => d.componentInstance instanceof Select)`, selected by its `filterBy`), sets options carrying `full_name`, sets the filter value, and asserts `visibleOptions()`. Plus label-method unit tests for all three input shapes, and a `title`-attribute assertion.

- **Verification:**
  ```
  cd client/research-indicators && npm test -- --silent
  npm run lint -- --quiet
  ```
- **Red-before-green (K-004, mandatory):** **already observed red on `HEAD`, 2026-08-18** — with options carrying `full_name`, `visibleOptions()` returns `[]` for the term `"musasentinel"` while returning the row for `"A1806"`. Reproduce that output and paste it verbatim into `execution.md` before editing the template.
- **The input that would make this check FAIL:** the option `{ short_name: 'B-A1080', full_name: 'Fertilize Right Colombia' }` with the filter term `fertilize`. Current code yields `[]`.
- **What the presence-assertions cannot prove:** asserting `filterBy="short_name,full_name"` appears in the template proves the attribute exists, **not** that a name search survives. It is not accepted as evidence for R-BPF-003 — the `visibleOptions()` assertion is. Likewise the `title` attribute proves the string is in the DOM — **not** that the label clips correctly (T-04), and **not** that a screen reader announces it. `title` support in AT is inconsistent; asserting the attribute must never be recorded as satisfying NFR-BPF-002. That half is an accepted gap pending **OQ-4** (requirements §9).
- **Disqualifier:** if the filter test passes on `HEAD`, it is not exercising the real `Select` instance — it is asserting against the component's own option array. Delete it and rewrite; a test that cannot go red is not a gate.

- **Skills:** `angular-developer`, `ui-ux-pro-max`, `systematic-debugging`
- **Effort:** `high` — the PrimeNG coupling is the crux of the defect and the test harness route is subtle
- **Estimated effort:** M · **~150 LOC** (~50 production, ~100 tests)
- **Status:** done

---

### T-03 — Admin SSR panel: same endpoint, same label

- **Requirements covered:** R-BPF-004 (second surface)
- **Design references:** DD-8
- **Dependencies:** **T-01** (same package as T-01 — must not run concurrently, §4.3)
- **Files touched (intended):**
  - `server/researchindicators/src/admin/client/pages/BilateralProjectMappings.tsx`
- **Description:** The panel fetches the same endpoint at `:148` and renders `[{p.id}] {p.short_name}` at `:543`. Add the name to that label and add `full_name`/`description` to the local `ClarisaProject` interface at `:35`.
- **Implementation notes:**
  - Same fallback rule as T-02: no `full_name` renders the code alone, never `undefined`.
  - Do **not** touch the `clarisa_project_short_name` write at `:215,:220` — that is the snapshot column and is OQ-2, explicitly out of scope.
  - The panel's search box copy at `:305` says *"Search agreement_id or project short_name…"* — verify whether that filter is client-side over its own list; if the label now shows names the copy must not claim otherwise.

- **Clauses owned:** R-BPF-004 THEN/AND/BUT, applied to the admin surface.
- **Tests:** none exist for this page. **This is a declared gap, not silent.** Verification is T-04's visual check plus `npm run build` proving the TSX compiles.
- **Verification:**
  ```
  cd server/researchindicators && npm run build
  npx eslint src/admin/client/pages/BilateralProjectMappings.tsx
  ```
- **The input that would make this check FAIL:** a type error from reading `full_name` before adding it to the local interface — the build reddens. **Note the limit honestly:** the build proves it compiles, not that it renders correctly. Rendering is T-04's job, and T-03 has **no automated behavioral gate**.
- **Disqualifier:** a green build is not evidence the label changed. T-03 is not done until T-04 confirms the rendering.

- **Skills:** `react-doctor`
- **Effort:** `low`
- **Estimated effort:** S · **~15 LOC**
- **Status:** done (WAIVED — Leader inspection, not an independent audit; see execution.md)

---

### T-04 — Human visual check (the substitute for the D-4 gap)

- **Requirements covered:** R-BPF-005 (visual clauses), R-BPF-004 (rendered confirmation for T-02 and T-03)
- **Design references:** requirements §6 D-4
- **Dependencies:** T-01, T-02, T-03
- **Description:** **This exists because there is no automated gate for it.** The overlay does not render in this jsdom harness (probed 2026-08-18: `show()` produces no `.p-select-option` nodes) and jsdom cannot measure layout. Recording the gap without naming the substitute would leave the spec's most visible defect class uncovered.
- **Manual check** — server pointed at CLARISA test, logged in as Center Admin:
  - [ ] Open `administration/center-admin/bilateral-mapping` → **New mapping** → open the CLARISA project dropdown
  - [ ] **AMENDED by the Pivot** — the first ten options read as a human-recognisable project **name**. Against the *current* feed (25 rows, `short_name == full_name`, no `external_code`) the correct rendering is the name **once**, e.g. `Fertilize Right Colombia` — **not** `Fertilize Right Colombia — Fertilize Right Colombia`, which is the reported defect. Once PRMS populates `external_code` the same options must read `B-A1080 — Fertilize Right Colombia`; the T-04 check should be repeated then
  - [ ] With R-BPF-006 in place the list opens ordered by name, not on the numeric-code cluster
  - [ ] Type `musasentinel` → the matching project appears
  - [ ] A long name clips on one line; the dialog does not widen and the label does not wrap
  - [ ] Hovering a clipped option reveals the full name
  - [ ] Select an option — the collapsed control shows the same composition, clipped the same way
  - [ ] Open the admin SSR panel's project dropdown (T-03) and confirm the same label
- **Clauses owned:** R-BPF-005 THEN clipped · BUT NOT wrap or widen the dialog. R-BPF-004 rendered confirmation for both surfaces.
- **Disqualifier:** a screenshot of the dialog **closed** proves nothing. The check requires the dropdown open with real CLARISA test data — not fixtures, not a mock. If the environment cannot be brought up, the task is **blocked**, not passed.
- **Known limit:** **production returns 0 rows for this picker** (phase 2026 = 0 of 299). This check is valid against CLARISA test only and must not be reported as production coverage.
- **Skills:** none — human
- **Estimated effort:** S
- **Status:** partial (2 of 6 checks confirmed from the running UI; 4 unverified — see execution.md)

---

### T-05 — Server: project `external_code` and match it in search

- **Requirements covered:** R-BPF-001 (amended), R-BPF-002 (amended), NFR-BPF-001
- **Design references:** DD-9, §5
- **Dependencies:** none (T-01 is `done`)
- **Files touched (intended):** `clarisa-projects.controller.ts` + its spec
- **Description:** Add `external_code` to the picker projection and to the search predicate. Same additive discipline as T-01.
- **Implementation notes:**
  - `external_code` is already declared on `ClarisaProject` (`dto/clarisa-project.types.ts:80`) and already arrives in the fetched payload. **Do not add an upstream call.**
  - It is `null` on all 25 live rows — this is forward-compatibility for PRMS, so the tests must cover the null path as the *normal* case, not the edge case.
  - Predicate becomes `short_name` OR `full_name` OR `external_code`, each optional-chained so an absent field never throws.
- **Clauses owned:** R-BPF-002 *"a project whose `external_code` matches is returned"* · *"AND IT MUST tolerate `full_name` or `external_code` being absent without throwing"*; R-BPF-001 additivity.
- **Verification:** `npm test -- --silent` and `npx eslint <paths>` from `server/researchindicators/`.
- **Red-before-green (K-004):** a search by an `external_code` value must fail on current `HEAD` (the field is neither projected nor matched). Capture the failure verbatim.
- **The input that would make this check FAIL:** `{ short_name: 'Fertilize Right Colombia', external_code: 'B-A1080' }` searched as `b-a1080` — returns `[]` today.
- **Disqualifier:** a test that only asserts the field appears in the response does not prove the predicate matches it. Both assertions are required.
- **Skills:** `nestjs-expert`, `systematic-debugging` · **Effort:** `medium` · **Size:** S (~40 LOC)
- **Status:** done

### T-06 — Client: prefer `external_code`, and stop rendering the name twice

- **Requirements covered:** R-BPF-003 (amended), R-BPF-004 (amended, both new scenarios)
- **Design references:** DD-9, DD-10, DD-5
- **Dependencies:** T-05 (the field must be in the payload)
- **Files touched (intended):** `bilateral-project-mapping.interface.ts`, `bilateral-mapping.component.ts`, `bilateral-mapping.component.spec.ts`
- **Description:** `ClarisaBilateralProjectOption` gains `external_code?`. `clarisaOptionLabel` picks the code as `external_code || short_name`, then renders it **once** when it equals the name (trimmed, case-folded), otherwise `code — name`. `filterBy` gains `external_code` to keep DD-5's coupling with the server predicate intact.
- **Clauses owned:** R-BPF-004 scenario *"The code and the name are the same string"* (all four clauses) and *"`external_code` is preferred as the code"* (all four clauses); R-BPF-003 client-filter parity.
- **Verification:** `npm test -- --silent`, `npm run lint -- --quiet` from `client/research-indicators/`.
- **Red-before-green (K-004):** the de-duplication test must fail on current `HEAD`. **This red is already confirmed from the running UI** — the user's screenshot shows `BMGF-Adaptation Atlas: Refinement and Transition — BMGF-Adaptation Atlas: Refinement and Transition`. Reproduce it as a unit assertion.
- **The input that would make this check FAIL:** `{ short_name: 'Fertilize Right Colombia', full_name: 'Fertilize Right Colombia' }` → today renders the value twice.
- **What a presence-assertion cannot prove:** that `filterBy` contains `external_code` proves the attribute, not that a code search survives the client filter. Use the real `Select` instance and `visibleOptions()`, as T-02 did.
- **Skills:** `angular-developer`, `ui-ux-pro-max` · **Effort:** `high` · **Size:** M (~70 LOC)
- **Status:** done

### T-07 — Admin SSR panel: same label rule

- **Requirements covered:** R-BPF-004 (amended), second surface
- **Design references:** DD-8, DD-9, DD-10
- **Dependencies:** T-05, T-06 (mirror T-06's rule exactly — a divergence between the two pickers is the defect DD-8 exists to prevent)
- **Files touched (intended):** `src/admin/client/pages/BilateralProjectMappings.tsx`
- **Description:** Apply the same code-source and de-duplication rule. Keep the `[{p.id}]` prefix — that was T-03's rework and the reviewer's FAIL was specifically about removing it.
- **Verification:** `npm run build`, `npx eslint <path>`.
- **Honest gate:** this page has **no tests**; the build proves compilation only. Rendering is T-04's job. Do not claim otherwise.
- **Skills:** `react-doctor` · **Effort:** `low` · **Size:** S (~10 LOC)
- **Status:** done

---

## 3. Requirement → task closure

Closure is asserted at **scenario and clause** granularity, not requirement ID (a gap may never be discharged by citing a different requirement).

| Requirement | Scenario | Owning task(s) |
| --- | --- | --- |
| R-BPF-001 | Fields present upstream reach the consumer (4 clauses) | T-01 |
| R-BPF-002 | A name term matches (5 clauses) | T-01 |
| R-BPF-003 | A server name-match survives the client filter (4 clauses) | **T-02** |
| R-BPF-004 | Label composition (4 clauses) | T-02 (STAR) + T-03 (admin) + T-04 (rendered) |
| R-BPF-004 | **Code and name are the same string** (4 clauses) — *Pivot* | **T-06** (STAR) + **T-07** (admin) + T-04 (rendered) |
| R-BPF-004 | **`external_code` preferred as the code** (4 clauses) — *Pivot* | **T-05** (payload) + **T-06** (STAR) + **T-07** (admin) |
| R-BPF-002 | **`external_code` joins the search** — *Pivot* | **T-05** (server) + **T-06** (client filterBy parity) |
| R-BPF-005 | 255-character name (4 clauses) | T-02 (accessible text) + **T-04 (visual clauses)** |
| R-BPF-006 | Deterministic name order (4 clauses) | T-01 |
| NFR-BPF-001 | Additive contract | T-01 |
| NFR-BPF-002 | Accessible label | T-02 |
| NFR-BPF-003 | Response size / no new upstream call | T-01 |

---

## 4. Risks & blockers log

| # | Date | Risk / Blocker | Mitigation | Owner | Status |
| --- | --- | --- | --- | --- | --- |
| RB-1 | 2026-08-18 | Production returns 0 picker rows — no production verification | Verify against CLARISA test; stated in T-04 and design §12 | Juan | open (accepted) |
| RB-2 | 2026-08-18 | T-01 and T-02 landing in separate PRs recreates the invisible-partial-fix | One PR — design §12 | Leader | open |
| RB-3 | 2026-08-18 | T-03 has no automated behavioral gate | Declared in T-03; T-04 is its verification | Juan | open (accepted) |

---

## 5. Done definition

- [ ] T-01…T-04 all `[x]`
- [ ] Every clause in §3 is checked by its owning task
- [ ] Both regression tests were **observed failing on `HEAD`** and the output is in `execution.md` verbatim (K-004)
- [ ] Coverage thresholds green: server 60%; client stmts 40 / branches 20 / lines 45 / funcs 30
- [ ] Swagger's `search` description no longer claims `short_name` only
- [ ] `npx eslint` clean on server paths; `npm run lint -- --quiet` clean on client (K-001 — `npm run lint` on the server carries `--fix` and cannot gate)
- [ ] Server and client shipped in **one** PR
- [ ] OQ-2 (the `clarisa_project_short_name` snapshot) recorded as a follow-up, not silently closed
- [ ] **Pivot tasks T-05…T-07 complete**, each with its own reviewer verdict
- [ ] **The `phase = 2026` finding is resolved or explicitly carried forward** — both CLARISA hosts now return 0 rows for that phase, so any environment applying the archived Alliance-selector bugfix's default gets an empty picker (execution.md → Pivot Record)
