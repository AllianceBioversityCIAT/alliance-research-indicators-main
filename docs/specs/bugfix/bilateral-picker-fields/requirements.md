# Requirements — Clarisa / Bilateral Project Picker Fields

- **Module:** clarisa (server) + center-admin bilateral-mapping (client)
- **Spec id:** 2026-08-bilateral-picker-fields
- **Status:** draft
- **Owner:** Juan Cadavid
- **Linked PRD section:** `docs/prd.md` — bilateral pool-funding attribution
- **Linked proposal:** [`./proposal.md`](./proposal.md) (Type: **Bug**, Approval Mode: `gated`)
- **Extends:** `docs/specs/archive/2026-08-14-bugfix--bilateral-alliance-selector/`
- **Unblocks:** `docs/specs/bilateral/clarisa-automapper-s2/` §9
- **Depth:** **Standard**, Bug Mode — *deviation from the proposal's `Lite`*. Lite prescribes one strictly focused task; this defect is irreducibly two packages (server projection + client picker), and per root `CLAUDE.md` §4.3 cross-package work is the one parallel shape that is safe. Re-checked against the design in `design.md` §Budget.
- **Last updated:** 2026-08-18

---

## 1. Context

The Center-Admin bilateral mapping dialog asks a human to choose one CLARISA project out of 342 options labelled `A1463`, `B-A1080`, `C-A480`. Measured live 2026-08-18: **342 of 342 options carry a code as `short_name`, none contains a space, and all 342 carry a `full_name` the API never returns.** Typing a project name matches nothing.

The picker is the only surface through which a human can create a bilateral mapping, and S2's auto-mapper review queue will render the same project identity — so this blocks manual mapping today and would corrupt the review experience tomorrow.

**Explicitly NOT changing:** what is *stored*. The `clarisa_project_short_name` snapshot column, its write path, and the mapping-list search key are out of scope (proposal §4 → OQ-2). This spec changes what is **shown** and what is **searched**.

---

## 2. Requirement numbering

`R-BPF-<NNN>` — **B**ilateral **P**icker **F**ields. NFRs use `NFR-BPF-<NNN>`. Numbered in dependency order: the response contract first, then search, then presentation.

---

## 3. Functional requirements

### R-BPF-001 — The picker response carries the project's human-readable name

- **As a** Center Admin mapping an AGRESSO contract
- **I want** the API to return each project's real name and description
- **So that** the UI has something recognisable to display and to search

**Details:**
- Inputs: unchanged — `GET /api/tools/clarisa/projects/bilateral?search=&phase=&only-with-science-programs=`
- Behavior: the response projection gains `full_name` and `description`, sourced from the already-fetched upstream payload. No new upstream call.
- Outputs: `ServerResponseDto` envelope unchanged; `data[]` gains two fields.
- Errors: unchanged.
- Permissions: unchanged — `CENTER_ADMIN`, `SYSTEM_ADMIN`.

#### Scenario: Fields present upstream reach the consumer

- GIVEN an upstream project with `short_name = "A1806"` and `full_name = "WTO-Phase 1: MusaSentinel…"`
- WHEN the picker endpoint is called
- THEN the returned item carries both `short_name` and `full_name`
- AND it carries `description` when upstream populated it, and `null`/absent when it did not
- BUT it must NOT rename, retype, or remove any field the response already returns
- AND IT MUST leave `science_programs`, `has_science_programs`, `phase`, and `source_center_acronym` byte-identical in shape

**Acceptance criteria:**
- [ ] AC.1 — a controller test asserts the full item with `toEqual`, listing every field; adding a field is visible, removing one fails
- [ ] AC.2 — `description` absent upstream yields the field's declared empty value, never the string `"undefined"`
- [ ] AC.3 — the count of upstream HTTP calls is unchanged (the 5-minute cache is not bypassed)

**Out of scope:** the `clarisa_project_short_name` snapshot column.

---

### R-BPF-002 — Searching by project name finds the project

- **As a** Center Admin who knows a project by name, not by code
- **I want** the server-side search to match the name
- **So that** I can find one project among 342

**Details:**
- Inputs: `search` query param, unchanged in name and type.
- Behavior: the in-memory match becomes case-insensitive substring over `short_name` **OR** `full_name`.
- Outputs: unchanged shape, larger match set.

#### Scenario: A name term matches

