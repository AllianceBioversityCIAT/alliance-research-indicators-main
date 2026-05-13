# System Design — Alliance Research Indicators (ARI) Backend

> Scope: the **server** package and its consumer-facing surface (REST API, Swagger UI, Socket.IO channel, Admin SSR panel under `/admin`). The standalone STAR client app under `client/` is out of scope here and has its own system-design doc.
>
> This document is the **system / UX-of-the-platform** blueprint. It covers how humans and machines experience the platform's surface: navigation, layout patterns, API consumer flows, the embedded Admin panel, response/error shape, and the few visual tokens that live inside this repo.

---

## 1. Product Experience Principles

The ARI platform is mostly an API + integration product; its "UX" is therefore split between:

- **Developer experience (DX)** for STAR, PRMS/TIP/AICCRA, and the AI pipeline.
- **Admin experience (Admin UX)** for the embedded `/admin` SSR panel used by Sys Admin / Technical Support.

Shared principles:

1. **Consistency over cleverness.** Every endpoint returns the same `ServerResponseDto` envelope. Every entity carries the same `AuditableEntity` audit fields. Every list endpoint uses the same paging/sort/filter conventions.
2. **Governed by default.** Mutations require auth + role + (for results) status workflow checks. Anonymous endpoints are an explicit allowlist, not the default.
3. **One source of truth per concern.** CLARISA owns master data; AGRESSO owns contracts/staff; ROAR owns identity; ARI owns Results.
4. **Discoverable.** Every controller is documented in Swagger with examples and enums. Every list endpoint declares its query params.
5. **Observable.** Every request is intercepted, logged, and tagged with the user id; errors flow through one global filter with a uniform envelope.
6. **AI-augmented, human-governed.** AI formalization endpoints accelerate result entry, but everything still lands in the same workflow with the same status transitions.

---

## 2. Information Architecture

The platform's surface is grouped by **bounded context**:

```
ARI
├── Identity & access
│   ├── ROAR JWT (humans)
│   ├── client_id/client_secret (machines, via app_secrets + host allowlist)
│   └── Roles (SecRolesEnum: SYSTEM_ADMIN, CONTRIBUTOR, TECHNICAL_SUPPORT,
│                              CENTER_ADMIN, MEL_REGIONAL_EXPERT, ...)
│
├── Master data (read-mostly, sync-driven)
│   ├── CLARISA (countries, regions, levers, indicators, institutions, ...)
│   ├── AGRESSO (contracts, staff, contract countries)
│   └── Configuration (app_config, app_secrets, app_secret_host_list,
│                      announcement-settings, setting-keys, user-settings)
│
├── Results domain (owned by ARI)
│   ├── Results (versioned, snapshotted, workflow-governed)
│   ├── Result attachments: contracts, levers, indicators, institutions, users,
│       countries, regions, languages, keywords, evidences, tags,
│       SDGs, impact areas, initiatives, knowledge products
│   ├── Result types: capacity-sharing, innovation-dev, policy-change, OICR,
│       IP rights, notable references, quantifications, actors
│   ├── Status workflow: result-status, result-status-transitions,
│       result-status-workflow, green-checks
│   └── Reports: reports, report-year, general report
│
├── Integrations
│   ├── OpenSearch (Results, PRMS, Alliance Staff)
│   ├── TIP integration
│   ├── DynamoDB feedback
│   ├── RabbitMQ broker (microservice)
│   └── Socket.IO gateway
│
├── Operations
│   ├── Cron jobs (AGRESSO, CLARISA, TIP, sync-process-log)
│   ├── Reporting feedback + issue categories
│   ├── Sync process log
│   └── Admin SSR panel (/admin)
│
└── Public surface
    ├── REST API at /api/v{n}/...
    ├── Swagger UI at /swagger
    └── Static admin assets at /admin/public
```

---

## 3. Primary User Flows

### 3.1 Contributor reports a result (via STAR → ARI)
```
STAR UI → POST /api/v1/results              (create draft)
       → PATCH /api/v1/results/:code/general-information
       → PATCH /api/v1/results/:code/alignments
       → PATCH /api/v1/results/:code/geo-location
       → POST  /api/v1/results/:code/evidences  (... and other sub-resources)
       → POST  /api/v1/results/:code/status/transitions  (submit)
ResponseInterceptor wraps every response in ServerResponseDto.
Socket.IO emits result-updated events; STAR refreshes views in real-time.
```

