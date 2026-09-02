# UX/UI Design — Alliance Research Indicators (ARI) Monorepo

> The unified visual & interaction blueprint for the ARI monorepo. Companion to [`docs/prd.md`](../prd.md) (what & why) and [`docs/trd/trd.md`](../trd/trd.md) (how the code is wired).
>
> **Scope: two experience surfaces.**
>
> | Surface | Package | Stack | Audience | Role |
> | --- | --- | --- | --- | --- |
> | **(A) STAR client** | `client/research-indicators` | Angular 19 + PrimeNG 19 (Aura preset) | Result Contributors, MEL Regional Experts, Center Admins, consumers | **Primary human UX** |
> | **(B) Server surface** | `server/researchindicators` | REST API + Swagger + embedded `/admin` React 19 SSR panel | STAR/partner developers, Sys Admin, Technical Support | Operator tooling + API consumer DX |
>
> STAR is where the product is *used*. The server surface is where the platform is *operated and integrated*. Every section below covers **both** surfaces, labeled **[STAR]** and **[Server]**.
>
> When adding a new screen or endpoint, **read this document first**. New work must fit the patterns below or explicitly document a deviation in §12 Design Decisions.

---

## 1. Product Experience Principles

### 1.1 [STAR] Client principles (primary UX)

New STAR screens are evaluated against these in review. They derive from the personas in [`docs/prd.md`](../prd.md) §3.

1. **Form clarity over visual flourish.** STAR is a data-entry application for research metadata. Every screen optimizes for *legibility, scannability, and confidence the data is correct* — not aesthetic novelty.
2. **The taxonomy is the truth.** Controlled-list inputs (CLARISA) are the default; free text is the justified exception. UI makes it *easier* to pick the canonical value than to type a custom one.
3. **Status always visible.** A user must always be able to answer: "Where is this result in its lifecycle? Am I allowed to edit it? Did my last save succeed?"
4. **Predictable navigation.** Every authenticated screen lives inside the platform shell (navbar + sidebar). Result Detail is the only second-level-sidebar (tabbed) surface.
5. **Respect role.** Hide actions the current role cannot perform — never disable silently. Show *why* something is read-only when relevant.
6. **Forgiving by default.** Long forms autosave or surface "unsaved changes" warnings. Destructive actions require confirmation.
7. **Federated, not duplicated.** When a user is about to create something that already exists across platforms (STAR / TIP / PRMS / AICCRA), the UI offers to *link*, not duplicate.
8. **Accessible.** WCAG 2.1 AA is the floor (§10), not the ceiling.

### 1.2 [Server] API + Admin principles (operator tooling)

The server is mostly an API + integration product; its "UX" splits between **developer experience (DX)** for STAR/PRMS/TIP/AICCRA + the AI pipeline, and **Admin UX** for the `/admin` SSR panel.

1. **Consistency over cleverness.** Every endpoint returns the same `ServerResponseDto` envelope; every entity carries the same `AuditableEntity` audit fields; every list endpoint uses the same paging/sort/filter conventions.
2. **Governed by default.** Mutations require auth + role + (for results) status-workflow checks. Anonymous endpoints are an explicit allowlist, not the default.
3. **One source of truth per concern.** CLARISA owns master data; AGRESSO owns contracts/staff; ROAR owns identity; ARI owns Results.
4. **Discoverable.** Every controller is documented in Swagger with examples and enums. Every list endpoint declares its query params.
5. **Observable.** Every request is intercepted, logged, and tagged with the user id; errors flow through one global filter with a uniform envelope.
6. **AI-augmented, human-governed.** AI formalization accelerates result entry, but everything lands in the same workflow with the same status transitions.

### 1.3 Shared north star

Both surfaces serve the **same Results domain**. STAR is the human face of the API; the Admin panel governs the same data the API serves. Where the two surfaces visually meet (status badges, brand color, result labels), they MUST stay coherent — the Admin baseline aligns to STAR's authoritative tokens (§7).

---

## 2. Information Architecture

### 2.1 [STAR] Client IA (authenticated experience)

```
Platform Shell (navbar + sidebar)
├── Home                              — landing dashboard for the logged-in user
├── Indicators
│   ├── About Indicators              — educational overview
│   └── Indicator detail (/:id)       — metadata + examples for one indicator
├── Results
│   ├── Results Center                — center-scoped overview & quick filters
│   ├── Search a Result               — federated full-text search across platforms
│   ├── Load Result                   — create-new flow
│   └── Result Detail (/:id)          — tabbed metadata editor
│       ├── General Information
│       ├── Links to Result
│       ├── Alliance Alignment
│       ├── Partners
│       ├── Evidence
│       ├── OICR Details
│       ├── IP Rights
│       ├── Capacity Sharing
│       ├── Policy Change
│       ├── Innovation Details
│       └── Geographic Scope
├── Projects
│   ├── My Projects                   — portfolio
│   └── Project Detail (/:id)         — project metadata + linked results
├── Dashboard                         — charts & aggregates
├── Notifications                     — real-time feed
├── Profile                           — account settings, theme
├── About                             — app/version info
└── Administration
    └── Center Admin
        ├── Bulk Upload (capacity sharing)
        ├── SDG Management
        └── Portfolio Management
```

Outside the shell (STAR public / utility):

```
Public / Unauthenticated
├── Landing        — marketing surface for anonymous users
├── Login          — Cognito entry
├── Auth           — Cognito callback / token exchange
├── Room (/:id)    — real-time collaboration deep link
├── Fields         — dynamic form-field configurator
├── Cache-test     — internal/dev utility
└── OICR Download  — public template download
```

### 2.2 [Server] Platform IA (bounded contexts)

The server surface is grouped by **bounded context**:

```
ARI (server)
├── Identity & access
│   ├── ROAR JWT (humans)
│   ├── client_id/client_secret (machines, via app_secrets + host allowlist)
│   └── Roles (SecRolesEnum: SYSTEM_ADMIN, CONTRIBUTOR, TECHNICAL_SUPPORT,
│                              CENTER_ADMIN, MEL_REGIONAL_EXPERT, ...)
├── Master data (read-mostly, sync-driven)
│   ├── CLARISA (countries, regions, levers, indicators, institutions, ...)
│   ├── AGRESSO (contracts, staff, contract countries)
│   └── Configuration (app_config, app_secrets, app_secret_host_list,
│                      announcement-settings, setting-keys, user-settings)
├── Results domain (owned by ARI)
│   ├── Results (versioned, snapshotted, workflow-governed)
│   ├── Result attachments (contracts, levers, indicators, institutions, users,
│       countries, regions, languages, keywords, evidences, tags, SDGs,
│       impact areas, initiatives, knowledge products)
│   ├── Result types (capacity-sharing, innovation-dev, policy-change, OICR,
│       IP rights, notable references, quantifications, actors)
│   ├── Status workflow (result-status, transitions, workflow, green-checks)
│   └── Reports (reports, report-year, general report)
├── Integrations (OpenSearch, TIP, DynamoDB feedback, RabbitMQ broker, Socket.IO)
├── Operations (cron jobs, reporting feedback, sync process log, /admin panel)
└── Public surface (REST API /api/v{n}, Swagger /swagger, /admin/public assets)
```

**Bridge:** STAR's IA is a human view of the same Results domain the server IA exposes as bounded contexts. STAR "Results Center / Search / Result Detail" are consumers of `/api/v{n}/results/...`; STAR "Administration → Center Admin" is a role-scoped subset distinct from the server's Sys-Admin `/admin` panel.

---

## 3. Primary User Flows

Golden paths new work must not regress. Each is a sequence of transitions.

### 3.1 [STAR] Client flows

**Create a Result (Contributor)**
1. Home → "Load Result" CTA → `load-results`.
2. Pick indicator type → indicator → result name.
3. **Duplicate check** runs (409 on collision); on collision, offer to link to the existing result.
4. On success → redirect to `result/:id/general-information`.
5. User fills tabs left-to-right; sidebar shows per-tab completion checks (green tick / orange warning).
6. Submit → status transitions; toast confirms; result appears in the MEL queue.

**Find & Link an Existing Result (cross-platform consumer)**
1. `search-a-result` → free-text / filters → federated results from STAR / TIP / PRMS / AICCRA.
2. Click row → `result/:id` for **every** platform. STAR results open editable per status/role; TIP / PRMS / AICCRA results open the same section shell fully read-only, with the source-platform deep link relocated into the form header (see the 2026-07-28 decision below).
3. From a result detail, "Links to result" tab → search & link counterparts on other platforms.

**Bulk Upload Capacity Sharing (Center Admin)**
1. Administration → Center Admin → Bulk Upload.
2. Download template → fill offline → upload.
3. Server validates row-by-row → per-row status returned; user fixes & re-uploads errored rows.

**Review & Validate (MEL Regional Expert)**
1. Notifications / Results Center → open a submitted result.
2. Review tabs in order; leave structured feedback; accept or return.
3. Reporter receives notification (real-time + Notifications page).

