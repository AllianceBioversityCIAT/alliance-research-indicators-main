# Proposal — PRMS Decision Webhook (server)

## 1. Document Control

| Field | Value |
|---|---|
| Spec path | `bilateral/prms-sync/decision-webhook` |
| Parent Spec | `bilateral/prms-sync` (see [`../family.md`](../family.md), child **5**) |
| Type | Change |
| Approval Mode | gated |
| Date | 2026-09-17 |
| Depends on | `bilateral/prms-sync/sync-engine` |
| Parallel-safe | `yes` (server package only; no overlap with children 2–4) |
| Requirement source | *PRMS Result Decision Webhooks* (PRMS team, supplied 2026-09-17, currently in `~/Downloads`) + owner instruction 2026-09-17: *"primero necesitamos hacer la conexión con el hook y dejar registrado cada que el hook mande algo porque ese histórico se tiene que mostrar"*. **Jira AC-1675 exists as a branch name but the ticket is empty** — the supplied document plus that instruction are the whole known requirement. |
| Slug | `decision-webhook` — derived from the free-text argument ("sistema de sincronización … webhooks"); never a path literal |

---

## 2. Intent

STAR pushes a result to PRMS and today never learns what happened to it. A CGIAR Science Program approves or rejects it inside PRMS, and that verdict stays inside PRMS.

This child closes the loop in its **first and smallest honest form**: STAR registers a callback destination with PRMS, receives the APPROVE/REJECT callback, and writes **every delivery it receives** into an append-only history durable enough to be displayed later. Correlating a delivery to its STAR result and reflecting the verdict on that result are in scope; *rendering* the history is not — that is a later manifest row.

---

## 3. Problem / Current Behavior

- **No destination is registered with PRMS.** Measured on `origin/dev` 2026-09-17: `git grep -in "webhook" -- server/researchindicators/src` returns **0** hits, and so does `delivery-id|delivery_id`. STAR cannot receive a decision at all today.
- **No inbound surface exists.** The only PRMS-sync routes are result-scoped and authenticated: `results/:resultCode/prms-sync` (`main.routes.ts:91-92`). `JwtMiddleware` covers `*` with a fixed exclusion list (`app.module.ts:89-118`) that a PRMS callback is not on.
- **No table can hold a delivery.** `result_prms_sync_log` models *outbound attempts*: `result_id` is `nullable: false` with `FK_result_prms_sync_log_result_id`, and the row shape is `attempt_number` / `request_payload` / `http_status`. A callback for a result created inside the PRMS Reporting Tool arrives with `external_reference: null` and has **no STAR result to point at** — it cannot be stored in that table under any interpretation.
- **The verdict has nowhere to live on the result.** `is_synced_to_prms` means *"the Normalizer accepted our payload"* (family R-F1), not *"a Science Program approved it"*. Statuses `BILATERAL_PENDING_REVIEW/APPROVED/REJECTED` (23/24/25) exist, but they model **STAR's own pre-push review** — migration `1779190000003` describes 24 as *"has passed review and **can be pushed to PRMS**"* — and no service code references them (grep: seed migration, workflow migration, and the enum only).
- **Losses are silent and permanent.** The contract is explicit: *a decision taken while no destination is registered is never replayed — there is no backlog*. Every day without a registered destination is a day of verdicts that cannot be recovered.

---

## 4. Proposed Outcome

| # | Outcome |
|---|---|
| 1 | STAR can **register and read** its callback destination with PRMS through an operated, audited action — not a hand-run `curl`. |
| 2 | A public HTTPS callback endpoint accepts the PRMS POST, **stores first and answers `2xx` immediately**, well inside the 15 s timeout. |
| 3 | **Every delivery is recorded**, including ones that correlate to nothing: bad shape, unknown `external_reference`, `external_reference: null`. The history is the deliverable, not a side effect. |
| 4 | Duplicate deliveries are **deduplicated on `x-prms-delivery-id`**, recorded as a repeat rather than applied twice. |
| 5 | A correlated delivery updates the STAR result's PRMS verdict state, extending the existing outcome vocabulary rather than replacing it. |
| 6 | TEST and PROD destinations are separate configuration, never collapsed (**K-005**, family R-F2). |

---

## 5. Scope

Server package only.

- Two methods on the existing `PrmsNormalizerService` — `registerWebhook(url)` and `getWebhook()` — against `POST`/`GET /webhook` on the **same host and the same `x-api-key`** the ingest call already uses (`ARI_PRMS_NORMALIZER_HOST` in the constructor; `ARI_CLARISA_API_KEY` read from `app_config` per call).
- An operator surface to register/read the destination, restricted to `SYSTEM_ADMIN`.
- The public callback controller, its `JwtMiddleware` exclusion, and its shared-secret path segment.
- A new append-only delivery table + migration, correlation to `result`, dedupe index, and the result-level verdict state.
- Swagger, `LoggerUtil`, sibling `*.spec.ts` for every unit touched, `.env.example` entries.

---

## 6. Non-Goals

