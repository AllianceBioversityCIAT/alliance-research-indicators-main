# Judgment Day — bilateral/mapping-status-in-edit-modal (design)

- **Target:** `requirements.md` + `design.md` (draft, untracked) at HEAD `43dd6341`
- **Mode:** judgment_day, `/akili-specify` Step 2.5 Review Design
- **Judges:** A and B, blind, read-only (Explore), model `sonnet` (author ≠ auditor: design authored on opus)
- **Round:** closed after round 2 — APPROVED (non-severe R2 items carried into `tasks.md` T-03)

## Premise Ledger attack (merged)

| Row | Judge A | Judge B | Merged |
|---|---|---|---|
| P-1 | confirmed | confirmed | confirmed |
| P-2 | confirmed | confirmed (opens B-3) | confirmed |
| P-3 | confirmed (template also holds the hooks — own template) | confirmed | confirmed |
| P-4 | confirmed | confirmed | confirmed |
| P-5 | citations reproduce; model incomplete | citations reproduce; model wrong (stack-based) | **restate** — `ZIndexUtils.generateZIndex` is stack-based (`primeng-utils.mjs:283-318`), dialog set at `primeng-dialog.mjs:1102` |
| P-6 | confirmed | confirmed | confirmed |
| P-7 | confirmed (string trueValue precedent; partial) | confirmed (`ariaLabel` input) | confirmed, partial precedent |
| P-8 | partly refuted at source — normal case alert wins; loses only with a leaked `overlay` entry | not settled; focus-trap/Esc gap | keep `UNVERIFIED`-Low for runtime, add evidence; **new rows owed** for Esc/focus and the validator pipeline |

## Findings ledger

| ID | Severity | Judges | Finding | Status |
|---|---|---|---|---|
| J-1 | **severe** | A-1, B-1 | Save stays enabled while the confirm alert is open (`saving` false until confirm); keyboard Enter/Space re-fires `onSave`, `showGlobalAlert` appends a second alert → two requests, breaking R-MSE-004 "exactly one request". The alert's X closes without `cancelCallback`, so a flag cleared only on cancel would stick | **confirmed** |
| J-2 | **severe** | A-2, B-1 | `p-dialog` `closeOnEscape` (default true) closes the Edit dialog under the open confirm; confirm then runs against a closed dialog and a failure lands in an invisible `saveError` | **confirmed** |
| J-3 | warning | A-4, B-3 | Stale row: server idempotent early return (`service.ts:265-268`) answers 200 without writing `notes`; client toasts success and the justification is dropped. §6 "client never sends…" is false for stale data | info |
| J-4 | warning | A-3, B-8 | DD-3 picker reset discards an unsaved project edit and is not restored on toggle back; contradicts R-MSE-002 "restores normal edit behavior" | info |
| J-5 | warning | A-5, B-7 | §7.1 table lists `editSnapshot.is_active` while prose mandates an `initialActive` signal — two sources of truth | info |
| J-6 | warning | A-6, B-2 | P-5 z-index model incomplete (stack-based algorithm) | info |
| J-7 | warning / suggestion | A-7, B-9 | §8 "body forwarded" must be `body ?? {}`; spec assertions `bilateral-mapping.service.spec.ts:322,334,551` must be listed | info |
| J-8 | warning | A-8, B-6 | Rollout ignores stale SPA bundles: old row Deactivate sends `{}` → 400 after server deploy | info |
| J-9 | warning | A-9 | Ledger missing rows: p-dialog Esc/focus, validator pipeline, toggleswitch boolean binding | suspect (one judge) |
| J-10 | warning | B-4 | `applyStatusChange` re-reads live signals at confirm time; form editable behind the alert | suspect (one judge) — folds into J-1 fix |
| J-11 | warning | B-5 | `p-toggleswitch` needs the `[ariaLabel]` input, not a host `aria-label`; label/aria-label conflict | suspect (one judge) |
| J-12 | warning | B-1 | Dialog `pFocusTrap` keeps keyboard focus out of the alert buttons — confirm unreachable by keyboard | suspect (one judge) |
| J-13 | suggestion | A-10 | Activate DTO / update DTO have no `MaxLength`; cleared note `''` vs omitted undefined | info |
| J-14 | suggestion | A-11 | Justification survives Inactive→Active→Inactive within one open | info |
| J-15 | suggestion | A-12 | Alert `detail` rendered via `[innerHTML]` with the agreement id (pre-existing pattern) | info |
| J-16 | suggestion | B-10 | Name the validator decorators explicitly | info |

**Counts:** 2 confirmed severe · 0 contradictions · 4 suspect · 10 info.

## Correction — round 1 (owner chose "Fix and Re-judge", 2026-10-30)

Fix actor: the parent (spec author), docs only. Confirmed severe J-1, J-2 fixed; at the owner's request the presented warnings J-3, J-4, J-5, J-6, J-7, J-8 and the single-judge J-10, J-11, J-12 were also folded in, and J-9's missing rows were added.

