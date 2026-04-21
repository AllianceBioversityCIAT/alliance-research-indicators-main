import { MigrationInterface, QueryRunner } from 'typeorm';
import { STAR_RESULTS_METADATA_DICTIONARY_SEED } from './seed-data/star-results-metadata-dictionary.seed';

export class CreateReportWorkbookTables1777025000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`report_workbook_sheet\` (
        \`report_workbook_sheet_id\` bigint NOT NULL AUTO_INCREMENT,
        \`workbook_key\` varchar(64) NOT NULL,
        \`sheet_key\` varchar(64) NOT NULL,
        \`sheet_name\` varchar(255) NOT NULL,
        \`sort_order\` int NOT NULL DEFAULT 0,
        \`is_active\` tinyint NOT NULL DEFAULT 1,
        PRIMARY KEY (\`report_workbook_sheet_id\`),
        UNIQUE KEY \`uq_workbook_sheet\` (\`workbook_key\`,\`sheet_key\`),
        KEY \`idx_workbook_sort\` (\`workbook_key\`,\`sort_order\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE \`report_data_dictionary\` (
        \`report_data_dictionary_id\` bigint NOT NULL AUTO_INCREMENT,
        \`workbook_key\` varchar(64) NOT NULL,
        \`section\` varchar(512) DEFAULT NULL,
        \`field_label\` text NOT NULL,
        \`explanation\` text,
        \`sort_order\` int NOT NULL,
        \`is_active\` tinyint NOT NULL DEFAULT 1,
        PRIMARY KEY (\`report_data_dictionary_id\`),
        KEY \`idx_workbook_dict_sort\` (\`workbook_key\`,\`sort_order\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(
      `
      INSERT INTO \`report_workbook_sheet\` (\`workbook_key\`, \`sheet_key\`, \`sheet_name\`, \`sort_order\`, \`is_active\`)
      VALUES
        ('star_results_metadata', 'data_dictionary', 'Data dictionary', 1, 1),
        ('star_results_metadata', 'raw_data', 'Raw data', 2, 1)
    `,
    );

    for (const row of STAR_RESULTS_METADATA_DICTIONARY_SEED) {
      await queryRunner.query(
        `
        INSERT INTO \`report_data_dictionary\`
          (\`workbook_key\`, \`section\`, \`field_label\`, \`explanation\`, \`sort_order\`, \`is_active\`)
        VALUES (?, ?, ?, ?, ?, 1)
      `,
        [
          'star_results_metadata',
          row.section === '' ? null : row.section,
          row.fieldLabel,
          row.explanation === '' ? null : row.explanation,
          row.sortOrder,
        ],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS \`report_data_dictionary\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`report_workbook_sheet\``);
  }
}
