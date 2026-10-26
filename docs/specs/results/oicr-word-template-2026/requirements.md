# Requirements — Results / OICR Word Template 2026 (filled download)

- **Module:** results (server: `entities/result-oicr` · client: OICR download button + `/oicr/download` route)
- **Spec id:** 2026-10-oicr-word-template-2026
- **Status:** approved (Phase 1 gate, 2026-10-23) · **amended 2026-10-26 by Pivot PV-1** (2025 OICRs keep the legacy download; see `execution.md` → *Pivot Record: PV-1*) — amendment approved by the owner 2026-10-26
- **Depth:** Standard (one new endpoint + document engine + client route/button change; no data-model change)
- **Approval Mode:** standard (no proposal; every gate stops for the user)
- **Owner:** STAR / ARI squad
- **Linked PRD section:** `docs/prd.md` CP-3 — *"Download an OICR template / report when needed"* (line 209)
- **Linked tickets:** AC-1793 — *US2 Update the word template with OICR data*
- **Pre-spec dialogue & POC:** `~/Desktop/OICR-2026-word-export/README.md` (outside the repo; owner + BI decisions 2026-10-22/23, POC run on STAR-554 and STAR-626)
- **Last updated:** 2026-10-26

---

## Executive summary

Today the "Download OICR Template" button is **hidden for 2026 OICRs**, and for 2025 OICRs it fills the **2025** Word template in the browser through a Go WASM. This spec replaces that path. The server fills the **2026 OICR Lean template** with the data the user entered in the OICR creation modal and returns it as a `.docx`.

- **The template stays the template.** Only the fields STAR fills change. Every other part of the file is preserved, including the instructions, the tracked changes and the "+" repeating rows.
- **Two entry points, one endpoint:**
  - the **button**, re-enabled for 2026 OICRs;
  - a **link** (`/oicr/download/<code>`) that can be pasted in an email. It requires login, comes back after login, and downloads by itself.
- **2025 OICRs keep today's download, unchanged** (PV-1). The template follows the result's year: a 2025 OICR (Portfolio 1) gets the **2025** template through the existing client-side WASM (the *legacy* path); a 2026 OICR (Portfolio 2) gets the **2026** template from the server (the *new* path). The new path is the one later years use.

---

## Glossary

| Term | Meaning |
|---|---|
| OICR | Outcome Impact Case Report — a result with `indicator_id = 5` |
| 2026 OICR / Portfolio 2 | An OICR whose portfolio (`get_portfolio_id_by_result`) is 2. **2025 OICR / Portfolio 1** is portfolio 1 |
| Template | The Word file `2026 OICR Template - Lean (Version 22.09.2026)`, hosted in S3 as `templates/2026_OICR_Template_dev.docx` |
| Content control | A Word form field (`w:sdt`): text box, dropdown or combo box. Identified by its numeric `w:id` |
| Repeating section | A Word block with a "+" button. Each row is a `repeatingSectionItem` |
| Target control | One of the 13 controls this spec fills (§3, R-OWT-002) |
| Homologation | Translation of a STAR catalog value into the exact text of a Word dropdown option |
| Tracked change | A Word revision mark (`w:ins`, `w:del`, `w:*PrChange`). The template carries 66 of them, by two authors |
| Modal fields | The fields of the OICR creation modal (`create-oicr-form`) and its base step (title, project, year) |

---

## 1. System context & scope

### Current behavior (cited as run at `83d6c37d`)

