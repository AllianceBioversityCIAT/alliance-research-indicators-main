# Design — Bilateral module

> **SDD spec.** Follows [`docs/specs/general-setup/design.md`](../general-setup/design.md).
> Inputs: [`./requirements.md`](./requirements.md), [`./prms-context/`](./prms-context/), [`./jira-us/`](./jira-us/), [`../../detailed-design/detailed-design.md`](../../detailed-design/detailed-design.md), [`../../../server/researchindicators/src/CLAUDE.md`](../../../server/researchindicators/src/CLAUDE.md).
> Companion documents: [`./requirements.md`](./requirements.md), [`./tasks.md`](./tasks.md).

---

## 1. Document control

| Field | Value |
| --- | --- |
| Spec id | 2026-05-bilateral-module |
| Module | bilateral-module |
| Status | Draft — pending approval |
| Phase | Phase 2 of the SDD methodology (design) |
| Owner | Architect: TBC. Tech Lead: TBC. PO: TBC. |
| Last updated | 2026-05-15 |
| Approvers | [ ] Architect · [ ] Tech Lead · [ ] PO · [ ] Security · [ ] DevOps · [ ] STAR FE |

---

## 2. Executive summary

The bilateral module is implemented as a **thin orchestration layer on top of ARI's existing primitives** rather than a parallel subsystem. Concretely:

- A single new **entity module** (`domain/entities/bilateral/`) hosts the orchestration service + DTOs + handler interface. It writes to existing typed result tables (`result_capacity_sharing`, `result_knowledge_product`, `result_innovation_dev`, `result_policy_change`) and a small set of new tables for alignment, mapping, and review history.
- Three new **tool modules** (`domain/tools/bilateral-push/`, `domain/tools/w3-registry/`, `domain/tools/sp-toc-sync/`) encapsulate the three integration concerns (US5 / US6 / US7).
- One new **status set** (`BILATERAL_PENDING_REVIEW / APPROVED / REJECTED`) + workflow rules layered onto the existing `result_status_workflow`.
- One new **`ReportingPlatform`** row (`BILATERAL`).
- A small **new guard** (`ResultOwnerGuard`) for the "Creator / PI / contact / admins" gate from US2 AC.7.
- One **outbound push** integration to PRMS (US5), driven asynchronously by a cron + queue (decision **D-push-trigger = async**).
- A handful of **Socket.IO events** (D16) for cross-user real-time awareness.

The module reuses ARI's existing **machine-token auth** + `app_secret_host_list` for any future inbound ingestion path; **CLARISA + AGRESSO** for master data; **OpenSearch decorator** for searchable columns; **`ResponseInterceptor` + `GlobalExceptions`** for the response envelope; and **`AuditableEntity`** for audit columns.

This design closes most of the open decisions from `./requirements.md` §10 with explicit recommendations; the remaining 4 require cross-team alignment and are carried forward to `./tasks.md` as `BLOCKER` tasks.

---

## 3. Architecture overview

### 3.1 Topology

```
                ┌──────────────────────────┐
                │  W3 / Bilateral Registry │
                └─────────────┬────────────┘
                              │ daily pull (US6, cron)
                              ▼
              ┌────────────────────────────────┐
              │  domain/tools/w3-registry/      │
              │  W3RegistryConnection           │
              │  W3RegistryService              │
              │  W3RegistrySyncCron             │
              └─────────────┬───────────────────┘
                            │ upsert
                            ▼
   ┌──────────────────────────────────────────────────────────────┐
   │                       ARI server (NestJS)                    │
   │                                                              │
   │  ┌─────────────────────────────┐    ┌────────────────────┐  │
   │  │ domain/entities/bilateral/  │◀───┤ domain/entities/   │  │
   │  │  bilateral.controller       │    │  agresso-contract  │  │
   │  │  bilateral.service          │    │  is_pool_funding_  │  │
   │  │  handlers/*                 │    │  contributor (US1) │  │
   │  └──┬────────────────────┬─────┘    └────────────────────┘  │
   │     │                    │                                   │
   │     │ writes to typed    │ writes new tables                 │
   │     ▼                    ▼                                   │
   │  ┌──────────────────┐  ┌──────────────────────────────────┐  │
   │  │ existing typed   │  │ result_pool_funding_alignment_*  │  │
   │  │ result tables    │  │ result_pool_funding_indicator_   │  │
   │  │ (KP, capacity,   │  │   mapping (US2 / US3 / US4)      │  │
   │  │  policy, innov)  │  │ result_review_history            │  │
   │  └──────────────────┘  └──────────────────────────────────┘  │
   │                                                              │
   │  ┌─────────────────────────────┐    ┌────────────────────┐  │
   │  │ domain/tools/sp-toc-sync/   │    │ domain/tools/      │  │
   │  │  SpTocSyncService           │    │  bilateral-push/   │──┼──► PRMS bilateral
   │  │  SpTocSyncCron              │    │  PushService       │  │     ingestion (US5)
   │  └─────────────────────────────┘    │  PushQueueConsumer │  │
   │                                     └────────────────────┘  │
   │                                                              │
   │  Socket.IO events:                                          │
   │   result.pool-funding-alignment.changed                     │
   │   result.bilateral.push.succeeded / failed                  │
   │   sync.w3-registry.completed / sync.sp-toc.completed        │
   └──────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
                            ┌────────────────────┐
                            │      STAR (UI)     │
                            └────────────────────┘
```

### 3.2 Boundaries & layering

- **`domain/entities/<module>/`** → request/response edge; business rules; persistence to its own + neighbour tables.
- **`domain/tools/<integration>/`** → external transport encapsulation; one Nest service per integration; cron-only schedule writes to `sync_process_log`.
- **`domain/shared/`** → cross-cutting (new `ResultOwnerGuard`, contribution-payload `class-validator` decorators if needed).
- **`admin/`** → admin SSR pages under `/admin/sync/*` and `/admin/bilateral/*`.

### 3.3 Hard rules carried forward from baseline

- Global `/api` prefix, URI versioning `/api/v1/...`. (D8 in `../../detailed-design/detailed-design.md`.)
- All responses wrapped by `ResponseInterceptor`; errors flow through `GlobalExceptions`.
- Every endpoint declares `@ApiTags / @ApiBearerAuth / @ApiOperation / @ApiQuery / @ApiBody`.
- Every mutating endpoint declares `@Roles(...)` (and `ResultStatusGuard` / `ResultOwnerGuard` where applicable).
- Migrations are append-only; new file per concern.
- New searchable columns get `@OpenSearchProperty`.
- Sibling `*.spec.ts` per controller / service / guard / interceptor.

