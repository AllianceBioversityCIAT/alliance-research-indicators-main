import { MigrationInterface, QueryRunner } from 'typeorm';
import { UserRolesEnum } from '../../domain/entities/user-roles/enum/user-roles.enum';

export class InsertTrainingSupervisor1727896579961
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `INSERT INTO user_roles (user_role_id, name) VALUES (${UserRolesEnum.TRAINING_SUPERVISOR}, 'Training supervisor')`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM user_roles WHERE user_role_id = ${UserRolesEnum.TRAINING_SUPERVISOR}`,
    );
  }
}
