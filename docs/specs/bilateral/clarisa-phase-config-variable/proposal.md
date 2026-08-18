# Proposal — Make the CLARISA projects phase configurable from the admin UI

> **Headline:** The key already exists in code (`AppConfigKey.ARI_CLARISA_PROJECTS_PHASE`) and the resolver already reads it. **What is missing is the `app_config` row.** One seed migration puts the variable on the Configuration Variables screen; a small typed-control change turns its free-text field into a year selector.
>
> **This unblocks a confirmed defect.** Dev's bilateral CLARISA picker is empty right now — measured, not assumed: CLARISA test serves 299 projects, all `phase=2025`; the resolver falls through to the hardcoded default `2026`; the funnel ends at **0**. An admin with this row can fix it in ≤5 minutes without a deploy.

---

## 1. Document Control

| Field | Value |
| --- | --- |
| **Spec path** | `docs/specs/bilateral/clarisa-phase-config-variable/` |
| **Slug** | `clarisa-phase-config-variable` — **derived from a free-text argument**; the original sentence is proposal context, not a directory name |
| **Type** | **Change** (feature — the request is a capability, not a symptom report) |
| **Approval Mode** | `gated` (default — no end-to-end mandate given) |
| **Depends on** | none |
| **Parallel-safe** | **no** — touches `src/db/migrations/` (append-only, order-sensitive) and the shared config-edit modal |
| **Module** | `bilateral/` — the phase exists only to serve the bilateral CLARISA picker (`tools/clarisa/projects/`) |
| **Date** | 2026-08-18 |
| **Requested by** | Juan Carlos Cadavid |

---

## 2. Intent

Put `ARI_CLARISA_PROJECTS_PHASE` on `/administration/configuration/variables` so a Center/System admin can **select the CLARISA phase year from the interface**, with no deploy and no DB access.

---

## 3. Problem / Current Behavior

The phase that filters the bilateral project picker is resolved in four tiers:

| Tier | Source | State today |
| --- | --- | --- |
| 1 | `?phase=` query arg | the client never sends it |
| 2 | `app_config` row `ARI_CLARISA_PROJECTS_PHASE` | **row does not exist** |
| 3 | `ENV.ARI_CLARISA_PROJECTS_PHASE` | **not even in `.env.example`** |
| 4 | literal `DEFAULT_CLARISA_MAPPING_PHASE = 2026` | ← every environment lands here |

So the only way to change the phase today is a code change or an undocumented env var. The tier that was designed to be operable — the `app_config` row — has never been created.

### Measured consequence (2026-08-18)

Probed both CLARISA hosts and applied the three real predicates from `project-selector.util.ts`:

| Host | Used by | Projects | `phase` of the 25 eligible | `matchesPhase(2026)` | Picker |
| --- | --- | --- | --- | --- | --- |
| `api.clarisa.cgiar.org` (prod) | local `.env` | 299 | **`null`** | ✅ passes | **25** |
| `clarisatest-back.ciat.cgiar.org` | dev | 299 | **`2025`** | ❌ fails | **0** |

The same 25 projects exist in both. Funnel on the test host: `isBilateralFunding` → 221, `+ isAllianceProject` → 25, `+ matchesPhase(2026)` → **0**.

**Local works by accident:** `matchesPhase` returns `true` when `phase` is `null`, so the filter has never actually filtered in production.

*Evidence: `curl` against both hosts + predicate replay, 2026-08-18. The server already logs this exact case — `"Zero eligible bilateral projects found from CLARISA host … (targetPhase=2026)"`.*

---

## 4. Proposed Outcome

- The variable appears on the Configuration Variables screen with category, subcategory, and a description explaining what it controls.
- An admin with `canEditAppConfiguration()` can set the year from the interface.
- The change takes effect within the resolver's 5-minute TTL — **no deploy, no restart**.
- An invalid or empty value degrades predictably and visibly, instead of silently falling through.

---

## 5. Scope

