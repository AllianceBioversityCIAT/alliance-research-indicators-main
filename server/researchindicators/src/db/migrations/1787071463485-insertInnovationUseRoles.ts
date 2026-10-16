import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * M4 (T-07, R-IU-005 AC.1-AC.3) — seeds one `INNOVATION_USE` role row into
 * each of the three role-discriminator catalogs, at the next free id.
 * Pure DML (FP-9): unlike M1-M3 this migration issues no DDL at all.
 *
 * Trap 1 — the PK column name is NOT uniform across these three tables
 * (verified against `src/db/baseline/baseline.sql`):
 *   - `actor_roles.actor_role_id`                     (baseline.sql:833)
 *   - `institution_type_roles.institution_type_role_id` (baseline.sql:1990)
 *   - `quantification_roles.id`                       (baseline.sql:2438, bare `id`)
 *
 * Trap 2 — these three catalogs DO have in-migration seed precedent, and
 * this migration FOLLOWS it rather than breaking with it (re-verified
 * directly in source, not by grep alone — a naive `grep INSERT INTO
 * \`actor_roles\`` misses these because the SQL sits inside an
 * escaped-backtick template literal):
 *   - `actor_roles`            <- `1749957832239-createEntitiesForInnovationDev.ts:45`
 *   - `institution_type_roles` <- `1749957832239-createEntitiesForInnovationDev.ts:48`
 *   - `quantification_roles`   <- `1760653582914-createQuantificationTables.ts:23`
 * Both migrations are recorded as executed in `baseline.sql:8269` (rows 96
 * and 178 of the `migrations` table), well below the executed-row ceiling
 * `1786679227000`. So all three catalogs ARE reconstructable from source —
 * they are NOT in the `clarisa_innovation_readiness_levels` situation
 * (design.md §5, DD-2: that catalog's rows entered out-of-band and cannot
 * be reconstructed). DD-2's "break with local precedent" framing is scoped
 * to M1's catalog only and does not extend to these three tables.
 *
 * Trap 3 — all three tables are AUTO_INCREMENT. The ids below are written
 * EXPLICITLY; the AUTO_INCREMENT counter is never allowed to assign them.
 * The baseline snapshot corroborates that ids 2 (actor_roles), 2
 * (institution_type_roles), and 3 (quantification_roles) are genuinely the
 * next free ids: `actor_roles` and `institution_type_roles` each record
 * `AUTO_INCREMENT=2`, and `quantification_roles` records `AUTO_INCREMENT=3`
 * — exactly the ids design.md §3.6 assigns. This is now corroborated from
 * source (the precedent inserts above seed ids 1 / 1 / 1,2), not only from
 * the AUTO_INCREMENT counters.
 *
 * Ids below are hard-coded literals, NOT interpolated enum constants —
 * unlike the precedent, which writes `${ActorRolesEnum.INNOVATION_DEV}` /
 * `${QuantificationRolesEnum.ACTUAL_COUNT}`. `ActorRolesEnum.INNOVATION_USE`
 * / `InstitutionTypeRoleEnum.INNOVATION_USE` /
 * `QuantificationRolesEnum.INNOVATION_USE` do not exist yet: they are added
 * in T-08, and the dependency graph runs T-07 -> T-08, not the reverse.
 * Depending on T-08's enum members here would invert that edge.
 *
 * `name` is a machine slug, matching each catalog's OWN existing naming
 * convention rather than one shared cross-catalog format. `actor_roles` and
 * `institution_type_roles` already store `'innovation-development'`
 * (kebab-case, seeded at `1749957832239:45,48`), so the new row is
 * `'innovation-use'` in both. `quantification_roles` already stores
 * `'actual_count'` / `'extrapolate_estimates'` (snake_case, seeded at
 * `1760653582914:23`), so the new row is `'innovation_use'`. The separator
 * deliberately differs for the third catalog: these are three independent
 * catalogs, each served as its own control list, and a kebab-cased row
 * inside an otherwise snake-cased table is the inconsistency a reader
 * actually sees. Do not "fix" this into one shared format.
 *
 * `down()` DELETEs by id only (design.md §5) — never a DROP, never a
 * statement touching any pre-existing row.
 *
 * Renumbering or reusing an existing role id is forbidden (R-IU-005 AC.3):
 * existing rows in `result_actors` / `result_institution_types` /
 * `result_quantifications` reference these catalogs by value.
 */
export class InsertInnovationUseRoles1787071463485
  implements MigrationInterface
{
  name = 'InsertInnovationUseRoles1787071463485';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `INSERT INTO \`actor_roles\` (\`actor_role_id\`, \`name\`) VALUES (2, 'innovation-use')`,
    );
    await queryRunner.query(
      `INSERT INTO \`institution_type_roles\` (\`institution_type_role_id\`, \`name\`) VALUES (2, 'innovation-use')`,
    );
    await queryRunner.query(
      `INSERT INTO \`quantification_roles\` (\`id\`, \`name\`) VALUES (3, 'innovation_use')`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM \`quantification_roles\` WHERE \`id\` = 3`,
    );
    await queryRunner.query(
      `DELETE FROM \`institution_type_roles\` WHERE \`institution_type_role_id\` = 2`,
    );
    await queryRunner.query(
      `DELETE FROM \`actor_roles\` WHERE \`actor_role_id\` = 2`,
    );
  }
}