| # | Today | Evidence |
|---|---|---|
| C-1 | The client builds the document. It fetches the template from `${filesStorageUrl}templates/${oicrTemplateName}` and fills it with a Go WASM | `client/.../shared/services/go/wasm.service.ts:35`; `oicr-download.service.ts:94-131` |
| C-2 | The WASM fills 11 controls by `w:id` from the **2025** template. In the 2026 template only 8 of those ids exist | `oicr-download.service.ts:21-33`; id check against the 2026 template (POC, 2026-10-22) |
| C-3 | The WASM overwrites the cell formatting of text controls with hard-coded XML: fixed width, grey shading and `Heading5` | `client/.../public/go/main.go:326` |
| C-4 | The button is hidden for Portfolio 2 by a constant `OICR_TEMPLATE_DOWNLOAD_PORTFOLIO_2_ENABLED = false` | `shared/utils/oicr-template-download.util.ts:5,29-31` |
| C-5 | That rule hides both placements: `oicr-header` (also hidden when the OICR is published) and the `section-header` icon | `oicr-header.component.ts:38-43`; `section-header.component.ts:72-75` |
| C-6 | `/oicr/download?resultCode=` exists, has **no guard**, and starts the download automatically | `app.routes.ts:36-38`; `pages/oicr-download/oicr-download.component.ts:45-61` |
| C-7 | After login, the guard returns to a URL built from **path segments only**. A query parameter is lost | `shared/guards/roles.guard.ts:82-83` |
| C-8 | The server already returns binary files as `StreamableFile`, which the response interceptor passes through unwrapped | `domain/shared/Interceptors/response.interceptor.ts:42`; `domain/entities/reports/reports.controller.ts:226` |
| C-9 | The baseline docs describe `/oicr/download` as a **public** route | `docs/ux-ui/design.md:100,250`; `docs/trd/trd.md:204` |
| C-10 | The 2026 template is in S3 as `templates/2026_OICR_Template_dev.docx` (HTTP 200, 112 531 bytes). Its SHA-1 starts `e469c79d`, identical to the template the POC was validated on | `curl -sI` + `shasum`, run 2026-10-23 |

### In scope

- A server endpoint that returns the filled 2026 template for a 2026 OICR.
- The field mapping and the homologations agreed with the owner and BI.
- Re-enabling the button for 2026 OICRs, and keeping it for 2025 OICRs on the legacy path (PV-1).
- A login-protected download link that survives the login round-trip.
- Routing each download to the legacy path (Portfolio 1) or the new path (Portfolio 2), in one place on the client (PV-1).
- Updating the baseline docs that call `/oicr/download` public.

### Out of scope

- Fields outside the creation modal, for example strategic objectives, evidence, quantification and partners. They stay as the template ships them.
- *Other contributing projects*. The modal does not capture them, so they are not filled.
- Changing the 2025 (legacy) document, its field mapping or its WASM, or generating it on the server (PV-1: the legacy is kept as it is).
- Any schema or data change.
- Removing the existing `GET results/oicr/details/:resultCode` endpoint.
- Editing the template file itself.

---

## 2. Stakeholders / personas

| Persona | Need |
|---|---|
| OICR contact / author (researcher) | Get a Word document already filled with what they entered in STAR, and finish it in Word |
| PISA-MELP / MEL reviewer | Send a link by email that downloads the filled document after login, with no navigation |
| BI | Only modal fields are filled; the rest is left for the user |
| PISA-MELP template owner | Their template, instructions and tracked changes reach the user intact |

---

## 3. Functional requirements

### R-OWT-001 — Filled template download endpoint

- **As an** authenticated STAR user
- **I want** to request the Word document of a 2026 OICR
- **So that** I receive the official template already filled with STAR data

**Details:**
- **Inputs:** the result's official code in the path.
- **Behavior:**
  1. Resolve the result.
  2. Fetch the template.
  3. Fill the target controls (R-OWT-002..004).
  4. Return the file.
- **Outputs:**
  - **On success:** the raw `.docx` bytes, **not** wrapped in `ServerResponseDto`.
    - Content type `application/vnd.openxmlformats-officedocument.wordprocessingml.document`.
    - `attachment` disposition, file name `STAR_OICR_<code>_<yyyyMMdd>_<HHmm>.docx` (the name used today).
  - **On error:** the standard `ServerResponseDto` error envelope.
- **Errors:** see R-OWT-006.
- **Permissions:** any authenticated user. This keeps parity with today's `GET results/oicr/details/:resultCode`, which declares no `@Roles`.
- **Version:** the button and the link always download the OICR's **current** data, whatever version the user is viewing. The client never sends a version. A direct API caller may request a snapshot with the module's usual `reportYear` query.

#### Scenario: 2026 OICR downloads a filled document
- GIVEN STAR-554 is an active Portfolio 2 OICR
- WHEN an authenticated user requests its Word document
- THEN the response is HTTP 200 with the `.docx` content type and an `attachment` file name `STAR_OICR_554_<date>_<time>.docx`
- AND the body is a valid zip whose `word/document.xml` contains STAR-554's title
- BUT the body must NOT be a JSON envelope

#### Scenario: unauthenticated request
- GIVEN no valid token
- WHEN the endpoint is called
- THEN it answers 401 through the existing middleware, and no template is fetched

---

### R-OWT-002 — Modal fields are filled; everything else stays as shipped

