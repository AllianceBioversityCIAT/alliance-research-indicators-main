import {
  REVIEW_EVENT_TYPE,
  REVIEW_DECISION_VALUE,
  REVIEW_EVENT_TYPE_LABEL,
  REVIEW_DECISION_LABEL,
  getReviewEventTypeLabel,
  getReviewDecisionLabel,
  REVIEW_FLOW_SUBMISSION_EVENT_TYPE,
  REVIEW_FLOW_APPROVAL_EVENT_TYPE,
  REVIEW_FLOW_APPROVAL_DECISION_VALUE,
} from './review-event-vocabulary.constants';

describe('review-event-vocabulary.constants', () => {
  it('exposes the four known event_type values (D-F4-7, D-F4-8)', () => {
    expect(Object.values(REVIEW_EVENT_TYPE)).toEqual([
      'POOL_FUNDING_ALIGNMENT_CHANGED',
      'INDICATOR_MAPPING_CHANGED',
      'REVIEW_DECISION',
      'RESULT_SUBMITTED',
    ]);
  });

  it('exposes the three known decision values (archived bilateral design)', () => {
    expect(Object.values(REVIEW_DECISION_VALUE)).toEqual([
      'APPROVE',
      'REJECT',
      'EDIT',
    ]);
  });

  describe('getReviewEventTypeLabel', () => {
    it('resolves a display label for every known event_type value', () => {
      // Per-value assertions (reviewer advisory) — a missing/typo'd map
      // entry for any single code fails on that code, not on a single
      // opaque boolean.
      for (const code of Object.values(REVIEW_EVENT_TYPE)) {
        expect(getReviewEventTypeLabel(code)).toBe(
          REVIEW_EVENT_TYPE_LABEL[code],
        );
        expect(getReviewEventTypeLabel(code)).not.toBe('');
        expect(getReviewEventTypeLabel(code)).not.toBeUndefined();
      }
    });

    it('falls back to the raw code for an unknown/future event_type (never undefined/empty)', () => {
      expect(getReviewEventTypeLabel('SOME_FUTURE_EVENT_TYPE')).toBe(
        'SOME_FUTURE_EVENT_TYPE',
      );
    });
  });

  describe('getReviewDecisionLabel', () => {
    it('resolves a display label for every known decision value', () => {
      for (const code of Object.values(REVIEW_DECISION_VALUE)) {
        expect(getReviewDecisionLabel(code)).toBe(REVIEW_DECISION_LABEL[code]);
        expect(getReviewDecisionLabel(code)).not.toBe('');
        expect(getReviewDecisionLabel(code)).not.toBeUndefined();
      }
    });

    it('falls back to the raw code for an unknown/future decision (never undefined/empty)', () => {
      expect(getReviewDecisionLabel('SOME_FUTURE_DECISION')).toBe(
        'SOME_FUTURE_DECISION',
      );
    });
  });

  describe('F4 review-flow anchors (D-F4-8)', () => {
    // Amended T-03 attempt-2 acceptance: the designated submission/approval
    // anchors must exist within the enumerated vocabulary they're drawn
    // from — a real, catchable typo site now that the mapping lives here
    // (not as calculator-local literals). Per-value assertions (reviewer
    // advisory), not one collapsed boolean.
    //
    // K-004 evidence (observed 2026-08-24, reverted after capture):
    // temporarily reassigned REVIEW_FLOW_SUBMISSION_EVENT_TYPE to
    // REVIEW_EVENT_TYPE.POOL_FUNDING_ALIGNMENT_CHANGED (reintroducing the
    // rejected "Option B" audit-edit proxy) and reran both this file's
    // suite and review-cycle-time.util.spec.ts.
    //
    // The membership assertion in this describe block ("... is a member of
    // REVIEW_EVENT_TYPE") stayed GREEN — POOL_FUNDING_ALIGNMENT_CHANGED is
    // still a valid member, so membership alone can't catch a wrong-but-
    // valid choice. But the "is specifically RESULT_SUBMITTED" test below
    // went RED verbatim:
    //   expect(received).toBe(expected) // Object.is equality
    //   Expected: "RESULT_SUBMITTED"
    //   Received: "POOL_FUNDING_ALIGNMENT_CHANGED"
    //
    // And in review-cycle-time.util.spec.ts, the 5-result fixture test went
    // RED verbatim (every fixture's submission anchor is the literal
    // 'RESULT_SUBMITTED' string, which no longer matched the reassigned
    // canonical anchor, so all 5 results lost their submission match):
    //   expect(received).toEqual(expected) // deep equality
    //   - Expected  - 4
    //   + Received  + 4
    //     Object {
    //   -   "excluded_for_incomplete_history": 2,
    //   -   "median_days": 8,
    //   -   "p90_days": 10,
    //   -   "sample_size": 3,
    //   +   "excluded_for_incomplete_history": 5,
    //   +   "median_days": null,
    //   +   "p90_days": null,
    //   +   "sample_size": 0,
    //     }
    //
    // Reverted immediately; RESULT_SUBMITTED is what ships. This is the
    // intended cross-file regression coverage now that the mapping is
    // canonical: a wrong-but-plausible reassignment here is caught by the
    // specific-value test here AND by the calculator's fixtures, not by
    // this file's membership check alone.
    it('REVIEW_FLOW_SUBMISSION_EVENT_TYPE is a member of REVIEW_EVENT_TYPE', () => {
      expect(Object.values(REVIEW_EVENT_TYPE)).toContain(
        REVIEW_FLOW_SUBMISSION_EVENT_TYPE,
      );
    });

    it('REVIEW_FLOW_SUBMISSION_EVENT_TYPE is specifically RESULT_SUBMITTED (D-F4-8 — not an audit-edit proxy)', () => {
      expect(REVIEW_FLOW_SUBMISSION_EVENT_TYPE).toBe('RESULT_SUBMITTED');
    });

    it('REVIEW_FLOW_APPROVAL_EVENT_TYPE is a member of REVIEW_EVENT_TYPE', () => {
      expect(Object.values(REVIEW_EVENT_TYPE)).toContain(
        REVIEW_FLOW_APPROVAL_EVENT_TYPE,
      );
    });

    it('REVIEW_FLOW_APPROVAL_DECISION_VALUE is a member of REVIEW_DECISION_VALUE', () => {
      expect(Object.values(REVIEW_DECISION_VALUE)).toContain(
        REVIEW_FLOW_APPROVAL_DECISION_VALUE,
      );
    });
  });
});
