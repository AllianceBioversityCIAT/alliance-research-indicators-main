# Requirements — Bilateral / Pool Funding Reporting Year

- **Module:** bilateral (server `domain/entities/bilateral`, `result-prms-sync`, `tools/{toc-integration,clarisa}`; client result sidebar + Pool Funding Alignment page)
- **Spec id:** 2026-10-pool-funding-reporting-year
- **Status:** draft
- **Owner:** d.casanas@cgiar.org
- **Depth:** Standard
- **Approval mode:** gated
- **Linked PRD section:** [`docs/prd.md`](../../../prd.md) §4.1 (G1, G4)
- **Linked tickets:** —
- **Baseline commit:** `ec490da3c`
- **Last updated:** 2026-10-08
- **Extends:** [`bilateral/pool-funding-feature-toggles`](../pool-funding-feature-toggles/requirements.md) (same `app_config` family, same sidebar choke point)

---

## 0. Executive summary

One **reporting year**, stored as a row in `app_config`, becomes the single source for every
place the system today reads "the current PRMS year" — an env var in two places and a hardcoded
constant read at eight code sites. With it configurable, a result from **another** year that already carries
Pool Funding data is shown **read-only**: the section and the PRMS sync history card are visible,
nothing is editable, and the **PRMS SYNC** button is absent. The lock holds on the server too.

| Today | After |
| --- | --- |
| Year lives in env `ARI_PRMS_SYNC` (outbound `?year=` / `?phase=`) **and** constant `MAPPABLE_LIVE_VERSION = 2026` (section gate) | One `app_config` row, `ARI_PRMS_SYNC`; changing year = edit the row, no deploy |
| Other-year result → Pool Funding section **hidden** | Other-year result **with data** → section **visible, read-only**; without data → still hidden |
| Other-year lock covers ToC blocks only (client) and only bodies with `toc_alignments` (server) | Lock covers every Pool Funding write and the PRMS push, client **and** server |

---

## 1. Context

**What.** (1) Move the reporting year out of the environment and the code into the
admin-editable `app_config` table. (2) Use it to show prior-year Pool Funding data read-only.

**Why now.** Results from past years arrive with Pool Funding data already mapped. Today the
section disappears for them, so the user cannot see what was aligned or synced. Changing the
year also needs a deploy, because half of the year logic is a code constant.

**Who asked.** Product owner (chat, 2026-10-08).

**Not changing.** The contract rule (`eligible` = primary contract contributes to Pool Funding),
the indicator rule (`indicator_id === 5` hidden), the two feature toggles from
`pool-funding-feature-toggles`, external/PRMS-sourced read-only rules, and the PRMS sync
history/card content itself.

### 1.1 Current behavior (verified at `ec490da3c`)

| # | Claim | Evidence as run |
| --- | --- | --- |
| C-1 | `ARI_PRMS_SYNC` is server-only: 26 tracked hits in 7 files outside `docs/`, 0 in client | `git grep -c ARI_PRMS_SYNC ec490da3c -- . ':!docs'` → 26 hits / 7 files (the gitignored local `.env` adds one more) |
| C-2 | It adds `?year=` to lambda-toc and `?phase=` to the CLARISA projects feed | `toc-integration.service.ts:77`, `clarisa-projects.service.ts:243` |
| C-3 | The section's year gate is a constant, not the env var | `toc-level-rules.util.ts:31` `MAPPABLE_LIVE_VERSION = 2026`; read at 8 code sites: `bilateral.service.ts:379,473,487,662,1101(+1106 message),1463`, `pool-funding-mapping-apply.service.ts:254,641` |
| C-4 | Other-year results have the section **hidden** | `result-sidebar.component.ts:122` — `alignment.version_locked === true` hides |
| C-5 | Client lock on other-year covers ToC blocks only; contribution radios / SP picker stay enabled | `pool-funding-alignment.component.ts:293` `blocksDisabled` vs. radios `[disabled]="!editable() \|\| isReadOnly()"` (html :108-125) |
| C-6 | Server year lock fires only when the PATCH body has `toc_alignments`; contribution endpoints and PRMS push have no year check | `bilateral.service.ts:779`; `getEditableContributionContext` :1775; `sync-gate.ts:81` entries |
| C-7 | No `app_config` row holds a PRMS/reporting year | `enum/app-config-key.enum.ts` (5 keys, none) |

---

## 2. Glossary