- **No UI.** Displaying the history, the verdict badge, or the rejection justification is a later family row.
- **No re-push on REJECT.** What a contributor may do after a rejection is a product decision nobody has taken.
- **No HMAC verification.** `x-prms-signature` is documented as *reserved, not sent today*; building verification on it now would verify nothing.
- **No reconciliation job.** `GET /result/:code` polling to recover abandoned deliveries is a sound follow-up, not v1.
- **No change to the outbound push.** `sync-engine` is untouched apart from the two additive service methods.

---

## 7. Affected Users, Systems, And Specs

| Who/What | Effect |
|---|---|
| PRMS (TEST/PROD) | Becomes an **inbound** caller of STAR for the first time |
| `PrmsNormalizerService` | Two additive methods; ingest path unchanged |
| `app.module.ts` | One new `JwtMiddleware` exclusion — the first public **write** endpoint in the app |
| MySQL | New append-only delivery table (migration) |
| `Result` | Gains a PRMS-verdict read surface that children 3 and 4 will consume |
| Infrastructure | Requires a publicly reachable HTTPS path — see R-1, the hard blocker |
| `sync-engine` | Its `PrmsSyncOutcome` extensibility promise (R-PRMS-012 AC.3) gets exercised for the first time |

---

## 8. Visual Reference

- **Source:** None — backend-only child, by the owner's scoping decision of 2026-09-17.
- **Notes:** the history is designed *to be displayable* (stable ids, ordered timestamps, verdict + justification retained verbatim), but no screen is built here. The consuming UI needs its own manifest row and its own visual reference.

---

## 9. Requirement Delta Preview

### ADDED

- Registration of STAR's callback destination with PRMS (upsert semantics; re-registering replaces and re-enables).
- Read-back of the destination currently on file, including the *"nothing registered"* case, which PRMS returns as `200` with an **empty object** — the `message`, not the object, carries the meaning.
- A public callback endpoint with store-then-acknowledge behavior and a shared-secret path segment.
- An append-only delivery history covering correlated, uncorrelated and malformed deliveries.
- Deduplication on `x-prms-delivery-id`.
- A PRMS-verdict state on the result.

### MODIFIED

- `PrmsSyncOutcome` gains verdict members (e.g. `APPROVED_BY_SP`, `REJECTED_BY_SP`). This is the change the enum was explicitly built for: it is VARCHAR-backed rather than a MySQL `ENUM` *"so a future PRMS-side verdict (e.g. `APPROVED_BY_SP`) needs no schema change"*.
- `JwtMiddleware` exclusion list gains the callback path.

### REMOVED

- None.

---

## 10. Approach Options

### 10.1 Where the delivery history lives

| Option | Description | Trade-off |
|---|---|---|
| **A (recommended)** | New append-only table (`prms_webhook_delivery`, name at design): nullable `result_id`, unique `delivery_id`, raw body JSON, verdict, `justification`, `decided_at`, received-at, correlation outcome | Honest separation: outbound attempts and inbound decisions are different events. Holds uncorrelated deliveries, which is the whole point of *"cada que el hook mande algo"* |
| B | Extend `result_prms_sync_log` with inbound rows | **Structurally impossible as written:** `result_id` is `NOT NULL` with an FK, so a `external_reference: null` callback cannot be stored. Would need a nullable-column migration on a live table plus semantic overloading of `attempt_number` / `request_payload` |
| C | Columns on `result` (last verdict, last decided_at) | Cheapest, and it **fails the stated requirement** — no history to display, and a re-decision overwrites the previous one |

**Recommended: A.** The owner's requirement is a *history that will be shown*, and B cannot physically record the deliveries that carry no result.

### 10.2 How the destination gets registered

| Option | Description | Trade-off |
|---|---|---|
| **A (recommended)** | `SYSTEM_ADMIN`-guarded endpoints in STAR that call PRMS `POST`/`GET /webhook`, with the URL taken from config, logged on every call | Deliberate, auditable, idempotent, and readable from inside the product. One operator action per environment |
| B | Auto-register at application boot | **Actively dangerous here:** *one platform, one destination*, and local + Dev share the same TEST API key. Any developer booting locally would silently re-point Dev's callbacks at their machine, and Dev's verdicts would be lost with no error anywhere |
| C | A human runs `curl` once per environment | Works, but leaves no record in STAR of what is registered, and nobody can answer *"where are our callbacks going right now?"* from the product |

**Recommended: A**, and B is worth naming explicitly as rejected — the failure mode it creates is silent.

---

## 11. Risks, Dependencies, And Open Questions

