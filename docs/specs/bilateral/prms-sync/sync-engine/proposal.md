# Proposal — PRMS Sync Engine (server)

> **Revision 3 — 2026-09-14 (same day).** Product decisions **D-1…D-7** applied to all seven
> gaps the homologation surfaced; see [`homologation.md`](./homologation.md) §1.1. Net effect:
> **Knowledge Product leaves scope**, no pre-flight validation is built, centres resolve from the
> primary contract (`ExCIAT` → `46`, `ExBIO` → `49`), and Innovation Use + one policy subtype are **knowingly unsyncable in v1**.
>
> **Revision 2 — 2026-09-14.** Rewritten against the **2026-09** PRMS Normalizer contract.
> The family's hold (OQ-F1, "the service is becoming a hook") is **resolved**: ingest is still
> `POST /ingest` with an `x-api-key`; the hooks are *outbound decision webhooks*. Revision 1
> (2026-08-21) is superseded — the changes are listed in §14.

## 1. Document Control

| Field | Value |
|---|---|
| Spec path | `bilateral/prms-sync/sync-engine` |
| Parent Spec | `bilateral/prms-sync` (see [`../family.md`](../family.md)) |
| Type | Change |
| Approval Mode | gated |
| Date | 2026-08-21 · **revised 2026-09-14** |
| Requirement source | Jira AC-1676 + **PRMS Normalizer – Technical Field Documentation (2026-09)** + 7 payload examples + user mockups (My Projects "Contributing to Pool Funding" column; sidebar "Pool funding alignment" + PRMS SYNC) |
| Slug | `sync-engine` — derived from free-text argument, not a path literal |
| Companion | [`homologation.md`](./homologation.md) — the field-by-field PRMS ⟷ STAR reconciliation + the D-1…D-7 decision log |
| Supported types | **4 of 7** — `capacity_sharing`, `innovation_development`, `policy_change`, `innovation_use`. KP out (D-4), OICR out (OQ-F2). |

## 2. Intent

When an authorized user triggers **PRMS SYNC** on an Approved result whose **Pool Funding
Alignment** is complete, the server builds the type-specific PRMS Normalizer payload from the
full result metadata, POSTs it to the correct environment's `/ingest` with the STAR API key,
records the attempt and its verbatim outcome durably, and — **only for a row PRMS actually
accepted** — marks the result `is_synced_to_prms = true`.

The service is exclusive to results whose **primary contract carries the "Contributing to Pool
Funding" tag** (`agresso_contract.is_pool_funding_contributor`); that tag is already what makes
the optional *Pool funding alignment* section appear, and the sync button lives inside it.

## 3. Problem / Current Behavior

| Layer | State today |
|---|---|
| Outbound integration | **None.** `domain/tools/` has `prms-toc` (read-only ToC catalogue) and `open-search/prms` — the latter is the **inbound** direction (`GET /fetch-prms-data`, PRMS → STAR). Nothing pushes. |
| `results.is_synced_to_prms` / `prms_result_code` | Exist (migration `1779190000002`). **Nothing ever writes them** — they are read only as the 409 read-only gate in `bilateral.service.ts` (:624, :752, :1659). |
| Client button | Rendered, correctly gated (`status_id === 6` **and** `greenChecks().pool_funding_alignment`) — and its handler is an **empty method**: `// PRMS sync functionality will be implemented in future task` (`result-sidebar.component.ts:109-112`). |
| Sync auditability | None. No attempt, outcome, or `requestId` is recorded anywhere. |
| Field mapping | Unproven. [`homologation.md`](./homologation.md) now reconciles all 58 contract fields and isolates 7 items needing a decision. |

## 4. Proposed Outcome

1. **New tool module** `domain/tools/prms-normalizer/` (TRD §9.1): one Nest service, transport
   encapsulated, `BaseApi` reuse where it fits — **no implementation of this exists today**
   (verified 2026-09-14: no `prms-normalizer` module, no POST to `/ingest`, no Normalizer host
   anywhere in the tree). The API key comes from the **`app_config` row**, via
   `AppConfigService.getEnv(AppConfigKey.ARI_CLARISA_API_KEY).simple_value`, read **per request**
   (not in the constructor — see homologation §10.1). The per-environment Normalizer **host**
   still needs its own `ARI_*` var (K-005 — TEST and PROD are branch selectors).
