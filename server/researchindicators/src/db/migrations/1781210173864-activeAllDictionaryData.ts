import { MigrationInterface, QueryRunner } from 'typeorm';

export class ActiveAllDictionaryData1781210173864
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE report_data_dictionary SET is_active = TRUE WHERE workbook_key = 'star_results_metadata'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE report_data_dictionary SET is_active = FALSE WHERE workbook_key = 'star_results_metadata'`,
    );
  }
}