**Switch Theme**
1. Navbar / profile → toggle dark mode.
2. `DarkModeService` flips a signal → `.dark-mode` class on `<body>` → PrimeNG Aura swaps token set → CSS variables swap.
3. Choice persists (cache service / localStorage).

### 3.2 [Server] API + operations flows

**Contributor result lifecycle (STAR → ARI API)**
```
STAR UI → POST  /api/v1/results                              (create draft)
        → PATCH /api/v1/results/:code/general-information
        → PATCH /api/v1/results/:code/alignments
        → PATCH /api/v1/results/:code/geo-location
        → POST  /api/v1/results/:code/evidences              (+ other sub-resources)
        → POST  /api/v1/results/:code/status/transitions     (submit)
ResponseInterceptor wraps every response in ServerResponseDto.
Socket.IO emits result-updated events; STAR refreshes views in real time.
```

**AI-assisted result formalization**
```
AI pipeline → POST /api/v1/results/ai/formalize          (single)
            → POST /api/v1/results/ai/formalize/bulk      (admin/MEL only)
ARI validates payload (whitelist + transform + forbidNonWhitelisted),
links to indicator/contract/lever via CLARISA + AGRESSO references,
returns a result_official_code or per-row error envelope.
```

**Partner platform (PRMS/TIP/AICCRA) data consumption**
```
Partner → POST /token (out of band) → base64({client_id, client_secret})
        → GET /api/v1/opensearch/results?...
        → GET /api/v1/results?platform-code=PRMS&...
ARI validates token + origin/IP against app_secret_host_list before serving.
```

**Admin operations**
```
Admin → GET  /admin                                        (SSR React 19 dashboard)
      → GET  /admin/dashboard                              (stats)
      → GET  /admin/users                                  (user management)
      → GET  /admin/settings                               (configuration)
      → POST /api/v1/configuration/application/secrets     (CRUD app secrets)
      → GET  /api/v1/tools/clarisa/...                      (force sync)
```

**Sync cycle (cron-driven)**
```
@Cron(AGRESSO) → pull contracts/staff (MSSQL/SOAP) → upsert + sync_process_log
@Cron(CLARISA) → pull master data → upsert + reindex OpenSearch
@Cron(TIP)     → pull TIP integration data
@Cron(SyncLog) → housekeeping / retention on sync_process_log
```

---

## 4. Screen Inventory

One table across both surfaces. **Owner/Package** column distinguishes STAR client, server-admin, and external.

| # | Screen / Surface | Route / URL | Owner/Package | Shell | Notes |
|---|---|---|---|---|---|
| 1 | Landing | `/` (anon) | STAR client | No | Public, marketing |
| 2 | Login | `/login` | STAR client | No | Cognito |
| 3 | Auth callback | `/auth` | STAR client | No | Token exchange |
| 4 | Home | `/home` | STAR client | Yes | Dashboard + quick actions |
| 5 | About Indicators | `/about-indicators` | STAR client | Yes | Educational |
| 6 | Indicator Detail | `/indicator/:id` | STAR client | Yes | One of 5 indicator types |
| 7 | Results Center | `/results-center` | STAR client | Yes | Hub & quick filters |
| 8 | Search a Result | `/search-a-result` | STAR client | Yes | Federated search |
| 9 | Load Result | `/load-results` | STAR client | Yes | Create-new wizard |
| 10 | Result Detail | `/result/:id/...` | STAR client | Yes (+ 2nd-level sidebar) | 11 sub-tabs |
| 11 | My Projects | `/projects` | STAR client | Yes | Portfolio |
| 12 | Project Detail | `/project-detail/:id` | STAR client | Yes | Project metadata + results |
| 13 | Dashboard | `/dashboard` | STAR client | Yes | Chart.js visualizations |
| 14 | Notifications | `/notifications` | STAR client | Yes | Real-time feed |
| 15 | Profile | `/profile` | STAR client | Yes | User settings & theme |
| 16 | About | `/about` | STAR client | Yes | App info |
| 17 | Bulk Upload | `/administration/center-admin/bulk-upload` | STAR client | Yes (center-admin) | Capacity sharing |
| 18 | SDG Management | `/administration/center-admin/sdg-management` | STAR client | Yes (center-admin) | Center SDG alignment |
| 19 | Portfolio Management | `/administration/center-admin/portfolio-management` | STAR client | Yes (center-admin) | Strategy portfolio admin |
| 20 | Room | `/room/:id` | STAR client | No | Real-time collab |
| 21 | OICR Download | `/oicr/download` | STAR client | No | Public download |
| 22 | Fields | `/fields` | STAR client | No | Dynamic form config |
| 23 | Cache-test | `/cache-test` | STAR client | No | Dev tool |
| 24 | STAR Report Viewer | `/reports/result/:id?version=N` | STAR client | No (auth) | Loading surface + embedded PDF |
| 25 | Swagger UI | `/swagger` | server | n/a | STAR devs, partner devs, internal |
| 26 | Admin Dashboard | `/admin`, `/admin/dashboard` | server-admin (SSR) | Admin shell | Sys Admin, Tech Support |
| 27 | Admin Users | `/admin/users` | server-admin (SSR) | Admin shell | Sys Admin |
| 28 | Admin Settings | `/admin/settings` | server-admin (SSR) | Admin shell | Sys Admin |
| 29 | Static admin assets | `/admin/public/*` | server (Vite build) | n/a | Browser fetch |
| 30 | Partner dashboards | (external) | external platforms | n/a | PRMS / TIP / AICCRA |

---

## 5. Navigation Model

### 5.1 [STAR] Client navigation

- **Primary**: persistent top **navbar** (`alliance-navbar`) — branding, user menu, dark-mode toggle, notifications icon.
- **Secondary**: persistent left **sidebar** (`alliance-sidebar`) — Home / Results / Projects / Dashboard / Administration.
- **Tertiary**: inside Result Detail, a **second-level sidebar** (`result-sidebar`) lists the 11 tabs with completion indicators.
- **Contextual**: `section-header` shows page title, breadcrumb-like back behavior, per-section action buttons (`filters-action-buttons`, `search-export-controls`).
- **Back behavior**: every screen except `home` and `projects` (`hideBackButton: true`) supports `back` via the section header.
- **Deep links**: every result tab is independently routable (`/result/:id/<tab>?version=N`) — a shared URL preserves tab and version context.
- **Auth-guarded**: all shell routes pass `rolesGuard`; admin routes additionally pass `centerAdminGuard`.

### 5.2 [Server] API navigation (URL grammar)

- Global prefix `/api`; URI versioning `/api/v1/...`, `/api/v2/...` (`VersioningType.URI` in `main.ts`).
- Bounded-context segments mirror `domain/routes/main.routes.ts`:
  - `/api/v1/results/...` + children (`status`, `evidences`, `alignments`, `geo-location`, `actors`, `institutions`, …)
  - `/api/v1/agresso/...`, `/api/v1/clarisa/...` (via `/api/v1/tools/...`)
  - `/api/v1/opensearch/...`, `/api/v1/configuration/...`, `/api/v1/user/configuration/...`
  - `/api/v1/reports/...`, `/api/v1/reporting-feedback/...`
- Per-result sub-resources nest under `/results/:result-code/{sub-resource}`.
- Boolean and list query params normalized by `QueryParseBool` and `ListParseToArrayPipe`.

### 5.3 [Server] Admin SSR navigation

- Top-level routes: `/admin`, `/admin/dashboard`, `/admin/users`, `/admin/settings`.
- Side nav lives in `src/admin/client/components/Sidebar.tsx` (add-a-page recipe in `src/admin/README-REACT.md`).
- Admin assets are version-stamped via the Vite manifest; static files served from `dist/admin/public`.

---

## 6. Layout Patterns

### 6.1 [STAR] Client layout patterns

| Pattern | When to use | Anchored to |
|---|---|---|
| **Shell + content** | All authenticated screens | `platform.component`, navbar + sidebar |
| **Tabbed detail** | Long structured records (Result Detail) | `result-sidebar` + outlet |
| **List + filter + export** | Search / Results Center / Projects | `results-table`, `filters-action-buttons`, `search-export-controls` |
| **Card grid** | Indicator catalog, dashboard widgets | section-level layout |
| **Two-column form** | Result metadata tabs | Label column + control column, full-width at `md:` breakpoint |
| **Modal-driven action** | Confirmation, link result, evidence upload | `all-modals` host + `modal` wrapper |
| **Real-time banner** | System alerts | `alert-tag`, `global-alert`, `global-toast` at top of shell, dismissible |

Spacing, sizing, and breakpoints use the `rs-*` utility class system (see `client/research-indicators/README.md`) so layouts respond consistently to the `md:` breakpoint (landscape orientation, height ≤ 768px).

### 6.2 [Server] API response envelope

