import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatStatusWorkFlow1767796719645 implements MigrationInterface {
  name = 'CreatStatusWorkFlow1767796719645';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_status_transitions\` DROP FOREIGN KEY \`FK_9bb0e4bcdbb9b2832692d987dfd\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_status_transitions\` DROP FOREIGN KEY \`FK_fa2fe18b46e867b6f36e9f4df69\``,
    );
    await queryRunner.query(
      `CREATE TABLE \`result_status_workflow\` (\`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`created_by\` bigint NULL, \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`updated_by\` bigint NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, \`deleted_at\` timestamp NULL, \`id\` bigint NOT NULL AUTO_INCREMENT, \`indicator_id\` bigint NOT NULL, \`from_status_id\` bigint NOT NULL, \`to_status_id\` bigint NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_status_workflow\` ADD CONSTRAINT \`FK_de70ac095d28e247f88df095be4\` FOREIGN KEY (\`indicator_id\`) REFERENCES \`indicators\`(\`indicator_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_status_workflow\` ADD CONSTRAINT \`FK_765e7c10868a1d97b08fdb92c32\` FOREIGN KEY (\`from_status_id\`) REFERENCES \`result_status\`(\`result_status_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_status_workflow\` ADD CONSTRAINT \`FK_d4bd6a0015441dcca0bb3f61901\` FOREIGN KEY (\`to_status_id\`) REFERENCES \`result_status\`(\`result_status_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_status_workflow\` DROP FOREIGN KEY \`FK_d4bd6a0015441dcca0bb3f61901\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_status_workflow\` DROP FOREIGN KEY \`FK_765e7c10868a1d97b08fdb92c32\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_status_workflow\` DROP FOREIGN KEY \`FK_de70ac095d28e247f88df095be4\``,
    );
    await queryRunner.query(`DROP TABLE \`result_status_workflow\``);
    await queryRunner.query(
      `ALTER TABLE \`result_status_transitions\` ADD CONSTRAINT \`FK_fa2fe18b46e867b6f36e9f4df69\` FOREIGN KEY (\`to_status_id\`) REFERENCES \`result_status\`(\`result_status_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_status_transitions\` ADD CONSTRAINT \`FK_9bb0e4bcdbb9b2832692d987dfd\` FOREIGN KEY (\`from_status_id\`) REFERENCES \`result_status\`(\`result_status_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }
}
