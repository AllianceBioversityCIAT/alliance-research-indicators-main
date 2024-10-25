import { MigrationInterface, QueryRunner } from 'typeorm';

export class InsertSecodaryRoleContractLevers1729694944900
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE contract_roles SET name = 'Alignment' WHERE contract_role_id = 1`,
    );
    await queryRunner.query(
      `UPDATE lever_roles SET name = 'Alignment' WHERE lever_role_id = 1`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE contract_roles SET name = 'Primary' WHERE contract_role_id = 1`,
    );
    await queryRunner.query(
      `UPDATE lever_roles SET name = 'Primary' WHERE lever_role_id = 1`,
    );
  }
}
