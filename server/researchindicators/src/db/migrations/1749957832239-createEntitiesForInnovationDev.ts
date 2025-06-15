import { MigrationInterface, QueryRunner } from 'typeorm';
import { ActorRolesEnum } from '../../domain/entities/actor-roles/enum/actor-roles.enum';
import { InstitutionTypeRoleEnum } from '../../domain/entities/institution-type-roles/enum/institution-type-role.enum';

export class CreateEntitiesForInnovationDev1749957832239
  implements MigrationInterface
{
  name = 'CreateEntitiesForInnovationDev1749957832239';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`result_institution_types\` (\`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`created_by\` bigint NULL, \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`updated_by\` bigint NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, \`deleted_at\` timestamp NULL, \`result_institution_type_id\` bigint NOT NULL AUTO_INCREMENT, \`result_id\` bigint NOT NULL, \`institution_type_id\` bigint NOT NULL, \`institution_type_role_id\` bigint NOT NULL, PRIMARY KEY (\`result_institution_type_id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`clarisa_actor_types\` (\`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`created_by\` bigint NULL, \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`updated_by\` bigint NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, \`deleted_at\` timestamp NULL, \`code\` bigint NOT NULL, \`name\` text NOT NULL, PRIMARY KEY (\`code\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`result_actors\` (\`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`created_by\` bigint NULL, \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`updated_by\` bigint NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, \`deleted_at\` timestamp NULL, \`result_actors_id\` bigint NOT NULL AUTO_INCREMENT, \`result_id\` bigint NOT NULL, \`actor_type_id\` bigint NOT NULL, \`sex_age_disaggregation_not_apply\` tinyint NULL, \`women_youth\` tinyint NULL, \`women_not_youth\` tinyint NULL, \`men_youth\` tinyint NULL, \`men_not_youth\` tinyint NULL, \`actor_role_id\` bigint NOT NULL, PRIMARY KEY (\`result_actors_id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`institution_type_roles\` (\`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`created_by\` bigint NULL, \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`updated_by\` bigint NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, \`deleted_at\` timestamp NULL, \`institution_type_role_id\` bigint NOT NULL AUTO_INCREMENT, \`name\` text NOT NULL, PRIMARY KEY (\`institution_type_role_id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`actor_roles\` (\`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`created_by\` bigint NULL, \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`updated_by\` bigint NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, \`deleted_at\` timestamp NULL, \`actor_role_id\` bigint NOT NULL AUTO_INCREMENT, \`name\` text NOT NULL, PRIMARY KEY (\`actor_role_id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_innovation_dev\` ADD \`expected_outcome\` text NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_innovation_dev\` ADD \`intended_beneficiaries_description\` text NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_institution_types\` ADD CONSTRAINT \`FK_b13f998dc106255fee9782355e2\` FOREIGN KEY (\`result_id\`) REFERENCES \`results\`(\`result_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_institution_types\` ADD CONSTRAINT \`FK_145b6af1c77c6efcd902ef9535d\` FOREIGN KEY (\`institution_type_id\`) REFERENCES \`clarisa_institution_types\`(\`code\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_actors\` ADD CONSTRAINT \`FK_ddf5180b215755556b02fc3dc21\` FOREIGN KEY (\`result_id\`) REFERENCES \`results\`(\`result_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_actors\` ADD CONSTRAINT \`FK_ac038801c4c7a2d25d9b95f6bd8\` FOREIGN KEY (\`actor_type_id\`) REFERENCES \`clarisa_actor_types\`(\`code\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `INSERT INTO \`actor_roles\` (\`name\`, \`actor_role_id\`) VALUES ('innovation-development', ${ActorRolesEnum.INNOVATION_DEV})`,
    );
    await queryRunner.query(
      `INSERT INTO \`institution_type_roles\` (\`name\`, \`institution_type_role_id\`) VALUES ('innovation-development', ${InstitutionTypeRoleEnum.INNOVATION_DEV})`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_actors\` DROP FOREIGN KEY \`FK_ac038801c4c7a2d25d9b95f6bd8\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_actors\` DROP FOREIGN KEY \`FK_ddf5180b215755556b02fc3dc21\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_institution_types\` DROP FOREIGN KEY \`FK_145b6af1c77c6efcd902ef9535d\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_institution_types\` DROP FOREIGN KEY \`FK_b13f998dc106255fee9782355e2\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_innovation_dev\` DROP COLUMN \`intended_beneficiaries_description\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_innovation_dev\` DROP COLUMN \`expected_outcome\``,
    );
    await queryRunner.query(`DROP TABLE \`actor_roles\``);
    await queryRunner.query(`DROP TABLE \`institution_type_roles\``);
    await queryRunner.query(`DROP TABLE \`result_actors\``);
    await queryRunner.query(`DROP TABLE \`clarisa_actor_types\``);
    await queryRunner.query(`DROP TABLE \`result_institution_types\``);
  }
}
