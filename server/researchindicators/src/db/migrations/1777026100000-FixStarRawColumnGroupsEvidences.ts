import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Splits GEOGRAPHIC SCOPE (24–27) from EVIDENCES (28) and IP RIGHTS (29–33).
 * Safe if 177702600 already inserted the older 5-group layout.
 */
export class FixStarRawColumnGroupsEvidences1777026100000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM \`report_workbook_column_group\`
      WHERE \`workbook_key\` = 'star_results_metadata' AND \`sheet_key\` = 'raw_data'
    `);
    await queryRunner.query(
      `
      INSERT INTO \`report_workbook_column_group\`
        (\`workbook_key\`, \`sheet_key\`, \`sort_order\`, \`from_col\`, \`to_col\`, \`label\`, \`fill_argb\`, \`is_active\`)
      VALUES
        ('star_results_metadata', 'raw_data', 1, 1, 14, 'GENERAL INFORMATION', 'FF203C61', 1),
        ('star_results_metadata', 'raw_data', 2, 15, 22, 'ALLIANCE ALIGNMENT', 'FF2A4783', 1),
        ('star_results_metadata', 'raw_data', 3, 23, 23, 'PARTNERS', 'FF325B94', 1),
        ('star_results_metadata', 'raw_data', 4, 24, 27, 'GEOGRAPHIC SCOPE', 'FF5A91D3', 1),
        ('star_results_metadata', 'raw_data', 5, 28, 28, 'EVIDENCES', 'FF64B1DD', 1),
        ('star_results_metadata', 'raw_data', 6, 29, 33, 'IP RIGHTS', 'FF35749A', 1)
    `,
    );
    await queryRunner.query(
      `
      UPDATE \`report_data_dictionary\`
      SET \`section\` = 'Evidences', \`section_fill_argb\` = 'FF5C7EC4'
      WHERE \`workbook_key\` = 'star_results_metadata'
        AND \`sort_order\` = 25
        AND \`field_label\` = 'Evidences'
    `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM \`report_workbook_column_group\`
      WHERE \`workbook_key\` = 'star_results_metadata' AND \`sheet_key\` = 'raw_data'
    `);
    await queryRunner.query(
      `
      INSERT INTO \`report_workbook_column_group\`
        (\`workbook_key\`, \`sheet_key\`, \`sort_order\`, \`from_col\`, \`to_col\`, \`label\`, \`fill_argb\`, \`is_active\`)
      VALUES
        ('star_results_metadata', 'raw_data', 1, 1, 14, 'GENERAL INFORMATION', 'FF203C61', 1),
        ('star_results_metadata', 'raw_data', 2, 15, 22, 'ALLIANCE ALIGNMENT', 'FF2A4783', 1),
        ('star_results_metadata', 'raw_data', 3, 23, 23, 'PARTNERS', 'FF325B94', 1),
        ('star_results_metadata', 'raw_data', 4, 24, 28, 'GEOGRAPHIC SCOPE', 'FF5A91D3', 1),
        ('star_results_metadata', 'raw_data', 5, 29, 33, 'IP RIGHTS', 'FF64B1DD', 1)
    `,
    );
    await queryRunner.query(
      `
      UPDATE \`report_data_dictionary\`
      SET \`section\` = NULL, \`section_fill_argb\` = NULL
      WHERE \`workbook_key\` = 'star_results_metadata'
        AND \`sort_order\` = 25
        AND \`field_label\` = 'Evidences'
    `,
    );
  }
}
