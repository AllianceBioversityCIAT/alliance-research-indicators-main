import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds NOTABLE REFERENCES (col 29) to EVIDENCES, shifting LINK TO RESULT and later groups +1.
 */
export class StarRawNotableReferencesColumnGroup1781215000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
      UPDATE \`report_workbook_column_group\`
      SET \`to_col\` = 29
      WHERE \`workbook_key\` = 'star_results_metadata'
        AND \`sheet_key\` = 'raw_data'
        AND \`label\` = 'EVIDENCES'
    `,
    );

    await queryRunner.query(
      `
      UPDATE \`report_workbook_column_group\`
      SET \`from_col\` = \`from_col\` + 1,
          \`to_col\` = \`to_col\` + 1
      WHERE \`workbook_key\` = 'star_results_metadata'
        AND \`sheet_key\` = 'raw_data'
        AND \`from_col\` >= 29
    `,
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
        (\`workbook_key\`, \`section\`, \`field_label\`, \`explanation\`, \`sort_order\`, \`is_active\`)
      VALUES
        ('star_results_metadata', '', 'Notable references', 'Notable references for the result (reference type and link). Only populated for Outcome/Impact Case Report (OICR) results.', 26, 1)
    `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
      DELETE FROM \`report_data_dictionary\`
      WHERE \`workbook_key\` = 'star_results_metadata'
        AND \`field_label\` = 'Notable references'
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

    await queryRunner.query(
      `
      UPDATE \`report_workbook_column_group\`
      SET \`from_col\` = \`from_col\` - 1,
          \`to_col\` = \`to_col\` - 1
      WHERE \`workbook_key\` = 'star_results_metadata'
        AND \`sheet_key\` = 'raw_data'
        AND \`from_col\` >= 30
    `,
    );

    await queryRunner.query(
      `
      UPDATE \`report_workbook_column_group\`
      SET \`to_col\` = 28
      WHERE \`workbook_key\` = 'star_results_metadata'
        AND \`sheet_key\` = 'raw_data'
        AND \`label\` = 'EVIDENCES'
    `,
    );
  }
}
