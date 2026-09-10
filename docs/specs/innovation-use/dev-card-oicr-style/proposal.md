# Proposal — Innovation Dev card in the OICR selected-card style

## 1. Document Control

| Field | Value |
| --- | --- |
| Spec path | `docs/specs/innovation-use/dev-card-oicr-style` |
| Slug | `dev-card-oicr-style` — derived from the free-text argument; placed under the `innovation-use/` module folder as a sibling of `dev-card-details`, per the §2 taxonomy |
| Type | **Change** |
| Depth (recommended) | **Lite** |
| Approval Mode | **gated** (default — no explicit pre-approval mandate given; see §14, this is worth changing given the deadline) |
| Depends on | `docs/specs/innovation-use/dev-card-details` — **agent-complete, not `done`**. Its T-10 is `[~]` deferred behind *this* spec by user decision |
| Parallel-safe | **no** — same component, same template, same spec file |
| Origin | QA review with the user, 2026-09-10. Recorded as `RB-7` in the parent spec |
| Deadline | **Tonight (2026-09-10)**, user-stated |

---

## 2. Intent

Make the selected Innovation Dev card look and behave like the **"OICR selected"** card already shipping in the OICR creation modal, so the two "you picked an existing result" surfaces read as one system.

---

## 3. Problem / Current Behavior

`dev-card-details` shipped the card as **prose** — title + anchor, an unlabelled description, then a wrapped row of `Readiness level: X` / `Geographic scope: Y`. That was `DD-6`/`DD-7`'s deliberate choice, and `R-IUC-003` was written against it.

QA reviewed it against the OICR modal and asked for the established pattern instead. Three gaps, beyond styling:

1. **No way to clear the selection.** The picker is single-select and `select.component.html:34` hard-sets `[showClear]="false"`, so a user who picks the wrong result cannot unpick it.
2. **A long description is unreadable.** It is CSS-clamped to three lines with no way to expand.
3. **Two fields QA expects are absent** — the result's status and its reporting year.

---

## 4. Proposed Outcome

The card renders in the OICR pattern, top to bottom:

```
◷ INNOVATION DEVELOPMENT                                                    ⊗
<platform>-<code> - <title>
<description, clamped, with "See more" / "See less">
[STATUS]  Innovation Dev level → 7  |  Reporting year → 2024  |  Geographic scope → Global
```

- **The description sits between the title and the metadata row** (user, 2026-09-10).
- The **⊗** clears the selection; it remains **single-select**, unchanged in every other respect.
- **See more / See less** expands and re-collapses the description in place.

---

## 5. Scope

| # | Change | Where | Size |
| --- | --- | --- | --- |
| 1 | Template restructured to the OICR pattern | `innovation-use-details.component.html` | M |
| 2 | Carry `result_status` and `year` from the picker option into `linked_innovation_dev` | `innovation-use-details.component.ts` + `get-innovation-use-details.interface.ts` | S |
| 3 | Clear-selection **⊗** | the card's own control, or `showClear` on the select | S |
| 4 | See more / See less toggle | `innovation-use-details.component.ts` (one signal) + template | S |
| 5 | Hex → token substitution for every colour in the pattern | template | S |

---

## 6. Non-Goals

- **No server change.** See §9 — this is the finding that makes the deadline realistic.
- No change to `link-results`, the picker's query, or the save payload.
- No multi-select. The user was explicit: *"sigue siendo una sola selección"*.
- Not fixing `GetGeoFocusService`'s missing code 3 (`OQ-5`, still out of scope).
- Not touching `oicr-form-fields.component.html` itself — we copy its *pattern*, not its code, and its 11 hex literals stay its own problem.

---

## 7. Affected Users, Systems, And Specs

| | |
| --- | --- |
| Users | Anyone linking an Innovation Dev result from the Innovation Use section |
| Code | `innovation-use-details.component.{html,ts,spec.ts}` · `get-innovation-use-details.interface.ts` · possibly `select.component.html` |
| Specs | **`dev-card-details`** — this supersedes `DD-6`/`DD-7` and rewrites T-07's markup, T-08's contrast targets, and **T-10's deferred checklist**, whose *"reads as prose"* item is already marked superseded by `RB-7` |