---

## 4. Extended directory structure

> Files added (✚) or extended (✎) by this module. Existing files not touched are omitted.

```
server/researchindicators/src/
├── app.module.ts                                          (✎ register new modules)
├── domain/
│   ├── routes/main.routes.ts                              (✎ add bilateral + admin routes)
│   ├── entities/
│   │   ├── bilateral/                                     ✚ NEW
│   │   │   ├── bilateral.controller.ts
│   │   │   ├── bilateral.service.ts
│   │   │   ├── bilateral.module.ts
│   │   │   ├── bilateral.controller.spec.ts
│   │   │   ├── bilateral.service.spec.ts
│   │   │   ├── dto/
│   │   │   │   ├── update-pool-funding-alignment.dto.ts
│   │   │   │   ├── upsert-indicator-mapping.dto.ts
│   │   │   │   ├── list-indicators-query.dto.ts
│   │   │   │   ├── review-decision.dto.ts
│   │   │   │   └── push-retry.dto.ts
│   │   │   ├── enum/
│   │   │   │   ├── pool-funding-decision.enum.ts
│   │   │   │   └── review-decision.enum.ts
│   │   │   ├── entities/
│   │   │   │   ├── result-pool-funding-alignment.entity.ts
│   │   │   │   ├── result-pool-funding-indicator-mapping.entity.ts
│   │   │   │   └── indicator.entity.ts                     # if no existing ARI indicator table fits — verify
│   │   │   ├── repositories/
│   │   │   │   ├── alignment.repository.ts
│   │   │   │   └── mapping.repository.ts
│   │   │   ├── handlers/
│   │   │   │   ├── bilateral-indicator-type-handler.interface.ts
│   │   │   │   ├── capacity-sharing.handler.ts
│   │   │   │   ├── knowledge-product.handler.ts            # gated on D9 + Phase 1 KP scope
│   │   │   │   ├── policy-change.handler.ts
│   │   │   │   ├── innovation-development.handler.ts
│   │   │   │   ├── innovation-use.handler.ts               # gated on D5
│   │   │   │   └── noop.handler.ts
│   │   │   └── mappers/
│   │   │       └── result-to-prms-payload.mapper.ts
│   │   ├── agresso-contract/                              (✎ add is_pool_funding_contributor column + endpoint)
│   │   │   ├── dto/update-pool-funding-tag.dto.ts          ✚
│   │   │   └── agresso-contract.service.ts                 (✎)
│   │   ├── result-review-history/                         ✚ NEW
│   │   │   ├── result-review-history.module.ts
│   │   │   ├── result-review-history.service.ts
│   │   │   ├── result-review-history.service.spec.ts
│   │   │   └── entities/result-review-history.entity.ts
│   │   └── results/                                       (✎ minor service additions for re-review transitions)
│   │
│   ├── tools/
│   │   ├── bilateral-push/                                ✚ NEW
│   │   │   ├── bilateral-push.module.ts
│   │   │   ├── bilateral-push.service.ts
│   │   │   ├── bilateral-push.service.spec.ts
│   │   │   ├── bilateral-push.connection.ts
│   │   │   ├── bilateral-push.queue.consumer.ts
│   │   │   ├── dto/prms-payload.dto.ts
│   │   │   └── mappers/result-to-prms.mapper.ts
│   │   ├── w3-registry/                                   ✚ NEW
│   │   │   ├── w3-registry.module.ts
│   │   │   ├── w3-registry.service.ts
│   │   │   ├── w3-registry.service.spec.ts
│   │   │   ├── w3-registry.connection.ts
│   │   │   └── dto/w3-registry-row.dto.ts
│   │   ├── sp-toc-sync/                                   ✚ NEW
│   │   │   ├── sp-toc-sync.module.ts
│   │   │   ├── sp-toc-sync.service.ts
│   │   │   ├── sp-toc-sync.service.spec.ts
│   │   │   ├── sp-toc-sync.connection.ts
│   │   │   └── dto/sp-toc-snapshot.dto.ts
│   │   ├── cron-jobs/
│   │   │   ├── w3-registry.cron.ts                        ✚ NEW
│   │   │   ├── sp-toc.cron.ts                             ✚ NEW
│   │   │   └── bilateral-push.cron.ts                     ✚ NEW (poller for queued retries)
│   │   ├── socket/                                        (✎ register new outbound events)
│   │   │   └── server.gateway.ts                          (✎)
│   │   └── clarisa/                                       (✎ verify policy + innovation catalogs per D8)
│   │
│   └── shared/
│       ├── guards/
│       │   ├── result-owner.guard.ts                      ✚ NEW
│       │   └── result-owner.guard.spec.ts                 ✚ NEW
│       ├── decorators/
│       │   └── result-owner.decorator.ts                  ✚ NEW (sugar for the guard metadata)
│       └── enum/
│           └── sec_role.enum.ts                           (✎ no new roles for Phase 1 per D6)
│
├── admin/                                                 (✎ add 3 SSR pages + controllers)
│   ├── controllers/admin-sync.controller.ts               ✚ NEW
│   ├── services/admin-sync.service.ts                     ✚ NEW
│   └── client/pages/
│       ├── SyncW3Registry.tsx                             ✚ NEW
│       ├── SyncSpToc.tsx                                  ✚ NEW
│       └── BilateralPushFailures.tsx                      ✚ NEW
│
└── db/migrations/
    ├── <ts>-addPoolFundingContributorTagToAgressoContract.ts        ✚
    ├── <ts>-addBilateralResultStatuses.ts                            ✚
    ├── <ts>-addBilateralResultStatusWorkflow.ts                      ✚
    ├── <ts>-addReportingPlatformBilateral.ts                         ✚
    ├── <ts>-createResultPoolFundingAlignment.ts                      ✚
    ├── <ts>-createResultPoolFundingIndicatorMapping.ts               ✚
    ├── <ts>-createResultReviewHistory.ts                             ✚
    ├── <ts>-addIsSyncedToPrmsAndPrmsResultCodeToResults.ts           ✚
    └── <ts>-addIsActiveToIndicator.ts                                ✚ (only if existing table lacks it)
```

