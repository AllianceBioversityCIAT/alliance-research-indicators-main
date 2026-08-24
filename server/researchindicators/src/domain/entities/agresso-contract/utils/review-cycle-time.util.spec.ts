import {
  computeReviewCycleTime,
  ReviewFlowEventInput,
} from './review-cycle-time.util';

// day(n) → ISO timestamp n days after 2026-01-01T00:00:00.000Z. Kept as a
// helper so fixture intent (day offsets) stays readable in the events below.
const day = (n: number): string =>
  new Date(Date.UTC(2026, 0, 1) + n * 24 * 60 * 60 * 1000).toISOString();

describe('review-cycle-time.util', () => {
  describe('computeReviewCycleTime', () => {
    it('returns null/0 stats for an empty event list', () => {
      expect(computeReviewCycleTime([])).toEqual({
        median_days: null,
        p90_days: null,
        sample_size: 0,
        excluded_for_incomplete_history: 0,
      });
    });

    it(
      'computes median/p90/sample_size/excluded correctly on a 5-result ' +
        'hand-computed fixture, using TIMESTAMP order even when the input ' +
        'array is given out of chronological order (R-IN-002 messy-history ' +
        'scenario) — the named failing input: an insertion-ordered read of ' +
        'result 102 must produce a DIFFERENT (wrong) median than the ' +
        'timestamp-ordered one asserted here',
      () => {
        const events: ReviewFlowEventInput[] = [
          // Result 101 — clean, contributes a 10-day duration.
          {
            result_id: 101,
            event_type: 'RESULT_SUBMITTED',
            decision: null,
            created_at: day(0),
          },
          {
            result_id: 101,
            event_type: 'REVIEW_DECISION',
            decision: 'APPROVE',
            created_at: day(10),
          },

          // Result 102 — MESSY, and deliberately has TWO RESULT_SUBMITTED
          // events so the discriminating power is real: an implementation
          // that picks "first submission-type event in ARRAY order" (i.e.
          // skips the created_at re-sort) would pick the day(5) event
          // (array position 0) instead of the day(1) event (array position
          // 1, but chronologically first) — giving duration 9-5=4 instead
          // of the correct 9-1=8. Array order here is deliberately NOT
          // chronological order.
          {
            result_id: 102,
            event_type: 'RESULT_SUBMITTED', // array position 0, day(5)
            decision: null,
            created_at: day(5),
          },
          {
            result_id: 102,
            event_type: 'RESULT_SUBMITTED', // array position 1, day(1) — earliest
            decision: null,
            created_at: day(1),
          },
          {
            result_id: 102,
            event_type: 'REVIEW_DECISION',
            decision: 'APPROVE',
            created_at: day(9),
          },

          // Result 103 — anchor-less: submission only, no approval.
          {
            result_id: 103,
            event_type: 'RESULT_SUBMITTED',
            decision: null,
            created_at: day(3),
          },

          // Result 104 — anchor-less: approval only, no submission.
          {
            result_id: 104,
            event_type: 'REVIEW_DECISION',
            decision: 'APPROVE',
            created_at: day(4),
          },

          // Result 105 — clean, contributes a 2-day duration.
          {
            result_id: 105,
            event_type: 'RESULT_SUBMITTED',
            decision: null,
            created_at: day(0),
          },
          {
            result_id: 105,
            event_type: 'REVIEW_DECISION',
            decision: 'APPROVE',
            created_at: day(2),
          },
        ];

        // Hand-computed: contributing durations = [10 (101), 8 (102), 2 (105)]
        // → sorted [2, 8, 10] → median (middle of 3) = 8; p90 (nearest-rank,
        // rank = ceil(0.9*3) = 3) = sorted[2] = 10; sample_size = 3.
        // Excluded: 103 (no approval), 104 (no submission) = 2.
        //
        // K-004 evidence (observed 2026-08-24, reverted after capture):
        // temporarily removing the created_at re-sort in
        // review-cycle-time.util.ts (using `const sorted = [...rawGroup]`
        // instead of the sorted copy) reddened this exact assertion
        // verbatim:
        //   - Expected  - 1
        //   + Received  + 1
        //     Object {
        //       "excluded_for_incomplete_history": 2,
        //   -   "median_days": 8,
        //   +   "median_days": 4,
        //       "p90_days": 10,
        //       "sample_size": 3,
        //     }
        // (result 102's picked submission anchor shifted from day(1), array
        // position 1, to day(5), array position 0, so its duration became
        // 9-5=4 instead of 9-1=8, changing the sorted contributing set from
        // [2, 8, 10] to [2, 4, 10] whose median is 4). Reverted immediately;
        // the created_at re-sort is what ships.
        expect(computeReviewCycleTime(events)).toEqual({
          median_days: 8,
          p90_days: 10,
          sample_size: 3,
          excluded_for_incomplete_history: 2,
        });
      },
    );

    it('excludes and counts a result with a submission but no approval', () => {
      const events: ReviewFlowEventInput[] = [
        {
          result_id: 201,
          event_type: 'RESULT_SUBMITTED',
          decision: null,
          created_at: day(0),
        },
      ];

      expect(computeReviewCycleTime(events)).toEqual({
        median_days: null,
        p90_days: null,
        sample_size: 0,
        excluded_for_incomplete_history: 1,
      });
    });

    it('excludes and counts a result with an approval but no submission event', () => {
      const events: ReviewFlowEventInput[] = [
        {
          result_id: 202,
          event_type: 'REVIEW_DECISION',
          decision: 'APPROVE',
          created_at: day(4),
        },
      ];

      expect(computeReviewCycleTime(events)).toEqual({
        median_days: null,
        p90_days: null,
        sample_size: 0,
        excluded_for_incomplete_history: 1,
      });
    });

    it(
      'never reports a negative duration — a genuinely earlier approval ' +
        'timestamp than the (only) submission anchor is excluded, not ' +
        'reported as a negative number of days',
      () => {
        const events: ReviewFlowEventInput[] = [
          {
            result_id: 203,
            event_type: 'REVIEW_DECISION',
            decision: 'APPROVE',
            created_at: day(3), // approval BEFORE the submission below
          },
          {
            result_id: 203,
            event_type: 'RESULT_SUBMITTED',
            decision: null,
            created_at: day(5),
          },
        ];

        expect(computeReviewCycleTime(events)).toEqual({
          median_days: null,
          p90_days: null,
          sample_size: 0,
          excluded_for_incomplete_history: 1,
        });
      },
    );

    it('never reports a zero-anchored duration — same-instant submission/approval is excluded', () => {
      const events: ReviewFlowEventInput[] = [
        {
          result_id: 204,
          event_type: 'RESULT_SUBMITTED',
          decision: null,
          created_at: day(5),
        },
        {
          result_id: 204,
          event_type: 'REVIEW_DECISION',
          decision: 'APPROVE',
          created_at: day(5),
        },
      ];

      expect(computeReviewCycleTime(events)).toEqual({
        median_days: null,
        p90_days: null,
        sample_size: 0,
        excluded_for_incomplete_history: 1,
      });
    });

    it('does not treat a REJECT or EDIT decision as an approval anchor', () => {
      const events: ReviewFlowEventInput[] = [
        {
          result_id: 205,
          event_type: 'RESULT_SUBMITTED',
          decision: null,
          created_at: day(0),
        },
        {
          result_id: 205,
          event_type: 'REVIEW_DECISION',
          decision: 'REJECT',
          created_at: day(3),
        },
        {
          result_id: 205,
          event_type: 'REVIEW_DECISION',
          decision: 'EDIT',
          created_at: day(4),
        },
      ];

      expect(computeReviewCycleTime(events)).toEqual({
        median_days: null,
        p90_days: null,
        sample_size: 0,
        excluded_for_incomplete_history: 1,
      });
    });

    it('excludes and counts a result whose anchor timestamp is unparsable (reviewer advisory: never lets NaN through)', () => {
      const events: ReviewFlowEventInput[] = [
        {
          result_id: 206,
          event_type: 'RESULT_SUBMITTED',
          decision: null,
          created_at: 'not-a-real-timestamp',
        },
        {
          result_id: 206,
          event_type: 'REVIEW_DECISION',
          decision: 'APPROVE',
          created_at: day(5),
        },
      ];

      expect(computeReviewCycleTime(events)).toEqual({
        median_days: null,
        p90_days: null,
        sample_size: 0,
        excluded_for_incomplete_history: 1,
      });
    });
  });
});
