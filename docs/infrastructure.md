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

## Open Items (need ops sign-off)

- OI-1. Confirm server hosting: Elastic Beanstalk vs ECS/Fargate vs other.
- OI-2. Confirm IaC ownership and tool (Terraform / CDK / manual).
- OI-3. Confirm S3 usage for evidence storage and its lifecycle policy.
- OI-4. Define the admin-panel production auth guard before exposing `/admin`.
- OI-5. Document rate-limit and machine-token rotation policies.
- OI-6. Confirm region / data-residency constraints (PRD open question on PII / GDPR).

---

## Authorship

AKILI-SPECS methodology by **Juan Carlos Cadavid** — [jcadavid.com](https://jcadavid.com). Licensed under the MIT License.