The document SHALL fill exactly these controls from the result's current data.

| Template field | STAR data | Rule |
|---|---|---|
| Reporting Year | result reporting year | as-is |
| Tag as | OICR tag | homologated (R-OWT-003) |
| Previous OICR handle | handle of the linked previous OICR | **only** when the tag is 2 or 3 |
| Main project | primary contract | `<agreement id> - <description>` |
| 1. Title | result title | as-is |
| 3.a Primary Research Areas | primary research areas | one row each (R-OWT-004), homologated |
| 3.a "If other, please specify" | custom name typed for a primary "Other" area | one row per "Other" |
| 3.b Other Contributing Research Areas | contributing research areas | one row each, homologated |
| 5. Geographic Scope | geo scope + regions | homologated |
| 5. Regions/countries | regions, countries, sub-nationals | `Regions:` line, blank line, `Countries:` line. Sub-nationals go in parentheses after their country |
| 5. Comments | geographic scope comment | as-is |
| 8. Elaboration of outcome/impact statement | elaboration statement | as-is, including line breaks |
| 15. Authors and Contact Persons | main contact person | one row: name, position, affiliation, email, role (R-OWT-003) |

- A field whose STAR value is empty SHALL keep the template's placeholder text.
- Every control not in this table SHALL stay exactly as the template ships it, with its guide text, placeholder and default selection.

#### Scenario: empty value keeps the placeholder
- GIVEN STAR-626 has an empty geographic scope comment
- WHEN its document is generated
- THEN the Comments control still shows `Click or tap here to enter text.` in placeholder style

#### Scenario: previous handle only for updated OICRs
- GIVEN an OICR tagged 1 (New OICR) that has a linked handle
- WHEN its document is generated
- THEN the previous-OICR control keeps its placeholder
- AND IT MUST be filled when the same data is tagged 2 or 3

#### Scenario: fields outside the modal are untouched
- GIVEN any 2026 OICR
- WHEN its document is generated
- THEN the controls of sections 2, 3.c, 3.d, 4, 6, 7, 9–14, 16 and 17 are identical to the template's
- BUT ORCID in the section 15 row must NOT be filled
- AND Other Contributing Projects must NOT be filled

---

### R-OWT-003 — Homologations

Every dropdown or combo the document fills SHALL hold the **exact** text of one of its options. A STAR value with **no row in these tables** SHALL leave the control unselected; free text is never written into a dropdown. A value that **has** a row, but whose label is no longer an option of the template, is a template error (R-OWT-006), never a silent skip.

**Tag as:** 1 → `New OICR` · 2 → `Updated OICR (Same Level of Maturity)` · 3 → `Updated OICR (New Level of Maturity)`.

**Research Areas (3.a / 3.b):**

| STAR area | Word option |
|---|---|
| 10 Food Environments and Consumer Behavior | `Food Environment and Consumer Behavior` |
| 11 Multifunctional Landscapes and Agrobiodiversity for People and Nature | same text |
| 12 Climate Action | `Climate Action` |
| 14 Digital Inclusion | `Digital Inclusion` |
| 15 Crops for Nutrition and Health | `Crops for Nutrition and Health ` (the Word option carries a trailing space) |
| 16 Policy, Inclusion and Socio-economic Analysis for Impact and Learning | `PISA` |
| 18 Other (ImpactSF, Accelerate for Impact Platform, etc.) | `Other` |
| any other id (13 and 17 are inactive) | unselected |

**Geographic Scope:**

| STAR scope | Condition | Word option |
|---|---|---|
| 1 Global | — | `Global` |
| 2 Regional | more than one region | `Multi-region` |
| 2 Regional | one region, and it is a continent (Africa, Americas, Asia, Europe, Oceania, Antarctica) or Sub-Saharan Africa or Latin America and the Caribbean | `Regional` |
| 2 Regional | one region of any other kind (UN M49 sub-region) | `Sub-regional` |
| 2 Regional | no region | `Regional` |
| 3 Multi-national | — | `Multi-country` |
| 4 National | — | `National` |
| 5 Sub-national | — | `Sub-national` |
| 50 or empty | — | unselected |

**Section 15 row:**
- Name = first name + last name.
- Position as stored.
- Affiliation = the staff `center` **as stored**, upper case included (`CIAT`, `BIOVERSITY`).
- Email as stored.
- Role = `Contact Person`.

