# CLAUDE.md — `research-indicators/src/` (Angular SPA source)

Child guide for the actual Angular 19 + PrimeNG 19 application code. Read this **after** the root [`../../CLAUDE.md`](../../CLAUDE.md) — that file holds the constitutional baseline (PRD, system design, detailed design, SDD templates). This file is the **day-to-day coding contract** for working inside `src/`.

> If the rules here ever conflict with the constitutional docs, the constitutional docs win and this file must be updated in the same change.

---

## Where to read first

| Need | Read |
|------|------|
| Why the product exists, personas, KPIs, scope | [`../../docs/prd.md`](../../docs/prd.md) |
| UX rules, screen inventory, tokens, components | [`../../docs/system-design/design.md`](../../docs/system-design/design.md) |
| Modules, data model, API, state, security, errors | [`../../docs/detailed-design/detailed-design.md`](../../docs/detailed-design/detailed-design.md) |
| Spec templates for new features | [`../../docs/specs/general-setup/`](../../docs/specs/general-setup/) |
| Color tokens + responsive utilities reference | [`../README.md`](../README.md) |

---

## Folder layout

```
src/
├── index.html                # SPA shell
├── main.ts                   # Angular bootstrap
├── setup-jest.ts             # Jest test bootstrap
├── environments/             # environment.ts / environment.dev.ts (URLs, flags, keys)
├── styles/                   # global SCSS: colors.scss, font.scss,
│                             # custom-fields.scss, custom-prime-force-styles.scss,
│                             # responsive-size.scss, styles.scss
└── app/
    ├── app.component.{ts,html,spec.ts}
    ├── app.config.ts         # providers, router, HTTP, interceptors, socket
    ├── app.routes.ts         # lazy standalone routes + guards/resolvers
    ├── pages/                # feature pages (one folder per route group)
    │   ├── landing/
    │   ├── login/
    │   ├── auth/
    │   ├── room/
    │   ├── oicr-download/
    │   ├── dynamic-fields/
    │   ├── cache-test/
    │   └── platform/         # authenticated shell + child pages
    │       └── pages/
    │           ├── home/
    │           ├── about/
    │           ├── about-indicators/
    │           ├── indicator/
    │           ├── results-center/
    │           ├── search-a-result/
    │           ├── load-result/
    │           ├── result/
    │           │   └── pages/      # 11 metadata tabs
    │           ├── my-projects/
    │           ├── project-detail/
    │           ├── dashboard/
    │           ├── notifications/
    │           ├── profile/
    │           └── administration/center-admin/
    │               ├── capacity-bulk-upload/
    │               └── sdg-management/
    ├── shared/               # cross-cutting code
    │   ├── components/       # shared UI components
    │   ├── services/         # API, cache, role, websocket, theme, analytics
    │   ├── interceptors/     # JWT, http-error, result
    │   ├── guards/           # rolesGuard, centerAdminGuard
    │   ├── interfaces/       # TypeScript shapes (result, api, cache, etc.)
    │   ├── pipes/            # format-date, s3-image-url, filter-by-text-with-attr
    │   ├── utils/            # date/geo/map helpers
    │   ├── sockets/          # websocket.service
    │   ├── types/            # shared ts type helpers
    │   └── enums/            # enum constants
    ├── theme/                # PrimeNG Aura preset (roartheme.ts)
    └── testing/              # shared test mocks / harness
```

---

## Path aliases (use these, not relative `../../..` paths)

Declared in [`../tsconfig.json`](../tsconfig.json) and mirrored in [`../jest.config.ts`](../jest.config.ts). Keep them in sync if you add new ones.

| Alias | Resolves to |
|-------|-------------|
| `@public/*` | `public/*` |
| `@envs/*` | `src/environments/*` |
| `@pages/*` | `src/app/pages/*` |
| `@platform/*` | `src/app/pages/platform/*` |
| `@auth/*` | `src/app/pages/auth/*` |
| `@landing/*` | `src/app/pages/landing/*` |
| `@shared/*` | `src/app/shared/*` |
| `@components/*` | `src/app/shared/components/*` |
| `@services/*` | `src/app/shared/services/*` |
| `@interfaces/*` | `src/app/shared/interfaces/*` |
| `@interceptors/*` | `src/app/shared/interceptors/*` |
| `@guards/*` | `src/app/shared/guards/*` |
| `@sockets/*` | `src/app/shared/sockets/*` |
| `@utils/*` | `src/app/shared/utils/*` |
| `@ts-types/*` | `src/app/shared/types/*` |

---

## Adding code — where it goes

