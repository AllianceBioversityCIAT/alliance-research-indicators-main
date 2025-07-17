import { MigrationInterface, QueryRunner } from 'typeorm';
import { InnovationDevAnticipatedUsers } from '../../domain/entities/innovation-dev-anticipated-users/enum/innovation-dev-anticipated-users.enum';

export class CreateAnticipatedUser1749772701046 implements MigrationInterface {
  name = 'CreateAnticipatedUser1749772701046';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`innovation_dev_anticipated_users\` (\`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`created_by\` bigint NULL, \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`updated_by\` bigint NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, \`deleted_at\` timestamp NULL, \`id\` bigint NOT NULL AUTO_INCREMENT, \`name\` text NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_innovation_dev\` ADD \`anticipated_users_id\` bigint NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_innovation_dev\` ADD CONSTRAINT \`FK_dc8dbf9ddb348acc41d3271687c\` FOREIGN KEY (\`anticipated_users_id\`) REFERENCES \`innovation_dev_anticipated_users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `INSERT INTO \`innovation_dev_anticipated_users\` (\`name\`, \`id\`) VALUES ('This is yet to be determined', ${InnovationDevAnticipatedUsers.THIS_IS_YET_TO_BE_DETERMINED}), ('Users have been determined', ${InnovationDevAnticipatedUsers.USERS_HAVE_BEEN_DETERMINED})`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_innovation_dev\` DROP FOREIGN KEY \`FK_dc8dbf9ddb348acc41d3271687c\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_innovation_dev\` DROP COLUMN \`anticipated_users_id\``,
    );
    await queryRunner.query(`DROP TABLE \`innovation_dev_anticipated_users\``);
    await queryRunner.query(
      `DELETE FROM \`innovation_dev_anticipated_users\` WHERE \`id\` IN (${InnovationDevAnticipatedUsers.THIS_IS_YET_TO_BE_DETERMINED}, ${InnovationDevAnticipatedUsers.USERS_HAVE_BEEN_DETERMINED})`,
    );
  }
}
