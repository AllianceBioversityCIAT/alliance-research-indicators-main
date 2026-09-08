# Proposal — Bugfix: the bilateral project picker shows codes, not names

> **Headline:** the CLARISA project picker renders `A1463`, `B-A1080`, `C-A480`. Measured live on 2026-08-18: **342 of 342** options have a `short_name` that is a bare code — **not 1 contains a space**. Every one of them also has a `full_name`, populated **342/342**, that the API never returns.
>
> **Three layers, all keyed on `short_name`** — the response projection, the server-side search, and the client label + filter. Fixing any one alone changes nothing the user can see.
>
> **The correct pattern already ships 40 lines above the broken one.** The AGRESSO picker in the same template renders `A123 — description` and searches both fields. This bugfix makes the CLARISA picker match its neighbour.

---

## 1. Document Control

| Field | Value |
| --- | --- |
| **Spec path** | `docs/specs/bugfix/bilateral-picker-fields/` |
| **Type** | **Bug** |
| **Approval Mode** | `gated` (no end-to-end mandate given) |
| **Depth (recommended)** | **Lite**, in **Bug Mode** — regression test mandatory |
| **Depends on** | none — **unblocked** |
| **Blocks** | `docs/specs/bilateral/clarisa-automapper-s2/` §9 — S2's review queue renders the same project identity |
| **Parallel-safe** | **no** vs. S2 (shares the CLARISA projects client); **yes** vs. anything outside `clarisa/projects` + `bilateral-mapping` |
| **Evidence** | Live probe of both CLARISA hosts, 2026-08-18 — `evidence/probe-picker-labels.py`, `evidence/probe-field-population.py`. Code read at the cited lines |
| **Orchestration** | Not used. The user offered `agy`/Orca; a proposal is authorship, not fan-out, and the diagnosis is read directly from cited lines rather than inferred. Delegation Ceiling applies — `/akili-execute` is where workers earn their spawn |

---

## 2. Intent

Make the picker show what a human can recognise, and make typing a project's name find it.

---

## 3. Problem / Current Behavior

The Center-Admin bilateral mapping dialog asks the user to pick a CLARISA project from 342 options labelled like this:

```
A1463
A1796
A1805
A1806
A411
A516
A549
```

That is the *literal first page* of the live list, in upstream order — it reproduces the reported screenshot exactly. Typing a project's name matches nothing, because the search only ever compares `short_name`.

---

## 4. Bug Diagnosis

### Observed Symptom

The CLARISA project dropdown lists opaque codes. The user cannot tell which project is which, and cannot search by name. With 342 options the control is unusable. Only **4** mappings exist in total, all `MANUAL` — consistent with a control nobody can complete, though the record does not say which surface created them.

### Reproduction Steps

| | |
| --- | --- |
| **Environment** | STAR client → `administration/center-admin/bilateral-mapping`, server pointed at CLARISA test |
| **Steps** | Open **New mapping** → open the **CLARISA Project** dropdown → type any project name |
| **Expected** | Options readable as project names; typing a name narrows the list |
| **Actual** | Options are codes (`A1463`, `B-A1080`, `C-A480`); typing a name yields *"Type to search projects…"* |

Deterministic: `python3 evidence/probe-picker-labels.py` prints the same first ten labels the UI renders.

### Measured evidence (live, 2026-08-18)

| | CLARISA **test** | CLARISA **prod** |
| --- | --- | --- |
| Upstream rows | 1365 | 299 |
| Bilateral + Alliance | 367 | 25 |
| **+ phase 2026 — what the picker shows** | **342** | **0** |
| `short_name` is a bare code | **342 / 342 — 100%** | 0 / 25 |
| `short_name` contains a space | **0 / 342** | 25 / 25 |
| `full_name` populated | **342 / 342 — 100%** | 25 / 25 |
| `description` populated | 63 / 342 — 18.4% | 24 / 25 — 96% |

`short_name` shapes across all 342: `@-@###` ×216, `@-@####` ×92, `@###` ×30, `@####` ×4. These are the same `{B-, C-}` centre-prefix codes S1 measured on `external_code`. Lengths run **4–7 characters**; `full_name` runs up to **255**.

> **Correction against an earlier note.** A first pass matched only `^[A-Z]{0,2}\d{2,6}$` and reported 9.9%. That regex misses `B-A1080`. The shape histogram is the authority: **100%**.

### Root Cause (confirmed) — three layers, all keyed on `short_name`

| # | Layer | Location | What it does |
| --- | --- | --- | --- |
| **1** | Response projection | `clarisa-projects.controller.ts:84-105` | Projects 7 fields. `full_name` and `description` are declared on `ClarisaProject` (`dto/clarisa-project.types.ts:66,68`) and **do arrive from upstream** — the projection drops them |
| **2** | Server-side search | `clarisa-projects.controller.ts:70` | `all.filter(p => p.short_name?.toLowerCase().includes(needle))` — one field |
| **3** | Client label + filter | `bilateral-mapping.component.html:339-360` | `optionLabel="short_name"`, `filterBy="short_name"`, no `item`/`selectedItem` template. `ClarisaBilateralProjectOption` (`bilateral-project-mapping.interface.ts:56-61`) has no `full_name`/`description` |

