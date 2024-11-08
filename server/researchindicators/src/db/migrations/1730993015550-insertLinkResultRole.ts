import { MigrationInterface, QueryRunner } from 'typeorm';
import { LinkResultRolesEnum } from '../../domain/entities/link-result-roles/enum/link-result-roles.enum';

export class InsertLinkResultRole1730993015550 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `INSERT INTO link_result_roles (link_result_role_id, name) VALUES (${LinkResultRolesEnum.POLICY_CHANGE}, 'Policy Change')`,
    );
    await queryRunner.query(
      `INSERT INTO policy_types (name) VALUES ('Policy or Strategy'), ('Legal instrument'), ('Program, Budget, or Investment')`,
    );
    await queryRunner.query(
      `INSERT INTO policy_stage (name, description) VALUES ('Stage 1', 'Research taken up by next user, policy change not yet enacted.'), ('Stage 2', 'Policy enacted.'), ('Stage 3', 'Evidence of impact of policy.')`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM link_result_roles WHERE link_result_role_id = ${LinkResultRolesEnum.POLICY_CHANGE}`,
    );
    await queryRunner.query(
      `DELETE FROM policy_types WHERE name IN ('Policy or Strategy', 'Legal instrument', 'Program, Budget, or Investment')`,
    );
    await queryRunner.query(
      `DELETE FROM policy_stage WHERE name IN ('Stage 1', 'Stage 2', 'Stage 3')`,
    );
  }
}
