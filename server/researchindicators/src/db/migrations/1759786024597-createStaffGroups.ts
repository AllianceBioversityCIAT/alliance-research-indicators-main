import { MigrationInterface, QueryRunner } from 'typeorm';
import { StaffGroupsEnum } from '../../domain/entities/staff-groups/enum/staff-groups.enum';

export class CreateStaffGroups1759786024597 implements MigrationInterface {
  name = 'CreateStaffGroups1759786024597';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`staff_groups\` (\`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`created_by\` bigint NULL, \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`updated_by\` bigint NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, \`deleted_at\` timestamp NULL, \`id\` bigint NOT NULL AUTO_INCREMENT, \`name\` text NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`alliance_user_staff_groups\` (\`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`created_by\` bigint NULL, \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`updated_by\` bigint NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, \`deleted_at\` timestamp NULL, \`carnet\` varchar(10) NOT NULL, \`staff_group_id\` bigint NOT NULL, UNIQUE INDEX \`idx_ausg_carnet\` (\`carnet\`, \`staff_group_id\`), PRIMARY KEY (\`carnet\`, \`staff_group_id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`alliance_user_staff_groups\` ADD CONSTRAINT \`FK_62152ab2557527df23460c0fa78\` FOREIGN KEY (\`carnet\`) REFERENCES \`alliance_user_staff\`(\`carnet\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`alliance_user_staff_groups\` ADD CONSTRAINT \`FK_fdb43d1536f520c1005dc90427d\` FOREIGN KEY (\`staff_group_id\`) REFERENCES \`staff_groups\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `INSERT INTO \`staff_groups\` (name, id) VALUES ('MEL Regional Expert', ${StaffGroupsEnum.MEL_REGIONAL_EXPERT})`,
    );
    await queryRunner.query(
      `INSERT INTO \`alliance_user_staff_groups\` (carnet, staff_group_id) VALUES ('15570', ${StaffGroupsEnum.MEL_REGIONAL_EXPERT}), ('14440', ${StaffGroupsEnum.MEL_REGIONAL_EXPERT}), ('14331', ${StaffGroupsEnum.MEL_REGIONAL_EXPERT}), ('14871', ${StaffGroupsEnum.MEL_REGIONAL_EXPERT}),('15030', ${StaffGroupsEnum.MEL_REGIONAL_EXPERT})`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`alliance_user_staff_groups\` DROP FOREIGN KEY \`FK_fdb43d1536f520c1005dc90427d\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`alliance_user_staff_groups\` DROP FOREIGN KEY \`FK_62152ab2557527df23460c0fa78\``,
    );
    await queryRunner.query(
      `DROP INDEX \`idx_ausg_carnet\` ON \`alliance_user_staff_groups\``,
    );
    await queryRunner.query(`DROP TABLE \`alliance_user_staff_groups\``);
    await queryRunner.query(`DROP TABLE \`staff_groups\``);
  }
}
