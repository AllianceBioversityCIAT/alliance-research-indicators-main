import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateResultLeverSdg1775766147426 implements MigrationInterface {
  name = 'CreateResultLeverSdg1775766147426';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`lever_sdg_targets\` DROP FOREIGN KEY \`FK_e06b57688faa64aa79b1afd2e97\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`lever_sdg_targets\` DROP FOREIGN KEY \`FK_ec9ff129b18f91807d275685826\``,
    );
    await queryRunner.query(
      `DROP INDEX \`lever_id_sdg_target_id_unique\` ON \`lever_sdg_targets\``,
    );
    await queryRunner.query(
      `CREATE TABLE \`result_lever_sdg_targets\` (\`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`created_by\` bigint NULL, \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`updated_by\` bigint NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, \`deleted_at\` timestamp NULL, \`result_lever_sdg_target_id\` bigint NOT NULL AUTO_INCREMENT, \`result_lever_id\` bigint NOT NULL, \`sdg_target_id\` bigint NOT NULL, PRIMARY KEY (\`result_lever_sdg_target_id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE INDEX \`lever_id_sdg_target_id_index\` ON \`lever_sdg_targets\` (\`lever_id\`, \`sdg_target_id\`)`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_lever_sdg_targets\` ADD CONSTRAINT \`FK_dcb2055145b60b1cbb003b9a37a\` FOREIGN KEY (\`result_lever_id\`) REFERENCES \`result_levers\`(\`result_lever_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_lever_sdg_targets\` ADD CONSTRAINT \`FK_7dbd3494864c2245863649bd1e2\` FOREIGN KEY (\`sdg_target_id\`) REFERENCES \`clarisa_sdg_targets\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_lever_sdg_targets\` DROP FOREIGN KEY \`FK_7dbd3494864c2245863649bd1e2\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_lever_sdg_targets\` DROP FOREIGN KEY \`FK_dcb2055145b60b1cbb003b9a37a\``,
    );
    await queryRunner.query(
      `DROP INDEX \`lever_id_sdg_target_id_index\` ON \`lever_sdg_targets\``,
    );
    await queryRunner.query(`DROP TABLE \`result_lever_sdg_targets\``);
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`lever_id_sdg_target_id_unique\` ON \`lever_sdg_targets\` (\`lever_id\`, \`sdg_target_id\`)`,
    );
    await queryRunner.query(
      `ALTER TABLE \`lever_sdg_targets\` ADD CONSTRAINT \`FK_ec9ff129b18f91807d275685826\` FOREIGN KEY (\`sdg_target_id\`) REFERENCES \`clarisa_sdg_targets\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`lever_sdg_targets\` ADD CONSTRAINT \`FK_e06b57688faa64aa79b1afd2e97\` FOREIGN KEY (\`lever_id\`) REFERENCES \`clarisa_levers\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }
}
