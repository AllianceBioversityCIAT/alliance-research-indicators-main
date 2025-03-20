import { MigrationInterface, QueryRunner } from 'typeorm';

export class InsertUserRoles1727731828208 implements MigrationInterface {
  name = 'InsertUserRoles1727731828208';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_users\` DROP FOREIGN KEY \`FK_a8c22201e59c45cc7f55975e7dd\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_users\` CHANGE \`role_id\` \`user_role_id\` bigint NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_users\` ADD CONSTRAINT \`FK_250fbc1acb9b1bd5129e8e1f53f\` FOREIGN KEY (\`user_role_id\`) REFERENCES \`user_roles\`(\`user_role_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `INSERT INTO user_roles (user_role_id, name) VALUES (1, 'Main contact')`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_users\` DROP FOREIGN KEY \`FK_250fbc1acb9b1bd5129e8e1f53f\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_users\` CHANGE \`user_role_id\` \`role_id\` bigint NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_users\` ADD CONSTRAINT \`FK_a8c22201e59c45cc7f55975e7dd\` FOREIGN KEY (\`role_id\`) REFERENCES \`user_roles\`(\`user_role_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(`DELETE FROM user_roles WHERE user_role_id IN (1)`);
  }
}
