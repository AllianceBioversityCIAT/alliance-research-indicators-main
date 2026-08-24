/**
 * Canonical `result_review_history` event/decision vocabulary.
 *
 * @sdd-spec docs/specs/changes/project-dashboard-v3/f4-advanced-insights — T-03, D-F4-7, D-F4-8
 *
 * `event_type` (varchar 50) and `decision` (varchar 20) on
 * `result_review_history` carry NO TypeORM enum and NO DB CHECK constraint
 * (see `../entities/result-review-history.entity.ts` and migration
 * `1779190000009-createResultReviewHistory.ts`) — there is no live enum to
 * assert against (D-F4-6's "verify against the live enum" clause was
 * unsatisfiable; superseded by D-F4-7).
 *
 * Confirmed live writers (grepped across `src/domain`, 2026-08-24):
 *   - `POOL_FUNDING_ALIGNMENT_CHANGED` — `bilateral.service.ts`, alignment edit.
 *   - `INDICATOR_MAPPING_CHANGED`      — `bilateral.service.ts`, mapping upsert/delete.
 *   - `decision` — written NOWHERE in the codebase.
 *     `BilateralService.reviewDecision(...)` — the one path that would write
 *     a submission→approval pair with a `decision` value — is currently a
 *     `NotImplementedException` stub.
 *
 * `REVIEW_DECISION` / `APPROVE` / `REJECT` / `EDIT` are FORWARD-LOOKING
 * values taken verbatim from the archived bilateral-module design
 * (`docs/specs/archive/2026-06-17-bilateral-module/design.md:479-480`, §10.3)
 * — documented intent for the review-decision workflow, never implemented.
 *
 * `RESULT_SUBMITTED` is a FORWARD-LOOKING value beyond the archived design's
 * illustrative list — added by owner-approved decision **D-F4-8** (Pivot
 * addendum, T-03 attempt-1 FAIL gate, 2026-08-24). It is the cycle-time
 * submission anchor. The audit-edit events above are explicitly NOT
 * submission proxies — that alternative (Pivot "Option B") was proposed and
 * REJECTED twice: once at the original T-03 Pivot, and again when attempt 1
 * shipped it anyway for the submission half without ratification (Reviewer
 * FAIL issue 1). Do not reintroduce it.
 *
 * This module is the canonical source of truth for the vocabulary AND for
 * which values play the submission/approval roles (`REVIEW_FLOW_*` below).
 * Any future `reviewDecision` implementation MUST import and write these
 * exact literals — write BOTH a `RESULT_SUBMITTED` event (at submission
 * time) and a `REVIEW_DECISION` event (at decision time). Never re-declare
 * parallel string literals at a write site or in the F4 cycle-time
 * calculator (`agresso-contract/utils/review-cycle-time.util.ts`), which
 * imports `REVIEW_FLOW_SUBMISSION_EVENT_TYPE` /
 * `REVIEW_FLOW_APPROVAL_EVENT_TYPE` / `REVIEW_FLOW_APPROVAL_DECISION_VALUE`
 * directly from here.
 */

/** Every `event_type` value known to this vocabulary (live + forward-looking). */
export const REVIEW_EVENT_TYPE = {
  /** Live — `bilateral.service.ts` pool-funding alignment edit. */
  POOL_FUNDING_ALIGNMENT_CHANGED: 'POOL_FUNDING_ALIGNMENT_CHANGED',
  /** Live — `bilateral.service.ts` indicator-mapping upsert/delete. */
  INDICATOR_MAPPING_CHANGED: 'INDICATOR_MAPPING_CHANGED',
  /** Forward-looking — not yet written anywhere; see file doc comment. */
  REVIEW_DECISION: 'REVIEW_DECISION',
  /** Forward-looking (D-F4-8) — cycle-time submission anchor; not yet written anywhere. */
  RESULT_SUBMITTED: 'RESULT_SUBMITTED',
} as const;

export type ReviewEventType =
  (typeof REVIEW_EVENT_TYPE)[keyof typeof REVIEW_EVENT_TYPE];

/** Every `decision` value known to this vocabulary (all forward-looking). */
export const REVIEW_DECISION_VALUE = {
  APPROVE: 'APPROVE',
  REJECT: 'REJECT',
  EDIT: 'EDIT',
} as const;

export type ReviewDecisionValue =
  (typeof REVIEW_DECISION_VALUE)[keyof typeof REVIEW_DECISION_VALUE];

/** Server-side display labels for `event_type` (R-IN-001 C-3: no bare ids). */
export const REVIEW_EVENT_TYPE_LABEL: Record<ReviewEventType, string> = {
  [REVIEW_EVENT_TYPE.POOL_FUNDING_ALIGNMENT_CHANGED]:
    'Pool Funding Alignment Changed',
  [REVIEW_EVENT_TYPE.INDICATOR_MAPPING_CHANGED]: 'Indicator Mapping Changed',
  [REVIEW_EVENT_TYPE.REVIEW_DECISION]: 'Review Decision',
  [REVIEW_EVENT_TYPE.RESULT_SUBMITTED]: 'Result Submitted',
};

/** Server-side display labels for `decision` (R-IN-001 C-3: no bare ids). */
export const REVIEW_DECISION_LABEL: Record<ReviewDecisionValue, string> = {
  [REVIEW_DECISION_VALUE.APPROVE]: 'Approved',
  [REVIEW_DECISION_VALUE.REJECT]: 'Rejected',
  [REVIEW_DECISION_VALUE.EDIT]: 'Sent Back for Edit',
};

/**
 * Resolves a display label for a stored `event_type` code. An unknown or
 * future code (not yet in `REVIEW_EVENT_TYPE_LABEL`) falls back to the raw
 * code itself — never to `undefined`/empty — so a new code never renders
 * blank while this map is being caught up.
 */
export function getReviewEventTypeLabel(code: string): string {
  return REVIEW_EVENT_TYPE_LABEL[code as ReviewEventType] ?? code;
}

/**
 * Resolves a display label for a stored `decision` code. Same raw-code
 * fallback as {@link getReviewEventTypeLabel}.
 */
export function getReviewDecisionLabel(code: string): string {
  return REVIEW_DECISION_LABEL[code as ReviewDecisionValue] ?? code;
}

/**
 * F4 review-flow cycle-time anchors (D-F4-8, owner-approved 2026-08-24,
 * addendum to D-F4-7, resolving Reviewer FAIL issue 1 on T-03 attempt 1):
 * the submission anchor is `RESULT_SUBMITTED` — NOT the audit-edit events
 * (`POOL_FUNDING_ALIGNMENT_CHANGED` / `INDICATOR_MAPPING_CHANGED`); that
 * mapping ("Option B") was proposed and rejected. The approval anchor is
 * `REVIEW_DECISION` carrying `decision === APPROVE` specifically (`REJECT`
 * and `EDIT` are decisions, not approvals). The cycle-time calculator
 * imports these three constants directly — it declares no local literals of
 * its own, so there is nothing left at the calculator site to drift from
 * this source of truth.
 */
export const REVIEW_FLOW_SUBMISSION_EVENT_TYPE: ReviewEventType =
  REVIEW_EVENT_TYPE.RESULT_SUBMITTED;

export const REVIEW_FLOW_APPROVAL_EVENT_TYPE: ReviewEventType =
  REVIEW_EVENT_TYPE.REVIEW_DECISION;

export const REVIEW_FLOW_APPROVAL_DECISION_VALUE: ReviewDecisionValue =
  REVIEW_DECISION_VALUE.APPROVE;