| Term | Meaning |
| --- | --- |
| **Reporting year** | The year PRMS sync and Pool Funding editing are open for. Value of `app_config.ARI_PRMS_SYNC`. |
| **Other-year result** | A result whose `report_year_id` ≠ reporting year. |
| **Has Pool Funding data** | The result's alignment has an answered contribution (`has_contribution` is `true` or `false`), **or** the result has been synced to PRMS (synced flag or PRMS code present). Sync history alone does not count: the sidebar card already requires a PRMS code to render (`result-sidebar.component.ts:181-184`), so every case where the card would show is covered. |
| **Read-only mode** | Section rendered with every control non-interactive and no save path. |

---

## 3. Personas

| Persona | Interest |
| --- | --- |
| Result owner / PI | Sees what was aligned and synced for a past-year result; cannot change it |
| Center Admin | Same; cannot sync past-year results |
| System admin / technical support | Changes the reporting year from the config admin, without a deploy |

---

## 4. Functional requirements

### R-PRY-001 — Reporting year lives in `app_config`

- **As a** system admin **I want** the reporting year stored as an `app_config` row **so that** changing year needs no deploy.

**Details:**
- A row `ARI_PRMS_SYNC` exists in `app_config`, seeded with `2026`.
- Edits go through the existing config admin / `PATCH /api/configuration/:key` (roles `TECHNICAL_SUPPORT`, `SYSTEM_ADMIN` — unchanged).
- A missing, inactive, or blank row, or one that is not a 4-digit year (after trim), resolves to `2026` and logs a warning.

#### Scenario: Seeded value

- GIVEN the migration has run
- WHEN `GET /api/configuration/ARI_PRMS_SYNC` is called
- THEN the envelope `data.simple_value` is `"2026"`
- AND IT MUST NOT overwrite a value an admin already set (re-run is idempotent)

#### Scenario: Unusable row

- GIVEN the row is missing, `is_active = 0`, empty, `"abc"`, or `"20265"`
- WHEN any consumer resolves the reporting year
- THEN it resolves to `2026`
- AND a warning naming the key is logged

### R-PRY-002 — Every year consumer reads the row

- **As a** system admin **I want** one value to drive every year-dependent behavior **so that** the env var and the constant cannot disagree.

**Details:** the outbound lambda-toc `?year=`, the CLARISA projects `?phase=`, `version_locked`,
the ToC target year written on save, the target-date filter, the PRMS-webhook mapping apply,
and the new year gates (R-PRY-004/005) all read the resolved reporting year.

#### Scenario: Change without deploy

- GIVEN the row reads `2026` and the server is running
- WHEN an admin sets it to `2027`
- THEN within the stated propagation window (NFR-PRY-001) a 2027 result is editable and a 2026 result is read-only
- AND lambda-toc is called with `year=2027` and CLARISA with `phase=2027`
- BUT it must NOT serve ToC catalog entries cached for `2026` as the answer for `2027`

#### Scenario: Env var retired

- GIVEN the env var `ARI_PRMS_SYNC` is set to a value different from the row
- WHEN any consumer resolves the reporting year
- THEN the row's value wins
- AND IT MUST be that no server source reads the env var or the constant: `/usr/bin/grep -rn "process.env.ARI_PRMS_SYNC\|PRMS_SYNC_YEAR\|MAPPABLE_LIVE_VERSION\|appConfig.ARI_PRMS_SYNC" server/researchindicators/src server/researchindicators/test` returns 0

### R-PRY-003 — Other-year result with data: section visible, read-only

- **As a** result owner **I want** to see past-year Pool Funding data **so that** I know what was aligned and synced.

**Details:** visibility of the Pool Funding Alignment sidebar entry and page, per state:

| `eligible` | Year | Has data | Section | Editable | PRMS SYNC button | Sync card / history |
| --- | --- | --- | --- | --- | --- | --- |
| false | any | any | hidden | — | absent | absent |
| true | = reporting | any | visible | per existing rules | per existing rules | per existing rules |
| true | ≠ reporting | **yes** | **visible** | **no** | **absent** | **shown under its existing rule** (history events + PRMS code) |
| true | ≠ reporting | no | hidden | — | absent | absent |

Existing subtractive rules still apply first: `indicator_id === 5`, section toggle off, no alignment → hidden.

#### Scenario: Past-year synced result (the screenshot case)

