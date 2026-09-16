# Proposal — Results Center URL Filters

## Document Control

| Field | Value |
| --- | --- |
| Spec path | `docs/specs/results-center/url-filters` |
| Slug | `url-filters` — derived from the free-text argument ("filtros por URL en la tabla del results center"); module folder `results-center` mirrors `client/research-indicators/src/app/pages/platform/pages/results-center/` |
| Type | **Change** |
| Approval Mode | `gated` |
| Depends on | none (the CapDev notification spec is archived; this changes the link it emits) |
| Parallel-safe | **no** — touches `results-center.service.ts` and the CapDev email link; do not run alongside another results-center or ai-reports spec |
| Packages | client **and** server |
| Author | d.casanas@cgiar.org |
| Date | 2026-08-12 |

---

## Intent

Make the Results Center table's filters addressable from the URL, with human-readable tokens, so a link like the one below lands the recipient on exactly the filtered view:

```
/results-center?indicator=capacity-sharing-for-development&contract=A100
```

The immediate driver is the `[STAR CapDev panel link]` slot in the CapDev bulk-upload completion email, which must open the Results Center pre-filtered by **contract** and **indicator**. The general need is broader: any filtered view should be shareable, bookmarkable and reload-safe.

---

## Problem / Current Behavior

The Results Center has a full filter sidebar, but its state is **not addressable**. Three separate problems compound:

| # | Problem | Evidence |
| --- | --- | --- |
| 1 | **No contract parameter exists at all.** The one filter the CapDev email most needs cannot be expressed in a URL. | `results-center.component.ts:92-94` reads only `indicatorTab`, `statusTab`, `statusLabel`, `tab` |
| 2 | **Existing params are opaque numeric IDs.** `?indicatorTab=1` is unreadable, unguessable and untrustworthy in an email to an external Project Leader. | `isValidNumericIdQueryParam` (`results-center.component.ts:79-85`) |
| 3 | **The URL self-destructs.** After applying the params the component navigates with `{indicatorTab: null, statusTab: null, statusLabel: null}` and `replaceUrl: true`. The address bar is clean before the user can copy it; a reload loses the filter. | `results-center.component.ts:112-121` |

Net effect: the current `?indicatorTab=1` link the email already emits (`capdev-bulk-notification.service.ts:89`) *technically* preselects the CapDev tab, but it is not filtered by contract, not readable, and not reload-safe — so it does not satisfy the email's promise of "review **the uploaded** Capacity Development activities".

### What the state model already gives us for free

| Filter | Underlying value | Already human-readable? |
| --- | --- | --- |
| `contract-codes` | `agreement_id` string — `"A100"`, `"S192"` | ✅ yes, it *is* the well-known code |
| `years` | report year number | ✅ |
| `platform-code` | `STAR`, `TIP`, `PRMS`, `AICCRA` | ✅ |
| `lever-codes` | lever id | ⛔ **no sidebar control renders it** — excluded, see `requirements.md` R-RCU-001 |
| `indicator-codes-tabs` / `-filter` | `indicator_id` number | ❌ needs a slug vocabulary |
| `status-codes` | `result_status_id` number | ❌ needs a slug vocabulary |

Only **two** of the filters need a new vocabulary. The rest are already natural keys.

> **Corrected in Phase 2 (2026-08-12):** the sidebar exposes five controls, not seven — there is no lever control (`#leverSelect` is absent from `table-filters-sidebar.component.html`). The URL vocabulary is six parameters: `indicator`, `contract`, `status`, `year`, `source`, `tab`.

### Vocabulary drift already exists

The CapDev indicator is spelled three different ways across the monorepo today:

| Spelling | Where | Purpose |
| --- | --- | --- |
| `1` | `IndicatorsEnum.CAPACITY_SHARING_FOR_DEVELOPMENT` | DB id |
| `capacity-sharing-for-development` | `QueryIndicatorsEnum` (server) | URL-facing slug, already used in server route paths |
| `cap_sharing` | `star-pdf-report.util.ts:26` (client) | PDF report key |

This change must pick **one** URL vocabulary and say so, not add a fourth. `QueryIndicatorsEnum` is the natural choice: it already exists, is already URL-shaped, and is already the canonical public spelling on the server side. Note the `indicators` table has **no** slug column — the mapping lives in code, not in the database.

---

## Proposed Outcome

1. A recipient of the CapDev email clicks the link and sees the Results Center filtered to that contract and the Capacity Sharing indicator, with both filter chips visible in the sidebar exactly as if they had picked them by hand.
2. The URL still shows those parameters after the page loads. Copying it, reloading it, or sending it to a colleague reproduces the same view.
3. A user who changes filters in the UI sees the URL update to match, so "share what I'm looking at" is copy-paste.
4. An unrecognized or malformed token degrades to a *usable* page (remaining valid filters applied, a non-blocking notice), never a blank table with no explanation and never an error page.

---

## Scope

**In scope**