### 3.2 AI-assisted result formalization
```
AI pipeline → POST /api/v1/results/ai/formalize          (single)
            → POST /api/v1/results/ai/formalize/bulk     (admin/MEL only)
ARI validates payload (whitelist + transform + forbidNonWhitelisted),
links to indicator/contract/lever via CLARISA + AGRESSO references,
returns a result_official_code or per-row error envelope.
```

### 3.3 MEL review queue
```
STAR UI → GET /api/v2/results?status-codes=...&years=...&platform-code=...
       → GET /api/v1/results/:code/general-information
       → GET /api/v1/results/:code/alignments
       → PATCH ... (controlled-editing within MEL scope)
       → POST /api/v1/reporting-feedback   (request changes)
       → POST /api/v1/results/:code/status/transitions (advance status)
```

### 3.4 Partner platform (PRMS/TIP/AICCRA) consumes data
```
Partner → POST /token (out of band) → base64({client_id, client_secret})
       → GET /api/v1/opensearch/results?...
       → GET /api/v1/results?platform-code=PRMS&...
ARI validates the token + origin/IP against app_secret_host_list before
serving any payload.
```

### 3.5 Admin operations
```
Admin → GET /admin             (SSR React 19 dashboard)
     → GET /admin/dashboard     (stats)
     → GET /admin/users         (user management)
     → GET /admin/settings      (configuration)
     → POST /api/v1/configuration/application/secrets (CRUD app secrets)
     → GET  /api/v1/tools/clarisa/...           (force sync)
```

### 3.6 Sync cycle (cron-driven)
```
@Cron(AGRESSO)   → pull contracts/staff from AGRESSO MSSQL/SOAP → upsert
                   sync_process_log row
@Cron(CLARISA)   → pull master data → upsert + reindex OpenSearch
@Cron(TIP)       → pull TIP integration data
@Cron(SyncLog)   → housekeeping / retention on sync_process_log
```

---

## 4. Screen Inventory

The server itself ships only a small set of screens (the embedded Admin SSR panel + Swagger UI). The contributor and MEL screens live in STAR and are out of scope here.

| Surface | URL | Audience | Owner |
| --- | --- | --- | --- |
| Swagger UI | `/swagger` | STAR devs, partner devs, internal | ARI server |
| Admin Dashboard | `/admin`, `/admin/dashboard` | Sys Admin, Tech Support | ARI server (SSR) |
| Admin Users | `/admin/users` | Sys Admin | ARI server (SSR) |
| Admin Settings | `/admin/settings` | Sys Admin | ARI server (SSR) |
| Static admin assets | `/admin/public/*` | (browser fetch) | Vite build output |
| Contributor UI | (STAR app) | Result Contributor, MEL | STAR (`client/`) |
| Partner dashboards | (external) | PRMS / TIP / AICCRA | external platforms |

---

## 5. Navigation Model

### 5.1 API navigation (URL grammar)
- Global prefix: `/api`
- Versioning: URI-based, `/api/v1/...`, `/api/v2/...` (see `VersioningType.URI` in `main.ts`).
- Bounded-context segments mirror the modules in `domain/routes/main.routes.ts`:
  - `/api/v1/results/...` and its children (`status`, `evidences`, `alignments`, `geo-location`, `actors`, `institutions`, etc.)
  - `/api/v1/agresso/...`, `/api/v1/clarisa/...` (via `/api/v1/tools/...`)
  - `/api/v1/opensearch/...`
  - `/api/v1/configuration/...`
  - `/api/v1/user/configuration/...`
  - `/api/v1/reports/...`, `/api/v1/reporting-feedback/...`
- Per-result sub-resources are nested under `/results/:result-code/{sub-resource}` (e.g. `/results/:code/evidences`).
- Boolean and list query params are normalized by `QueryParseBool` and `ListParseToArrayPipe`.

