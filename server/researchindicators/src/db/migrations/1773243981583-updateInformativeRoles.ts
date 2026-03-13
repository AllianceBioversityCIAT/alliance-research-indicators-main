import { MigrationInterface, QueryRunner } from 'typeorm';
import { InformativeRolesEnum } from '../../domain/entities/informative-roles/enum/informative-roles.enum';

export class UpdateInformativeRoles1773243981583 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE \`informative_roles\` SET \`name\` = 'Author and Contact Person' WHERE \`id\` = ${InformativeRolesEnum.BOTH}`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE \`informative_roles\` SET \`name\` = 'Both' WHERE \`id\` = ${InformativeRolesEnum.BOTH}`,
    );
  }
}
