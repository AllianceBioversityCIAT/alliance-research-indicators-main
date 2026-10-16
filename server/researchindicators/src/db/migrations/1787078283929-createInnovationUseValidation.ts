import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * M5 (T-09, R-IU-006 AC.1-AC.11, R-IU-003 mode invariant / RB-5 layer 2,
 * R-IU-009 AC.3) — creates `innovation_use_validation`, the stored function
 * backing the Innovation Use section's green check.
 *
 * Mirrors `innovation_dev_validation`'s shape (latest body:
 * `1758125999162-AdaptInnovationDevValidationToManyToolFunctions.ts:12-115`),
 * with the following divergences and traps (design.md §6.4):
 *
 * 1. **Detail scalars** — `results` INNER JOIN `result_innovation_use`
 *    LEFT JOIN `clarisa_innovation_use_levels` (`ON id = innovation_use_level_id`).
 *    Both `r.is_active` and `riu.is_active` are checked in the WHERE clause
 *    (the detail-table `is_active` filter follows `policy_change_validation`'s
 *    precedent of filtering its own detail table, `1753460254629-createFunctions.ts:41-67`
 *    — `rpc.is_active = TRUE` at `:53` — and `intellectual_property_validation`'s,
 *    same file `:95-129` — `rir.is_active = TRUE` at `:119` — rather than
 *    `innovation_dev_validation`'s narrower `r.is_active`-only filter).
 * 2. **The trap avoided (DD-3 / DC-10).** The level test reads
 *    `clarisa_innovation_use_levels.level`, obtained through the join and
 *    bound to `useLevel`, and compares `useLevel >= 6` — never
 *    `riu.innovation_use_level_id >= 6`, which would be off by one
 *    (`id = level + 1`; id 6 is level 5).
 * 3. **The divergence — role filtering (DD-4).** Every `result_actors` query
 *    below adds `ra.actor_role_id = 2` (`ActorRolesEnum.INNOVATION_USE`,
 *    seeded by M4, `1787071463485-insertInnovationUseRoles.ts`).
 *    `innovation_dev_validation` has no such filter — correct today only by
 *    the one-indicator-per-result coincidence (A-1); this function does not
 *    rely on that coincidence.
 * 4. **The dead branch NOT copied (DD-10).** `innovation_dev_validation` has
 *    `WHEN ra.actor_type_id = 5 THEN ... ELSE ra.actor_type_id IS NOT NULL`
 *    (`1758125999162:77-78`) — unreachable, since `actor_type_id` is
 *    `bigint NOT NULL` (`1749957832239:18`). This function uses
 *    `IF(ra.actor_type_id = 5, valid_text(ra.actor_type_custom_name), TRUE)`
 *    instead — the only reachable failure.
 * 5. **Actor mode consistency (RB-5 layer 2, R-IU-006 AC.10, design.md §6.4
 *    step 4).** For every Innovation-Use actor row: if
 *    `sex_age_disaggregation_not_apply = TRUE` then `actors_count IS NOT
 *    NULL`; else at least one of the four disaggregated counts
 *    (`women_youth_count`, `women_not_youth_count`, `men_youth_count`,
 *    `men_not_youth_count`) is non-null.
 * 6. **The zero-actor guard is UNCONDITIONAL (DD-11, R-IU-006 AC.11).**
 *    `innovation_dev_validation`'s equivalent guard, `tempActors > 0`
 *    (`1758125999162:111`), sits inside the FALSE-branch of
 *    `RETURN IF(anticipatedUserId = 1 OR anticipatedUserId IS NULL, TRUE, (...))`
 *    — conditional, not unconditional. `innovation_use_validation`'s RETURN
 *    is a flat top-level `AND` chain: `(tempFullActors > 0)` is one of its
 *    conjuncts, never nested inside a bypassing `IF(...)`. A result with
 *    zero Innovation-Use actor rows therefore returns `0`, never a vacuous
 *    `1` (steps 3-4 are per-row predicates, vacuously true over an empty
 *    set without this guard).
 *
 * Reuses the existing `valid_text()` helper — introduces no new helper
 * function (R-IU-006). Its live body is `1779920000000-ExpandReportFieldMediumtext.ts:15-28`
 * (`valid_text(text MEDIUMTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci)
 * RETURNS tinyint(1)`).
 *
 * `DROP`/`CREATE` name only `innovation_use_validation` in both `up()` and
 * `down()` — no other `*_validation` function is touched (R-IU-009 AC.3).
 *
 * `down()` = `DROP FUNCTION innovation_use_validation` (design.md §5, row M5)
 * — there is no "prior body" to restore; this migration introduces the
 * function.
 */
export class CreateInnovationUseValidation1787078283929
  implements MigrationInterface
{
  name = 'CreateInnovationUseValidation1787078283929';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS \`innovation_use_validation\`;`,
    );

    await queryRunner.query(`
        CREATE FUNCTION \`innovation_use_validation\`(result_code BIGINT) RETURNS tinyint(1)
            READS SQL DATA
        BEGIN
            DECLARE commonFields BOOLEAN DEFAULT FALSE;
            DECLARE useLevel BIGINT DEFAULT NULL;
            DECLARE explanationValid BOOLEAN DEFAULT FALSE;
            DECLARE tempActors INT DEFAULT NULL;
            DECLARE tempFullActors INT DEFAULT NULL;
            DECLARE tempModeConsistent INT DEFAULT NULL;

            SELECT
                riu.innovation_use_level_id IS NOT NULL,
                ciul.level,
                valid_text(riu.innovation_use_level_explanation)
            INTO
                commonFields,
                useLevel,
                explanationValid
            FROM results r
            INNER JOIN result_innovation_use riu ON r.result_id = riu.result_id
            LEFT JOIN clarisa_innovation_use_levels ciul ON ciul.id = riu.innovation_use_level_id
            WHERE r.result_id = result_code
            AND r.is_active = TRUE
            AND riu.is_active = TRUE
            LIMIT 1;

            SELECT COUNT(ra.result_actors_id)
            INTO tempFullActors
            FROM result_actors ra
            WHERE ra.result_id = result_code
            AND ra.is_active = TRUE
            AND ra.actor_role_id = 2;

            SELECT IFNULL(
                    SUM(
                        IF(ra.actor_type_id = 5, valid_text(ra.actor_type_custom_name), TRUE)
                    ), 0)
            INTO tempActors
            FROM result_actors ra
            WHERE ra.result_id = result_code
            AND ra.is_active = TRUE
            AND ra.actor_role_id = 2;

            SELECT IFNULL(
                    SUM(
                        IF(ra.sex_age_disaggregation_not_apply = TRUE,
                            ra.actors_count IS NOT NULL,
                            (ra.women_youth_count IS NOT NULL OR ra.women_not_youth_count IS NOT NULL OR ra.men_youth_count IS NOT NULL OR ra.men_not_youth_count IS NOT NULL)
                        )
                    ), 0)
            INTO tempModeConsistent
            FROM result_actors ra
            WHERE ra.result_id = result_code
            AND ra.is_active = TRUE
            AND ra.actor_role_id = 2;

            RETURN commonFields
                AND IF(useLevel >= 6, explanationValid, TRUE)
                AND (tempFullActors > 0)
                AND (tempActors = tempFullActors)
                AND (tempModeConsistent = tempFullActors);
        END`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS \`innovation_use_validation\`;`,
    );
  }
}
