import { MigrationInterface, QueryRunner } from 'typeorm';

// @sdd-spec docs/specs/bilateral-module/pending-items — T-15.3 / R-BIL-073
//
// Pure rename of the misleading `lever_code` column on
// `result_pool_funding_alignment_sp` (it never held a CGIAR Lever — it always
// held a Science Program code). Data is preserved bit-for-bit. The public API
// contract is unchanged: `selected_levers[].lever_code` in responses is now
// populated from `sp_code` via an SQL alias in the alignment repository.
//
// Indicator-mapping table (`result_pool_funding_indicator_mapping.lever_code`)
// is intentionally NOT touched here — it's a separate join-by-value column
// with its own consumers and its own follow-up rename, out of T-15.3 scope.
export class RenameLeverCodeToSpCodeOnAlignmentSp1779190000013
  implements MigrationInterface
{
  name = 'RenameLeverCodeToSpCodeOnAlignmentSp1779190000013';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_pool_funding_alignment_sp\`
         DROP INDEX \`idx_result_pool_funding_alignment_sp_lever\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_pool_funding_alignment_sp\`
         CHANGE COLUMN \`lever_code\` \`sp_code\` varchar(50) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_pool_funding_alignment_sp\`
         ADD INDEX \`idx_result_pool_funding_alignment_sp_sp\` (\`sp_code\`)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_pool_funding_alignment_sp\`
         DROP INDEX \`idx_result_pool_funding_alignment_sp_sp\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_pool_funding_alignment_sp\`
         CHANGE COLUMN \`sp_code\` \`lever_code\` varchar(50) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_pool_funding_alignment_sp\`
         ADD INDEX \`idx_result_pool_funding_alignment_sp_lever\` (\`lever_code\`)`,
    );
  }
}
