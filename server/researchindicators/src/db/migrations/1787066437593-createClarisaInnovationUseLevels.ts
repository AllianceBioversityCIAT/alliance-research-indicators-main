import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * M1 (T-04, R-IU-002) — creates the Innovation Use level catalog and seeds
 * the ten canonical rows in-migration.
 *
 * Mirrors the table shape of `clarisa_innovation_readiness_levels`
 * (`1749604157074-createClarisaInnovationReadinessLevel.ts`) — same column
 * set, `id` as a PK that is NOT auto-increment. It deliberately breaks that
 * table's *population* precedent (DD-2, design.md §5): the readiness
 * catalog's rows were never inserted by any migration and are therefore
 * unreconstructable from source. This catalog is seeded here instead, so it
 * is fully reproducible from migrations alone (NFR-IU-003).
 *
 * Two properties make this table dangerous to get wrong (design.md §3.2):
 *  - `id` is NOT the scale point. `id = level + 1` (id 1 -> level 0, ...,
 *    id 10 -> level 9). Both columns are seeded explicitly below; neither
 *    is derived from the other at insert time.
 *  - `name` is NOT unique — it repeats in pairs across adjacent levels
 *    (e.g. "Partners" at levels 2 and 3). No unique constraint or index is
 *    declared on it. Only `level` uniquely identifies a scale point.
 *
 * No `additional_guidance` column: the source system supplies no
 * equivalent field for this catalog, and an always-null column would be
 * noise (design.md §3.2).
 *
 * Seed content is fixed verbatim by requirements.md §R-IU-002's canonical
 * table (product owner, 2026-08-14). The source system's rows ids 13-20 are
 * confirmed wrong data (D-7) and are deliberately NOT replicated — this
 * table holds exactly ten rows.
 */
export class CreateClarisaInnovationUseLevels1787066437593
  implements MigrationInterface
{
  name = 'CreateClarisaInnovationUseLevels1787066437593';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`clarisa_innovation_use_levels\` (
        \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`created_by\` bigint NULL,
        \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`updated_by\` bigint NULL,
        \`is_active\` tinyint NOT NULL DEFAULT 1,
        \`deleted_at\` timestamp NULL,
        \`id\` bigint NOT NULL,
        \`level\` bigint NULL,
        \`name\` text NULL,
        \`definition\` text NULL,
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci
    `);

    await queryRunner.query(`
      INSERT INTO \`clarisa_innovation_use_levels\` (\`id\`, \`level\`, \`name\`, \`definition\`) VALUES
        (1, 0, 'No use', 'Innovation is not used.'),
        (2, 1, 'Project lead organization', 'Innovation is used by organization(s) leading the innovation development.'),
        (3, 2, 'Partners', 'Innovation is used by some partners involved in initial innovation development.'),
        (4, 3, 'Partners', 'Innovation is commonly used by partners involved in initial innovation development.'),
        (5, 4, 'Connected next-user', 'Innovation is used by some organizations connected to partners involved in the initial innovation development.'),
        (6, 5, 'Connected next-user', 'Innovation is commonly used by organizations connected to partners involved in the initial innovation development.'),
        (7, 6, 'Unconnected next-user', 'Innovation is used by organizations not connected to partners involved in the initial innovation development.'),
        (8, 7, 'Unconnected next-user', 'Innovation is commonly used by organizations not connected to partners involved in the initial innovation development.'),
        (9, 8, 'End-user / Beneficiaries', 'Innovation is used by some end-users or beneficiaries who were not involved in the initial innovation development.'),
        (10, 9, 'End-user / Beneficiaries', 'Innovation is commonly used by end-users or beneficiaries who were not involved in the initial innovation development.')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`clarisa_innovation_use_levels\``);
  }
}
