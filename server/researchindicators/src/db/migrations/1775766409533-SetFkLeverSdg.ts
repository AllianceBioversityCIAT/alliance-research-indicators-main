import { MigrationInterface, QueryRunner } from 'typeorm';

export class SetFkLeverSdg1775766409533 implements MigrationInterface {
  name = 'SetFkLeverSdg1775766409533';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const indexRows = await queryRunner.query(
      `SELECT COUNT(1) AS cnt
             FROM information_schema.statistics
             WHERE table_schema = DATABASE()
               AND table_name = 'lever_sdg_targets'
               AND index_name = 'FK_ec9ff129b18f91807d275685826'`,
    );
    const indexExists = Number(indexRows[0]?.cnt ?? 0) > 0;
    if (indexExists) {
      await queryRunner.query(
        `DROP INDEX \`FK_ec9ff129b18f91807d275685826\` ON \`lever_sdg_targets\``,
      );
    }
    const index2Rows = await queryRunner.query(
      `SELECT COUNT(1) AS cnt
             FROM information_schema.statistics
             WHERE table_schema = DATABASE()
               AND table_name = 'lever_sdg_targets'
               AND index_name = 'FK_e06b57688faa64aa79b1afd2e97'`,
    );
    const index2Exists = Number(index2Rows[0]?.cnt ?? 0) > 0;
    if (index2Exists) {
      await queryRunner.query(
        `DROP INDEX \`FK_e06b57688faa64aa79b1afd2e97\` ON \`lever_sdg_targets\``,
      );
    }
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
      `CREATE INDEX \`FK_ec9ff129b18f91807d275685826\` ON \`lever_sdg_targets\` (\`sdg_target_id\`)`,
    );
  }
}
