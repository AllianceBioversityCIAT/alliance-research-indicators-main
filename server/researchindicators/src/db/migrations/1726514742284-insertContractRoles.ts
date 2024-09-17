import { MigrationInterface, QueryRunner } from 'typeorm';

export class InsertContractRoles1726514742284 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `INSERT INTO contract_roles (contract_role_id, name) VALUES (1, 'Primary')`,
    );
    await queryRunner.query(
      `INSERT INTO lever_roles (lever_role_id, name) VALUES (1, 'Primary')`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM contract_roles WHERE contract_role_id = 1`,
    );
    await queryRunner.query(`DELETE FROM lever_roles WHERE lever_role_id = 1`);
  }
}