| In | Out |
| --- | --- |
| Seed migration inserting the `app_config` row | Changing `DEFAULT_CLARISA_MAPPING_PHASE` |
| Year selector control for this key in the edit modal | A generic typed-config framework for all keys |
| Server + client unit tests | Repointing dev's `ARI_CLARISA_HOST` |
| Adding the var to `.env.example` (Tier 3 discoverability) | Fixing the client's silent error swallow (separate spec) |

---

## 6. Non-Goals

- **Not** changing how `matchesPhase` treats `null`. That decision (wildcard vs "unclassified") is a real question but a different change — see §12 OQ-3.
- **Not** making the picker show an error state instead of "No results found". Separate defect, separate spec.
- **Not** building a metadata-driven control registry for every config key. Tempting over-build; see Option C.

---

## 7. Affected Users, Systems, And Specs

| Area | Impact |
| --- | --- |
| Center/System admins | Gain a self-service control they do not have today |
| `src/db/migrations/` | +1 append-only migration |
| `MappingPhaseResolver` | **No code change** — Tier 2 already reads this key |
| `edit-environment-variable-modal` | Value control gains a typed branch |
| `bilateral/clarisa-automapper-s2` | S2's review queue inherits the same picker; a correct phase is a precondition |
| `bugfix/bilateral-picker-fields` (archived) | This is the operational sibling of that fix |

---

## 8. Visual Reference

- **Source:** Existing production UI (no new screen).
- **Location:** `/administration/configuration/variables` — list + `edit-environment-variable-modal`.
- **Notes:** The change reuses the modal's existing type dispatch. It already branches `@if (service.editingUsesJson())` → structured editor, `@else` → `<app-input label="Value">`. This proposal adds a third branch. No new layout, no new tokens.

---

## 9. Requirement Delta Preview

### ADDED

- An `app_config` row for `ARI_CLARISA_PROJECTS_PHASE` with description, category, and subcategory, visible on the Configuration Variables screen.
- A year-selector control for this key in the edit modal.
- `ARI_CLARISA_PROJECTS_PHASE` documented in `.env.example`.

### MODIFIED

- The edit modal's value control becomes key-aware instead of always free text.

### REMOVED

- Nothing.

---

## 10. Approach Options

