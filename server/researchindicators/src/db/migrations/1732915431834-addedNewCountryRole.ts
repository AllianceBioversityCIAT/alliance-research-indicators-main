import { MigrationInterface, QueryRunner } from 'typeorm';
import { CountryRolesEnum } from '../../domain/entities/country-roles/enums/country-roles.anum';

export class AddedNewCountryRole1732915431834 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `INSERT INTO country_roles (country_role_id, name) VALUES (${CountryRolesEnum.GEO_lOCATION}, 'Geo Location')`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM country_roles WHERE country_role_id = ${CountryRolesEnum.GEO_lOCATION}`,
    );
  }
}
