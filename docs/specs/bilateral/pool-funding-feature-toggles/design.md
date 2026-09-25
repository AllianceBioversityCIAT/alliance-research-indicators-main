# Design — Bilateral / Pool Funding Feature Toggles

## 0. Document control

| Field | Value |
| --- | --- |
| Spec path | `docs/specs/bilateral/pool-funding-feature-toggles` |
| Depth | **Lite** |
| Baseline commit | `37d8f875` |
| Date | 2026-09-24 |

---

## 1. Executive summary

Two `app_config` rows, each read at one place per tier and applied at one place per
tier. Nothing new is invented: the client already has a single visibility choke
point, the server already has an ordered refusal ladder, and the admin modal already
branches per key. This design adds one arm to each of those three existing
structures.

```
app_config rows
   ├── server → SYNC_GATE_ENTRIES  (one new entry, first in the ladder)
   ├── client → PoolFundingFlagsService → shouldHidePoolFundingTab() + button gate
   └── admin  → edit-environment-variable-modal (one new boolean branch)
```

---

## 2. Budget (Step 2.4)

| Signal | Estimate |
| --- | --- |
| Tasks | **6** |
| LOC | **~250** (server ~90, client ~130, migration ~30) |
| Review rounds | **1** |

Matches Lite depth. `/akili-execute` should escalate to the owner if execution
exceeds this — the work is deliberately shaped to fit one morning.

---

## 3. Premise Ledger

**Counts:** 8 verified · 0 `UNVERIFIED` (0 High / 0 Low).

> ⚠️ **P-1 was CORRECTED during T-03 review (2026-09-24).** It originally read *"there is **no**
> `is_active` column"*, cited to `grep -c is_active` on `app-config.entity.ts` → `0`. That grep
> is a textbook **KZ-017**: the entity subclass is a region that structurally **cannot** show
> inherited columns, so the check was narrower than the claim it backed and returned a confident
> green. `AppConfig extends AuditableEntity`, and the column is right there in `baseline.sql`.
> The implementer's `AND is_active = TRUE` was correct and the spec was wrong. Design §6 is
> unaffected — the new rows take the column's `DEFAULT 1`.
**Blast-radius triggers:** `live-path` and `shared-state` and `consumer` **all fire** —
this design changes a condition multiple template blocks read, and changes the
behavior a named user action reaches.

| # | Claim | Class | Citation (as run) | Verified at | If false |
| --- | --- | --- | --- | --- | --- |
| P-1 | `app_config` stores scalars as text in `simple_value`, **and carries the audit block including `is_active`** | `data-env` | `baseline.sql` → `CREATE TABLE app_config` declares `created_at, created_by, updated_at, updated_by, is_active tinyint NOT NULL DEFAULT '1', deleted_at, key, description, simple_value, json_value, category, subcategory, field`. `AppConfig extends AuditableEntity` (`app-config.entity.ts:6`), which declares `is_active` (`auditable.entity.ts:35`). Executed against Dev: `SELECT simple_value FROM app_config WHERE \`key\` = ? AND is_active = TRUE` runs clean | `b1cd1ece` | The encoding decision D-2 changes. Impact **High** |
| P-2 | `app-config.util.ts` holds **no** cache — it queries the `DataSource` per call | `existence` | `grep -n "cache\|TTL\|Date.now"` on `shared/utils/app-config.util.ts` → only the constructor line matches | `37d8f875` | NFR-PFT-001 is false and a restart window must be documented. Impact **High** |
| P-3 | `GET /api/configuration/:key` is excluded from `JwtMiddleware` (public) | `data-env` | `grep -n configuration server/.../src/app.module.ts` → `:78 path: 'configuration/:key'` inside the exclude list | `37d8f875` | The client read would need a token; D-4 changes. Impact **Low** |
| P-4 | The server refusal ladder is an ordered **data list**, not scattered conditionals | `location` | `eligibility/sync-gate.ts:69` — `export const SYNC_GATE_ENTRIES: readonly SyncGateEntry[]`, 7 entries, first-failure-wins, each carrying `persistsRow` | `37d8f875` | D-3 changes from "add one entry" to "add a branch". Impact **High** |
| P-5 | The user action `PRMS SYNC` reaches `SYNC_GATE_ENTRIES` before any PRMS call | `live-path` | Button `(click)="onPrmsSync()"` at `result-sidebar.component.html:156` → `POST` on route `${RESULT_CODE}/prms-sync` (`main.routes.ts:88`) → `result-prms-sync.controller.ts:115 @Post()` / `:152 async sync()` → service → gate | `37d8f875` | R-PFT-004 would not be enforceable at that point. Impact **High** |
| P-6 | Every client surface that decides Pool Funding availability derives from **one** filter | `shared-state` | `result-sidebar.component.ts:68-83` builds `allOptionsWithGreenChecks()` via `shouldHidePoolFundingTab()` (`:100`); the sidebar item renders from that list; `hasPoolFundingOption()` (`:155`) filters the same list; the button block is `@if (hasPoolFundingOption())` at `result-sidebar.component.html:143`. No other reader: `grep -rl "pool-funding-alignment"` over `src/app` excluding the feature folder → **13 files**, of which the visibility readers are only `result-sidebar.component.{ts,html}`; the rest are the route (`app.routes.ts`), the HTTP error interceptor, API/bilateral services, an interface, a fixture, and specs | `37d8f875` | NFR-PFT-002 is false and each surface needs its own gate. Impact **High** |
| P-7 | The admin modal already branches per key, so a boolean arm is an addition, not a rewrite | `location` | `edit-environment-variable-modal.component.html` → `:33 @if (service.editingUsesJson())` · `:47 @else if (isClarisaPhaseKey(item.key))` · `:75 @else` (free text) | `37d8f875` | D-6 grows from one arm to a new editor. Impact **Low** |
| P-8 | `app_config` keys follow **two** naming families, not one | `data-env` | Server `AppConfigKey` enum → `ARI_CLARISA_API_KEY`, `ARI_CLARISA_PROJECTS_PHASE` (env-var mirrors). Client `APPLICATION_CONFIGURATION_KEY` → `'date-format'`, `'BULK_UPLOAD.EMBED_INFO.URL'` (application settings) | `37d8f875` | D-1's key names would sit in the wrong family. Impact **Low** |

