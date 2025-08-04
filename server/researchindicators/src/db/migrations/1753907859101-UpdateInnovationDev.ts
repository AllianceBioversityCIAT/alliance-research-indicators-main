import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateInnovationDev1753907859101 implements MigrationInterface {
  name = 'UpdateInnovationDev1753907859101';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_institution_types\` ADD \`is_organization_known\` tinyint NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_institution_types\` ADD \`institution_id\` bigint NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_innovation_dev\` ADD \`is_new_or_improved_variety\` tinyint NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_innovation_dev\` ADD \`new_or_improved_varieties_count\` bigint NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_institution_types\` ADD CONSTRAINT \`FK_f2806447d550accfa328298dbb9\` FOREIGN KEY (\`institution_id\`) REFERENCES \`clarisa_institutions\`(\`code\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_capacity_sharing\` ADD CONSTRAINT \`FK_9819eac11aa1d3ee4c8b6878aec\` FOREIGN KEY (\`result_id\`) REFERENCES \`results\`(\`result_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_capacity_sharing\` DROP FOREIGN KEY \`FK_9819eac11aa1d3ee4c8b6878aec\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_institution_types\` DROP FOREIGN KEY \`FK_f2806447d550accfa328298dbb9\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_innovation_dev\` DROP COLUMN \`new_or_improved_varieties_count\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_innovation_dev\` DROP COLUMN \`is_new_or_improved_variety\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_institution_types\` DROP COLUMN \`institution_id\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_institution_types\` DROP COLUMN \`is_organization_known\``,
    );
  }
}
