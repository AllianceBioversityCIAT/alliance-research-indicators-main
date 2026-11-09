# Requirements — Results / AGROVOC-backed Keywords (General Information)

- **Module:** results (server: new `tools/agrovoc` integration · client: General Information section)
- **Spec id:** 2026-10-agrovoc-keywords
- **Status:** approved (Phase 1 gate, 2026-10-19)
- **Depth:** Standard (new outbound integration + one UI control; no data-model change)
- **Approval Mode:** standard (no proposal; every gate stops for the user)
- **Owner:** STAR / ARI squad
- **Linked PRD section:** `docs/prd.md` — controlled vocabularies (C-3: "no free text where a controlled list applies")
- **Linked tickets:** AC-1525 — *Align result keywords to a control list (AGROVOC)*
- **Last updated:** 2026-10-19

---

## Executive summary

The **Keywords** field of a result's *General Information* section is today a free-text chip input: the user types anything and presses **Enter**. This spec turns it into a **search-as-you-type dropdown backed by AGROVOC** (FAO's agricultural thesaurus), so keywords come from a controlled vocabulary.

- **Server:** one new GET endpoint proxies AGROVOC's search and returns a small, deduplicated, ranked list in the standard `ServerResponseDto` envelope.
- **Client:** the chip input becomes a dropdown with a search box. Searching waits until the user stops typing, and a newer search **cancels** the previous one.
- **Unchanged:** keywords are still persisted as **plain text** strings (`result_keywords.keyword`) through the existing `PATCH results/:code/general-information`. Save path, schema, and OpenSearch indexing do not change.

---

## Glossary

| Term | Meaning |
|---|---|
| AGROVOC | FAO multilingual thesaurus of agricultural concepts, exposed by a Skosmos REST API at `https://agrovoc.fao.org/browse/rest/v1/` |
| Concept | One AGROVOC entry, identified by a `uri` (e.g. `http://aims.fao.org/aos/agrovoc/c_7861`) |
| `prefLabel` | The concept's preferred (canonical) English label, e.g. `training` |
| `altLabel` | A synonym through which a concept matched, e.g. `online training` → concept `e-learning` |
| Term | What this spec returns to the client: one concept, with its canonical label |
| Legacy keyword | A keyword already saved as free text before this change (e.g. `In-Person`), which may not exist in AGROVOC |
| Settle delay | The pause after the last keystroke before a search is sent |

---

## 1. System context & scope

**What renders on the route** (`/result/:id/general-information`, KZ-002): the section form `general-information.component.html`, whose Keywords block (`:41-54`) holds a PrimeNG `p-autocomplete` in `multiple` mode with `[typeahead]="false"` (`:49-50`). Nothing else on the route reads or writes `body().keywords`.

### Current behavior (cited as run at `01a3eea8f`)

| Claim | Evidence |
|---|---|
| Keywords are free text, turned into a chip on Enter | `general-information.component.html:44, 49-50` |
| Client model is `keywords: string[]` | `shared/interfaces/result/general-information.interface.ts:4` |
| Server accepts `keywords?: string[]` with **no** validators | `results/dto/update-general-information.dto.ts:10-15`; grep `ArrayMaxSize\|MaxLength` near `keyword` → 0 |
| Server trims, drops empties, replaces the set, re-indexes OpenSearch | `results.service.ts:683-692, 712-720`; `result-keywords.service.ts` `transformData` |
| "Max. 4 keywords" is shown but **not enforced** anywhere | hint text `general-information.component.html:52`; no limit in client or server (the reference screenshot shows 7 saved chips) |
| No AGROVOC integration exists | `grep -rIl -i agrovoc` over the whole repo, excluding `node_modules`/`.git`/`dist`/`.codegraph` → **0 files** |
| `ARI_AGROVOC_URL=https://agrovoc.fao.org/` is already set in `.env` | **UNVERIFIED — confirm at source before relying on it** (user-stated 2026-10-19; the user asked that `.env` not be read, so no task reads it — it is absent from `.env.example`) |

### Observed AGROVOC behavior (probed 2026-10-19 with `curl`, see design Premise Ledger)

| Observation | Consequence for this spec |
|---|---|
| `?query=*bea*&lang=en` → 200 results, only 139 distinct labels | duplicates must be collapsed |
| `?query=*b*&lang=en` → **11,439** results; `maxhits=10` → 10 | no default cap: the server must bound the result count |
| Latency ranged **0.35 s – 13.8 s**; one **HTTP 503** that succeeded on retry | the UI must show a loading state and a recoverable error state (K-016) |
| Results are alphabetical, not by relevance (`training` sits 10th of 18 for `*training*`) | the server must rank exact / prefix matches first |
| Multi-word queries work (`*seed system*` → `seed systems`); no hits → `results: []` | phrases are allowed; empty is a normal outcome |

