# Design — Bilateral / PRMS Sync Status Panel

- **Module:** bilateral (client `result-sidebar` + server `result-prms-sync`)
- **Spec id:** 2026-09-sync-status-panel
- **Status:** draft
- **Owner:** Juan Cadavid / ARI
- **Linked requirements:** [`./requirements.md`](./requirements.md)
- **Linked TRD:** [`docs/trd/trd.md`](../../../../trd/trd.md) §9.1 (integrations), §7.1 (result lifecycle)
- **Family:** [`../family.md`](../family.md) — child 6
- **Last updated:** 2026-09-25
- **Depth:** Standard

---

## 1. Executive summary

One new read endpoint feeds two new client components. Nothing is written, no schema changes, no migration.

The load-bearing discovery is in §11 **P-3**: **16 of the 19 results that display a PRMS code today have no history row at all.** A design that simply swaps the old line for the new card would blank the PRMS code for 84 % of them. §12 **D-1** keeps the old line as the fallback, and that is the single most important decision in this document.

---

## 2. Goals & non-goals

**Goals**

1. Serve the whole per-result synchronization history in one authenticated call (R-SSP-001).
2. Render the latest event as a card in the result sidebar (R-SSP-002 … R-SSP-008).
3. Render the full timeline in a modal (R-SSP-009).
4. Do it without regressing what the sidebar shows today (R-SSP-002 AC.3 as amended by D-1).

**Non-goals**

- The `changes` payload and the `See what changed` button — deferred by the owner.
- A cross-result history feed, pagination, filtering.
- Backfilling `prms_phase_id` — **raised and decided against, 2026-09-25** (D-2). The hidden button is the intended signal that the write failed.
- Any change to the push path, `is_synced_to_prms`, or the alignment 409 gate.
- Any change to `result_prms_sync_history`'s schema.

---

## 3. Architecture

```
  Browser
    │  GET /api/results/:resultCode/prms-sync/history
    ▼
  ResultPrmsSyncController            (existing controller, new handler)
    │  RolesGuard + ResultOwnerGuard  (identical stack to GET …/prms-sync)
    ▼
  PrmsSyncHistoryReader               (NEW — sibling of ResultPrmsSyncStatusReader)
    │
    ├─► results                       official code, report year, prms_result_code, prms_phase_id
    ├─► result_prms_sync_history      events, filtered + ordered here
    └─► sec_users                     LEFT JOIN on actor_user_id
```

The reader is a **new file beside the existing one**, not an extension of it. `ResultPrmsSyncStatusReader` is pinned by a spec that asserts its SQL **never mentions `prms_phase_id`** (`result-prms-sync-status.reader.spec.ts:336`) — a deliberate boundary from the sibling spec. Widening it would fight a test somebody wrote on purpose.

### 3.1 Composition

**Server** — all under `server/researchindicators/src/domain/entities/result-prms-sync/`:

| Path | Responsibility |
|---|---|
| `prms-sync-history.reader.ts` | **NEW.** The three queries (events, count, result metadata) and the row→DTO mapping. |
| `dto/prms-sync-history.dto.ts` | **NEW.** `PrmsSyncHistoryDto` + `PrmsSyncHistoryEventDto`, `@ApiProperty` on every field. |
| `result-prms-sync.controller.ts` | **MODIFIED.** One `@Get('history')` handler. |
| `result-prms-sync.module.ts` | **MODIFIED.** Register the new reader as a provider. |

**Client** — under `client/research-indicators/src/app/shared/`:

| Path | Responsibility |
|---|---|
| `components/prms-sync-card/` | **NEW** standalone component — the card (title, badge, pill, actor, ID, button, link, advisory). |
| `components/prms-sync-history-modal/` | **NEW** standalone component — the timeline modal. |
| `utils/prms-sync-status.util.ts` | **NEW.** The single status→label+tone formatter (R-SSP-005 AC.4) and the headline derivation (R-SSP-009). |
| `interfaces/prms-sync-history.interface.ts` | **NEW.** Hand-mirrored response contract. |
| `services/api.service.ts` | **MODIFIED.** `GET_PrmsSyncHistory`. |
| `components/result-sidebar/` | **MODIFIED.** Mounts the card; keeps the legacy line as fallback (D-1). |