### 5.2 Admin SSR navigation
- Top-level routes: `/admin`, `/admin/dashboard`, `/admin/users`, `/admin/settings`.
- Side nav lives in `src/admin/client/components/Sidebar.tsx` (see `README-REACT.md` for the add-a-page recipe).
- Admin assets are version-stamped via Vite manifest; static files served from `dist/admin/public`.

---

## 6. Layout Patterns

### 6.1 API response envelope
Every HTTP response follows `ServerResponseDto`:
```json
{
  "data": <payload | []>,
  "status": <HttpStatus>,
  "description": "<human-readable summary>",
  "errors": <string | string[] | null>,
  "timestamp": "<ISO 8601>",
  "path": "<request.url>"
}
```
- Success: `data` populated, `errors: null`.
- Error: `data: []`, `errors` populated, `status` ≥ 400, same shape (via `GlobalExceptions`).
- Streaming downloads (`StreamableFile`) bypass the envelope.

### 6.2 List endpoints
- Paging: `page`, `limit` query params.
- Sorting: `sort-order` (`ASC|DESC`) + `sort-field` (enum, e.g. `ResultSortEnum`).
- Filtering: kebab-case names, parsed by `ListParseToArrayPipe` for arrays and `QueryParseBool` for booleans.
- Search: `search` query param where supported (e.g. `GET /api/v2/results`).

### 6.3 Admin panel layout
- React 19 + Vite SSR.
- `src/admin/client/components/Layout.tsx` is the shell (Sidebar + Header + content).
- `StatsCard`, `Table`, `Form` patterns documented in `src/admin/README-REACT.md`.
- Data flow: SSR initial data → hydrated React → optional client-side fetch for refresh.

---

## 7. Design Tokens

The server is API-first, but the embedded Admin panel and any inline HTML responses MUST follow a small, shared token set so admin and STAR stay visually coherent.

### 7.1 Color tokens (proposed baseline — refine in admin styles)
| Token | Hex | Usage |
| --- | --- | --- |
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

> If the STAR app already defines an authoritative palette, this admin baseline MUST be replaced with STAR's tokens; the design-decisions log (§12) should record the migration.

