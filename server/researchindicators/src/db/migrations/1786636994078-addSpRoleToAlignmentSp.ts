import { MigrationInterface, QueryRunner } from 'typeorm';

// @sdd-spec docs/specs/bilateral/primary-contributing-sp — T-02 / R-BIL-121, R-BIL-126, NFR-BIL-120
//
// Adds `sp_role` (nullable, no backfill — legacy rows stay `NULL`, R-BIL-126)
// and the partial-unique invariant "at most one ACTIVE Primary SP per
// alignment" via the same STORED GENERATED + UNIQUE index idiom already used
// twice in this module (1779190000014, 1779190000015): a generated column
// that is non-NULL only for the row(s) the invariant should restrict, with a
// UNIQUE index over it. NULLs never collide under MySQL unique-index
// semantics, so every other row is untouched by the index.
//
// The generated column's VALUE is `alignment_id` ALONE — it deliberately does
// NOT fold `sp_role` into the value (e.g. via CONCAT). Doing so would make the
// column non-NULL for CONTRIBUTING rows too, and the UNIQUE index would then
// reject a second active Contributing SP on the same alignment — which
// R-BIL-121 explicitly requires to remain unlimited. The role only ever
// appears in the generated expression's IF condition, never in what it
// produces.
//
// Typed `bigint`, not `varchar`: this keys on a single column (`alignment_id`,
// itself `bigint NOT NULL` — 1779190000007-createResultPoolFundingAlignmentSp
// :18), so it follows 1779190000014's plain-`bigint` precedent. The
// `varchar(71)` on 1779190000015 is unrelated — that column concatenates a
// composite key (`result_id:sp_code`) and does not apply here.
//
// Keyed on `alignment_id`, never `id`: MySQL forbids referencing an
// AUTO_INCREMENT column (`id` is this table's PK) inside a generated
// expression, so `alignment_id` is both the only legal choice and the
// semantically correct one — the invariant is scoped per alignment.
//
// Collation note: this table is utf8mb4_unicode_520_ci, so the comparison
// `sp_role = 'PRIMARY'` is case-insensitive — `'primary'` would also satisfy
// it. Benign today because the only writer (`resolvePrimarySpCode`, T-06)
// always writes the fixed literal `'PRIMARY'`, but any future writer must not
// rely on case to distinguish the two roles.
//
// Both ADD COLUMNs are combined into a single ALTER: `... STORED` forces
// MySQL to run `ALGORITHM=COPY` (a full table rebuild), so splitting them
// into two ALTERs would rebuild the table twice instead of once (NFR-BIL-120
// physical caveat).
//
// No backfill: every pre-existing row keeps `sp_role = NULL`, so
// `active_primary_alignment` is `NULL` for it too and the checksum over
// (id, alignment_id, sp_code, is_active) is preserved (R-BIL-126 AC.1).
export class AddSpRoleToAlignmentSp1786636994078 implements MigrationInterface {
  name = 'AddSpRoleToAlignmentSp1786636994078';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_pool_funding_alignment_sp\`
         ADD COLUMN \`sp_role\` varchar(20) NULL,
         ADD COLUMN \`active_primary_alignment\` bigint
           GENERATED ALWAYS AS (
             IF(\`is_active\` = 1 AND \`sp_role\` = 'PRIMARY', \`alignment_id\`, NULL)
           ) STORED`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_pool_funding_alignment_sp\`
         ADD UNIQUE INDEX \`idx_rpfas_active_primary\` (\`active_primary_alignment\`)`,
    );
  }

  // Reverse order: the index depends on the generated column, which depends
  // on `sp_role` — drop the index first, then the generated column, then
  // `sp_role`, restoring the table to its exact prior shape (R-BIL-126 AC.5).
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_pool_funding_alignment_sp\`
         DROP INDEX \`idx_rpfas_active_primary\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_pool_funding_alignment_sp\`
         DROP COLUMN \`active_primary_alignment\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_pool_funding_alignment_sp\`
         DROP COLUMN \`sp_role\``,
    );
  }
}
