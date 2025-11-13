import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateInformativeRole1763044324855 implements MigrationInterface {
  name = 'UpdateInformativeRole1763044324855';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`informative_roles\` DROP FOREIGN KEY \`FK_594898df849c11ad715a6253750\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`informative_roles\` DROP COLUMN \`resultUsersResultUserId\``,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`informative_roles\` ADD \`resultUsersResultUserId\` bigint NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`informative_roles\` ADD CONSTRAINT \`FK_594898df849c11ad715a6253750\` FOREIGN KEY (\`resultUsersResultUserId\`) REFERENCES \`result_users\`(\`result_user_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }
}
