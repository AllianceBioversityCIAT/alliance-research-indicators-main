import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Inserts LINK TO RESULT (col 29) between EVIDENCES and IP RIGHTS, shifting later groups +1.
 */
export class StarRawLinkResultColumnGroup1780690000000
  implements MigrationInterface
{
  private static readonly SECTION_FILL_ARGB = 'FF7E57C2';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
      UPDATE \`report_workbook_column_group\`
      SET \`sort_order\` = \`sort_order\` + 1,
          \`from_col\` = \`from_col\` + 1,
          \`to_col\` = \`to_col\` + 1
      WHERE \`workbook_key\` = 'star_results_metadata'
        AND \`sheet_key\` = 'raw_data'
        AND \`sort_order\` >= 6
    `,
    );

    await queryRunner.query(
      `
      INSERT INTO \`report_workbook_column_group\`
        (\`workbook_key\`, \`sheet_key\`, \`sort_order\`, \`from_col\`, \`to_col\`, \`label\`, \`fill_argb\`, \`is_active\`)
      VALUES
        ('star_results_metadata', 'raw_data', 6, 29, 29, 'LINK TO RESULT', ?, 1)
    `,
      [StarRawLinkResultColumnGroup1780690000000.SECTION_FILL_ARGB],
    );

    await queryRunner.query(
      `
      UPDATE \`report_data_dictionary\`
      SET \`sort_order\` = \`sort_order\` + 1
      WHERE \`workbook_key\` = 'star_results_metadata'
        AND \`sort_order\` >= 26
    `,
    );

    await queryRunner.query(
      `
      INSERT INTO \`report_data_dictionary\`
        (\`workbook_key\`, \`section\`, \`field_label\`, \`explanation\`, \`sort_order\`, \`is_active\`, \`section_fill_argb\`)
      VALUES
        ('star_results_metadata', 'Link to Result', 'Link to Result', 'Results linked to this result (indicator, code, and title).', 26, 1, ?)
    `,
      [StarRawLinkResultColumnGroup1780690000000.SECTION_FILL_ARGB],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
      DELETE FROM \`report_workbook_column_group\`
      WHERE \`workbook_key\` = 'star_results_metadata'
        AND \`sheet_key\` = 'raw_data'
        AND \`label\` = 'LINK TO RESULT'
        AND \`from_col\` = 29
        AND \`to_col\` = 29
    `,
    );

    await queryRunner.query(
      `
      UPDATE \`report_workbook_column_group\`
      SET \`sort_order\` = \`sort_order\` - 1,
          \`from_col\` = \`from_col\` - 1,
          \`to_col\` = \`to_col\` - 1
      WHERE \`workbook_key\` = 'star_results_metadata'
        AND \`sheet_key\` = 'raw_data'
        AND \`sort_order\` > 6
    `,
    );

    await queryRunner.query(
      `
      DELETE FROM \`report_data_dictionary\`
      WHERE \`workbook_key\` = 'star_results_metadata'
        AND \`section\` = 'Link to Result'
        AND \`sort_order\` = 26
    `,
    );

    await queryRunner.query(
      `
      UPDATE \`report_data_dictionary\`
      SET \`sort_order\` = \`sort_order\` - 1
      WHERE \`workbook_key\` = 'star_results_metadata'
        AND \`sort_order\` > 26
    `,
    );
  }
}
