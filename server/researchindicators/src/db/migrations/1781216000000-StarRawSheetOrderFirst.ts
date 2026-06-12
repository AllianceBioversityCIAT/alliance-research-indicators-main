import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Raw data tab first, Data dictionary second.
 */
export class StarRawSheetOrderFirst1781216000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
      UPDATE \`report_workbook_sheet\`
      SET \`sort_order\` = 1
      WHERE \`workbook_key\` = 'star_results_metadata'
        AND \`sheet_key\` = 'raw_data'
    `,
    );
    await queryRunner.query(
      `
      UPDATE \`report_workbook_sheet\`
      SET \`sort_order\` = 2
      WHERE \`workbook_key\` = 'star_results_metadata'
        AND \`sheet_key\` = 'data_dictionary'
    `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
      UPDATE \`report_workbook_sheet\`
      SET \`sort_order\` = 1
      WHERE \`workbook_key\` = 'star_results_metadata'
        AND \`sheet_key\` = 'data_dictionary'
    `,
    );
    await queryRunner.query(
      `
      UPDATE \`report_workbook_sheet\`
      SET \`sort_order\` = 2
      WHERE \`workbook_key\` = 'star_results_metadata'
        AND \`sheet_key\` = 'raw_data'
    `,
    );
  }
}
