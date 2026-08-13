# Requirements — results-center / url-filters

- **Module:** results-center (client) + results (server, link producer only)
- **Spec id:** 2026-08-url-filters
- **Status:** draft
- **Owner:** d.casanas@cgiar.org
- **Linked PRD section:** `docs/prd.md` — Results Center / reporting flows
- **Linked tickets:** —
- **Depth:** Standard
- **Extends:** `docs/specs/archive/2026-08-11-results--capdev-bulk-upload-notification` (supersedes its §15 Q1 query-string stance; the archive itself is not edited)
- **Last updated:** 2026-08-12

---

## 1. Context

The Results Center table has a filter sidebar whose state is **not addressable from the URL**. A partial mechanism existed — `results-center.component.ts` read `indicatorTab`, `statusTab`, `statusLabel` and `tab` — but it had no contract parameter, used opaque numeric ids, and **deleted the parameters from the address bar** immediately after applying them. There were **two** such wipes (one for `indicatorTab`/`statusTab`/`statusLabel`, one for `tab`). No link survived a copy or a reload.

> *Tense corrected 2026-08-13, post-T-08.* This paragraph described the pre-spec world in the present tense and carried the raw line ranges `112-121` / `133-138`. Those ranges are now **actively dangerous** — in the current tree they point inside `indicatorVocabularyCompletenessCheck` and `statusVocabularyCompletenessCheck`, T-06's NFR-RCU-002 layer-2 mitigation — and `tasks.md` T-08 says so, but that warning was never swept into this document. T-06 merged the two wipes into a single call and T-08 deleted it: `initializeState` now performs no navigation at all, and the address bar is kept in sync by `urlWriteEffect`.

The immediate driver is the `[STAR CapDev panel link]` slot in the CapDev bulk-upload completion email, which promises the Project Leader a view of *the uploaded* activities and therefore must carry both the **contract** and the **indicator**. The general need is broader: any filtered view should be shareable and reload-safe.

**Not changing:** the results API contract (`ResultFilter` wire keys), the filter sidebar's visual design, pagination/sort/search state, and the `indicators` database schema.

### Affected surface — enumerated by what renders and what links in *(KZ-002)*

| Surface | File | Role |
| --- | --- | --- |
| Results Center page shell | `results-center.component.ts` | reads/writes URL, owns precedence |
| Results Center state | `results-center.service.ts` | holds `tableFilters` / `resultsFilter` / `appliedFilters` |
| Filter sidebar | `components/table-filters-sidebar/` | renders the chips URL state must match |
| Indicator tab strip | `components/indicators-tab-filter/` | renders the tab URL state must match |
| **Project dashboard (shared consumer)** | `project-dashboard.component.ts:215` → `initializeProjectDashboardResultsTable` | uses the *same* root-singleton service; must be unaffected |
| **Project detail (shared consumer)** | `project-detail.component.ts:156` + `.html:161` → `applyFilters()` | same singleton, different route |
| **Linked-results modal (shared consumer)** | `select-linked-results-modal.component.ts:137,156,262` → `clearAllFilters()` / `clearAllFiltersWithPreserve()` | renders on `/result/…` routes |
| **Links-to-result page (shared consumer)** | `links-to-result.component.ts:169` → `clearAllFiltersWithPreserve()` | same |
| **Results table (shared)** | `results-center-table.component.ts:249` → `removeFilter` → `applyFilters` | rendered by both surfaces |
| Home — indicator card | `home/components/data-overview/data-overview.component.html:42` | link producer |
| Home — status card | `home/components/data-overview/data-overview.component.ts:90-91` | link producer |
| Home — "My Results" | `home/components/main-actions/main-actions.component.html:22` | link producer |
| CapDev email link | `capdev-bulk-notification.service.ts:89` (**server**) | link producer |

---

## 2. Requirement numbering

Requirements use `R-RCU-<NNN>` (Results Center URL); non-functional use `NFR-RCU-<NNN>`. Numbered in dependency order — the vocabulary (`R-RCU-001`) is foundational to everything after it.

---

## 3. Functional requirements

### R-RCU-001 — Canonical human-readable URL vocabulary

- **As a** recipient of a STAR link (Project Leader, reporting user)
- **I want** the URL to name filters in words I recognize
- **So that** I can trust, read and hand-edit the link before clicking it

**Details:**

