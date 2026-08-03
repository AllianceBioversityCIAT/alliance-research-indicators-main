# Infrastructure — Alliance Research Indicators (ARI)

> Deployment & hosting blueprint for the ARI monorepo (server + client). The infrastructure shape derives from the TRD's robust-vs-lite tier decision — see [`docs/trd/trd.md`](./trd/trd.md) §2. Entries marked **⚠ confirm** are inferred from repo evidence and need ops sign-off.

**Tier decision (from TRD §2): Robust.** ARI is a federated system of record with multiple external integrations (CLARISA, AGRESSO, ROAR/Cognito, OpenSearch, TIP), a real-time channel, and a governed audit trail — it warrants managed, horizontally-scalable cloud components rather than a single-node lite deployment.

---

## 1. Target Environment

| Concern | Choice | Notes |
| --- | --- | --- |
| Cloud | **AWS** | Primary target for both packages. |
| Server runtime | AWS **Elastic Beanstalk** (Node ≥ 20.11.1) ⚠ confirm | NestJS HTTP + RabbitMQ microservice bootstrap (`main.ts`). |
| Client hosting | **Docker + Nginx** container ⚠ confirm | Angular SPA built to static assets, served by `nginx.conf`. |
| Region / residency | ⚠ confirm | See PRD open question on data residency / PII. |

---

## 2. Core Cloud Components

| Component | Service | Used by | Purpose |
| --- | --- | --- | --- |
| Relational DB | **AWS RDS — MySQL** (utf8mb4) | server | System of record (TypeORM). |
| Document / feedback store | **AWS DynamoDB** | server | External feedback store. |
| Search | **OpenSearch** cluster | server | Results / Alliance Staff / PRMS indexes. |
| Message broker | **RabbitMQ** (`amqps://`, `ARI_QUEUE`) | server | Cross-system events (microservice). |
| Identity | **ROAR Management** (server JWT) + **AWS Cognito** (client JWT) | both | Human + machine auth. |
| Object storage | **AWS S3** ⚠ confirm | server | Evidence / static assets (to confirm in TRD). |
| Real-time | **Socket.IO / WebSocket gateway** | both | Live result updates, presence, notifications. |
| CDN / static | Nginx (client) + `/admin/public` (server SSR assets) | both | Static delivery. |

---

## 3. Deployment Strategy

| Aspect | Approach |
| --- | --- |
| CI | **GitHub Actions** — `unit-tests.yml`, `sonarcloud-analysis.yml`, `jenkins-trigger.yml` (SonarCloud analysis on JDK 21). |
| CD | Jenkins-triggered pipeline ⚠ confirm → Elastic Beanstalk (server) / container registry + Nginx (client). |
| Build (server) | `npm run build` → Nest dist + Vite admin SSR bundle. |
| Build (client) | `ng build` (prod) → static assets; `Dockerfile` + `docker-compose.yml` package the Nginx image. |
| Quality gates | SonarCloud; per-package Jest coverage floors (server 60%; client statements 40 / branches 20 / lines 45 / functions 30). |
| Migrations | TypeORM **append-only** migrations under `server/.../src/db/migrations`; never edit merged migrations. Run as a release step. |
| IaC | ⚠ confirm (Terraform / CDK / manual) — not tracked in this repo. |

---

## 4. Network & Security Architecture

- **Auth boundary (server):** `JwtMiddleware` validates ROAR JWT or base64(`{client_id, client_secret}`) machine tokens; anonymous access is an explicit allowlist (`/admin*`, `/.well-known*`, `GET /api/configuration/:key`, `GET /`, `/favicon.ico`).
- **Auth boundary (client):** AWS Cognito JWT with proactive refresh; `rolesGuard` / `centerAdminGuard` mirror backend authorization.
- **Machine-token hardening:** `client_id/client_secret` validated against `app_secrets` + host allowlist (`app_secret_host_list`). Rotation policy ⚠ confirm.
- **`/admin` exposure:** currently excluded from `JwtMiddleware` — **must gain an explicit admin guard before any production exposure** (tracked open gap in UX/UI §Open Gaps and TRD §Security).
- **Transport:** HTTPS everywhere; RabbitMQ over `amqps://`. Helmet CSP configured (prod + Vite dev `http://localhost:5173`).
- **Body limits:** 50 MB JSON / URL-encoded (evidence uploads).
- **Rate limiting:** `express-rate-limit` installed; global policy ⚠ confirm.

---

## 5. Infrastructure Rules & Constraints

1. **Append-only migrations.** Schema changes ship only via new TypeORM migrations; a merged migration is immutable.
2. **Two deployables, one repo.** Server and client build and deploy independently from the monorepo; no shared runtime.
3. **Secrets never in git.** App secrets, DB creds, Cognito/ROAR config, broker URLs, and both clients' `environment.ts` live outside the repo (env/secret manager). `environment.ts` / `environment.dev.ts` are gitignored.
4. **Managed data services.** RDS, DynamoDB, OpenSearch, RabbitMQ are managed/hosted — no self-run stateful nodes on the app tier.
5. **Reproducible search.** OpenSearch indexes are rebuildable from TypeORM entities (`@OpenSearchProperty`); an index rebuild is a supported operational action.
6. **CodeGraph is machine-local.** `.codegraph/` is never committed (gitignored).