Every HTTP response follows `ServerResponseDto`:
```json
{
  "data": "<payload | []>",
  "status": "<HttpStatus>",
  "description": "<human-readable summary>",
  "errors": "<string | string[] | null>",
  "timestamp": "<ISO 8601>",
  "path": "<request.url>"
}
```
- Success: `data` populated, `errors: null`.
- Error: `data: []`, `errors` populated, `status` ≥ 400, same shape (via `GlobalExceptions`).
- Streaming downloads (`StreamableFile`) bypass the envelope.

**List endpoints:** `page` / `limit` paging; `sort-order` (`ASC|DESC`) + `sort-field` (enum, e.g. `ResultSortEnum`); kebab-case filters parsed by `ListParseToArrayPipe` (arrays) and `QueryParseBool` (booleans); `search` param where supported.

### 6.3 [Server] Admin panel layout

- React 19 + Vite SSR.
- `src/admin/client/components/Layout.tsx` is the shell (Sidebar + Header + content).
- `StatsCard`, `Table`, `Form` patterns documented in `src/admin/README-REACT.md`.
- Data flow: SSR initial data → hydrated React → optional client-side fetch for refresh.

---

## 7. Design Tokens

Two token systems. **STAR's PrimeNG Aura + CSS-variable system is authoritative for the main app.** The Admin baseline is a smaller set that MUST align to STAR where the two surfaces visually meet (brand blue, status badges, result labels).

### 7.1 [STAR] Client tokens (authoritative)

Tokens live in `client/research-indicators/src/styles/colors.scss`, `src/styles/font.scss`, `src/app/theme/roartheme.ts`, surfaced as CSS custom properties under `:root`. **Do not hard-code hex values in new components.**

**Color families (light-mode source values):**

| Family | Token range | Use |
|---|---|---|
| Light blue | `--ac-light-blue-100` … `-500` | Informational accents, links |
| Primary blue | `--ac-primary-blue-100` … `-700` | Brand, navbar, primary CTAs |
| Green | `--ac-green-100` … `-700` | Indicators 1–3 (capacity sharing, innovation dev, policy change A) |
| Orange | `--ac-orange-1` | Indicators 4–5 |
| Grey | `--ac-grey-100` … `-900` | Neutrals, borders, body text |
| Red | `--ac-red-1` | Errors, destructive actions |
| Warning | `--ac-warning-1` | Validation warnings, non-blocking field errors |
| White | `--ac-white-1`, `--ac-white-2` | Surfaces |
| Background | `--ac-background` | Page background (flips in dark mode) |
| Pool Funding | `--ac-pool-funding-fg`, `--ac-pool-funding-border` | Bilateral "Pool Funding" tag |
| Chip blue | `--ac-chip-blue-bg`, `--ac-chip-blue-fg` | Result-count chip on the Indicator metadata bands (§8.1). Purpose-built pair, added 2026-07-31 — **light `#e8f0f7` / `#345b8f` = 6.00:1, dark `#253448` / `#b0c4dd` = 7.09:1**, both clearing WCAG 2.1 AA 4.5:1 for the chip's 12px/700 text. The nearest family neighbour (`--ac-primary-blue-100` over `-300`) computes to 3.88:1 light / 1.55:1 dark and **fails** — which is why this is its own pair rather than a reuse. Full record: `docs/specs/archive/2026-08-03-project-dashboard--indicator-metadata-charts/design.md` §7.6. |

Dark mode overrides the same token names under `:root[data-theme="dark"]`. **Correction (2026-08-21, `innovation-use/details-page` T-12):** the PrimeNG Aura preset does **not** flip via a `.dark-mode` body class — that was never true. `app.config.ts` declares `darkModeSelector: '.dark-mode'`, but `DarkModeService` (`shared/services/dark-mode.service.ts`) only ever calls `setAttribute(document.documentElement, 'data-theme', …)`; it never touches `classList` on `<body>` or any element (verified twice; a repo-wide grep for `.dark-mode` returns only the `app.config.ts` declaration and three unrelated component imports of the service). So the selector PrimeNG is configured to look for is never applied, and **PrimeNG's own Aura dark palette never activates — PrimeNG chrome renders light-Aura regardless of theme.** Only elements styled through `--ac-*` custom properties actually darken. This is a real gap, tracked as **RB-8/RB-9 territory** (dark-mode non-compliance) — not fixed here; fixing `dark-mode.service.ts` is out of scope for the spec that found it.

**Utility classes (do not invent parallels):**
- `.abc-<color>` — background color (e.g., `.abc-primary-blue-500`)
- `.atc-<color>` — text color (e.g., `.atc-light-blue-300`)
- `.fs-[n]` / `.md:fs-[n]` — font size (n = 1–30 px)
- `.rs-size-[n]`, `.rs-w-[n]`, `.rs-h-[n]` — width/height (0–500 px)
- `.rs-gap-*`, `.rs-m-*`, `.rs-p-*` families — gaps / margins / padding
- `.rs-hide`, `.md-rs-hide`

`.md:` variants apply to the landscape ≤ 768 px height breakpoint and use `!important` to override base rules.

**Known traps (verified by review, `innovation-use/details-page` T-11/T-12, 2026-08-21):**
- **`.fs-[n]` cannot override the canonical form-label classes.** `custom-fields.scss` matches `body .label` at specificity `(0,1,1)` with a non-`!important` `font-size`, which beats `.fs-[16]`'s `(0,1,0)` **regardless of load order**. `class="label fs-[16]"` silently renders the label's own size, not `16px`.
- **Two incompatible `md:` semantics coexist in one class attribute.** Tailwind's `md:` prefix (e.g. `md:grid-cols-2`) means `min-width: 48rem`. This system's own `md:` prefix on `.rs-*` / `.fs-*` classes (e.g. `md:rs-gap-[8]`) means *landscape orientation with height ≤ 768px*. Both can sit on the same element and fire on different conditions — read the prefix by which class it's attached to, not as one global breakpoint.
- **The spacing range is tight at both ends.** `.fs-*` is 1–30, and every `.rs-gap*` / `.rs-m*` / `.rs-p*` family is also 1–30, while `.rs-size` / `.rs-w` / `.rs-h` are 0–500. So `.rs-p-[40]` and `.rs-p-[0]` both emit **no class at all** (silently, not an error), and `.rs-p-[30]` — the ceiling — is already used 4 times in `client/research-indicators/src/app`. **Open, not settled:** whether to widen the 1–30 ranges has not been decided by the user/engineering lead; this row records the option, not a resolution.

**Typography:** font scale in `src/styles/font.scss`; rem-based base size respecting browser defaults; per-element overrides via `.fs-[n]`. Heading hierarchy used by `section-header` and `form-header`.

**Form-field styling:** custom styles in `src/styles/custom-fields.scss`; PrimeNG inputs wrapped/restyled through `src/styles/custom-prime-force-styles.scss`. Use the wrapped versions, not raw PrimeNG defaults.

**Canonical form-label classes (binding contract).** Form labels MUST use the canonical SCSS classes from `src/styles/custom-fields.scss` — Tailwind utilities (`text-sm`, `font-medium`) are NOT a substitute (they render body grey/black instead of brand blue):

| Element | Class | Resolved style |
|---|---|---|
| Field label / question text | `.label` | `#153c71` (`--ac-primary-blue-400`), Space Grotesk, 14px, 450 |
| Description / helper text | `.description` | `#777c83` (`--ac-grey-700`), Barlow, 14.5px, 400 |
| Per-option text (radio/checkbox) | `.option-label` | `#4c5158` (`--ac-grey-800`), Barlow, 14px, 400 |
| Section heading in a form card | `.section-title` | `#a2a9af` (`--ac-grey-500`), Space Grotesk, 14px, 450, uppercase, `mb: 20px` |
| Required marker | `<span class="text-red-500">*</span>` (NOT `atc-red-1`) | Tailwind red — matches shared `app-radio-button` |

Reach for the shared `app-radio-button` / `app-input` (they apply `.label` / `.option-label` internally) before bare `<p-radioButton>` / `<label>`.

### 7.2 [Server] Admin baseline tokens

The Admin panel and any inline HTML responses follow a small token set. **This baseline should align to STAR's tokens where the surfaces visually meet; migrating it onto STAR's palette is recorded in §12 (D-9).**

| Token | Hex | Usage |
|---|---|---|
| `--ari-primary` | `#1F6FEB` | primary actions, links |
| `--ari-primary-strong` | `#1158C7` | hover / pressed |
| `--ari-success` | `#1A7F37` | OK / 2xx surfaces |
| `--ari-warning` | `#9A6700` | 3xx, redirects |
| `--ari-danger` | `#CF222E` | 4xx/5xx, destructive |
| `--ari-text` | `#1F2328` | body text |
| `--ari-muted` | `#656D76` | secondary text |
| `--ari-surface` | `#FFFFFF` | cards, panels |
| `--ari-surface-alt` | `#F6F8FA` | app background |
| `--ari-border` | `#D0D7DE` | dividers |

