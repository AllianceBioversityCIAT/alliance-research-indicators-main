import { MigrationInterface, QueryRunner } from 'typeorm';
import { ResultStatusEnum } from '../../domain/entities/result-status/enum/result-status.enum';

export class CreateResultStatusTransitionTable1763739726901
  implements MigrationInterface
{
  name = 'CreateResultStatusTransitionTable1763739726901';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`result_status_transitions\` (\`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`created_by\` bigint NULL, \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`updated_by\` bigint NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, \`deleted_at\` timestamp NULL, \`id\` bigint NOT NULL AUTO_INCREMENT, \`from_status_id\` bigint NOT NULL, \`to_status_id\` bigint NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_status_transitions\` ADD CONSTRAINT \`FK_fa2fe18b46e867b6f36e9f4df69\` FOREIGN KEY (\`to_status_id\`) REFERENCES \`result_status\`(\`result_status_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_status_transitions\` ADD CONSTRAINT \`FK_9bb0e4bcdbb9b2832692d987dfd\` FOREIGN KEY (\`from_status_id\`) REFERENCES \`result_status\`(\`result_status_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `INSERT INTO result_status (result_status_id, name) VALUES (${ResultStatusEnum.SCIENCE_EDITION}, 'Science Edition'), (${ResultStatusEnum.KM_CURATION}, 'KM Curation'), (${ResultStatusEnum.PUBLISHED}, 'Published')`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_status_transitions\` DROP FOREIGN KEY \`FK_9bb0e4bcdbb9b2832692d987dfd\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_status_transitions\` DROP FOREIGN KEY \`FK_fa2fe18b46e867b6f36e9f4df69\``,
    );
    await queryRunner.query(`DROP TABLE \`result_status_transitions\``);
  }
}
