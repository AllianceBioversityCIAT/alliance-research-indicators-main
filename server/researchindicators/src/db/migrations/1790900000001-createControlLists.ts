import { MigrationInterface, QueryRunner } from 'typeorm';
import { seedControlLists } from '../seeds/control-lists.seed';

/**
 * Lists. Creates `control_lists` and seeds the 6 system lists of R-CTL-010
 * under the 2 categories created by
 * `1790900000000-createControlListCategories.ts`
 * (docs/specs/changes/control-lists-global-scope, R-CLG-006, D-CLG-1,
 * D-CLG-2, D-CLG-11; archived design D-CTL-14).
 *
 * Rewritten in place (never merged or deployed): lists are global, so the
 * table carries no scope column or FK, and the list key is unique across
 * the whole module (`uq_control_lists_key`, case-insensitive through the
 * declared `utf8mb4_unicode_ci` collation).
 *
 * The seed SQL lives in `src/db/seeds/control-lists.seed.ts` (explicit ids
 * 1-6 and their explicit category ids, each guarded by `WHERE NOT EXISTS`,
 * `AUTO_INCREMENT` reset above the seeded ids). This file exports ONLY its
 * migration class: the TypeORM loader treats every exported function in
 * `migrations/**` as a migration. `down` drops only this table (reverse
 * order: values, lists, categories).
 */
export class CreateControlLists1790900000001 implements MigrationInterface {
  name = 'CreateControlLists1790900000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`control_lists\` (
        \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`created_by\` bigint NULL,
        \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`updated_by\` bigint NULL,
        \`is_active\` tinyint NOT NULL DEFAULT 1,
        \`deleted_at\` timestamp NULL,
        \`id\` bigint NOT NULL AUTO_INCREMENT,
        \`category_id\` bigint NOT NULL,
        \`list_key\` varchar(100) NOT NULL,
        \`name\` varchar(150) NOT NULL,
        \`description\` varchar(500) NULL,
        \`code_prefix\` varchar(10) NOT NULL,
        \`is_system\` tinyint NOT NULL DEFAULT 0,
        PRIMARY KEY (\`id\`),
        UNIQUE INDEX \`uq_control_lists_key\` (\`list_key\`),
        INDEX \`idx_control_lists_category\` (\`category_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(
      `ALTER TABLE \`control_lists\` ADD CONSTRAINT \`FK_control_lists_category_id\` FOREIGN KEY (\`category_id\`) REFERENCES \`control_list_categories\`(\`id\`) ON DELETE RESTRICT`,
    );

    await seedControlLists(queryRunner);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`control_lists\``);
  }
}