- **Typography:** system stack `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`; monospace `ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`; scale 12 / 14 / 16 / 20 / 24 / 32 px.
- **Spacing & radius:** spacing 4 / 8 / 12 / 16 / 24 / 32 / 48 px; radius 4px (inputs), 8px (cards), 999px (pills/badges).

### 7.3 Shared status tokens (cross-cutting)

Display-only labels; exact values come from the `result_status` table. **Both STAR and Admin should pull human labels from `/api/v1/results/status` rather than hardcode them.**

| Token | Meaning |
|---|---|
| `result-status.draft` | DRAFT |
| `result-status.submitted` | SUBMITTED |
| `result-status.approved` | APPROVED |
| `result-status.rejected` | REJECTED |
| `result-status.archived` | ARCHIVED |

---

## 8. Component Inventory

### 8.1 [STAR] Client components

All shared, reusable components live under `client/research-indicators/src/app/shared/`. Reach for them before building new ones.

- **Shell & navigation:** `alliance-navbar`, `alliance-sidebar`, `section-header`, `result-sidebar`, `section-sidebar`, `form-header`, `navigation-buttons`
- **Data display:** `results-table`, `project-results-table`, `project-item`, `partner-selected-item`, `notification-item`, `custom-tag`, `custom-progress-bar`, `metadata-panel`, `alert-tag`
- **Forms & input:** `dropdowns`, `dropdown`, `custom-fields`, `search-export-controls`, `shared-result-form`, `quantification-item` (`shared/components/quantification-item/` — **moved here 2026-08-21** from `pages/platform/pages/result/pages/oicr-details/components/quantification-item/`; two result-detail pages now render it, OICR and Innovation Use — see decision record §12.2)
- **Modals & overlays:** `all-modals` (host), `modal` (wrapper) — all dialogs route through these; never instantiate ad-hoc overlays.
- **System feedback:** `global-alert`, `global-toast`, `alert-tag`
- **OICR-specific:** `download-oicr-template`, `oicr-header`, `oicr-workflow-status`
- **Result indicator-6 (Innovation Use) section, `pages/platform/pages/result/pages/innovation-use-details/`:**
  - **Level stepper** — `components/innovation-use-level-stepper/innovation-use-level-stepper.component.ts` — 0–9 use-level buttons + a definition callout. **Trap:** the button *label* is the catalog row's `level`; the *emitted* value is its `id` — they are never the same number (`id = level + 1`).
  - **Actor card** — `components/innovation-use-actor-item/innovation-use-actor-item.component.ts` — one actor row: type + OTHER name, aggregate/disaggregated mode switch, four counts, a derived read-only total. **Trap:** the total renders **empty, not `0`,** when all four disaggregated counts are absent — `0` would misreport "counted zero" instead of "not counted."
  - **Organization card** — `components/innovation-use-organization-item/innovation-use-organization-item.component.ts` — one organization row: known/unknown identity paths (institution lookup vs. type + cascading sub-type), OTHER name, an optional count. Every field on this card is optional — no asterisks.
  - **Inline load-failure banner** — `innovation-use-details.component.html`, driven by the page's `loadFailed` signal. **New visual pattern:** every other result-detail page surfaces a load failure only through `ActionsService` (toast/alert); this page instead renders an inline red-bordered banner in place of the form. Page-local, not yet promoted to a shared component — noted here so a future consolidation has something to find.
- **Utilities:** `copy-token`, `filters-action-buttons`

> **Rule:** a new screen that introduces a "card" / "table" / "modal" pattern not covered above must either (a) extend the shared component or (b) document the new component in §12 and add it to this inventory in the same change.

**Page-scoped pattern — expandable ranked cards (`project-detail/components/project-dashboard-card`, `ProjectDashboardCardComponent`).** Not in the shared library above — scoped to `project-detail`, with two hosts today: `project-dashboard.component.html` (the four ranked charts, each a standalone `variant="list"` card) and `geo-scope-card.component.html`, which renders the card **four** times — one default `variant="card"` shell (`:1`, `title="Top geographic scope"`, its content supplied via `<ng-content>`) **wrapping** three `variant="list"` lists (`:31`, `:40`, `:49`). Documented here because the pattern is reusable within that page family.

- **Shape:** renders an ordered list, collapsed to its top `COLLAPSED_ITEM_LIMIT = 5` rows, with a "Show more" / "Show less" toggle that expands it in place to the full list — no dialog, no navigation, no second request.
- **State is host-owned, not card-owned.** The card is purely presentational: the host passes a `visibleLimit` input down per card (`number` or `null`) and reacts to the card's `expandToggled` output. `visibleLimit` **defaults to `null`** (= render every item), which is what makes the card change purely additive — every pre-existing call site that binds no `visibleLimit`, including the geographic card's three `variant="list"` lists, keeps rendering exactly as before (**DD-12**, §12.2).
- **Geometry is frozen across expand/collapse (DD-14, §12.2)** — the card's rendered height does not change when its list expands.
- Spec of record: `docs/specs/archive/2026-07-30-project-dashboard--full-payload-show-more/design.md` §6.

**Page-scoped pattern — Indicator metadata bands (`project-detail/components/project-dashboard/indicator-metadata-band`, `IndicatorMetadataBandComponent`, new 2026-07-31).** Renders below the four ranked cards inside `project-dashboard.component.html`. **4 bands, 10 cards** grouped by indicator — Innovation Development (Innovation Nature, Innovation Type, Current Readiness), Capacity Sharing (Training or engagement to report, Training vs. Engagement, Gender, Degree), Policy Change (Policy Type, Stage in Policy Process), OICR (Maturity) — per `docs/specs/archive/2026-08-03-project-dashboard--indicator-metadata-charts/requirements.md` §4.1. Each card reuses the existing `ProjectDashboardCardComponent` **unmodified** (DD-6) and joins the same host-owned expansion contract as the four ranked cards above (DD-10, §12.2). Band visibility follows the existing `indicatorsWithResults()` computed — an indicator with zero results on the project contributes no band (R-IMC-009). Band order follows descending result count; bands are collapsible, default open, in-memory state (DD-9, §12.2).

- **Grid (DD-7, §12.2 — corrected 2026-07-31):** `repeat(auto-fill, minmax(300px,1fr))` for single-card bands, `repeat(auto-fill, minmax(400px,1fr))` for the 4-card band, one column below `720px` (`indicator-metadata-band.component.scss:100-129`). The 4-card band's layout is **not** a fixed 2×2 — it reflows by container width and by sidebar state; see DD-7 for the measured breakdown.
- Spec of record: `docs/specs/archive/2026-08-03-project-dashboard--indicator-metadata-charts/design.md` §7.

### 8.2 [Server] Backend components (HTTP/socket primitives)

- **Controllers** per module (e.g. `ResultsController`) with `@ApiTags`, `@ApiOperation`, `@ApiQuery`, `@ApiBody`, `@ApiBearerAuth`.
- **Services** (business logic + TypeORM query composition); **Repositories** in `entities/<module>/repositories`; **DTOs** under `entities/<module>/dto`.
- **Interceptors:** `LoggingInterceptor`, `ResponseInterceptor`, `SetUpInterceptor`.
- **Filters:** `GlobalExceptions`. **Guards:** `RolesGuard`, `ResultStatusGuard`. **Pipes:** `QueryParseBool`, `ListParseToArrayPipe`.
- **Decorators:** `@Roles`, `@GetResultVersion`, `@OpenSearchProperty`.
- **Middleware:** `JwtMiddleware` (excludes `/admin`, `/admin/public`, `/.well-known`, `/`, `/favicon.ico`, `GET /api/configuration/:key`).
- **Gateways:** `ServerGateway`, `ClientGateway` (Socket.IO). **Apps:** `AlianceManagementApp`, `AiRoarMiningApp`, `SelfApp` (RabbitMQ hubs in `tools/broker`).

### 8.3 [Server] Admin UI components

Inside `src/admin/client/components`: `Layout`, `Sidebar`, `Header`, `StatsCard`. Pages `Dashboard`, `Users`, `Settings` under `src/admin/client/pages`. New pages MUST follow the four-step recipe in `src/admin/README-REACT.md` (component → route → controller → sidebar entry).

---

## 9. Responsive Behavior

| Surface | Behavior |
|---|---|
| **[STAR] Client** | Primary form factor desktop browser 1280–1920px. Supported: laptop landscape ≥ 1024px wide, height ≥ 768px. Constrained: landscape height ≤ 768px (`md:` breakpoint) — layouts compress vertically, some chrome hides via `.md-rs-hide`. Mobile portrait is not a primary target ([`docs/prd.md`](../prd.md) OQ-6) — must not crash but not pixel-tuned. Prefer compact PrimeNG tables on small viewports; scale spacing via `.rs-*`. |
| **[Server] API** | Not applicable (consumer-driven). |
| **[Server] Swagger UI** | Provided by `@nestjs/swagger`; responsive by default. |
| **[Server] Admin panel** | Minimum viewport 1280 × 800 (operator workstation). Below that, side nav collapses, tables scroll horizontally, cards stack. |

