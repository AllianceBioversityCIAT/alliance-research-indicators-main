import { MigrationInterface, QueryRunner } from 'typeorm';
import { QuantificationRolesEnum } from '../../domain/entities/quantification-roles/enum/quantification-roles.enum';

export class CreateQuantificationTables1760653582914
  implements MigrationInterface
{
  name = 'CreateQuantificationTables1760653582914';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`quantification_roles\` (\`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`created_by\` bigint NULL, \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`updated_by\` bigint NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, \`deleted_at\` timestamp NULL, \`id\` bigint NOT NULL AUTO_INCREMENT, \`name\` text NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`result_quantifications\` (\`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`created_by\` bigint NULL, \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`updated_by\` bigint NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, \`deleted_at\` timestamp NULL, \`id\` bigint NOT NULL AUTO_INCREMENT, \`quantification_number\` bigint NOT NULL, \`unit\` text NOT NULL, \`description\` text NULL, \`result_id\` bigint NOT NULL, \`quantification_role_id\` bigint NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_quantifications\` ADD CONSTRAINT \`FK_8aa7d9122b10db5299e44ccf7ae\` FOREIGN KEY (\`result_id\`) REFERENCES \`results\`(\`result_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_quantifications\` ADD CONSTRAINT \`FK_486a03e0bec68eb135c38e6f022\` FOREIGN KEY (\`quantification_role_id\`) REFERENCES \`quantification_roles\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `INSERT INTO \`quantification_roles\` (\`id\`, \`name\`) VALUES (${QuantificationRolesEnum.ACTUAL_COUNT}, 'actual_count'), (${QuantificationRolesEnum.EXTRAPOLATE_ESTIMATES}, 'extrapolate_estimates')`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_quantifications\` DROP FOREIGN KEY \`FK_486a03e0bec68eb135c38e6f022\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_quantifications\` DROP FOREIGN KEY \`FK_8aa7d9122b10db5299e44ccf7ae\``,
    );
    await queryRunner.query(`DROP TABLE \`result_quantifications\``);
    await queryRunner.query(`DROP TABLE \`quantification_roles\``);
  }
}