#### Scenario: regional with two regions
- GIVEN an OICR with scope Regional and regions Eastern Africa and Western Africa
- WHEN its document is generated
- THEN Geographic Scope shows `Multi-region`

#### Scenario: regional with one sub-region
- GIVEN scope Regional and the single region Eastern Africa (M49 14)
- THEN Geographic Scope shows `Sub-regional`
- AND with the single region Sub-Saharan Africa (202) it shows `Regional`

#### Scenario: unknown value is not forced
- GIVEN a research area id with no row in the table (e.g. inactive 13)
- WHEN its document is generated
- THEN that row's dropdown stays `Choose an item.`
- BUT it must NOT contain the STAR name as free text

---

### R-OWT-004 — One row per item in repeating sections

For 3.a, 3.b, "If other, please specify" and section 15, the document SHALL contain **one row per STAR item**, in STAR's order. These rows SHALL be created the way Word's "+" creates them: same structure, and every new control and paragraph with a new unique id.

#### Scenario: two primary areas
- GIVEN STAR-554 has two primary research areas
- THEN 3.a has two rows: `Food Environment and Consumer Behavior` and `Digital Inclusion`
- AND each row keeps its own working dropdown and "+" button in Word
- AND IT MUST hold no duplicate `w:id` and no duplicate `w14:paraId` anywhere in the document

#### Scenario: no items
- GIVEN an OICR with no contributing research areas
- THEN 3.b keeps its single template row, unselected

---

### R-OWT-005 — Template fidelity

The generated document SHALL differ from the template **only inside the target controls and the rows R-OWT-004 adds**.

- Every file of the `.docx` package other than `word/document.xml` SHALL be byte-identical to the template's. That covers styles, numbering, settings (Track Changes on), glossary, footer and custom XML.
- `word/document.xml` SHALL keep its original XML declaration byte for byte.
- All tracked changes SHALL be preserved: the same count of each revision type as the template. The template has 66.
- The text STAR writes SHALL **not** be recorded as a tracked change.
- A filled text control SHALL show STAR's text in the control's own formatting, without the grey placeholder style.

#### Scenario: nothing outside the targets moves
- GIVEN the template and a generated document
- WHEN the 13 target controls are removed from both
- THEN the two `word/document.xml` are identical
- AND the revision counts (`w:ins` 14, `w:del` 5, `w:rPrChange` 1, `w:tblPrChange` 5, `w:tcPrChange` 24, `w:trPrChange` 12, `w:tblGridChange` 5) are equal
- BUT a change to any style, setting or untargeted text must NOT pass

#### Scenario: special characters
- GIVEN an elaboration containing `&`, `<`, `>`, `\n`, `\r\n` and `\r` line breaks, and the control character U+000B
- THEN the document opens and shows the symbols literally, each line break once as a line break
- BUT it must NOT contain U+000B or any other character invalid in XML 1.0

---

### R-OWT-006 — Eligibility and failure behavior

