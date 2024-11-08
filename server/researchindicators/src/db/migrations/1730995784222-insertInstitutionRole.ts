import { MigrationInterface, QueryRunner } from 'typeorm';
import { InstitutionRolesEnum } from '../../domain/entities/institution-roles/enums/institution-roles.enum';

export class InsertInstitutionRole1730995784222 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `INSERT INTO institution_roles (institution_role_id, name) VALUES (${InstitutionRolesEnum.POLICY_CHANGE}, 'Policy Change')`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM institution_roles WHERE institution_role_id = ${InstitutionRolesEnum.POLICY_CHANGE}`,
    );
  }
}
