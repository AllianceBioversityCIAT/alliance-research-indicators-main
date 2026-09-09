import { MigrationInterface, QueryRunner } from 'typeorm';
import { LinkResultRolesEnum } from '../../domain/entities/link-result-roles/enum/link-result-roles.enum';

/**
 * Migration A of docs/specs/innovation-use/link-innovation-dev (T-01,
 * R-IUL-010, R-IUL-011).
 *
 * Seeds the `link_result_roles` catalog row for the new role
 * `LinkResultRolesEnum.INNOVATION_USE_LINKED_DEV = 5`, used by the
 * Innovation Use → Innovation Dev link (`link_results.link_result_role_id`).
 *
 * MUST be applied before Migration B (which rewrites
 * `innovation_use_validation` to require an active role-5 link) and before
 * the server code that writes role 5 is reachable in an environment
 * (R-IUL-011) — otherwise saving the section violates the
 * `link_results.link_result_role_id` FK
 * (`1730900555793-addedPolicyChangeDataModel.ts:40`).
 *
 * `down()` deletes ONLY the seeded row — see design.md §11.2: the FK above
 * blocks deleting this row while any `link_results` row (active or not)
 * references it, so reverting this migration on a shared DB with existing
 * role-5 links is a destructive, human-only decision, never automated here.
 */
export class InsertInnovationUseLinkedDevRole1789000000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `INSERT INTO link_result_roles (link_result_role_id, name) VALUES (${LinkResultRolesEnum.INNOVATION_USE_LINKED_DEV}, 'Innovation Use Linked Dev')`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM link_result_roles WHERE link_result_role_id = ${LinkResultRolesEnum.INNOVATION_USE_LINKED_DEV}`,
    );
  }
}
