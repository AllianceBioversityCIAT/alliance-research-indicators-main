import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * M3 (T-06, R-IU-003 AC.1/AC.2, R-IU-004 AC.1/AC.2) — six additive, nullable
 * `int` count columns on the two SHARED tables `result_actors` and
 * `result_institution_types` (created by
 * `1749957832239-createEntitiesForInnovationDev.ts`), which Innovation Dev
 * reads and writes today.
 *
 * `result_actors` gains five columns (design.md §3.3):
 *   - `women_youth_count`, `women_not_youth_count`, `men_youth_count`,
 *     `men_not_youth_count` — the disaggregated-mode counts.
 *   - `actors_count` — the aggregate-mode "How many" (D-4). This is NOT a
 *     stored total of the four disaggregated columns: the two modes are
 *     mutually exclusive (a row is in exactly one), so `actors_count` is
 *     the count for a row that has no parts, never a duplicate of a value
 *     derivable from parts present in the same row (R-IU-003 AC.4, DD-7).
 *
 * `result_institution_types` gains one column (design.md §3.4):
 *   - `organization_count`.
 *
 * Type choice — `int`, not `bigint` (DD-6, deliberate divergence from the
 * two tables' `bigint` FK columns): person/organization counts never
 * approach 2.1B, and "consistency with the FK columns" is not a reason to
 * over-size a count column.
 *
 * All six columns are nullable with no default other than `NULL` — no
 * `NOT NULL`, no `MODIFY COLUMN`, no destructive DDL against any
 * pre-existing column (R-IU-009 AC.2). The four existing booleans
 * (`women_youth`, `women_not_youth`, `men_youth`, `men_not_youth`) are left
 * exactly as they are; Innovation Dev keeps reading and writing them
 * unchanged.
 *
 * The mode invariant (which mode a row is in, and that the two modes never
 * both populate) is NOT enforced here — no DB constraint enforces it
 * (RB-5). Layer 1 (entity-comment documentation) and layer 2 (the
 * `innovation_use_validation` function) are out of scope for this task —
 * see T-08 and T-09.
 *
 * No index added (design.md §3.7 — settled, not re-litigated here): every
 * column the validation function filters on is already PK/FK-backed.
 *
 * `down()` drops ONLY these six new columns, in reverse order of creation
 * — never a pre-existing column, and no other DDL.
 */
export class AddInnovationUseCountsToSharedTables1787070034303
  implements MigrationInterface
{
  name = 'AddInnovationUseCountsToSharedTables1787070034303';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_actors\` ADD \`women_youth_count\` int NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_actors\` ADD \`women_not_youth_count\` int NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_actors\` ADD \`men_youth_count\` int NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_actors\` ADD \`men_not_youth_count\` int NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_actors\` ADD \`actors_count\` int NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_institution_types\` ADD \`organization_count\` int NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_institution_types\` DROP COLUMN \`organization_count\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_actors\` DROP COLUMN \`actors_count\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_actors\` DROP COLUMN \`men_not_youth_count\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_actors\` DROP COLUMN \`men_youth_count\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_actors\` DROP COLUMN \`women_not_youth_count\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_actors\` DROP COLUMN \`women_youth_count\``,
    );
  }
}