- GIVEN a project `{ short_name: "A1806", full_name: "WTO-Phase 1: MusaSentinel…" }`
- WHEN the endpoint is called with `search=musasentinel`
- THEN that project is in the response
- AND searching `search=A1806` still returns it
- AND searching `search=MUSASENTINEL` returns it (case-insensitive)
- BUT it must NOT match on `description` — see OQ-1
- AND IT MUST tolerate `full_name` being absent on an item without throwing

**Acceptance criteria:**
- [ ] AC.1 — a controller test proves a name-only term returns the row; the same test fails on `HEAD`
- [ ] AC.2 — a code-only term still returns the row (no regression on the existing behavior)
- [ ] AC.3 — an item with `full_name: undefined` does not throw when a term is supplied

---

### R-BPF-003 — The client does not discard what the server matched

- **As a** Center Admin typing a project name
- **I want** the options the server matched to actually appear
- **So that** the search is usable rather than silently empty

**Details:**
- Behavior: the picker's client-side filter fields must cover every field the server-side search covers.
- Rationale: PrimeNG 19.0.6 `p-select` filters the options array internally whenever a filter term is set (`primeng-select.mjs:1674-1683`), and `(onFilter)` is emitted *in addition* to that, not instead of it. A narrower client filter silently deletes server matches.

#### Scenario: A server name-match survives the client filter

- GIVEN the picker holds an option `{ short_name: "A1806", full_name: "WTO-Phase 1: MusaSentinel…" }`
- WHEN the user types `musasentinel`
- THEN that option remains visible in the list
- AND typing `A1806` also keeps it visible
- BUT it must NOT be filtered out by a client-side field set narrower than the server's
- AND IT MUST stay true for an option whose `full_name` is absent (no throw, matches on `short_name` alone)

**Acceptance criteria:**
- [ ] AC.1 — a client test drives the real `Select` instance's filter and asserts the surviving option set. **Observed red on `HEAD` 2026-08-18: `visibleOptions()` returns `[]` for `"musasentinel"`.**
- [ ] AC.2 — the same test passes for a code term both before and after the fix
- [ ] AC.3 — an option without `full_name` does not throw

---

### R-BPF-004 — Each option is labelled with its code and its name

- **As a** Center Admin scanning the dropdown
- **I want** to read `A1806 — WTO-Phase 1: MusaSentinel…`
- **So that** I can tell the options apart

**Details:**
- Behavior: the displayed label composes the code and the name. The code leads, because the mapping table and the AGRESSO side of the dialog both speak in codes.
- Fallback: an option without `full_name` renders the code alone — never `A1806 — undefined` and never an empty label.

#### Scenario: Label composition

- GIVEN an option `{ short_name: "A1806", full_name: "WTO-Phase 1: MusaSentinel…" }`
- WHEN the picker renders it, in the list and once selected
- THEN the label reads `A1806 — WTO-Phase 1: MusaSentinel…`
- AND an option with no `full_name` renders exactly `A1806`
- BUT it must NOT render the literal `undefined`, `null`, or a bare trailing separator
- AND IT MUST use the same composition in the collapsed (selected) state as in the open list

**Acceptance criteria:**
- [ ] AC.1 — the label function is unit-tested for: both fields present, `full_name` absent, `full_name` empty string
- [ ] AC.2 — the selected state and the list state use one shared label source (asserted by test, not by inspection)
- [ ] AC.3 — **rendered-DOM verification is a declared gap** — see §6 D-4

---

### R-BPF-005 — A long name stays readable and does not break the control

- **As a** Center Admin
- **I want** an overlong project name to truncate rather than blow out the dialog
- **So that** the control stays usable, and I can still read the full name

**Details:**
- `full_name` reaches **255 characters** upstream; the dialog is a fixed-width modal.
- Behavior: the label truncates visually, and the complete string is available on hover and to assistive technology.

#### Scenario: 255-character name

- GIVEN an option whose `full_name` is 255 characters
- WHEN the picker renders it
- THEN the visible label is clipped to the control's width
- AND the complete string is reachable without selecting the option
- BUT it must NOT wrap to multiple lines or widen the dialog
- AND IT MUST expose the full text to screen readers, not only on mouse hover

**Acceptance criteria:**
- [ ] AC.1 — a fixture pins a 255-character `full_name` (the measured upstream maximum)
- [ ] AC.2 — the accessible full text is asserted by test (attribute presence)
- [ ] AC.3 — **visual clipping is a declared gap** — see §6 D-4

