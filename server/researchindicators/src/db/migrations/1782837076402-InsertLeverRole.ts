import { MigrationInterface, QueryRunner } from 'typeorm';
import { LeverRolesEnum } from '../../domain/entities/lever-roles/enum/lever-roles.enum';

export class InsertLeverRole1782837076402 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            INSERT INTO lever_roles (lever_role_id, name) VALUES (${LeverRolesEnum.RESEARCH_AREAS_ALIGNMENT}, 'Research Areas Alignment');
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            DELETE FROM lever_roles WHERE lever_role_id = ${LeverRolesEnum.RESEARCH_AREAS_ALIGNMENT};
        `);
  }
}
