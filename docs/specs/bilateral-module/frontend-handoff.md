# Frontend Handoff — Bilateral module (ARI → STAR)

> **Audience:** STAR frontend engineer integrating the bilateral module against the ARI backend.
> **Purpose:** single landing page for endpoints, auth, events, flags, and payload shapes. Every section links back to the canonical SDD source so this doc never silently drifts.
> **Companion docs (canonical, this file links to them):** [`./requirements.md`](./requirements.md) · [`./design.md`](./design.md) · [`./tasks.md`](./tasks.md) · [`./test-report.md`](./test-report.md) · [`./jira-us/`](./jira-us/).
> **STAR-side tasks tracking this handoff:** `T-13` (US1 project tag visibility), `T-14` (US2 alignment section), `T-19` (US3/US4 indicator panel + contribution forms) — see [`./tasks.md` §6, §7](./tasks.md).
> **Branch this is built against:** `AC-1594-bilateral-module` (merged with `staging` as of 2026-05-19).

---

## 1. Read this first

- The bilateral module lives **inside an existing result**. Every alignment / indicator / contribution endpoint is a sub-resource of `/api/v1/results/:resultCode/pool-funding-alignment`.
- The "section" only renders if the result's primary AGRESSO contract is tagged `is_pool_funding_contributor = true`. The eligibility flag is returned by `GET .../pool-funding-alignment` — see [§4.2](#42-get-alignment).
- The backend treats Pool Funding Alignment as **outside the normal result status workflow** (per `R-BIL-014` / AR.1) — see [§5](#5-businessuxux-rules-the-fe-must-honour).
- After the result is pushed to PRMS (`R-BIL-015` / AR.2), all bilateral mutations return `409 Conflict`. The same flag is exposed as `is_read_only` on the GET so the UI can disable inputs *before* the user tries.
- Phase 3 endpoints (push retry, W3 sync, SP ToC sync) are **not yet implemented** — see [§9](#9-whats-live-vs-pending).

---

## 2. Auth, roles & ownership

> Canonical: [`./design.md` §11](./design.md), root [`CLAUDE.md` §4](../../../CLAUDE.md).

- Every request needs `Authorization: Bearer <ROAR-JWT>` (humans) **or** `Authorization: Basic base64({client_id, client_secret})` (machine-to-machine).
- Authorization combines **roles** (`@Roles(...)`) and, for mutations on a result, **ownership** (`ResultOwnerGuard`).

| Role (`SecRolesEnum`) | What it can do |
| --- | --- |
| `CONTRIBUTOR` | Edit alignment + mappings only when they are the result's Creator / PI / contact (ownership check). |
| `CENTER_ADMIN` | Bypasses ownership; can edit alignment + mappings; can mutate AGRESSO Pool Funding tag. |
| `SYSTEM_ADMIN` | Bypasses both role + ownership; can do everything. |
| `MEL_REGIONAL_EXPERT`, `TECHNICAL_SUPPORT` | Read-only on bilateral surfaces today. |

- `403 Forbidden` envelope (`description` mentions "role insufficiency") fires on either role denial or ownership denial.
- `401 Unauthorized` fires when the token is missing/invalid/expired.

---

## 3. Response envelope & error model

> Canonical: [`./design.md` §6](./design.md), root [`CLAUDE.md` §4](../../../CLAUDE.md).

Every HTTP response — success **and** error — uses `ServerResponseDto`:

```ts
{
  data: T | null;              // per-endpoint payload (see §4 for shapes)
  status: number;              // HTTP status mirror, e.g. 200 / 400 / 403 / 409
  description: string;         // human-readable summary, OK to surface to users
  errors: unknown | null;      // per-endpoint error detail (validation errors, etc.)
  timestamp: string;           // ISO 8601
  path: string;                // request path
}
```

Status codes the FE has to handle explicitly for this module:

| Code | When | What to show |
| --- | --- | --- |
| `200` | Read / mutation success | Render `data`. |
| `400` | Validation error (missing fields, wrong types, non-bilateral contract on AGRESSO tag) | Use `description` + `errors` to surface form-level messages. |
| `401` | Missing/invalid token | Bounce to login. |
| `403` | Role or ownership denial | Show "you can't edit this" affordance; hide CTA. |
| `404` | Mapping / contribution not found on DELETE | Treat as "already gone." |
| `409` | Result is already synced to PRMS (`is_synced_to_prms = true`) | Show synced badge + disable inputs; never retry. |

---

## 4. API surface (Phase 1 + Phase 2 — live today)

> Canonical: [`./design.md` §6](./design.md), [`./requirements.md` §9.1](./requirements.md). All query params are **kebab-case**; body fields are **snake_case**. Verified against `bilateral.controller.ts` + `agresso-contract.controller.ts` 2026-05-19.

### 4.1 AGRESSO Pool Funding tag (US1)

| Verb | Path | Auth | Notes |
| --- | --- | --- | --- |
| `PATCH` | `/api/v1/agresso/contracts/:code/pool-funding-tag` | `CENTER_ADMIN`, `SYSTEM_ADMIN` | Manual override. Server enforces "contract must be bilateral". |
| `GET` | `/api/v1/agresso/contracts?pool-funding-contributor=true\|false` (and the projects-with-indicators sibling endpoint, same flag) | ROAR JWT | New `is_pool_funding_contributor: boolean` field in every contract row. |

Body for the PATCH:

```ts
// PoolFundingTagDto
{ is_pool_funding_contributor: boolean }
```

### 4.2 GET alignment

| Verb | Path | Auth |
| --- | --- | --- |
| `GET` | `/api/v1/results/:resultCode/pool-funding-alignment` | ROAR JWT |

Response `data` (`AlignmentResponse` — `dto/update-pool-funding-alignment.dto.ts`):

```ts
{
  result_code: string;
  eligible: boolean;                            // === has_pool_funding_alignment_eligible
  has_pool_funding_alignment_eligible: boolean; // alias — read either
  has_contribution: boolean | null;             // null = never set
  selected_levers: { lever_code: string; lever_name: string }[];
  is_synced_to_prms: boolean;
  is_read_only: boolean;
}
```

UX rules:
- `eligible === false` → **do not render** the Pool Funding Alignment section at all.
- `is_read_only === true` → render the section but disable every input + show a "synced — read only" badge.
- `has_contribution === false` → hide the SP picker.

### 4.3 PATCH alignment

| Verb | Path | Auth |
| --- | --- | --- |
| `PATCH` | `/api/v1/results/:resultCode/pool-funding-alignment` | `CONTRIBUTOR` + result-owner, OR `CENTER_ADMIN` / `SYSTEM_ADMIN` |

Body (`UpdatePoolFundingAlignmentDto`):

```ts
{
  has_contribution: boolean;          // required
  lever_codes?: string[];             // required when has_contribution=true; >=1 non-blank entry
  justification?: string;             // optional, goes into result_review_history
}
```

- Editing succeeds **regardless of `result_status`** (AR.1). No need to check status before showing the edit button.
- Returns `409` if `is_synced_to_prms = true` (AR.2).
- Emits Socket.IO event — see [§6](#6-real-time-events-socketio).

### 4.4 GET indicators panel

| Verb | Path | Auth |
| --- | --- | --- |
| `GET` | `/api/v1/results/:resultCode/pool-funding-alignment/indicators?search=&indicator-type=` | ROAR JWT |

Response `data` is **`IndicatorGroupResponse[]`** — one group per selected SP:

```ts
{
  lever_code: string;
  lever_name: string;
  indicators: {
    indicator_code: string;
    indicator_name: string;
    indicator_type: 'output' | 'outcome' | '2030-outcome';
    target_description: string | null;
    is_active: boolean;
    is_mapped: boolean;
    is_stale: boolean;     // R-BIL-035 — show stale badge with tooltip
  }[];
}[]
```

UX rules:
- When `indicators` arrays are empty, render an explicit "ToC catalog not yet synced" empty state — the SP ToC sync (T-31) is not implemented yet, so this is the default state today. See [§9](#9-whats-live-vs-pending).
- `is_stale === true` → show stale badge per `R-BIL-035` even if the underlying indicator is no longer active upstream.

### 4.5 Contribution upsert / delete (per indicator)

All three routes are gated by **role + result-owner** (same matrix as PATCH alignment) and require a `?lever-code=...` query (because the route only carries `indicatorCode`, and an indicator can live under multiple SPs).

| Verb | Path |
| --- | --- |
| `POST` | `/api/v1/results/:resultCode/pool-funding-alignment/indicators/:indicatorCode/contribution?lever-code=...` |
| `PATCH` | `/api/v1/results/:resultCode/pool-funding-alignment/indicators/:indicatorCode/contribution?lever-code=...` |
| `DELETE` | `/api/v1/results/:resultCode/pool-funding-alignment/indicators/:indicatorCode/contribution?lever-code=...` |

Body is a polymorphic `ContributionDto` — the per-type field shape is in [§7](#7-type-specific-contribution-payloads-d12).

Response `data` is `MappingResponse`:

```ts
{
  result_code: string;
  lever_code: string;
  lever_name: string;
  indicator_code: string;
  indicator_type: string;
  is_stale: boolean;
}
```

---

## 5. Business / UX rules the FE must honour

> Canonical: [`./requirements.md` §6.2–§6.4](./requirements.md), [`./design.md` §10](./design.md).

| Rule | Source | UX implication |
| --- | --- | --- |
| **AR.1 — Edit regardless of status.** | `R-BIL-014` | The Pool Funding Alignment edit CTA is **not** gated by `result_status`. Don't import the usual "status guard" disable logic for this section. |
| **AR.2 — Read-only after PRMS sync.** | `R-BIL-015`, `R-BIL-034` | `is_read_only=true` on GET → disable inputs and show "synced" badge. Mutations would 409 anyway. |
| **AR.3 — Alignment is not part of result submission validator.** | `R-BIL-016` | A result can transition to `SUBMITTED` with an empty alignment. The alignment section is optional — don't block result submission CTAs. |
| **Conditional render.** | `R-BIL-010` | Hide the entire section when `eligible=false`. Hide the SP picker when `has_contribution=false`. |
| **Stale catalog.** | `R-BIL-022`, `R-BIL-035` | Existing mappings to inactivated upstream indicators stay visible with `is_stale=true`; new mappings to inactive indicators are rejected by the server. |
| **Backend-compatible field typos preserved (D12).** | [`./requirements.md` §10](./requirements.md) D12, [`./jira-us/`](./jira-us/) | Form field names like `has_unkown_using` (yes, with the typo), `readinness_level_id` are deliberate — match them exactly. |
| **Authorization on editing.** | `R-BIL-013` | Only Creator / PI / contact / `CENTER_ADMIN` / `SYSTEM_ADMIN` can edit. `MEL_REGIONAL_EXPERT` and `TECHNICAL_SUPPORT` read-only. |

---

## 6. Real-time events (Socket.IO)

> Canonical: [`./design.md` §9.2](./design.md), [`../../../server/researchindicators/src/domain/tools/socket/README.md`](../../../server/researchindicators/src/domain/tools/socket/README.md).

| Event name | When emitted | Payload |
| --- | --- | --- |
| `result.pool-funding-alignment.changed` | Successful `PATCH /pool-funding-alignment` | `{ result_code: string; by_user_id: number; at: string }` |
| `result.bilateral.push.succeeded` | **Pending T-26** — fires after a successful PRMS push | TBD (will include `result_code`, `prms_result_code`, `at`). |
| `result.bilateral.push.failed` | **Pending T-26** | TBD. |
| `sync.w3-registry.completed` | **Pending T-29** | TBD. |
| `sync.sp-toc.completed` | **Pending T-31** | TBD. |

Only the first event is wired today. Subscribe per-result so multiple tabs editing the same result reconcile.

---

## 7. Type-specific contribution payloads (D12)

> Source: handler files under [`../../../server/researchindicators/src/domain/entities/bilateral/handlers/`](../../../server/researchindicators/src/domain/entities/bilateral/handlers/). Backend-compatible typos are intentional — match exactly.

Always include `indicator_type: 'capacity_sharing' | 'knowledge_product' | 'policy_change' | 'innovation_development' | 'NOOP'` on every body. Per-type required fields:

### 7.1 `capacity_sharing` (`capacity-sharing.handler.ts`)
```ts
{
  indicator_type: 'capacity_sharing';
  women: number;
  men: number;
  non_binary: number;
  has_unkown_using: boolean;        // intentional typo per D12
  capdev_term_id: number;
  capdev_delivery_method_id: number;
}
```

### 7.2 `knowledge_product` (`knowledge-product.handler.ts`)
```ts
{
  indicator_type: 'knowledge_product';
  handle: string;
  knowledge_product_type: string;
  licence: string;                  // British spelling
  peer_reviewed: boolean;
  is_isi: boolean;
  accessibility: boolean;
}
```
> Note: KP support is **partial in Phase 2** per **D9**. Full CGSpace / MQAP integration lands in a Phase 2 follow-up.

### 7.3 `policy_change` (`policy-change.handler.ts`)
```ts
{
  indicator_type: 'policy_change';
  policy_type_id: number;
  policy_stage_id: number;
  implementing_organizations: { institution_id: number; /* … */ }[];
  amount?: number;                  // optional
}
```

### 7.4 `innovation_development` (`innovation-development.handler.ts`)
```ts
{
  indicator_type: 'innovation_development';
  innovation_typology: { code: number | string };  // object — not a bare id
  innovation_developers: string;
  readinness_level_id: number;      // intentional typo per D12
}
```

### 7.5 `NOOP` (other output / outcome — `noop.handler.ts`)
```ts
{
  indicator_type: 'NOOP';
  narrative: string;                // free text — required
}
```

### 7.6 Deferred / out of scope
- **`innovation_use`** — deferred per **D5 = C**. No handler exists; do not send.
- **Innovation Package (PRMS type 10)** — deferred per **D13**.

---

## 8. Feature flags

> Canonical: [`../../../server/researchindicators/src/CLAUDE.md` §8.1](../../../server/researchindicators/src/CLAUDE.md), [`./design.md` §14](./design.md).

| Flag (env var) | Gates | Default | FE impact |
| --- | --- | --- | --- |
| `ARI_BILATERAL_MODULE_ENABLED` | Whole module (controllers + admin endpoints) | `false` | When `false`, every `/pool-funding-alignment` route returns 404. Surface a generic "feature unavailable" empty state. |
| `ARI_BILATERAL_PUSH_ENABLED` | Push to PRMS (T-26) | `false` | Approval transitions still succeed but the push is skipped. |
| `ARI_BILATERAL_W3_SYNC_ENABLED` | W3 Registry sync (T-29) | `false` | Tag will not auto-refresh; manual `PATCH .../pool-funding-tag` remains the only path. |
| `ARI_BILATERAL_SP_TOC_SYNC_ENABLED` | SP ToC sync (T-31) | `false` | Indicators panel will keep returning empty arrays per SP group. |

Each environment (staging, production, launch Centers) flips these independently — design the UI to behave gracefully when *any* combination is off.

---

## 9. What's live vs pending

| Capability | Status (server) | Status (handoff) |
| --- | --- | --- |
| AGRESSO tag (`R-BIL-001..003`) | LIVE | Build the column, badge, filter chip, Excel column. |
| Alignment GET + PATCH (`R-BIL-010..016`) | LIVE | Build the section + form per §4.2–§4.3. |
| Indicators panel (`R-BIL-020..022`) | LIVE (returns groups with **empty arrays** until SP ToC sync lands) | Build the panel skeleton + empty state. Real indicator rows appear when T-31 completes. |
| Indicator mapping POST/PATCH/DELETE (`R-BIL-030..035`) | LIVE | Build the per-type contribution forms per §7. |
| Socket event `result.pool-funding-alignment.changed` | LIVE | Subscribe and reconcile. |
| Push to PRMS + admin retry (`R-BIL-040..045`) | **PENDING** — T-25 paused, T-26..T-28 not started, blocked by T-21/T-23. | Do not build push-status UI yet. |
| Push success/failure socket events | **PENDING** — T-26. | Do not build the toast/notification surface yet. |
| W3 Registry sync (`R-BIL-050..053`) | **PENDING** — T-22/T-29/T-30 blocked. | No UI work needed. |
| SP ToC sync (`R-BIL-060..063`) | **PENDING** — T-31/T-32. | No UI work needed. |

When you need ground truth on "is X live yet?", check [`./tasks.md` §5–§9](./tasks.md) — task statuses there are authoritative.

---

## 10. Local development tips

- ARI server: `cd server/researchindicators && npm run dev` (HTTP + admin SSR + microservice).
- Swagger UI: `http://localhost:<port>/swagger` — every endpoint above has `@ApiTags('Bilateral')` or `@ApiTags('Agresso Contracts')`. Use this as the live contract source when in doubt.
- Local DB: TypeORM + MySQL. Run `npm run migration:dev:execute` after pulling to apply new migrations (the 9 bilateral migrations under `db/migrations/1779190000001..009`).
- Toggle flags via `server/researchindicators/.env` (template: `.env.example`).
- Live test fixtures for every endpoint live in [`../../../server/researchindicators/test/bilateral.e2e-spec.ts`](../../../server/researchindicators/test/bilateral.e2e-spec.ts) and [`../../../server/researchindicators/test/agresso-contract.e2e-spec.ts`](../../../server/researchindicators/test/agresso-contract.e2e-spec.ts) — the request shapes there are the canonical example payloads.

---

## 11. Where to look next (in this order)

1. **PO user stories + ACs:** [`./jira-us/`](./jira-us/) — every requirement here traces back to a Jira ticket and to mockup history (`D-MK-*`).
2. **UX baseline:** [`./design.md` §8](./design.md) — frontend / UX component architecture (sections, indicator panel, mapping forms, sync issues admin view).
3. **End-to-end test cases:** [`./test-report.md` §5.1](./test-report.md) — every e2e maps to one or more `R-BIL-*`. Mirror these as STAR cypress/playwright cases.
4. **Validation status of the backend:** [`./validation-report.md`](./validation-report.md) — what's PASS / PARTIAL / BLOCKED right now.
5. **Constitutional baseline (cold-start for new STAR engineers):** root [`CLAUDE.md`](../../../CLAUDE.md) → [`../../prd.md`](../../prd.md) → [`../../system-design/design.md`](../../system-design/design.md) → [`../../detailed-design/detailed-design.md`](../../detailed-design/detailed-design.md). Reading these in order takes ~30 min and is worth it before starting `T-13`/`T-14`/`T-19`.

---

## 12. Change log

| Date | Change | Author |
| --- | --- | --- |
| 2026-05-19 | Initial handoff after Phase 0–2 backend + T-24 push skeleton landed (commit `e838e2f8`) and `staging` was merged in (`9ffaad71`). | ARI backend team |

When this drifts from the canonical sources, the canonical sources win. Open a PR against this file alongside the backend change so the handoff stays current.