**Consumer hand-off.** P-6's reader list is carried into T-04's `Consumers` field.

---

## 4. Architecture overview

No new module. Three existing structures each gain one arm.

| Tier | Existing structure | Added |
| --- | --- | --- |
| Server — enforcement | `SYNC_GATE_ENTRIES` ladder | One entry, evaluated **first** |
| Client — visibility | `shouldHidePoolFundingTab()` + `hasPoolFundingOption()` | One flag read, AND-ed in |
| Client — admin | modal per-key branch chain | One boolean arm |
| Data | `app_config` | Two seeded rows |

---

## 5. Design decisions

### D-1 — Key names follow the *application-setting* family, not the `ARI_*` family

```
POOL_FUNDING.SECTION.ENABLED
POOL_FUNDING.PRMS_SYNC_BUTTON.ENABLED
```

**Why.** P-8 shows `app_config` holds two families: `ARI_*` keys mirror environment
variables and are read by the server only; dotted keys (`BULK_UPLOAD.EMBED_INFO.URL`)
are application settings read by the client. These flags are application settings
read by **both** tiers, so the dotted family is correct. Using `ARI_*` would imply a
matching env var exists, which it does not.

**Registered in both places:** the server `AppConfigKey` enum and the client
`APPLICATION_CONFIGURATION_KEY` constant. Two registries already exist; neither is
collapsed by this spec.

### D-2 — Encoding: only the exact string `false` disables

`simple_value` is text (P-1). The parser is:

> Trim the value and lowercase it. If and only if it equals `false`, the feature is
> **disabled**. Every other input — missing row, `NULL`, empty, whitespace, `maybe`,
> `0`, a read error — yields **enabled**.

**Why this exact shape.** It makes R-PFT-003 structural rather than defensive: the
fail-open default is not a `catch` block that someone can later "clean up", it is the
only branch the function has. There is one way to turn the feature off and it must be
written deliberately.

**Rejected:** accepting `0`/`no`/`off` as disabling. A permissive parser means a typo
can darken a production section; a strict one means a typo is harmless.

**Shared parser, one implementation per tier** — a small pure function, unit-tested
table-driven against the full absent-value set from R-PFT-003.

### D-3 — The server gate is a new **first** entry, and it writes no row

Added to `SYNC_GATE_ENTRIES` (P-4) ahead of `result_exists`:

| Field | Value |
| --- | --- |
| `id` | `feature_enabled` |
| `httpStatus` | `503 SERVICE_UNAVAILABLE` |
| `description` | Names the disabled feature and that it is an administrative pause |
| `persistsRow` | **`false`** |

**Why first.** The flag is a statement about the feature, not about the result. It is
cheaper than the existence lookup and must not depend on a result that may not exist.

**Why `persistsRow: false`.** Entries 1–2 already set `false` for the same reason: a
refusal that is not a verdict about the result should not consume an attempt number
or write a `REFUSED_BY_STAR` audit row. Turning the feature off for an afternoon must
not leave a trail of refusals attached to every result someone clicked. This is
R-PFT-004's `BUT it must NOT` clause.

**Why 503 and not 403.** The feature is temporarily unavailable, not forbidden to
this user. A 403 would suggest a permissions problem and send the user to support.

### D-4 — The client reads `app_config` directly, once per session

Follows the committed precedent `DateFormatConfigService`: `ApiService`
`GET_ConfigurationByKey`, a single-flight `loadPromise`, the value exposed as a
`signal`, and a `catch` that resolves to the enabled default.

