// @akili-spec changes/agresso-staff-deactivation (T-02 — what the fetch actually delivered)

/**
 * What one `cloneAllAgressoStaff` fetch delivered, measured rather than assumed.
 *
 * `base()` catches a fetch error, logs it and returns `[]`, so a page that FAILED is
 * indistinguishable from a page that was SMALL at the call site. Deactivation decides whom to
 * retire by absence from the payload, so that ambiguity is the difference between "nobody left" and
 * "we lost a thousand people". These three numbers are what precondition C-2 evaluates.
 */
export interface FetchReport {
  /** `totalElements` as Agresso reported it, read BEFORE the page loop. */
  totalElements: number;
  /** Rows contributed by each page, in page order. Index 0 is page 1. */
  pageRowCounts: number[];
  /**
   * Distinct non-empty `resourceId` values across the whole accumulated payload.
   *
   * This is the measure C-2 compares against `totalElements`, and it is NOT the row count.
   * Judgment Day JD-1 (both judges): under unstable offset pagination a repeated record inflates
   * the row count by exactly what an omitted record deflates it, so the two cancel and a run that
   * silently lost people reports as complete. Distinctness is the property; volume never was a
   * proxy for it.
   */
  distinctCarnets: number;
  /**
   * Carnets that arrived more than once, in first-seen order.
   *
   * C-2 aborts whenever `distinctCarnets < totalElements`, and that abort is permanent for as long
   * as the condition holds. The trade was accepted on the explicit ground that the abort is
   * DIAGNOSABLE rather than silent — this list is what makes it so. Without it the operator sees a
   * run that refuses to proceed and no way to find out why.
   */
  duplicatedCarnets: string[];
}