| Case | Response |
|---|---|
| Code does not exist or the result is inactive | 400 `Result not found` (the module's existing behavior, `shared/utils/results.util.ts:82-92`) |
| Result is not an OICR | 400, error envelope stating it is not an OICR |
| OICR is Portfolio 1 (2025) | 400, error envelope stating the template applies to 2026 OICRs only |
| Template cannot be fetched (network, non-200) | 502, error envelope; logged with the result code and upstream status |
| Template fetched, but a target control id is missing (template replaced by a different version) | 500, error envelope naming the missing control; logged |
| Template fetched, but a target's structure differs (a repeating section with more than one row, a section-15 row with other columns, a revision inside a target), or a mapped label is not one of its control's options | 500, error envelope naming the control and the reason; logged |

- The server SHALL never return a partially filled document.
- The server SHALL never fall back to an empty template.

#### Scenario: template replaced by another version
- GIVEN the configured template no longer contains the Title control id
- WHEN a document is requested
- THEN the response is an error naming that control
- BUT it must NOT return a document with Title left empty

#### Scenario: 2025 OICR
- GIVEN a Portfolio 1 OICR
- WHEN its document is requested
- THEN the response is 400 and no template is fetched

---

### R-OWT-007 — Template location comes from server configuration

The template URL SHALL be read from server configuration, one value per environment. Replacing the file in S3 under the same name SHALL take effect on the next download, without a restart. The template is not cached between requests (K-016).

#### Scenario: missing configuration
- GIVEN the template URL is not configured
- WHEN a document is requested
- THEN the response is a 500 error envelope stating the template is not configured

---

### R-OWT-008 — Button visibility

| OICR | Button (`oicr-header` and `section-header` icon) |
|---|---|
| Portfolio 2, not published | **shown** — downloads the 2026 template (new path, R-OWT-001) |
| Portfolio 2, published | hidden in `oicr-header`, as today. The `section-header` icon follows its own existing rule |
| Portfolio 1, not published | **shown** — downloads the 2025 template (legacy path, R-OWT-013) |
| Portfolio 1, published | hidden in `oicr-header`, as today. The `section-header` icon follows its own existing rule |
| Unknown portfolio, or any portfolio other than 1 and 2 | hidden |

Clicking the button SHALL download the document of the result's portfolio: Portfolio 2 from R-OWT-001, Portfolio 1 from the legacy path (R-OWT-013). While the download is in progress the button SHALL show the existing loading state. On error it SHALL show one error toast carrying the server's message (R-OWT-006). Today the button shows no error at all.

#### Scenario: 2026 OICR shows the button
- GIVEN the user opens a Portfolio 2 OICR that is not published
- THEN the download button is visible in the OICR header and in the section header
- AND clicking it saves `STAR_OICR_<code>_<date>_<time>.docx`

#### Scenario: 2025 OICR keeps the legacy download (PV-1)
- GIVEN a Portfolio 1 OICR that is not published
- THEN both placements show the button
- AND clicking it saves the **2025** template filled by the legacy path
- BUT it must NOT call the R-OWT-001 endpoint

> **Unknown portfolio → hidden.** This inverts today's fallback, which shows the button. With two paths, the client must know the portfolio to pick one; without it there is no correct path.

---

### R-OWT-009 — Email download link

A link of the form `<STAR host>/oicr/download/<resultCode>` SHALL:

1. require login;
2. when the user is not logged in, send them to login and, after login, return to the **same link with the same code**;
3. start the download automatically;
4. once the download has started, take the user to the result's General Information page, as today.

The page SHALL show a loading state while generating, and an error message when the endpoint answers an error (R-OWT-006). After an error it SHALL **not** navigate away.

#### Scenario: logged-out user opens the email link
- GIVEN a user who is not logged in
- WHEN they open `/oicr/download/554`
- THEN they reach the login
- AND after login they land on `/oicr/download/554`, not on `/oicr/download` and not on Home
- AND the file downloads without any click

#### Scenario: link to a 2025 OICR (amended by PV-1)
- GIVEN a logged-in user opens the link of a Portfolio 1 OICR
- THEN the page resolves the result's portfolio first
- AND it downloads the 2025 template through the legacy path (R-OWT-013)
- BUT it must NOT call the R-OWT-001 endpoint

#### Scenario: link whose portfolio cannot be resolved
- GIVEN the result's metadata has no portfolio, or the metadata request fails
- THEN the page shows an error message and does not navigate
- BUT it must NOT download a file

---

### R-OWT-010 — Legacy link keeps working

A link in the old form `/oicr/download?resultCode=<code>` SHALL redirect to `/oicr/download/<code>`, and from there follow R-OWT-009. When the parameter is missing, the page SHALL show the existing "Missing resultCode" error. The server SHALL build any new download link it emits (the notification `download_url`) in the path form.

#### Scenario: old link
- GIVEN `/oicr/download?resultCode=554`
- THEN the browser ends on `/oicr/download/554` and R-OWT-009 applies

---

### R-OWT-011 — Client does not generate 2026 documents

*(Amended by PV-1.)* For a **Portfolio 2** OICR the client SHALL NOT fetch the template, and SHALL NOT run the WASM: the download goes through R-OWT-001. Only a **Portfolio 1** download uses the legacy path (R-OWT-013).

#### Scenario: no WASM on a 2026 download
- GIVEN the user clicks the button on a Portfolio 2 OICR
- THEN the only request the download makes is the R-OWT-001 endpoint
- BUT `main.wasm` and the S3 template must NOT be requested by the browser for that download

---

### R-OWT-013 — 2025 OICRs keep the legacy download (PV-1)

A Portfolio 1 (2025) OICR SHALL be downloaded exactly as before this spec: the client fetches the result through `GET results/oicr/details/:resultCode`, fetches the **2025** template from S3 and fills it with the Go WASM. The document, its field mapping and the WASM are **unchanged**.

- The legacy path SHALL always use the **2025** template file, whatever the host's `oicrTemplateName` says. Today Dev's `environment.dev.ts` names the 2026 file there, and the WASM finds only 8 of its 11 controls in it (C-2).
- On failure the button SHALL show one error toast with the legacy error text, like the new path (R-OWT-008). The legacy page keeps its error panel.
- The server endpoint keeps answering 400 for Portfolio 1 (R-OWT-006). The client never sends a Portfolio 1 result there.

#### Scenario: 2025 OICR document is the legacy one
- GIVEN STAR-120 is a Portfolio 1 OICR
- WHEN the user downloads it from the button
- THEN the browser fetches `main.wasm` and `templates/2025_OICR_Template.docx`, and saves `STAR_OICR_120_<date>_<time>.docx`
- AND the document matches what the legacy path produced before this spec
- BUT it must NOT be built from the 2026 template

---

### R-OWT-012 — Baseline docs reflect the change

`docs/ux-ui/design.md` and `docs/trd/trd.md` SHALL describe `/oicr/download/:resultCode` as login-required. They SHALL also describe the two generation paths: server-side for Portfolio 2, the legacy client-side WASM for Portfolio 1 (PV-1).

---

## 4. Non-functional requirements

### NFR-OWT-001 — Response time
- **Category:** performance
- **Target:** one download completes in ≤ 5 s on Dev for an OICR with 10 research-area rows. That includes the template fetch (~110 KB).
- **How verified:** timed request at the HITL pause. The unit suite cannot measure it.

### NFR-OWT-002 — Observability
- **Category:** observability
- **Target:** every error the endpoint's own handler raises (R-OWT-006, rows 2 onward) logs one line through `LoggerUtil` with the result code and the reason. `Result not found` stays logged by the global exception filter, as today. A success logs nothing beyond the interceptor's usual line.
- **How verified:** unit test on the error paths.

### NFR-OWT-003 — Dependencies are explicit
- **Category:** dx / reliability
- **Target:** the two libraries the engine uses are declared in the server's `package.json`, not reached as transitive dependencies of other packages.
- **How verified:** `npm ls` on both libraries + server build.

Inherited defaults apply. The error envelope goes through `GlobalExceptions`. Routes are unversioned, per root `CLAUDE.md` §4.1. Mutations do not apply: the endpoint is read-only.

---

## 5. Data requirements

No data model changes. No migration.

---

## 6. API surface delta

| Method + path | Auth | Response |
|---|---|---|
| `GET /api/results/oicr/word-template/:resultCode` | JWT (existing middleware); no `@Roles` | `.docx` `StreamableFile`; errors in the envelope |

- Swagger is required: `@ApiTags`, `@ApiBearerAuth`, `@ApiOperation`, `@ApiParam`, and the binary response documented.
- The endpoint is unversioned, consistent with the module.
- The machine token is accepted by the middleware like any other route; no change.

---

## 7. Cross-system impact

| System | Impact |
|---|---|
| S3 (`alliance-files-storage`) | The server reads the template with an outbound GET. It is public; no credentials |
| STAR client | Button visibility, the download route, and routing between the legacy WASM path (Portfolio 1) and the server endpoint (Portfolio 2) |
| CLARISA / AGRESSO / OpenSearch / sockets / RabbitMQ | None |

---

## 8. Defect classes and their gates

| # | Defect class | Gate | Automated? |
|---|---|---|---|
| D-1 | **Fidelity:** something outside the targets changed (a part, the XML declaration, a revision, untargeted text) | Server Jest fidelity suite on the real template fixture: every part except `word/document.xml` identical, null-edit round trip, equal revision counts, equal document after removing the targets. Ported from the POC `verify.js`. Each of its falsifiers must be **observed red, with the red recorded in `execution.md`**, before the suite counts as a gate | ✅ |
| D-2 | Wrong mapping or homologation (wrong field, wrong option, wrong geo rule) | Unit tests per table row of R-OWT-002/003, asserting on the **generated XML** (KZ-001) | ✅ |
| D-3 | Dropdown holds text that is not an option | Test: every selected dropdown/combo in the output holds an exact option | ✅ |
| D-4 | Duplicate ids after cloning rows | Test: all `w:id` and `w14:paraId` unique | ✅ |
| D-5 | **Word opens the file with a repair prompt**, or a cloned row's "+" / dropdown does not work | **No automated check** (no Word in CI). Substitute: the owner opens STAR-554 and STAR-626 in Word at the HITL pause | ❌ → HITL |
| D-6 | Login round-trip loses the code | Client unit test that the route carries the code in the path and is guarded. The real Cognito round-trip cannot be automated → HITL with a logged-out browser | partial → HITL |
| D-7 | Button visible for the wrong portfolio or status | Client unit tests over P1 / P2 / unknown × published / not published | ✅ |
| D-8 | Compile defect | `npm run build` in each package (the client also `tsc -p tsconfig.spec.json`) | ✅ |
| D-9 | Engine libraries missing at runtime | `npm ls` + build (NFR-OWT-003) | ✅ |
| D-10 | Template replaced by an incompatible version (missing id, changed row structure, renamed option) | Drift-guard tests on mutated fixtures: each change → a named error, never a partial document (R-OWT-006). A real replacement is only seen at runtime → **accepted risk**: the error names the control, so it is diagnosable | ✅ + accepted |
| D-11 | Response time | Timed request at HITL (NFR-OWT-001) | ❌ → HITL |

**Packaging (K-017):** not applicable. The template is fetched at runtime from S3, not shipped in `dist`. The test fixture lives under the test tree.

---

## 9. Assumptions, dependencies, risks

| # | Item | Mitigation |
|---|---|---|
| A-1 | The template's control ids are stable while PISA-MELP does not edit it | R-OWT-006 fails loudly. The ids live in one place in code |
| A-2 | The S3 object is public, as the 2025 one is | Verified for the Dev file (C-10) |
| A-3 | Real data contains odd characters. STAR-554's elaboration starts with 4 zero-width spaces | They are copied as-is (R-OWT-002 "as-is"). Cleaning is out of scope |
| R-1 | ~~Removing the WASM removes the 2025 download~~ — superseded by PV-1 (2026-10-26): the 2025 download is kept on the legacy path | Two generation paths coexist until 2025 OICRs no longer need a template; the legacy is then removed in its own change |

---

## 10. Resolved questions (owner + BI, 2026-10-22/23)

| Question | Decision |
|---|---|
| Which fields are filled? | Only the creation-modal fields (BI) |
| Other contributing projects? | Not filled: not in the modal |
| Main contact person? | Section 15, role Contact Person, ORCID empty |
| Affiliation text? | Staff `center` as stored, upper case included |
| Sub-Saharan Africa and LAC? | `Regional` |
| Research area 16? | `PISA` |
| 2025 OICRs? | ~~No template; the button is hidden; the old file and the WASM are retired~~ → **PV-1 (2026-10-26, owner):** 2025 OICRs keep the 2025 template through the legacy WASM path, unchanged; 2026 uses the new server path |
| Where is the document built? | Server |
| Download by link? | Login-protected client route, code in the path |

## 11. Open questions — closed at the Phase 1 gate (2026-10-23, owner accepted the defaults)

| # | Question | Decision |
|---|---|---|
| OQ-1 | Must the email link also download **published** OICRs, which the header hides the button for? | Yes. The endpoint does not check status; only the header button keeps its rule |
| OQ-2 | Must the old `?resultCode=` link keep working? | Yes, by redirect (R-OWT-010) |

---

## 12. Requirement ID index

| ID | Title |
|---|---|
| R-OWT-001 | Filled template download endpoint |
| R-OWT-002 | Modal fields filled; rest as shipped |
| R-OWT-003 | Homologations |
| R-OWT-004 | One row per item in repeating sections |
| R-OWT-005 | Template fidelity |
| R-OWT-006 | Eligibility and failure behavior |
| R-OWT-007 | Template location from server configuration |
| R-OWT-008 | Button visibility |
| R-OWT-009 | Email download link |
| R-OWT-010 | Legacy link keeps working |
| R-OWT-011 | Client does not generate 2026 documents |
| R-OWT-012 | Baseline docs reflect the change |
| R-OWT-013 | 2025 OICRs keep the legacy download (PV-1) |
| NFR-OWT-001..003 | Response time · Observability · Explicit dependencies |

---

## 13. Sign-off

- [ ] Engineering lead — STAR / ARI squad
- [ ] MEL / product owner — owner of AC-1793
- [ ] Security review — not required (no new secrets; reuses JWT auth)
- [ ] DevOps — one new server env var for the template URL
