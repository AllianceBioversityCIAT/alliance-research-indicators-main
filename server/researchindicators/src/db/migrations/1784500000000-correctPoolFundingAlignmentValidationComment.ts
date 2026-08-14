import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * [SPEC:bilateral/toc-optional-mapping] R-BIL-119 AC.4 / D-C1-11
 *
 * `pool_funding_alignment_validation` (introduced in migration
 * 1782950000000) is append-only, so its now-false inline comment cannot be
 * edited in place. This migration recreates the function with the exact
 * same logic — only the comment above the SP-loop is corrected.
 *
 * ⚠ NEVER write `:word` inside a SQL COMMENT in a migration.
 * `orm.config.ts:59` sets `extra.namedPlaceholders: true`, so mysql2 rewrites
 * the query through `named-placeholders` before sending it. That tokenizer
 * DOES skip quoted string literals — which is why the 2024 indicator
 * migrations survive `text-align:justify` inside their HTML — but it does NOT
 * skip `--` or block comments. A colon there is consumed as a bind parameter
 * and the query dies with "Named query contains placeholders, but parameters
 * object is undefined" before MySQL ever parses it. (`: ` with a space is
 * safe; only `:` immediately followed by identifier characters binds.)
 *
 * This migration carried `[SPEC:bilateral/...]` in the comment below and was
 * therefore UNRUNNABLE from the day it was written. It had never executed in
 * any environment — that, and nothing else, is why editing it here is safe.
 * Spec tags inside SQL bodies drop the colon: `[SPEC bilateral/...]`. The
 * TSDoc above is TypeScript, never sent to the driver, so it keeps the normal
 * form. `npm run migration:scan` is the guard.
 *
 * The function has always tested row *presence*
 * (`toc.aligns_with_toc is not null`) rather than field completeness. Its
 * original comment incorrectly asserted that a persisted "Yes" row already
 * carries `level`/`toc_result_id`/`indicator_id` "enforced at save by
 * `validateTocAlignments`" — a guarantee the toc-optional-mapping spec
 * removes (partial "Yes" rows are now valid). This migration does not
 * change behavior, only documentation.
 */
export class CorrectPoolFundingAlignmentValidationComment1784500000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
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
            -- disabled Submit button in the UI today. See
            -- docs/specs/bilateral/toc-optional-mapping/requirements.md.
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
            -- answered. Persisted ToC rows with aligns_with_toc = 1 already
            -- carry level/toc_result_id/indicator_id (enforced at save by
            -- validateTocAlignments), so row presence == block complete.
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
