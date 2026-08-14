import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * [SPEC:bilateral/primary-contributing-sp] cross-tier follow-up — closes the
 * D-6 gap that `requirements.md` declared "uncovered by construction".
 *
 * THE DEFECT
 * ----------
 * R-BIL-128 AC.1 narrowed the client to render exactly ONE ToC block, for the
 * Primary SP; Contributing SPs deliberately get none. But
 * `pool_funding_alignment_validation` (1782950000000, comment-corrected in
 * 1784500000000) still loops over EVERY active SP and demands a ToC row for
 * each. The function is named in none of that spec's seven documents.
 *
 * Consequence: with 2+ SPs selected the green check can never go green,
 * because the UI no longer offers any way to answer ToC for a Contributing SP.
 * Reproduced on Dev with result 33539 (STAR-19906): SP03 Primary with a ToC
 * row, SP06 Contributing without one → count_sps = 2, count_incomplete_sps = 1
 * → the function returns 0. `green-checks.repository.ts:67` feeds that 0
 * straight into the `pool_funding_alignment` key, so the section circle stays
 * grey; and because the client does not filter VISUAL_ONLY_GREEN_CHECKS out of
 * the raw payload, Submit stays disabled too.
 *
 * THE FIX, AND WHY IT IS NOT A ONE-LINE PREDICATE
 * -----------------------------------------------
 * Scoping the loop with a bare `and sp.sp_role = 'PRIMARY'` would break every
 * pre-existing row. T-02 added `sp_role` with NO backfill (R-BIL-126 AC.1 —
 * the checksum argument depends on legacy rows staying untouched), so legacy
 * alignments carry NULL on every row. Under a bare predicate they yield
 * count_sps = 0, and `return count_sps > 0 and ...` turns them false: measured
 * on Dev, 22 of the 23 alignments answered "Yes" would have flipped from green
 * to red.
 *
 * So the scope is conditional on the alignment actually HAVING a Primary:
 *   - a Primary exists  → completeness is the Primary's ToC row alone (R-BIL-128)
 *   - no Primary exists → the original all-SPs rule stands, unchanged
 * Nothing already green can turn red, which is the property that matters for a
 * check the client gates Submit on.
 *
 * The "no Primary" branch is reachable only for legacy data: post-spec the
 * client refuses to save without a Primary (R-BIL-127 AC.3, `canSave`), so a
 * freshly written alignment always takes the first branch.
 *
 * Collation caveat, inherited verbatim from T-02: this table is
 * utf8mb4_unicode_520_ci, so `sp_role = 'PRIMARY'` is case-insensitive and
 * `'primary'` satisfies it too. Benign while `resolvePrimarySpCode` (T-06) is
 * the only writer and always emits the fixed literal — but the same caution
 * applies here as it does to the generated column's IF condition.
 *
 * Append-only: the function is recreated whole (MySQL has no ALTER FUNCTION
 * for a body), and `down()` restores 1784500000000's logic — its SQL comments
 * are trimmed, which is immaterial to behavior.
 *
 * ⚠ NEVER write `:word` inside a SQL COMMENT below. `orm.config.ts:59` sets
 * `extra.namedPlaceholders: true`, so mysql2 rewrites the query through
 * `named-placeholders` first. That tokenizer skips quoted string literals but
 * NOT `--` or block comments, so a colon there is consumed as a bind parameter
 * and the query dies with "Named query contains placeholders, but parameters
 * object is undefined" before MySQL parses it. That is exactly how
 * 1784500000000 shipped unrunnable. Hence `[SPEC bilateral/...]` inside the
 * bodies; this TSDoc is TypeScript and keeps the normal `[SPEC:...]` form.
 * `npm run migration:scan` is the guard.
 */
