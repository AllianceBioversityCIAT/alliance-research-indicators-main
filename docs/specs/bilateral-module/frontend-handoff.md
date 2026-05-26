# Frontend Handoff — Bilateral module (ARI → STAR)

> **Audience:** STAR frontend engineer integrating the bilateral module against the ARI backend.
> **Purpose:** single landing page for endpoints, auth, events, flags, and payload shapes. Every section links back to the canonical SDD source so this doc never silently drifts.
> **Companion docs (canonical, this file links to them):** [`./requirements.md`](./requirements.md) · [`./design.md`](./design.md) · [`./tasks.md`](./tasks.md) · [`./test-report.md`](./test-report.md) · [`./jira-us/`](./jira-us/).
> **STAR-side tasks tracking this handoff:** `T-13` (US1 project tag visibility), `T-14` (US2 alignment section), `T-19` (US3/US4 indicator panel + contribution forms) — see [`./tasks.md` §6, §7](./tasks.md).
> **Branch this is built against:** `AC-1594-bilateral-module-v2` (rebased on `staging`; SP catalog wave landed 2026-05-23, commit `5d48b27b`).

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

> **Path gotcha:** `:resultCode` is matched by `(\d+)` — pass the numeric `result_official_code` (e.g. `19792`), **not** the `STAR-19792` display prefix. A `STAR-…` value 404s.

Response `data` (`AlignmentResponse` — `dto/update-pool-funding-alignment.dto.ts`):

```ts
{
  result_code: string;
  eligible: boolean;                            // === has_pool_funding_alignment_eligible
  has_pool_funding_alignment_eligible: boolean; // alias — read either
  has_contribution: boolean | null;             // null = never set
  selected_science_programs: {                  // NEW (2026-05-23) — render this in the picker
    code: string;                               // e.g. "SP01"
    name: string;                               // e.g. "Breeding for Tomorrow"
    category: string | null;                    // "Science programs" | "Scaling programs" | "Accelerators"
    color: string | null;                       // hex, e.g. "#ef4444" (matches the mockup chip colors)
  }[];
  selected_levers: { lever_code: string; lever_name: string }[]; // DEPRECATED — kept for back-compat; safe to ignore once you've migrated to selected_science_programs
  is_synced_to_prms: boolean;
  is_read_only: boolean; // UPDATED (2026-05-26) — see UX rules below
}
```