> **No route-registration risk.** The handler goes on the **existing** `ResultPrmsSyncController`, already mounted at `main.routes.ts:91-92` and already in the module graph. The 404-on-unregistered-module trap (`server/.../src/CLAUDE.md` §4) does not apply — no new module is created.

### 3.2 Reuse

`ResultsUtil` (result + version resolution) · `RolesGuard` · `ResultOwnerGuard` · `@ResultOwner()` · `ResponseUtils.format` · `LoggerUtil` · `environment.prmsUrl` · `ApiService.TP` · PrimeNG `DialogModule` (13 files already use it) · the `sec_users` join idiom at `result-status-workflow.repository.ts:95`.

**Not reused, deliberately:** `ResultPrmsSyncStatusReader` (see §3) and `PrmsWebhookDeliveryRepository.findHistoryByResultCodeAndYear` — the latter orders `occurred_at ASC` with no duplicate filter (`prms-webhook-delivery.repository.ts:350-369`), which is the opposite of what the modal needs. The sibling's own `execution.md` says that method's ordering "belong[s] to the UI spec". This spec does **not** edit it (it has passing tests pinning the current shape); it writes its own.

---

## 4. Data model

**No change.** Read-only against `result_prms_sync_history`, `results`, `sec_users`.

No new index. `idx_result_prms_sync_history_code_year` on (`result_official_code`, `result_year`) already exists (`1790086170692-createPrmsWebhookDeliveryTable.ts:83`) and is exactly this spec's access path.

---

## 5. API surface

### `GET /api/results/:resultCode/prms-sync/history`

**No version segment** — see requirements §6. The sibling handler declares no `@Version`; adding one here would mount at a path the client does not call.

- **Controller:** `result-prms-sync.controller.ts`, new `@Get('history')`
- **Guards:** `@Roles(CONTRIBUTOR, CENTER_ADMIN, SYSTEM_ADMIN)`, `RolesGuard`, `@ResultOwner()`, `ResultOwnerGuard`
- **Swagger:** `@ApiTags`, `@ApiBearerAuth`, `@ApiOperation` — required
- **Data shape:** as requirements §6
- **Errors:** 401 / 403 / 404, all through `GlobalExceptions`

Three statements, not one join — simpler to test and each one falsifiable on its own:

```
Q1 result metadata   SELECT result_official_code, report_year_id, prms_result_code, prms_phase_id
                     FROM results WHERE result_id = ?

Q2 events            SELECT h.*, su.first_name, su.last_name
                     FROM result_prms_sync_history h
                     LEFT JOIN sec_users su ON su.sec_user_id = h.actor_user_id
                     WHERE h.result_official_code = ? AND h.result_year = ?
                       AND h.duplicate_of_id IS NULL AND h.is_active = TRUE
                     ORDER BY COALESCE(h.decided_at, h.occurred_at) DESC, h.id DESC

Q3 sync count        SELECT COUNT(*) FROM result_prms_sync_history
                     WHERE result_official_code = ? AND result_year = ?
                       AND event_source = 'STAR' AND status = 'PENDING_REVIEW'
                       AND duplicate_of_id IS NULL AND is_active = TRUE
```

> ⚠️ **Operator precedence is a real defect class here (KZ-017).** Q2 and Q3 are flat `AND` chains on purpose — no `OR` anywhere. If a future change introduces one, the gate must assert the **emitted SQL string**, never the call sequence that built it: a mocked query builder cannot represent `A OR B AND C`.

---

## 6. Workflows & business rules

### 6.1 Card state resolution

```
events = response.events            (already ordered newest-first by the server)

if events.length > 0:
    latest = events[0]
    render NEW CARD
elif response.prms_result_code != null:
    render LEGACY LINE  "PRMS code #<code>"        ← D-1
else:
    render NOTHING
```

### 6.2 Title / tone (R-SSP-003)

| latest.event_source | latest value | Title | Tone |
|---|---|---|---|
| `STAR` | `status = PENDING_REVIEW` | Synchronized with PRMS | success |
| `PRMS` | `decision = APPROVE` | Approved by PRMS | success |
| `PRMS` | `decision = REJECT` | Returned by PRMS | warning |
| `PRMS` | anything else (`MALFORMED`) | Synchronized with PRMS | success |

### 6.3 Pill value source (R-SSP-005)

`event_source === 'STAR' ? row.status : row.decision`

