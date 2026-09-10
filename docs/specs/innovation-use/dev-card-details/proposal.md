# Proposal — Innovation Dev card details (readiness, description, geo scope)

> **The answer first:** the linked-Innovation-Development card on the Innovation Use page shows only
> *code + title*. A reviewer asked for three more read-only fields on it. All three exist in the
> database today; none are on the wire. The change is **additive on one contract** and needs a
> **dedicated query** rather than widening the shared `findAndDetails`.

---

## Document Control

| Field | Value |
| --- | --- |
| Slug | `dev-card-details` — derived from the `/akili-propose` argument `innovation-use-dev-card-details`; the `innovation-use` prefix is the module folder, not part of the child slug |
| Spec path | `docs/specs/innovation-use/dev-card-details/` |
| Parent Spec | `docs/specs/innovation-use/` (family manifest, child row **#5**) |
| Type | **Change** |
| Approval Mode | **gated** |
| Depends on | none — family children 1–4 are `done` + archived |
| Parallel-safe | **no** — re-touches `result-innovation-use.service.ts` and `innovation-use-details.component.*`, the two files any other Innovation Use change also touches |
| Source of intent | Reviewer comment, quoted verbatim in §Intent. No Jira ticket, no Figma. Two scope questions resolved by the user 2026-09-10 (see §Scope) |
| Branch in flight | `AC-1679-Create-the-innovation-use-section` |
| Created | 2026-09-10 |
| Escalated from | `/akili-quick` — triviality gate **failed** on three criteria (see §Why this is not a quick change) |

---

## Intent

A reviewer of the Innovation Use module wrote:

> *"In terms of additional details to show in the card, I would say for sure the readiness level and
> the innovation short description; potentially, it would also be useful to include the geographic
> scope."*

The "card" is the confirmation card rendered under the **RELATED INNOVATION DEVELOPMENT** picker once
an Innovation Development output has been linked — delivered by family child #4
(`link-innovation-dev`, archived 2026-09-09).

Note the reviewer's own weighting, which this proposal preserves: readiness level and short
description are **"for sure"**; geographic scope is **"potentially"**. The third field is therefore
scoped in, but flagged as the one a product owner could still drop without invalidating the change.

---

## Problem / Current Behavior

`innovation-use-details.component.html:196-211` renders the card from `formatInnovationDevLabel()`,
which produces `STAR 19707 - Climate Information Services Dissemination System Sanchez` and nothing
else. To learn *anything* about the innovation they just linked, the reporter must click
**View innovation detail ↗**, which opens the Innovation Development result in a new tab.

The server side is the binding constraint. `ResultInnovationUseService`
(`result-innovation-use.service.ts:601-621`) builds the payload with exactly four sub-keys:

```ts
linked_innovation_dev: innovationDevLink
  ? {
      result_id: innovationDevLink.other_result.result_id,
      result_official_code: innovationDevLink.other_result.result_official_code,
      title: innovationDevLink.other_result.title ?? null,
      platform_code: innovationDevLink.other_result.platform_code ?? null,
    }
  : null,
```

None of the three requested fields is present, and the query that feeds it cannot supply them:
`LinkResultsService.findAndDetails` (`link-results.service.ts:33-54`) loads `other_result` with
`relations: { indicator: true, result_status: true }` only.

### Why this is not a quick change

The `/akili-quick` triviality gate failed on three independent criteria:

| Criterion | Why it failed |
| --- | --- |
| No data / API / contract change | `linked_innovation_dev` is a documented contract (`R-IUL-007` from child #4, with explicit present-vs-absent and `undefined → null` coercion rules). Adding sub-keys changes it. |
| No behavior change | New server relations and a new read path — not markup. |
| Small and local (≤ ~20 LOC, one file) | Two packages: server service + DTO + specs, client interface + template + specs. |

---

## Proposed Outcome

A reporter who has linked an Innovation Development output sees, **on the card, without navigating
away**:

| Field | Rendered as | Source of truth (verified in code) |
| --- | --- | --- |
| Readiness level | `Level 7 — <name>` | `result_innovation_dev.innovation_readiness_id` → `clarisa_innovation_readiness_levels` (`.level`, `.name`) |
| Short description | The result description text | `results.description` — the field labelled *"Describe the result"* on General Information (`general-information.component.html:20`, max 400 chars) |
| Geographic scope | The scope name: `Global` / `Regional` / `Multi-national` / `National` / `Sub-national` | `results.geo_scope_id` → `clarisa_geo_scopes.name` |

Each field renders only when it has a value; an unset field is omitted rather than shown blank or
zero-filled — the same "absent is a fact, not an empty string" rule child #4 established for `title`.

### Card layout — prose, not a property list

**User ruling 2026-09-10:** the card must **not** read as a list of `Label: value` rows. The
description carries **no label at all** — it is the innovation's own text, flowing directly under the
title, the way the card already presents the title itself. Only the two short factual fields carry a
label, and they sit together on one line below the description, separated by whitespace:

```text
┌──────────────────────────────────────────────────────────────────────────────────┐
│  STAR 19707 - Climate Information Services Dissemination …   [View innovation ↗] │
│                                                                                  │
│  A digital advisory service that delivers localized seasonal forecasts to        │
│  smallholder farmers through SMS and community radio…                            │
│                                                                                  │
│  Readiness level: Level 7 - …          Geographic scope: Regional                 │
└──────────────────────────────────────────────────────────────────────────────────┘
```

Three consequences for `/akili-specify`:

| Consequence | Detail |
| --- | --- |
| No `Description:` label exists | The description is unlabelled body text. Nothing in the DOM should name it — which also means the client suite cannot find it by label and must assert it another way. |
| The two labelled fields share one row | Not two stacked rows. They wrap to two lines only when the viewport forces it. |
| The card's current single-row flex layout must change | `innovation-use-details.component.html:197` is `flex items-center justify-between` — a one-line row. It becomes a block with the title+anchor row on top and the new content beneath, which is why `R-3` below is a layout decision the spec must make rather than inherit. |

### Resolved: which field is the "short description"

The reviewer's phrase is ambiguous in this schema, so it was settled against the code rather than
guessed:

- **`results.description`** — labelled *"Describe the result"*, `maxLength=400`. **Chosen.**
- `result_innovation_dev.short_title` — labelled *"Short title"*, `maxLength=10` **words**
  (`innovation-details.component.html:31-33`). A title, not a description. **Rejected.**

This also matches the user's own account of where the data lives: two fields in `results`
(`description`, `geo_scope_id`), one in the innovation-specific table
(`result_innovation_dev.innovation_readiness_id`).

---

## Scope

**In scope**

- Extend `linked_innovation_dev` in the Innovation Use details response with three read-only sub-keys.
- A dedicated read query that reaches `result_innovation_dev.innovationReadiness` and
  `results.geo_scope` for the linked result.
- Render the three fields on the confirmation card, keeping the existing label + **View innovation
  detail ↗** anchor intact.
- Client interface widening + unit tests on both sides.

**Out of scope / Non-Goals**

| Non-goal | Why |
| --- | --- |
| Showing the fields in the **dropdown options** | User ruling 2026-09-10. The comment says *"in the card"*. The picker is fed by a different contract (`GET_Results({'indicator-codes': [2]})`) with its own query and its own payload-size risk across N results. |
| Concrete **regions / countries** on the card | User ruling 2026-09-10. Scope **name only**. The regions/countries variant needs `result_regions` + `result_countries` (2 more relations, 2 arrays, and a UI truncation rule) — propose separately if the PO asks. |
| Making any field **editable** from the Innovation Use page | These are the Innovation Development result's own data. Editing belongs on its own page. |
| Widening the shared `findAndDetails` | See §Recommended Approach — it has 3 callers. |
| Any change to the link/save path | This is read-side only. |

---

## Affected Users, Systems, And Specs

| Area | Detail |
| --- | --- |
| Users | Innovation Use reporters who link an Innovation Development output |
| Server | `result-innovation-use.service.ts` (read path), the details response DTO, possibly a new dedicated query in `link-results.service.ts` or local to Innovation Use |
| Client | `innovation-use-details.component.html` (card), `get-innovation-use-details.interface.ts` (typing) |
| Specs | Family child **#5** under `docs/specs/innovation-use/family.md`. Extends child #4 (`archive/2026-09-09-innovation-use--link-innovation-dev/`) — specifically its `R-IUL-007` contract |
| Docs | `docs/trd/trd.md` §API contracts if the response shape is recorded there; `docs/ux-ui/design.md` for the card layout |

---

## Visual Reference

- **Source:** None (user-supplied screenshots of the current card only).
- **Location:** n/a — the screenshots in the `/akili-quick` invocation show the **existing** card, not the target.
- **Notes:** The card already exists and its container, border, spacing and anchor are all built from
  approved tokens. **The layout is decided** — see §Card layout above (unlabelled description as
  body text, then one row carrying `Readiness level:` and `Geographic scope:`); `/akili-specify`
  implements that shape rather than choosing one. What is still open is the description's line
  treatment (`R-3`). No new token is expected. If the specify phase wants a visual, a lightweight
  HTML mockup under `mockup/` is enough — this does not warrant a Stitch/Figma cycle.
- ⚠️ **Contrast pre-check owed.** Child #3 archived with **two live light-theme AA defects**, one of
  them `.section-title` at **2.378:1** and one an eyebrow label at **2.9115:1** — both exactly the
  "small grey label above a value" pattern this card's three new rows would reach for. Whatever token
  the new labels use must be contrast-checked before it ships, not inherited by analogy.

---

## Requirement Delta Preview

### ADDED Requirements

- `linked_innovation_dev` returns `innovation_readiness` (level + name), `description`, and
  `geo_scope` (name) for the linked Innovation Development result.
- Each new sub-key is projected **present-and-`null`** when the underlying value is unset — never
  absent — consistent with child #4's `R-IUL-007`.
- The card renders each field only when non-null.

### MODIFIED Requirements

- **`R-IUL-007`** (child #4, archived): the `linked_innovation_dev` shape grows from 4 sub-keys to 7.
  The existing four keep their names, types and null-coercion semantics unchanged — this is purely
  additive, so no client that reads the old shape breaks.
- The client `linked_innovation_dev` interface widens to match.

### REMOVED Requirements

- None.

---

## Approach Options

| # | Approach | Cost | Risk |
| --- | --- | --- | --- |
| **A** | **Dedicated read for the linked dev result.** Leave `findAndDetails` alone; after resolving the link, fetch the linked result's readiness + description + geo scope in one targeted query owned by Innovation Use. | 1 extra query per details read (bounded: 0 or 1 link) | **Low.** Blast radius is one module. |
| B | **Widen the shared `findAndDetails`** with `geo_scope` and `result_innovation_dev.innovationReadiness` relations. | No extra query | **Medium-high.** Three callers — `result-policy-change.service.ts:141`, `link-results.controller.ts:38`, and Innovation Use. Policy Change and the generic controller would silently start returning innovation-dev relations they never asked for, and `link-results.controller.ts` is a **public endpoint**, so the widening is externally visible. Child #4 already declared touching this function out of scope for the same reason. |
| C | **Client-side second fetch.** The card calls the Innovation Development details endpoint for the linked id. | No server change | **Medium.** A second round-trip on every page load, a new loading/error state on the card, and it violates the client convention of one envelope per screen. Also makes the card's content depend on the *viewer's* permissions on the other result rather than on the link. |

---

## Recommended Approach

**Option A — dedicated read, owned by Innovation Use.**

Three reasons, in order of weight:

1. **It confines the blast radius to one module.** Option B changes what two unrelated consumers
   receive, one of them through a public endpoint. That is a contract change to code nobody asked to
   change, which is how contract drift starts.
2. **The cost is genuinely bounded.** The link is 0-or-1 rows by design (child #4's `R-IUL-007`), so
   this is one extra query per details read — not an N+1.
3. **It leaves the existing four sub-keys byte-identical.** Purely additive means no coordinated
   client/server release and no migration.

No database migration is needed. Every column already exists.

---

## Risks, Dependencies, And Open Questions

| ID | Item | Severity | Note |
| --- | --- | --- | --- |
| **R-1** | The three new fields are **read-only mirrors of another result**, so the card can go stale relative to the Innovation Development result | Low | Accepted: it is a read on every page load, so it is as fresh as the request. Worth one sentence in requirements so nobody later reads it as cached. |
| **R-2** | A **soft-deleted** linked result still comes back — `findAndDetails` filters `is_active` on the link row but not on `other_result` (child #4 documented this deliberately) | Low | The new fields inherit that behavior. Do not "fix" it here; child #4 made it deliberate. |
| **R-3** | `results.description` is up to 400 chars, and it now flows as an unlabelled paragraph — so a long one grows the card's height rather than crowding the anchor | Medium | The stacked layout removes the *crowding* risk; the open question is line treatment: let it wrap in full, or clamp to N lines. Recommend **clamp to 2–3 lines** so the card stays a summary and the anchor stays the way to read the whole thing. A **layout** decision, not a data one. |
| **R-7** | The description has **no label in the DOM** by design, so the client suite cannot locate it by label text | Medium | Needs a stable hook (a `data-testid` or a scoped structural selector) decided at specify time. Left implicit, a fixture will end up asserting on brittle text position — and per `KZ-001` the assertion must still be on the rendered DOM. |
| **R-4** | **KZ-001** (`staging` lineage, recurrence 13): a property that lives in generated output must be asserted **there**. | **High** | The new card rows must be asserted on the **rendered DOM**, not on a component-instance getter. Child #3 and #4 both hit this. |
| **R-5** | **KZ-017**: a verification narrower than its claim returns a confident green | **High** | Server `npm test` has `rootDir: "src"` and never runs the e2e/integration configs. If a fixture tier covers this contract, name it explicitly in tasks. |
| **R-6** | **KZ-015**: a component fixture must arrange the **transition**, not the end state | Medium | The card appears *after* a link is selected. Fixtures must set `linked_innovation_dev` and re-`detectChanges()`, not pre-seed it before the first one. |
| **OQ-1** | Does the reviewer want the readiness **level number**, the **name**, or both? | — | Proposal assumes **both** (`Level 7 — <name>`), since the number alone is meaningless to a non-expert and the name alone loses the ordinal. Cheap to change at specify time. |
| **OQ-2** | Geographic scope was **"potentially"** in the comment, not "for sure" | — | Scoped in per the user's 2026-09-10 ruling. If the PO drops it, the spec loses one relation and one field — no restructuring. |
| **D-1** | No dependency on unapplied migrations | — | Confirmed: all three columns exist. Child #4's two migrations were applied 2026-09-09 (`325 of 325, 0 pending`). |

**Active Kaizen lessons applied:** `KZ-001`, `KZ-015`, `KZ-017` (all `staging` lineage — the log
carries an unreconciled ID collision between lineages, so the lineage is named per its own
instruction).

---

## Success Criteria

1. Linking an Innovation Development output shows its readiness level, description and geographic
   scope on the card, with no navigation away from the Innovation Use page.
2. The card reads as prose, not a property list: the description appears **unlabelled** beneath the
   title, and `Readiness level:` / `Geographic scope:` share a single row beneath it.
3. A linked result missing any of the three values renders the card without that row — no blank
   label, no `null`, no `0`. With the description missing, the labelled row moves up; with both
   labelled fields missing, no empty row is left behind.
4. The four pre-existing `linked_innovation_dev` sub-keys are unchanged in name, type and null
   semantics; a client reading only those is unaffected.
5. `findAndDetails` is untouched, and the Policy Change and `link-results` consumers return exactly
   what they returned before.
6. The new card content is asserted on the **rendered DOM** in the client suite (`KZ-001`), via a
   stable hook for the unlabelled description (`R-7`).
7. Both suites green with coverage above their floors; new label colors contrast-checked before
   merge (per the Visual Reference warning).

---

## Next Step

```text
/akili-specify docs/specs/innovation-use/dev-card-details
```

**Lite depth** is the right call: one additive contract change, no migration, no new business rule,
and the surrounding card already exists and is spec'd by child #4. Standard depth would re-derive
`R-IUL-007`'s ground for a three-field addition.

**Execution split** (recorded now so it survives to `/akili-execute`): server tasks are worked
directly in this session; client tasks are delegated to Antigravity via the `orchestration` skill.
A silent delegated worker is a **runtime failure**, not a clean result — re-dispatch, never read
non-delivery as "found nothing".