---

## 5. Data model

> Maps to `requirements.md` §8.

### 5.1 Schema additions

#### 5.1.1 `agresso_contract` (extend)

```sql
ALTER TABLE agresso_contract
  ADD COLUMN is_pool_funding_contributor TINYINT(1) NOT NULL DEFAULT 0,
  ADD INDEX idx_agresso_contract_pool_funding (is_pool_funding_contributor);
```

TypeORM:

```ts
@Column('boolean', { name: 'is_pool_funding_contributor', default: false, nullable: false })
@OpenSearchProperty({ type: 'boolean' })
is_pool_funding_contributor!: boolean;
```

#### 5.1.2 `result` (extend)

```sql
ALTER TABLE results
  ADD COLUMN is_synced_to_prms TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN prms_result_code BIGINT NULL,
  ADD INDEX idx_results_synced_to_prms (is_synced_to_prms);
```

#### 5.1.3 `result_status` (3 new rows)

```sql
INSERT INTO result_status (code, name, is_active, sort) VALUES
  ('BILATERAL_PENDING_REVIEW', 'Bilateral — Pending Review', 1, NN),
  ('BILATERAL_APPROVED',       'Bilateral — Approved',       1, NN+1),
  ('BILATERAL_REJECTED',       'Bilateral — Rejected',       1, NN+2);
```

#### 5.1.4 `result_status_workflow` (transitions)

| From | To | Allowed roles | Trigger |
| --- | --- | --- | --- |
| `DRAFT` | `BILATERAL_PENDING_REVIEW` | `CONTRIBUTOR`+ | Submit aligned result |
| `BILATERAL_PENDING_REVIEW` | `BILATERAL_APPROVED` | `MEL_REGIONAL_EXPERT`, `CENTER_ADMIN`, `SYSTEM_ADMIN` | Review decision |
| `BILATERAL_PENDING_REVIEW` | `BILATERAL_REJECTED` | same | Review decision |
| `BILATERAL_APPROVED` | `BILATERAL_PENDING_REVIEW` | same (per **D7=B**, re-review) | Reopen |
| `BILATERAL_REJECTED` | `BILATERAL_PENDING_REVIEW` | same | Reopen |

#### 5.1.5 `reporting_platform` (1 new row)

```sql
INSERT INTO reporting_platform (platform_code, name, is_active) VALUES
  ('BILATERAL', 'Bilateral', 1);
```

#### 5.1.6 `result_pool_funding_alignment` (new)

> **Per D2 decision (this design): use a dedicated table** rather than flag rows on `result_lever` / `result_initiative`. Rationale: alignment is a single Yes/No+selection, not multiple "contributing" rows; a dedicated table makes the AR.1 (edit regardless of status) + AR.2 (read-only-after-sync) semantics cleaner without polluting Lever data; the alignment lifecycle differs from Lever assignment.

```sql
CREATE TABLE result_pool_funding_alignment (
  id                    BIGINT PRIMARY KEY AUTO_INCREMENT,
  result_id             BIGINT NOT NULL,
  has_contribution      TINYINT(1) NOT NULL,
  -- Audit
  created_by            BIGINT NOT NULL,
  created_at            DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_by            BIGINT NULL,
  updated_at            DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  is_active             TINYINT(1) NOT NULL DEFAULT 1,
  CONSTRAINT fk_rpfa_result FOREIGN KEY (result_id) REFERENCES results(result_id),
  UNIQUE KEY uq_rpfa_result (result_id, is_active),
  INDEX idx_rpfa_result (result_id)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

CREATE TABLE result_pool_funding_alignment_sp (
  id                    BIGINT PRIMARY KEY AUTO_INCREMENT,
  alignment_id          BIGINT NOT NULL,
  lever_code            VARCHAR(50) NOT NULL,   -- CLARISA Lever / SP code
  created_by            BIGINT NOT NULL,
  created_at            DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  is_active             TINYINT(1) NOT NULL DEFAULT 1,
  CONSTRAINT fk_rpfas_alignment FOREIGN KEY (alignment_id) REFERENCES result_pool_funding_alignment(id),
  INDEX idx_rpfas_alignment (alignment_id),
  INDEX idx_rpfas_lever (lever_code)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;
```

#### 5.1.7 `result_pool_funding_indicator_mapping` (new)

```sql
CREATE TABLE result_pool_funding_indicator_mapping (
  id                                BIGINT PRIMARY KEY AUTO_INCREMENT,
  result_id                         BIGINT NOT NULL,
  lever_code                        VARCHAR(50) NOT NULL,
  indicator_code                    VARCHAR(100) NOT NULL,
  indicator_type                    VARCHAR(50) NOT NULL,           -- output | outcome | 2030-outcome
  -- pointers to existing typed result tables (D2 reuse path):
  result_capacity_sharing_id        BIGINT NULL,
  result_knowledge_product_id       BIGINT NULL,
  result_policy_change_id           BIGINT NULL,
  result_innovation_dev_id          BIGINT NULL,
  result_innovation_use_id          BIGINT NULL,  -- gated on D5
  other_contribution_narrative      TEXT NULL,    -- for type 4/8
  is_stale                          TINYINT(1) NOT NULL DEFAULT 0,
  -- Audit
  created_by                        BIGINT NOT NULL,
  created_at                        DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_by                        BIGINT NULL,
  updated_at                        DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  is_active                         TINYINT(1) NOT NULL DEFAULT 1,
  CONSTRAINT fk_rpfim_result FOREIGN KEY (result_id) REFERENCES results(result_id),
  UNIQUE KEY uq_rpfim_result_indicator (result_id, lever_code, indicator_code, is_active),
  INDEX idx_rpfim_result (result_id),
  INDEX idx_rpfim_indicator (lever_code, indicator_code),
  INDEX idx_rpfim_stale (is_stale)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;
```

> The 5 nullable FK columns point at the existing typed result tables. Each mapping row carries **at most one** non-null FK (or `other_contribution_narrative`) — enforced in the service layer + a CHECK constraint if MySQL version permits.

#### 5.1.8 `result_review_history` (new)