| ID | Fix delta |
|---|---|
| J-1, J-10 | design §7.1 `confirmPending` signal; §7.2 `canSave` adds `!confirmPending()`; §7.3 step 0 re-entry guard, step 2 captured plan + `hideCloseButton` + cancel clears the flag, step 3 consumes the plan; DD-7. requirements R-MSE-004 new bullet + "Save pressed twice" scenario; §8 new defect row |
| J-2, J-12 | design §7.3 "While confirmPending" paragraph: `[closeOnEscape]` / `[focusTrap]` off while pending, form + Cancel disabled; P-9 row; requirements NFR-MSE-001 keyboard reach of Confirm/Cancel; §8 focus-trap row (HITL) |
| J-3 | design §6 idempotent-with-notes write; DD-8; reversion table row. requirements R-MSE-005 behavior + AC.6; §8 row |
| J-4 | design §7.1 `pickedProjectId` + `onStatusToggle`; DD-3 amended. requirements R-MSE-002 bullet + "Project pick survives a status round trip" scenario |
| J-5 | design §7.1 `initialActive` is the only source; `editSnapshot` holds project + notes only |
| J-6 | design P-5 restated with `generateZIndex` + `primeng-dialog.mjs:1102`; P-8 narrowed + fallback; requirements §9 risk reworded |
| J-7 | design §8 `body ?? {}`, assertions `service.spec.ts:322,334,553` (corrected in round 2; round 1 wrote 321/333/552) |
| J-8 | design §11 window; requirements §9 accepted risk |
| J-9 | P-9, P-10, P-11 added |
| J-11 | design §7.4 `[ariaLabel]` input, visible `<label for>` |
| J-14 | design §7.1 justification reset on every entry to Inactive |

Budget raised to ~450 LOC (same 4 tasks / 5 rounds).

## Re-judgment — round 1

Resolved by both: J-1, J-3, J-4, J-5, J-6, J-8, J-10, J-11, J-14, J-16. J-12 resolved at source (keyboard reach stays HITL). **Not resolved:** J-2.

| ID | Severity | Judges | Fix-caused / remaining defect |
|---|---|---|---|
| R1-1 | **severe** | A2-1, B2-1 | `[closeOnEscape]="!confirmPending()"` is inert: PrimeNG binds the Escape listener once at show (`primeng-dialog.mjs:1240-1250`, `:1334`); Escape and the header X call `close()` → `visibleChange(false)` (`:1300-1307`, `:1051-1054`). J-2 persists — **confirmed** |
| R1-2 | warning | A2-3 | §3 omits `service.ts` / `service.spec.ts` that DD-8 changes |
| R1-3 | warning | A2-4 | P-2 still states the early return DD-8 changes |
| R1-4 | warning | B2-2 | round-1 citation `service.spec.ts:321/333/552` off by one (real 322/334/553) — the parent's own regression |
| R1-5 | warning | B2-3 | `confirmPending` / `pickedProjectId` / `justification` not reset on every open |
| R1-6 | warning | B2-4 | `pickedProjectId` restore needs a "nothing stashed" sentinel |
| R1-7 | warning | A2-2 | header X stays operable while pending |
| R1-8 | suggestion | A2-5 | §2 diagram stale |

## Correction — round 2 (final allowed round; parent-launched after a failed re-judgment)

| ID | Fix delta |
|---|---|
| R1-1, R1-7 | design §7.3: `[visible]` + `(visibleChange)="onDialogVisibleChange($event)"` ignoring `false` while pending; `closeDialog()` early return while pending; `[closable]="!confirmPending()"`; `closeOnEscape` binding dropped. P-9 restated with the show-time listener evidence. requirements §8 gate asserts `visibleChange(false)`/`closeDialog()` while pending leave the modal open |
| R1-2 | design §3 lists `service.ts` + `service.spec.ts` |
| R1-3 | P-2 annotated |
| R1-4 | design §8 → 322/334/553; this file's J-7 row corrected |
| R1-5 | design §7.1 "Reset on every open" |
| R1-6 | design §7.1 `pickedProjectId` `undefined` sentinel |
| R1-8 | §2 diagram updated |

## Re-judgment — round 2

R1-1..R1-8 resolved by both judges. Both independently re-ran the PrimeNG path: with `[visible]` held `true`, `close()` (`primeng-dialog.mjs:1051-1054`) only emits; `_visible` is written only by the setter (`:778-782`) and `maskVisible=false` only on the hide-animation end (`:1368`) — the dialog stays rendered. No new severe defect.

| ID | Severity | Judges | Finding | Disposition |
|---|---|---|---|---|
| R2-1 | warning | A3-2, B3-1 | `onDialogVisibleChange` must still close on `false` when nothing is pending (one-way `[visible]` no longer closes itself); needs a spec | info → **carried into T-03 scope and tests** |
| R2-2 | warning | B3-2 | While a request is in flight (`saving()`, `confirmPending` already false) Escape/X can close the dialog and hide `saveError`; gate on `confirmPending() \|\| saving()` | info → **carried into T-03 scope** |
| R2-3 | warning | A3-1 | DD-7 still mentions `closeOnEscape` | info → wording only, carried into T-03 note |
| R2-4 | suggestion | A3-3 | Refocus Save after Cancel / failure | info → carried as optional in T-03 |
| R2-5 | suggestion | B3-3 | `[closable]` toggling shifts the header; cover in the HITL visual check | info → HITL |

**Counts (whole transaction):** confirmed severe 2 (round 1) + 1 (re-judgment 1) — all resolved · contradictions 0 · open severe 0.

JUDGMENT: APPROVED ✅