**Why `decision` and not `status` for inbound rows:** every inbound row written before commit `13ad5e8d` (2026-09-25) has `status = NULL`. The live 2026-09-24 row is one of them (§11 P-5). Reading `status` for PRMS rows renders a blank pill on real production data.

### 6.4 Headline derivation (R-SSP-009)

Computed over the array **in chronological order** (reverse of display order), so "earliest STAR row" and "previous event" are well defined:

1. `STAR` and no earlier `STAR` row exists → `First synchronization`
2. `STAR` and the immediately preceding event is `PRMS`/`REJECT` → `Mapping re-synced after rejection`
3. `STAR` otherwise → `Mapping re-synced`
4. `PRMS`/`APPROVE` → `PRMS approved the mapping`
5. `PRMS`/`REJECT` → `PRMS returned the mapping`

### 6.5 Deep link (R-SSP-007)

```
enabled  = prms_result_code != null && prms_phase_id != null
href     = `${environment.prmsUrl}/reports/result-details/${prms_result_code}?phase=${prms_phase_id}`
target   = _blank, rel="noopener noreferrer"
```

**Side effects: none.** No write, no audit row, no OpenSearch reindex, no socket emit, no `sync_process_log` entry. No transactional boundary — three independent reads.

---

## 7. Frontend component architecture

```
app-result-sidebar
└── app-prms-sync-card                    [events.length > 0]
    ├── header      ✓/⚠ icon + title + Sync #N badge
    ├── status row  "PRMS" label + status pill
    ├── actor       "by <name>"            [name resolved]
    ├── prms id     "PRMS ID: <code>"      [code != null]
    ├── p-button    "Open Result in PRMS"  [code != null && phase != null]
    ├── link        "View full sync history"
    └── advisory    "Science Program updated this mapping"  [latest is STAR/PENDING_REVIEW]

app-prms-sync-history-modal                (p-dialog, opened by the link)
└── entry[]  pill · timestamp · headline · subline · [REVIEWER COMMENT block]
```

### 7.1 Design tokens

Three tones, each needing a background, a border and a foreground:

| Tone | Used by |
|---|---|
| success | card surface + title (`Synchronized`, `Approved`), `Approved` pill |
| warning | `Returned by PRMS` title, `Pending Review` pill, the advisory box, the Sync badge ring |
| danger | `Rejected` pill |

Values are **not transcribed from the mockup PNGs** — see D-3 for how they are sourced.

### 7.2 States

| State | Card area |
|---|---|
| loading | skeleton / spinner (never the empty state — NFR K-016) |
| loaded, events present | the card |
| loaded, no events, code present | legacy `PRMS code #…` line |
| loaded, nothing | nothing |
| request failed | nothing, sidebar otherwise intact, error logged not rendered |

---

## 8. Security & authorization

Guard stack is **copied, not designed** (NFR-SSP-001). No machine-token path is added. No secret, no PII beyond what the sidebar already shows — `reviewer_name` and the actor's name are names of people acting in a reporting workflow, the same class of data `Submission History` already renders.

`justification` is reviewer free text and is rendered as **text**, never as HTML — Angular interpolation escapes by default; no `[innerHTML]` anywhere in the modal.

---

## 9. Observability

One log line on a failed history read, via `LoggerUtil`, carrying `result_official_code` and `result_year` — never the raw SQL, never a user name. No new `sync_process_log` row type (this is a read path).

---

## 10. Testing strategy

| Tier | Files | Covers |
|---|---|---|
| server unit | `prms-sync-history.reader.spec.ts` | DC-1, DC-2 — ordering, duplicate/active filters, count predicates, actor-branch mapping |
| server unit | `result-prms-sync.controller.spec.ts` (extend) | DC-6 — guard metadata parity + denied role |
| server e2e | `test/prms-sync.e2e-spec.ts` (extend) | DC-7 — unversioned `200` / versioned `404` |
| server unit | `result-prms-sync-status.reader.spec.ts` (**unchanged**) | DC-8 — the existing contract must stay green |
| client unit | `prms-sync-status.util.spec.ts` | DC-5 — label mapping, headline derivation |
| client unit | `prms-sync-card.component.spec.ts` | DC-3, DC-4 — actor branch, href, suppression |
| client unit | `prms-sync-history-modal.component.spec.ts` | timeline order, comment block presence/absence, focus + Escape |
| client unit | `result-sidebar.component.spec.ts` (**amend**) | D-1 fallback; the 5 legacy assertions |
| **human** | — | **DC-9 — the only gate for visual fidelity** |

