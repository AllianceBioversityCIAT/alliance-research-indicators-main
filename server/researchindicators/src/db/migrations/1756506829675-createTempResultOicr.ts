import { MigrationInterface, QueryRunner } from 'typeorm';
import { MaturityLevelEnum } from '../../domain/entities/maturity-level/enum/maturity-level.enum';

export class CreateTempResultOicr1756506829675 implements MigrationInterface {
  name = 'CreateTempResultOicr1756506829675';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`maturity_levels\` (\`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`created_by\` bigint NULL, \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`updated_by\` bigint NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, \`deleted_at\` timestamp NULL, \`id\` bigint NOT NULL AUTO_INCREMENT, \`name\` text NOT NULL, \`description\` text NOT NULL, \`full_name\` text NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`TEMP_result_external_oicrs\` (\`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`created_by\` bigint NULL, \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`updated_by\` bigint NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, \`deleted_at\` timestamp NULL, \`id\` bigint NOT NULL AUTO_INCREMENT, \`result_id\` bigint NOT NULL, \`external_oicr_id\` bigint NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`TEMP_external_oicrs\` (\`id\` bigint NOT NULL, \`title\` text NULL, \`contract_status\` text NULL, \`maturity_level\` text NULL, \`report_year\` text NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_oicrs\` ADD \`oicr_internal_code\` text NULL COMMENT 'OICR internal code for the result'`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_oicrs\` ADD \`short_outcome_impact_statement\` text NULL COMMENT 'Short Outcome/Impact Statement'`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_oicrs\` ADD \`maturity_level_id\` bigint NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_oicrs\` ADD CONSTRAINT \`FK_1a73e59f1bdbd24f71d9e87390b\` FOREIGN KEY (\`maturity_level_id\`) REFERENCES \`maturity_levels\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `INSERT INTO \`maturity_levels\` (id, name, description, full_name) VALUES (${MaturityLevelEnum.L1}, 'Level 1', 'Discourse/behavior changes (Sphere of Influence)', 'Level 1: Discourse/behavior changes (Sphere of Influence)'), (${MaturityLevelEnum.L2}, 'Level 2', 'Policy and/or in-practice changes (Sphere of Influence)', 'Level 2: Policy and/or in-practice changes (Sphere of Influence)'), (${MaturityLevelEnum.L3}, 'Level 3', 'Adoption or impact at scale (Sphere of Interest)', 'Level 3: Adoption or impact at scale (Sphere of Interest)')`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_oicrs\` DROP FOREIGN KEY \`FK_1a73e59f1bdbd24f71d9e87390b\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_oicrs\` DROP COLUMN \`maturity_level_id\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_oicrs\` DROP COLUMN \`short_outcome_impact_statement\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_oicrs\` DROP COLUMN \`oicr_internal_code\``,
    );
    await queryRunner.query(`DROP TABLE \`TEMP_external_oicrs\``);
    await queryRunner.query(`DROP TABLE \`TEMP_result_external_oicrs\``);
    await queryRunner.query(`DROP TABLE \`maturity_levels\``);
  }
}
