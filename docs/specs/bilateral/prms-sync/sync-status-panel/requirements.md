# Requirements — Bilateral / PRMS Sync Status Panel

- **Module:** bilateral (client `result-sidebar` + server `result-prms-sync`)
- **Spec id:** 2026-09-sync-status-panel
- **Status:** draft
- **Owner:** Juan Cadavid / ARI
- **Linked PRD section:** [`docs/prd.md`](../../../../prd.md) §4.1 (G1, G4), §3.5 (PRMS as downstream consumer)
- **Linked tickets:** AC-1676 (family), AC-1675 (sibling — decision webhook)
- **Family:** [`../family.md`](../family.md) — **child 6**, depends on `decision-webhook`
- **Extends:** [`../decision-webhook`](../decision-webhook) — consumes the `result_prms_sync_history` table that child built
- **Last updated:** 2026-09-25

---

## 1. Context

When a result is pushed to PRMS the sidebar today renders one line — `PRMS code #9405` — and nothing else. It cannot say *when*, *who*, *what PRMS decided*, or *how many times the mapping has been sent*. All of that already exists in `result_prms_sync_history`: the table was redesigned on 2026-09-23 (the child-5 **Pivot Record: T-01**) specifically to feed this panel, and as of commit `13ad5e8d` (2026-09-25) the inbound callback populates `status`, `reviewer_name` and `prms_result_code` too.

**What this spec builds:** a synchronization **card** in the result sidebar, and a **full-history modal** behind it.

**What is explicitly NOT changing:**

- The `PRMS SYNC` button, its enablement rule, and its click handler (`result-sidebar.component.html:180-194`, `.ts:163-232`) — untouched.
- `result_prms_sync_history`'s schema. This spec **reads only**; it adds no column and no migration.
- The existing `GET …/prms-sync` status endpoint and its `last_decision` field — additive-only, per sibling **DD-9**.
- Pool Funding Alignment, `is_synced_to_prms`, and the 409 read-only gate (family **R-F3**).

**Affected surface, enumerated by what renders on the route** *(Kaizen KZ-002)* — the result route renders `app-result-sidebar` (shared shell, every result page) alongside `app-section-sidebar`. The card lives inside the shared sidebar, so **every result page inherits it**, not only Pool Funding Alignment. The `PRMS code #…` line being replaced is pinned by `result-sidebar.component.spec.ts:337-364`.

---

## 2. Requirement numbering

`R-SSP-<NNN>` — **S**ync **S**tatus **P**anel. Numbered in dependency order: the server read surface first, then the card, then the modal.

---

## 3. Functional requirements

### R-SSP-001 — Per-result synchronization history read endpoint

- **As a** result contributor
- **I want** STAR to serve the full synchronization history of my result in one call
- **So that** the sidebar card and the history modal render without a second round trip

**Details:**

- Inputs: path token `:resultCode`; no query params. The reporting year is resolved **server-side** from the result, never supplied by the client.
- Behavior:
  - Resolves the durable pair (`result_official_code`, `result_year`) from the result the route already resolved, then reads `result_prms_sync_history` on that pair.
  - Excludes rows with `duplicate_of_id IS NOT NULL` — a repeat delivery is recorded but is not a timeline entry (sibling `design.md` §4).
  - Excludes rows with `is_active = FALSE`.
  - Orders by `COALESCE(decided_at, occurred_at)` **DESC**, then `id` DESC — newest first, matching the modal.
  - Resolves `actor_user_id` → `sec_users.first_name` + `last_name` with a `LEFT JOIN` (precedent: `result-status-workflow.repository.ts:95`).
  - Computes `sync_count` = rows where `event_source = 'STAR' AND status = 'PENDING_REVIEW'`, under the same active/non-duplicate filters.
  - Returns `prms_result_code` and `prms_phase_id` read from `results`.
- Outputs: `ServerResponseDto` envelope, `data` shaped as `PrmsSyncHistoryDto` (see §6).
- Errors: `401` no token · `403` role or ownership denial · `404` unknown result code.
- Permissions: `@Roles(CONTRIBUTOR, CENTER_ADMIN, SYSTEM_ADMIN)` + `RolesGuard` + `@ResultOwner()` + `ResultOwnerGuard` — **byte-identical to the existing `GET …/prms-sync`** (`result-prms-sync.controller.ts:190-196`). This closes sibling **OQ-5**.