```sql
CREATE TABLE result_review_history (
  id              BIGINT PRIMARY KEY AUTO_INCREMENT,
  result_id       BIGINT NOT NULL,
  version_id      BIGINT NULL,
  actor_user_id   BIGINT NOT NULL,
  event_type      VARCHAR(50) NOT NULL,         -- e.g. POOL_FUNDING_ALIGNMENT_CHANGED, REVIEW_DECISION, INDICATOR_MAPPING_CHANGED
  decision        VARCHAR(20) NULL,             -- APPROVE | REJECT | EDIT
  justification   TEXT NULL,
  payload_before  JSON NULL,
  payload_after   JSON NULL,
  created_at      DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  CONSTRAINT fk_rrh_result FOREIGN KEY (result_id) REFERENCES results(result_id),
  INDEX idx_rrh_result_created (result_id, created_at),
  INDEX idx_rrh_event_type (event_type)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;
```

### 5.2 OpenSearch decoration

Add decorators on:

- `agresso_contract.is_pool_funding_contributor`.
- `result.is_synced_to_prms`.
- `result.prms_result_code`.
- `result_pool_funding_indicator_mapping.indicator_code`, `lever_code`, `is_stale`.

After migration, run a one-off reindex (Phase 0 task).

### 5.3 Migration order (deploy)

1. Add columns (non-breaking).
2. Add new rows in `reporting_platform`, `result_status`.
3. Create new tables.
4. Add workflow rows.
5. Code deploy.
6. One-off OpenSearch reindex.

---

## 6. API design

> Every endpoint uses ARI's standard envelope (`ServerResponseDto`) and `@Roles(...)` per [`../../detailed-design/detailed-design.md` §4–§8](../../detailed-design/detailed-design.md).

### 6.1 US1 — Project tag

#### `PATCH /api/v1/agresso/contracts/:contract-code/pool-funding-tag`

- **Guards:** `RolesGuard`. **Roles:** `CENTER_ADMIN`, `SYSTEM_ADMIN`.
- **Body:** `{ "is_pool_funding_contributor": boolean }`.
- **Errors:** 400 (non-bilateral contract), 401, 403, 404.
- **Side effects:** audit write, OpenSearch reindex of the contract document, optional `sync.w3-registry.completed` Socket.IO event when triggered by the cron job.

#### `GET /api/v1/agresso/contracts` (extension)

- Adds `?pool-funding-contributor=true|false` filter.

### 6.2 US2 — Pool Funding Alignment

#### `GET /api/v1/results/:result-code/pool-funding-alignment`

- **Guards:** `RolesGuard` (any authenticated user with read access to the result).
- **Response data:**
  ```ts
  {
    eligible: boolean,            // project is Pool Funding Contributor
    has_contribution: boolean | null,
    selected_levers: Array<{ lever_code: string; lever_name: string }>,
    is_synced_to_prms: boolean,
    is_read_only: boolean
  }
  ```

#### `PATCH /api/v1/results/:result-code/pool-funding-alignment`

- **Guards:** `RolesGuard` + new **`ResultOwnerGuard`** (Creator/PI/contact/admin).
- **NO `ResultStatusGuard`** — AR.1 explicitly allows editing in `Approved`.
- **Body:** `UpdatePoolFundingAlignmentDto`:
  ```ts
  {
    has_contribution: boolean,
    lever_codes: string[],          // ignored if has_contribution = false
    justification?: string          // recommended for audit; not required by AR.3
  }
  ```
- **Errors:** 400, 401, 403, 404, 409 (already synced — per R-BIL-015).
- **Side effects:** audit row in `result_review_history` (event `POOL_FUNDING_ALIGNMENT_CHANGED`), Socket.IO event `result.pool-funding-alignment.changed`.

### 6.3 US3 — Indicator panel

#### `GET /api/v1/results/:result-code/pool-funding-alignment/indicators`

- **Guards:** `RolesGuard`.
- **Response data:** array grouped by SP:
  ```ts
  Array<{
    lever_code: string;
    lever_name: string;
    indicators: Array<{
      indicator_code: string;
      indicator_name: string;
      indicator_type: 'output' | 'outcome' | '2030-outcome';
      target_description: string | null;
      is_active: boolean;
      is_mapped: boolean;
      is_stale: boolean;
    }>;
  }>
  ```
- **Query params:** `search`, `indicator-type` (filter).

### 6.4 US4 — Indicator mapping

#### `POST /api/v1/results/:result-code/pool-funding-alignment/indicators/:indicator-code/contribution`

- **Guards:** `RolesGuard` + `ResultOwnerGuard`.
- **Body:** discriminated by `indicator_type`:
  ```ts
  // capacity_sharing
  { type: 'capacity_sharing', women: number, men: number, non_binary: number, has_unkown_using: boolean, capdev_term_id: number, capdev_delivery_method_id: number }
  // knowledge_product
  { type: 'knowledge_product', handle: string, knowledge_product_type: string, licence: string, peer_reviewed: boolean, is_isi: boolean, accessibility: boolean }
  // policy_change
  { type: 'policy_change', policy_type_id: number, policy_stage_id: number, implementing_organizations: Array<{ institution_id: number }>, amount?: { amount: number, status_amount_id: number } }
  // innovation_development
  { type: 'innovation_development', innovation_typology: { code: number }, innovation_developers: string, readinness_level_id: number }
  // innovation_use (gated D5)
  // other_output | other_outcome
  { type: 'other_output' | 'other_outcome', narrative: string }
  ```
- **Validation:** `ValidationPipe({ whitelist: true, forbidNonWhitelisted: false, transform: true })`. Per-type required-field validation enforced by `class-validator` discriminated unions.
- **Errors:** 400 (validation), 403 (not owner), 404 (no alignment or indicator), 409 (already synced).

#### `PATCH .../contribution` — same body shape; partial update allowed.
#### `DELETE .../contribution` — soft-delete (`is_active=false`).

### 6.5 US5 — Push to PRMS

#### `POST /api/v1/admin/bilateral/push/:result-code/retry`

- **Guards:** `RolesGuard`. **Roles:** `CENTER_ADMIN`, `SYSTEM_ADMIN`, `TECHNICAL_SUPPORT`.
- **Body:** `{ force?: boolean }` — when `true`, ignores the "permanent error" gate (admin override).
- **Side effects:** enqueues a push attempt; emits Socket.IO event on completion.

#### `GET /api/v1/admin/bilateral/push-failures`

- Paged list of results with `is_synced_to_prms = false` AND at least one failed `sync_process_log` row in the last N days.

### 6.6 US6 / US7 — Admin sync

