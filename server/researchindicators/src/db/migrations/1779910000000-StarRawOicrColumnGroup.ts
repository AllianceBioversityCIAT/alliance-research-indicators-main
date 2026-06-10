import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds OICR DETAILS (cols 59–71) to raw_data without replacing existing groups.
 */
export class StarRawOicrColumnGroup1779910000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
      INSERT INTO \`report_workbook_column_group\`
        (\`workbook_key\`, \`sheet_key\`, \`sort_order\`, \`from_col\`, \`to_col\`, \`label\`, \`fill_argb\`, \`is_active\`)
      VALUES
        ('star_results_metadata', 'raw_data', 9, 59, 71, 'OICR DETAILS', 'FFD9A041', 1)
    `,
    );

    await queryRunner.query(
      `
      UPDATE \`report_data_dictionary\`
      SET \`section_fill_argb\` = 'FFD9A041'
      WHERE \`workbook_key\` = 'star_results_metadata'
        AND \`section\` = 'OICRS'
    `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
      DELETE FROM \`report_workbook_column_group\`
      WHERE \`workbook_key\` = 'star_results_metadata'
        AND \`sheet_key\` = 'raw_data'
        AND \`label\` = 'OICR DETAILS'
        AND \`from_col\` = 59
        AND \`to_col\` = 71
    `,
    );

    await queryRunner.query(
      `
      UPDATE \`report_data_dictionary\`
      SET \`section_fill_argb\` = 'FF3949AB'
      WHERE \`workbook_key\` = 'star_results_metadata'
        AND \`section\` = 'OICRS'
    `,
    );
  }
}