---

### R-BPF-006 — Options are ordered by name *(PENDING USER CONFIRMATION — OQ-3)*

- **As a** Center Admin opening a 342-option list
- **I want** the list ordered by project name
- **So that** it does not open on a wall of numeric codes

**Details:** today options arrive in upstream order, which is why the first ten are all codes — this is exactly what the reported screenshot shows.

#### Scenario: Deterministic name order

- GIVEN the unfiltered picker option list
- WHEN it is rendered
- THEN options are ordered case-insensitively by `full_name`
- AND options without `full_name` sort by `short_name` in the same sequence, not clustered at either end
- BUT it must NOT change which options are returned, only their order
- AND IT MUST be stable — two calls with the same input produce the same order

**Acceptance criteria:**
- [ ] AC.1 — a test asserts the order over a fixture mixing present/absent `full_name`
- [ ] AC.2 — the returned *set* is unchanged (same ids, same count)

> **This requirement does not enter `tasks.md` until the user confirms it.** If declined, it is removed and recorded as a decision, not silently dropped.

---

## 4. Non-functional requirements

### NFR-BPF-001 — Additive response contract

- **Category:** compatibility
- **Target:** zero fields renamed, retyped, or removed from the picker response.
- **How verified:** controller spec asserting the whole item with `toEqual` (strict), so both an omission and an unexpected extra fail.

### NFR-BPF-002 — Accessible label

- **Category:** a11y
- **Target:** the composed label — and the full untruncated name — are exposed to assistive technology, not conveyed by visual truncation alone.
- **How verified:** client spec asserts the accessible text/attribute; the visual half is the §6 D-4 gap.

### NFR-BPF-003 — Response size

- **Category:** performance
- **Target:** the added fields grow the picker response by roughly **+40 KB** on the 342-row test feed (`full_name` on every row, `description` on 18.4%). Acceptable for an admin-only, cached, 5-minute-TTL endpoint. No new upstream call.
- **How verified:** code review that the projection reads already-fetched fields; the cache path is untouched.
- **Disqualifier:** if the implementation adds an upstream fetch to obtain these fields, this NFR fails regardless of response size.

---

## 5. Cross-system impact

| System | Impact |
| --- | --- |
| **CLARISA** | **None.** Both fields are already in the fetched payload (`dto/clarisa-project.types.ts:66,68`). No contract change, no new call. |
| **STAR client** | The picker component, its interface, and its spec. Same repo (monorepo) — no cross-repo edit. |
| **Schema / migrations** | **None.** |
| **OpenSearch / sockets / DynamoDB** | **None.** |
| **Admin SSR panel** | Untouched. It has its own picker and its own `clarisa_project_short_name` write — see OQ-2. |

---

## 6. Defect classes this spec can produce, and the gate for each

**A gate blind to the defect class this spec most often produces is not a gate.** The dominant class here is *the fix lands and nothing changes for the user* — which is precisely what an endpoint-only test would report as green.

| ID | Defect class | Gate | Can it actually fail? |
| --- | --- | --- | --- |
| **D-1** | Server returns the fields but the search still ignores `full_name` | Controller spec: name-only term must return the row | **Yes — proven.** Fails on `HEAD`: the predicate reads `short_name` only |
| **D-2** | Server search widened, client filter still drops the name matches → **user sees no change** | Client spec driving the **real** `Select` instance: set options carrying `full_name`, set the filter term, assert `visibleOptions()` | **Yes — observed red 2026-08-18.** `visibleOptions()` = `[]` for `"musasentinel"` on current code |
| **D-3** | A field silently renamed/dropped from the response | Controller spec with strict `toEqual` on the whole item | **Yes** — an omitted or extra key fails equality |
| **D-4** | The label renders wrong, overflows, or clips unreadably | **NO AUTOMATED GATE.** The overlay does not render in this jsdom harness (probed 2026-08-18: `show()` yields no `.p-select-option` nodes), and jsdom cannot measure layout | **Substitute: human visual check at the HITL pause** — open the dialog against CLARISA test and read the first ten options. Recorded as an accepted gap, not covered |
| **D-5** | Fixtures invented as `PROJ-1` instead of the real feed spellings (**KZ-001**) | Fixtures pinned to measured values: `A1806`, `B-A1080`, `C-A480`, plus a 255-char `full_name` | **Yes** — a Reviewer diff check; a fixture not drawn from `evidence/` fails review |
| **D-6** | A regression test that could never have been red (**K-004**) | Each regression test is run against `HEAD` **before** the fix and its failure output recorded verbatim in `execution.md` | **Yes** — a test that passes on `HEAD` is disqualified as evidence |