| Area | Work |
| --- | --- |
| URL codec | Bidirectional `URL ⇄ ResultFilter` mapping for the six exposed filters: `indicator`, `contract`, `status`, `year`, `source`, `tab` |
| Read path | Parse on load, validate, apply to `tableFilters` + `resultsFilter` + `appliedFilters`, and sync the indicator tab strip |
| Write path | Reflect applied filters back into the URL on change (`replaceUrl: true`, so the back button is not polluted by every checkbox) |
| Precedence | URL beats `sessionStorage` restore when any recognized filter param is present (`restorePersistedState`, `results-center.service.ts:962`) |
| Invalid input | Per-token validation; unknown tokens dropped with a toast, rest applied |
| Legacy params | Keep reading `indicatorTab`, `statusTab`, `statusLabel`, `tab=my` — **indefinitely**, see Risks |
| Link producers | Update Home's three link builders and the server's email link to the new scheme |
| Server | Replace `CAPDEV_INDICATOR_TAB_QUERY` with the contract-aware, slug-based query string (`capdev-bulk-notification.service.ts:89`, `buildStarLink`) |

**Enumerated link producers** (per **KZ-002** — enumerate by *what links in*, not by where the feature lives):

| Producer | File | Current param |
| --- | --- | --- |
| Home → indicator card | `home/components/data-overview/data-overview.component.html:42` | `indicatorTab` |
| Home → status card | `home/components/data-overview/data-overview.component.ts:90-91` | `statusTab` + `statusLabel` |
| Home → "My Results" action | `home/components/main-actions/main-actions.component.html:22` | `tab=my` |
| CapDev completion email | `capdev-bulk-notification.service.ts:89` (server) | `indicatorTab` |

---

## Non-Goals

- New filters that do not exist in the sidebar today.
- Changing the results API contract (`ResultFilter` wire keys stay as they are — this is a URL-layer concern only).
- Putting pagination, sort order, or the search box into the URL.
- Adding a slug column to the `indicators` table (recorded as the Option B migration path, not this change).
- Localizing or aliasing slugs (one canonical spelling per value).
- The Projects table or any other filtered table — Results Center only.

---

## Affected Users, Systems, And Specs

| Affected | Detail |
| --- | --- |
| **Project Leaders (external)** | Primary beneficiary — receive and click the email link |
| **Reporting users** | Gain shareable filtered views |
| Client | `results-center.component.ts` (+ **rewritten** spec), `results-center.service.ts`, `components/table-filters-sidebar/`, `components/indicators-tab-filter/`, Home's `data-overview` + `main-actions` (+ specs) |
| Client — **shared-singleton consumers** *(added after Judgment Day JD-17)* | `project-dashboard`, `project-detail`, `select-linked-results-modal`, `links-to-result` — all mutate the same root-provided `ResultsCenterService` from other routes; each needs an isolation assertion |
| Server | `capdev-bulk-notification.service.ts` (`buildStarLink`, `CAPDEV_INDICATOR_TAB_QUERY`) |
| Specs | `docs/specs/archive/2026-08-11-results--capdev-bulk-upload-notification` — its §15 Q1 "query-string stance" is superseded by this change; the archive stays as a point-in-time record and is **not** edited |
| Docs | `docs/ux-ui/design.md` decisions log — the URL vocabulary belongs there as a durable contract |

---

## Visual Reference

- **Source:** None.
- **Location:** n/a.
- **Notes:** No new screens or components. The change is routing + state wiring; every visual affordance (filter chips, tab strip, sidebar) already exists and must simply reflect the URL-seeded state. A mockup would add nothing reviewable.

---

## Requirement Delta Preview

### ADDED

- `contract` URL parameter accepting one or more `agreement_id` values (`?contract=A100` or `?contract=A100,S192`).
- `indicator`, `status`, `year`, `source` URL parameters using human-readable tokens.
- Write path: applied filters are reflected into the URL as the user changes them.
- Precedence rule: URL parameters override persisted `sessionStorage` state.
- Validation + graceful degradation for unknown tokens.

### MODIFIED

- `indicatorTab=<id>` → `indicator=<slug>`; legacy form still accepted.
- `statusTab=<id>&statusLabel=<name>` → `status=<slug>`. **The `statusLabel` param disappears from the new scheme by design** — passing a display label through the URL lets the address bar dictate UI copy; the client already has the status control list and must resolve the label itself.
- URL parameters are **no longer wiped** after being applied.
- The CapDev email's `starLink` gains the contract filter and switches to slug tokens.

### REMOVED

- Nothing removed outright. Legacy parameters are retained for compatibility (see Risks).

---

## Approach Options

### Option A — Client-side codec, vocabulary as a shared constant *(recommended)*

A table-driven codec in the client maps each URL param to its `ResultFilter` key, with a `slug ↔ id` constant for indicators and statuses mirroring the server's `QueryIndicatorsEnum`.