Global thresholds unchanged (server 60 %; client 40/20/45/30).

**Mock strategy:** the reader is tested against a fake query executor asserting the **emitted SQL text and its parameter array**, per KZ-001 — a property that lives in generated SQL is asserted there, never on the call sequence.

---

## 11. Premise Ledger

**Counts:** 14 rows — **13 verified**, **1 `UNVERIFIED`** (of the `UNVERIFIED`: 0 `High`, 1 `Low`).
**Blast-radius triggers:** `live-path` **fired** (the design names a user action: opening a result page) · `consumer` **fired** (the design deletes a rendered DOM hook) · `shared-state` **fired** (`result-sidebar` is a shared shell on every result route).

| # | Claim | Class | Citation (as run) | Verified at | If false | Settled by |
|---|---|---|---|---|---|---|
| **P-1** | The sibling handler declares no `@Version`, so the new endpoint must be unversioned. | `existence` | `grep -n "@Version" server/researchindicators/src/domain/entities/result-prms-sync/result-prms-sync.controller.ts` → **no output**. Client calls `results/${resultCode}/prms-sync` (`api.service.ts:1073`), pinned by `api.service.spec.ts:662-670`. | `13ad5e8d` | §5's path is wrong and the client 404s. Impact **High**. | — |
| **P-2** | `result_prms_sync_history` exists on the Dev database with all 30 columns. | `data-env` | `npm run typeorm migration:show` → `[X] 401 CreatePrmsWebhookDeliveryTable1790086170692`, **0 pending** of 339. `information_schema.COLUMNS` for the table returns 30 rows including `status`, `reviewer_name`, `event_source`. | `13ad5e8d` | Every query in §5 fails at runtime; the spec cannot be exercised on Dev. Impact **High**. | — |
| **P-3** | **16 of 19** active results carrying `prms_result_code` have **no** history row for their (official code, year). | `data-env` | Query as run on Dev, 2026-09-25: `results_with_code=19`, `synced_but_no_history=16`, `codes_with_history=3`. | `13ad5e8d` | **D-1's legacy fallback is unnecessary.** Impact **High** — this premise *is* D-1. | — |
| **P-4** | **17 of 19** of those results have `prms_result_code` but `prms_phase_id IS NULL`. | `data-env` | Same query: `code_but_no_phase=17`. | `13ad5e8d` | D-2's warning is overstated and the button renders for most results. Impact **High**. | — |
| **P-5** | Inbound rows written before `13ad5e8d` carry `status = NULL`; the live 2026-09-24 row is one. | `data-env` | Dev row `id=1`: `event_source=PRMS`, `decision=APPROVE`, `status=null`, `reviewer_name=null`, `prms_result_code=null`. | `13ad5e8d` | §6.3 could read `status` for PRMS rows. Impact **Low** — the rule is correct either way, only its justification changes. | — |
| **P-6** | Nothing backfills `prms_phase_id`; it is written only on a successful push, to `results`, best-effort outside the settle transaction. | `location` | `result-prms-sync-log.repository.ts:488-492` (comment: *"`prms_result_code` and `prms_phase_id` are METADATA and deliberately do NOT ride along"*), `:520-532` (`UPDATE results SET prms_result_code = ?, prms_phase_id = ?`). `result_prms_sync_log` has **no** `prms_phase_id` column — `information_schema` lists 18 columns, none named so. | `13ad5e8d` | A backfill source exists and D-2's options change. Impact **High**. | — |
| **P-7** | `ResultPrmsSyncStatusReader`'s SQL is pinned to **not** mention `prms_phase_id`. | `other` | `result-prms-sync-status.reader.spec.ts:336` — `expect(issuedSql(query).join('\n')).not.toMatch(/prms_phase_id/);` | `13ad5e8d` | §3's "new reader beside the old one" is unnecessary; one reader would do. Impact **Low** — a task merges, the approach stands. | — |
| **P-8** | No HTTP surface exposes history rows today; `findHistory*` has no non-test caller. | `existence` | `grep -rn "findHistory\|findHistoryByResultCodeAndYear" server/researchindicators/src/` → 2 declarations + 4 spec call sites only. `grep -n "findHistory" <each of the 3 controllers>` → no output. | `13ad5e8d` | The endpoint already exists and this spec duplicates it. Impact **High**. | — |
| **P-9** | `environment.prmsUrl` exists per environment and differs between them. | `data-env` | `environments/environment.ts:31` → `"https://reporting.cgiar.org"`; `environment.dev.ts:33` → `"https://prtest.ciat.cgiar.org"`. | `13ad5e8d` | R-SSP-007 AC.4 is moot and a literal host would be acceptable. Impact **Low**. | — |
| **P-10** | **`live-path`** — a user opening a result reaches `app-result-sidebar`, and it is the **only** mount point. | `live-path` | Dispatch chain: `app.routes.ts:82` `path: 'result/:id'` → `loadComponent` `@platform/pages/result/result.component` (`:83`) → `result.component.html:2` `<app-result-sidebar></app-result-sidebar>`. Repo-wide sweep `grep -rn "app-result-sidebar" client/research-indicators/src --include="*.html"` → **2 hits**, of which one (`innovation-use-actor-item.component.html:82`) is a **comment**, not a mount. **No branch point** — no portfolio flag, no API version, no feature toggle gates the sidebar itself. | `13ad5e8d` | The card is mounted somewhere the user never reaches, or is missing from a second route. Impact **High**. | — |
| **P-11** | **`consumer`** — the DOM hook `data-testid="sidebar-prms-result-code"` and the computed `prmsResultCode()` have exactly **7** readers, all in one component folder. | `consumer` | `grep -rn "prmsResultCode\|sidebar-prms-result-code" --include="*.ts" --include="*.html" --include="*.json" --include="*.feature" client/ server/` → 51 hits; the 44 server hits are an unrelated camelCase DTO field in `prms-normalizer` / `prms-webhook` / `result-prms-sync` and are **not** readers of this hook. The 7 client readers: `result-sidebar.component.html:196,199,200`; `result-sidebar.component.ts:155`; `result-sidebar.component.spec.ts:344,356,364` **and `:2429,:2437`** — **two separate clusters, not one**. Scope note: the client has **no** Cypress/Playwright/e2e suite — `find client/research-indicators/tests -type f` → 2 files, both mocks. | `13ad5e8d` | A consumer outside this folder breaks silently. Impact **Low** — a task adjusts. | — |
| **P-12** | **`shared-state`** — `app-result-sidebar` is a shared shell rendered on every result sub-route, so the card appears on all of them. Siblings reading the same sidebar state: `bilateralService.currentAlignment()` is read by `canSyncPrms()` (`:121-133`), `prmsAlreadySynced()` (`:135`), `prmsResultCode()` (`:155`), `prmsSyncTooltip()` (`:138-149`). | `shared-state` | `result-sidebar.component.ts:121-161`; mount at `result.component.html:2` with children declared from `app.routes.ts:90+`. | `13ad5e8d` | Deleting `prmsResultCode()` breaks a sibling computed. **Mitigated by D-1: the computed is kept, not deleted.** Impact **Low**. | — |
| **P-13** | PrimeNG `DialogModule` is an established modal idiom in this client. | `other` | `grep -rln "p-dialog\|DialogModule" client/research-indicators/src/app --include="*.ts" --include="*.html"` → **13 files**, e.g. `metadata-panel.component.{ts,html}`, `pool-funding-alignment.component.html`. | `13ad5e8d` | The modal needs a different mechanism. Impact **Low**. | — |
| **P-14** | The mockups' exact spacing, radii and shade values cannot be reproduced from the PNGs alone. | `other` | **UNVERIFIED — confirm at source before relying on it.** | — | §7.1's token sourcing is unnecessary and values can be transcribed. Impact **Low**. | **T-09** (the human visual check) and the owner at the HITL pause. |

