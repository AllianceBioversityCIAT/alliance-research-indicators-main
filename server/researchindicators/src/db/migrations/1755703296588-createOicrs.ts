import { MigrationInterface, QueryRunner } from 'typeorm';
import { LinkResultRolesEnum } from '../../domain/entities/link-result-roles/enum/link-result-roles.enum';
import { TagEnum } from '../../domain/entities/tags/enum/tag.enum';

export class CreateOicrs1755703296588 implements MigrationInterface {
  name = 'CreateOicrs1755703296588';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`tags\` (\`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`created_by\` bigint NULL, \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`updated_by\` bigint NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, \`deleted_at\` timestamp NULL, \`id\` bigint NOT NULL AUTO_INCREMENT, \`name\` text NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`result_tags\` (\`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`created_by\` bigint NULL, \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`updated_by\` bigint NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, \`deleted_at\` timestamp NULL, \`id\` bigint NOT NULL AUTO_INCREMENT, \`result_id\` bigint NOT NULL, \`tag_id\` bigint NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`clarisa_initiatives\` (\`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`created_by\` bigint NULL, \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`updated_by\` bigint NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, \`deleted_at\` timestamp NULL, \`id\` bigint NOT NULL, \`name\` text NULL, \`short_name\` text NULL, \`official_code\` text NULL, \`type_id\` bigint NULL, \`active\` tinyint NOT NULL DEFAULT 1, \`status\` text NULL, \`stageId\` bigint NULL, \`description\` text NULL, \`action_area_id\` bigint NULL, \`action_area_description\` text NULL, \`stages\` json NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`result_initiatives\` (\`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`created_by\` bigint NULL, \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`updated_by\` bigint NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, \`deleted_at\` timestamp NULL, \`id\` bigint NOT NULL AUTO_INCREMENT, \`result_id\` bigint NOT NULL, \`clarisa_initiative_id\` bigint NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results\` ADD \`comment_geo_scope\` text NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_tags\` ADD CONSTRAINT \`FK_f6520a6cc644909c5e25197c8ca\` FOREIGN KEY (\`tag_id\`) REFERENCES \`tags\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_tags\` ADD CONSTRAINT \`FK_9cb8ca62f545000e4ef67d0ccc0\` FOREIGN KEY (\`result_id\`) REFERENCES \`results\`(\`result_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_initiatives\` ADD CONSTRAINT \`FK_c9e9e5e149c16a44d186942aa40\` FOREIGN KEY (\`result_id\`) REFERENCES \`results\`(\`result_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_initiatives\` ADD CONSTRAINT \`FK_ec2e5e1a2bee45a2bdb804d905e\` FOREIGN KEY (\`clarisa_initiative_id\`) REFERENCES \`clarisa_initiatives\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `INSERT INTO \`link_result_roles\` (\`link_result_role_id\`, \`name\`) VALUES (${LinkResultRolesEnum.OICR_STEP_ONE}, 'OICR Step One')`,
    );
    await queryRunner.query(
      `INSERT INTO \`tags\` (\`id\`, \`name\`) VALUES (${TagEnum.NEW_OUTCOME_IMPACT_CASE}, 'New Outcome Impact Case'), (${TagEnum.UPDATED_OUTCOME_IMPACT_CASE_SAME_LEVEL}, 'Updated Outcome Impact Case at same level of maturity'), (${TagEnum.UPDATED_OUTCOME_IMPACT_CASE_NEW_LEVEL}, 'Updated Outcome Impact Case at new level of maturity');`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_initiatives\` DROP FOREIGN KEY \`FK_ec2e5e1a2bee45a2bdb804d905e\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_initiatives\` DROP FOREIGN KEY \`FK_c9e9e5e149c16a44d186942aa40\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_tags\` DROP FOREIGN KEY \`FK_9cb8ca62f545000e4ef67d0ccc0\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_tags\` DROP FOREIGN KEY \`FK_f6520a6cc644909c5e25197c8ca\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results\` DROP COLUMN \`comment_geo_scope\``,
    );
    await queryRunner.query(`DROP TABLE \`result_initiatives\``);
    await queryRunner.query(`DROP TABLE \`clarisa_initiatives\``);
    await queryRunner.query(`DROP TABLE \`result_tags\``);
    await queryRunner.query(`DROP TABLE \`tags\``);
  }
}