#### `POST /api/v1/admin/sync/w3-registry?dry-run=true|false`
#### `POST /api/v1/admin/sync/sp-toc?dry-run=true|false`

- **Guards:** `RolesGuard`. **Roles:** `SYSTEM_ADMIN`, `TECHNICAL_SUPPORT`, `CENTER_ADMIN`.
- **Response:** diff summary (added / removed / unchanged counts + error details).

### 6.7 Swagger

Every endpoint declares:

- `@ApiTags('Bilateral')` (and `'Admin / Sync'` for admin endpoints).
- `@ApiBearerAuth()`.
- `@ApiOperation({ summary, description })`.
- `@ApiQuery` / `@ApiBody` for params and bodies.
- `@ApiResponse` for the documented status codes.

---

## 7. Backend module design

### 7.1 `domain/entities/bilateral/bilateral.module.ts`

Imports:

- `TypeOrmModule.forFeature([ResultPoolFundingAlignment, ResultPoolFundingAlignmentSp, ResultPoolFundingIndicatorMapping])`.
- `AgressoContractModule` (for the tag lookup).
- `ClarisaModule` (for Lever name resolution).
- `ResultsModule` (for the host `Result` aggregate).
- `ResultReviewHistoryModule`.
- `BilateralPushModule` (for triggering push on `BILATERAL_APPROVED` transitions).
- `SocketModule` (for emitting `result.pool-funding-alignment.changed`).

Providers: `BilateralService`, the 6 handlers, `ResultOwnerGuard`.

### 7.2 `BilateralService`

Public methods (one per US):

```ts
class BilateralService {
  getAlignment(resultCode: string, user: User): Promise<AlignmentResponse>;
  updateAlignment(resultCode: string, dto: UpdatePoolFundingAlignmentDto, user: User): Promise<AlignmentResponse>;

  listIndicators(resultCode: string, query: ListIndicatorsQueryDto, user: User): Promise<IndicatorGroupResponse[]>;

  upsertContribution(resultCode: string, indicatorCode: string, dto: ContributionDto, user: User): Promise<MappingResponse>;
  deleteContribution(resultCode: string, indicatorCode: string, user: User): Promise<void>;

  reviewDecision(resultCode: string, dto: ReviewDecisionDto, user: User): Promise<void>;   // triggers status transition
}
```

Internals:

- All writes inside a transaction via `QueryRunner` / `Repository.manager.transaction`.
- Dispatches to the matching `BilateralIndicatorTypeHandler` based on `indicator_type` from the catalog.
- Always writes a `result_review_history` row.
- On a `BILATERAL_APPROVED` transition (via `reviewDecision`):
  1. snapshot the `Result` (`is_snapshot=true`, bump `version_id`) per **D10**.
  2. enqueue a `BilateralPushQueue` message with the snapshot's `result_id + version_id`.

### 7.3 Handler interface

```ts
interface BilateralIndicatorTypeHandler {
  readonly indicatorType: string;
  validate(dto: ContributionDto): void;                    // throw on invalid
  upsert(ctx: HandlerContext, dto: ContributionDto): Promise<{ fkField: string; fkId: number }>;
  delete(ctx: HandlerContext): Promise<void>;              // soft-delete
}
```

Concrete handlers delegate to existing ARI services (`ResultCapacitySharingService`, `ResultKnowledgeProductService`, etc.).

### 7.4 `domain/tools/bilateral-push/`

- **`BilateralPushService`** — builds the PRMS payload via `ResultToPrmsMapper`; calls `BilateralPushConnection.send(payload, idempotencyKey)`.
- **`BilateralPushConnection`** — wraps axios with timeout + retry on 5xx; reads PRMS host + auth from env (`ARI_PRMS_BILATERAL_URL`, plus auth env per **D-push-auth**).
- **`BilateralPushQueueConsumer`** — RMQ message handler. Pulls a queued push, executes it, writes `sync_process_log`, emits Socket.IO event.
- **`bilateral-push.cron.ts`** — periodic retry of `sync_process_log` rows in `RETRYABLE_FAILED` state with exponential backoff (per R-BIL-044).

### 7.5 `domain/tools/w3-registry/` and `domain/tools/sp-toc-sync/`

Both follow the same pattern:

- `*Connection` — encapsulates the upstream transport (HTTP / file / S3 / SharePoint per **D-source-w3**).
- `*Service.run(opts: { dryRun: boolean })` — fetch → parse → diff → apply (or report for dry-run) → write `sync_process_log` → emit Socket.IO event.
- `*Cron` — schedules nightly run; reuses the service.

### 7.6 `ResultOwnerGuard`

```ts
@Injectable()
export class ResultOwnerGuard implements CanActivate {
  constructor(
    private readonly resultsUtil: ResultsUtil,
    private readonly resultUsersService: ResultUsersService,    // already exists
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const user = req.user;
    if (!user) return false;
    if (user.roles?.includes(SecRolesEnum.SYSTEM_ADMIN)) return true;
    if (user.roles?.includes(SecRolesEnum.CENTER_ADMIN)) return true;

    const resultId = this.resultsUtil.resultId;
    return this.resultUsersService.isUserOnResult(resultId, user.sec_user_id, ['CREATOR', 'PI', 'CONTACT']);
  }
}
```

Used in combination with `@UseGuards(RolesGuard, ResultOwnerGuard)`.

### 7.7 Re-review semantics (D7 = B)

Allow `BILATERAL_APPROVED` → `BILATERAL_PENDING_REVIEW` via a `POST /api/v1/results/:result-code/status/transitions` body `{ to: "BILATERAL_PENDING_REVIEW", justification }`. Justification is required. After the transition, `is_synced_to_prms` resets to `false` (alignment + mapping become editable again). Pre-existing `prms_result_code` is preserved so the next push uses the **same** `idempotencyKey` (`result_code + version_id`) — the new `version_id` makes it a new push from PRMS's perspective.

### 7.8 Logging & metrics

- `LoggerUtil` everywhere.
- `sync_process_log` row types: `W3_REGISTRY`, `SP_TOC`, `BILATERAL_PUSH`, `BILATERAL_PUSH_RETRY`.
- Metrics names: `bilateral.alignment.changed`, `bilateral.mapping.upserted`, `bilateral.push.attempted`, `bilateral.push.succeeded`, `bilateral.push.failed`, `bilateral.sync.w3.duration`, `bilateral.sync.sp-toc.duration`.

---

## 8. Frontend / UX component architecture

