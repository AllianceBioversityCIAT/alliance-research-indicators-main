import { MigrationInterface, QueryRunner } from 'typeorm';
import { LinkResultRolesEnum } from '../../domain/entities/link-result-roles/enum/link-result-roles.enum';

export class InsertExternalLinkColumn1763587336968
  implements MigrationInterface
{
  name = 'InsertExternalLinkColumn1763587336968';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`results\` ADD \`external_link\` text NULL`,
    );
    await queryRunner.query(
      `INSERT INTO  link_result_roles (link_result_role_id, name) VALUES (${LinkResultRolesEnum.LINK_RESULT_SECTION}, 'Link Result Section')`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`results\` DROP COLUMN \`external_link\``,
    );
    await queryRunner.query(
      `DELETE FROM link_result_roles WHERE link_result_role_id = ${LinkResultRolesEnum.LINK_RESULT_SECTION}`,
    );
  }
}