---

## 8. Visual Reference

- **Source:** QA screenshots supplied by the user, 2026-09-10.
- **Location:** `docs/specs/innovation-use/dev-card-oicr-style/mockup/` — three PNGs: the OICR card in isolation, the full OICR creation modal for context, and a close-up of the metadata row.
- **Live reference implementation:** `client/research-indicators/src/app/shared/components/custom-fields/oicr-form-fields/oicr-form-fields.component.html` (the `#rows` template, ~`:72-100`).
- **Field mapping, per the user:** `Maturity level` → **Innovation Dev level**; `Reporting year` → **kept as-is**; `CGSpace link` → **Geographic scope**.

---

## 9. 🔑 The finding that sizes this change: it is 100% client-side

Two of the six fields QA wants — **status** and **year** — are not in the endpoint `dev-card-details` shipped. That looked like a server change. It is not: **both are already on the picker option the component reads today.**

`Result` (`shared/interfaces/result/result.interface.ts`) carries `result_status?: ResultStatus` and `year?: string`, and `onInnovationDevSelected` already receives that object — it simply discards both when it builds the four-key literal.

| Field | Source | Already available? |
| --- | --- | --- |
| Title, code, platform | picker option | ✅ |
| **Status badge** | picker option `result_status` | ✅ **discarded today** |
| **Reporting year** | picker option `year` | ✅ **discarded today** |
| Innovation Dev level | `GET …/innovation-dev-card/:id` | ✅ shipped |
| Description | same endpoint | ✅ shipped |
| Geographic scope | same endpoint | ✅ shipped |

**No new endpoint, no DTO change, no migration.** The server work is done.

---

## 10. Requirement Delta Preview

### ADDED

- The card shows a **status badge** and a **reporting year**.
- A **⊗ control clears the selection**, returning the section to "no link".
- The description gets **See more / See less**.

### MODIFIED

- **`R-IUC-003`** — the card renders as a **metadata row**, not prose. This reverses `DD-6`/`DD-7`.
- **`R-IUC-004`** — the clamp gains an expand affordance; the full text must still be in the DOM (unchanged, and still a `DD-6` prohibition on character truncation).
- **`NFR-IUC-002`** — the contrast set changes; see §12.
- **`R-IUC-005`'s neighbour**: the description **moves above** the metadata row. *Recorded as a decision change:* earlier today the user placed it **below**; this proposal takes the later instruction.

### REMOVED

- The `Readiness level:` / `Geographic scope:` **label spans** in their current form, and with them T-08's assertions that target those exact elements.

---

## 11. Approach Options

| | Option | Trade-off |
| --- | --- | --- |
| **A** ✅ | **Restyle in place** — rewrite this card's markup to the pattern, map hex→token, add the two fields, the ⊗ and the toggle | Smallest diff, no new shared component, no blast radius. Duplicates the pattern's markup a second time in the codebase |
| B | **Extract a shared `<app-selected-result-card>`** and use it in both the OICR modal and here | Removes the duplication and would let the OICR card's 11 hex literals be fixed at the same time. **Rejected for tonight:** it changes a shipping OICR surface, needs its own regression pass, and cannot be done safely by this evening |
| C | Copy the OICR markup verbatim, hex and all | Fastest to type, but imports 11 hex literals against §4.2 and re-imports a known AA defect. **Rejected** |

**Recommended: A**, with B recorded as the follow-up if the duplication ever bites a third time.

---

## 12. Risks, Dependencies, And Open Questions

### 🔴 R-1 — Half the pattern's palette fails AA on this card's fill

Every hex in the OICR pattern maps to an **exact existing token** — so §4.2 compliance is a mechanical substitution, and there is no new token to design:

