/**
 * Pure helpers over an entry's version ranges (design.md section 2.1, D-ORG-2).
 * No I/O. T-01 holds only the year-coverage predicate and its SQL twin;
 * the save-engine functions (locate, split, propagate, assertTimeline) arrive
 * with T-02.
 *
 * A version covers the half-open range `[from, to)`; `to === null` is
 * open-ended. A year N is covered when `from <= N AND (to IS NULL OR to > N)`
 * (R-ORG-006 AC.1).
 */
export const isYearCovered = (
  from: number,
  to: number | null,
  year: number,
): boolean => from <= year && (to === null || to > year);

/**
 * The same predicate as SQL, for an alias of `org_unit_versions` and a SQL
 * expression for the year (a column or a literal; the caller binds any
 * parameter inside it). It adds no `?` itself. The pure function above is what
 * unit tests pin; the real database is what pins THIS string (KZ-001: SQL
 * precedence and `IS NULL` cannot be shown by a mocked query).
 */
export const yearCoverageSql = (alias: string, yearExpr: string): string =>
  `(${alias}.valid_from_year <= ${yearExpr} AND (${alias}.valid_to_year IS NULL OR ${alias}.valid_to_year > ${yearExpr}))`;