### In scope / out of scope

| In scope | Out of scope |
|---|---|
| `ARI_AGROVOC_URL` getter on `AppConfig` + `.env.example` entry | Changing how keywords are stored, read, or indexed |
| New server GET endpoint returning AGROVOC terms | Persisting the AGROVOC `uri` (stays text only) |
| Replacing the Keywords chip input with a remote-search dropdown | Migrating or validating legacy keywords |
| Settle-delay + cancel-previous search behavior | Enforcing the "Max. 4" limit (see OQ-2) |
| Loading / empty / error / disabled UI states | Other languages than English |
| | Other fields or sections, and other consumers of `keywords` (AI assistant, search-a-result) |

---

## 2. Stakeholders / personas

| Persona (PRD §3) | Interest |
|---|---|
| Contributor / result submitter | Picks keywords quickly; cannot invent spellings |
| MEL / Science editors | Comparable keywords across results for search and reporting |
| Platform team | One bounded, observable outbound integration |

---

## 3. Functional requirements

### R-AGV-001 — AGROVOC base URL comes from configuration

- **As a** platform engineer **I want** the AGROVOC host read from `ARI_AGROVOC_URL` through `AppConfig` **so that** environments can point elsewhere without a code change.

**Details:** value is the host root (`https://agrovoc.fao.org/`); the service builds `browse/rest/v1/search/` on top of it. Trailing-slash presence or absence must not change the final URL.

#### Scenario: Configured host

- GIVEN `ARI_AGROVOC_URL=https://agrovoc.fao.org/`
- WHEN a term search runs for `bea`
- THEN the outbound request targets `https://agrovoc.fao.org/browse/rest/v1/search/` with `query=*bea*` and `lang=en`
- AND IT MUST produce the same URL when the variable has no trailing slash

#### Scenario: Missing host

- GIVEN `ARI_AGROVOC_URL` is unset or empty
- WHEN a term search is requested
- THEN the endpoint answers `503` in the `ServerResponseDto` envelope with a description naming `ARI_AGROVOC_URL`
- BUT it must NOT attempt an outbound call or crash the process

**Acceptance criteria:**
- [ ] AC.1 — `AppConfig.ARI_AGROVOC_URL` exists and is the only place the service reads the host.
- [ ] AC.2 — `.env.example` documents `ARI_AGROVOC_URL=https://agrovoc.fao.org/`.

### R-AGV-002 — Term search endpoint

- **As a** STAR client **I want** a GET endpoint that takes the user's text and returns matching AGROVOC terms in the platform's envelope **so that** the UI never talks to AGROVOC directly.

**Details:**
- Inputs: query param `query` (string, required). Trimmed. Minimum **3** characters after trimming (OQ-1). Maximum 100 characters.
- Behavior: wraps the text as `*<text>*`, forces `lang=en`, bounds the upstream result count, collapses duplicates **by concept `uri`**, and ranks: exact label match → label starts with the text → everything else alphabetically. Returns at most **20** terms (OQ-1).
- Outputs: `200`, `data: AgrovocTerm[]` where each term carries `uri`, `label` (the English `prefLabel`) and, when the match came through a synonym, `matched_label` (the `altLabel`).
- Errors: `400` when `query` is missing or shorter than the minimum · `503` when the host is not configured · `502` when AGROVOC fails or times out. All in the `ServerResponseDto` shape.
- Permissions: any authenticated user (JWT); no `@Roles`, no `ResultStatusGuard` (read-only, not result-scoped).

#### Scenario: Matches found

- GIVEN AGROVOC returns `training`, `skill training` (twice, once via `skills training`), `agricultural training`, `e-learning` (via `online training`)
- WHEN the client calls the endpoint with `query=training`
- THEN `status` is `200` and `data[0].label` is `training`
- AND `skill training` appears exactly once
- AND `e-learning` carries `matched_label: "online training"`
- AND IT MUST return no more than 20 items

#### Scenario: No matches

- GIVEN AGROVOC returns `results: []`
- WHEN the client searches `zzqqxx`
- THEN `status` is `200` and `data` is `[]`
- BUT it must NOT be reported as an error

#### Scenario: Upstream failure

