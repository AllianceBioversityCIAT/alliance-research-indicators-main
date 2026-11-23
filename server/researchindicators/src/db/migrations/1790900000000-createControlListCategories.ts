import { MigrationInterface, QueryRunner } from 'typeorm';
import { seedControlListCategories } from '../seeds/control-lists.seed';

/**
 * Categories. Creates `control_list_categories` and seeds the 2 categories
 * of R-CTL-010 (docs/specs/changes/control-lists-global-scope, R-CLG-006,
 * D-CLG-1, D-CLG-2, D-CLG-11; archived design D-CTL-14).
 *
 * Rewritten in place (never merged or deployed): categories are global, so
 * the table carries no scope column, FK or scope index, and the category
 * name is unique across the whole module (`uq_control_list_categories_name`,
 * case-insensitive through the declared `utf8mb4_unicode_ci` collation).
 *
 * The seed SQL lives in `src/db/seeds/control-lists.seed.ts` (explicit ids 1
 * and 2, each guarded by `WHERE NOT EXISTS`, `AUTO_INCREMENT` reset above the
 * seeded ids). This file exports ONLY its migration class: the TypeORM
 * loader treats every exported function in `migrations/**` as a migration.
 */
export class CreateControlListCategories1790900000000
  implements MigrationInterface
{
  name = 'CreateControlListCategories1790900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`control_list_categories\` (
        \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`created_by\` bigint NULL,
        \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`updated_by\` bigint NULL,
        \`is_active\` tinyint NOT NULL DEFAULT 1,
        \`deleted_at\` timestamp NULL,
        \`id\` bigint NOT NULL AUTO_INCREMENT,
        \`name\` varchar(150) NOT NULL,
        \`description\` varchar(500) NULL,
        \`display_order\` int NOT NULL DEFAULT 0,
        PRIMARY KEY (\`id\`),
        UNIQUE INDEX \`uq_control_list_categories_name\` (\`name\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await seedControlListCategories(queryRunner);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`control_list_categories\``);
  }
}
