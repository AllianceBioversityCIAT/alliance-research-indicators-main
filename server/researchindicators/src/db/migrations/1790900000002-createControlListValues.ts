import { MigrationInterface, QueryRunner } from 'typeorm';
import { seedControlListValues } from '../seeds/control-lists.seed';

/**
 * Values. Creates `control_list_values` and seeds the 23 values of R-CTL-010
 * under the 6 system lists created by `1790900000001-createControlLists.ts`
 * (docs/specs/changes/control-lists-global-scope, R-CLG-006, D-CLG-2,
 * D-CLG-11; archived design D-CTL-14).
 *
 * The table and its indexes are unchanged by the rewrite of the two earlier
 * migrations. The seed SQL lives in `src/db/seeds/control-lists.seed.ts`
 * (explicit ids 1-23, each joined to its parent list by id AND key and
 * guarded by `WHERE NOT EXISTS`, `AUTO_INCREMENT` reset above the seeded
 * ids). This file exports ONLY its migration class: the TypeORM loader
 * treats every exported function in `migrations/**` as a migration. `down`
 * drops only this table (reverse order: values, lists, categories).
 */
export class CreateControlListValues1790900000002
  implements MigrationInterface
{
  name = 'CreateControlListValues1790900000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`control_list_values\` (
        \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`created_by\` bigint NULL,
        \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`updated_by\` bigint NULL,
        \`is_active\` tinyint NOT NULL DEFAULT 1,
        \`deleted_at\` timestamp NULL,
        \`id\` bigint NOT NULL AUTO_INCREMENT,
        \`list_id\` bigint NOT NULL,
        \`code\` varchar(30) NOT NULL,
        \`value\` varchar(150) NOT NULL,
        \`description\` varchar(500) NULL,
        \`display_order\` int NOT NULL DEFAULT 0,
        PRIMARY KEY (\`id\`),
        UNIQUE INDEX \`uq_control_list_values_list_code\` (\`list_id\`, \`code\`),
        UNIQUE INDEX \`uq_control_list_values_list_value\` (\`list_id\`, \`value\`),
        INDEX \`idx_control_list_values_list_order\` (\`list_id\`, \`display_order\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(
      `ALTER TABLE \`control_list_values\` ADD CONSTRAINT \`FK_control_list_values_list_id\` FOREIGN KEY (\`list_id\`) REFERENCES \`control_lists\`(\`id\`) ON DELETE RESTRICT`,
    );

    await seedControlListValues(queryRunner);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`control_list_values\``);
  }
}
