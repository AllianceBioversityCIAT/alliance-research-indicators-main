import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddedFkStatusAiReport1781122590421 implements MigrationInterface {
  name = 'AddedFkStatusAiReport1781122590421';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`bulk_upload_results\` ADD CONSTRAINT \`FK_f05df7141c61cb5b1d2a14a0406\` FOREIGN KEY (\`final_status\`) REFERENCES \`result_status\`(\`result_status_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`bulk_upload_results\` ADD CONSTRAINT \`FK_8e17444ba0acb49f52a127443ab\` FOREIGN KEY (\`suggested_status\`) REFERENCES \`result_status\`(\`result_status_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`bulk_upload_results\` DROP FOREIGN KEY \`FK_8e17444ba0acb49f52a127443ab\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`bulk_upload_results\` DROP FOREIGN KEY \`FK_f05df7141c61cb5b1d2a14a0406\``,
    );
  }
}