**Acceptance criteria:**

- [ ] AC.1 — A result with history returns `200`, `data.events` non-empty, newest entry first by `COALESCE(decided_at, occurred_at)`.
- [ ] AC.2 — A row whose `duplicate_of_id` is set is **absent** from `data.events` and is **not** counted in `sync_count`.
- [ ] AC.3 — `sync_count` equals the number of `STAR` + `PENDING_REVIEW` rows. Given 4 such rows plus 3 `PRMS` rows, `sync_count` is `4`, **not** `7`.
- [ ] AC.4 — A result never synced returns `200` with `data.events = []` and `sync_count = 0` — **not** `404`.
- [ ] AC.5 — A caller holding none of the three roles receives `403`; a `CONTRIBUTOR` who does not own the result receives `403`.
- [ ] AC.6 — The route resolves **without** a version segment: `/api/results/:resultCode/prms-sync/history` returns `200` and `/api/v1/results/:resultCode/prms-sync/history` returns `404`.
- [ ] AC.7 — `data.prms_phase_id` carries the value from `results.prms_phase_id`, `null` when the column is null.
- [ ] AC.8 — BUT it must NOT alter the response of the existing `GET …/prms-sync`; its `sync_state`, `last_attempt` and `last_decision` are byte-identical before and after.
- [ ] AC.9 — AND IT MUST resolve the actor name from `sec_users` for `STAR` rows only; a `PRMS` row returns `actor_name: null` even when `actor_user_id` is somehow populated.

**Out of scope:** a global (cross-result) history feed; pagination; the `changes` JSON payload.

---

### R-SSP-002 — The sidebar card renders the latest synchronization event

- **As a** result contributor
- **I want** the sidebar to show the current PRMS state instead of a bare code
- **So that** I can tell what PRMS has done with my result without leaving the page

**Details:**

- The card renders **only** when `data.events` is non-empty. A result never synced keeps today's behavior: no card.
- Every field on the card comes from `data.events[0]` — the single newest event — plus `sync_count`, `prms_result_code` and `prms_phase_id` from the envelope.
- The card replaces the `PRMS code #…` line at `result-sidebar.component.html:196-201`, which is deleted.

**Acceptance criteria:**

- [ ] AC.1 — GIVEN `events[0]` exists, WHEN the sidebar renders, THEN the card shows title, sync badge, status pill, actor line, PRMS ID, the PRMS button and the history link.
- [ ] AC.2 — GIVEN `events` is empty, THEN no card renders AND no empty shell, skeleton or placeholder text is shown.
- [ ] AC.3 — BUT it must NOT render the string `PRMS code` anywhere in the sidebar once the card ships.
- [ ] AC.4 — AND IT MUST leave the `PRMS SYNC` button's markup, tooltip and disabled rule unchanged.

---

### R-SSP-003 — Card title and tone vary by the latest event's state

- **As a** result contributor
- **I want** the card headline to name what actually happened
- **So that** "synchronized" does not keep showing after PRMS has already ruled

**Details:** three states, decided by `events[0]`:

| `event_source` | state value | Title | Icon | Tone |
|---|---|---|---|---|
| `STAR` | `status = PENDING_REVIEW` | **Synchronized with PRMS** | ✓ | success (green) |
| `PRMS` | `decision = APPROVE` | **Approved by PRMS** | ✓ | success (green) |
| `PRMS` | `decision = REJECT` | **Returned by PRMS** | ⚠ | warning (amber) |

**Acceptance criteria:**

- [ ] AC.1 — Latest event `STAR`/`PENDING_REVIEW` → title reads exactly `Synchronized with PRMS`.
- [ ] AC.2 — Latest event `PRMS`/`APPROVE` → title reads exactly `Approved by PRMS`.
- [ ] AC.3 — Latest event `PRMS`/`REJECT` → title reads exactly `Returned by PRMS` and the card tone is the warning tone, not the success tone.
- [ ] AC.4 — BUT it must NOT show `Synchronized with PRMS` when the newest event came from PRMS — the owner's rule is that this title means *a push happened last*.
- [ ] AC.5 — AND IT MUST fall back to the `PENDING_REVIEW` presentation when a `PRMS` row carries a `decision` outside `{APPROVE, REJECT}` (a `MALFORMED` delivery), never render a blank title.

