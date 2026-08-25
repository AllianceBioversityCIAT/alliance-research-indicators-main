# Proposal — PRMS SYNC Button UX (client)

## 1. Document Control

| Field | Value |
|---|---|
| Spec path | `bilateral/prms-sync/sync-button-ux` |
| Parent Spec | `bilateral/prms-sync` (see [`../family.md`](../family.md)) |
| Type | Change |
| Approval Mode | gated |
| Date | 2026-08-21 |
| Depends on | `prms-sync/sync-engine` |
| Slug | `sync-button-ux` — derived from free-text argument |

## 2. Intent

The already-shipped PRMS SYNC button actually syncs: click → confirm → call the sync endpoint → clear success/failure feedback → the result visibly becomes "Synced to PRMS" and the Pool Funding Alignment section locks, without the contributor ever needing to understand the plumbing.

## 3. Problem / Current Behavior

- `result-sidebar.component` renders the button with the correct enablement (`canSyncPrms`: `status_id === 6` + `pool_funding_alignment` green check) and tooltip, but `onPrmsSync()` is an empty placeholder.
- The alignment page already *tells* users to use the button ("Use **PRMS SYNC** in the sidebar to transmit…", `pool-funding-alignment.component.html:494`) — the copy promises behavior that does not exist.
- The synced state already has presentation building blocks (`isSyncedToPrms` computed, `'pf-synced'` badge in `STATUS_COLOR_MAP`, read-only cause distinction) with no way to ever become true.

## 4. Proposed Outcome

- Click → **confirmation modal** via the `all-modals`/`modal` host (outward-facing, effectively irreversible action → confirm per UX principle 6) stating what will be sent and to which platform.
- In-flight: button disabled + spinner; result metadata refreshed on completion.
- **Success:** toast + sidebar/alignment flip to the synced presentation (`pf-synced` badge, read-only alignment) without reload; socket event or metadata refetch keeps other open tabs coherent (existing `result.pool-funding-alignment.changed` pattern). When `prms_result_code` is available, the synced state **shows the PRMS reference** (code, and a deep link if PRMS exposes one — same affordance family as the existing "Open result in PRMS" header link for external results).
- **Failure (transparent-to-user, OQ-F6):** a calm, non-technical message — "Sync scheduled/pending; the team will retry" style (final copy at specify) — never a raw error dump; the failed state is what children 3–4 surface to admins/PI.
- All feedback flows through `ActionsService` (toasts/alerts); errors respect the `httpErrorInterceptor` conventions (likely a URL-scoped exception so the component owns the message).
- Tokens only (`.abc-*`/`.atc-*`/`var(--ac-*)`) — the current button hardcodes hex (`#035BA9`, `#E8EBED`…), which §7.1 forbids; migrate to tokens in this change. A11y: WCAG 2.1 AA, non-color status cues, `aria-live` feedback.

## 5. Scope

Client package only: `result-sidebar` handler + service call (via `ApiService`/`BilateralService`), confirm modal content, state refresh wiring, copy, tests (allowed/denied/failure paths), token cleanup on the button.

## 6. Non-Goals

- No enablement-rule changes (already correct). No re-sync surface (child 3). No PI panel (child 4). No un-sync.

## 7. Affected Users, Systems, And Specs

Contributors/approvers viewing an Approved result (button becomes real); `result-sidebar`, `pool-funding-alignment` page (banner copy finally true); `MainResponse<T>` consumption of the new endpoint.

## 8. Visual Reference

- Source: User-provided mockup (**Image #60**, chat 2026-08-21) — shows the sidebar button style already implemented. **Not persisted in the repo**; re-share to save under `docs/specs/bilateral/prms-sync/mockup/`. The confirm modal + success/failure states have **no mockup yet** → offer `stitch-design`/`claude-design` generation at `/akili-specify` if Figma doesn't exist.
- Notes: existing button UI counts as the approved baseline for idle/disabled states.

## 9. Requirement Delta Preview

### ADDED
- Confirm → sync → feedback flow; in-flight state; synced-state live refresh; failure copy.

### MODIFIED
- `onPrmsSync()` placeholder becomes real; button styling moves to tokens.

### REMOVED
- None.

## 10. Approach Options

| Option | Description | Trade-off |
|---|---|---|
| **A (recommended)** | Confirm modal + synchronous call + toast, metadata refetch on completion | Matches option A on the server child; simplest honest UX |
| B | Fire-and-forget with optimistic "synced" UI | Lies when ingest rejects (R-F1); rejected |

## 11. Risks, Dependencies, And Open Questions

Blocked by `sync-engine` contract. OQ-F6 (failure copy semantics) must close at specify. Risk: double-click / concurrent sync → server idempotency (child 1) + client disable-in-flight.

## 12. Success Criteria

- Approved+complete result: click → confirm → success path renders synced badge and locked alignment with no reload.
- Failure path shows the calm message, leaves the button re-enabled, and the result NOT marked synced.
- No new hex literals; existing ones on this button removed. Jest coverage floors hold.

## 13. Next Step

```text
/akili-specify bilateral/prms-sync/sync-button-ux
```
