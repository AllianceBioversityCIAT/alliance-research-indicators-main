import { MigrationInterface, QueryRunner } from 'typeorm';

export class RefactorSubmmissionHistory1740497884580
  implements MigrationInterface
{
  name = 'RefactorSubmmissionHistory1740497884580';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`submission_history\` DROP FOREIGN KEY \`FK_0345ccf30661a59fddd3c1d13e3\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`submission_history\` DROP COLUMN \`submission_status_id\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`submission_history\` ADD \`from_status_id\` bigint NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`submission_history\` ADD \`to_status_id\` bigint NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`submission_history\` ADD CONSTRAINT \`FK_0e7d46ad239a7b21a5ae8c68d22\` FOREIGN KEY (\`from_status_id\`) REFERENCES \`result_status\`(\`result_status_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`submission_history\` ADD CONSTRAINT \`FK_5fed66685902779bb341511b8a8\` FOREIGN KEY (\`to_status_id\`) REFERENCES \`result_status\`(\`result_status_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`submission_history\` DROP FOREIGN KEY \`FK_5fed66685902779bb341511b8a8\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`submission_history\` DROP FOREIGN KEY \`FK_0e7d46ad239a7b21a5ae8c68d22\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`submission_history\` DROP COLUMN \`to_status_id\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`submission_history\` DROP COLUMN \`from_status_id\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`submission_history\` ADD \`submission_status_id\` bigint NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`submission_history\` ADD CONSTRAINT \`FK_0345ccf30661a59fddd3c1d13e3\` FOREIGN KEY (\`submission_status_id\`) REFERENCES \`result_status\`(\`result_status_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }
}