2. **Payload builders for the four supported types** — `capacity_sharing`,
   `innovation_development`, `policy_change`, `innovation_use` — implementing
   [`homologation.md`](./homologation.md) verbatim, including the 2026-08/09 breaking rules that
   STAR *can* satisfy: mandatory `lead_contact_person` (always present, D-3); `measures` always
   required for Innovation Use; `women_youth ≤ women`; centres from
   `agresso_contract.ubwClientDescription` — `ExCIAT` → **`46`**, `ExBIO` → **`49`** (D-7).
3. **An eligibility gate, in place of pre-flight validation.** D-5 removes link validation and
   D-6 removes length guards, so nothing is validated on our side *except* what STAR structurally
   cannot satisfy. The endpoint refuses, with a stated reason: `indicator_id = 3` (KP, D-4),
   `indicator_id = 5` (OICR), and — pending **OQ-H1'/OQ-H2'** — Innovation Use (D-1) and PRMS
   policy type `1` (D-2). A refusal is a clear STAR message; it is **not** an attempted sync.
4. **Sync endpoint** guarded by: result Approved, alignment complete, primary contract is a
   pool-funding contributor, `@Roles`, and idempotency (already-synced → 409).
5. **State persistence** — append-only `result_prms_sync_log` (attempt, environment, request
   payload, verbatim response, `requestId`, per-row outcome, actor, timestamps) + a derived
   result-level status, designed **extensible** to the future PRMS decision verdict.
6. **Response handling that distinguishes 207-with-failed-rows from success** (§6 of the
   homologation) — `is_synced_to_prms` flips only on a row PRMS accepted.
7. **Environment routing (K-005 / R-F2)** — one `ARI_*` var per environment; local/dev → TEST,
   prod → PROD. Never an `if (env)` fork beyond reading the var.
8. Swagger decorators, `LoggerUtil`, sibling `*.spec.ts`, ≥ 60 % coverage on touched units.

## 5. Scope

Server package only: integration tool + payload builders (4 types) + eligibility gate + endpoint
+ sync log (append-only migration) + `.env.example` entries + unit/e2e tests.

**T-SPIKE (first task, gates the rest):** one real payload per supported type against the
**TEST** `/ingest`, capturing the verbatim response. It is the only thing that can close
OQ-H5 (`grant_title` composition), OQ-H6 (`innovation_readiness_level` shape), OQ-F7 (where
the PRMS result code appears) and OQ-H9 (`scope_code = 50`). **It cannot start before OQ-H8** —
the STAR API key for TEST.

## 6. Non-Goals

- No client changes (child 2), no re-sync UI (child 3), no PI panel (child 4).
- **No `usd_budget` / `is_determined` capture** (D-1) — and therefore **no working Innovation
  Use sync**. See §12.
- **No `status_amount` / `amount` capture** (D-2) — PRMS policy type `1` stays unsyncable.
- **No Knowledge Product sync** (D-4) — STAR cannot author KPs.
- **No pre-flight validation of evidence links or title/description length** (D-5, D-6).
- No decision-webhook registration or callback endpoint (natural fifth family member).
- No `op: delete` / un-sync; no Bulk Ingest (single-result normal ingest only).
- No OICR (excluded, OQ-F2); no `other_output` / `other_outcome` (STAR has no such indicator).
- No Bulk Ingest, no `op: delete` / un-sync, no decision-webhook registration.

## 7. Affected Users, Systems, And Specs

| Who/What | Effect |
|---|---|
| PRMS Normalizer (TEST/PROD) | New outbound consumer; STAR needs its own API key per environment |
| `Result` entity | First writers for `is_synced_to_prms`, `prms_result_code` |
| `bilateral.service.ts` 409 gate | Becomes reachable end-to-end (dormant until now) |
| `agresso_contract.ubwClientDescription` | New read: resolves `lead_center` / `contributing_center` (D-7) |
| `result_policy_change` | Candidate for the G-2 amount columns (decision pending) |
| MySQL | New `result_prms_sync_log` table (append-only migration) |
| `domain/tools/open-search/prms/homologation/*` | Reused **by inversion** for session length, delivery modality, policy type/stage |

## 8. Visual Reference

- **Source:** None for this child (backend-only). The family mockups govern children 2–4: the
  *My Projects* list with the **Contributing to Pool Funding** tag, and the sidebar's
  **Optional → Pool funding alignment** group with the **PRMS SYNC** button.
- **Location:** user-supplied images in the `/akili-propose` invocation (2026-09-14).