export class ScopePoolFundingValidationToPrimarySp1786679227000
  implements MigrationInterface
{
  name = 'ScopePoolFundingValidationToPrimarySp1786679227000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS \`pool_funding_alignment_validation\``,
    );
    await queryRunner.query(`CREATE FUNCTION \`pool_funding_alignment_validation\`(result_code BIGINT) RETURNS tinyint(1)
    READS SQL DATA
begin
            declare temp_eligible boolean default false;
            declare temp_has_contribution boolean default null;
            declare temp_has_primary boolean default false;
            declare count_sps int default 0;
            declare count_incomplete_sps int default 0;

            -- Eligibility: the result's primary contract is an EFFECTIVE
            -- pool-funding contributor (manual tag OR active bilateral
            -- mapping — same predicate as effectivePoolFundingContributorSql
            -- in shared/utils/pool-funding.util.ts).
            select
                if(count(ac.agreement_id) > 0, true, false)
                into temp_eligible
            from result_contracts rc
                inner join agresso_contracts ac on ac.agreement_id = rc.contract_id
                    and ac.is_active = true
            where rc.result_id = result_code
                and rc.is_active = true
                and rc.is_primary = true
                and (
                    coalesce(ac.is_pool_funding_contributor, 0) = 1
                    or exists (
                        select 1 from bilateral_project_mapping bpm
                        where bpm.agresso_agreement_id = ac.agreement_id
                            and bpm.is_active = 1
                    )
                );

            -- Optional section: not eligible means nothing to fill in.
            if temp_eligible = false then
                return true;
            end if;

            select pfa.has_contribution
                into temp_has_contribution
            from result_pool_funding_alignment pfa
            where pfa.result_id = result_code
                and pfa.is_active = true
            limit 1;

            -- Top-level question unanswered.
            if temp_has_contribution is null then
                return false;
            end if;

            -- Answered "No": nothing else applies.
            if temp_has_contribution = false then
                return true;
            end if;

            -- [SPEC bilateral/primary-contributing-sp] R-BIL-128 AC.1.
            -- Does this alignment designate a Primary SP at all? Legacy rows
            -- predate sp_role and carry NULL on every row (T-02 does no
            -- backfill, R-BIL-126 AC.1), so this is false for them and the
            -- scope below falls back to the original all-SPs rule. Without
            -- that fallback every legacy alignment would score count_sps = 0
            -- and flip from green to red.
            select exists (
                select 1
                from result_pool_funding_alignment_sp sp
                    inner join result_pool_funding_alignment pfa on pfa.id = sp.alignment_id
                        and pfa.is_active = true
                where pfa.result_id = result_code
                    and sp.is_active = true
                    and sp.sp_role = 'PRIMARY'
            ) into temp_has_primary;

            -- Answered "Yes": ToC completeness is scoped to the SP the client
            -- actually renders a block for. Post-R-BIL-128 that is the Primary
            -- alone — a Contributing SP has no way to answer, so requiring one
            -- makes the check unreachable. This checks only that an ACTIVE ROW
            -- EXISTS (aligns_with_toc is not null) — it does NOT require
            -- level/toc_result_id/indicator_id to be populated, so a partial
            -- row (e.g. Level + High-Level Output only, no indicator) still
            -- satisfies it (unchanged from 1784500000000).
            --
            -- [SPEC bilateral/toc-optional-mapping] R-BIL-119 --
            -- pool_funding_alignment is a VISUAL_ONLY_GREEN_CHECKS entry
            -- (green-checks/dto/find-green-checks.dto.ts) and is excluded
            -- from the server-side completeness computations in
            -- green-checks.service.ts and
            -- result-status-workflow/function-handler.service.ts, so this
            -- function's return value does not gate the server's submit
            -- path. CAUTION: the value is still returned on the
            -- green-checks payload, and the STAR client currently gates
            -- its Submit control on that raw payload without filtering
            -- visual-only keys (client cache.service.ts,
            -- submission.service.ts), so a false here does surface as a
            -- disabled Submit button in the UI today.
            select
                count(sp.id),
                coalesce(sum(if(exists (
                    select 1 from result_pool_funding_toc_alignment toc
                    where toc.result_id = result_code
                        and toc.sp_code = sp.sp_code
                        and toc.is_active = true
                        and toc.aligns_with_toc is not null
                ), 0, 1)), 0)
                into count_sps, count_incomplete_sps
            from result_pool_funding_alignment_sp sp
                inner join result_pool_funding_alignment pfa on pfa.id = sp.alignment_id
                    and pfa.is_active = true
            where pfa.result_id = result_code
                and sp.is_active = true
                and (temp_has_primary = false or sp.sp_role = 'PRIMARY');

            return count_sps > 0 and count_incomplete_sps = 0;

        end`);
  }

  // Restores 1784500000000's definition verbatim — the all-SPs loop, with the
  // corrected comment. Reverting this migration re-opens the D-6 defect above.
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS \`pool_funding_alignment_validation\``,
    );
    await queryRunner.query(`CREATE FUNCTION \`pool_funding_alignment_validation\`(result_code BIGINT) RETURNS tinyint(1)
    READS SQL DATA
begin
            declare temp_eligible boolean default false;
            declare temp_has_contribution boolean default null;
            declare count_sps int default 0;
            declare count_incomplete_sps int default 0;

            -- Eligibility: the result's primary contract is an EFFECTIVE
            -- pool-funding contributor (manual tag OR active bilateral
            -- mapping — same predicate as effectivePoolFundingContributorSql
            -- in shared/utils/pool-funding.util.ts).
            select
                if(count(ac.agreement_id) > 0, true, false)
                into temp_eligible
            from result_contracts rc
                inner join agresso_contracts ac on ac.agreement_id = rc.contract_id
                    and ac.is_active = true
            where rc.result_id = result_code
                and rc.is_active = true
                and rc.is_primary = true
                and (
                    coalesce(ac.is_pool_funding_contributor, 0) = 1
                    or exists (
                        select 1 from bilateral_project_mapping bpm
                        where bpm.agresso_agreement_id = ac.agreement_id
                            and bpm.is_active = 1
                    )
                );

            -- Optional section: not eligible means nothing to fill in.
            if temp_eligible = false then
                return true;
            end if;

            select pfa.has_contribution
                into temp_has_contribution
            from result_pool_funding_alignment pfa
            where pfa.result_id = result_code
                and pfa.is_active = true
            limit 1;

            -- Top-level question unanswered.
            if temp_has_contribution is null then
                return false;
            end if;

            -- Answered "No": nothing else applies.
            if temp_has_contribution = false then
                return true;
            end if;

            -- Answered "Yes": every selected SP needs its ToC alignment
            -- answered. This checks only that an ACTIVE ROW EXISTS per
            -- selected SP (aligns_with_toc is not null) — it does NOT
            -- require level/toc_result_id/indicator_id to be populated, so
            -- a partial row (e.g. Level + High-Level Output only, no
            -- indicator) satisfies this check.
            select
                count(sp.id),
                coalesce(sum(if(exists (
                    select 1 from result_pool_funding_toc_alignment toc
                    where toc.result_id = result_code
                        and toc.sp_code = sp.sp_code
                        and toc.is_active = true
                        and toc.aligns_with_toc is not null
                ), 0, 1)), 0)
                into count_sps, count_incomplete_sps
            from result_pool_funding_alignment_sp sp
                inner join result_pool_funding_alignment pfa on pfa.id = sp.alignment_id
                    and pfa.is_active = true
            where pfa.result_id = result_code
                and sp.is_active = true;

            return count_sps > 0 and count_incomplete_sps = 0;

        end`);
  }
}
