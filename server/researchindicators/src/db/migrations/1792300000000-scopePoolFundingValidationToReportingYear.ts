import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * [SPEC bilateral/annualized-project-mapping] R-APM-004.
 *
 * Recreates pool_funding_alignment_validation from the body of
 * 1786679227000 and restricts the bilateral mapping match to the current
 * reporting year. down restores that body.
 *
 * The year expression is a string literal in this file. It is not an
 * import. These queries pass no parameters, so nothing in the SQL may
 * look like a placeholder, comments included. TSDoc is not sent to the
 * driver.
 */
export class ScopePoolFundingValidationToReportingYear1792300000000
  implements MigrationInterface
{
  name = 'ScopePoolFundingValidationToReportingYear1792300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS \`pool_funding_alignment_validation\``,
    );
    await queryRunner.query(
      `CREATE FUNCTION \`pool_funding_alignment_validation\`(result_code BIGINT) RETURNS tinyint(1)
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
                            and bpm.reporting_year = ` +
        "IFNULL((SELECT CASE WHEN CHAR_LENGTH(norm) = 4 AND norm REGEXP '^[0-9]{4}$' THEN CAST(norm AS UNSIGNED) ELSE 2026 END FROM (SELECT TRIM(REPLACE(REPLACE(REPLACE(simple_value, CHAR(9), ' '), CHAR(10), ' '), CHAR(13), ' ')) AS norm FROM app_config WHERE `key` = 'ARI_PRMS_SYNC' AND is_active = 1) AS normalized_year), 2026)" +
        `
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
            -- Whether this alignment designates a Primary SP at all. Legacy rows
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

        end`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
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
            -- Whether this alignment designates a Primary SP at all. Legacy rows
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
}