> Out of scope of the ARI repo, but documented here so STAR engineers and reviewers have one canonical view.

### 8.1 STAR pages affected

| Page | Component additions |
| --- | --- |
| Projects list | New column `Pool Funding Contributor` + filter chip |
| Project detail header | Badge `Pool Funding Contributor` (when true) |
| Result creation flow | Project selector shows the badge |
| Result detail | New `PoolFundingAlignmentSection`, `IndicatorPanel`, `IndicatorContributionForm` (one variant per indicator type) |
| Admin / sync | `BilateralPushFailures` table (new) — also surfaced inside the ARI admin SSR panel under `/admin/bilateral/push-failures` |

### 8.2 PoolFundingAlignmentSection (US2)

```
┌─ Pool Funding Alignment ──────────────────────────┐
│  Does this result contribute to Pool Funding?     │
│  ( ) Yes      ( ) No                              │
│  ─────────────────────────────────────────────────│
│  Science Programs / Accelerators (multi-select)   │
│  [chip] SP01  [chip] AC02  [+]                    │
│                                                   │
│  [ Synced to PRMS — read only ]   ← AR.2 state    │
└───────────────────────────────────────────────────┘
```

### 8.3 IndicatorPanel (US3) + IndicatorContributionForm (US4)

```
┌─ Indicators ──────────────────────────────────────┐
│  ▾ SP01 — Adaptive crops                          │
│      ☐ KP01  Knowledge products                   │
│      ☑ CD02  People trained                       │
│           ┌─ Contribution ──────────────────────┐ │
│           │  Women:  [150]   Men:  [120]        │ │
│           │  Non-binary: [5] Unknown: [10]      │ │
│           │  Term: [Short-term ▾]                │ │
│           │  Delivery method: [In person ▾]      │ │
│           └──────────────────────────────────────┘ │
│  ▾ AC02 — Accelerator name                        │
│      ☐ ...                                        │
└───────────────────────────────────────────────────┘
```

Inline contribution form per indicator (matches D-MK-5).

### 8.4 Tokens, a11y

Inherit from STAR's design system. WCAG 2.1 AA per NFR-BIL-005. Status badges combine icon + text label (never color-only).

### 8.5 Admin SSR pages (in this repo)

Three new pages under `src/admin/client/pages/` per [`src/admin/README-REACT.md`](../../../server/researchindicators/src/admin/README-REACT.md):

- `SyncW3Registry.tsx` — table of `sync_process_log` rows + manual trigger + dry-run button.
- `SyncSpToc.tsx` — same shape.
- `BilateralPushFailures.tsx` — list of failed pushes + retry button.

---

## 9. Shared contracts & package extensions

### 9.1 `ResultToPrmsMapper`

The single source of truth for STAR → PRMS payload translation. Path: `domain/tools/bilateral-push/mappers/result-to-prms.mapper.ts`.

Inputs: snapshot of `Result` + its alignment + indicator mappings + typed result rows.
Output: `RootResultsDto`-compatible JSON exactly matching [`./prms-context/01-prms-backend-summary.md` §6–§9](./prms-context/01-prms-backend-summary.md).

Test fixtures live under `test/fixtures/prms-payload/` (one per result type) and are validated against `onecgiar-pr-server/docs/bilateral-result-summaries.en.md` via a Jest snapshot test.

### 9.2 Socket.IO event payloads

```ts
// result.pool-funding-alignment.changed
{ result_code: string, by_user_id: number, at: string }

// result.bilateral.push.succeeded
{ result_code: string, prms_result_code: string, at: string }

// result.bilateral.push.failed
{ result_code: string, error_summary: string, attempt: number, will_retry: boolean, at: string }

// sync.w3-registry.completed | sync.sp-toc.completed
{ added: number, removed: number, unchanged: number, errors: number, at: string }
```

### 9.3 RabbitMQ messages

Queue: existing `ARI_QUEUE`. New routing keys:

- `bilateral.push.requested` — enqueued by `BilateralService` on approve.
- `bilateral.push.retry` — enqueued by `bilateral-push.cron.ts` for transient retries.

### 9.4 OpenSearch document extensions

`Result` index gains `is_synced_to_prms` and `prms_result_code`. `AgressoContract` index gains `is_pool_funding_contributor`. `Indicator` index (new or extension) keyed by `lever_code + indicator_code`.

---

## 10. Workflows & business rules

### 10.1 Pool Funding Alignment edit (US2)

```
PI saves PoolFundingAlignment
   ↓
ResultOwnerGuard.canActivate → ok
   ↓
Service.updateAlignment in transaction:
   1. Load result + project (Result + AgressoContract)
   2. Verify project.is_pool_funding_contributor (else 400)
   3. Verify result.is_synced_to_prms = false (else 409)
   4. Soft-delete previous active alignment row + SP rows
   5. Insert new alignment row + SP rows
   6. Write result_review_history (POOL_FUNDING_ALIGNMENT_CHANGED)
   7. If result.status == BILATERAL_APPROVED:
        snapshot the result (D10, R-5 mitigation: snapshot only here, not on every keystroke)
   8. Commit
Emit Socket.IO event
Return ServerResponseDto
```

### 10.2 Indicator mapping (US4)

```
PI saves contribution payload for indicator
   ↓
ResultOwnerGuard + ResultStatusGuard? NO — alignment editing allowed even after Approved (AR.1)
   ↓
Service.upsertContribution in transaction:
   1. Verify alignment exists for result + lever code in the request
   2. Verify indicator exists + is_active in catalog
   3. Dispatch to BilateralIndicatorTypeHandler.upsert based on indicator_type
   4. Persist mapping row pointing at the new typed table row id
   5. Write result_review_history (INDICATOR_MAPPING_CHANGED)
   6. Commit
Return mapping payload
```

### 10.3 Review decision (status transition)

```
Reviewer (MEL/CenterAdmin) POSTs status/transitions { to: BILATERAL_APPROVED, justification }
   ↓
ResultStatusGuard verifies transition allowed
   ↓
Service.reviewDecision in transaction:
   1. Validate justification for REJECT (NOT NULL)
   2. Snapshot result (D10): is_snapshot=true; bump version_id
   3. Update result_status_id to target status
   4. Write result_review_history (REVIEW_DECISION)
   5. If APPROVED: enqueue bilateral.push.requested
   6. Commit
Emit Socket.IO event
```

