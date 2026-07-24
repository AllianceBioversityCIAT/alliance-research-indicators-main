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
2. Click row → `result/:id` (own platform) or external deep link (other platform).
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
| White | `--ac-white-1`, `--ac-white-2` | Surfaces |
| Background | `--ac-background` | Page background (flips in dark mode) |
| Pool Funding | `--ac-pool-funding-fg`, `--ac-pool-funding-border` | Bilateral "Pool Funding" tag |

Dark mode overrides the same token names under `:root[data-theme="dark"]`. The PrimeNG Aura preset (`roartheme.ts`) flips via the `.dark-mode` body class.

**Utility classes (do not invent parallels):**
- `.abc-<color>` — background color (e.g., `.abc-primary-blue-500`)
- `.atc-<color>` — text color (e.g., `.atc-light-blue-300`)
- `.fs-[n]` / `.md:fs-[n]` — font size (n = 1–30 px)
- `.rs-size-[n]`, `.rs-w-[n]`, `.rs-h-[n]` — width/height (0–500 px)
- `.rs-gap-*`, `.rs-m-*`, `.rs-p-*` families — gaps / margins / padding
- `.rs-hide`, `.md-rs-hide`

`.md:` variants apply to the landscape ≤ 768 px height breakpoint and use `!important` to override base rules.

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
- **Forms & input:** `dropdowns`, `dropdown`, `custom-fields`, `search-export-controls`, `shared-result-form`
- **Modals & overlays:** `all-modals` (host), `modal` (wrapper) — all dialogs route through these; never instantiate ad-hoc overlays.
- **System feedback:** `global-alert`, `global-toast`, `alert-tag`
- **OICR-specific:** `download-oicr-template`, `oicr-header`, `oicr-workflow-status`
- **Utilities:** `copy-token`, `filters-action-buttons`

> **Rule:** a new screen that introduces a "card" / "table" / "modal" pattern not covered above must either (a) extend the shared component or (b) document the new component in §12 and add it to this inventory in the same change.

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
| **[STAR] Client** | **Shipped (light + dark).** | `DarkModeService` (signal-based, persisted in cache/localStorage) adds `.dark-mode` to `<body>`; PrimeNG Aura preset (`roartheme.ts`) detects via `darkModeSelector`; `:root[data-theme="dark"]` swaps CSS variables. Components must use token utilities (`.abc-*` / `.atc-*`) or CSS variables — **never** hard-coded hex — so dark mode "just works." |
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
