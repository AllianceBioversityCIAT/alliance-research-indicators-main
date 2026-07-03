// @sdd-spec bilateral-module/mapping-drives-pool-funding-tag

/**
 * Single source of truth for the effective pool-funding-contributor predicate.
 *
 * A contract counts as a pool-funding contributor when EITHER its own
 * `is_pool_funding_contributor` flag is set, OR it has an active bilateral
 * project mapping. Both the agresso-contract and results repositories reuse
 * this fragment so the OR/EXISTS logic never drifts between them.
 *
 * @param ac SQL alias of the `agresso_contracts` table (e.g. `'ac'`). This MUST
 *           be a trusted literal supplied by the caller — never request input —
 *           because it is interpolated directly into the SQL string.
 * @returns The parenthesized boolean predicate as a raw SQL string.
 */
export const effectivePoolFundingContributorSql = (ac: string): string => `(
  COALESCE(${ac}.is_pool_funding_contributor, 0) = 1
  OR EXISTS (
    SELECT 1 FROM bilateral_project_mapping bpm
    WHERE bpm.agresso_agreement_id = ${ac}.agreement_id
      AND bpm.is_active = 1
  )
)`;