---

### R-SSP-004 — The sync counter counts STAR pushes only

- **As a** result contributor
- **I want** a counter that says how many times this mapping has been sent
- **So that** I can see at a glance whether this is a first submission or a re-send

**Details:** the badge reads `Sync #<sync_count>` where `sync_count` is R-SSP-001's count — `event_source = 'STAR' AND status = 'PENDING_REVIEW'`, active and non-duplicate, scoped to (`result_official_code`, `result_year`).

**Acceptance criteria:**

- [ ] AC.1 — GIVEN 4 active non-duplicate `STAR`/`PENDING_REVIEW` rows for the result and year, THEN the badge reads `Sync #4`.
- [ ] AC.2 — BUT it must NOT count `PRMS` rows, duplicate rows, or rows with `is_active = FALSE`.
- [ ] AC.3 — AND IT MUST scope the count to the result's **own reporting year**; rows for the same official code in a different year do not contribute.
- [ ] AC.4 — The badge is hidden when `sync_count` is `0` (possible when the only events are inbound — see §8 A-3).

---

### R-SSP-005 — Status is rendered as a formatted label, never the raw value

- **As a** result contributor
- **I want** human wording
- **So that** the panel does not leak database vocabulary

**Details:** the pill is preceded by the static label `PRMS`. Its value is read per event source — `status` for a `STAR` row, `decision` for a `PRMS` row (the owner's rule, and the one that stays correct for the 2026-09-24 row whose `status` predates commit `13ad5e8d` and is `NULL`).

| Raw value | Rendered label | Tone |
|---|---|---|
| `PENDING_REVIEW` | Pending Review | amber |
| `APPROVE` / `APPROVED` | Approved | green |
| `REJECT` / `REJECTED` | Rejected | red |

**Acceptance criteria:**

- [ ] AC.1 — A `STAR`/`PENDING_REVIEW` event renders the pill text `Pending Review`.
- [ ] AC.2 — A `PRMS`/`APPROVE` event renders `Approved`; a `PRMS`/`REJECT` event renders `Rejected`.
- [ ] AC.3 — BUT it must NOT render any of the strings `PENDING_REVIEW`, `APPROVE`, `REJECT`, `APPROVED`, `REJECTED` in the DOM.
- [ ] AC.4 — AND IT MUST render the same three labels in the history modal's pills, from one shared formatter — not two implementations.

---

### R-SSP-006 — The actor line resolves by event source

- **As a** result contributor
- **I want** to see who acted
- **So that** a rejection has a name attached to it

**Details:**

| `event_source` | Source of the name |
|---|---|
| `STAR` | `actor_user_id` → `sec_users.first_name + ' ' + last_name` |
| `PRMS` | `reviewer_name` verbatim (a PRMS reviewer has no STAR identity — sibling design §4) |

Rendered as `by <name>`.

**Acceptance criteria:**

- [ ] AC.1 — A `STAR` event shows `by <first_name> <last_name>` resolved from `sec_users`.
- [ ] AC.2 — A `PRMS` event shows `by <reviewer_name>`.
- [ ] AC.3 — BUT it must NOT render the literal `by` with an empty name, `by null`, or `by undefined` — when the name is unresolved the whole line is omitted.
- [ ] AC.4 — AND IT MUST omit the line rather than fall back to an email, a user id, or `Unknown`.

> **Today `reviewer_name` is populated** (commit `13ad5e8d`), but every history row written before it has `reviewer_name = NULL`. AC.3 is therefore reachable with production data, not a theoretical branch.

---

### R-SSP-007 — PRMS ID and the deep link into PRMS

- **As a** result contributor
- **I want** to open the result in PRMS
- **So that** I can see the record on the other side without searching for it

**Details:**

- The card shows `PRMS ID: <prms_result_code>`. The label reads *PRMS ID*; the value is `prms_result_code` — one number, the same one the link uses (owner decision, 2026-09-25).
- The button reads `Open Result in PRMS`, carries an external-link icon, and opens `<prmsUrl>/reports/result-details/<prms_result_code>?phase=<prms_phase_id>` in a new tab.
- `prmsUrl` comes from `environment.prmsUrl` — `https://reporting.cgiar.org` in prod, `https://prtest.ciat.cgiar.org` in dev (`environments/environment.ts:31`, `environment.dev.ts:33`). It is **never** hardcoded.

**Acceptance criteria:**

- [ ] AC.1 — GIVEN `prms_result_code = 452` and `prms_phase_id = 6`, THEN the href is `<prmsUrl>/reports/result-details/452?phase=6`.
- [ ] AC.2 — The link opens in a new tab with `rel="noopener noreferrer"` (precedent: `version-selector.component.ts:244-256`).
- [ ] AC.3 — BUT it must NOT render the button when `prms_result_code` is null **or** `prms_phase_id` is null — a link missing `?phase=` lands on a PRMS error page, which is worse than no link.
- [ ] AC.4 — AND IT MUST take the host from `environment.prmsUrl`; a test that asserts the literal `reporting.cgiar.org` fails in the dev environment and is therefore not an acceptable gate.
- [ ] AC.5 — The `PRMS ID:` line renders whenever `prms_result_code` is non-null, **even when the button is suppressed** by a null phase.

---

### R-SSP-008 — Pending-review advisory

- **As a** result contributor
- **I want** a note telling me the mapping is awaiting a decision
- **So that** I do not re-send it or assume it is final

**Details:** an amber-bordered advisory renders **only** when `events[0]` is `STAR`/`PENDING_REVIEW`. Mock copy: `Science Program updated this mapping`.

**Acceptance criteria:**

- [ ] AC.1 — Latest event `STAR`/`PENDING_REVIEW` → the advisory renders.
- [ ] AC.2 — BUT it must NOT render when the latest event is `PRMS`/`APPROVE` or `PRMS`/`REJECT`.
- [ ] AC.3 — AND IT MUST render below the history link, inside the card, as the last element.

> ⚠️ **OQ-1 — the copy contradicts the trigger.** A `PENDING_REVIEW` row is *STAR's own push*; the Science Program has not acted on it. "Science Program updated this mapping" describes an inbound event. The trigger is implemented exactly as the owner stated it; the **wording** is carried as an open question, not silently changed.

---

### R-SSP-009 — Full synchronization history modal

- **As a** result contributor
- **I want** the complete timeline
- **So that** I can read what each reviewer said and when

**Details:**

- Opened by the `View full sync history` link on the card.
- Header: `SYNCHRONIZATION HISTORY`; sub-header `<N> synchronizations · PRMS ID <prms_result_code>`.
- One entry per event, newest first, each with: state pill (R-SSP-005 labels), timestamp `DD MMM YYYY, HH:mm`, a derived headline, a subline, and — when `justification` is non-empty — a `REVIEWER COMMENT · <NAME>` block.

**Derived headlines** (no column holds this text):

| Event | Headline | Subline |
|---|---|---|
| `STAR`, earliest `STAR` row | `First synchronization` | `<actor> · PRMS ID <code> assigned` (the `PRMS ID` clause only when `prms_result_code` is non-null) |
| `STAR`, any later row, previous event was `PRMS`/`REJECT` | `Mapping re-synced after rejection` | `<actor> · mapping corrected and sent again` |
| `STAR`, any later row, otherwise | `Mapping re-synced` | `<actor>` |
| `PRMS`/`APPROVE` | `PRMS approved the mapping` | `<reviewer_name>` + ` · <reviewer_role>` when non-null |
| `PRMS`/`REJECT` | `PRMS returned the mapping` | `<reviewer_name>` + ` · <reviewer_role>` when non-null |

**Acceptance criteria:**

- [ ] AC.1 — The modal lists every event the endpoint returned, newest first, one entry each.
- [ ] AC.2 — An event with a non-empty `justification` renders the `REVIEWER COMMENT · <NAME>` block with the text verbatim, whitespace preserved.
- [ ] AC.3 — BUT it must NOT render the comment block when `justification` is `null` or `''` — no empty bordered box.
- [ ] AC.4 — AND IT MUST derive the headline from the table above, including the `Mapping re-synced` variant, which the mockup does not show.
- [ ] AC.5 — The modal closes on the `Close` button, on backdrop click, and on `Escape`.
- [ ] AC.6 — BUT it must NOT render the `See what changed` button — deferred (§NG).
- [ ] AC.7 — `reviewer_role` is `null` for every delivery PRMS sends today; the subline MUST render name-only without a trailing separator.

> ⚠️ **OQ-2 — the mockup's `PRMS approved the mapping **with changes**`** is conditional on the `changes` payload, which this spec does not surface. The unconditional `PRMS approved the mapping` is specified instead.
>
> ⚠️ **OQ-3 — `Mariana Acosta (PI)`.** The `(PI)` suffix needs the actor's project role, which `result_prms_sync_history` does not store and this endpoint does not resolve. Specified as name-only.

---

### R-SSP-010 — Loading, error and degraded states

- **As a** result contributor
- **I want** the sidebar to behave while the history is loading or unavailable
- **So that** I cannot mistake "not yet" for "never synced" *(Kaizen K-016)*

**Acceptance criteria:**

- [ ] AC.1 — While the request is in flight the card area shows a loading affordance, not the empty state.
- [ ] AC.2 — On a failed request no card renders AND the rest of the sidebar renders normally — a history failure never blanks the sidebar.
- [ ] AC.3 — BUT it must NOT surface a raw HTTP error or stack text in the sidebar.
- [ ] AC.4 — AND IT MUST distinguish *loading*, *no history*, and *request failed* — the three must not collapse into one blank region.

---

## 4. Non-functional requirements

### NFR-SSP-001 — Authorization parity

- **Category:** security
- **Target:** the history endpoint's guard stack is identical to `GET …/prms-sync` — `@Roles(CONTRIBUTOR, CENTER_ADMIN, SYSTEM_ADMIN)`, `RolesGuard`, `@ResultOwner()`, `ResultOwnerGuard`. No new role, no new guard, no widened JWT exclusion.
- **How verified:** controller spec asserting the decorator metadata on the new handler equals that of the existing one, plus a denied-role case.

### NFR-SSP-002 — One round trip

- **Category:** performance
- **Target:** the card and the modal are served by a single request; opening the modal issues **no** additional HTTP call.
- **How verified:** component spec counting calls on the API service mock across render + modal open.

### NFR-SSP-003 — Accessibility

- **Category:** a11y
- **Target:** state is not conveyed by color alone (each pill carries its text label); the modal traps focus, is dismissable by `Escape`, and returns focus to the trigger link on close.
- **How verified:** component spec for focus return and `Escape`; **contrast is NOT machine-verifiable here — see §4.1.**

### NFR-SSP-004 — Theming

- **Category:** dx / consistency
- **Target:** the card uses the project's token utilities (`.abc-*`, `.atc-*`, `var(--ac-*)`) and renders correctly in light and dark.
- **How verified:** human check at the HITL pause. **See D-1 in `design.md` — the host component violates this rule today.**

> Inherited without restatement: `ServerResponseDto` on every response, `GlobalExceptions` for errors, `AuditableEntity` on mutations (this spec performs none).
>
> **Packaging (K-017): not applicable.** This spec ships no runtime artifact that must exist in `dist/` — no fixture, template, asset or seed is read at run time.

---

### 4.1 Defect classes and their gates

The gate is chosen against the defect, not the other way round. Classes this spec can actually produce:

| # | Defect class | Gate | Can it go red? |
|---|---|---|---|
| DC-1 | **Wrong row selected** — card shows a stale event, or a duplicate delivery | Repository spec over a fixture holding a duplicate row and a row whose `decided_at` and `occurred_at` disagree on order | Yes — flip the `ORDER BY` to `occurred_at` and the fixture's expected head changes |
| DC-2 | **Miscount** — `sync_count` includes inbound, inactive or duplicate rows | Repository spec over a fixture with all four row kinds and **distinct** counts per kind *(KZ-004: no identical defaults)* | Yes — drop any one predicate and the number moves |
| DC-3 | **Wrong actor branch** — `reviewer_name` shown for a STAR row or vice versa | Component spec asserting both branches with **different** names in the fixture | Yes — swap the branch and the rendered name changes |
| DC-4 | **Broken deep link** — missing `?phase=`, hardcoded host, button shown with a null phase | Component spec asserting the full href string and the suppression branch | Yes — remove `?phase=` and the asserted string differs |
| DC-5 | **Raw enum leaked** | Component spec asserting the DOM contains none of the five raw strings | Yes — render `{{ status }}` directly and it reddens |
| DC-6 | **Authorization regression** — history more permissive than the sibling endpoint | Controller spec comparing guard metadata + a denied-role case | Yes — drop `ResultOwnerGuard` and the comparison fails |
| DC-7 | **Versioned-path defect** — the endpoint mounted under `/api/v1/…` | e2e asserting `200` unversioned and `404` versioned | Yes — add `@Version('1')` and it reddens |
| DC-8 | **Contract regression** — the existing `GET …/prms-sync` response changes | Existing reader spec, unchanged, must stay green | Yes — it already pins `not.toMatch(/prms_phase_id/)` at `reader.spec.ts:336` |
| **DC-9** | **Visual fidelity** — spacing, colour, tone, dark mode, layout against the mockups | **NO AUTOMATED GATE.** jsdom cannot measure layout or contrast, and `axe` cannot evaluate a rendered card it never paints | **No** |

**DC-9 is the dominant defect class of this spec and it has no automated gate.** Named substitutes, per the skill's rule that an unacknowledged blind spot is the expensive kind:

1. **Human check at the HITL pause** — the owner compares the built card and modal against `01-card-full.png` … `05-history-modal.png` in the running app, in **both** light and dark mode, before `/akili-validate` issues a verdict.
2. **T6 Multimodal review** (optional) — a model that can read the screenshots diffs them against a screenshot of the built card.

**Accepted risk:** exact spacing, radii and shade values are not gated by anything automated. Recorded here deliberately.

---

## 5. Data requirements

**No schema change. No migration. Read-only.**

Tables read: `result_prms_sync_history` (all filters above), `results` (`result_official_code`, `report_year_id`, `prms_result_code`, `prms_phase_id`), `sec_users` (`sec_user_id`, `first_name`, `last_name`).

No new index is required: the sibling migration already ships `idx_result_prms_sync_history_code_year` on (`result_official_code`, `result_year`), which is exactly this spec's access path.

---

## 6. API surface delta

### `GET /api/results/:resultCode/prms-sync/history`

> ⚠️ **NO version segment.** `main.ts:53-56` enables URI versioning with **no `defaultVersion`**, so a handler mounts unversioned unless it declares `@Version(...)`. The sibling handler declares none (`grep @Version result-prms-sync.controller.ts` → no output) and the client calls `results/:code/prms-sync` accordingly. **The §6 line in `docs/specs/general-setup/requirements.md` that says "keep existing `/v1`" is a stale template default and does not apply.** Writing `/v1` here has already put a non-existent endpoint into three documents of one spec (root `CLAUDE.md` §4.1 → D-T11-b).

- **Controller:** `server/researchindicators/src/domain/entities/result-prms-sync/result-prms-sync.controller.ts` (new handler on the existing controller)
- **Roles / guards:** as NFR-SSP-001
- **Response data shape:**

```ts
{
  prms_result_code: number | null;
  prms_phase_id: number | null;
  sync_count: number;
  events: Array<{
    id: number;
    event_source: 'STAR' | 'PRMS';
    status: string | null;
    decision: string | null;
    occurred_at: string;
    decided_at: string | null;
    justification: string | null;
    actor_name: string | null;    // STAR rows only
    reviewer_name: string | null; // PRMS rows only
    reviewer_role: string | null; // null in practice today
  }>;
}
```

- **Swagger:** `@ApiTags`, `@ApiBearerAuth`, `@ApiOperation` REQUIRED.

---

## 7. Cross-system impact

- **STAR client** — this spec owns both sides; it is a single family child, not a cross-repo handoff. Client files: `result-sidebar.component.{ts,html,scss,spec.ts}`, a new card component, a new modal component, `api.service.ts`, a new interface file.
- **PRMS** — outbound deep link only. No new call to PRMS, no contract change.
- **OpenSearch / Socket.IO / RabbitMQ / DynamoDB / CLARISA / AGRESSO** — untouched.

---

## 8. Assumptions, dependencies, risks

| # | Item |
|---|---|
| **A-1** | `prms_phase_id` is written on a successful push (`result-prms-sync-log.repository.ts:488,524,537`) but **nothing backfills it** (entity comment, `result.entity.ts:205-207`). Results synced before that column existed will have it null → R-SSP-007 AC.3 suppression is the **normal** path for older results, not an edge case. |
| **A-2** | The 2026-09-24 production row (`id=1`) has `status = NULL` because it predates commit `13ad5e8d`. R-SSP-005's rule — read `decision` for PRMS rows — is what keeps it rendering correctly. |
| **A-3** | A result can have inbound events and zero STAR pushes if the history table was populated after the push (true today: rows `2` and `3` are STAR, row `1` is PRMS for a *different* result). R-SSP-004 AC.4 covers the `sync_count = 0` presentation. |
| **D-1** | Depends on `decision-webhook` (child 5) being **deployed**, not merely merged. Its rollout is blocked on the TEST registration round-trip and on R-1/OQ-6 (the PROD callback host). The card renders from STAR's own outbound rows without it, so this spec is **not blocked** — but the `PRMS` branches of R-SSP-003/005/006 cannot be exercised with real data until then. |
| **R-1** | The host component (`result-sidebar`) uses 18 raw Tailwind hex literals and **zero** token utilities (`grep -c "abc-\|atc-\|rs-\|fs-"` → `0`). NFR-SSP-004 and visual consistency with its neighbour are in direct conflict. **Mitigation:** decided in `design.md` D-1, not silently. |
| **R-2** | Deleting the `PRMS code #…` line breaks `result-sidebar.component.spec.ts:337-364`, which pins it. That is a **consumer**, not a surprise — carried into the owning task's `Consumers` field. |

---

## 9. Open questions

| # | Question | Owner | Due |
|---|---|---|---|
| **OQ-1** | The advisory copy *"Science Program updated this mapping"* describes an inbound event, but its trigger is STAR's own `PENDING_REVIEW` push. Keep the copy, or reword (e.g. *"Awaiting Science Program review"*)? Trigger implemented as stated either way. | Product owner | Phase 1 gate |
| **OQ-2** | Pill labels: the mockup renders **`Approved` / `Rejected` / `Pending Review`** (past tense); the verbal brief said **"Approve, Reject, Pending review"**. Specified per the mockup. Confirm. | Product owner | Phase 1 gate |
| **OQ-3** | The modal sub-header reads *"4 synchronizations"* over 4 timeline rows, of which only 2 are STAR pushes — so `synchronizations` means two different things in the badge and the sub-header. Specified as **total timeline entries**. Confirm, or align it to `sync_count`. | Product owner | Phase 1 gate |
| **OQ-4** | `(PI)` beside the STAR actor's name (mockup) needs the actor's project role, which the history table does not hold. Add a resolution step, or ship name-only? Specified name-only. | Product owner | Phase 2 |
| **OQ-5** | `See what changed` and the `changes` JSON — deferred by the owner. Does it become child 7, or a later increment of this child? | Product owner | After this child |

---

## 10. Sign-off

- [ ] Engineering lead —
- [ ] MEL / product owner —
- [ ] Security review (authorization surface — parity only, NFR-SSP-001) —
- [ ] DevOps — n/a (no infra change)

---

## 11. Requirement ID index

| ID | Title | Tier |
|---|---|---|
| R-SSP-001 | Per-result synchronization history read endpoint | server |
| R-SSP-002 | The sidebar card renders the latest synchronization event | client |
| R-SSP-003 | Card title and tone vary by the latest event's state | client |
| R-SSP-004 | The sync counter counts STAR pushes only | both |
| R-SSP-005 | Status is rendered as a formatted label, never the raw value | client |
| R-SSP-006 | The actor line resolves by event source | both |
| R-SSP-007 | PRMS ID and the deep link into PRMS | both |
| R-SSP-008 | Pending-review advisory | client |
| R-SSP-009 | Full synchronization history modal | client |
| R-SSP-010 | Loading, error and degraded states | client |
| NFR-SSP-001 | Authorization parity | server |
| NFR-SSP-002 | One round trip | both |
| NFR-SSP-003 | Accessibility | client |
| NFR-SSP-004 | Theming | client |
