import { MigrationInterface, QueryRunner } from 'typeorm';

export class InsertInstitutionRoles1727885628018 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `INSERT INTO institution_roles (institution_role_id, name) VALUES (1, 'Trainee affiliation'), (2, 'Trainee organization representative'), (3, 'Partners')`,
    );
    await queryRunner.query(
      `INSERT INTO country_roles (country_role_id, name) VALUES (1, 'Trainee nationality')`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM institution_roles WHERE institution_role_id in (1, 2, 3)`,
    );
    await queryRunner.query(
      `DELETE FROM country_roles WHERE country_role_id = 1`,
    );
  }
}