## 9. Requirement Delta Preview

### ADDED
- Outbound PRMS Normalizer integration with **four** per-type payload builders honouring the
  2026-08/09 contract.
- An eligibility gate that refuses, with a stated reason, what STAR structurally cannot sync
  (KP, OICR, and — pending OQ-H1'/OQ-H2' — Innovation Use and PRMS policy type `1`).
- Sync trigger endpoint with status + alignment + pool-funding-contributor + role + idempotency governance.
- Append-only sync attempt log; per-row outcome interpretation; `is_synced_to_prms` written only on true acceptance.
- Per-environment host + API key configuration.

### MODIFIED
- Result aggregate gains a sync-state read surface for children 2–4.

### REMOVED
- None.

## 10. Approach Options

| Option | Description | Trade-off |
|---|---|---|
| **A (recommended)** | Synchronous on the endpoint: eligibility gate → build → POST → interpret rows → record → flip flag. Failures recorded as `FAILED`; retry is manual (children 2–3). | Simplest honest v1; user waits one round-trip; the outcome is visible at the click. |
| B | Queue-backed (RabbitMQ) async sync with automatic retries. | More resilient, but hides the outcome from the click and stacks a second async hop on a downstream that is already async. Premature. |
| C | Cron-driven batch sync of all eligible results. | Contradicts the requirement — the sync is explicitly user-triggered. |

**Recommended: A.** The Normalizer is itself async downstream (R-F1); our own queue adds nothing
before the verdict-capture phase exists. Manual re-sync (child 3) covers failures.

## 11. Risks, Dependencies, And Open Questions

Inherits R-F1–R-F3 from [`../family.md`](../family.md). Child-specific:

| ID | Risk / Question |
|---|---|
| **R-E1** | **A 207 is not a success.** A bad evidence link, an unresolvable `grant_title` or an unknown actor type comes back as a **failed row inside HTTP 207**, with `rejected[]` empty. Any "2xx ⇒ synced" shortcut marks a result synced that PRMS refused — and flipping `is_synced_to_prms` then 409s the alignment PATCH for everyone, **including SYSTEM_ADMIN** (R-F3). This is the defect most likely to ship green (KZ-001). |
| **R-E2** | **`innovation_use_level` id ≠ level** (`id 2` is `level 1`). Sending the id into the `level` key shifts every Innovation Use result one stage, silently. Must be asserted against the seeded catalogue, not a fixture (KZ-001). |
| **R-E3** | **`sex_and_age_disaggregation` reads inverted.** STAR's column is `sex_age_disaggregation_not_apply`; the semantics are verified identical (homologation §8.3) but the names invite a negation. Test **both** modes explicitly. |
| **R-E4** | Silent-drop history: before 2026-08, a name-only actor was dropped while the request returned `200` with "All results processed successfully". Prefer ids everywhere; verify what came back. |
| **OQ-H8** | **Critical path — STAR needs API keys for TEST and PRODUCTION from PRMS Tech Support.** One key per tool per environment; the key is the platform identity. Nothing can be verified until the TEST key exists. |
| **OQ-H1–H9** | The nine open questions raised by the homologation (§11 there). H1/H2/H3/H4 need product answers; H5/H6/H9 need the spike. |
| **R-F5** | The contract documentation still lives in `~/Downloads`, outside the repo. Copy the `.md` + 7 JSON examples into `docs/technical-docs/prms-normalizer/` during `/akili-specify` so the spec cites a versioned source, not a local path. |

## 12. Family amendment — **withdrawn**, replaced by one decision

Revision 2 proposed a fifth child (`bilateral-project-investment`) to capture the per-contract
USD contribution. **D-1 withdraws it:** those fields are not being built this cycle, so there is
nothing for that child to deliver. No manifest edit is requested, and no folder was created.

What replaces it is a single decision the product owner still owes — **OQ-H1'**:

| Option | What v1 does with Innovation Use | Cost |
|---|---|---|
| **(a) Gate it out** — *recommended* | Button disabled for `indicator_id = 6` with a stated reason. | Honest and cheap. The type returns the moment D-1 is revisited. |
| **(b) Let it fail** | Sync is attempted and PRMS rejects every payload. | A button that reliably errors. Not recommended. |
| **(c) Revisit D-1 partially** | Add **only** `is_determined` — a per-project boolean meaning *"amount not yet determined"*, **no monetary figure**. PRMS accepts `is_determined: true` alone. | Materially smaller than capturing USD amounts, and it makes the type fully syncable. Worth a look before settling for (a). |