| You're adding… | Put it in… |
|----------------|------------|
| A new authenticated screen | `app/pages/platform/pages/<feature>/` + lazy entry in `app.routes.ts` |
| A new result-detail tab | `app/pages/platform/pages/result/pages/<tab>/` + child route in `app.routes.ts` |
| A new public screen | `app/pages/<feature>/` + top-level route (no `rolesGuard`) |
| A reusable UI element | `app/shared/components/<name>/` — register it in [`../../docs/system-design/design.md`](../../docs/system-design/design.md) §8 |
| A reusable service / API method | `app/shared/services/<name>.service.ts` — for REST, extend `ApiService` |
| A reusable interface | `app/shared/interfaces/<name>.interface.ts` |
| A reusable pipe | `app/shared/pipes/<name>.pipe.ts` |
| A reusable util | `app/shared/utils/<name>.util.ts` |
| A new HTTP interceptor | `app/shared/interceptors/` + register order in `app.config.ts` (JWT → error → result) |
| A new guard | `app/shared/guards/` + reference in `app.routes.ts` `canMatch` |
| A new WebSocket event | extend `app/shared/sockets/websocket.service.ts` |
| A new control-list cache | `app/shared/services/cache/` |
| A test fixture / mock | `app/testing/` (never reinvent fixtures per test) |
| A new color / spacing token | `src/styles/colors.scss` or `src/styles/responsive-size.scss` — then update [`../README.md`](../README.md) and [`../../docs/system-design/design.md`](../../docs/system-design/design.md) §7 |

---

## Conventions inside `src/`

- **Standalone components only** (PRD C-6). No NgModules. Lazy load via `loadComponent` in `app.routes.ts`.
- **Selector prefix**: `app` (per `angular.json`). E.g., `app-results-table`.
- **Style**: SCSS (`inlineStyleLanguage: scss` + component `styleUrls`).
- **State**: signals (`signal`, `computed`, `WritableSignal<T>`) for cross-cutting client state; RxJS for streams/HTTP/socket. No NgRx.
- **HTTP**: never call `HttpClient` from a component. Go through `ApiService` (or a domain service that delegates). Always handle `MainResponse<T>` (see [`../../docs/detailed-design/detailed-design.md`](../../docs/detailed-design/detailed-design.md) §4).
- **Auth**: never bypass `jWtInterceptor`. Tokens stay in `localStorage` + cache signals; never logged or sent to analytics SDKs.
- **Conflicts (409)**: surface the link-to-existing flow — do not retry blindly.
- **Modals**: route through `all-modals` host + `modal` wrapper; no ad-hoc overlays.
- **Forms**: reactive forms; wrapped PrimeNG inputs from `styles/custom-fields.scss` & `styles/custom-prime-force-styles.scss` — not raw PrimeNG controls.
- **Colors & spacing**: token utility classes (`.abc-*`, `.atc-*`, `.rs-*`, `.fs-*`) or CSS variables (`var(--ac-*)`). **No hex literals in component code.**
- **Dark mode**: rely on tokens — never branch on `isDarkMode()` for color decisions.
- **i18n**: not yet wired. Don't add a parallel i18n mechanism — file an open question instead.
- **Strict TS**: `strict`, `noImplicitOverride`, `noPropertyAccessFromIndexSignature`, `noImplicitReturns`, `noFallthroughCasesInSwitch`, `strictTemplates`. Don't loosen these in `tsconfig.json`.

---

## Tests inside `src/`

- Co-locate `*.spec.ts` next to the subject file. Run with `npm run test` (watch: `test:watch`, coverage: `test:coverage`).
- Bootstrap: `setup-jest.ts`. Config: [`../jest.config.ts`](../jest.config.ts). Environment: `jsdom`.
- Use shared mocks in `app/testing/`. Don't re-mock the same service per file.
- Service tests: assert on the `MainResponse<T>` envelope with `HttpTestingController`.
- Component tests: cover role-conditional rendering, signal-driven state transitions, form validity, error surfaces.
- Coverage floors (project-wide, enforced by `jest.config.ts`): statements 40%, branches 20%, lines 45%, functions 30%. Don't regress on changed files.
- Excluded from coverage by design: `app.config.ts`, `app.routes.ts`, `shared/sockets/websocket.service.ts`, `shared/components/alert/alert.component.ts`.

---

## Quick commands (from `research-indicators/`)

| What | Command |
|------|---------|
| Dev server (http://localhost:4200) | `npm start` |
| Production build | `npm run build` |
| Dev build with sourcemaps | `npm run build-dev` |
| Tests | `npm run test` |
| Coverage | `npm run test:coverage` |
| Lint (TS/HTML) | `npm run lint` |
| Lint (SCSS) | `npm run s-lint` |
| Docker dev compose | `npm run compose:up:dev` |

---

## Hard rules echo (PRD C-1…C-6)

These bind every change inside `src/`. Full text in [`../../docs/prd.md`](../../docs/prd.md) §8.3.

- **C-1** Angular 19 + PrimeNG 19, no migration.
- **C-2** AWS Cognito + JWT, no alternative IdPs.
- **C-3** CLARISA is the controlled-vocabulary source — no parallel taxonomies in `interfaces/` or in component dropdowns.
- **C-4** WCAG 2.1 AA on every changed screen.
- **C-5** Respect `angular.json` bundle budgets (initial ≤ 3 MB error / 2 MB warning; component styles ≤ 8 kB / 4 kB).
- **C-6** New routes are lazy-loaded standalone components.