- GIVEN AGROVOC answers `503` or does not answer within the timeout
- WHEN the client searches
- THEN the endpoint answers `502` with a description saying the AGROVOC service is unavailable
- AND the failure is logged via `LoggerUtil` with the query and the upstream status
- BUT it must NOT return `200` with an empty list (an outage must not look like "no matches")

#### Scenario: Query too short

- WHEN the client calls with `query=be` or without `query`
- THEN the endpoint answers `400`
- AND IT MUST NOT call AGROVOC

**Acceptance criteria:**
- [ ] AC.1 — The endpoint is reachable at its declared path on a booted app (not only in the route table — KZ-017).
- [ ] AC.2 — Swagger shows it with `@ApiTags`, `@ApiBearerAuth`, `@ApiOperation`, `@ApiQuery('query')`.
- [ ] AC.3 — An unauthenticated call answers `401`.

### R-AGV-003 — Keywords control is a remote-search dropdown

- **As a** contributor **I want** to type part of a word and pick from AGROVOC matches **so that** my keywords use the controlled vocabulary.

**Details:** replaces the Enter-to-chip input in the Keywords block. Visual reference: the existing STAR dropdown with search box (Reporting year selector screenshot) — a closed field that opens a panel with a search input on top and a list of options below. Selected keywords keep rendering as removable chips under or inside the field, as today.

#### Scenario: Pick a term

- GIVEN the result is editable and has no keywords
- WHEN the user opens the Keywords dropdown, types `bean`, and stops typing
- THEN one search is sent and the panel lists the returned terms
- WHEN the user clicks `beans`
- THEN a `beans` chip appears in the field
- AND saving the section sends `keywords: ["beans"]` through the existing PATCH, unchanged in shape

#### Scenario: Free text is not accepted

- GIVEN the user typed `my custom word` and AGROVOC returned nothing
- WHEN the user presses Enter
- THEN no chip is created
- BUT it must NOT silently save the typed text (D-OQ-3: only AGROVOC terms can be added)

#### Scenario: Duplicate pick

- GIVEN `beans` is already selected
- WHEN `beans` appears in a new search result
- THEN it is shown as already selected and picking it again does not add a second chip

#### Scenario: Legacy keywords stay

- GIVEN a result already saved with `In-Person` and `Capacity Sharing` (not AGROVOC terms)
- WHEN the section loads
- THEN both render as chips and each can be removed
- AND saving without touching them keeps them
- BUT it must NOT drop, rename, or flag them

#### Scenario: Read-only result

- GIVEN `submission.isEditableStatus()` is false
- THEN the dropdown is disabled, chips show without remove buttons, and no search can be sent

**Acceptance criteria:**
- [ ] AC.1 — The "Press Enter" helper text is replaced with text that describes searching and selecting.
- [ ] AC.2 — Each selected keyword stored is the term's `label` string.

### R-AGV-004 — Search waits for the user to stop typing and cancels stale requests

- **As a** contributor **I want** the search to run once I pause, not on every key **so that** results match what I finished typing.

#### Scenario: Settle delay

- GIVEN the panel is open
- WHEN the user types `b`, `e`, `a`, `n` within 500 ms of each other and then stops
- THEN exactly **one** request is sent, with `query=bean`, about 500 ms after the last key
- BUT it must NOT send a request for `b`, `be`, or `bea`

#### Scenario: Typing again cancels the in-flight request

- GIVEN a request for `bean` is in flight
- WHEN the user keeps typing to `beans` and stops
- THEN the `bean` request is cancelled (aborted on the client)
- AND only the `beans` response is ever rendered
- AND IT MUST NOT render `bean` results even if that response arrives after `beans` was sent

#### Scenario: Below the minimum

- WHEN the search box holds fewer than 3 non-space characters
- THEN no request is sent and the panel shows a hint to type at least 3 characters
- AND any in-flight request is cancelled

#### Scenario: Same text again

- WHEN the user's settled text equals the last searched text (e.g. `bean` → `beans` → `bean` quickly back)
- THEN only the last settled value counts; an unchanged settled value sends no new request

### R-AGV-005 — Search UI states

The control SHALL show each state distinctly:

| State | What the user sees |
|---|---|
| Idle / below minimum | Hint: type at least 3 characters |
| Loading | A loading indicator in the panel (AGROVOC can take >10 s) |
| Results | The list of terms; a synonym match shows its `matched_label` as secondary text |
| Empty | "No AGROVOC terms match …" |
| Error | "AGROVOC search is unavailable, try again" — the user can retype to retry; existing chips are untouched |
| Disabled | Field disabled (read-only result) |

#### Scenario: Slow upstream

- GIVEN AGROVOC takes 12 s
- WHEN the user searches
- THEN the loading indicator is visible the whole time
- BUT it must NOT show the empty state while the request is pending

