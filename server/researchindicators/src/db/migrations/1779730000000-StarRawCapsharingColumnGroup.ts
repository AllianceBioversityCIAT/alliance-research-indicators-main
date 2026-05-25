import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds CAPSHARING DETAILS (cols 34–54) to raw_data without replacing existing groups.
 */
export class StarRawCapsharingColumnGroup1779730000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
      INSERT INTO \`report_workbook_column_group\`
        (\`workbook_key\`, \`sheet_key\`, \`sort_order\`, \`from_col\`, \`to_col\`, \`label\`, \`fill_argb\`, \`is_active\`)
      VALUES
        ('star_results_metadata', 'raw_data', 7, 34, 54, 'CAPSHARING DETAILS', 'FF4D7C31', 1)
    `,
    );

    await queryRunner.query(
      `
      UPDATE \`report_data_dictionary\`
      SET \`section_fill_argb\` = 'FF4D7C31'
      WHERE \`workbook_key\` = 'star_results_metadata'
        AND \`section\` = 'CapSharing details'
    `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
      DELETE FROM \`report_workbook_column_group\`
      WHERE \`workbook_key\` = 'star_results_metadata'
        AND \`sheet_key\` = 'raw_data'
        AND \`label\` = 'CAPSHARING DETAILS'
        AND \`from_col\` = 34
        AND \`to_col\` = 54
    `,
    );

    await queryRunner.query(
      `
      UPDATE \`report_data_dictionary\`
      SET \`section_fill_argb\` = 'FF00838F'
      WHERE \`workbook_key\` = 'star_results_metadata'
        AND \`section\` = 'CapSharing details'
    `,
    );
  }
}