- Inputs: query parameters on `/results-center`.
- Behavior:
  - Each filter the sidebar actually exposes SHALL have exactly one canonical query parameter: `indicator`, `contract`, `status`, `year`, `source`, plus `tab` for the my/all scope. **Six parameters.**
  - Multi-value parameters SHALL use a comma-separated list (`?contract=A100,S192`). `contract`, `status`, `year` and `source` are multi-value.
  - **`indicator` is single-value.** It drives the indicator tab strip (`indicator-codes-tabs`), which holds exactly one id and renders exactly one active tab; the sidebar's indicator multiselect is *hidden* whenever a tab is set (`table-filters-sidebar.component.html:2`). A comma-separated `indicator` is therefore unrepresentable and SHALL be rejected as an invalid token per R-RCU-005, not silently truncated to its first value.
  - `contract`, `year` and `source` SHALL use their existing natural keys (`agreement_id`, report year, `platform_code`) — these are already human-readable and MUST NOT be re-encoded.
  - `indicator` SHALL use the slug vocabulary already published by the server as `QueryIndicatorsEnum` (`capacity-sharing-for-development`, `innovation-dev`, `knowledge-product`, `policy-change`, `oicr`, `innovation-use`).
  - `status` SHALL use a frozen slug vocabulary enumerated in `design.md`, authored from the `allResultStatus` control list the filter actually offers. **Known data divergence, out of scope to fix here:** the server's own `ResultStatusNameEnum` carries 22 ids and eight different names for the same rows; see §9 R5.
  - **`lever` is excluded.** `TableFilters.levers` and `lever-codes` exist in the state model and render a chip, but the Results Center sidebar declares no lever control — `@ViewChild('leverSelect')` in `table-filters-sidebar.component.ts:20` resolves to `undefined` because `#leverSelect` is absent from the template. Exposing a URL parameter for a filter with no input control is out of scope per §1 ("not changing: filters that do not exist in the sidebar today") and is additive later.
  - **Case policy, by token class** (a single "lower-case on write" rule is wrong here — it would corrupt natural keys):
    - Parameter **names** SHALL be lower-case on write, and **lower-case-folded before lookup on read** — `queryParamMap` lookups are case-sensitive, so without folding, AC.3's own example (`?CONTRACT=…`) never resolves. **Folding MUST be symmetric:** the recognized-name list is stored folded too, or the camelCase legacy names (`indicatorTab`, `statusTab`, `statusLabel`) match nothing and every delivered link breaks.
    - **Vocabulary tokens** (`indicator`, `status`, `source`, `tab`) SHALL be lower-case canonical and case-insensitive on read.
    - **`contract`** SHALL be normalized to **upper-case** on both read and write. `agreement_id` values are upper-case alphanumeric in the source system, so this is deterministic and requires no control-list lookup, which keeps D-URL-7 (no existence validation) intact.
    - **`year`** is numeric; case does not apply.
- Outputs: an address-bar URL a human can read aloud.

**Acceptance criteria:**

- [ ] AC.1 — `/results-center?indicator=capacity-sharing-for-development&contract=A100` is a valid, fully-specified link.
- [ ] AC.2 — No canonical parameter accepts a numeric database id as its documented form.
- [ ] AC.3 — `?CONTRACT=a100` resolves identically to `?contract=A100`.
- [ ] AC.4 — Every indicator id present in the indicator control list maps to exactly one slug, and every slug maps back to exactly one id.
- [ ] AC.5 — The vocabulary introduces **no fourth spelling** of an indicator: the slugs are byte-identical to the server's `QueryIndicatorsEnum` values. `cap_sharing` (`star-pdf-report.util.ts:26`) remains a PDF-report key and MUST NOT leak into the URL.

**Out of scope:** localizing or aliasing slugs; a slug column in the `indicators` table.

---

### R-RCU-002 — Filters apply from the URL on load

- **As a** recipient of a filtered link
- **I want** the page to open already filtered
- **So that** I see the records the link promised without touching the sidebar

**Details:**

- Behavior: on component init, recognized parameters are parsed, validated, and applied to **all three** state signals (`tableFilters`, `resultsFilter`, `appliedFilters`) plus the indicator tab strip, before the first results fetch.
- Outputs: one results request **from the URL read path**, carrying the URL-derived filter; sidebar chips and tab strip reflecting it.