---

## 12. Design decisions log

| # | Date | Decision | Rationale |
|---|---|---|---|
| **D-1** | 2026-09-25 | **Keep the legacy `PRMS code #…` line as a fallback** when the history is empty but `prms_result_code` is non-null. The computed `prmsResultCode()` is **kept**, not deleted. | **Step 2.3 reversion challenge, and it changed the design.** The challenge question — *what does removing this break?* — was answered by measurement, not reasoning: **16 of 19** results that show a PRMS code today have no history row (P-3). Deleting the line unconditionally blanks the code for **84 %** of them, and every one of those is a result somebody already synced. The naive swap would have shipped a regression that no unit test would catch, because the fixtures would all have history. **Requirements amendment owed:** R-SSP-002 AC.3 must be narrowed from *"must NOT render `PRMS code` anywhere"* to *"must NOT render it when the card renders"* — recorded in §14 OQ-D1. |
| **D-2** | 2026-09-25 | **Suppress the `Open Result in PRMS` button when `prms_phase_id` is null.** Do **not** emit a link without `?phase=`. | A PRMS URL without the phase parameter resolves to an error page — a broken link is worse than an absent one. **The cost is stated, not hidden: this hides the button for 17 of 19 synced results today** (P-4), and there is **no backfill source** — `result_prms_sync_log` has no such column, and the value is written only on a successful push, best-effort, outside the settle transaction (P-6). So the button is effectively *"works for results synced from now on"*. Rejected: emitting a phase-less link (broken). Rejected: defaulting the phase (family **P-1** — *what we do not have, we do not send*; guessing a phase authors reporting data). **OQ-D2 CLOSED 2026-09-25 by the owner, and the rationale is stronger than the one this row was written with.** A backfill was available and was **declined**: all 19 results are reporting year 2026 and both known `prms_phase_id` values are `36`, which the PRMS callback independently confirms is *Reporting 2026*, so `UPDATE results SET prms_phase_id = 36 …` would have recovered all 17. The owner's decision: **leave the button hidden, because its absence is the signal that the metadata write failed** — *"si no tiene la phase no colocas el boton asi sabre que algo no se guardo bien"*. That reframes D-2 from a limitation into a **diagnostic**: the missing button reports a real defect in the best-effort metadata write (P-6) instead of hiding it behind an inferred value. No backfill is to be run. |
| **D-3** | 2026-09-25 | **Source the three tones from the project's token utilities, not from the mockup PNGs**, and accept that the card will not be pixel-identical. | Requirements **R-1**: the host component uses **18 raw Tailwind hex literals and zero token utilities** (`grep -c "abc-\|atc-\|rs-\|fs-" result-sidebar.component.{html,scss}` → `0`). Root `CLAUDE.md` §4.2 forbids hex literals in components. Following the neighbour violates the constitution; following the constitution makes the card the only tokenized thing in the sidebar. **Chosen: follow the constitution.** The card is new code and new code obeys the rule; the surrounding legacy is not in scope to convert. Colour values transcribed from a PNG are also exactly what the requirements' *"numbers from images are not sources"* rule forbids (P-14). Consequence: the exact greens/ambers may differ from the mockup — that is a HITL decision at the visual check, not a silent one. |
| **D-4** | 2026-09-25 | **One endpoint serves both card and modal.** The modal issues no request. | NFR-SSP-002. The payload is bounded by the number of pushes for one result in one year — single digits in every observed case (`codes_with_history=3`, 3 rows total on Dev). Pagination would be machinery for a list that does not grow. Rejected: a card endpoint + a modal endpoint (two round trips, two contracts, one of them redundant). |
| **D-5** | 2026-09-25 | **A new handler on the existing `ResultPrmsSyncController`**, not a new module. | The controller is already mounted (`main.routes.ts:91-92`) and already in the module graph, so the "route node is not a registration → silent 404" trap (`server/.../src/CLAUDE.md` §4) is structurally out of reach. A new module would re-open it for no benefit. |
| **D-6** | 2026-09-25 | **A new reader file beside `ResultPrmsSyncStatusReader`,** not an extension of it. | P-7 — a spec deliberately asserts that reader's SQL never mentions `prms_phase_id`. Extending it means either breaking a purposeful test or threading the new columns around it. A sibling file costs one provider registration. |
| **D-7** | 2026-09-25 | **One shared status formatter** consumed by card and modal. | R-SSP-005 AC.4. Two implementations drift, and the pill is the one element rendered in both places. |
| **D-8** | 2026-09-25 | **PrimeNG `p-dialog` for the modal**, not the existing `app-section-sidebar` drawer. | The mockup is a centred modal over a dimmed backdrop, not a right-hand drawer. `p-dialog` is already the idiom in 13 files (P-13). `app-section-sidebar` is the drawer used by `Submission History` — a different affordance. |
| **D-9** | 2026-09-25 | **This spec does not edit `findHistoryByResultCodeAndYear`.** | The sibling's `execution.md` assigns its ordering/duplicate-filter fix to "the UI spec", which is this one — but that method has passing tests pinning its current shape and **no production caller** (P-8). Changing it would break green tests to fix code nobody runs. This spec writes its own query with the correct filters and leaves the dead method alone. Recorded so the deferral is visible rather than forgotten. |
| **D-10** | 2026-09-25 | **The live row is deliberately NOT linkable to PRMS. Only versions are.** The button's absence on a live row is correct behaviour, not a missing backfill and not a false signal. | **Owner-supplied domain rule, 2026-09-25 — it was not written anywhere and this spec would have "fixed" it as a defect.** A version is **approved and immutable**: its reporting year is fixed, so it is bound to exactly one PRMS phase, and that is the row PRMS receives (`HANDOFF.md` §1.1 — *"versions are what PRMS receives, because versions are the Approved rows"*). The **live row is bound to nothing** — *"la live puede cambiar el año cuando quiera"* — and a single result may hold versions in 2025, 2026 and 2027, each mapping to a different phase. Linking to PRMS from the live row would mean **guessing which phase**, which is family **P-1** (*what we do not have, we do not send*) in the outbound-link direction. Measured shape that exposes this: result `20010` carries `prms_result_code = 9636`, `prms_phase_id = 36` on its `is_snapshot = 1` row and **null on both columns** on its `is_snapshot = 0` row. **Consequence to keep in mind:** the card on a live row reads history by that row's *current* `report_year_id`, which can change; on a version it is stable by construction. Do not "repair" the live row by reading the version's metadata — that reintroduces the guess this rule forbids. |

