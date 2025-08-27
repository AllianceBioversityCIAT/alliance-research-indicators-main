import { MigrationInterface, QueryRunner } from 'typeorm';

export class SetNullableGeneralComments1755809506780
  implements MigrationInterface
{
  name = 'SetNullableGeneralComments1755809506780';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_oicrs\` CHANGE \`general_comment\` \`general_comment\` text NULL COMMENT 'General comment on the result'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_oicrs\` CHANGE \`general_comment\` \`general_comment\` text NOT NULL COMMENT 'General comment on the result'`,
    );
  }
}
