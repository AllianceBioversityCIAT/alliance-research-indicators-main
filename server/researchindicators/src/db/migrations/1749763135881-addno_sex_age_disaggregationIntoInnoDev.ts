import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddnoSexAgeDisaggregationIntoInnoDev1749763135881
  implements MigrationInterface
{
  name = 'AddnoSexAgeDisaggregationIntoInnoDev1749763135881';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_innovation_dev\` ADD \`no_sex_age_disaggregation\` tinyint NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_innovation_dev\` ADD CONSTRAINT \`FK_9e8b40e61dfa75aafd5eea93af8\` FOREIGN KEY (\`innovation_nature_id\`) REFERENCES \`clarisa_innovation_characteristics\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_innovation_dev\` ADD CONSTRAINT \`FK_6d94a047718567bd95719d91949\` FOREIGN KEY (\`innovation_type_id\`) REFERENCES \`clarisa_innovation_types\`(\`code\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_innovation_dev\` ADD CONSTRAINT \`FK_68ded56103d3a380b783a20ecfc\` FOREIGN KEY (\`innovation_readiness_id\`) REFERENCES \`clarisa_innovation_readiness_levels\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_innovation_dev\` DROP FOREIGN KEY \`FK_68ded56103d3a380b783a20ecfc\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_innovation_dev\` DROP FOREIGN KEY \`FK_6d94a047718567bd95719d91949\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_innovation_dev\` DROP FOREIGN KEY \`FK_9e8b40e61dfa75aafd5eea93af8\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_innovation_dev\` DROP COLUMN \`no_sex_age_disaggregation\``,
    );
  }
}
