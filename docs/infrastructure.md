# Infrastructure — Alliance Research Indicators (ARI)

> Deployment & hosting blueprint for the ARI monorepo (server + client). The infrastructure shape derives from the TRD's robust-vs-lite tier decision — see [`docs/trd/trd.md`](./trd/trd.md) §2.

**Tier decision (from TRD §2): Robust.** ARI is a federated system of record with multiple external integrations (CLARISA, AGRESSO, ROAR/Cognito, OpenSearch, TIP), a real-time channel, and a governed audit trail — it warrants managed, horizontally-scalable cloud components for production and a dedicated on-premise staging/dev tier rather than a single-node lite deployment.

---

## 1. Target Environments

The ARI platform operates across two remote deployed environments, mapped strictly to Git branches:

| Environment | Hosting Target | Git Branch | Access & Deployment Mechanism | Purpose |
| --- | --- | --- | --- | --- |
| **Development (Dev)** | **On-premise infrastructure** | `dev` | **100% Automated CI/CD** (triggered on push/merge to `dev`) | Integration testing, active feature validation, QA, shared dev database. |
| **Production (Prod)** | **AWS Cloud infrastructure** | `main` | **100% Automated CI/CD** (triggered on push/merge to `main`) | Live platform for end users, partner systems, and donor reporting. |

### Environment Topology Overview

```
 [ Local Dev / Agent ]
   │
   ├─► Local Docker Stack (Frontend :4200 + Backend :3000) ──► Points directly to Dev MySQL (On-Premise)
   │
   ├─► Git Push / PR Merge: 'dev' branch  ──► Automated CI/CD ──► Deploys to On-Premise (Dev)
   │
   └─► Git Push / PR Merge: 'main' branch ──► Automated CI/CD ──► Deploys to AWS Cloud (Prod)
```

---

## 2. Core Cloud & On-Prem Components

| Component | Service / Location | Used by | Purpose |
| --- | --- | --- | --- |
| **Relational DB (Dev)** | **MySQL Server (On-premise)** | server | Primary dev system of record (TypeORM). Shared by dev deployment and local docker testing. |
| **Relational DB (Prod)**| **AWS RDS — MySQL** (utf8mb4) | server | Production system of record (TypeORM). |
| **Document / Feedback store** | **AWS DynamoDB** | server | External feedback storage. |
| **Search cluster** | **OpenSearch** | server | Results / Alliance Staff / PRMS indexes. |
| **Message broker** | **RabbitMQ** (`amqps://`, `ARI_QUEUE`) | server | Cross-system events (microservice bootstrap). |
| **Identity & Auth** | **ROAR Management** (server JWT) + **AWS Cognito** (client JWT) | both | Dual human and machine authentication. |
| **Object storage** | **AWS S3** | server | Evidence attachments and static exports. |
| **Real-time Gateway** | **Socket.IO / WebSocket** | both | Live result editing presence, locking, and notifications. |
| **Web / Reverse Proxy** | **Nginx (Container)** | client | Serves Angular static SPA bundle with HTML5 client-side routing fallback. |

---

## 3. Deployment Strategy & Access Governance

### 3.1 CI/CD Automation Pipeline

| Aspect | Approach |
| --- | --- |
| **Continuous Integration (CI)** | **GitHub Actions** (`unit-tests.yml`, `sonarcloud-analysis.yml`, `jenkins-trigger.yml`). Automates linting, test suites, SonarCloud quality gates (JDK 21). |
| **Continuous Delivery (CD)** | Automated Jenkins/GitHub Actions pipelines triggered by branch updates: <br>• Changes on `dev` branch ➔ Automatically builds and deploys to **On-premise Dev**.<br>• Changes on `main` branch ➔ Automatically builds and deploys to **AWS Cloud Production**. |
| **Server Build** | `npm run build` ➔ Compiles NestJS backend dist and Vite admin SSR bundle. |
| **Client Build** | `ng build` (prod configuration) ➔ Compiles Angular SPA static bundle packaged in Nginx container. |
| **Quality Gates** | SonarCloud clean status; Jest coverage floors (Server ≥ 60%; Client statements ≥ 40 / branches ≥ 20 / lines ≥ 45 / functions ≥ 30). |
| **Database Migrations** | TypeORM **append-only** migrations under `server/.../src/db/migrations`. Executed automatically as a release step during deployment. |

### 3.2 Strict Access & Deployment Governance (Non-Negotiable)

