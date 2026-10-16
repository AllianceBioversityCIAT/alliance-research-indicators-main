# Requirements — Innovation Dev card in the OICR selected-card style

## 1. Document Control

| Field | Value |
| --- | --- |
| Spec path | `docs/specs/innovation-use/dev-card-oicr-style` |
| Type | **Change** · Depth **Lite** |
| Approval Mode | `gated` — **the three phase gates were collapsed into one** for the stated tonight deadline; recorded as a deviation, not skipped |
| Proposal | [`./proposal.md`](./proposal.md) |
| Depends on | `innovation-use/dev-card-details` — agent-complete; its **T-10 is deferred behind this spec** |
| Supersedes | `dev-card-details` `DD-6`, `DD-7`, and `NFR-IUC-002` **for the metadata-row roles only** |
| Date | 2026-09-10 |

---

## 2. Executive Summary

The selected Innovation Dev card adopts the **"OICR selected"** pattern already shipping in the OICR creation modal: eyebrow, bold title, description with an expand affordance, then a single metadata row — **status · level · year · geographic scope** — plus an **⊗** to clear the selection.

**All data already exists client-side.** No server change.

---

## 3. Glossary

| Term | Meaning |
| --- | --- |
| **The card** | The "selected Innovation Dev result" block inside the Innovation Use section's `RELATED INNOVATION DEVELOPMENT` area |
| **The pattern** | The selected-result card in `oicr-form-fields.component.html`'s `#rows` template |
| **Metadata row** | The single line of `Label → value` pairs separated by `\|` |

---

## 4. Scope

**In:** the card's markup, the two picker fields it currently discards, the clear control, the expand affordance, and the colour tokens.

**Out:** the server, the picker's query, multi-select, the save payload, `GetGeoFocusService`, and `oicr-form-fields.component.html` itself.

---

## 5. Functional Requirements

### R-OICR-001 — The card renders the OICR pattern

The card **SHALL** render, in order: an eyebrow row, the title, the description, then one metadata row.

#### Scenario: A fully populated result is selected

- **GIVEN** an Innovation Dev result with a status, a readiness level, a reporting year, a geographic scope and a description
- **WHEN** the user selects it in the picker
- **THEN** the card shows an eyebrow (icon + `INNOVATION DEVELOPMENT`), the title as `<platform>-<code> - <title>`, the description, and one metadata row
- **AND** the row reads `[status] · Innovation Dev level → <n> · Reporting year → <year> · Geographic scope → <name> · Innovation detail → <link>`
- **AND IT MUST** keep the **`View innovation detail ↗` anchor** as that fourth pair, with its href, its text and its accessible name **unchanged** — `dev-card-details` `R-IUC-003` AC.6 still binds
- **AND IT MUST** place the description **between the title and the metadata row**
- **BUT it must NOT** render a `CGSpace link` pair, or a `Maturity level` label — those are the OICR card's fields, replaced here
- **BUT it must NOT** remove the anchor. **Gap closed 2026-09-10:** the OICR pattern has no anchor and its link slot is taken by the geographic scope, so the target design was **silent** on where ours goes. An Implementer deleted it. The user's ruling: **it stays, as the row's fourth pair** — the same shape the OICR card used for its CGSpace link

#### Scenario: A field is absent

- **GIVEN** a selected result whose geographic scope is null
- **WHEN** the card renders
- **THEN** that `Label → value` pair is **absent entirely**
- **AND IT MUST** leave no empty label, no dash, and no separator stranded beside it
- **BUT it must NOT** collapse or hide the pairs that do have values

### R-OICR-002 — The status badge is data-driven

The card **SHALL** render the selected result's own status.

#### Scenario: A non-published result is selected

- **GIVEN** a selected Innovation Dev result whose status is not `Published`
- **WHEN** the card renders
- **THEN** the badge shows **that result's** status name and its **server-supplied** colours
- **AND IT MUST** use the same mechanism the platform already uses for a linked result's status
- **BUT it must NOT** hardcode a status literal or a colour — the OICR card hardcodes `Published` because every OICR in its list is published, and that assumption does not hold here

### R-OICR-003 — The selection can be cleared

The card **SHALL** offer an **⊗** control that clears the selection.

