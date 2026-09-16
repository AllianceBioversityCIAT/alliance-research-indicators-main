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
}