> [!IMPORTANT]
> **No Manual Remote Deployments:**
> 1. Developers, contributors, and AI agents **DO NOT** perform manual deployments to remote environments (neither On-premise Dev nor AWS Prod).
> 2. Developers and AI agents **DO NOT** hold AWS Production account credentials or direct write access to the On-premise deployment hosts.
> 3. All remote deployments are strictly managed and executed by the automated CI/CD pipeline upon merging code into `dev` or `main`.
> 4. Local testing is conducted exclusively via local Docker containers or native local dev processes pointing to the shared Dev MySQL database.

---

## 4. Network & Security Architecture

- **Auth boundary (server):** `JwtMiddleware` validates ROAR JWT or base64(`{client_id, client_secret}`) machine tokens. Anonymous endpoints are strictly allowlisted (`/admin*`, `/.well-known*`, `GET /api/configuration/:key`, `GET /`, `/favicon.ico`).
- **Auth boundary (client):** AWS Cognito JWT with proactive refresh; Angular guards (`rolesGuard`, `centerAdminGuard`) mirror backend authorization.
- **Machine-token hardening:** `client_id/client_secret` validated against `app_secrets` + host allowlist (`app_secret_host_list`).
- **`/admin` SSR panel:** Internal administration surface. Must enforce authentication/admin guards before exposing to public networks.
- **Transport:** HTTPS/TLS enforced; RabbitMQ over secure AMQPS (`amqps://`). Helmet CSP configured for production and local Vite dev origins.
- **Body limits:** 50 MB JSON / URL-encoded payload limit (supports rich evidence uploads and data matrices).
- **Rate limiting:** `express-rate-limit` middleware active.

---

## 5. Infrastructure Rules & Constraints

1. **Append-only migrations.** Schema changes ship only via new TypeORM migrations. Merged migrations are strictly immutable.
2. **Two deployables, one monorepo.** Server and Client build and deploy independently; neither imports runtime code from the other.
3. **Secrets never in git.** Database credentials, broker connection strings, Cognito/ROAR secrets, and `environment.ts` remain outside git tracking.
4. **Governed CI/CD releases.** Zero manual cloud/on-premise deployments by developers or agents.
5. **Reproducible search.** OpenSearch indexes are completely rebuildable from TypeORM entities decorated with `@OpenSearchProperty`.
6. **CodeGraph is machine-local.** The index lives at `server/researchindicators/.codegraph/` and is strictly gitignored.

---

## 6. Local Environment Contract

The local environment is designed for fast developer feedback, local feature testing, and end-to-end verification without touching production.

### 6.1 Architecture of the Local Stack

The local stack runs both packages containerized with Docker, configured so that the backend connects directly to the remote **Dev MySQL database** (on-premise):

```
┌────────────────────────────────────────────────────────┐
│                   LOCAL DOCKER STACK                   │
│                                                        │
│   ┌───────────────────────────┐                        │
│   │ Client Container (Angular)│                        │
│   │ Port: 4200 (Nginx/SPA)    │                        │
│   └─────────────┬─────────────┘                        │
│                 │ Calls http://localhost:3000/api       │
│                 ▼                                      │
│   ┌───────────────────────────┐                        │
│   │ Server Container (NestJS) │                        │
│   │ Port: 3000 (HTTP/Socket)  │                        │
│   └─────────────┬─────────────┘                        │
└─────────────────┼──────────────────────────────────────┘
                  │ Connects over network
                  ▼
   ┌─────────────────────────────┐
   │ Dev MySQL Database (On-Prem)│
   └─────────────────────────────┘
```

### 6.2 Service Contract & Ports

| Service | Container Name | Local Port | Target URL / Health Check | Target Database |
| --- | --- | --- | --- | --- |
| **Backend API** | `ari_server_local` | `3000` | `http://localhost:3000/api`<br>`http://localhost:3000/swagger` | **Dev MySQL (On-premise)** |
| **Frontend UI** | `ari_client_local` | `4200` | `http://localhost:4200` | N/A (calls Backend API) |

### 6.3 Running the Local Stack

#### Primary Route: Docker Compose (Recommended)