#### Scenario: The user clears a selection and picks again

- **GIVEN** a selected result whose card is showing
- **WHEN** the user activates **⊗**
- **THEN** the selection is cleared and the section returns to its no-link state
- **AND** the picker accepts a new selection immediately
- **AND IT MUST** allow **re-selecting the same result that was just cleared** and have its card render fully
- **BUT it must NOT** become multi-select, require a confirmation step, or leave the previous result in the save payload

### R-OICR-004 — A long description can be read in full

The card **SHALL** offer **See more / See less** when the description is clamped.

#### Scenario: A 400-character description

- **GIVEN** a selected result with a 400-character description
- **WHEN** the card renders
- **THEN** the description is clamped and a **See more** affordance is offered
- **AND** activating it reveals the full text, and offers **See less** to re-collapse
- **AND IT MUST** keep the **complete text in the DOM in both states**
- **BUT it must NOT** truncate by character count — that removes text from the DOM (inherited prohibition, `dev-card-details` `DD-6`)

---

## 6. Non-Functional Requirements

### NFR-OICR-001 — Token discipline

Every colour **MUST** be an existing `--ac-*` token. **Zero hex literals** in the touched template.

### NFR-OICR-002 — Contrast: the pattern is adopted as-is, with the ratios recorded

**User ruling 2026-09-10:** *"si en el componente se usa debes usarlo porque anteriormente fue aprobado."*

Each role takes the token equal to the colour the OICR card already ships. Measured against the card's `--ac-grey-100` fill:

| Role | Token | Ratio | AA 4.5 |
| --- | --- | --- | --- |
| Title, description | `--ac-grey-800` | **7.44** | ✅ |
| Metadata values | `--ac-primary-blue-300` | **6.42** | ✅ |
| Metadata labels | `--ac-grey-700` | 3.91 | ❌ (AA-large ✅) |
| Eyebrow | `--ac-grey-600` | 2.91 | ❌ |
| Separator `\|` | `--ac-grey-400` | 1.71 | ❌ |
| Eyebrow icon | `--ac-orange-1` | 2.41 | ❌ |

**This supersedes `dev-card-details`' `NFR-IUC-002` for these roles.** The description keeps `--ac-grey-800` and remains AA either way. The figures are recorded **because the trade was accepted**, so a later auditor sees the number and the decision together — not as an objection.

---

## 7. Defect classes and their gates

| # | Defect this spec can produce | Gate |
| --- | --- | --- |
| DC-1 | A field renders an empty label / stranded separator when null | `npm test` — DOM-absence assertion per field |
| DC-2 | The badge hardcodes a status or colour, so every result reads `Published` | `npm test` — assert a **non-published** fixture renders its own name |
| DC-3 | Clearing leaves stale state, so re-picking the same result silently no-ops | `npm test` — clear, re-select the **same** id, assert the card renders |
| DC-4 | See more/less truncates instead of clamping, removing text from the DOM | `npm test` — assert the full string is present **in both states** |
| DC-5 | A hex literal survives the substitution | `grep -c '#[0-9a-fA-F]\{6\}'` on the template → **0** |
| DC-6 | 🔴 **The card looks wrong** — spacing, wrapping, alignment, the clamp's visible effect | **NO AUTOMATED GATE.** jsdom does not lay out, and this build has **no Tailwind** — the utilities come from a runtime CDN script that never executes under the harness. **Substituted by `dev-card-details`' deferred T-10**, run once against this final design, in both themes |

**DC-6 is why T-10 was deferred.** It is the dominant defect class for a restyle and it has no automated check; the substitute is named, not assumed.

---

## 8. Requirement ID Index

| ID | Behavior | Gated by |
| --- | --- | --- |
| `R-OICR-001` | The OICR pattern, description between title and row | DC-1, DC-6 |
| `R-OICR-002` | Data-driven status badge | DC-2 |
| `R-OICR-003` | Clear the selection with ⊗ | DC-3 |
| `R-OICR-004` | See more / See less | DC-4, DC-6 |
| `NFR-OICR-001` | Zero hex literals | DC-5 |
| `NFR-OICR-002` | Contrast adopted as-is, ratios recorded | — (decision, not a gate) |