> ⚠️ **Scope correction, 2026-08-13 (Pivot Record, `execution.md` §9 — option C).** The clauses below originally promised *"exactly one results request for the initial load"*, full stop. T-11's real-render harness proved that false, and the cause is **not** in this spec's layer: the results table is `[lazy]="true"` with no `lazyLoadOnInit="false"` (`results-center-table.component.html:60,64`), so PrimeNG fires `onLazyLoad` → `handleResultsTableLazyLoad` → an unconditional `void this.main()` (`results-center.service.ts:594-612`) during the table's own init, independently of the URL. That wiring is present on `main` and **predates this spec entirely**; `main()`'s dedupe cannot collapse the two calls because the filter states, and therefore the `fetchKey`s, differ.
>
> This spec's guarantee is therefore restated as what it can actually own: **the URL read path contributes exactly one request, and it is seeded before it fires.** The table's own init-time fetch is pre-existing production behavior, out of scope here, and tracked as its own defect in **`docs/specs/bugfix/results-center-double-fetch`**. Do not read the amended clauses as a claim that a Results Center load issues one request in total — today it does not.

#### Scenario: CapDev email link

- GIVEN a Project Leader opens `/results-center?indicator=capacity-sharing-for-development&contract=A100`
- WHEN the page finishes loading
- THEN the table shows only results of contract `A100` under the Capacity Sharing indicator
- AND the Capacity Sharing tab is the active tab in the strip
- AND the filter sidebar shows a `PROJECT: A100` chip
- BUT **the URL read path** must NOT issue more than one results request for the initial load *(amended 2026-08-13 — see the scope correction above; the table's own `lazyLoadOnInit` fetch is a separate, pre-existing request this spec does not own)*
- AND IT MUST apply the filter *before* the first request, never by fetching unfiltered and then re-fetching

#### Scenario: Multi-value parameter

- GIVEN a link with `?contract=A100,S192`
- WHEN the page loads
- THEN both contracts appear as chips and both are sent in `contract-codes`
- AND IT MUST preserve the order the values appeared in the URL

**Acceptance criteria:**

- [ ] AC.1 — Every one of the six parameters, applied alone, filters the table.
- [ ] AC.2 — Parameters combine: two different parameters in one URL both apply.
- [ ] AC.3 — Sidebar chips and the tab strip match the applied filter — **state parity across all three signals is asserted, not just the API payload.**
- [ ] AC.4 — **The URL read path issues exactly one results request for the initial load, and it is seeded before it fires.** *(Amended 2026-08-13 per the Pivot Record, `execution.md` §9. The original wording — "Exactly one results request is issued for the initial load" — was proven false by T-11's real-render harness and was **never** true in production; the second request comes from the table's own `lazyLoadOnInit`, which predates this spec. Deferred to `docs/specs/bugfix/results-center-double-fetch`. **T-06's `[x]` stands on the amended clause, not the original one** — it verified the read path, which is what it implemented; it never had a harness that could see the table.)*
- [ ] AC.5 — `?tab=my` scopes to the current user's results without the user id ever appearing in the URL.
- [ ] AC.6 — A URL carrying **no** `tab` resolves the my/all scope from the user's pinned-tab preference, exactly as a parameter-less visit does today. The scope is never left at whatever the root-singleton service happened to hold from a previous route.
- [ ] AC.7 — A URL carrying `tab=my` **together with** another filter applies both; the scope is not overwritten by the filter seeding, in either order.

---

### R-RCU-003 — Applied filters are reflected back into the URL

- **As a** reporting user
- **I want** the address bar to match what I am looking at
- **So that** sharing my view is copy-paste

**Details:**

- Behavior: whenever applied filters change through the UI, the URL is rewritten to the canonical serialization of the current filter state. Filters that are empty are omitted, not written as empty parameters.

#### Scenario: User adds a filter

- GIVEN a user on `/results-center` with no filters
- WHEN they select contract `A100` in the sidebar and apply
- THEN the address bar becomes `/results-center?contract=A100`
- AND copying that URL into a new tab reproduces the same view
- BUT it must NOT push a new browser-history entry per filter change — the back button MUST return to the page the user arrived from, not step through each intermediate selection
- AND IT MUST NOT re-trigger the URL read path, and MUST NOT cause an additional results request

#### Scenario: User clears filters

- GIVEN a user on `/results-center?contract=A100&year=2025`
- WHEN they clear all filters
- THEN the address bar becomes `/results-center` with no query string
- BUT it must NOT leave orphaned empty parameters such as `?contract=`

**Acceptance criteria:**

- [ ] AC.1 — Applying, changing and clearing each of the five sidebar filters (plus `tab`) updates the URL correspondingly.
- [ ] AC.2 — The written URL, re-read, reproduces the identical filter state (round-trip).
- [ ] AC.3 — A filter change produces zero additional results requests beyond the one the change itself causes.
- [ ] AC.4 — Browser history depth after N filter changes is unchanged from before them.

---

### R-RCU-004 — URL parameters take precedence over persisted view state

- **As a** recipient of a link
- **I want** the link to win over whatever I was last looking at
- **So that** the sender's intent is what I see

**Details:**

- Behavior: `restorePersistedState` (sessionStorage, `results-center.service.ts:962`) is skipped when the URL carries **any** recognized filter parameter. With no recognized parameter, current restore behavior is unchanged.

#### Scenario: Link overrides a stale session

- GIVEN a user whose sessionStorage holds a saved view filtered to `status=pending-revision`
- WHEN they open `/results-center?contract=A100`
- THEN only the `A100` contract filter is applied
- BUT it must NOT merge the persisted status filter into the view
- AND IT MUST leave the persisted state either overwritten by the new view or untouched — never partially merged

**Acceptance criteria:**

- [ ] AC.1 — A recognized parameter suppresses session restore entirely.
- [ ] AC.2 — No recognized parameter → restore behaves exactly as today.
- [ ] AC.3 — An *unrecognized* parameter alone (`?utm_source=email`) does not suppress restore.

---

### R-RCU-005 — Invalid input degrades to a usable page

- **As a** user following a mistyped, stale or truncated link
- **I want** the page to still work and tell me something is off
- **So that** I am not staring at an unexplained empty table

**Details:**

- Behavior: each token is validated independently. Unrecognized tokens are dropped; the remaining valid filters are applied; a single non-blocking notice reports that part of the link was ignored.

#### Scenario: One bad token among good ones

- GIVEN a link `/results-center?indicator=not-a-real-indicator&contract=A100`
- WHEN the page loads
- THEN the `A100` contract filter is applied and results are shown
- AND a non-blocking notice states that part of the link was not recognized
- BUT it must NOT show an error page, block rendering, or discard the valid `contract` filter
- AND IT MUST NOT name the rejected raw token back to the user verbatim without escaping it

#### Scenario: Entirely unusable link

- GIVEN a link where every recognized parameter carries an invalid value
- WHEN the page loads
- THEN the unfiltered Results Center renders normally with the notice shown
- AND IT MUST NOT fall through to session restore — an invalid link is still an explicit navigation intent

**Acceptance criteria:**

- [ ] AC.1 — A malformed value in one parameter never prevents another parameter from applying.
- [ ] AC.2 — The notice appears exactly once per navigation, not once per bad token.
- [ ] AC.3 — Values are escaped before display; a token containing markup or a quote cannot alter the notice's rendering.
- [ ] AC.4 — An excessively long or repeated parameter is rejected without a runtime error. Concretely: a list parameter carrying more than **50** values is rejected as a whole; any single token longer than **64** characters is dropped; and a **repeated key** (`?contract=A100&contract=S192`) is read via `getAll()` and flattened, never silently reduced to its first occurrence.

---

### R-RCU-006 — Legacy parameters keep working, permanently

- **As a** recipient of an email sent before this change
- **I want** my old link to still work
- **So that** a link that lives in my inbox forever does not rot

**Details:**

- Behavior: `indicatorTab=<id>`, `statusTab=<id>` and `statusLabel=<text>` remain accepted on read. They are **never emitted** by any producer after this change. This support has **no deprecation date** — see §9 R1.
- **`tab` is not legacy.** It is a canonical parameter (R-RCU-001) that happens to predate this spec; it keeps its current spelling and its current producer. It is read *and* written, and its wipe was removed along with the other one by T-08 — locate it by content, never by line number *(see §1's tense-correction note; the `133-138` citation this bullet used to carry now points inside T-06's NFR-RCU-002 mitigation)*.
- `statusLabel` is accepted but its value is **ignored**: the display label is resolved from the client's own status control list.

#### Scenario: Already-delivered CapDev email

- GIVEN a link `/results-center?indicatorTab=1` sent before this change
- WHEN the recipient opens it today
- THEN the Capacity Sharing tab is selected and results are filtered accordingly
- BUT it must NOT be silently ignored or redirected to an unfiltered page

#### Scenario: Legacy and canonical in one URL

- GIVEN a link carrying both `?indicatorTab=1&indicator=policy-change`
- WHEN the page loads
- THEN the canonical `indicator` parameter wins
- AND IT MUST resolve deterministically — never depend on parameter order

**Acceptance criteria:**

- [ ] AC.1 — Each of the three legacy parameters still applies its filter.
- [ ] AC.2 — Canonical beats legacy for the same filter, deterministically.
- [ ] AC.3 — `statusLabel`'s value never reaches the rendered chip; the label comes from the control list.
- [ ] AC.4 — No producer in the repository emits `indicatorTab`, `statusTab` or `statusLabel` after this change.

---

### R-RCU-007 — Every link producer emits the canonical scheme

- **As a** maintainer
- **I want** one scheme in use across the platform
- **So that** the vocabulary does not fork again

**Details:**

- Behavior: the four producers enumerated in §1 are updated. The server's CapDev email link SHALL carry both the group's `agreement_id` and the CapDev indicator slug.

#### Scenario: CapDev email link content

- GIVEN a CapDev bulk-upload notification for agreement `A100`
- WHEN the email's `starLink` is built
- THEN it is `<client-host>/results-center?indicator=capacity-sharing-for-development&contract=A100`
- BUT it must NOT hard-code the client host — it MUST keep using the existing `COMPLETE_CLIENT_HOST` helper
- AND IT MUST NOT emit `indicatorTab`

**Acceptance criteria:**

- [ ] AC.1 — Home's indicator card, status card and "My Results" action all emit canonical parameters.
- [ ] AC.1b — **Home's "My results by status" and "My results by indicator" cards emit `tab=my` explicitly**, alongside their filter parameter. Today their My-scope comes from an unconditional `loadMyResults(true)` (`results-center.component.ts:102`) that R-RCU-002's read path removes; without `tab=my` those cards would resolve to the pinned preference, which defaults to **`all`**, and a card titled "My results by indicator" would show every user's results.
- [ ] AC.2 — The server link builder emits the contract of the group being notified, not a batch-wide or hard-coded value.
- [ ] AC.3 — A repository-wide search finds no remaining producer of `indicatorTab` / `statusTab` / `statusLabel`.

---

## 4. Non-functional requirements

### NFR-RCU-001 — No navigation loop, no duplicate fetch

- **Category:** reliability
- **Target:** **the URL layer** issues 0 additional results requests: the read path contributes exactly 1 on initial load, any single filter change contributes exactly 1, and a URL **write** contributes 0. *(Amended 2026-08-13 — the original target read "initial load issues exactly 1 results request", a whole-page claim this spec's layer cannot make. See R-RCU-002's scope correction and the Pivot Record in `execution.md` §9.)*
- **Not covered, and deliberately so:** the results table's own `lazyLoadOnInit` fetch, which fires from `handleResultsTableLazyLoad` independently of the URL and predates this spec. It means a real Results Center load currently issues **two** requests. Tracked in `docs/specs/bugfix/results-center-double-fetch`; **not** silently absorbed here.
- **How verified:** component test counting `router.navigate` invocations and results-service calls across load, change and clear — asserted against the **real rendered component tree** (T-11), because the overridden-template harness that first "verified" this could not observe the table at all *(KZ-001, recurrence 5)*.

### NFR-RCU-002 — Vocabulary drift is detected, and the limits of that detection are stated

- **Category:** dx / correctness
- **Target:** zero ids without a slug and zero slugs without an id, for both the `indicator` and `status` vocabularies.
- **How verified — two layers, because one is not enough:**
  1. **Unit test over a fixture** — asserts slug uniqueness and bidirectional mapping. **This layer cannot detect a value added server-side**: nobody updates the fixture, so the test stays green. Stating that plainly is the point; `proposal.md` → Option A originally described this as a test over `GET /indicators`, which it is not and cannot be in a unit suite.
  2. **Runtime completeness check** — when the relevant control list resolves, the codec compares it against the frozen map and emits a console warning naming any id with no slug. This is the layer that actually sees a server-side addition, and it fires in every dev and QA session.
- **Residual risk, accepted:** an id added server-side is addressable only after someone acts on the runtime warning. No automated gate closes this; recorded rather than papered over.

### NFR-RCU-003 — No user identifiers in the URL

- **Category:** security / privacy
- **Target:** no `sec_user_id` or other personal identifier is ever serialized into a query parameter.
- **How verified:** the `my`/`all` scope is expressed as `tab=my` and resolved client-side from the session cache; asserted by a test that the written URL never contains the cached user id.

### NFR-RCU-004 — History hygiene

- **Category:** ux
- **Target:** URL writes use replace semantics; N filter changes add 0 history entries.
- **How verified:** covered by R-RCU-003 AC.4.

### NFR-RCU-005 — Shared-consumer isolation

- **Category:** reliability
- **Target:** the project dashboard's fixed results table (`initializeProjectDashboardResultsTable`) is behaviorally unchanged — it does not read, write, or get overridden by URL parameters.
- **How verified:** an explicit test in **`project-dashboard.component.spec.ts`** — the only caller of `initializeProjectDashboardResultsTable` (`project-dashboard.component.ts:215`); `project-detail.component.ts` never references it. The existing spec mocks the service wholesale, so it must be extended with a real-service case that asserts no `router.navigate` occurs. Plus the equivalent for `project-detail`, `select-linked-results-modal` and `links-to-result` (§1). *(KZ-003 — the shared singleton means a targeted suite is not sufficient; a full client run is required.)*

---

## 5. Data requirements

None. No entity, column, index, migration or OpenSearch field changes. The slug vocabulary lives in code (see `proposal.md` → Option A); adding `indicators.slug` is an explicit non-goal.

---

## 6. API surface delta

None. `ResultFilter` wire keys (`indicator-codes-tabs`, `contract-codes`, `status-codes`, `lever-codes`, `years`, `platform-code`, `create-user-codes`) are unchanged. This spec adds a **URL layer above** the existing filter state, not a new server contract.

The only server change is the string built by `buildStarLink` / `CAPDEV_INDICATOR_TAB_QUERY` in `capdev-bulk-notification.service.ts` — a value, not an endpoint.

---

## 7. Cross-system impact

| System | Impact |
| --- | --- |
| **STAR client** | Primary surface — see §1 table |
| **ARI server** | One link-builder string (`capdev-bulk-notification.service.ts`) + its unit test |
| CLARISA / AGRESSO / TIP / ROAR / OpenSearch / DynamoDB / RabbitMQ | None |
| Socket.IO | None |

**Cross-package coupling is the notable risk:** the server produces a URL the client must parse, and no test in either package exercises both sides. See §8 R2 and the defect-class table below.

---

## 8. Defect classes and their gates

Per the constitution: name what this spec can get wrong, then say which command catches it.

| # | Defect class | Gate | Blind? |
| --- | --- | --- | --- |
| D1 | Codec maps a token to the wrong filter or drops a value | `npm test -- --silent` (client) — codec unit tests, round-trip property | No |
| D2 | Navigation loop / duplicate fetch | Component test counting navigate + fetch calls (NFR-RCU-001) — **only valid against a real rendered tree.** This gate returned a false green for T-06: the overridden-template harness could not see the table that issues the duplicate fetch. Re-armed by T-11 | **Was blind, now not** |
| D3 | **State desync** — the API filter applies but the sidebar chip or tab strip does not (three signals, one of them forgotten) | Component test asserting all three signals *and* the rendered chip, per R-RCU-002 AC.3 | No |
| D4 | Vocabulary drift when an indicator is added | Parity test = **layer 1 only** (T-01); the layer that actually detects a server-side addition is the **runtime completeness warning**, NFR-RCU-002 layer 2 (T-06) | **Partly** — layer 1 is blind to it by construction |
| D5 | Regression in Home links or the project dashboard | **Full** client suite, not targeted specs *(KZ-003)* | No |
| D6 | **Server emits a URL the client cannot parse** | ⚠️ **No automated gate crosses the package boundary.** Client tests never run the server's link builder; server tests never run the client's parser | **Yes** |

**D6 is the acknowledged blind spot.** Substitute controls, both required:

1. The canonical slug for the CapDev indicator is asserted against a **literal** string in both packages' tests, so a change on either side turns one of them red rather than failing silently in production.
2. A **human check at the Phase-3 HITL pause and again after execution**: paste the string the server builds into a running client and confirm the filtered view. This is a manual gate by necessity — it is recorded here rather than left implicit, because an unacknowledged blind spot is what burns rework rounds.

*(KZ-001 — the tests for D1–D3 must drive the real router/param map. An `ActivatedRoute` double returning a canned snapshot proves the assertion, not the parsing.)*

---

## 9. Assumptions, dependencies, risks

| # | Item | Type | Mitigation |
| --- | --- | --- | --- |
| A1 | The `agreement_id` values used as `contract` tokens are URL-safe (alphanumeric, e.g. `A100`, `S192`) | Assumption | Design must specify encoding behavior if a code ever contains a reserved character |
| R1 | **Legacy links are permanent.** Every CapDev email already delivered carries `?indicatorTab=1` in an inbox no one controls | Risk | R-RCU-006 support carries no deprecation date; stated explicitly so a future cleanup does not silently break delivered mail |
| R2 | Cross-package coupling with no shared test harness | Risk | D6 substitute controls above |
| R3 | Two-way sync interacts with sessionStorage restore and the `lastSuccessfulResultsFetchKey` dedupe; a naive implementation loops or double-fetches | Risk | NFR-RCU-001 + R-RCU-004 make the precedence and call counts testable rather than incidental |
| R4 | `results-center.service.ts` is a **root-provided singleton** shared by five surfaces on four different routes (§1) | Risk | The URL write path is owned by the component, not the service (design D-URL-9) — a structural guard, not a test. NFR-RCU-005 + full-suite requirement *(KZ-003)* |
| R5 | **`result_status` display names diverge between the database and the server's own `ResultStatusNameEnum`** — 22 ids vs 25 rows (15, 21, 22 absent from the enum) and eight differing names (id 5 `Revised` vs `Pending Revision`, id 10 `OICR Approved` vs `OICR Accepted`, …) | Risk | The slug map is authored from the control list the filter actually offers, and ids with no slug degrade via R-RCU-005. Reconciling the two sources is a separate data-integrity concern, explicitly out of scope |

---

## 10. Open questions

| # | Question | Owner | Target |
| --- | --- | --- | --- |
| Q1 | Does `contract` accept a comma-separated list, or exactly one value? *(Recommendation: list, for symmetry; the email emits one)* | d.casanas | Phase 2 (design) |
| Q2 | Is the status slug vocabulary hand-authored and frozen, or derived from display names? *(Recommendation: frozen constant, mechanically seeded from the names — a slug resolved at runtime from a display name breaks every delivered link when someone renames a status)* | d.casanas | Phase 2 (design) |
| Q3 | Should the notice in R-RCU-005 be a toast or an inline banner? | d.casanas | Phase 2 (design) |

Q1 and Q2 are resolved in `design.md` as design decisions; both recommendations are already reflected in the requirements above and change no acceptance criterion if overturned in favor of the alternative.

---

## 11. Requirement ID index

| ID | Title | Gates |
| --- | --- | --- |
| R-RCU-001 | Canonical human-readable URL vocabulary | D1, D4 |
| R-RCU-002 | Filters apply from the URL on load | D1, D3 |
| R-RCU-003 | Applied filters are reflected back into the URL | D1, D2 |
| R-RCU-004 | URL parameters take precedence over persisted view state | D2 |
| R-RCU-005 | Invalid input degrades to a usable page | D1 |
| R-RCU-006 | Legacy parameters keep working, permanently | D1, D5 |
| R-RCU-007 | Every link producer emits the canonical scheme | D5, D6 |
| NFR-RCU-001 | No navigation loop, no duplicate fetch | D2 |
| NFR-RCU-002 | Vocabulary drift detected in **two layers** — fixture parity (test, T-01) **and** runtime completeness warning (T-06) | D4 |
| NFR-RCU-003 | No user identifiers in the URL | D1 |
| NFR-RCU-004 | History hygiene | D2 |
| NFR-RCU-005 | Shared-consumer isolation | D5 |

---

## 12. Sign-off

- [ ] Engineering lead — d.casanas@cgiar.org
- [ ] MEL / product owner — —
- [ ] Security review — not required (no auth/secrets touched; NFR-RCU-003 covers the only privacy surface)
- [ ] DevOps — not required (no infra change)