| | |
| --- | --- |
| **Cost** | Client-only for the vocabulary; no migration, no API change |
| **Risk** | Drift: a new indicator added server-side is not automatically URL-addressable |
| **Mitigation** | Two layers, because one is not enough: a fixture unit test for uniqueness/bidirectionality, **plus** a runtime completeness warning when a resolved control list contains an id with no slug. *(Corrected after Judgment Day JD-16: an earlier draft claimed a test over `GET /indicators`. A unit suite does not call the API, so that test cannot exist as described — and a fixture test structurally cannot see a server-side addition. See `requirements.md` NFR-RCU-002 for the accepted residual risk.)* |

### Option B — Slug column in the database, exposed by the API

Add `indicators.slug` (and a status equivalent), backfill it, expose it on the control-list endpoints, and have the client read the slug from the same list it already loads.

| | |
| --- | --- |
| **Cost** | Migration + backfill + API contract change + OpenSearch mapping review + client wiring |
| **Benefit** | Single source of truth, zero drift, vocabulary consumable by third parties |
| **Verdict** | Correct long-term shape, disproportionate for unblocking one email link |

### Option C — Keep numeric IDs, add only `contract`

`?indicator=1&contract=A100`. Smallest possible change.

| | |
| --- | --- |
| **Cost** | Minimal |
| **Verdict** | **Rejected** — explicitly fails the stated requirement that the link be user-friendly, and leaves the opaque-ID problem to be reopened later |

---

## Recommended Approach

**Option A**, with the parity test as a hard requirement rather than a nicety.

It is the smallest change that fully satisfies the intent: it delivers readable, shareable URLs for every filter the sidebar exposes without a migration or an API contract change, and it reuses the vocabulary that already exists (`QueryIndicatorsEnum`) instead of inventing a fourth spelling of the same indicator. Option B remains the documented migration path for when the vocabulary needs an external consumer; nothing in Option A blocks it — the codec's lookup can later be re-pointed from a constant to the control list without touching the URL contract.

---

## Risks, Dependencies, And Open Questions

| # | Risk / Question | Impact | Handling |
| --- | --- | --- | --- |
| R1 | **Legacy links live forever.** Every CapDev email already delivered carries `?indicatorTab=1` in someone's inbox. | High | Legacy params are permanently supported, not deprecated on a timer. Say this in the spec so a future cleanup does not silently break delivered mail. |
| R2 | **Two-way sync ↔ sessionStorage ↔ fetch dedupe interaction.** Writing the URL on filter change, restoring state, and `lastSuccessfulResultsFetchKey` can produce a navigation loop or a double fetch. | High | Precedence rule must be explicit and tested: URL wins on load; URL writes use `replaceUrl: true` and must not re-trigger the read path. |
| R3 | **Blast radius beyond the feature folder (KZ-002, KZ-003).** Home's three link builders render outside `results-center/`, and `results-center.service.ts` is shared with the project dashboard (`initializeProjectDashboardResultsTable`). | High | Enumerate by what links in and what renders — the producer table above is the starting inventory, and a full client suite run is required, not targeted specs. |
| R4 | **Test doubles must actually exercise routing (KZ-001).** A mocked `ActivatedRoute` that returns a canned snapshot proves nothing about URL parsing. | Medium | Requirements must specify that URL tests drive the real router/param map. |
| R5 | **Vocabulary drift (Option A's known weakness).** | Medium | Parity test, per Option A. |
| Q1 | Should `contract` accept multiple values, or exactly one? The email only ever needs one; the sidebar allows many. | Low | Recommend supporting the comma-separated list for symmetry with the other params; the email simply emits one. Resolve in `/akili-specify`. |
| Q2 | Should the status slug vocabulary be derived from `result_status.name` (kebab-cased) or hand-authored? | Low | Recommend hand-authored and frozen — a slug derived from a display name breaks when someone renames the status. Resolve in `/akili-specify`. |

---

## Success Criteria

1. `/results-center?indicator=capacity-sharing-for-development&contract=A100` loads the table filtered to that contract and indicator, with both chips shown in the sidebar and the CapDev tab active.
2. After load, the address bar still shows those parameters; F5 reproduces the same view; the URL pastes into another session and reproduces it there too.
3. Changing any of the sidebar filters in the UI updates the URL to match, and the browser back button does not step through every intermediate checkbox state.
4. `?indicator=not-a-real-indicator&contract=A100` applies the contract filter, ignores the bad token, and shows a non-blocking notice.
5. Legacy `?indicatorTab=1`, `?statusTab=5&statusLabel=...` and `?tab=my` still work.
6. A URL parameter present on load overrides any persisted `sessionStorage` view state.
7. The CapDev completion email's `starLink` emits the new scheme, including the group's `agreement_id`.
8. Parity test: every indicator id returned by the control list resolves to a URL slug.

---

## Next Step

```text
/akili-specify docs/specs/results-center/url-filters
```

Standard depth — the change is cross-package (client + server), touches shared state, and carries a permanent backward-compatibility obligation, so it is not a Lite candidate.