**Owner decision (2026-09-24):** the flags are **not** carried on the alignment
response. Alignment is per-result; these flags are global, and attaching them would
make every result response restate a global fact.

**Cadence — once per session, and the consequence is stated, not hidden.** A flag
flipped while a user has the page open is not seen until their next load. That is
acceptable **because** the server gate (D-3) refuses the only dangerous action. The
UI must never imply the change is instant. This pairs the latency with its signal per
K-016.

### D-5 — The client applies the flags at the existing choke point, AND-ed

```
hidden  ⟸  existing rules  OR  section flag disabled
button  ⟸  hasPoolFundingOption()  AND  button flag enabled
```

`shouldHidePoolFundingTab()` gains one disjunct; the button's `@if` gains one
conjunct. Because the button already derives from the section's filtered list (P-6),
R-PFT-002's "section off wins" scenario falls out with no extra code.

**AND, never OR** — R-PFT-001. The flag can subtract availability and never add it.
The falsifier for this is explicit in T-04.

### D-6 — The admin modal gains a fourth branch

Inserted in the existing chain (P-7) before the free-text `@else`: when the key is one
of the two flags, render a toggle whose two positions write exactly `true` / `false`.
Permissions, endpoint and screen are unchanged — the `PATCH` is already restricted to
`SYSTEM_ADMIN` / `TECHNICAL_SUPPORT`.

### D-7 — Rows are seeded by migration, enabled

A key with no row does not appear in the configuration list, so an admin could not
turn the feature off without first creating a row by hand. A migration inserts both
rows with `simple_value = 'true'` and a `description` explaining the subtract-only
semantics.

**K-015 applies and is stated in `requirements.md` §5 as an accepted risk:** the
pipeline deploys code, not migrations. An environment where the migration has not run
has no rows — which fail-open renders as today's behavior. The failure mode is
"cannot turn it off yet", never "the section vanished".

---

## 6. Data model

| Column | `POOL_FUNDING.SECTION.ENABLED` | `POOL_FUNDING.PRMS_SYNC_BUTTON.ENABLED` |
| --- | --- | --- |
| `key` | as named | as named |
| `simple_value` | `'true'` | `'true'` |
| `description` | States that `false` hides the section and that `true` defers to the existing rules | States that `false` hides only the button |
| `json_value` | `NULL` | `NULL` |

| `category` | `FRONT` | `FRONT` |
| `subcategory` | `SECTIONS` | `SECTIONS` |
| `field` | `NULL` | `NULL` |

> ⚠️ **CORRECTED 2026-09-24 (T-07).** This block originally read *"`category` / `subcategory` /
> `field` are nullable and left `NULL`: the existing `AppConfigCategory` enum models email
> settings only, and inventing a category would extend a vocabulary this spec does not own."*
> **Wrong, and wrong in the same way as P-1:** the enum is not the vocabulary. It is vestigial —
> it declares only `EMAIL`, while the live table uses six categories (`API`, `BULK_UPLOAD`,
> `EMAIL`, `FRONT`, `portfolio`, `Results`). **All 16 pre-existing rows carry a category and a
> subcategory**, and the admin screen *filters* by both, so the two `NULL` rows landed in an
> `UNCategorized` bucket. The owner hit this the moment the seed migration was applied.
>
> `FRONT` is the owner's call and it holds up: `config-front`'s own description defines the
> category as *"Front-end application configuration used to manage customizable settings **and
> feature behavior**"*, and two rows sharing a subcategory has precedent (`front-version-dev`
> and `front-version-prod` are both `FRONT` / `ENVIRONMENT`).
>
> `field` stays `NULL`. It is **not** a state holder: `EnvAppConfigUtil` builds
> `where.field = …`, making it the third coordinate of a composite lookup
> (`category + subcategory + field`) used to locate the `EMAIL` settings. It is also not rendered
> — the admin table's eight columns are `category`, `subcategory`, `key`, `description`, `value`,
> `lastUpdated`, `updatedBy`, `actions`. Writing `ENABLED` there would be invisible dead data
> that reads as a status. Every existing `FRONT` row has `field` `NULL`.
>
> Applied by migration `1790280318260`, **not** by editing the seed migration, which was already
> applied to Dev.

---

## 7. Reversion challenge (Step 2.3)

**Not triggered.** No design decision removes, disables, or inverts shipped behavior.
Both flags are additive gates whose seeded state reproduces current behavior exactly.

---

## 8. Requirements traceability

| Requirement | Design |
| --- | --- |
| R-PFT-001 | D-5 (AND-ed disjunct), D-2 |
| R-PFT-002 | D-5 (button conjunct, section-off wins via P-6) |
| R-PFT-003 | D-2 (structural fail-open), D-4 (`catch` → enabled), D-7 |
| R-PFT-004 | D-3 |
| R-PFT-005 | D-6, D-7 |
| NFR-PFT-001 | P-2, D-4 (cadence stated) |
| NFR-PFT-002 | D-5, P-6 |
