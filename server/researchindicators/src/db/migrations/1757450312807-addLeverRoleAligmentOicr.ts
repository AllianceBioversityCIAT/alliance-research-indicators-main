import { MigrationInterface, QueryRunner } from 'typeorm';
import { LeverRolesEnum } from '../../domain/entities/lever-roles/enum/lever-roles.enum';

export class AddLeverRoleAligmentOicr1757450312807
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `INSERT INTO lever_roles (lever_role_id, name) VALUES (${LeverRolesEnum.OICR_ALIGNMENT}, 'OICR Alignment')`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM lever_roles WHERE lever_role_id = ${LeverRolesEnum.OICR_ALIGNMENT}`,
    );
  }
}
