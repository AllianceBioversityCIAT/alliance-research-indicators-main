# Execution Log — Institutional Performance / Control Lists

## Document Control

| Field | Value |
| --- | --- |
| Spec path | `docs/specs/institutional-performance/control-lists` |
| Branch | `institutional-kpis` |
| Approval Mode | `gated` |
| Leader | Claude (Opus 5.5) · Implementer wrapper `akili-implementer` · Reviewer wrapper `akili-reviewer` |
| Jira | epic AC-1773 — mark each sub-task / story Done when it closes (AC workflow has no direct Open → Done) |
| Status | **ready to start T-01** — scratch schema loaded from a current `stardb` dump (Run 3) |

## Task Execution History

### 2026-09-27 — Run 1: environment pre-check, paused

- **Next eligible tasks:** T-01 (document order), T-02 (no dependencies).
- **Pre-check (design §11, `docs/infrastructure.md` §6.5):** T-01's verification must run on the disposable TEST scratch schema.
  - `docker info` → daemon not running (`DOCKER_DOWN`).
  - `ls -a server/researchindicators | grep -i env` → only `.env.example`; no `.env`, so `ARI_TEST_MYSQL_*` are unset.
- **Decision (user, 2026-09-27):** pause execution; no task started, no code changed, no attempt consumed.
- **To resume:**
  1. start Docker Desktop;
  2. create `server/researchindicators/.env` from `.env.example`, with `ARI_TEST_MYSQL_HOST=127.0.0.1`, `ARI_TEST_MYSQL_PORT=3307`, `ARI_TEST_MYSQL_USER_NAME=root`, `ARI_TEST_MYSQL_USER_PASS=scratch_root_pw`, `ARI_TEST_MYSQL_NAME=ari_scratch_test` (values from `docker-compose.test.yml`), plus the Dev `ARI_MYSQL_*` values from a teammate;
  3. verify the **resolved host/port** is the local container, not the shared Dev database (infrastructure §6.5, finding F-01);
  4. `npm run compose:test:up`;
  5. then run `/akili-execute institutional-performance/control-lists`.

### 2026-09-29 — Run 2: local tooling installed; scratch schema blocked by a pre-existing migration

- **Tooling installed (user machine, macOS arm64):** Colima + Docker CLI 29.5 + Docker Compose 5.5 (instead of Docker Desktop, which needs a paid licence in large organizations), `fnm` with Node **22.23.3** (the server targets `node:22.12.0` in its Dockerfile and Node 22 in CI; the machine's global Node is 26). `npm ci` done in `server/researchindicators`.
- **`.env`:** created from `.env.example` (gitignored — `server/researchindicators/.gitignore:43`), with `ARI_TEST_MYSQL_*` = `127.0.0.1:3307`, `root`, `ari_scratch_test`. The user fills the remaining values; Dev is reached through the VPN.
- **Scratch container:** `npm run compose:test:up` → `research_indicators_server_test_mysql`, MySQL 8.0.46, bound to `127.0.0.1:3307` (verified with `docker ps`, not by the variable name — infrastructure §6.5, F-01).
- **Blocker — `npm run migration:test:bootstrap` fails on an existing migration, before any of this spec's code:**
  - The failing migration is `1787600000000-createPiDelegates.ts`, with `ER_FK_INCOMPATIBLE_COLUMNS` (errno 3780) on `FK_pi_delegates_project_id`.
  - Measured on the scratch schema: `agresso_contracts.agreement_id` is `utf8mb3 / utf8mb3_general_ci`, and `pi_delegates.project_id` is `utf8mb4 / utf8mb4_0900_ai_ci`.
  - The migration pins its table to `DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci` (`:37`), while its own header comment (`:14-19`) still says it must be utf8mb3 to match `agresso_contracts`. `git log -1` on the file shows `027bc60f` (2026-09-25), "fix(migrations): update character set and collation for pi_delegates table".
  - The baseline snapshot `src/db/baseline/baseline.sql` was taken from Dev on 2026-08-14.
  - **Hypothesis (not verified against Dev):** Dev's `agresso_contracts.agreement_id` changed to utf8mb4 after the snapshot, and the merged migration was edited to follow it. That would make the baseline stale for this migration. It would also mean a merged migration was edited, against root `CLAUDE.md` §4.1 ("never edit a merged migration").
  - **Tried and refuted:** setting the scratch database default to `utf8mb3` changes nothing, because the migration pins its own charset.
- **Decision (user, 2026-09-29):** review with the dev team before choosing a fix. The options offered were:
  - one read-only query to Dev plus a local-only scratch adjustment;
  - a baseline refresh as a separate change;
  - team review.
- **Nothing in this spec's scope was changed; no attempt consumed; no Jira transition.** The scratch container is still running under Colima (`colima stop` to free resources).
- **Questions for the dev team:**
  1. What charset/collation does Dev's `agresso_contracts.agreement_id` have today?
  2. Was `1787600000000-createPiDelegates.ts` edited after it had been applied anywhere?
  3. Should `baseline.sql` be refreshed?

### 2026-09-29 — Run 3: scratch schema loaded from a current database dump; blocker cleared

- **Source (user-provided):** `~/Downloads/stardb-20260928_23_40_01.sql`, 52 MB. `mysqldump` 8.0.42 against server 8.4.8; host header `roardb…us-east-1.rds.amazonaws.com`, database `stardb`.
- **Contains real data:** 214 `INSERT` statements, including `sec_users`, `results` and `agresso_contracts`, with 16 `@cgiar.org` addresses. For that reason:
  - it is loaded **only into the local disposable scratch container** (`127.0.0.1:3307`);
  - `src/db/baseline/baseline.sql` (schema-only by rule) is **not** replaced;
  - the dump is never committed or copied into the repo.
- **Load:** the container was recreated, and the dump was piped with `DEFINER=` clauses stripped (the same mechanical fix as the baseline README), in 8.4 s with no errors. Result: 219 tables and views, 365 `migrations` rows, 14,601 `results`.
- **Confirms the Run 2 hypothesis:** in this dump, `agresso_contracts` and `pi_delegates` are both `utf8mb4 / utf8mb4_0900_ai_ci`, so the committed baseline was stale.
- **Pending migrations:** `npm run migration:test:execute` → `No migrations are pending`.
- **Still for the dev team:**
  - `1787600000000-createPiDelegates.ts` was edited after merge (`027bc60f`), against root `CLAUDE.md` §4.1;
  - the committed `baseline.sql` (2026-08-14) is stale and should be refreshed as a separate change.
  Neither is in this spec's scope.
- **MySQL version note:** the scratch image is `mysql:8.0` (8.0.46); the source server is 8.4.8. The load succeeded on 8.0. The image is left unchanged (`docker-compose.test.yml` is a shared file).
