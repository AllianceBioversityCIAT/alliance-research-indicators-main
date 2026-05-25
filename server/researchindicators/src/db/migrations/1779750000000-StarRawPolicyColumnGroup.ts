import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds POLICY DETAILS (cols 55–58) to raw_data without replacing existing groups.
 */
export class StarRawPolicyColumnGroup1779750000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
      INSERT INTO \`report_workbook_column_group\`
        (\`workbook_key\`, \`sheet_key\`, \`sort_order\`, \`from_col\`, \`to_col\`, \`label\`, \`fill_argb\`, \`is_active\`)
      VALUES
        ('star_results_metadata', 'raw_data', 8, 55, 58, 'POLICY DETAILS', 'FFDA7842', 1)
    `,
    );

    await queryRunner.query(
      `
      UPDATE \`report_data_dictionary\`
      SET \`section_fill_argb\` = 'FFDA7842'
      WHERE \`workbook_key\` = 'star_results_metadata'
        AND \`section\` = 'Policy Change'
    `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
      DELETE FROM \`report_workbook_column_group\`
      WHERE \`workbook_key\` = 'star_results_metadata'
        AND \`sheet_key\` = 'raw_data'
        AND \`label\` = 'POLICY DETAILS'
        AND \`from_col\` = 55
        AND \`to_col\` = 58
    `,
    );

    await queryRunner.query(
      `
      UPDATE \`report_data_dictionary\`
      SET \`section_fill_argb\` = 'FF3949AB'
      WHERE \`workbook_key\` = 'star_results_metadata'
        AND \`section\` = 'Policy Change'
    `,
    );
  }
}
