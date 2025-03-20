import { MigrationInterface, QueryRunner } from 'typeorm';

export class SetNullEmailUserStaff1733949713725 implements MigrationInterface {
  name = 'SetNullEmailUserStaff1733949713725';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`alliance_user_staff\` CHANGE \`email\` \`email\` text NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`alliance_user_staff\` CHANGE \`email\` \`email\` text NOT NULL`,
    );
  }
}
