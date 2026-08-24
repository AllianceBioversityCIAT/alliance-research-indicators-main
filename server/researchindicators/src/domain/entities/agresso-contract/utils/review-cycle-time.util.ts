/**
 * Pure TS review-flow cycle-time calculator.
 *
 * @sdd-spec docs/specs/changes/project-dashboard-v3/f4-advanced-insights — T-03
 * / R-IN-002 (review_flow cycle time), design D-F4-2 (computed in TS over
 * timestamp-ordered events; SQL only fetches the events), D-F4-7 + D-F4-8
 * (vocabulary AND submission/approval anchors canonicalized in
 * `result-review-history/constants`).
 *
 * No I/O. The repository fetches every `result_review_history` row for the
 * contract's contributing results (ordered by `created_at`, never `id`; NEVER
 * selecting `payload_before`/`payload_after` — proposal.md OQ-1) and hands
 * the flat list here. This module re-sorts by `created_at` per result BEFORE
 * picking anchors — it does NOT trust the order it receives events in. That
 * is the whole point: a messy history (rows inserted out of chronological
 * order) must still yield the timestamp-correct duration (R-IN-002 scenario).
 *
 * Submission/approval semantics come entirely from the canonical constants
 * imported below (D-F4-8, resolving Reviewer FAIL issue 1 on attempt 1,
 * which had shipped the two audit-edit events —
 * `POOL_FUNDING_ALIGNMENT_CHANGED` / `INDICATOR_MAPPING_CHANGED` — as the
 * submission anchor: the rejected Pivot "Option B", applied without owner
 * ratification). This file declares NO local literal mapping of its own —
 * there is nothing left here to drift from `result-review-history`'s source
 * of truth. Because `RESULT_SUBMITTED`/`REVIEW_DECISION` are never written
 * today (`BilateralService.reviewDecision` is a stub), every result is
 * excluded from cycle time on current data and `sample_size = 0` — that is
 * the correct, honest output (A-1, D-F4-7/D-F4-8), not a defect.
 *
 * A result contributes to `excluded_for_incomplete_history` only if it has
 * at least one `result_review_history` row at all — a result with ZERO rows
 * never enters the per-result grouping below and is not counted anywhere in
 * this calculator's output (it simply isn't part of the `review_flow`
 * event/decision universe; the section's own `meta.n` already reports how
 * many of the contract's results have any review-history row).
 */

import {
  REVIEW_FLOW_SUBMISSION_EVENT_TYPE,
  REVIEW_FLOW_APPROVAL_EVENT_TYPE,
  REVIEW_FLOW_APPROVAL_DECISION_VALUE,
} from '../../result-review-history/constants/review-event-vocabulary.constants';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface ReviewFlowEventInput {
  result_id: number;
  event_type: string;
  decision: string | null;
  created_at: Date | string;
}

export interface ReviewCycleTimeResult {
  median_days: number | null;
  p90_days: number | null;
  sample_size: number;
  excluded_for_incomplete_history: number;
}

/** Returns NaN for an unparsable timestamp — callers must guard with Number.isFinite. */
function toEpochMs(value: Date | string): number {
  return value instanceof Date ? value.getTime() : new Date(value).getTime();
}

function median(sortedAscending: number[]): number | null {
  const n = sortedAscending.length;
  if (n === 0) return null;
  const mid = Math.floor(n / 2);
  return n % 2 === 0
    ? (sortedAscending[mid - 1] + sortedAscending[mid]) / 2
    : sortedAscending[mid];
}

/** Nearest-rank percentile (no interpolation): rank = ceil(p * n), 1-indexed. */
function percentile(sortedAscending: number[], p: number): number | null {
  const n = sortedAscending.length;
  if (n === 0) return null;
  const rank = Math.min(n, Math.max(1, Math.ceil(p * n)));
  return sortedAscending[rank - 1];
}

/**
 * Computes review-flow cycle-time stats over the flat per-contract event
 * list. Groups by `result_id`, re-sorts each group by `created_at`
 * ascending, then for each result:
 *   - first submission-type event (`event_type === RESULT_SUBMITTED`, by
 *     timestamp) is the start anchor;
 *   - first approval-type event (`event_type === REVIEW_DECISION` AND
 *     `decision === 'APPROVE'`, by timestamp) is the end anchor;
 *   - missing either anchor → excluded, counted in
 *     `excluded_for_incomplete_history` (R-IN-002 messy-history scenario);
 *   - an unparsable `created_at` on either anchor → excluded, counted (never
 *     lets a NaN duration slip through as a non-positive-duration false pass);
 *   - a non-positive duration (approval at or before the submission anchor)
 *     is never reported — excluded and counted instead (R-IN-002 BUT-clause).
 */
export function computeReviewCycleTime(
  events: ReviewFlowEventInput[],
): ReviewCycleTimeResult {
  const byResult = new Map<number, ReviewFlowEventInput[]>();
  for (const event of events) {
    const group = byResult.get(event.result_id);
    if (group) {
      group.push(event);
    } else {
      byResult.set(event.result_id, [event]);
    }
  }

  const durationsDays: number[] = [];
  let excluded = 0;

  for (const rawGroup of byResult.values()) {
    // Defensive re-sort by created_at — never trust the array's given order
    // (the messy-history requirement: insertion order != timestamp order).
    const sorted = [...rawGroup].sort(
      (a, b) => toEpochMs(a.created_at) - toEpochMs(b.created_at),
    );

    const submission = sorted.find(
      (event) => event.event_type === REVIEW_FLOW_SUBMISSION_EVENT_TYPE,
    );
    const approval = sorted.find(
      (event) =>
        event.event_type === REVIEW_FLOW_APPROVAL_EVENT_TYPE &&
        event.decision === REVIEW_FLOW_APPROVAL_DECISION_VALUE,
    );

    if (!submission || !approval) {
      excluded += 1;
      continue;
    }

    const submissionMs = toEpochMs(submission.created_at);
    const approvalMs = toEpochMs(approval.created_at);
    if (!Number.isFinite(submissionMs) || !Number.isFinite(approvalMs)) {
      excluded += 1;
      continue;
    }

    const durationMs = approvalMs - submissionMs;
    if (durationMs <= 0) {
      excluded += 1;
      continue;
    }

    durationsDays.push(durationMs / MS_PER_DAY);
  }

  const sortedDurations = [...durationsDays].sort((a, b) => a - b);

  return {
    median_days: median(sortedDurations),
    p90_days: percentile(sortedDurations, 0.9),
    sample_size: durationsDays.length,
    excluded_for_incomplete_history: excluded,
  };
}
