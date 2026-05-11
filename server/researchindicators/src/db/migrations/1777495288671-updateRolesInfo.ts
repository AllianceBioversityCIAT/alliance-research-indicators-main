import { MigrationInterface, QueryRunner } from 'typeorm';
import { SecRolesEnum } from '../../domain/shared/enum/sec_role.enum';

export class UpdateRolesInfo1777495288671 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE sec_roles SET name = 'System Admin', description = 'Role for users with overall responsibility for STAR configuration, administration, and platform oversight.' WHERE sec_role_id = ${SecRolesEnum.SYSTEM_ADMIN}`,
    );
    await queryRunner.query(
      `UPDATE sec_roles SET description = 'Role for standard users who perform regular day-to-day activities within STAR.' WHERE sec_role_id = ${SecRolesEnum.CONTRIBUTOR}`,
    );
    await queryRunner.query(
      `UPDATE sec_roles SET name = 'Technical Support', description = 'Internal role focused on technical tasks such as troubleshooting, support, and controlled technical review within STAR.' WHERE sec_role_id = ${SecRolesEnum.TECHNICAL_SUPPORT}`,
    );
    await queryRunner.query(
      `UPDATE sec_roles SET name = 'Center Admin', description = 'Role for users who manage operational processes and key administrative activities within STAR.' WHERE sec_role_id = ${SecRolesEnum.CENTER_ADMIN}`,
    );
    await queryRunner.query(
      `UPDATE sec_roles SET name = 'Mel Regional Expert', description = 'Role for MEL users who support regional processes and provide specialized functional input within STAR.' WHERE sec_role_id = ${SecRolesEnum.MEL_REGIONAL_EXPERT}`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE sec_roles SET name = 'Super admin', description = '' WHERE sec_role_id = ${SecRolesEnum.SYSTEM_ADMIN}`,
    );
    await queryRunner.query(
      `UPDATE sec_roles SET description = '' WHERE sec_role_id = ${SecRolesEnum.CONTRIBUTOR}`,
    );
    await queryRunner.query(
      `UPDATE sec_roles SET name = 'Developer', description = '' WHERE sec_role_id = ${SecRolesEnum.TECHNICAL_SUPPORT}`,
    );
    await queryRunner.query(
      `UPDATE sec_roles SET name = 'General Admin', description = '' WHERE sec_role_id = ${SecRolesEnum.CENTER_ADMIN}`,
    );
    await queryRunner.query(
      `UPDATE sec_roles SET name = 'Center Admin', description = '' WHERE sec_role_id = ${SecRolesEnum.MEL_REGIONAL_EXPERT}`,
    );
  }
}