### 7.2 Typography
- System font stack: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`.
- Monospace for code/IDs: `ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`.
- Scale: 12 / 14 / 16 / 20 / 24 / 32 px.

### 7.3 Spacing & radius
- Spacing scale: 4 / 8 / 12 / 16 / 24 / 32 / 48 px.
- Border radius: 4 px (inputs), 8 px (cards), 999px (pills/badges).

### 7.4 Status tokens (cross-cutting)
| Token | Meaning |
| --- | --- |
| `result-status.draft` | DRAFT |
| `result-status.submitted` | SUBMITTED |
| `result-status.approved` | APPROVED |
| `result-status.rejected` | REJECTED |
| `result-status.archived` | ARCHIVED |

> Exact values come from `result_status` table; tokens above are display-only. STAR + Admin should pull human labels from `/api/v1/results/status` rather than hardcode them.

---

## 8. Component Inventory

### 8.1 Backend "components" (HTTP/socket primitives)
- **Controllers** per module (e.g. `ResultsController`) with `@ApiTags`, `@ApiOperation`, `@ApiQuery`, `@ApiBody`, `@ApiBearerAuth`.
- **Services** holding business logic + TypeORM query composition.
- **Repositories** in `entities/<module>/repositories` for non-trivial query encapsulation.
- **DTOs** under `entities/<module>/dto` (create / update / response).
- **Interceptors**: `LoggingInterceptor`, `ResponseInterceptor`, `SetUpInterceptor` (per-request context).
- **Filters**: `GlobalExceptions` (catch-all).
- **Guards**: `RolesGuard`, `ResultStatusGuard`.
- **Pipes**: `QueryParseBool`, `ListParseToArrayPipe`.
- **Decorators**: `@Roles`, `@GetResultVersion`, `@OpenSearchProperty`.
- **Middleware**: `JwtMiddleware` (excludes `/admin`, `/admin/public`, `/.well-known`, `/`, `/favicon.ico`, `GET /api/configuration/:key`).
- **Gateways**: `ServerGateway`, `ClientGateway` (Socket.IO).
- **Apps**: `AlianceManagementApp`, `AiRoarMiningApp`, `SelfApp` (RabbitMQ message hubs in `tools/broker`).

### 8.2 Admin UI components (inside `src/admin/client/components`)
- `Layout`, `Sidebar`, `Header`, `StatsCard`.
- Pages: `Dashboard`, `Users`, `Settings` under `src/admin/client/pages`.
- New pages MUST follow the four-step recipe in `src/admin/README-REACT.md` (component → route → controller → sidebar entry).

---

## 9. Responsive Behavior

- **API**: not applicable (consumer-driven).
- **Swagger UI**: provided by `@nestjs/swagger`; responsive by default.
- **Admin panel**: minimum supported viewport 1280 × 800 (operator workstation). Below that, the side nav collapses; tables become horizontally scrollable; cards stack.

---

## 10. Accessibility Expectations

The server is API-first, so most a11y obligations sit on STAR and the Admin panel.

### Admin panel (in-scope here)
- WCAG 2.1 AA target.
- Keyboard reachable side nav and tables; visible focus rings; `aria-current="page"` on active route.
- Color contrast ≥ 4.5:1 for body text against `--ari-surface` and `--ari-surface-alt`.
- Status badges MUST pair color with a text label (never color-only signal).
- Form fields MUST have associated `<label>`; error messages are linked via `aria-describedby`.

### API
- Error envelopes carry a human-readable `description` plus a machine-readable `errors`; clients can localize either.

---

## 11. Dark Mode Behavior

- Admin panel: dark mode is **proposed**, not shipped. When introduced, it MUST use the same token names with dark values applied via `prefers-color-scheme` + a manual override stored in `user-settings`.
- API responses are theme-agnostic.

> Open question (see §13): is dark mode a real requirement for the admin panel, or only a STAR concern?

---

## 12. Design Decisions

> Append-only log. New decisions go to the bottom.

| # | Date | Decision | Rationale |
| --- | --- | --- | --- |
| D-1 | (legacy) | Uniform `ServerResponseDto` envelope on every HTTP response, including errors. | Predictable client-side handling; uniform logging via `ResponseInterceptor`. |
| D-2 | (legacy) | URI versioning (`/api/v1`, `/api/v2`) under a single `/api` global prefix. | Lets clients pin to a version; avoids header negotiation; matches existing controllers. |
| D-3 | (legacy) | TypeORM + MySQL (utf8mb4) as the system of record; explicit migration scripts under `src/db/migrations`. | Strict schema control; rich relations on `Result`. |
| D-4 | (legacy) | Two auth shapes: ROAR JWT for humans, `client_id/client_secret` (base64) for machines, validated against `app_secrets` + `app_secret_host_list`. | Allow first-party partner integrations without minting ROAR identities. |
| D-5 | (legacy) | OpenSearch shape is derived from TypeORM entities via the `@OpenSearchProperty` decorator. | One source of truth for entity ↔ search mapping; lower drift risk. |
| D-6 | (legacy) | Microservice transport on RabbitMQ (`amqps://`), single queue `ARI_QUEUE`. | Reliable cross-system events without coupling to HTTP retries. |
| D-7 | (legacy) | Embedded Admin SSR (Vite + React 19) inside the Nest app under `/admin`. | One deployable artifact for admin tooling; shared auth context option. |
| D-8 | (current) | `/admin` is excluded from `JwtMiddleware`. | Allows SSR bootstrap, but creates an open issue — see §13 OG-3. |

---

## 13. Open Gaps / Open Questions

- **OG-1.** Admin panel has no shipped design system. The tokens in §7 are a baseline only — confirm whether to inherit STAR's tokens or to define a separate admin theme.
- **OG-2.** Dark mode scope (admin only? not at all? user-controlled?).
- **OG-3.** `/admin` excluded from JWT — needs an explicit admin guard before any production exposure beyond localhost.
- **OG-4.** Real-time Socket.IO event taxonomy is not documented (event names, payload shapes, guarantees). Capture in a `docs/specs/socket/` module spec.
- **OG-5.** Error catalog is implicit (driven by `exception.name`/`message`). Define a stable error code list so partners can reason about failures programmatically.
- **OG-6.** Partner-facing API quotas / rate limits: `express-rate-limit` is installed but global config is not documented here.
- **OG-7.** Pagination defaults and max page size are per-controller; standardize at the framework layer.
