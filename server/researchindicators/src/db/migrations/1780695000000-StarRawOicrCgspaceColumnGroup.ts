import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Extends OICR DETAILS (col 73) with CGSpace link after report_oicr view update.
 */
export class StarRawOicrCgspaceColumnGroup1780695000000
  implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
      UPDATE \`report_workbook_column_group\`
      SET \`to_col\` = 73
      WHERE \`workbook_key\` = 'star_results_metadata'
        AND \`sheet_key\` = 'raw_data'
        AND \`label\` = 'OICR DETAILS'
    `,
    );

    await queryRunner.query(
      `
      UPDATE \`report_data_dictionary\`
      SET \`sort_order\` = \`sort_order\` + 1
      WHERE \`workbook_key\` = 'star_results_metadata'
        AND \`sort_order\` >= 89
    `,
    );

    await queryRunner.query(
      `
      INSERT INTO \`report_data_dictionary\`
        (\`workbook_key\`, \`section\`, \`field_label\`, \`explanation\`, \`sort_order\`, \`is_active\`)
      VALUES
        ('star_results_metadata', '', 'CGSpace link', 'Link to the OICR publication in CGSpace.', 89, 1)
    `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
      DELETE FROM \`report_data_dictionary\`
      WHERE \`workbook_key\` = 'star_results_metadata'
        AND \`field_label\` = 'CGSpace link'
        AND \`sort_order\` = 89
    `,
    );

    await queryRunner.query(
      `
      UPDATE \`report_data_dictionary\`
      SET \`sort_order\` = \`sort_order\` - 1
      WHERE \`workbook_key\` = 'star_results_metadata'
        AND \`sort_order\` > 89
    `,
    );

    await queryRunner.query(
      `
      UPDATE \`report_workbook_column_group\`
      SET \`to_col\` = 72
      WHERE \`workbook_key\` = 'star_results_metadata'
        AND \`sheet_key\` = 'raw_data'
        AND \`label\` = 'OICR DETAILS'
    `,
    );
  }
}
