import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatedAllianceUserStaff1731616750326
  implements MigrationInterface
{
  name = 'CreatedAllianceUserStaff1731616750326';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`alliance_user_staff\` (\`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`created_by\` bigint NULL, \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`updated_by\` bigint NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, \`carnet\` varchar(10) NOT NULL, \`first_name\` text NOT NULL, \`last_name\` text NOT NULL, \`email\` text NOT NULL, PRIMARY KEY (\`carnet\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_users\` DROP COLUMN \`user_id\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_users\` ADD \`user_id\` varchar(10) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_users\` ADD CONSTRAINT \`FK_38df5e77e4ba64b978844dbf134\` FOREIGN KEY (\`user_id\`) REFERENCES \`alliance_user_staff\`(\`carnet\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_users\` DROP FOREIGN KEY \`FK_38df5e77e4ba64b978844dbf134\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_users\` DROP COLUMN \`user_id\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_users\` ADD \`user_id\` bigint NOT NULL`,
    );
    await queryRunner.query(`DROP TABLE \`alliance_user_staff\``);
  }
}