| ID | Item |
|---|---|
| **R-1** | **The hard blocker — the callback needs a public HTTPS host, and Dev is not one.** Measured 2026-09-17: `main-allianceindicatorstest.ciat.cgiar.org` is a CNAME to `cerberus.cgiarad.org`, which resolves to **192.168.199.32** — RFC1918 private space. *Scope of that check (KZ-017): DNS resolution and an HTTPS response from inside the CIAT network. It does not prove what AWS sees, but a private A record is not routable from AWS.* PRMS also refuses private ranges at registration time. Without a public path, **every delivery times out, retries five times over ~15 min, and is then abandoned and never replayed.** Resolving this is an infrastructure decision and it gates the whole child's verification, not its implementation |
| **R-2** | **One platform, one destination.** Local and Dev share the TEST API key, so there is exactly one TEST callback URL for both. A dev tunnel for local testing takes Dev's callbacks with it. `environment.dev.ts` already carries a commented `devtunnels.ms` URL, so the technique is familiar — the coordination cost is what needs stating |
| **R-3** | **The callback is unsigned.** `x-prms-signature` is reserved and not sent. Authentication therefore rests on an unguessable secret in the URL path, which PRMS explicitly recommends (credentials in the host are refused, *"put the secret in a path or query string instead"*). That secret is a credential: `ARI_*` env var, never logged, rotatable by re-registering |
| **R-4** | **Store-then-acknowledge is a requirement, not an optimization.** *"Return 2xx as soon as you have stored the payload — do not wait for your own downstream processing."* Result-state updates must not sit inside the request that answers PRMS |
| **R-5** | **Nothing catches up.** There is no backlog and no replay. Registration must happen **before** results go under review, and every window in which the destination is wrong is an unrecoverable loss of verdicts |
| **R-6** | `sync-engine` has still never been exercised live (`ARI_PRMS_NORMALIZER_HOST` unset — see [`../HANDOFF.md`](../HANDOFF.md)). This child can be **built** without that, but an end-to-end proof needs a result that actually reached PRMS |
| **R-7** | Applies **K-016**: the API key arrives through `app_config`, which is TTL-cached. Any verification step that changes it must state the TTL/restart window rather than read an empty result as a failure |
| **OQ-1** | **How is the verdict represented on the result?** A new `result_status` pair (mirroring the existing `*_IN_PRMS` statuses 16–19) or a sync-state field only? Note that 23/24/25 are **not** available for reuse — they describe STAR's own pre-push review and are wired into a status-transition graph |
| **OQ-2** | **Does a REJECT reopen editing?** `is_synced_to_prms` currently makes the Pool Funding Alignment PATCH return `409` for everyone, including `SYSTEM_ADMIN` (family R-F3). If a rejected result must be fixable, that gate has to learn about verdicts — a product decision, not a technical one |
| **OQ-3** | **Production host unknown.** `main-allianceindicators.ciat.cgiar.org` and `allianceindicators.ciat.cgiar.org` both return NXDOMAIN from here. The PROD callback URL has to come from whoever owns the AWS deployment |
| **OQ-4** | **What is kept from `data`?** The callback carries the full enriched result document. Storing it whole is simplest and most useful for a history; it is also a large JSON blob per delivery, and it may contain fields STAR has no basis to retain |
| **OQ-5** | **Who may read the history, and at what grain?** Contributor, Center Admin, PI and `SYSTEM_ADMIN` do not obviously get the same view — and this answer shapes the table's read surface even though no UI is built here |

**Kaizen lessons in force for this child:** **K-005** (TEST/PROD as discriminators, never collapsed) · **KZ-017** (every verification names what it structurally cannot reach — the callback path in particular cannot be proven by any test that does not originate outside the CIAT network) · **K-016** (TTL-cached config) · **K-004/KZ-014** (the dedupe gate and the secret gate must each be observed *failing* before either is cited as evidence).

---

## 12. Success Criteria

- `GET`ting the registered destination from inside STAR returns what PRMS actually has on file, and correctly reports the *"nothing registered"* case — which arrives as `200` with an empty object, not as an error.
- A delivery posted to the callback endpoint is **stored and acknowledged with `2xx`**, and the acknowledgement does not wait on result-state work.
- The same `x-prms-delivery-id` delivered twice produces **one** applied decision and a history that shows the repeat. The dedupe is proven by a test observed failing without it (**K-004**).
- A delivery whose `external_reference` matches no STAR result, and a delivery whose `external_reference` is `null`, are both **recorded** — with their correlation outcome — and neither is dropped nor crashes the endpoint.
- A correlated APPROVE and a correlated REJECT each leave the result in the right verdict state, with `justification` retained verbatim on the REJECT.
- A request without the shared secret is refused, and the refusal is observed failing-open once before being trusted.
- Registration against the PROD host is impossible from local/dev by configuration, not by discipline (**K-005**) — and the test states what it cannot reach.
- **Live proof is explicitly deferred to R-1.** No claim of end-to-end delivery may be made from inside the CIAT network; the spec must say so rather than let a green local test stand in for it.

---

## 13. Next Step

```text
/akili-specify bilateral/prms-sync/decision-webhook
```

Before that command runs, two things belong in the repo or in an answer:

1. Copy the *PRMS Result Decision Webhooks* document out of `~/Downloads` and into the repo (family risk R-F5 — same obligation the Normalizer doc already carries).
2. An infrastructure answer on R-1. `/akili-specify` can proceed without it, but the spec will be unverifiable end to end until it exists.