---

## 4. Non-functional requirements

### NFR-AGV-001 — Bounded outbound call
- **Category:** reliability / performance
- **Target:** every AGROVOC call has a timeout of **15 s** and asks for a bounded number of hits; the endpoint never forwards more than 20 terms.
- **How verified:** unit test on the service (timeout and `maxhits` present in the outbound request).

### NFR-AGV-002 — Request volume
- **Category:** performance
- **Target:** one request per settled input; zero requests for input under 3 characters.
- **How verified:** client unit test using fake timers and deferred observables (not synchronous mocks).

### NFR-AGV-003 — Envelope and observability
- **Category:** observability
- **Target:** success and every error path return `ServerResponseDto`; upstream failures log at `error` via `LoggerUtil`, including the query and the upstream status or timeout.
- **How verified:** controller/service unit tests.

Inherited defaults (envelope, `GlobalExceptions`, JWT middleware) apply. Note: per root `CLAUDE.md` §4.1 this endpoint is **unversioned** unless it declares `@Version`.

---

## 5. Data requirements

No data model changes. `result_keywords.keyword` (text) keeps storing the selected label.

## 6. API surface delta

| Method | Path | Auth | Response `data` |
|---|---|---|---|
| GET | `/api/tools/agrovoc/search?query=<text>` (final path pinned in `design.md`) | JWT | `AgrovocTerm[]` |

`PATCH /api/results/:code/general-information` — **unchanged.**

## 7. Cross-system impact

- **AGROVOC (FAO):** new outbound read-only dependency. Public API, no credentials.
- **OpenSearch / CLARISA / Socket.IO / others:** none.

---

## 8. Defect classes and their gates

| Defect class | Gate that catches it |
|---|---|
| Upstream shape mapped wrong (duplicates, wrong label, bad ranking) | Server unit test over a fixture **captured from the real API** (the `*training*` and `*bea*` payloads) |
| Endpoint registered in routes but 404 at runtime (KZ-017) | Module-graph membership test + e2e/boot request |
| Outage shown as "no results" | Unit test: upstream 503/timeout → `502` |
| Debounce/cancel race (stale response wins) | Client unit test with **deferred** responses and fake timers (synchronous mocks hide the race) |
| Typed contract mismatch client↔server | `npm run build` (client, `strictTemplates`) and server `npm run build`; spec files via `tsc -p tsconfig.spec.json` grep per touched file |
| Visual fidelity to the reference dropdown, chip layout, panel states | **No automated check.** Substitute: human check in the running app at the HITL pause before commit (memory: no commit before visual approval) |
| Real AGROVOC latency/availability | **Not measurable in CI** (external). Accepted risk; mitigated by R-AGV-005 states and NFR-AGV-001 timeout |

---

## 9. Assumptions, dependencies, risks

| # | Item | Mitigation |
|---|---|---|
| A-1 | `ARI_AGROVOC_URL` is set in `.env` and in the deployed environments (user-stated; `.env` is not read by agents at the user's request) | Missing host returns `503` (R-AGV-001) instead of crashing |
| RK-1 | AGROVOC is slow and occasionally returns 503 | Timeout, explicit loading and error states |
| RK-2 | AGROVOC changes its response format | Mapping isolated in one service, fixture-based tests |

## 10. Resolved questions (user, Phase 1 gate, 2026-10-19)

| # | Question | Decision |
|---|---|---|
| OQ-1 | Minimum characters before searching, and max terms shown | **3 characters, 20 terms** |
| OQ-2 | Enforce "Max. 4 keywords"? | **No** — unchanged, hint text kept; out of scope |
| OQ-3 | Free text when AGROVOC has no match? | **No** — only AGROVOC terms can be added; legacy keywords stay and can be removed |
| OQ-4 | Store canonical `prefLabel` even when found through a synonym? | **Yes** — `label` = `prefLabel`; the synonym is display-only secondary text |

No open questions remain.

## 11. Requirement ID index

| ID | Title |
|---|---|
| R-AGV-001 | AGROVOC base URL from configuration |
| R-AGV-002 | Term search endpoint |
| R-AGV-003 | Keywords control is a remote-search dropdown |
| R-AGV-004 | Settle delay and cancel-previous |
| R-AGV-005 | Search UI states |
| NFR-AGV-001 | Bounded outbound call |
| NFR-AGV-002 | Request volume |
| NFR-AGV-003 | Envelope and observability |

## 12. Sign-off

- [ ] Engineering lead
- [ ] MEL / product owner
