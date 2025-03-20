import { MigrationInterface, QueryRunner } from 'typeorm';
import { ResultStatusEnum } from '../../domain/entities/result-status/enum/result-status.enum';

export class ResultStatusTableCreated1731596703634
  implements MigrationInterface
{
  name = 'ResultStatusTableCreated1731596703634';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`result_status\` (\`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`created_by\` bigint NULL, \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`updated_by\` bigint NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, \`result_status_id\` bigint NOT NULL, \`name\` text NOT NULL, \`description\` text NULL, PRIMARY KEY (\`result_status_id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results\` ADD \`result_status_id\` bigint NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results\` ADD CONSTRAINT \`FK_f2652ffd1160a8da41e32a439c5\` FOREIGN KEY (\`result_status_id\`) REFERENCES \`result_status\`(\`result_status_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `INSERT INTO result_status (result_status_id, name) VALUES (${ResultStatusEnum.EDITING}, 'Editing'), (${ResultStatusEnum.SUBMITTED}, 'Submitted')`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`results\` DROP FOREIGN KEY \`FK_f2652ffd1160a8da41e32a439c5\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results\` DROP COLUMN \`result_status_id\``,
    );
    await queryRunner.query(`DROP TABLE \`result_status\``);
  }
}
