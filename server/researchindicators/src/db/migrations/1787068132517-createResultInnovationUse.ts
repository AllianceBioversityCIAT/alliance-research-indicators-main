import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * M2 (T-05, R-IU-001) — creates the Innovation Use detail table.
 *
 * Mirrors `result_innovation_dev` (`1749603152180-createResultInnovationDevTable.ts`,
 * plus its FK addition in `1749763135881-addno_sex_age_disaggregationIntoInnoDev.ts`):
 * same construction shape (CREATE TABLE, then ADD CONSTRAINT per FK via
 * separate ALTER TABLE statements, no explicit KEY before each FK — InnoDB
 * creates the supporting index automatically).
 *
 * `result_id` is BOTH the primary key and the FK to `results`. This is the
 * entire point (design.md §3.1): it makes R-IU-001's "must NOT be possible
 * to write two active rows for the same result_id" structurally impossible
 * rather than application-enforced. There is no surrogate `id` column, and
 * `result_id` is not merely unique — it IS the primary key.
 *
 * `innovation_use_level_id` stores the catalog's `id`, never its `level`
 * (DD-3). It is nullable: a draft can exist before a level is chosen.
 *
 * `innovation_use_level_explanation` is nullable text with no CHECK
 * constraint. It becomes mandatory only when the *joined* catalog `level`
 * is >= 6 — that rule belongs to T-09's `innovation_use_validation`
 * stored function, not to this migration.
 *
 * No `ON DELETE` / `ON UPDATE` clause on either FK — default RESTRICT,
 * matching the `result_innovation_dev` precedent. The lifecycle routines
 * (T-10) handle deletion explicitly; cascade behavior is not introduced
 * here.
 *
 * Charset is `utf8mb4` / `utf8mb4_unicode_520_ci` per TRD §5.1, matching
 * M1's precedent (T-04) rather than `result_innovation_dev`'s shipped
 * `utf8mb3` — a known, recorded asymmetry (FP-8). The FK columns are
 * `bigint`, so collation is irrelevant to the joins.
 */
export class CreateResultInnovationUse1787068132517
  implements MigrationInterface
{
  name = 'CreateResultInnovationUse1787068132517';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`result_innovation_use\` (
        \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`created_by\` bigint NULL,
        \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`updated_by\` bigint NULL,
        \`is_active\` tinyint NOT NULL DEFAULT 1,
        \`deleted_at\` timestamp NULL,
        \`result_id\` bigint NOT NULL,
        \`innovation_use_level_id\` bigint NULL,
        \`innovation_use_level_explanation\` text NULL,
        PRIMARY KEY (\`result_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci
    `);

    await queryRunner.query(
      `ALTER TABLE \`result_innovation_use\` ADD CONSTRAINT \`FK_result_innovation_use_result_id\` FOREIGN KEY (\`result_id\`) REFERENCES \`results\`(\`result_id\`)`,
    );

    await queryRunner.query(
      `ALTER TABLE \`result_innovation_use\` ADD CONSTRAINT \`FK_result_innovation_use_innovation_use_level_id\` FOREIGN KEY (\`innovation_use_level_id\`) REFERENCES \`clarisa_innovation_use_levels\`(\`id\`)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_innovation_use\` DROP FOREIGN KEY \`FK_result_innovation_use_innovation_use_level_id\``,
    );

    await queryRunner.query(
      `ALTER TABLE \`result_innovation_use\` DROP FOREIGN KEY \`FK_result_innovation_use_result_id\``,
    );

    await queryRunner.query(`DROP TABLE \`result_innovation_use\``);
  }
}