---

## 10. Accessibility Expectations

**WCAG 2.1 AA is the target for both surfaces** (STAR PRD constraint C-4).

### 10.1 [STAR] Client
- **Keyboard:** every interactive control reachable via Tab; visible focus ring; no keyboard trap.
- **Labels:** all inputs have `<label>` or `aria-label`; icon-only buttons have `aria-label`.
- **Contrast:** token combinations chosen so body text ≥ 4.5:1, large text & UI icons ≥ 3:1; dark-mode pairings verified separately.
- **Status non-visual:** success/error/warning conveyed by icon + text, not color alone (`custom-tag`, `alert-tag`).
- **Motion:** avoid auto-playing motion; respect `prefers-reduced-motion`.
- **Live regions:** real-time alerts (`global-alert`, `global-toast`) use ARIA live regions.
- **PrimeNG + Angular CDK** used for focus management & overlays; do not bypass them.
- **Ranked-card expand/collapse toggle** (`project-dashboard-card`, §8.1): the "Show more"/"Show less" control is a real `<button>`, reachable by Tab and operable by `Enter`/`Space`, exposes `aria-expanded` reflecting state, and its accessible name **includes the chart's title** so four otherwise-identical toggles are distinguishable (NFR-PDB-003, `docs/specs/archive/2026-07-30-project-dashboard--full-payload-show-more/requirements.md`). **Gap closed 2026-07-31 (T-15, `docs/specs/archive/2026-08-03-project-dashboard--indicator-metadata-charts/tasks.md`):** the DD-14 overlay that carries the expanded list (§12.2) — previously a plain, unfocusable `<div>` — now carries `tabindex="0" role="group" [attr.aria-label]="title()"`, so it is Tab-reachable (`project-dashboard-card.component.html:71-72`). A trusted `Page Down` on an equivalent `tabindex="0"` / `overflow-y:auto` container was measured scrolling in real Chrome (`scrollTopBefore: 0` → `scrollTopAfter: 120`, `docs/specs/archive/2026-08-03-project-dashboard--indicator-metadata-charts/evidence/t16-raw/measurements.json` → `scroll_probe`); **the shipped overlay itself was not the measured element** — the probe's own `ariaLabel` reads `"Scroll probe (T-16 fixture)"`, which the shipped binding cannot produce, and it sits under the harness-owned id `#t16-scroll-probe`. **Scope of this claim, stated precisely:** this closes the gap for the DD-14 overlay in `ProjectDashboardCardComponent` — the four Chunk A ranked cards plus the Indicator-metadata cards that engage the same overlay (§8.1) — on the strength of the focusability of the shipped markup plus a same-shape scroll measurement, not a direct measurement of the shipped overlay's own scroll behavior. It is **not** a blanket WCAG 2.1.1 (Keyboard) conformance claim for this screen or any other control on it.

### 10.2 [Server] Admin panel
- Keyboard-reachable side nav and tables; visible focus rings; `aria-current="page"` on active route.
- Color contrast ≥ 4.5:1 for body text on `--ari-surface` / `--ari-surface-alt`.
- Status badges pair color with a text label (never color-only).
- Form fields have associated `<label>`; error messages linked via `aria-describedby`.

### 10.3 [Server] API
- Error envelopes carry a human-readable `description` plus machine-readable `errors`; clients can localize either.

---

## 11. Dark Mode Behavior

| Surface | Status | Mechanism |
|---|---|---|
| **[STAR] Client** | **Shipped (light + dark) for `--ac-*` tokens; PrimeNG's own dark palette is not shipped — see §7.1 correction.** | `DarkModeService` (signal-based, persisted in localStorage) sets `data-theme` on `<html>`; `:root[data-theme="dark"]` swaps `--ac-*` CSS variables, which is what makes token-based components darken. `app.config.ts` also declares `darkModeSelector: '.dark-mode'` for the PrimeNG Aura preset, but `DarkModeService` never adds that class anywhere (§7.1) — so PrimeNG's internal dark palette never activates, and PrimeNG chrome (raw `p-select` / `p-checkbox` / `p-inputNumber` surfaces not restyled through `custom-prime-force-styles.scss`) renders light-Aura regardless of theme. Components must use token utilities (`.abc-*` / `.atc-*`) or CSS variables — **never** hard-coded hex — for the half of dark mode that does work. |
| **[Server] Admin panel** | **Proposed, not shipped.** | When introduced, MUST reuse the same `--ari-*` token names with dark values applied via `prefers-color-scheme` + a manual override stored in `user-settings`. Should adopt STAR's `data-theme` convention for cross-surface consistency. |
| **[Server] API** | Theme-agnostic. | n/a |

Per-screen note (STAR): dark+light parity is not codified as a hard product constraint today ([`docs/prd.md`](../prd.md) OQ-3), but breaking dark mode on a screen that previously supported it is a regression.

---

## 12. Design Decisions

> Append-only. New decisions go to the bottom. Two lineages coexist: **D-1…D-9** = server/platform decisions; the dated **[STAR]** entries = client decisions.

### 12.1 [Server] Platform decision log

| # | Date | Decision | Rationale |
|---|---|---|---|
| D-1 | (legacy) | Uniform `ServerResponseDto` envelope on every HTTP response, including errors. | Predictable client handling; uniform logging via `ResponseInterceptor`. |
| D-2 | (legacy) | URI versioning (`/api/v1`, `/api/v2`) under a single `/api` prefix. | Clients pin to a version; avoids header negotiation; matches existing controllers. |
| D-3 | (legacy) | TypeORM + MySQL (utf8mb4) as system of record; explicit migrations under `src/db/migrations`. | Strict schema control; rich relations on `Result`. |
| D-4 | (legacy) | Two auth shapes: ROAR JWT (humans), base64 `client_id/client_secret` (machines) validated against `app_secrets` + `app_secret_host_list`. | First-party partner integrations without minting ROAR identities. |
| D-5 | (legacy) | OpenSearch shape derived from TypeORM entities via `@OpenSearchProperty`. | One source of truth for entity ↔ search mapping; lower drift. |
| D-6 | (legacy) | Microservice transport on RabbitMQ (`amqps://`), single queue `ARI_QUEUE`. | Reliable cross-system events without HTTP-retry coupling. |
| D-7 | (legacy) | Embedded Admin SSR (Vite + React 19) inside the Nest app under `/admin`. | One deployable artifact for admin tooling; shared auth context option. |
| D-8 | (current) | `/admin` excluded from `JwtMiddleware`. | Allows SSR bootstrap, but creates an open issue — see §13 OG-9. |
| D-9 | 2026-07-22 | Monorepo: this doc now governs **both** the STAR client (primary UX) and the server surface. The Admin `--ari-*` baseline is provisional and should migrate onto STAR's `--ac-*` palette where the surfaces visually meet (brand blue, status badges). | Single visual language across the product; avoids a second, drifting admin theme (supersedes the standalone-doc assumption that admin owns its own palette). |

### 12.2 [STAR] Client decision record

