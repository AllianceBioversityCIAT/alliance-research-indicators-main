import { MigrationInterface, QueryRunner } from 'typeorm';
import { ExpansionPotentialEnum } from '../../domain/entities/expansion-potentials/enum/expansion-potentials.enum';

export class AddNewFieldsInnovationDev1752622615605
  implements MigrationInterface
{
  name = 'AddNewFieldsInnovationDev1752622615605';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`expansion_potentials\` (\`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`created_by\` bigint NULL, \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`updated_by\` bigint NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, \`deleted_at\` timestamp NULL, \`id\` bigint NOT NULL AUTO_INCREMENT, \`name\` text NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_innovation_dev\` ADD \`is_cheaper_than_alternatives\` int NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_innovation_dev\` ADD \`is_simpler_to_use\` int NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_innovation_dev\` ADD \`does_perform_better\` int NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_innovation_dev\` ADD \`is_desirable_to_users\` int NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_innovation_dev\` ADD \`has_commercial_viability\` int NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_innovation_dev\` ADD \`has_suitable_enabling_environment\` int NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_innovation_dev\` ADD \`has_evidence_of_uptake\` int NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_innovation_dev\` ADD \`expansion_potential_id\` bigint NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_innovation_dev\` ADD \`expansion_adaptation_details\` text NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_innovation_dev\` ADD CONSTRAINT \`FK_1c12070e405e2fd877105e41b2b\` FOREIGN KEY (\`expansion_potential_id\`) REFERENCES \`expansion_potentials\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(`
        INSERT INTO \`expansion_potentials\` (id, name) VALUES
        (${ExpansionPotentialEnum.YES}, 'Yes'),
        (${ExpansionPotentialEnum.YES_WITH_ADAPTATIONS}, 'Yes, with adaptations'),
        (${ExpansionPotentialEnum.NO}, 'No')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_innovation_dev\` DROP FOREIGN KEY \`FK_1c12070e405e2fd877105e41b2b\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_innovation_dev\` DROP COLUMN \`expansion_adaptation_details\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_innovation_dev\` DROP COLUMN \`expansion_potential_id\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_innovation_dev\` DROP COLUMN \`has_evidence_of_uptake\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_innovation_dev\` DROP COLUMN \`has_suitable_enabling_environment\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_innovation_dev\` DROP COLUMN \`has_commercial_viability\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_innovation_dev\` DROP COLUMN \`is_desirable_to_users\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_innovation_dev\` DROP COLUMN \`does_perform_better\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_innovation_dev\` DROP COLUMN \`is_simpler_to_use\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_innovation_dev\` DROP COLUMN \`is_cheaper_than_alternatives\``,
    );
    await queryRunner.query(`DROP TABLE \`expansion_potentials\``);
  }
}