Each `selected_science_programs[]` entry now also carries `icon_key?: string | null` and `allocation?: number | null` (the latter is populated when the entry originated from the CLARISA per-result path — see [§4.6](#46-per-result-science-programs-picker-new--2026-05-26)). Both are optional; treat missing values as "fall back to the existing `code`-based bundled asset" and "no allocation displayed".

UX rules:
- `eligible === false` → **do not render** the Pool Funding Alignment section at all.
- `is_read_only === true` → render the section but disable every input + show a "read-only" badge. **The flag is now a union of two server-side gates** (R-BIL-071, landed 2026-05-26):
  1. The result is **PRMS-sourced** (`platform_code === 'PRMS'`) — PRMS owns it, STAR is just displaying it.
  2. The result is **already synced to PRMS** (`is_synced_to_prms === true`) — STAR-sourced result that's already been pushed.
  - Either condition flips `is_read_only`. Server-side, write attempts return `409` with description `"Result is PRMS-sourced; bilateral alignment is read-only in STAR"` (PRMS-sourced) or `"Result is already synced to PRMS"` (synced). Both are 409s — distinguish in the toast/error UI by the description text if you want to. `is_synced_to_prms` stays exposed for telemetry, but `is_read_only` is the only field the picker needs to consult.
- `has_contribution === false` → hide the SP picker.
- Render the SP chips from `selected_science_programs[]` using `name` + `color`. Group by `category` if you want to match the mockup's three sub-headers ("Science programs", "Scaling programs", "Accelerators"). Use `icon_key` to resolve `/assets/result-framework-reporting/SPs-Icons/${icon_key}.png` — defaults to the SP code.

### 4.3 PATCH alignment

| Verb | Path | Auth |
| --- | --- | --- |
| `PATCH` | `/api/v1/results/:resultCode/pool-funding-alignment` | `CONTRIBUTOR` + result-owner, OR `CENTER_ADMIN` / `SYSTEM_ADMIN` |

Body (`UpdatePoolFundingAlignmentDto`):

```ts
{
  has_contribution: boolean;          // required
  sp_codes?: string[];                // NEW (preferred) — required when has_contribution=true; >=1 non-blank SP code (e.g. ["SP01","SP06"])
  lever_codes?: string[];             // DEPRECATED — fallback only when sp_codes is absent; do not send for new builds
  justification?: string;             // optional, goes into result_review_history
}
```

Precedence: if both `sp_codes` and `lever_codes` are sent, the server uses `sp_codes` and ignores `lever_codes`. A stale FE that still sends `lever_codes` keeps working unchanged.

- Editing succeeds **regardless of `result_status`** (AR.1). No need to check status before showing the edit button.
- Returns `409` if **either** read-only condition fires (PRMS-sourced OR already synced) — see [§4.2](#42-get-alignment).
- Returns `400` if `has_contribution=true` and neither `sp_codes` nor `lever_codes` carries at least one non-blank entry.
- **NEW (2026-05-26) — Returns `400` when any submitted `sp_code` isn't in the result's per-project SP list** (R-BIL-070). The error envelope carries `errors.unknown_sp_codes: string[]` so the FE can highlight which inputs failed:
  ```jsonc
  {
    "description": "BadRequestException",
    "status": 400,
    "errors": {
      "description": "Unknown Science Program codes",
      "unknown_sp_codes": ["SP99"]
    }
  }
  ```
  The valid set for a given result comes from [§4.6](#46-per-result-science-programs-picker-new--2026-05-26) — the picker source and the validator agree by construction (both share the same chain). If the result is **unmapped** (no active `bilateral_project_mapping` row), the per-result list is `[]` and any non-empty `sp_codes` rejects with this 400. UX: when this happens, surface the existing "Contact admin to link this contract" affordance (same one [§4.6](#46-per-result-science-programs-picker-new--2026-05-26) uses for the unmapped state).
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

### 4.6 Per-result Science Programs picker (NEW — 2026-05-26)

> **Supersedes** the static-catalog picker pattern documented in this section's 2026-05-23 revision. Sub-spec of record: [`./pending-items/requirements.md` R-BIL-076](./pending-items/requirements.md).

The SP picker is now **per-result**, not a static list of all 13 SPs. PO ruling (2026-05-25): CLARISA `/api/projects` owns the per-project SP linkage; the picker shows only the SPs that the result's mapped bilateral project actually participates in.

| Verb | Path | Auth |
| --- | --- | --- |
| `GET` | `/api/v1/results/:resultCode/pool-funding-alignment/science-programs` | ROAR JWT |

Response `data` (`BilateralSciencePrograms`):

```ts
{
  result_code: string;
  mapping_status: "mapped" | "unmapped";       // "unmapped" = no active bilateral_project_mapping row OR no AGRESSO contract OR CLARISA no longer exposes the linked project
  clarisa_project: { id: number; short_name: string } | null;
  science_programs: {
    code: string;             // e.g. "SP09" — matches `selected_science_programs[].code` from §4.2
    name: string;             // CLARISA-side name (falls back to the local catalog if absent)
    category: string | null;  // "Science programs" | "Scaling programs" | "Accelerators"
    color: string | null;     // hex — enriched from the local catalog (display-only fallback)
    icon_key: string | null;  // FE asset key — defaults to `code`
    allocation: number | null; // 0–100, CLARISA-side allocation for the active portfolio (P25)
  }[];                        // sorted by code ASC; deterministic for the picker
}
```

UX rules:
- Use this as the **picker source** for choosing which SPs to tag on PATCH alignment. The list is already filtered to `status === "Confirmed"` + the active portfolio (`P25` by default; env-driven via `ARI_BILATERAL_ACTIVE_PORTFOLIO` on the server).
- `mapping_status === "unmapped"` → show an empty picker with a **"Contact admin to link this contract"** affordance. The result has no active `bilateral_project_mapping` row, so no SP is currently valid for it. Any PATCH `sp_codes` would 400 (see [§4.3](#43-patch-alignment)).
- `clarisa_project.short_name` is useful as a hover tooltip / subtitle near the picker so the user knows which CLARISA project the SPs come from.
- `allocation` lets you show the % chip next to each SP (e.g. "SP09 — 25%"). Treat `null` as "no allocation displayed" rather than zero.
- Same `code` values flow through `selected_science_programs[]` on [§4.2](#42-get-alignment) and through the PATCH `sp_codes` payload — no transformation needed.

**Deprecated for picker use** — the legacy static catalog endpoint stays live as a **display-only fallback** (icons / colors / names) when the picker enrichment can't reach CLARISA:

| Verb | Path | Status |
| --- | --- | --- |
| `GET` | `/api/tools/clarisa/science-programs` | DEPRECATED for picker — use as enrichment fallback only. Now also returns `icon_key`. |
| `GET` | `/api/tools/clarisa/science-programs/:code` | Same. |

The 13 entries are still seeded by migration. Don't drive the picker from them — use the per-result endpoint above so the user only sees SPs that apply to their result's bilateral project.

> Canonical: [`./pending-items/requirements.md` R-BIL-076 + R-BIL-078](./pending-items/requirements.md) (with R-BIL-070 covering the matching PATCH validation contract).

### 4.7 HLOs/indicators per SP (NEW — 2026-05-26; PENDING upstream)

For the "Map HLOs and/or indicators" panel. Given the SP codes the operator selected on the alignment, the endpoint returns the HLOs (+ child indicators) PRMS ToC exposes for those SPs.

| Verb | Path | Auth |
| --- | --- | --- |
| `GET` | `/api/v1/results/:resultCode/pool-funding-alignment/hlos-indicators?sp_codes=SP09,SP10` | ROAR JWT |

Response `data` (`BilateralHlosIndicators`):

```ts
{
  sp_code: string;
  sp_name: string;
  hlos: {
    id: number;
    code: string;
    title: string;
    indicators: { id: number; code: string; name: string }[];
  }[];
}[]
```

**Status — BLOCKED on OQ-RV-2** (PRMS team confirms endpoint URL / auth / payload). Until that closes, the server ships the interim 503 path:

```jsonc
{
  "description": "ServiceUnavailableException",
  "status": 503,
  "errors": "PRMS ToC integration not yet configured"
}
```

FE handling: surface a "ToC HLOs not yet wired" empty state — same shape you'd render for the "ToC catalog not yet synced" state in [§4.4](#44-get-indicators-panel). When OQ-RV-2 closes, the server flips to the live proxy with no shape change required on the FE.

### 4.8 Admin: bilateral project mappings (NEW — 2026-05-26)

The AGRESSO ↔ CLARISA project join is **operator-maintained** (no upstream join field exists). This is what powers the per-result SP picker above; if a result's AGRESSO contract has no active mapping, the picker is empty.

| Audience | Surface |
| --- | --- |
| Operators (`CENTER_ADMIN` / `SYSTEM_ADMIN`) | SSR admin page `/api/admin/bilateral-project-mappings` — list + create/edit modal with AGRESSO picker, CLARISA project picker, and SP allocation preview. Deactivate flow soft-deletes; re-create after deactivate is allowed (partial-unique on the active row). |
| Programmatic | REST surface at `/api/bilateral-project-mappings` (`GET` list + filters, `POST` create, `PATCH /:id`, `PATCH /:id/deactivate`). Same role gate. Note the URL is **not** under `/api/admin/...` — see Pivot Record #1 in [`./pending-items/execution.md`](./pending-items/execution.md). |
| FE awareness | The STAR app itself doesn't render or edit mappings — operators do that in the admin panel. STAR FE only needs to handle the `mapping_status: "unmapped"` branch from [§4.6](#46-per-result-science-programs-picker-new--2026-05-26) gracefully. |

Picker source endpoint (used by the admin form, not by STAR directly): `GET /api/tools/clarisa/projects/bilateral?search=...` — same role gate, returns a trimmed payload with the project's Confirmed SPs.

> Canonical: [`./pending-items/requirements.md` R-BIL-078 / R-BIL-079 / R-BIL-080](./pending-items/requirements.md).

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
| Alignment GET + PATCH (`R-BIL-010..016`) | LIVE — alignment shape now SP-aware (`selected_science_programs` + `sp_codes`) | Build the section + form per §4.2–§4.3. |
| SP catalog (`GET /api/tools/clarisa/science-programs`) | LIVE — seeded with 13 SPs (SP01–SP13) + category + color | Use as the picker source per §4.6. |
| Indicators panel (`R-BIL-020..022`) | LIVE (returns groups with **empty arrays** until SP ToC sync lands) | Build the panel skeleton + empty state. Real indicator rows appear when T-31 completes. |
| Indicator mapping POST/PATCH/DELETE (`R-BIL-030..035`) | LIVE | Build the per-type contribution forms per §7. |
| Socket event `result.pool-funding-alignment.changed` | LIVE | Subscribe and reconcile. |
| Push to PRMS + admin retry (`R-BIL-040..045`) | **PENDING** — T-25 paused, T-26..T-28 not started, blocked by T-21/T-23. | Do not build push-status UI yet. |
| Push success/failure socket events | **PENDING** — T-26. | Do not build the toast/notification surface yet. |
| W3 Registry sync (`R-BIL-050..053`) | **PENDING** — T-22/T-29/T-30 blocked. | No UI work needed. |
| SP ToC sync (`R-BIL-060..063`) | **PENDING** — T-31/T-32. Catalog itself is seeded (above); indicators-per-SP sync is still TBD. | No UI work needed for the indicator stream yet. |

When you need ground truth on "is X live yet?", check [`./tasks.md` §5–§9](./tasks.md) — task statuses there are authoritative.

---

## 10. Local development tips

- ARI server: `cd server/researchindicators && npm run dev` (HTTP + admin SSR + microservice).
- Swagger UI: `http://localhost:<port>/swagger` — every endpoint above has `@ApiTags('Bilateral')` or `@ApiTags('Agresso Contracts')`. Use this as the live contract source when in doubt.
- Local DB: TypeORM + MySQL. Run `npm run migration:dev:execute` after pulling to apply new migrations (the 10 bilateral / catalog migrations under `db/migrations/1779190000001..010`, the last one seeds the SP catalog).
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
| 2026-05-23 | **SP catalog wave (commit `5d48b27b`).** Three FE-visible deltas: (1) new endpoint `GET /api/tools/clarisa/science-programs` returns 13 SPs with name/category/color (§4.6); (2) alignment GET response now ships `selected_science_programs[]` enriched with name/category/color — keep using this instead of `selected_levers[]`, which is now deprecated back-compat (§4.2); (3) alignment PATCH accepts `sp_codes` (preferred) alongside deprecated `lever_codes` (§4.3). Also documented the numeric `:resultCode` gotcha — pass `19792`, not `STAR-19792`. | ARI backend team |
| 2026-05-26 | **Phase 1.5 wave (commits `8b59a099` → `2a7e9819`, branch `AC-1594-bilateral-module-v2`).** FE-visible deltas, all driven by the [`./pending-items/`](./pending-items/) sub-spec: (1) **picker source is now per-result** — `GET /api/v1/results/:resultCode/pool-funding-alignment/science-programs` returns only the SPs CLARISA links to the result's mapped bilateral project (§4.6); the static catalog endpoint stays live as display-only fallback. (2) **PATCH alignment now 400s on unknown `sp_codes`** with structured `errors.unknown_sp_codes` (§4.3). (3) **`is_read_only` is now a union** of `platform_code === 'PRMS'` OR `is_synced_to_prms` — PRMS-sourced results are always read-only (§4.2). (4) `selected_science_programs[]` gains optional `icon_key` (defaults to SP code) and `allocation` (when sourced from CLARISA per-result path) (§4.2). (5) New endpoint stub `GET .../hlos-indicators` returns interim 503 until OQ-RV-2 closes (§4.7). (6) New admin module at `/api/admin/bilateral-project-mappings` for operators to maintain the AGRESSO ↔ CLARISA join — STAR FE only needs to handle `mapping_status: "unmapped"` from the picker (§4.8). | ARI backend team |

When this drifts from the canonical sources, the canonical sources win. Open a PR against this file alongside the backend change so the handoff stays current.
