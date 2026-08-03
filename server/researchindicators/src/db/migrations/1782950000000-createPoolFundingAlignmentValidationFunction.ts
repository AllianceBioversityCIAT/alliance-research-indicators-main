import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePoolFundingAlignmentValidationFunction1782950000000
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

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS \`pool_funding_alignment_validation\``,
    );
  }
}