- GIVEN an eligible result with `report_year_id = 2025`, reporting year `2026`, synced to PRMS with code `9746`
- WHEN the user opens the result
- THEN the sidebar shows "Pool funding alignment"
- AND the PRMS sync card shows the status badge, actor/date, PRMS code `9746`, "Open result in PRMS" and "View full sync history"
- BUT the PRMS SYNC button must NOT be rendered (absent, not disabled)

#### Scenario: Past-year answered, never synced

- GIVEN an eligible 2025 result with `has_contribution = false` and no sync
- WHEN the user opens the Pool Funding page
- THEN the saved answer is displayed
- AND every data-changing control (contribution radios, Science Program card selection, Make-Primary, ToC block radios/selects/suggestions, quantitative contribution input) cannot change any data (focusable-but-guarded elements carry `aria-disabled`)
- AND no Save action is available
- AND IT MUST show a banner stating the data belongs to another reporting year and is read-only

#### Scenario: Past-year, never touched

- GIVEN an eligible 2025 result with `has_contribution = null` and no sync
- WHEN the user opens the result
- THEN the Pool Funding entry is hidden (unchanged from today)

#### Scenario: Current year unaffected

- GIVEN an eligible result with `report_year_id = 2026`, reporting year `2026`
- WHEN the user opens it
- THEN editability and the PRMS SYNC button follow today's rules exactly

### R-PRY-004 — Server rejects Pool Funding writes on other-year results

- **As** the platform owner **I want** the lock enforced by the API **so that** a direct call cannot edit a past-year record.

**Details:** `PATCH /api/v1/results/:code/pool-funding-alignment` (any body) and `POST|PATCH|DELETE /api/v1/results/:code/pool-funding-alignment/indicators/:indicatorCode/contribution` return `409` with `errors.code = "pool_funding_year_locked"` when the result is an other-year result. Source gates keep running first and keep their wording (PATCH: PRMS-sourced and external; contribution endpoints: PRMS-sourced only — design OQ-3). The year gate runs before the contributor and already-synced checks, so for an other-year result those two now answer with the year 409 (previously 400 / "already synced" 409). The PATCH's former `toc_mapping_version_locked` 409 is superseded by this code (R-BIL-097 AC.2/AC.3 superseded for the PATCH).

#### Scenario: Legacy body on past year

- GIVEN a 2025 eligible, unsynced result
- WHEN `PATCH …/pool-funding-alignment` is called with `{ has_contribution: true, sp_codes: [...] }` and no `toc_alignments`
- THEN the response is `409`, `errors.code = "pool_funding_year_locked"`
- AND IT MUST write nothing (no row changed, no socket event emitted)

#### Scenario: Current year still writable

- GIVEN a 2026 eligible, unsynced result
- WHEN the same PATCH is called
- THEN it succeeds as today

### R-PRY-005 — Server refuses PRMS push for other-year results

**Details:** `POST /api/results/:code/prms-sync` refuses an other-year result through the existing sync gate ladder with a new entry `reporting_year` (evaluated after `not_already_synced`, so an already-synced result keeps that answer), with a description naming both years. The refusal persists **no** sync-log row, so a rejected attempt never creates history for a locked result.

#### Scenario: Push on past year

- GIVEN an approved, green, contributing 2025 result
- WHEN `POST …/prms-sync` is called
- THEN it is refused by the `reporting_year` gate
- AND IT MUST NOT call the PRMS Normalizer
- AND IT MUST NOT write a `result_prms_sync_log` row

### R-PRY-006 — Server reports whether the result has Pool Funding data

**Details:** `GET /api/v1/results/:code/pool-funding-alignment` adds `has_pool_funding_data: boolean` (definition in §2) and `reporting_year: number` (the resolved year, used by the read-only banner copy). `version_locked` keeps its name and meaning (`report_year_id ≠ reporting year`), now against the configured year.

#### Scenario: Flag values

- GIVEN results with (`has_contribution`, synced) = (null, no), (false, no), (null, yes)
- WHEN the alignment is read
- THEN `has_pool_funding_data` is `false`, `true`, `true`
- AND `reporting_year` equals the resolved reporting year

---

## 5. Non-functional requirements

### NFR-PRY-001 — Propagation window is stated (K-016)

- **Category:** reliability / dx
- **Target:** gates, `version_locked`, the ToC catalog and the CLARISA projects feed reflect a saved year on the next request / next call (caches are year-keyed; no TTL window). Stated in the rollout note.
- **How verified:** unit test (resolver returns new value on next call); TTL documented.