---

## 13. Rollout

- **Migration order:** none — no schema change.
- **Feature flag:** none. The card degrades to the legacy line (D-1) and then to nothing, so an empty history is already the safe state.
- **Backout:** revert the code. No data to unwind.
- **Dependency:** the `PRMS` branches of R-SSP-003/005/006 cannot be exercised against real data until `decision-webhook`'s rollout completes (requirements §8 D-1). The `STAR` branches work the day this ships.
- **Comms:** the owner, because D-2 changes what users see for 17 of 19 already-synced results.

---

## 14. Budget (Step 2.4 tripwire)

| Metric | Estimate |
|---|---|
| Tasks | **9** |
| LOC | **≈ 1 250** (server ≈ 300 + client ≈ 480 + tests ≈ 470) |
| Review rounds | **2** |

Depth re-checked against the finished design: **Standard** holds — no migration, no new auth surface, no integration contract change. It is a large Standard, not a Full: the size comes from two new UI components plus their specs, not from risk.

**PR strategy:** the estimate exceeds ~400 LOC, so **two PRs** — PR 1 server (T-01…T-03), PR 2 client (T-04…T-09). The client PR depends on the server contract being merged.

`/akili-execute` escalates to the owner if actuals exceed these numbers rather than continuing.

---

## 15. Open questions