```bash
# 1. Pre-check: Ensure Docker daemon is running
docker info

# 2. Configure Backend environment
# Ensure server/researchindicators/.env is populated with the Dev MySQL credentials:
# ARI_MYSQL_HOST=<dev-mysql-host>
# ARI_MYSQL_USER_NAME=<dev-mysql-user>
# ARI_MYSQL_USER_PASS=<dev-mysql-pass>
# ARI_MYSQL_NAME=<dev-mysql-db>
# ARI_PORT=3000

# 3. Configure Client environment — REQUIRED on a clean checkout
# src/environments/environment.ts and environment.dev.ts are gitignored
# (.gitignore:40-41) and have NEVER been committed; only .gitkeep is tracked.
# `ng build` reads environment.ts directly, so the client image cannot build
# without it — and the error names a missing module, not a missing config.
cp client/research-indicators/src/environments/environment.example.ts \
   client/research-indicators/src/environments/environment.ts
cp client/research-indicators/src/environments/environment.example.ts \
   client/research-indicators/src/environments/environment.dev.ts   # for `npm run build-dev`
# then fill in the values your task needs — see the two typed traps in the template

# 4. Build and launch all local containers from the monorepo root
docker compose up --build -d

# 4. View container logs
docker compose logs -f

# 5. Stop the local stack
docker compose down
```

#### Fallback Route: Native Development (No Docker)

```bash
# 1. Start Server locally (Node >= 20)
cd server/researchindicators
npm install
npm run start:dev   # Runs NestJS on http://localhost:3000 pointing to Dev MySQL

# 2. In a separate terminal, start Client locally
cd client/research-indicators
npm install
npm start           # Runs Angular dev server on http://localhost:4200
```

### 6.4 Order of operations — schema reaches Dev by CI/CD, never by the local stack

**The local stack runs branch code against the Dev schema.** Those two move on different clocks, and
nothing in the stack reconciles them. A migration that exists on your branch **does not exist in the Dev
database** until the branch is merged to `dev` and the pipeline applies it (§3.1) — and §3.2 forbids
applying it by hand, correctly, since a hand-applied migration would diverge Dev from what CI/CD believes
it deployed.

So when a branch adds a migration **and** code that reads the new column, the local stack is broken for
that feature until the migration lands. **The failure does not look like a missing migration** — it looks
like a broken endpoint:

```
ER_BAD_FIELD_ERROR: Unknown column 'rpfas.sp_role' in 'field list'
```

That is a real example, reproduced against Dev on 2026-08-13 while
`bilateral/primary-contributing-sp` was in flight: the repository selected a column its own migration had
not yet delivered to Dev, so the whole `GET` 500'd. **Nothing in the code was wrong.** An engineer who
reads that trace as a code defect can lose an afternoon.

**The order, therefore:**

| # | Step | Where |
| --- | --- | --- |
| 1 | Merge the branch carrying the migration to `dev` | PR |
| 2 | CI/CD applies it to the Dev database | pipeline, §3.1 |
| 3 | Confirm the column landed before blaming the code | `information_schema.columns` |
| 4 | Run the local stack against Dev | §6.3 |

**Before debugging any "broken endpoint" in the local stack, check step 3 first:**

```sql
SELECT column_name FROM information_schema.columns
 WHERE table_schema = '<dev-db>' AND table_name = '<table>';
```

**Corollary for feature work that cannot wait for the merge:** point the server at a disposable local
MySQL of the **same engine version as Dev** and run the migration against it there. That is a local
environment, so §6.4's disposability rule applies and no governance rule is bent. `server/researchindicators`
ships `npm run test:integration` (see `test/jest-integration.json`), which does exactly this and requires
`T13_MYSQL_PASSWORD` to be set rather than defaulting — deliberately, so a misconfigured run fails loudly
instead of silently connecting somewhere unintended.

### 6.5 Migration commands

Run from `server/researchindicators/`. Ordering and governance are §6.4 — these are only the commands.

**Shared dev database (`ARI_MYSQL_*`) — not disposable, never reset by an agent:**

| Action | Command |
| --- | --- |
| Apply pending migrations (from TS sources) | `npm run migration:dev:execute` |
| Apply pending migrations (against built output) | `npm run migration:execute` |
| Roll back the last migration | `npm run migration:revert` |
| Generate a new migration | `npm run migration:generate -- ./src/db/migrations/<name>` |

**`migration:revert` against the shared Dev database affects every other developer** — it is a coordinated action, never a unilateral one. Migrations are append-only (§6.4).

**Disposable scratch schema (`ARI_TEST_MYSQL_*`) — added 2026-08-18 by `docs/specs/archive/2026-08-18-bugfix--sp-versioning-roles-id` (T-01b), for fixtures and migration testing only.** Run every command below from `server/researchindicators/`:

