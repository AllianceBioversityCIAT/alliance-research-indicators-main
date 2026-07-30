// @akili-spec project-dashboard/indicator-metadata-charts
/**
 * The single source of truth for the **primary-contract results scoping rule**
 * (`requirements.md` §4.2 of `docs/specs/project-dashboard/indicator-metadata-charts/`).
 *
 * Every report aggregation on `reports/full` — the six sections that predate this
 * spec and the ten it adds — must select over the **same** population: results
 * linked to the contract as primary, active on both sides, and not snapshots.
 * §4.2 states it as a MUST and forbids any aggregation inventing its own scoping
 * join, because the failure mode is silent: if one copy of this predicate drifts,
 * a subset of the sections starts counting a different population and **nothing
 * fails** — no test, no build, no runtime error. The sections simply disagree.
 *
 * This lived as a `private` method on `AgressoContractRepository`, which made it
 * unreachable from `IndicatorMetadataReportsRepository` (a separate class, not a
 * subclass). T-03 therefore duplicated it byte-identically with a sync warning
 * and escalated rather than hiding it; the owner authorised this extraction so
 * §4.2 is satisfied literally rather than by convention. Both repositories now
 * call this function, and `AgressoContractRepository` keeps its private method as
 * a one-line delegate so its eight existing call sites stay untouched.
 *
 * **Contains one positional parameter (`?`) for the contract id.** Callers bind
 * exactly one value per query — wrapping this in a CTE is what keeps that true
 * across a multi-branch UNION instead of once per branch (design §6.1, DD-1),
 * which is the structural fix for DC-12's silent zero-rows hazard.
 *
 * @param options.includeGeoScope also select `r.geo_scope_id`, required by the
 *   geographic report's own subquery (`buildContractResultsSubquery`).
 * @returns the scoping SQL, without the enclosing parentheses or CTE keyword.
 */
export function buildPrimaryContractResultsScopeSql(options?: {
  includeGeoScope?: boolean;
}): string {
  const selectColumns = options?.includeGeoScope
    ? 'r.result_id, r.geo_scope_id'
    : 'r.result_id';

  return `
      SELECT DISTINCT ${selectColumns}
      FROM results r
      INNER JOIN result_contracts rc ON rc.result_id = r.result_id
      WHERE rc.contract_id = ?
        AND rc.is_primary = TRUE
        AND rc.is_active = TRUE
        AND r.is_active = TRUE
        AND r.is_snapshot = FALSE
    `;
}