**On D-4 specifically:** the label *string* is behaviorally gated (the label function is a pure function under test). What is **not** gated is that the string reaches the DOM and clips correctly. Asserting `filterBy="short_name,full_name"` appears in the template would be a **presence-assertion** — it proves the attribute exists, not that a name search survives. D-2's instance-level test is the behavioral proof; the template attribute alone is not accepted as evidence for it.

---

## 7. Verification commands

| Check | Command | Notes |
| --- | --- | --- |
| Server unit | `npm test -- --silent` in `server/researchindicators/` | Coverage floor 60% |
| Client unit | `npm test -- --silent` in `client/research-indicators/` | Floors: stmts 40 / branches 20 / lines 45 / funcs 30 |
| Lint (server) | `npx eslint <paths>` | **K-001** — `npm run lint` carries `--fix` and cannot gate |
| Lint (client) | `npm run lint -- --quiet` | `ng lint` |
| Live feed | `python3 evidence/probe-picker-labels.py` | Re-measures the 342 rows; read-only |
| Visual (D-4) | Human, at the HITL pause | Not automatable in this harness |

**Disqualifier for every measured check:** a green run whose test never executed the changed path is not evidence. Each regression test must be shown failing on `HEAD` first; if a test cannot be made to fail, it is removed and the gap is recorded rather than counted as coverage.

---

## 8. Assumptions, dependencies, risks

| # | Item | Note |
| --- | --- | --- |
| A-1 | `full_name` stays 100% populated upstream | Measured 342/342 on test, 25/25 on prod (2026-08-18). If it regresses, R-BPF-004's fallback covers it |
| D-1 | **Production returns 0 rows for this picker** (phase 2026 = 0 of 299) | End-to-end verification is against **CLARISA test** only. Not a blocker — the defect and the fix are both observable there |
| R-1 | Landing one package without the other produces no visible change | R-BPF-003 exists precisely to make that failure a test failure rather than a silent one |
| R-2 | **KZ-001** — unfaithful fixtures | Pinned to `evidence/` measurements; see D-5 |
| R-3 | The snapshot column keeps storing codes, so the mapping **table** stays unreadable after this fix | Out of scope by design (OQ-2). Must be stated at handoff so it is a known gap, not a surprise |

---

## 9. Open questions

| ID | Question | Owner | Recommendation |
| --- | --- | --- | --- |
| **OQ-1** | Should `description` join the server-side search? | Juan | **No, not in v1** — 18.4% populated on test; `full_name` is 100% and does the work. Return the field, do not match on it |
| **OQ-2** | Should the `clarisa_project_short_name` **snapshot** store the name — and is STAR's omission (stored `NULL`, while the admin panel stores the code) intentional? | Juan + PRMS | **Its own change.** Touches stored data, the mapping-list search key, and a user-facing read path |
| **OQ-3** | Adopt **R-BPF-006** (order by name)? | Juan — **needed before `tasks.md`** | **Yes.** One comparator; it is the difference between a list that reads as names and one that opens on codes |

---

## 10. Requirement ID index

| ID | Title | Gate |
| --- | --- | --- |
| R-BPF-001 | Response carries `full_name` + `description` | D-3 |
| R-BPF-002 | Server search matches the name | D-1 |
| R-BPF-003 | Client filter does not discard server matches | **D-2** |
| R-BPF-004 | Option labelled code + name | D-4 (partial) |
| R-BPF-005 | Long name truncates and stays accessible | D-4 (partial) |
| R-BPF-006 | Ordered by name — *pending OQ-3* | — |
| NFR-BPF-001 | Additive contract | D-3 |
| NFR-BPF-002 | Accessible label | D-4 |
| NFR-BPF-003 | Response size, no new upstream call | review |

---

## 11. Sign-off

- [ ] Engineering lead — Juan Cadavid
- [ ] MEL / product owner — —
- [ ] Security review — n/a (read-path display only)
- [ ] DevOps — n/a (no infra, no migration)