| Hex | Token | Ratio on `--ac-grey-100` | AA 4.5 | AA-large 3.0 |
| --- | --- | --- | --- | --- |
| `#4c5158` | `--ac-grey-800` | **7.44** | ✅ | ✅ |
| `#345b8f` | `--ac-primary-blue-300` | **6.42** | ✅ | ✅ |
| `#358540` | `--ac-green-500` | 4.26 | ❌ | ✅ |
| `#777c83` | `--ac-grey-700` | 3.91 | ❌ | ✅ |
| `#1689ca` | `--ac-light-blue-300` | 3.57 | ❌ | ✅ |
| `#8d9299` | `--ac-grey-600` | **2.91** | ❌ | ❌ |
| `#f58220` | `--ac-orange-1` | 2.41 | ❌ | ❌ |
| `#b9c0c5` | `--ac-grey-400` | 1.71 | ❌ | ❌ |

**Six of eight fail AA.** The eyebrow's 2.91:1 is the pair `dev-card-details`' T-08 uses as its *failure* case, and ≈ the defect child #3 shipped live.

Per the standing ruling — *visual consistency wins over WCAG AA; state the ratio, then apply* — this is **not proposed as a blocker**. But it must be an explicit, dated decision, because it **rewrites `NFR-IUC-002`**, a requirement that currently passes. `/akili-specify` should record either "the pattern is adopted as-is, AA relaxed for these roles" or "these three roles use `--ac-grey-800` instead", and T-08's tests follow that decision rather than contradicting it.

### Other risks

| # | Risk | Mitigation |
| --- | --- | --- |
| R-2 | The **⊗** has no existing path — `showClear` is hard-`false`, and clearing must set `linked_innovation_dev: null` **and** reset T-09's `enrichmentSuccessForId`, or a re-pick of the same id silently no-ops | Specify the clear path explicitly; T-09's flag is the non-obvious half |
| R-3 | **See more / See less** is new interaction state in a component whose tests are DOM-presence only under jsdom | One signal; assert both states in the DOM. The *visual* clamp remains T-10's |
| R-4 | T-08's contrast tests **target elements this change deletes** | Expected. They get rewritten with the new roles, not deleted silently |
| R-5 | `result_status` shape is `ResultStatus`, not a string — the badge needs its label and colour mapping | Check what the OICR card does with it; likely the same lookup |
| R-6 | Deadline is tonight, and the parent spec averaged **2.2 review rounds per task** | Lite depth, one task per §5 row, and consider `pre-approved` mode (§14) |

### Open questions

| # | Question | Needed by |
| --- | --- | --- |
| OQ-1 | Does the badge show the **result status** (`PUBLISHED`…) as in the OICR card, or the Innovation Dev **readiness**? The user said "status", and the mockup shows `PUBLISHED` | Before the template task |
| OQ-2 | With a **null** field — no readiness, or no geo scope — does its `Label → value` pair disappear, or render a dash? The OICR card never shows an empty one | Before the template task |
| OQ-3 | Does **⊗** clear immediately, or confirm first? | Before the clear task |

---

## 13. Success Criteria

- The card matches the mockup: eyebrow, title, description with See more/See less, then `status | level | year | geo scope`.
- ⊗ clears the selection; the section returns to "no link" and a fresh pick works, **including re-picking the same result**.
- Long descriptions expand and re-collapse; the full text is in the DOM at all times.
- Every colour is a token — **zero hex literals** in the touched template.
- The client suite stays green (currently **317 suites / 6951 tests**) and `npm run build` exits 0.
- `dev-card-details`' **T-10 can then run once**, against this final design — which is why it was deferred.

---

## 14. Next Step

```text
/akili-specify docs/specs/innovation-use/dev-card-oicr-style
```

Two things to settle at that gate, both about speed:

1. **Approval Mode.** This proposal records `gated`. Given tonight's deadline, **`pre-approved` is worth granting** — it auto-passes the routine continue gates while still stopping for a HALT, a Pivot, a budget tripwire or a `FATAL_FAIL`. Those are exactly the cases nobody can pre-approve.
2. **`OQ-1` and `OQ-2`** are the only two answers that block the template task. Everything else can be decided in flight.
