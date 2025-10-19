import { MigrationInterface, QueryRunner } from 'typeorm';
import { ImpactAreaScoreEnum } from '../../domain/entities/impact-area-score/enum/impact-area-score.enum';

export class CreateImpactArea1760834339667 implements MigrationInterface {
  name = 'CreateImpactArea1760834339667';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`clarisa_impact_areas\` (\`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`created_by\` bigint NULL, \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`updated_by\` bigint NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, \`deleted_at\` timestamp NULL, \`id\` bigint NOT NULL, \`name\` text NULL, \`description\` text NULL, \`financial_code\` text NULL, \`icon\` text NULL, \`color\` text NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`impact_area_scores\` (\`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`created_by\` bigint NULL, \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`updated_by\` bigint NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, \`deleted_at\` timestamp NULL, \`id\` bigint NOT NULL AUTO_INCREMENT, \`name\` text NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`result_impact_areas\` (\`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`created_by\` bigint NULL, \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`updated_by\` bigint NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, \`deleted_at\` timestamp NULL, \`id\` bigint NOT NULL AUTO_INCREMENT, \`result_id\` bigint NOT NULL, \`impact_area_id\` bigint NOT NULL, \`impact_area_score_id\` bigint NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_oicrs\` ADD \`for_external_use\` tinyint NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_oicrs\` ADD \`for_external_use_description\` text NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_impact_areas\` ADD CONSTRAINT \`FK_883426cfeb5571155fece6bde8f\` FOREIGN KEY (\`result_id\`) REFERENCES \`results\`(\`result_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_impact_areas\` ADD CONSTRAINT \`FK_8df22f18fa8f8ea87bd2cccef9a\` FOREIGN KEY (\`impact_area_id\`) REFERENCES \`clarisa_impact_areas\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_impact_areas\` ADD CONSTRAINT \`FK_d888a098be6ed482b954dab418d\` FOREIGN KEY (\`impact_area_score_id\`) REFERENCES \`impact_area_scores\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `INSERT INTO \`impact_area_scores\` (id, name) VALUES (${ImpactAreaScoreEnum.NOT_TARGETED}, 'Not Targeted'), (${ImpactAreaScoreEnum.SIGNIFICANT}, 'Significant'), (${ImpactAreaScoreEnum.PRINCIPAL}, 'Principal')`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_impact_areas\` DROP FOREIGN KEY \`FK_d888a098be6ed482b954dab418d\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_impact_areas\` DROP FOREIGN KEY \`FK_8df22f18fa8f8ea87bd2cccef9a\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_impact_areas\` DROP FOREIGN KEY \`FK_883426cfeb5571155fece6bde8f\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_oicrs\` DROP COLUMN \`for_external_use_description\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_oicrs\` DROP COLUMN \`for_external_use\``,
    );
    await queryRunner.query(`DROP TABLE \`result_impact_areas\``);
    await queryRunner.query(`DROP TABLE \`impact_area_scores\``);
    await queryRunner.query(`DROP TABLE \`clarisa_impact_areas\``);
  }
}