Carried from requirements §9: **OQ-1** (advisory copy) · **OQ-2** (pill tense) · **OQ-3** (sub-header count) · **OQ-4** (`(PI)` suffix) · **OQ-5** (`See what changed` ownership).

New in this phase:

| # | Question | Owner | Due |
|---|---|---|---|
| **OQ-D1** | R-SSP-002 AC.3 says the string `PRMS code` must never render. D-1 keeps it as the fallback. The AC needs narrowing to *"not while the card renders"*. Confirm the amendment. | Product owner | Phase 3 gate |
| ~~**OQ-D2**~~ | **CLOSED 2026-09-25.** Accepted, deliberately: the hidden button is a **signal that the metadata write failed**, not a gap to paper over. A `phase = 36` backfill was measured as viable and declined. See D-2. | Product owner | closed |
| **OQ-D3** | D-3 means the card will not be pixel-identical to the mockup (tokens vs the sidebar's hex literals). Accept, or convert the sidebar to tokens as a separate task? | Product owner | Visual check |

---

## 16. References

- [`../family.md`](../family.md) — child 6 row, added 2026-09-25
- [`../decision-webhook/`](../decision-webhook/) — the table this spec reads; **Pivot Record: T-01** in its `execution.md` is the design rationale for every column used here
- Mockups: `01-card-full.png`, `02-sync-badge.png`, `03-status-pill.png`, `04-actions-and-warning.png`, `05-history-modal.png`, `06-see-what-changed.png` (deferred)
- Commit `13ad5e8d` — populates `status` / `reviewer_name` / `prms_result_code` from the inbound callback
