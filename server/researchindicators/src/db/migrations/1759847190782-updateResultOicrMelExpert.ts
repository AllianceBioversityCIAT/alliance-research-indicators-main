import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateResultOicrMelExpert1759847190782
  implements MigrationInterface
{
  name = 'UpdateResultOicrMelExpert1759847190782';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_oicrs\` ADD \`mel_regional_expert\` varchar(10) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_oicrs\` ADD \`sharepoint_link\` text NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_oicrs\` ADD \`mel_staff_group_id\` bigint NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_oicrs\` ADD CONSTRAINT \`FK_e25b1a65bd80f2f692aa6044dc9\` FOREIGN KEY (\`mel_regional_expert\`, \`mel_staff_group_id\`) REFERENCES \`alliance_user_staff_groups\`(\`carnet\`,\`staff_group_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_oicrs\` DROP FOREIGN KEY \`FK_e25b1a65bd80f2f692aa6044dc9\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_oicrs\` DROP COLUMN \`mel_staff_group_id\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_oicrs\` DROP COLUMN \`sharepoint_link\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_oicrs\` DROP COLUMN \`mel_regional_expert\``,
    );
  }
}
