import { MigrationInterface, QueryRunner } from 'typeorm';

export class ReportSectionColorsAndColumnGroups1777026000000
  implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`report_workbook_column_group\` (
        \`report_workbook_column_group_id\` bigint NOT NULL AUTO_INCREMENT,
        \`workbook_key\` varchar(64) NOT NULL,
        \`sheet_key\` varchar(64) NOT NULL,
        \`sort_order\` int NOT NULL,
        \`from_col\` int NOT NULL,
        \`to_col\` int NOT NULL,
        \`label\` varchar(255) NOT NULL,
        \`fill_argb\` varchar(9) NOT NULL,
        \`is_active\` tinyint NOT NULL DEFAULT 1,
        PRIMARY KEY (\`report_workbook_column_group_id\`),
        KEY \`idx_workbook_sheet_sort\` (\`workbook_key\`,\`sheet_key\`,\`sort_order\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      ALTER TABLE \`report_data_dictionary\`
      ADD COLUMN \`section_fill_argb\` varchar(9) NULL AFTER \`explanation\`
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

    const sectionColors: [string, string][] = [
      ['Section', 'FF455A64'],
      ['General Information', 'FF203C61'],
      ['Alliance Alignment', 'FF2A4783'],
      ['Partners', 'FF325B94'],
      ['Geographic scope', 'FF5A91D3'],
      ['Evidences', 'FF64B1DD'],
      ['IP rights', 'FF35749A'],
      ['CapSharing details', 'FF00838F'],
      ['Policy Change', 'FF3949AB'],
      ['Innovation details', 'FF00897B'],
      ['OICRS', 'FFAD1457'],
    ];
    for (const [section, color] of sectionColors) {
      await queryRunner.query(
        `
        UPDATE \`report_data_dictionary\`
        SET \`section_fill_argb\` = ?
        WHERE \`workbook_key\` = 'star_results_metadata'
          AND \`section\` = ?
      `,
        [color, section],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`report_data_dictionary\` DROP COLUMN \`section_fill_argb\``,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS \`report_workbook_column_group\``);
  }
}