**The coupling that makes a partial fix invisible.** PrimeNG 19.0.6 `p-select` filters the options array **internally** whenever a filter value is set — `primeng-select.mjs:1674-1683` calls `filterService.filter(options, this.searchFields(), …)`, where `searchFields()` (line 2397) is `filterBy.split(',')`. `(onFilter)` is emitted *in addition* to that (line 2428-2432), never instead of it.

So the client re-filters whatever the server returns. Widen the server search alone and every row matched on `full_name` is discarded client-side before it renders — **a correct server fix produces no observable change**. Layers 1–3 must land together.

### The exemplar is already in the file

The AGRESSO picker, 40 lines above the broken one in the same template:

| | AGRESSO picker (`html:285-318`) | CLARISA picker (`html:339-360`) |
| --- | --- | --- |
| Label | `agressoOptionLabel()` → `A123 — description` | `optionLabel="short_name"` → `A1463` |
| `item` / `selectedItem` templates | present, with `[title]` tooltip | **absent** |
| Client `filterBy` | `agreement_id,description` | `short_name` |
| DTO carries the label field | `description` ✅ | `full_name` ❌ |

### Impact & Scope

**In the picker** — the control is unusable, and manual mapping is blocked today.

**Beyond the picker — recorded, not fixed here.** `clarisa_project_short_name` is a **snapshot column** (`varchar(500)`, migration `1779190000011`, *"Snapshot at mapping time (D-PI-11)"*), and the same code-not-name value propagates:

| Where | Behavior |
| --- | --- |
| STAR create flow (`bilateral-mapping.component.ts` `handleCreate`) | Does **not** send it → stored `NULL` → the mapping table renders `id 123` |
| Admin SSR panel (`BilateralProjectMappings.tsx:215,220`) | **Does** send it → stores the code |
| Mapping list search (`bilateral-project-mapping.service.ts:56`) | `clarisa_project_short_name LIKE :s` — searching stored codes |
| Pool-funding alignment read (`bilateral.service.ts:205,325`) | Surfaces the stored value to end users |

That is a **data** decision (what a snapshot should capture), not a display one. It belongs in its own change — see OQ-2.

**No security or integrity implication.** Read-path display and filtering only; the fix adds fields and widens a match.

### Fix Strategy

Not cosmetic — it changes a response contract, a match predicate, and a filter. Route: **`/akili-specify` (Lite) in Bug Mode**, with a regression test that is **red before the fix**.

Per **K-010**, the red-before-green evidence belongs to the tasks that change the *buggy* code paths — the controller projection/search and the picker template — never to a new helper, whose tests are green from first compile.

---

## 5. Proposed Outcome

- The dropdown renders `A1463 — MRBOT- Partnership for further development…`, truncated with the full string in a `title` tooltip.
- Typing `MusaSentinel` finds `A1806`.
- `description` is returned and available, without being load-bearing for the label.
- The two pickers in the dialog behave the same way.

---

## 6. Scope

| In | Out |
| --- | --- |
| Add `full_name` + `description` to the picker response (**additive only**) | The `clarisa_project_short_name` snapshot column semantics — OQ-2 |
| Widen the server `search` to `short_name` + `full_name` | The auto-mapper (S2) |
| Client label via `item`/`selectedItem` templates, mirroring the AGRESSO picker | Redesigning the mapping dialog |
| Client `filterBy="short_name,full_name"` + interface fields | The phase / Alliance selector (shipped, archived 2026-08-14) |
| Regression test, red before the fix | The admin SSR panel's own picker |

---

## 7. Non-Goals

- Not changing what is **stored** — only what is **shown** and **searched**.
- Not making `description` part of the primary label: 18.4% populated on test.
- Not touching the phase filter, the Alliance predicate, or the cache.

---

## 8. Affected Users, Systems, And Specs

| | |
| --- | --- |
| **Users** | `CENTER_ADMIN`, `SYSTEM_ADMIN` — the only people who can open this dialog |
| **Server** | `domain/tools/clarisa/projects/clarisa-projects.controller.ts` (+ spec) |
| **Client** | `bilateral-mapping.component.{html,ts,spec.ts}`, `interfaces/bilateral/bilateral-project-mapping.interface.ts` |
| **Schema** | **none** |
| **Specs** | Unblocks `bilateral/clarisa-automapper-s2` §9. Follows `archive/2026-08-14-bugfix--bilateral-alliance-selector` |

---

## 9. Visual Reference

- **Source:** None — no Figma, no mockup requested.
- **Location:** n/a.
- **Notes:** No new UI is designed. The target rendering is an existing shipped control — the **AGRESSO picker at `bilateral-mapping.component.html:285-318`** — which is a stronger reference than a mockup: it is already token-compliant, already accessible, and already reviewed. The defect itself is evidenced by `evidence/probe-picker-labels.py`, whose first ten labels reproduce the reported screenshot in order.

---

## 10. Approach Options