### NFR-PRY-002 — Fail direction

- **Category:** reliability
- **Target:** an unreadable row degrades to `2026` (today's behavior), never to "everything locked" or "everything open".
- **How verified:** unit test on the resolver.

---

## 6. Data requirements

- No schema change. One seed migration inserts the `app_config` row `ARI_PRMS_SYNC` (`simple_value '2026'`, category `API`, subcategory `PRMS`) without overwriting an existing row; `down` deletes it.
- Migration applies on Dev via the Jenkins deploy (`migration:execute`); **Prod application is a human step to verify before deploy** (K-015 correction, root `CLAUDE.md` §4.3).

## 7. API surface delta

| Endpoint | Change |
| --- | --- |
| `GET /api/v1/results/:code/pool-funding-alignment` | + `has_pool_funding_data`, `reporting_year`; `version_locked` reads configured year |
| `PATCH /api/v1/results/:code/pool-funding-alignment` | + 409 `pool_funding_year_locked` for other-year results (any body) |
| `POST/PATCH/DELETE /api/v1/results/:code/pool-funding-alignment/indicators/:indicatorCode/contribution` | + same 409 |
| `POST /api/results/:code/prms-sync` | + `reporting_year` gate |
| `GET /api/v1/results/:code/pool-funding-alignment/hlos-indicators` | `version_locked` reads configured year |

Paths as today: the Pool Funding handlers are `@Version('1')` (`/api/v1/...`); `prms-sync` is unversioned (`/api/...`). Verified at `bilateral.controller.ts` (8× `@Version('1')`) and `main.routes.ts:91,95`.

## 8. Cross-system impact

- **lambda-toc / CLARISA:** query param value now from DB; no contract change.
- **PRMS webhook apply:** target year from the configured year (see OQ-2).
- **STAR client:** sidebar gate, PRMS SYNC visibility, Pool Funding page read-only mode.

---

## 9. Defect classes → gates

| Defect class | Gate | Notes |
| --- | --- | --- |
| A year consumer still reads env/constant | `/usr/bin/grep -rn "MAPPABLE_LIVE_VERSION\|ARI_PRMS_SYNC\|PRMS_SYNC_YEAR" server/researchindicators/src` reviewed hit by hit + `npx tsc --noEmit` | Constant removal makes a missed site a compile error |
| Stale year from a cache | Unit test: change resolved year between two calls, assert second call's URL/result | lambda-toc cache key today excludes year |
| Server write accepted on other year | Unit tests per endpoint (PATCH legacy body, contribution ×3, prms-sync) | Mutation: remove guard → red |
| Client state table wrong (§R-PRY-003) | Sidebar + page component specs over all four rows | Fixtures vary year **and** data per case (KZ-004) |
| A control left editable in read-only | Component spec enumerating every control + **human check at HITL** | jsdom can't prove visual "looks read-only" |
| Seed not applied in Prod | Rollout checklist: `migration:show` before Prod deploy | No automated gate — accepted, owned by human |
| Visual: read-only banner / card layout | **Human check at HITL pause** | No automated visual gate |

---

## 10. Assumptions, dependencies, risks

| # | Item | Mitigation |
| --- | --- | --- |
| A-1 | `has_contribution`, the synced flag and the PRMS code are enough to detect "has data": refusal-only history can exist without them, but the sidebar card needs a PRMS code to render, so no visible case is lost | Design P-10 |
| R-1 | Changing the year to 2027 locks every 2026 result mid-cycle | Intended; the admin owns the timing — stated in rollout note |
| R-2 | Prod deploy before seed migration → resolver falls back to 2026 (safe) | NFR-PRY-002 |

## 11. Open questions

- **OQ-1** — *Closed → design D-3:* the client does not read the year; the server computes `version_locked`, `has_pool_funding_data`, `reporting_year`.
- **OQ-2** — *Closed → design D-7:* webhook apply / target-year writes use the configured year (identical while year = 2026).

## 12. Requirement ID index

R-PRY-001 · R-PRY-002 · R-PRY-003 · R-PRY-004 · R-PRY-005 · R-PRY-006 · NFR-PRY-001 · NFR-PRY-002

## 13. Sign-off

- [ ] Engineering lead — d.casanas@cgiar.org
- [ ] Product owner — TBD
