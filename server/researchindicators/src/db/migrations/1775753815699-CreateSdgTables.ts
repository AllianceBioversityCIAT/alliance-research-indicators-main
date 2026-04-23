import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSdgTables1775753815699 implements MigrationInterface {
  name = 'CreateSdgTables1775753815699';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`clarisa_sdg_targets\` (\`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`created_by\` bigint NULL, \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`updated_by\` bigint NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, \`deleted_at\` timestamp NULL, \`id\` bigint NOT NULL, \`sdg_target\` text NULL, \`sdg_target_code\` text NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`lever_sdg_targets\` (\`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`created_by\` bigint NULL, \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`updated_by\` bigint NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, \`deleted_at\` timestamp NULL, \`id\` bigint NOT NULL AUTO_INCREMENT, \`lever_id\` bigint NOT NULL, \`sdg_target_id\` bigint NOT NULL, UNIQUE INDEX \`lever_id_sdg_target_id_unique\` (\`lever_id\`, \`sdg_target_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`lever_sdg_targets\` ADD CONSTRAINT \`FK_e06b57688faa64aa79b1afd2e97\` FOREIGN KEY (\`lever_id\`) REFERENCES \`clarisa_levers\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`lever_sdg_targets\` ADD CONSTRAINT \`FK_ec9ff129b18f91807d275685826\` FOREIGN KEY (\`sdg_target_id\`) REFERENCES \`clarisa_sdg_targets\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`lever_sdg_targets\` DROP FOREIGN KEY \`FK_ec9ff129b18f91807d275685826\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`lever_sdg_targets\` DROP FOREIGN KEY \`FK_e06b57688faa64aa79b1afd2e97\``,
    );
    await queryRunner.query(
      `DROP INDEX \`lever_id_sdg_target_id_unique\` ON \`lever_sdg_targets\``,
    );
    await queryRunner.query(`DROP TABLE \`lever_sdg_targets\``);
    await queryRunner.query(`DROP TABLE \`clarisa_sdg_targets\``);
  }
}