### Option A — Mirror the AGRESSO picker across all three layers ✅ *recommended*

| | |
| --- | --- |
| ✅ | The only option that produces an observable change, given the PrimeNG coupling |
| ✅ | Copies a shipped, reviewed pattern from the same file rather than inventing one |
| ✅ | Response change is **purely additive** — no field renamed, retyped, or removed |
| ⚠️ | Touches both packages, so it is one spec with a server task and a client task |

### Option B — Client-only: `optionLabel="full_name"`

| | |
| --- | --- |
| ❌ | **Impossible.** The field is not in the payload — layer 1 drops it |
| ❌ | Even with the field, search stays `short_name`-only on the server |

### Option C — Server-only: return the fields and widen the search

| | |
| --- | --- |
| ⚠️ | The tempting option, and the one that looks done and isn't |
| ❌ | `filterBy="short_name"` re-filters client-side (`primeng-select.mjs:1674-1683`) and drops every name match. **The user sees no change** |

---

## 11. Recommended Approach

**Option A.** The three layers are one defect wearing three hats, and the PrimeNG filter behavior means partial delivery is indistinguishable from no delivery — which is exactly the failure mode that burns rework attempts, because the gate passes while the artifact stays broken.

Two implementation notes worth carrying into `design.md`:

1. **Label shape:** `short_name — full_name`, with the full string in a `[title]` tooltip and CSS truncation. `full_name` reaches 255 characters; the code stays as the leading token because the mapping table and AGRESSO side still speak in codes.
2. **`description` is returned but not load-bearing.** 18.4% populated on test, 96% on prod. Return it (cheap, additive); do not put it in the label, and see OQ-1 for whether it joins the search.

---

## 12. Risks, Dependencies, And Open Questions

| ID | Risk | Mitigation |
| --- | --- | --- |
| **R-1** | **Production returns 0 rows** for this picker (phase 2026 = 0 of 299) — no end-to-end production verification is possible until PRMS promotes | Verify against CLARISA **test**, where all 342 rows are live. State the limit in the spec rather than implying prod coverage |
| **R-2** | **KZ-001** — fixtures invented as `PROJ-1` would not represent the real feed | Pin fixtures to measured spellings: `B-A1080`, `C-A480`, `A1463`, and a `full_name` at the 255-char boundary |
| **R-3** | One side lands without the other → no observable change, read as a failed fix | The regression test must assert the **rendered label and the filter result**, not just the response body |
| **R-4** | `description` treated as reliably present (96% on prod) and made load-bearing | Non-goal in §7; the label never depends on it |
| **R-5** | Snapshot column keeps storing codes, so the mapping **table** stays unreadable even after the picker is fixed | Out of scope by design — OQ-2. Say so in the spec so it is a known gap, not a surprise |
| **K-004** | A regression test written from the fix's own frame that could never have been red | Prove it: run it against `HEAD` before the fix and record the failure output verbatim |
| **K-010** | Red-before-green assigned to a new helper instead of the changed path | Assign it to the controller task and the picker task |

### Open questions

| ID | Question | Recommendation |
| --- | --- | --- |
| **OQ-1** | Should `description` join the server-side search alongside `short_name` + `full_name`? | **No, not in v1.** 18.4% coverage on test means it helps rarely and adds match noise; `full_name` is 100% populated and does the work. Revisit if users ask |
| **OQ-2** | Should the `clarisa_project_short_name` **snapshot** store the name too — and is the STAR create flow's omission (stored `NULL`) intentional, given the admin panel does send it? | **Its own change.** It touches stored data, the mapping-list search key, and a user-facing read path. Propose separately once this fix lands |
| **OQ-3** | Sort the 342 options by `full_name`? Today they arrive in upstream order, which is why the codes cluster at the top | **Yes, worth including** — it is one comparator and it is the difference between a list that reads as names and one that opens on codes. Confirm with the user |

---

## 13. Success Criteria

- [ ] The picker's first ten options render as `code — project name`, verified against the CLARISA test feed
- [ ] Typing `MusaSentinel` returns `A1806`; typing `A1806` still returns it
- [ ] The response gains `full_name` and `description` with **no** existing field renamed, retyped, or removed
- [ ] A regression test observed **failing** on `HEAD` before the fix, passing after — output recorded verbatim
- [ ] The CLARISA picker and the AGRESSO picker behave identically w.r.t. label, tooltip, and multi-field search
- [ ] `npx eslint` clean on the touched paths; server and client suites green (K-001 — `npm run lint` carries `--fix` and cannot gate)

---

## 14. Next Step

```
/akili-specify bugfix/bilateral-picker-fields
```

**Lite depth, Bug Mode.** The root cause is confirmed and cited; specify converts it into the fix plan plus the mandatory regression test.

Sequence unchanged from the S2 proposal §11 — this is step 1, and it is the only step not waiting on PRMS:

```
1. bugfix/bilateral-picker-fields   ← here
2. PRMS promotes external_code to production
3. re-run the S1 probe               ← re-measure, do not assume
4. bilateral/clarisa-automapper-s2
```
