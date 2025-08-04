import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUpdateUserId1753825641651 implements MigrationInterface {
  name = 'AddUpdateUserId1753825641651';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`app_secrets\` DROP FOREIGN KEY \`FK_a4c067fc219c5207d1bd095c302\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`app_secrets\` CHANGE \`responsible_user_code\` \`responsible_user_id\` varchar(10) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`app_secrets\` DROP COLUMN \`responsible_user_id\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`app_secrets\` ADD \`responsible_user_id\` bigint NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`app_secrets\` DROP COLUMN \`responsible_user_id\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`app_secrets\` ADD \`responsible_user_id\` varchar(10) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`app_secrets\` CHANGE \`responsible_user_id\` \`responsible_user_code\` varchar(10) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`app_secrets\` ADD CONSTRAINT \`FK_a4c067fc219c5207d1bd095c302\` FOREIGN KEY (\`responsible_user_code\`) REFERENCES \`alliance_user_staff\`(\`carnet\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }
}