- **2026-05-13 — Lock UI stack at PrimeNG 19 + Aura preset.** No mixing of other component libraries. *Rationale:* prevent design drift; Aura already overridden for brand.
- **2026-05-13 — Controlled-list inputs only for CLARISA-managed fields.** *Rationale:* PRD C-3; free text for CLARISA fields is a defect.
- **2026-05-13 — Result Detail is the only tertiary-navigation surface.** *Rationale:* avoid navigation depth elsewhere; tabbed editors are a metadata-record pattern, not a general one.
- **2026-05-13 — All overlays route through `all-modals` + `modal`.** *Rationale:* consistent escape-key, focus-trap, dismiss behavior.
- **2026-05-13 — Spacing/sizing via `rs-*` utilities, not inline styles.** *Rationale:* responsive breakpoint already encoded; ad-hoc CSS drifts.
- **2026-05-20 — Bilateral / Pool Funding tag visibility shipped.** New tokens `--ac-pool-funding-fg` / `--ac-pool-funding-border` registered in `STATUS_COLOR_MAP` under `'pool-funding'`; surfaces on `my-projects` (table column + sidebar filter + card view) and `project-detail` (clickable badge for Center Admins). New admin page `/administration/center-admin/agresso-pool-funding-tag` for manual override. *Rationale:* bilateral phase 1 — make Pool Funding contracts visible and Center-Admin-overridable before alignment work lands.
- **2026-05-23 — Bilateral / Pool Funding Alignment section shipped (12th result tab, conditionally rendered).** New `STATUS_COLOR_MAP` entry `'pf-synced'` reusing `--ac-grey-700` (no new tokens) for the synced/read-only badge; sidebar entry between "Alliance alignment" and "Partners", hidden when `eligible !== true` (signal-driven via `BilateralService.currentAlignment`). Real-time reconcile via Socket.IO event `result.pool-funding-alignment.changed` with a dirty-state guard. AR.3 holds: alignment is NOT in the submission validator (`pool_funding_alignment` intentionally absent from `GreenChecks`; regression test in `submission.service.spec.ts`). *Rationale:* bilateral phase 2 — record Pool Funding contribution + lever selection per result with cross-tab real-time coherence.
- **2026-05-24 — Pool Funding Alignment remediated to match Figma + canonical layout/typography.** Seven visual/copy/placement defects fixed, plus a parent-page-load fix, a URL-pattern fix (strip `STAR-` before calling `v1/results/<digits>/pool-funding-alignment`), defensive `WebsocketService` / `ClarityService` injection (app does not register `SocketIoModule.forRoot(...)` in prod — tab degrades gracefully), and a layout pass onto `.app-page-wrapper` / `.section-title` / single `<app-navigation-buttons>`. *Rationale:* trust the Figma mockups as canonical UX; reuse §6 / §7.1 primitives instead of bespoke Tailwind — established the §7.1 form-label binding contract in the same change.
- **2026-05-27 — Bilateral indicator-mapping spec locked on the backend result-scoped HLOs+indicators endpoint** (T-15.12). *Spec-level; UI gated by OQ-IM-1.* FE consumes `GET /api/v1/results/:resultCode/pool-funding-alignment/hlos-indicators` (SP → AOW → outcome/output → indicator tree pre-grouped via `pairs[]`, live from CLARISA + PRMS through a 5-min cache). AOW is a CLARISA level-2 taxonomy entry (not a first-class ARI entity); 1:1 indicator → AOW. Withdrawn: the catalog-wide `.../indicators` + client-side regrouping. Modal handles `aow_status` = `unmapped` / `no_aow_mappings` / `has_aow`. *Rationale:* backend already exposes the shape the mockups need. *Trade-off:* FE mirrors the raw PRMS shape and derives per-row enrichment client-side until backend mirrors safe-bundle fields.
- **2026-07-29 — Expandable ranked-card pattern shipped on the project dashboard (`ProjectDashboardCardComponent`, §8.1).** Collapsed view shows the top 5 items; a "Show more"/"Show less" toggle expands each of the four ranked charts (Results Partners, Primary Levers, Main contact person, Contributing projects) in place, from data already in memory. Expansion state lives in the host (`ProjectDashboardComponent`), keyed per chart, not in the card. *Rationale:* one implementation works for every layout the card renders, including the geographic card's list variant, which binds no `visibleLimit` and is therefore untouched (DD-12).
- **DD-14 (2026-07-29) — freeze the expanded card's geometry instead of bounding it.** The expanded list is bounded to the area the card **already occupies**, so the card's rendered height is identical collapsed and expanded — only the list's scroll state differs. Shipped as an always-in-flow 5-row render that defines the card's box (becoming a `visibility:hidden` + `aria-hidden` spacer while expanded — that is what stops the card *shrinking*), plus a `position:absolute; inset:0; overflow-y:auto` overlay carrying the full list, which contributes nothing to the card's intrinsic size. **Verified by measurement in real headless Chrome across six viewports** (zero height delta, both directions, every card individually and all four at once) — not by CSS argument alone. **Supersedes DD-13** (conditionally switching the ranked grid to `align-items: start` while a card is expanded): `align-items` does not size grid tracks — it only governs how a *shorter* item sits inside an already-sized track — so DD-13 stopped the row-mate stretching but every downstream link (grid → column → outer grid → the `flex-1` *Results by status* card) kept growing regardless. *Rationale for recording DD-13 here too:* a future reader re-deriving the containment problem from scratch will find `align-items: start` a plausible-looking fix; it looked correct enough to survive three rounds of review before failing under measurement. Full record: `docs/specs/archive/2026-07-30-project-dashboard--full-payload-show-more/design.md` §6.3.2. **NFR-PDB-004 note:** the mechanism above is measured and holds; the six-step human-check *acceptance* of the rendered result was, as of this entry, still unverified — treat that as a separate, unresolved fact rather than assume this decision closes it.
- **2026-07-29 — Four project-dashboard chart titles renamed to match their verified reporting-form field names (R-PDB-007).** `Top partner institution` → **Results Partners**; `Top primary levers` → **Primary Levers**; `Top main contact person` → **Main contact person**; `Top contributing projects` → **Contributing projects**. *Rationale:* traceability for MEL analysts back to the field the number comes from; none of these four begins with "Top " any more. Out of scope and unchanged: (a) the geographic card's own sub-list headings ("Top regions", "Top countries", "Top sub-national levels") — those label rows inside another card, not chart titles; and (b) the geographic card's own `title="Top geographic scope"` (`geo-scope-card.component.html:1`) — a fifth "Top " title on this screen, deliberately untouched here and deferred to `../geo-scope-expansion/` per `requirements.md` R-PDB-007.
- **DD-5 (2026-07-30) — Indicator metadata bands driven by a data-driven band model, not ten hand-written templates.** A pure mapper builds a band model (band → indicator, result count, cards), rendered by one `@for` loop instead of ten instances. *Rationale:* per-entry data assertions cover each card at the mechanism level, and a card added later inherits the gate for free. Full record: `docs/specs/archive/2026-08-03-project-dashboard--indicator-metadata-charts/design.md` §7.1, §12.
- **DD-7 (2026-07-30; corrected 2026-07-31) — 4-card band grid is `repeat(auto-fill, minmax(400px,1fr))`, and its layout is width- and sidebar-state dependent, not a fixed 2×2.** Measured in real Chrome: at 1440 px in the app's default (sidebar-collapsed) state it is 3 columns + 1 wrapped card; genuine 2×2 needs the sidebar manually expanded; at 768 px default it is one column, four stacked cards. The original 2026-07-30 record claimed an unqualified 2×2, warranted by measurement at 500/768/1440 px (KZ-006) — that was corrected after real-Chrome re-measurement found the claim itself unscoped and, at 1440 px and 768 px in the default state, wrong. *Rationale:* `auto-fill` grids reflow by container width; the fix is documentation, not CSS — the owner declined a layout change. Full record: `docs/specs/archive/2026-08-03-project-dashboard--indicator-metadata-charts/design.md` §7.4, §12 DD-7; `docs/specs/archive/2026-08-03-project-dashboard--indicator-metadata-charts/evidence/t16-report.md` §Q1–Q2.
- **DD-9 (2026-07-30) — Indicator metadata band collapse state is in-memory, not persisted.** Mirrors the existing ranked-card expansion pattern's host-local signal. *Rationale:* consistency with the pattern already shipped for the four ranked cards; no new persistence surface. Full record: `docs/specs/archive/2026-08-03-project-dashboard--indicator-metadata-charts/design.md` §12.
- **DD-10 (2026-07-30) — Indicator metadata cards join the existing card-expansion contract** (host-owned `visibleLimit` + `expandToggled`), rather than a separate mechanism. `visibleLimit === null` is the expanded state; cards with ≤5 categories never render a toggle. *Rationale:* reuses machinery already gated by NFR-PDB-003/T-15's a11y fix instead of building and testing a second one. Full record: `docs/specs/archive/2026-08-03-project-dashboard--indicator-metadata-charts/design.md` §7.2, §12.
- **2026-08-12 — `aligns_with_toc` keeps its column, wire, and draft-type name; the question it backs is reworded to ask whether the contributor wants to complete the ToC mapping (D-C1-2, `docs/specs/archive/2026-08-13-bilateral--toc-optional-mapping`).** *Rationale:* stored values stay compatible (`true` = mapped); renaming mid-flight breaks the FE for no user benefit. The meaning shifts from "does this contribute" to "opted into detailed mapping" — documented, not renamed (R-1 in that spec's requirements §9).
- **2026-08-12 — `aligns_with_toc: true` now requires only `level` + `toc_result_id`; `indicator_id` and `quantitative_contribution` become optional (D-C1-3, the Level + HLO floor).** *Rationale:* user decision 2026-08-12, matching AC-1676's shallowest listed stop ("HLO/Outcome only"). Level is implied — it filters the catalog the HLO is picked from. A bare "Yes" without Level + HLO is still invalid; "No" still expresses "not mapping". **The two optional fields are coupled, not independently optional:** a `quantitative_contribution` supplied *without* an `indicator_id` is rejected with `contribution_without_indicator` (D-C1-8), because a contribution is expressed in the selected indicator's unit and is not interpretable without one.
- **2026-08-12 — Sharpened the 2026-05-23 entry above on `pool_funding_alignment` and `GreenChecks` (closes OQ-C1-6); correction, not a reversal.** The check is emitted into the `GreenChecks` payload as a **visual-only** indicator (`VISUAL_ONLY_GREEN_CHECKS`) and is intentionally excluded from every **completeness** computation, so it never gates submission on the server — skip sites `green-checks/green-checks.service.ts:65` and `result-status-workflow/function-handler.service.ts:325`. The 2026-05-23 wording ("intentionally absent from `GreenChecks`") was imprecise, not wrong: the key IS present in the payload, and migration `1782950000000` does **not** contradict the entry. *Pre-existing gap this spec did not introduce:* the exclusion is **server-side only** — STAR's Submit gate reads the raw payload without filtering visual-only keys (`shared/services/cache/cache.service.ts:43` `allGreenChecksAreTrue`; `shared/services/submission.service.ts:35-38` `meetsStatusChangeValidationRequirements`), so a `false` on this key **does** disable the client's Submit control today. Recorded, not fixed, by `docs/specs/archive/2026-08-13-bilateral--toc-optional-mapping` — see that spec's `execution.md` → Pivot Record: T-06.
- **2026-08-13 — Primary/Contributing two-role selector (`docs/specs/archive/2026-08-13-bilateral--primary-contributing-sp`, T-14/T-15/T-16). Decision record — NOT a claim of design conformance; see the mockup note below.**
  - **D-C2-7 — the Primary designation is a separate, single-choice control over the already-selected set, not a mode toggle on the existing `app-multiselect`.** *Rationale:* overloading the picker's existing chip/select gesture with a second "promote" gesture would make "select" and "promote" the same interaction, and deselecting the current Primary chip would then silently mean two different things (remove from the alignment vs. release the Primary role) depending on which meaning the user intended. A separate radio-group control keeps one gesture per concept and leaves the existing picker's tested chip / rejected-code-highlight / destructive-deselect-confirm behavior (R-BIL-115, D-6a) completely unchanged.
  - **AC.6's non-colour-only cue.** The two roles render a text label (`Primary` / `Contributing`, always present) plus a star icon (`pi-star-fill`) on the Primary role only — colour is never the sole channel, satisfying PRD C-4 / WCAG 2.1 AA 1.4.1. **Not visually verified**: jsdom cannot measure rendered contrast or layout, so the client spec (`pool-funding-alignment.component.spec.ts`) only proves the label/icon markup is *present* in the DOM — a presence assertion, not a discharge of AC.6. See the mockup note below for why no human visual check has happened either.
  - **D-C2-10 — the read-only orphan summary reuses the existing stale-snapshot presentation pattern verbatim** (same `.pf-stale-snapshot` markup, same tag-badge treatment as `STALE_SNAPSHOT_TAG`), rather than a new visual treatment. *Rationale:* R-BIL-129 exists so a demoted SP's saved ToC alignment does not silently vanish from the screen; the stale-snapshot pattern was already the established "read-only, retained data" idiom in this component (AC-08.4), so reusing it costs one new tag string instead of a new component.
  - **Canonical mockups were never ingested.** Re-verified 2026-08-13: nothing exists under `docs/specs/bilateral/**/mockup/`, while this section's own 2026-05-24 entry makes Figma/the canonical mockups authoritative for this tab. **The visual treatment of the Primary/Contributing selector and the orphan summary is therefore unverified against the canonical reference and must not be described as approved** — it is a reasonable-but-unverified treatment, accepted as a known risk in `docs/specs/archive/2026-08-13-bilateral--primary-contributing-sp/requirements.md` §8 ("Accepted risks"), subject to a follow-up correction once the mockups land (the same lapse pattern the 2026-05-24 entry above records this component already recovered from once).
  - **Two strings adopted without spec authorization** (neither `requirements.md` nor this document names either string before T-14/T-15 shipped them):
    - `ORPHANED_TOC_TAG = "Not the current Primary — read-only"` — adopted as-is; no objection raised.
    - `NO_TOC_ALIGNMENT_MESSAGE` — **CHANGED by T-16, attempt 2, closing the item this entry originally flagged.** Superseded string, quoted here as the original for the record: `"No Theory of Change alignment recorded."` The copy stated the *absence* of a record, but the row it labels is an explicit saved "No" answer — data that *is* stored, and R-BIL-129's entire purpose is that stored data does not vanish from the screen on a role change. The old copy was indistinguishable from a genuinely unanswered row, which argued against the requirement it was supposed to serve. **New string, live in `pool-funding-alignment.component.ts`: `"Not aligned with the Theory of Change."`** The Leader resolved the attempt-1 brief contradiction (test/doc-only scope vs. "apply the copy change") by authorizing this as the one additional production change for T-16 attempt 2.
  - **OPEN BEHAVIOR — the version-lock stranding (unresolved spec contradiction, not a code defect).** Sequence: the alignment is version-locked → the user deselects the SP currently holding Primary → `primaryStillSelected()` clears `primary_sp_code` (R-BIL-127 AC.4, correctly) → `canSave()` is now false on the missing-Primary clause → the Primary radio group is `primaryControlDisabled()` under a version lock (R-BIL-127 AC.5, also correctly) → re-selecting the same SP does not restore its Primary status, because the radio group re-selection path is disabled too. Only a full page reload recovers non-destructively. **R-BIL-127 AC.4 (re-block on deselect) and AC.5 (disable under version-lock) each individually behave exactly as specified; together they mandate this trap** — it is a requirements-level contradiction between two individually-correct ACs, not an implementation bug, and no single AC can be "fixed" in isolation without contradicting the other. Recorded as unresolved pending a requirements decision (a third AC carving out an exception, or accepting the reload-recovery path as intended). **Suggested mitigation in the meantime:** the version-locked banner (`pool-funding-alignment.component.html:268-274`, `VERSION_LOCKED_BANNER`) currently explains only that ToC alignment is frozen; it should also say that Primary-designation changes are frozen for the same reason, so a user who hits the trap at least understands why re-selecting does nothing.
  - **UNMITIGATED gap — a `role: null` row renders an affirmative `Contributing` badge, not a neutral "no role chosen" state (pinned by test, not endorsed).** `primarySpCode` derives from `role === 'PRIMARY'` (`snapshotFromServer`), so on a legacy alignment where every row's `role` is still `null` (R-BIL-126, no Primary ever chosen), no row resolves as Primary and all of them fall to the `@else` branch, which renders `Contributing`. On an **editable** form this is mitigated: `primaryRequiredMessage()` tells the contributor a Primary is required. On a **read-only** legacy alignment (`is_read_only: true`), `primaryRequiredMessage()` is suppressed (gated on `!isReadOnly()`), so a read-only viewer sees a confident `Contributing` on every SP with nothing correcting the misstatement of actual state ("no role chosen yet"). Pinned by `pool-funding-alignment.component.spec.ts` ("5d" — carried-forward T-14 ADVISORY 3); not fixed, because a genuine fix needs a third, distinguishable render state rather than a copy change. Flagged as the likeliest support-ticket source in this change (T-16 attempt 3, Reviewer finding 4).
  - **A dark-mode risk that is now load-bearing.** `pool-funding-alignment.component.html:5` carries a pre-existing hardcoded `bg-[#fcfcfc]` with no dark-theme variant (a pre-existing gap this spec did not introduce — the whole section has inherited it since 2026-05-23). In dark theme the section surface stays near-white while token foregrounds flip to their dark-mode values: `--ac-pool-funding-fg` (dark) `#a5d6a7` on `#fcfcfc` ≈ **1.6:1**; `--ac-grey-700` (dark) ≈ **2.2:1** — both far under the PRD line 273 **4.5:1** floor. This was already true of every badge in the section before this spec; it becomes newly consequential here because **both** the Primary/Contributing role badges (AC.6) and the new `ORPHANED_TOC_TAG` tag now depend on those tokens reading clearly against that background to carry their non-colour-only distinction. Not a regression introduced by this spec — recorded because two new UI elements now inherit a known gap that previously affected fewer surfaces.

- **2026-07-28 — External (TIP / PRMS / AICCRA) results open the full STAR section shell, read-only, instead of a summary modal.** Spec: `docs/specs/archive/2026-07-28-results-center--external-results-readonly-view`. The `resultInformation` modal (≈9 fields) is no longer opened for external results from Results Center, `search-a-result`, or Home's "My Latest Results"; all three route to `/result/:code`, where the same 12 section tabs render with every control non-editable. Three affordances move into the form header, shown only for external results: **last-synced date** (from `Result.updated_at`, exposed on `GET /results/:id/metadata`), **"Open public link"**, and the platform-specific deep link (TIP → "Open link to result", AICCRA → "Open result in MARLO", PRMS → "Open result in PRMS"). Status-changing sidebar actions (Submit/Unsubmit, Review, Approve, OICR status dropdown) and the Delete Result action are hidden. No new tokens: the header reuses `.fs-*` / `.atc-*` utilities. *Rationale:* the Jira AC required the full metadata in the same STAR forms; the modal could not carry it. *Trade-off / scope note:* read-only is enforced at the client **and** at three server endpoints (bilateral alignment PATCH, result-status change, author/contact DELETE) — the client gate alone was judged insufficient for a federated record. The `ResultInformationModalComponent` itself is retained (other flows still use it), only its external-result triggers were removed.

- **2026-08-13 — The Results Center URL query vocabulary is a durable, cross-package contract.** Spec: `docs/specs/results-center/url-filters`. `/results-center` filter state is expressed in **exactly seven human-readable query parameters** — `indicator`, `indicators`, `contract`, `status`, `year`, `source`, `tab` — read on load and written back on every filter change (`replaceUrl`, so history depth is unchanged). Binding rules, all contractual rather than incidental:
  - **`indicator` and `indicators` are two different filters, not a singular/plural spelling of one** (D-URL-18). The page exposes the indicator dimension through two controls on two wire keys: the **tab strip** (`indicator-codes-tabs`, exactly one id) is `indicator`; the **sidebar multiselect** (`indicator-codes-filter`, many ids) is `indicators`. They are mutually exclusive in the UI — the multiselect is `@if`-gated on the tab being empty — and on collision `indicator` wins, because the tab is what the user would actually be looking at. **This distinction was missed in the original delivery and shipped a real defect:** the sidebar's indicator selection filtered the table and rendered a chip but never reached the address bar, so it was lost on reload and on share. Collapsing the two parameters back into one re-opens it.
  - **`indicator` slugs are byte-identical to the server's `QueryIndicatorsEnum`** (`capacity-sharing-for-development`, `innovation-dev`, `knowledge-product`, `policy-change`, `oicr`, `innovation-use`). This is the **one literal shared across both packages**, and **no automated gate crosses that boundary** (defect class D6): the client's `INDICATOR_SLUG_TO_ID` (`results-center-url.vocabulary.ts`) and the server's enum (`indicators/enum/indicators.enum.ts:26`, consumed by `capdev-bulk-notification.service.ts` → `buildStarLink`) are each pinned against the literal string in their own suite, so a change on either side turns one of them red instead of failing silently in delivered email. **Changing a slug is a breaking change to both packages *and* to every link already sitting in an inbox.** `cap_sharing` (`star-pdf-report.util.ts`) is a PDF-report key and must never leak into the URL.
  - **`status` uses a frozen slug vocabulary** authored from the control list the sidebar actually offers — deliberately *not* from `ResultStatusNameEnum`, which diverges from the data (22 ids vs 25 rows, eight differing names). Ids with no slug degrade via the invalid-token path and emit a runtime completeness warning.
  - **Case policy is per token class, not global:** parameter names are lower-case-folded before lookup (symmetrically, so the camelCase legacy names still resolve); vocabulary tokens are lower-case canonical and case-insensitive on read; **`contract` is normalized upper-case** on read and write; `year` is numeric. A single "lower-case everything" rule would corrupt the natural keys.
  - **`indicator` is single-value** — it drives a tab strip that holds exactly one id, so a comma-separated value is unrepresentable and is rejected, never truncated. `contract`, `status`, `year`, `source` are comma-separated multi-value, bounded at 50 values per parameter and 64 chars per token; an over-bound list is dropped whole. Invalid tokens are dropped individually, the valid remainder still applies, and one toast per navigation reports the drop.
  - **Legacy `indicatorTab` / `statusTab` / `statusLabel` are read forever, never written.** Every CapDev email already delivered carries `?indicatorTab=1` in an inbox no one controls, so this support carries **no deprecation date**; on collision the canonical parameter wins deterministically.
  - **The URL never carries `sec_user_id`** — my/all scope is expressed as `tab` alone (`all` → key absent), asserted on the written URL string for both scopes.
  - **The write path belongs to the component, not the root-provided service.** `ResultsCenterService` is a singleton shared by five surfaces across four routes (project-detail, the linked-results modal, project-dashboard, links-to-result); a service-level write effect would navigate from all of them. This is a structural guard, not a test — though four shared-consumer suites pin it.
  - *Rationale:* links in CapDev notification email must be readable, trustworthy and hand-editable before clicking, and must survive forwarding. *Trade-off:* the cross-package literal is verified by twin unit assertions plus a **manual** paste-the-server-link-into-a-running-client check — the acknowledged blind spot, recorded here rather than left implicit.
- **2026-07-28 — External (TIP / PRMS / AICCRA) results open the full STAR section shell, read-only, instead of a summary modal.** Spec: `docs/specs/archive/2026-07-28-results-center--external-results-readonly-view`. The `resultInformation` modal (≈9 fields) is no longer opened for external results from Results Center, `search-a-result`, or Home's "My Latest Results"; all three route to `/result/:code`, where the same 12 section tabs render with every control non-editable. Three affordances move into the form header, shown only for external results: **last-synced date** (from `Result.updated_at`, exposed on `GET /results/:id/metadata`), **"Open public link"**, and the platform-specific deep link (TIP → "Open link to result", AICCRA → "Open result in MARLO", PRMS → "Open result in PRMS"). Status-changing sidebar actions (Submit/Unsubmit, Review, Approve, OICR status dropdown) and the Delete Result action are hidden. No new tokens: the header reuses `.fs-*` / `.atc-*` utilities. *Rationale:* the Jira AC required the full metadata in the same STAR forms; the modal could not carry it. *Trade-off / scope note:* read-only is enforced at the client **and** at three server endpoints (bilateral alignment PATCH, result-status change, author/contact DELETE) — the client gate alone was judged insufficient for a federated record. The `ResultInformationModalComponent` itself is retained (other flows still use it), only its external-result triggers were removed.

- **2026-08-21 — Innovation Use (indicator 6) details page ships.** New lazy route `innovation-use-details`; two sidebar rows (`Innovation use details`, `IP rights`) render for indicator 6. Spec: `docs/specs/innovation-use/details-page`. Three of its decisions are user-visible and recorded here (component patterns are in §8.1):
  - **Page shape follows `capacity-sharing`'s titled cards, not `innovation-details`'s four-panel accordion** (spec `DD-1`). *Rationale:* the section is one detail group plus three repeatable blocks, not four distinct sub-forms — an accordion would hide three of the four cards behind a click for no structural reason.
  - **Empty-state affordance: exactly one blank Actor card; Organizations and Other quantitative measures are deliberately left empty** (spec `DD-10`). *Rationale:* actors are required, so a blank starter card helps completion; organizations and quantifications are optional, and a blank organization card is exactly the identity-less row whose `400` a prior chunk of this feature added server-side validation to stop.
  - **`Add other actor` / `Add other organization` do not auto-save** (spec `DD-8`). *Rationale (corrected from the spec's own stated reason):* the reference page's `addActor()` calls `ActionsService.saveCurrentSection()`. That call is inert today — `saveCurrentSectionValue` is a signal with **zero production consumers** anywhere in the client, so it PATCHes nothing right now, and the spec's original "guaranteed `400`" framing does not hold as written. The decision is sound regardless: the day any component wires that signal to actually trigger a save, the hazard (PATCHing a row with no `actor_type_id`) goes live retroactively in **every** page that calls `saveCurrentSection()` — and this page is the only one already built immune to it.

---

## 13. Open Gaps / Open Questions

### 13.1 [STAR] Client
- **OG-1.** No formal **design-system audit** against PRMS / STAR siblings; token names diverge across CGIAR products.
- **OG-2.** **Dark-mode parity** incomplete on some legacy PrimeNG overrides; not all `custom-prime-force-styles.scss` rules account for both modes.
- **OG-3.** **Mobile portrait** layouts undefined ([`docs/prd.md`](../prd.md) OQ-6).
- **OG-4.** No published **icon system** spec — primeicons used with no mandatory-vs-decorative rules.
- **OG-5.** The **landing page** is the only public surface and has no dedicated visual-identity guidelines.
- **OG-6.** **Empty / error / loading** state patterns not unified across tables and dashboards.
- **OG-7.** **Localization / i18n** not yet constitutional; `@angular/build:extract-i18n` exists but no flow uses it.

### 13.2 [Server] Platform
- **OG-8.** Admin panel has no shipped design system — §7.2 tokens are a baseline; confirm the migration onto STAR's `--ac-*` palette (D-9).
- **OG-9.** `/admin` excluded from JWT — needs an explicit admin guard before any production exposure beyond localhost.
- **OG-10.** Real-time **Socket.IO event taxonomy** not fully documented (names, payloads, guarantees) — capture in a `docs/specs/opensearch|socket/` module spec. (Known events: `result-updated`, `result.pool-funding-alignment.changed`.)
- **OG-11.** **Error catalog** implicit (driven by `exception.name` / `message`) — define a stable error-code list for partners.
- **OG-12.** Partner-facing **API quotas / rate limits** — `express-rate-limit` installed but global config undocumented here.
- **OG-13.** **Pagination defaults / max page size** are per-controller — standardize at the framework layer.
- **OG-14.** **Admin dark mode** scope (admin only? user-controlled? aligned to STAR's `data-theme`?) — see §11.
