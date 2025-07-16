import { MigrationInterface, QueryRunner } from 'typeorm';
import { LinkResultRolesEnum } from '../../domain/entities/link-result-roles/enum/link-result-roles.enum';
import { DisseminationQualificationsEnum } from '../../domain/entities/dissemination-qualifications/enum/dissemination-qualifications.enum';
import { ToolFunctionEnum } from '../../domain/entities/tool-functions/enum/tool-functions.enum';

export class AddNewFieldsInnovationDev1752542014680
  implements MigrationInterface
{
  name = 'AddNewFieldsInnovationDev1752542014680';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`dissemination_qualifications\` (\`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`created_by\` bigint NULL, \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`updated_by\` bigint NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, \`deleted_at\` timestamp NULL, \`id\` bigint NOT NULL AUTO_INCREMENT, \`name\` text NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`tool_functions\` (\`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`created_by\` bigint NULL, \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`updated_by\` bigint NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, \`deleted_at\` timestamp NULL, \`id\` bigint NOT NULL AUTO_INCREMENT, \`name\` text NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_innovation_dev\` ADD \`is_knowledge_sharing\` tinyint NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_innovation_dev\` ADD \`dissemination_qualification_id\` bigint NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_innovation_dev\` ADD \`tool_useful_context\` text NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_innovation_dev\` ADD \`results_achieved_expected\` text NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_innovation_dev\` ADD \`tool_function_id\` bigint NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_innovation_dev\` ADD \`is_used_beyond_original_context\` tinyint NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_innovation_dev\` ADD \`adoption_adaptation_context\` text NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_innovation_dev\` ADD \`other_tools\` text NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_innovation_dev\` ADD \`other_tools_integration\` text NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_innovation_dev\` ADD CONSTRAINT \`FK_93780864fa742dc0d5bef294fd9\` FOREIGN KEY (\`dissemination_qualification_id\`) REFERENCES \`dissemination_qualifications\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_innovation_dev\` ADD CONSTRAINT \`FK_603ec7aff1ca62ab289f8fb7c27\` FOREIGN KEY (\`tool_function_id\`) REFERENCES \`tool_functions\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(`INSERT INTO tool_functions (id, name) VALUES
                                    (${ToolFunctionEnum.DECISION_MAKING_SUPPORT}, 'Decision-making support'),
                                    (${ToolFunctionEnum.MODELING_VISIONING}, 'Modeling, visioning'),
                                    (${ToolFunctionEnum.MONITORING_DATA_COLLECTION}, 'Monitoring, data collection'),
                                    (${ToolFunctionEnum.OUTREACH_INTERACTION_INFLUENCE}, 'Outreach, interaction, influence'),
                                    (${ToolFunctionEnum.TEACHING_TRAINING_TOOLKITS}, 'Teaching, training, toolkits'),
                                    (${ToolFunctionEnum.UNDERSTANDING_ASSESSING}, 'Understanding, assessing');`);
    await queryRunner.query(`INSERT INTO \`dissemination_qualifications\` (id, name) VALUES
                                    (${DisseminationQualificationsEnum.OPT_OUT}, 'Opt out'),
                                    (${DisseminationQualificationsEnum.PROCEED}, 'Proceed');`);
    await queryRunner.query(`
            INSERT INTO \`link_result_roles\` (link_result_role_id, name) VALUES
            (${LinkResultRolesEnum.INNOVATION_DEV}, 'Innovation Dev')
            `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_innovation_dev\` DROP FOREIGN KEY \`FK_603ec7aff1ca62ab289f8fb7c27\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_innovation_dev\` DROP FOREIGN KEY \`FK_93780864fa742dc0d5bef294fd9\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_innovation_dev\` DROP COLUMN \`other_tools_integration\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_innovation_dev\` DROP COLUMN \`other_tools\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_innovation_dev\` DROP COLUMN \`adoption_adaptation_context\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_innovation_dev\` DROP COLUMN \`is_used_beyond_original_context\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_innovation_dev\` DROP COLUMN \`tool_function_id\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_innovation_dev\` DROP COLUMN \`results_achieved_expected\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_innovation_dev\` DROP COLUMN \`tool_useful_context\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_innovation_dev\` DROP COLUMN \`dissemination_qualification_id\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_innovation_dev\` DROP COLUMN \`is_knowledge_sharing\``,
    );
    await queryRunner.query(`DROP TABLE \`tool_functions\``);
    await queryRunner.query(`DROP TABLE \`dissemination_qualifications\``);
    await queryRunner.query(
      `DELETE FROM \`link_result_roles\` WHERE \`link_result_role_id\` = ${LinkResultRolesEnum.INNOVATION_DEV}`,
    );
  }
}