### 10.4 Push to PRMS

```
RabbitMQ consumer receives bilateral.push.requested
   ↓
PushService.execute:
   1. Load snapshot (Result + alignment + mappings + typed rows)
   2. Skip stale mappings (R-BIL-035) → log as warnings in sync_process_log
   3. Mapper builds PRMS payload (RootResultsDto shape)
   4. Compute idempotencyKey = sha1(result_code + version_id)
   5. Connection.send(payload, idempotencyKey):
        - on 2xx: persist prms_result_code, set is_synced_to_prms=true, lock alignment/mapping
                  emit result.bilateral.push.succeeded
        - on 5xx/timeout: log RETRYABLE_FAILED, schedule retry via cron with exp backoff
                  emit result.bilateral.push.failed (will_retry=true)
        - on 4xx: log PERMANENT_FAILED, no retry
                  emit result.bilateral.push.failed (will_retry=false)
```

### 10.5 Sync — W3 Registry / SP ToC (US6 / US7)

```
Cron fires (default daily)
   ↓
Service.run({ dryRun: false }) in transaction-per-batch:
   1. Connection.fetchLatest() → upstream rows
   2. Diff against local
   3. Apply (skip if dryRun) using transactional batches
   4. Write sync_process_log
   5. Reindex OpenSearch on success
Emit sync.<job>.completed event
```

---

## 11. Security & authorization

| Aspect | Decision | Reference |
| --- | --- | --- |
| Inbound auth (machine-to-machine, if exposed) | ARI machine token (`Bearer base64({client_id, client_secret})`) validated against `app_secrets` + `app_secret_host_list`. **No JWT exclusion.** | D1 |
| Inbound auth (human) | ROAR JWT via `JwtMiddleware`. | baseline |
| Outbound auth to PRMS | **CARRY FORWARD: D-push-auth.** Default proposal: ARI mints a `client_id/client_secret` machine token shaped per PRMS's expectations; or PRMS issues us a static API key. Confirm with PRMS team. | D-push-auth |
| Per-endpoint roles | See §6. Reviewer endpoints: `MEL_REGIONAL_EXPERT`, `CENTER_ADMIN`, `SYSTEM_ADMIN`. Owner endpoints: `ResultOwnerGuard` (any role that owns the result). | D6, NFR-BIL-002 |
| Rate limiting | `express-rate-limit` per-`client_id` for inbound; AWS API Gateway level recommended. | D15, NFR-BIL-011 |
| Secret handling | Env vars + `app_secrets`. `LoggerUtil` MUST strip Authorization/`auth` headers and `idempotencyKey`. | NFR-BIL-002 |

### 11.1 New ESLint rule (optional)

Add a rule banning `console.log` / `Logger.log` with payload arguments named `headers`, `authorization`, `token`, `secret`, `idempotencyKey`. Owner: DevOps. Out of strict scope of this design but recommended.

---

## 12. Observability

- **Logs**: every service method via `LoggerUtil`. Failure paths log with `_error`; success at `_verbose` in non-prod when `SEE_ALL_LOGS=true`.
- **`sync_process_log`**: row per sync run / push attempt with start, end, counts, errors. Already-existing table.
- **Metrics**: per §7.8. Wired to CloudWatch via the existing log/metric pipeline.
- **Dashboard**: 1 CloudWatch dashboard ("Bilateral module") owned by the team:
  - tile: push success rate (7-day rolling)
  - tile: push p95 latency
  - tile: alignment changes per hour
  - tile: indicator mappings per hour
  - tile: sync job duration
  - tile: pending push retries count
- **Alarms**: success rate < 95% over 1 hour → page on-call (channel TBD).

---

## 13. Testing strategy

| Layer | Coverage |
| --- | --- |
| Unit | Each new service / handler / mapper / guard has a sibling `*.spec.ts`. Coverage ≥ 60% per the existing Jest config. |
| Repository | Tested via service tests with mocked repos (no DB in unit). |
| Integration | `TEST` datasource (env-isolated MySQL): full ingestion + sync + push flows. |
| E2E | Supertest in `test/`: every new endpoint, happy path + auth-failure path + role-denial path. Pool Funding Alignment editing in `Approved` state (AR.1). 409 after sync (AR.2). |
| Contract / payload-shape | Snapshot tests of `ResultToPrmsMapper` output against `onecgiar-pr-server/docs/bilateral-result-summaries.en.md` fixtures. |
| Idempotency | E2E: replay the same push 3× → verify `prms_result_code` unchanged + no duplicate PRMS rows. |
| Failure injection | `MockedConnection` returns 5xx / 4xx / timeout to test retry + permanent-failure paths. |
| Migrations | Forward + revert tested on the `TEST` datasource. |
| OpenSearch | Index mapping diff before/after migration. |
| Accessibility | axe-core on STAR pages (out of this repo). |

---

## 14. Rollout

### 14.1 Order

1. Migrations apply (idempotent against prod copy in staging first).
2. Code deploy with all new endpoints **gated behind a feature flag** (env `ARI_BILATERAL_MODULE_ENABLED=true|false`). Default `false` in prod.
3. Enable flag in staging; run integration tests.
4. Enable W3 Registry sync in **dry-run** mode for 1 cycle; review diff with the System Office.
5. Enable W3 Registry sync in **apply** mode.
6. Run SP ToC sync in dry-run; review with CLARISA team.
7. Enable SP ToC sync in apply mode.
8. Pilot Phase 1 (US1 + US2) with 1 launch Center (TBC).
9. Roll Phase 2 (US3 + US4) once Phase 1 is stable.
10. Roll Phase 3 (US5) once D-push-auth is closed with PRMS.

### 14.2 Feature flags

- `ARI_BILATERAL_MODULE_ENABLED` — master toggle.
- `ARI_BILATERAL_PUSH_ENABLED` — sub-toggle for US5.
- `ARI_BILATERAL_W3_SYNC_ENABLED` — sub-toggle for US6.
- `ARI_BILATERAL_SP_TOC_SYNC_ENABLED` — sub-toggle for US7.

### 14.3 Backout

- Each toggle individually flippable.
- Migrations are append-only; revert per migration as a last resort (`npm run migration:revert`).
- Soft-deleted alignment / mapping rows can be reactivated (`is_active = 1`).

### 14.4 Comms

- Pre-launch note to launch Centers.
- API change announcement to PRMS team (US5 push timing).
- Internal release notes referencing this spec.