| Action | Command |
|---|---|
| Bring up the scratch MySQL container | `npm run compose:test:up` |
| Load the committed schema-only snapshot (`src/db/baseline/baseline.sql`) | `npm run baseline:test:load` |
| Apply migrations against the TEST datasource | `npm run migration:test:execute` |
| **Load, then apply — the only safe order** | `npm run migration:test:bootstrap` |
| Roll back the last migration (TEST datasource) | `npm run migration:test:revert` |
| Tear the scratch container down | `npm run compose:test:down` |
| Run the fixture suite | `npm run test:fixtures` |

⚠️ **Two traps, neither obvious from the command names alone:**
1. **Order is not optional.** `migration:test:bootstrap` *is* `baseline:test:load && migration:test:execute`. Run `migration:test:execute` alone against a fresh scratch container and it fails immediately — the schema doesn't exist until the snapshot loads first.
2. **The fixture runner is silently name-gated.** `npm run test:fixtures` (`test/jest-fixtures.json`) collects **only** files matching `*.fixture-spec.ts`. A fixture file named plain `*.spec.ts` is collected by **neither** this runner nor `npm test` — a silent zero-tests-collected pass that looks green and tested nothing.

**Seed / reset, shared dev DB:** still true, unchanged by the above — **no seed or reset script exists for `ARI_MYSQL_*`, and none should be added.** It is a shared remote instance (§4 above); there is nothing an agent may safely reset there. Destructive schema or data operations against it remain a human decision (see *Boundary rule* below).

**What the scratch schema is *not*:** it does not touch, seed, or reset the shared dev database. It is a separate, disposable MySQL container reachable only through `ARI_TEST_MYSQL_*`, loaded from a committed snapshot with **no business data** (its one row-level exception is the `migrations` bookkeeping table — see `server/researchindicators/src/db/baseline/README.md`). **A `TEST`-named variable is not evidence of a disposable target** — on at least one developer machine, `ARI_TEST_MYSQL_*` was found resolving to the same remote RDS instance as `ARI_MYSQL_*` (finding F-01, `docs/specs/archive/2026-08-18-bugfix--sp-versioning-roles-id/execution.md`). Always verify the **resolved host and port**, never the variable name, before treating a target as disposable.

**A migration is only verified once it has been executed.** It can be valid TypeScript, lint-clean, type-clean and reviewed while still being unrunnable — this happened on 2026-08-13 and is recorded as Kaizen K-006. Run it against a disposable local MySQL of the same engine version before the PR.

### 6.6 Boundary & Disposability Rule

- **Local environment is disposable:** Developers and agents may freely start, restart, rebuild, and re-test local containers.
- **Remote environments are governed:** Deployed Dev (on-premise) and Prod (AWS) environments are managed strictly through CI/CD pipelines.
- **The Dev database is the exception to disposability.** It is remote and shared, so the usual "reset it and re-seed" licence does **not** apply; destructive schema or data operations against it are a human decision, never an agent's.

**Concurrency (agents).** The two packages have separate `node_modules`, build outputs and ports, so a server task and a client task can run in parallel safely. Two tasks inside the *same* package cannot — they contend for that package's build output and dev-server port. This is the concrete form of the concurrency protocol in `.agents/leader.md`.

---

## 7. Open Items (need ops sign-off)

- OI-1. Confirm server hosting: Elastic Beanstalk vs ECS/Fargate vs other.
- OI-2. Confirm IaC ownership and tool (Terraform / CDK / manual).
- OI-3. Confirm S3 usage for evidence storage, its lifecycle policy, and bucket encryption settings.
- OI-4. Define the admin-panel production auth guard before exposing `/admin`, and ensure it is locked down prior to public routing.
- OI-5. Document rate-limit and machine-token rotation policies.
- OI-6. Confirm region / data-residency constraints (PRD open question on PII / GDPR).
- OI-7. **Partly answered 2026-08-18.** A seed/reset path now exists for *schema*: the disposable scratch container + committed snapshot at `server/researchindicators/src/db/baseline/` (`## Local Environment` -> *Data & migrations*). Still open: a working data seed.
- OI-8. Publish a committed template for the client's `src/environments/environment.ts` (an `.example` counterpart to the server's `.env.example`), so a new developer can start the client without asking a teammate.
- OI-9. Document exact host allowlists (`app_secret_host_list`) for machine-token clients in Dev vs Prod.
- OI-10. Formalize the automated release tagging convention between `dev` and `main`.

---

## Authorship

AKILI-SPECS methodology by **Juan Carlos Cadavid** — [jcadavid.com](https://jcadavid.com). Licensed under the MIT License.
