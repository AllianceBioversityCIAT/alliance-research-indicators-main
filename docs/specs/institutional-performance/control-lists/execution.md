# Execution Log — Institutional Performance / Control Lists

## Document Control

| Field | Value |
| --- | --- |
| Spec path | `docs/specs/institutional-performance/control-lists` |
| Branch | `institutional-kpis` |
| Approval Mode | `gated` |
| Leader | Claude (Opus 5.5) · Implementer wrapper `akili-implementer` · Reviewer wrapper `akili-reviewer` |
| Jira | epic AC-1773 — mark each sub-task / story Done when it closes (AC workflow has no direct Open → Done) |
| Status | **paused before T-01** — environment pre-check failed |

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
