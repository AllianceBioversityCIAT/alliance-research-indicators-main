import { MigrationInterface, QueryRunner } from 'typeorm';

/** Number of Innovation Development columns inserted before OICR. */
const INNOVATION_DEV_COLUMN_COUNT = 27;

/**
 * Inserts INNOVATION DETAILS (cols 61–87) between POLICY and OICR, shifting OICR +27.
 */
export class StarRawInnovationDevColumnGroup1781301000000
  implements MigrationInterface
{
  private static readonly SECTION_FILL_ARGB = 'FF00897B';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
      UPDATE \`report_workbook_column_group\`
      SET \`sort_order\` = \`sort_order\` + 1,
          \`from_col\` = \`from_col\` + ?,
          \`to_col\` = \`to_col\` + ?
      WHERE \`workbook_key\` = 'star_results_metadata'
        AND \`sheet_key\` = 'raw_data'
        AND \`sort_order\` >= 10
    `,
      [INNOVATION_DEV_COLUMN_COUNT, INNOVATION_DEV_COLUMN_COUNT],
    );

    await queryRunner.query(
      `
      INSERT INTO \`report_workbook_column_group\`
        (\`workbook_key\`, \`sheet_key\`, \`sort_order\`, \`from_col\`, \`to_col\`, \`label\`, \`fill_argb\`, \`is_active\`)
      VALUES
        ('star_results_metadata', 'raw_data', 10, 61, 87, 'INNOVATION DETAILS', ?, 1)
    `,
      [StarRawInnovationDevColumnGroup1781301000000.SECTION_FILL_ARGB],
    );

    await queryRunner.query(
      `
      UPDATE \`report_data_dictionary\`
      SET \`section_fill_argb\` = ?
      WHERE \`workbook_key\` = 'star_results_metadata'
        AND \`section\` = 'Innovation details'
    `,
      [StarRawInnovationDevColumnGroup1781301000000.SECTION_FILL_ARGB],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
      DELETE FROM \`report_workbook_column_group\`
      WHERE \`workbook_key\` = 'star_results_metadata'
        AND \`sheet_key\` = 'raw_data'
        AND \`label\` = 'INNOVATION DETAILS'
        AND \`from_col\` = 61
        AND \`to_col\` = 87
    `,
    );

    await queryRunner.query(
      `
      UPDATE \`report_workbook_column_group\`
      SET \`sort_order\` = \`sort_order\` - 1,
          \`from_col\` = \`from_col\` - ?,
          \`to_col\` = \`to_col\` - ?
      WHERE \`workbook_key\` = 'star_results_metadata'
        AND \`sheet_key\` = 'raw_data'
        AND \`sort_order\` > 10
    `,
      [INNOVATION_DEV_COLUMN_COUNT, INNOVATION_DEV_COLUMN_COUNT],
    );

    await queryRunner.query(
      `
      UPDATE \`report_data_dictionary\`
      SET \`section_fill_argb\` = 'FF00897B'
      WHERE \`workbook_key\` = 'star_results_metadata'
        AND \`section\` = 'Innovation details'
    `,
    );
  }
}