---

## Local Environment

How to bring up the stack on a developer laptop. **Derived from repo evidence** (`server/researchindicators/docker-compose.yml`, `client/research-indicators/docker-compose.yml`, both `package.json` script blocks, `server/researchindicators/.env.example`, `src/main.ts`) — not from convention. Items marked ⚠️ could not be resolved from the repo and need a human answer.

### The shape of this stack (read first)

**There is no local database, and no single command that starts everything.** Neither compose file defines a `db` service: each one runs only its own app container. `ARI_MYSQL_HOST` in `.env.example` points at an **external MySQL**, and RabbitMQ, DynamoDB, OpenSearch, and CLARISA are likewise remote managed services (§4 above). So "start the stack" here means *start one or both app packages and point them at shared remote data services* — the two packages are independent deployables (§2) and are started independently.

| Element | Server (`server/researchindicators`) | Client (`client/research-indicators`) |
|---|---|---|
| **Primary route (Docker)** | `npm run compose:up:dev` → container `research_indicatiors_server`, host **:3000** | `npm run compose:up:dev` → container `research_indicatiors_client`, host **:4200** (→ container :80) |
| **Fallback route (no Docker)** | `npm install && npm run dev` — runs Nest API + Vite admin concurrently (`start:dev` + `dev:admin`) | `npm install && npm start` (`ng serve`) |
| **Pre-check** | `docker info`. On failure (daemon off / not installed): start Docker, **or** take the fallback route — it needs no Docker at all. Never block silently | same |
| **Config** | `.env` at the package root; copy from the committed `.env.example` and fill in. Required keys: `ARI_PORT`, `ARI_MYSQL_*`, `ARI_MQ_*`, `ARI_JWT_ACCESS_EXPIRES_IN`, `ARI_TOC_INTEGRATION_HOST`, `ARI_PRMS_TOC_HOST` | `src/environments/environment.ts` (gitignored, §3). ⚠️ No committed template exists — obtain it from a teammate. The `docker:run` script also expects a root `.env` |
| **Health check** | `GET http://localhost:3000/` (excluded from `JwtMiddleware`, so it answers unauthenticated) · Swagger UI at `http://localhost:3000/swagger` · admin panel at `http://localhost:3000/admin` | `http://localhost:4200` loads the STAR SPA |
| **Verify** | `npm test` · `npm run lint` · `npm run build` (e2e: `npm run test:e2e`) | `npm test` · `npm run lint` · `npm run build` |

### Data & migrations

| Action | Command |
|---|---|
| Apply migrations (dev, from TS sources) | `npm run migration:dev:execute` |
| Apply migrations (against built output) | `npm run migration:execute` |
| Roll back the last migration | `npm run migration:revert` |
| Generate a new migration | `npm run migration:generate --name=<name>` |

**Seed / reset:** ⚠️ **no seed or reset script exists in the repo.** Because the dev database is a *shared remote* instance rather than a disposable local container, there is nothing an agent may safely reset. Confirm with the team how a developer obtains a working dataset (shared dev DB credentials vs. a restored dump) before documenting a command here.

### Boundary rule: disposable vs. governed

- The **local environment is disposable** in the ordinary case: agents may freely start, stop, rebuild, and re-run the two app containers or dev servers to verify their work.
- **The database is the exception, and it is not disposable.** It is remote and shared, so the usual "reset it and re-seed" license does **not** apply. Destructive schema or data operations against it are a human decision, never an agent's. Migrations are append-only (§1) and `migration:revert` against a shared dev DB affects every other developer — treat it as a coordinated action.
- **Deployments to cloud/PROD are governed** — they follow §§1–5 above (components, IaC, CI/CD defined at constitution time) and are never improvised by agents.

### Concurrency note (agents)

The two packages have **separate** `node_modules`, build outputs, and ports, so a server task and a client task can run in parallel safely. Two tasks inside the *same* package cannot — they contend for that package's build output and dev-server port. This is the concrete form of the concurrency protocol in `.agents/leader.md`.

---

## Open Items (need ops sign-off)

- OI-1. Confirm server hosting: Elastic Beanstalk vs ECS/Fargate vs other.
- OI-2. Confirm IaC ownership and tool (Terraform / CDK / manual).
- OI-3. Confirm S3 usage for evidence storage and its lifecycle policy.
- OI-4. Define the admin-panel production auth guard before exposing `/admin`.
- OI-5. Document rate-limit and machine-token rotation policies.
- OI-6. Confirm region / data-residency constraints (PRD open question on PII / GDPR).
- OI-7. Define how a developer obtains a working local dataset (shared dev DB credentials vs. restored dump), and whether a seed/reset path should exist at all given the DB is remote and shared (`## Local Environment` → *Data & migrations*).
- OI-8. Publish a committed template for the client's `src/environments/environment.ts` (an `.example` counterpart to the server's `.env.example`), so a new developer can start the client without asking a teammate.

---

## Authorship

AKILI-SPECS methodology by **Juan Carlos Cadavid** — [jcadavid.com](https://jcadavid.com). Licensed under the MIT License.