| | Option A — Seed only | Option B — Seed + year selector | Option C — Typed-config framework |
| --- | --- | --- | --- |
| **What** | Migration inserts the row; admin types the year into the existing free-text field | A, plus a `p-select` of years for this key | A, plus a metadata-driven control registry (e.g. via the entity's unused `field` column) driving every key |
| **Client work** | none | one branch in one modal | modal + service + entity semantics + migration for metadata |
| **Delivers the ask** | partially — it is a text box, not a selector | **yes** | yes, and for future keys |
| **Risk** | typo `20256` silently falls through to the default | low | scope creep; commits the team to a metadata contract nobody has designed |
| **Size** | ~1 task | ~3 tasks | ~8+ tasks |

`app-input` already supports `type: 'text' | 'number'` and `min`, so even a numeric-constrained field is available at near-zero cost if a full dropdown proves contentious.

---

## 11. Recommended Approach

**Option B**, with Option A shippable first as an independent slice.

Rationale:

1. **It is what was asked.** The request was explicitly *"desde la interfaz seleccionamos el año"* — a selector, not a text box. Delivering A alone would be silently narrowing the scope.
2. **The seam already exists.** The modal already dispatches on value type for JSON. A third branch imitates a pattern that is already there rather than inventing one.
3. **A is a valid emergency slice.** If dev needs unblocking before B lands, the migration alone restores admin control in one task.
4. **C is the trap.** A metadata registry is the right eventual design, but there are exactly **two** keys in `AppConfigKey` today. Building a framework for two keys is speculative generality.

---

## 12. Risks, Dependencies, And Open Questions

### Risks

| # | Risk | Mitigation |
| --- | --- | --- |
| R-1 | **Migration placeholder hazard.** `orm.config.ts` sets `namedPlaceholders: true`; a bare `?` or `:word` anywhere in an unparameterized query — *including inside a comment* — throws before MySQL sees it. A description ending in "?" would break the migration | Pass all values as `?` parameters with an array (the exemplar `1781879906673-AddNewEnvCl.ts` does exactly this). No question marks in comments or description text |
| R-2 | **The exemplar's `down()` is defective.** It runs `WHERE key = '…'` unescaped, and `KEY` is a MySQL reserved word | Do **not** copy it. Use `` WHERE `key` = ? `` |
| R-3 | **A static gate cannot prove a migration runs** (server `CLAUDE.md` §7, Kaizen **K-006**). Migration `1784500000000` shipped unrunnable and passed every static check | Execute against a scratch schema (`npm run migration:dev:execute`) as the task's verification command — and per **K-004**, prove that gate can go red before trusting it |
| R-4 | **Kaizen K-005** — *config values used as discriminators must never be collapsed onto one value "to simplify"*. The phase **is** a discriminator: it selects which CLARISA cohort is eligible | Do not seed one value and treat it as global. Keep the tier cascade intact; seed metadata, decide the value per environment (OQ-1) |
| R-5 | **Silent fallthrough.** An invalid value logs a warn and falls through to ENV/default. The admin sees a saved row and a still-empty picker, with no feedback | A selector removes free-text typos by construction. Surfacing the fallthrough in the UI is out of scope but worth an OQ |
| R-6 | **Dev DB is shared and not disposable** (root `CLAUDE.md` §4.3). The migration runs against it via CI/CD | The migration is a single additive INSERT with a working `down()`. No schema change |
| R-7 | **Kaizen K-013** — this whole change rests on a live measurement. Production tolerates any phase **only while CLARISA leaves `phase` null**. The day production populates it, prod behaves exactly like dev does now | Record the measurement date (2026-08-18) and the invalidating condition explicitly in `requirements.md` |

### Dependencies

- None blocking. The resolver, the key enum, the screen, and the edit modal all exist.

### Open Questions

| # | Question | Owner |
| --- | --- | --- |
| **OQ-1** | Should the migration seed `simple_value` too, or leave it `NULL` like the `ARI_CLARISA_API_KEY` exemplar? Seeding `2025` fixes dev on deploy, but the same row lands in production where 2025 is semantically wrong (harmless today only because prod phases are `null` — see R-7) | Product + DevOps |
| **OQ-2** | What year range should the selector offer — a fixed list, current year ± N, or derived from distinct `phase` values in the CLARISA payload? | BA |
| **OQ-3** | Should `phase: null` keep meaning "matches everything"? It is why production has never exercised this filter | Product |
| **OQ-4** | Which `category` / `subcategory` for the row? The exemplar used `API` / `API_KEY`; `CLARISA` / `PROJECTS` would group better | BA |
| **OQ-5** | Should an unset/invalid value be surfaced in the UI rather than silently falling through? | Product |

---

## 13. Success Criteria

1. `ARI_CLARISA_PROJECTS_PHASE` appears on `/administration/configuration/variables` with a description a non-developer can act on.
2. An admin with `canEditAppConfiguration()` can **select** a year and save it.
3. Within 5 minutes and with **no deploy**, the bilateral picker reflects the new phase.
4. Setting the phase to `2025` on dev makes the picker return the **25** projects the funnel already proved are eligible.
5. The migration is proven to **run** — not merely to compile or lint.
6. `down()` removes the row cleanly and is executed at least once in verification.

---

## 14. Next Step

```text
/akili-specify docs/specs/bilateral/clarisa-phase-config-variable
```

Standard depth. OQ-1 and OQ-2 should be answered before design approval — they change what the migration writes and what the selector offers.

---

## Authorship

AKILI-SPECS methodology by **Juan Carlos Cadavid** — [jcadavid.com](https://jcadavid.com). Licensed under the MIT License.
