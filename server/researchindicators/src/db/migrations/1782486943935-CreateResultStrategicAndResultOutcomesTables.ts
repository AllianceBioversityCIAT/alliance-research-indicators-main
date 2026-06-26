import { MigrationInterface, QueryRunner } from "typeorm";
import { ResultStrategicObjectiveRolesEnum as StrategicObjectiveRoles } from "../../domain/entities/result-strategic-objectives/enum/result-strategic-objective-roles.enum";
import { ResultImpactOutcomeRolesEnum as ImpactOutcomeRoles } from "../../domain/entities/result-impact-outcomes/enum/result-impact-outcome-roles.enum";

export class CreateResultStrategicAndResultOutcomesTables1782486943935 implements MigrationInterface {
    name = 'CreateResultStrategicAndResultOutcomesTables1782486943935'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`result_strategic_objective_roles\` (\`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`created_by\` bigint NULL, \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`updated_by\` bigint NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, \`deleted_at\` timestamp NULL, \`id\` bigint NOT NULL AUTO_INCREMENT, \`name\` text NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`result_strategic_objectives\` (\`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`created_by\` bigint NULL, \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`updated_by\` bigint NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, \`deleted_at\` timestamp NULL, \`id\` bigint NOT NULL AUTO_INCREMENT, \`result_id\` bigint NOT NULL, \`strategic_objective_id\` bigint NOT NULL, \`roles_id\` bigint NOT NULL, \`role_id\` bigint NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`result_impact_outcome_roles\` (\`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`created_by\` bigint NULL, \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`updated_by\` bigint NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, \`deleted_at\` timestamp NULL, \`id\` bigint NOT NULL AUTO_INCREMENT, \`name\` text NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`result_impact_outcomes\` (\`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`created_by\` bigint NULL, \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`updated_by\` bigint NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, \`deleted_at\` timestamp NULL, \`id\` bigint NOT NULL AUTO_INCREMENT, \`result_id\` bigint NOT NULL, \`impact_outcome_id\` bigint NOT NULL, \`roles_id\` bigint NOT NULL, \`role_id\` bigint NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`result_strategic_objectives\` ADD CONSTRAINT \`FK_f533df2b0cbca7d2d9cdc8d4308\` FOREIGN KEY (\`result_id\`) REFERENCES \`results\`(\`result_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`result_strategic_objectives\` ADD CONSTRAINT \`FK_02f95e3c5be0ca75ab8b8673042\` FOREIGN KEY (\`strategic_objective_id\`) REFERENCES \`strategic_objectives\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`result_strategic_objectives\` ADD CONSTRAINT \`FK_cb8579b47b3f7bc605663ca53b0\` FOREIGN KEY (\`role_id\`) REFERENCES \`result_strategic_objective_roles\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`result_impact_outcomes\` ADD CONSTRAINT \`FK_f1a19f2f5d9556dee00b4c54d31\` FOREIGN KEY (\`result_id\`) REFERENCES \`results\`(\`result_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`result_impact_outcomes\` ADD CONSTRAINT \`FK_5ea6958c29fe8a4cd313ecc56b6\` FOREIGN KEY (\`impact_outcome_id\`) REFERENCES \`impact_outcomes\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`result_impact_outcomes\` ADD CONSTRAINT \`FK_369474fc117023890a2d72840b3\` FOREIGN KEY (\`role_id\`) REFERENCES \`result_impact_outcome_roles\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);

        await queryRunner.query(`INSERT INTO \`result_strategic_objective_roles\` (\`id\`, \`name\`) VALUES (${StrategicObjectiveRoles.ALIGNMENT}, 'Alignment')`);
        await queryRunner.query(`INSERT INTO \`result_impact_outcome_roles\` (\`id\`, \`name\`) VALUES (${ImpactOutcomeRoles.ALIGNMENT}, 'Alignment')`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result_impact_outcomes\` DROP FOREIGN KEY \`FK_369474fc117023890a2d72840b3\``);
        await queryRunner.query(`ALTER TABLE \`result_impact_outcomes\` DROP FOREIGN KEY \`FK_5ea6958c29fe8a4cd313ecc56b6\``);
        await queryRunner.query(`ALTER TABLE \`result_impact_outcomes\` DROP FOREIGN KEY \`FK_f1a19f2f5d9556dee00b4c54d31\``);
        await queryRunner.query(`ALTER TABLE \`result_strategic_objectives\` DROP FOREIGN KEY \`FK_cb8579b47b3f7bc605663ca53b0\``);
        await queryRunner.query(`ALTER TABLE \`result_strategic_objectives\` DROP FOREIGN KEY \`FK_02f95e3c5be0ca75ab8b8673042\``);
        await queryRunner.query(`ALTER TABLE \`result_strategic_objectives\` DROP FOREIGN KEY \`FK_f533df2b0cbca7d2d9cdc8d4308\``);
        await queryRunner.query(`DROP TABLE \`result_impact_outcomes\``);
        await queryRunner.query(`DROP TABLE \`result_impact_outcome_roles\``);
        await queryRunner.query(`DROP TABLE \`result_strategic_objectives\``);
        await queryRunner.query(`DROP TABLE \`result_strategic_objective_roles\``);
    }

}
