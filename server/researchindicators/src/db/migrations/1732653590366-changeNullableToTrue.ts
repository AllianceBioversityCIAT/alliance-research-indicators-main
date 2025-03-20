import { MigrationInterface, QueryRunner } from 'typeorm';

export class ChangeNullableToTrue1732653590366 implements MigrationInterface {
  name = 'ChangeNullableToTrue1732653590366';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_policy_change\` DROP FOREIGN KEY \`FK_be917b2af3281b0ebb6593926fd\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_policy_change\` DROP FOREIGN KEY \`FK_ff3673c8a9eaee0730b1f995476\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_policy_change\` CHANGE \`policy_type_id\` \`policy_type_id\` bigint NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_policy_change\` CHANGE \`policy_stage_id\` \`policy_stage_id\` bigint NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_policy_change\` CHANGE \`evidence_stage\` \`evidence_stage\` text NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_policy_change\` ADD CONSTRAINT \`FK_be917b2af3281b0ebb6593926fd\` FOREIGN KEY (\`policy_type_id\`) REFERENCES \`policy_types\`(\`policy_type_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_policy_change\` ADD CONSTRAINT \`FK_ff3673c8a9eaee0730b1f995476\` FOREIGN KEY (\`policy_stage_id\`) REFERENCES \`policy_stage\`(\`policy_stage_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_policy_change\` DROP FOREIGN KEY \`FK_ff3673c8a9eaee0730b1f995476\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_policy_change\` DROP FOREIGN KEY \`FK_be917b2af3281b0ebb6593926fd\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_policy_change\` CHANGE \`evidence_stage\` \`evidence_stage\` text NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_policy_change\` CHANGE \`policy_stage_id\` \`policy_stage_id\` bigint NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_policy_change\` CHANGE \`policy_type_id\` \`policy_type_id\` bigint NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_policy_change\` ADD CONSTRAINT \`FK_ff3673c8a9eaee0730b1f995476\` FOREIGN KEY (\`policy_stage_id\`) REFERENCES \`policy_stage\`(\`policy_stage_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_policy_change\` ADD CONSTRAINT \`FK_be917b2af3281b0ebb6593926fd\` FOREIGN KEY (\`policy_type_id\`) REFERENCES \`policy_types\`(\`policy_type_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }
}