The same shape applies to PRMS policy type `1` (**OQ-H2'**), where (a) is the clear answer.

---

## 13. Success Criteria

- One real result **per supported type** accepted by the TEST Normalizer, evidenced by the
  **verbatim** response body including `requestId` — and the spike records where (or whether)
  the PRMS result code appears (OQ-F7).
- A result whose evidence link violates the 2026-08 PRMS rules produces a **failed row inside a
  207**, and STAR leaves `is_synced_to_prms = false` — proven against the real TEST endpoint with
  a deliberately bad link, **never a mocked 207**. With D-5 removing pre-flight, this is the only
  safeguard left and it must be shown working, not assumed (K-004, KZ-001).
- A 207 carrying a failed row leaves `is_synced_to_prms = false` and writes a `FAILED` log row —
  proven with a deliberately malformed row, not a mocked 207.
- Acceptance flips `is_synced_to_prms` and the alignment PATCH then 409s (existing gate test
  extended end-to-end).
- Eligibility gate proven with allowed **and** denied cases: role, status ≠ 6, incomplete
  alignment, non-pool-funding contract, already synced, `indicator_id = 3` (KP), `indicator_id
  = 5` (OICR), and — per OQ-H1'/OQ-H2' — `indicator_id = 6` and PRMS policy type `1`. Each
  refusal carries a distinct, user-readable reason.
- `lead_center` and `contributing_center` resolve from `ubwClientDescription` to the **correct
  institution per value** — `ExCIAT` → `46`, `ExBIO` → `49` — asserted on **both** values (D-7).
  A wrong branch is silent: both ids are valid institutions, so PRMS accepts either and simply
  attributes the result to the wrong centre. One-value coverage is not evidence (KZ-017).
- Zero PROD ingest calls reachable from local/dev (env routing test) — and the test states
  what it **cannot** reach (KZ-017).
- Both `sex_and_age_disaggregation` modes and the `id`/`level` distinction asserted against the
  seeded CLARISA catalogues.

## 14. What changed in Revision 2

| Area | Revision 1 (2026-08-21) | Revision 2 (2026-09-14) |
|---|---|---|
| Transport / auth | Unknown — "becoming a hook", family **on hold** | **Resolved:** `POST /ingest`, `x-api-key` (CLARISA key). Hooks are *outbound decision webhooks*. Hold liftable. |
| Field mapping | "a design task" | **Done** — [`homologation.md`](./homologation.md), 58 fields, 7 gaps |
| `lead_contact_person` | not mentioned | **Mandatory for all types** since 2026-08 (G-3) |
| `measures` | not mentioned | **Mandatory for Innovation Use** since 2026-09, even when to-be-determined |
| `usd_budget` / `is_determined` | not mentioned | **Breaking since 2026-09**; **not built (D-1)** → Innovation Use unsyncable in v1, family row #5 withdrawn |
| Knowledge Product | in scope (1 of 5 types) | **out of scope (D-4)** — STAR cannot author KPs |
| Centres | `pooled_funding_contracts`, CIAT `46` / Bioversity `49` split | **`ubwClientDescription`** is the driving field (D-7): `ExCIAT` → **`46`**, `ExBIO` → **`49`**. Confirms OQ-F3's split. |
| Evidence links | "may not be URIs the schema accepts" | **Specified:** `http(s)` required, file-storage hosts rejected (G-5) |
| `external_reference` | not available | **Available**, and required in practice for webhooks |
| Response handling | "record the attempt" | **207-with-failed-rows** is now an explicit, tested criterion (R-E1) |
| `keep_editing` | did not exist | New optional flag; recommend `false` |

## 15. Next Step

```text
/akili-specify bilateral/prms-sync/sync-engine
```

**Two things still need a human, and neither blocks drafting:**

1. **OQ-H1' / OQ-H2'** — how v1 presents Innovation Use and PRMS policy type `1`. Recommended:
   gate both out with a stated reason. Option (c) in §12 (`is_determined` only, no monetary
   figure) is worth a look first — it is small and it recovers a whole indicator type.
2. ~~OQ-H8~~ **— closed 2026-09-14.** The API key is already in `app_config` in both TEST and
   PROD, so the spike is **unblocked**: nothing has to be requested from PRMS Tech Support.