---

## 15. Design decisions

> Every decision below either **resolves** an open carry-forward decision from `./requirements.md` §10 or **introduces a new design-time decision**. Add new ones to the bottom over time.

| # | Decision | Resolution in this design | Rationale |
| --- | --- | --- | --- |
| D1 | Inbound ingestion auth | **A — machine token** | Reuses existing ARI mechanism; no JWT-exclusion needed. |
| D2 | Contributor model (alignment storage) | **Dedicated table** (`result_pool_funding_alignment` + `_sp`) | Cleaner read/write semantics; isolates lifecycle differences from Lever assignment. |
| D3 | ToC depth | **B — Lever-only Phase 1**; full ToC port deferred to Phase 2 spec | Matches Phase 1 timing; CLARISA already exposes Lever data; avoids porting PRMS ToC tree. |
| D4 | Bilateral projects model | **A — AGRESSO contracts** | Already authoritative; tag becomes a column on existing entity. |
| D5 | `result_innovation_use` | **C — defer Phase 1** | Innovation Use is not launch-critical. Add a new entity in a Phase 2 spec if/when needed. |
| D6 | Reviewer role | **A — existing roles** `MEL_REGIONAL_EXPERT` + `CENTER_ADMIN` (+ `SYSTEM_ADMIN`) | No new role required; matches PRMS expectations. |
| D7 | Re-review allowed | **B — yes** with justification + new `version_id` per re-entry | Real product need (a Center can amend after rejection). |
| D8 | Missing CLARISA catalogs | **A — add to CLARISA** (where missing) | Master data authority. |
| D9 | KP metadata source | **DEFER for Phase 1 — exclude KP from initial push.** Add `tools/cgspace-integration/` in Phase 2. | Avoid blocking Phase 1 on a new external integration. |
| D10 | Snapshot on approval | **A — snapshot on every status transition** | Aligns with ARI versioning; supports idempotent push. |
| D11 | Sync wrapper shape | **C — dual envelope** | Internal callers get `ServerResponseDto`; downstream-compatible raw wrapper via `?raw=true`. Push to PRMS uses the PRMS contract verbatim. |
| D12 | Backend-compatible typos | **A — preserve** | Contract stability. |
| D13 | Innovation Package | **B — defer** | Not in Phase 1 bilateral data flow. |
| D14 | Soft-delete | **A — soft-delete** (`is_active=false`) | Auditability. |
| D15 | Rate limiting on ingestion | **B + C — per-`client_id` + AWS GW** | Defense in depth. |
| D16 | Real-time event taxonomy | **A — emit** the events in §9.2 | Better cross-user UX. |
| **D-status-1** | New statuses | **Define** `BILATERAL_PENDING_REVIEW / APPROVED / REJECTED` + 5 workflow rows | Required for the lifecycle. |
| **D-push-auth** | Outbound auth to PRMS | **CARRY FORWARD** — default proposal: ARI sends a machine-token shape to PRMS or a static API key issued by PRMS. Must confirm with PRMS team before Phase 3 starts. | External dependency. |
| **D-push-trigger** | Sync inside Approve txn vs async | **B — async via RabbitMQ + cron** | Resilience; doesn't block the human review action on a network call. |
| **D-source-w3** | W3 Registry source | **CARRY FORWARD** — must confirm with System Office before Phase 3 starts. | External dependency (OQ-B). |
| **D-cadence** | Sync cadence | **Daily**; tunable via env | Common default; can change without code. |
| **D-result-owner-guard** | Per-result ownership check | **NEW — `ResultOwnerGuard`** at `domain/shared/guards/result-owner.guard.ts` | Needed for US2 / US4 owner gate; reusable elsewhere. |
| **D-snapshot-policy** | When to snapshot | **Only on status transitions**, not on alignment / mapping edits (mitigates R-5) | Prevents snapshot proliferation. |
| **D-soft-delete-uniqueness** | Uniqueness on alignment / mapping rows | Use unique key `(result_id, is_active)` so a soft-deleted row co-exists with the active replacement | Required by D14 + the active-replacement pattern. |
| **D-stale-mapping-push** | Stale mappings + push | Stale mappings are **excluded** from the PRMS payload (R-BIL-035) and logged as warnings | Prevents pushing inconsistent data. |
| **D-feature-flags** | Per-feature toggles | 4 env-var flags (master + push + W3 + SP-ToC) | Safe incremental rollout. |

---

## 16. Carry-forward open questions

> These remain unresolved at the end of design. They are tracked as `BLOCKER` tasks in [`./tasks.md`](./tasks.md). The Phase associated cannot start until the matching question closes.

| OQ | Description | Phase blocked | Owner |
| --- | --- | --- | --- |
| OQ-B / D-source-w3 | W3 Registry source location | Phase 3 (US6) | System Office liaison |
| D-push-auth / OQ-US5-1 | Outbound auth to PRMS | Phase 3 (US5) | PRMS team |
| OQ-US5-3 | PRMS per-row error model | Phase 3 (US5) | PRMS team |
| OQ-US5-6 | Re-push policy after re-review | Phase 3 (US5) | PO + PRMS team |
| OQ-A | Reviewer persona | Phase 1 onwards | PO |
| OQ-G | Real-time UX necessity | Phase 1 onwards | PO + STAR FE |

---

## 17. References

- [`./requirements.md`](./requirements.md)
- [`./prms-context/01-prms-backend-summary.md`](./prms-context/01-prms-backend-summary.md)
- [`./prms-context/02-ari-mapping.md`](./prms-context/02-ari-mapping.md)
- [`./prms-context/03-reuse-and-decisions.md`](./prms-context/03-reuse-and-decisions.md)
- [`./prms-context/04-glossary.md`](./prms-context/04-glossary.md)
- [`./jira-us/README.md`](./jira-us/README.md) and the 8 US files therein.
- [`../../detailed-design/detailed-design.md`](../../detailed-design/detailed-design.md)
- [`../../system-design/design.md`](../../system-design/design.md)
- [`../../prd.md`](../../prd.md)
- [`../general-setup/design.md`](../general-setup/design.md)
- [`../../../server/researchindicators/src/CLAUDE.md`](../../../server/researchindicators/src/CLAUDE.md)
- PRMS field-level export contract: `onecgiar-pr-server/docs/bilateral-result-summaries.en.md` (external repo).
