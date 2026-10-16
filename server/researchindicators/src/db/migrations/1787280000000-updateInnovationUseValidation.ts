import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * T-18 (`docs/specs/changes/innovation-use-required-fields`, `R-IUR-012`
 * AC.2-AC.5, `R-IUR-011` AC.4, `DD-6`, `DD-0`, `DD-5`, `DD-5b`, design.md
 * §3.0-§3.3 / §5) — rewrites `innovation_use_validation`'s body.
 *
 * **What changed and why (`DD-6`).** The prior body (`1787078283929-
 * createInnovationUseValidation.ts`) counted actor rows into `tempFullActors`
 * and required `tempFullActors > 0` — "at least one actor" — which
 * `R-IUR-011` withdraws (`D-1`, user ruling). Removing that anchor leaves
 * the old `SUM(...) = tempFullActors` comparisons meaningless, so this
 * migration replaces the whole body rather than patching it: **one
 * `COUNT(*)` of VIOLATING rows per collection** (actors, organizations,
 * measures), true when every violation count is zero AND rules 14-15 hold.
 * A violation count is `0` for an empty collection with no carve-out
 * needed — this is `R-IUR-001` (an empty section is valid) falling out of
 * the structure, not a special case bolted on.
 *
 * **The five hard constraints this migration must satisfy** (`tasks.md`
 * T-18, `design.md` DD-6):
 *
 * 1. **Rules 14-15 copied verbatim (`C-5`).** The `SELECT ... INTO
 *    commonFields, useLevel, explanationValid` block below — including its
 *    `r.is_active` / `riu.is_active` filters and `LIMIT 1` — and the
 *    `IF(useLevel >= 6, explanationValid, TRUE)` RETURN conjunct are
 *    byte-identical to `1787078283929-createInnovationUseValidation.ts:87-101,134`.
 *    **The `level`-vs-`id` trap (`DD-3`/`DC-10`, documented in that
 *    migration's own header):** `useLevel` is bound to `ciul.level` through
 *    the `clarisa_innovation_use_levels` join, NEVER to
 *    `riu.innovation_use_level_id` directly — the FK is off-by-one against
 *    the level (`id = level + 1`; id 6 is level 5).
 * 2. **`is_active = TRUE` on all three row predicates (`DD-0`).** Rows are
 *    soft-deleted (`result-quantifications.service.ts:150/:214`,
 *    `result-institution-types.service.ts:565`); scoping a violation count
 *    by `result_id` + role alone would count every row the user has ever
 *    deleted, turning the green check permanently `false` with nothing on
 *    screen to fix (a deactivated row is not rendered).
 * 3. **Every mode branch is NULL-safe (`C-6`, §3.2).** Both
 *    `sex_age_disaggregation_not_apply` and `is_organization_known` are
 *    `nullable: true`, and in MySQL `NULL = TRUE` / `NULL = FALSE` both
 *    evaluate to `NULL`. This body reuses the existing
 *    `IF(col = TRUE, a, b)` form (design.md §3.2 confirms this form is
 *    already NULL-safe: a `NULL` condition inside `IF()` takes the ELSE
 *    branch, routing a NULL-mode row to the "not TRUE" branch on both
 *    columns) — never an equality rewrite that would let a NULL-mode row
 *    match neither branch and be vacuously valid.
 * 4. **Every grouping is explicitly parenthesized.** `A OR B AND C` has
 *    previously passed as `(A OR B) AND C` in this repo (a mocked query
 *    builder cannot represent operator precedence — `R-IUR-012` S1's
 *    `BUT`). Every OR/AND term below is wrapped in its own parentheses.
 * 5. **The sub-type clause mirrors the CLIENT predicate (`DD-5`), not the
 *    naive one.** `1758125999162-AdaptInnovationDevValidationToManyToolFunctions.ts:91`
 *    (innovation-**dev**'s function) uses
 *    `EXISTS(parent_code = institution_type_id) > 0` alone — no root
 *    filter, no `is_active`. `test/fixtures/innovation-use/
 *    institution-type-subtype-catalog-equivalence.fixture-spec.ts` proves
 *    that form diverges from the client on 8 of 42 real catalog types
 *    (active, non-root types with children: codes 38, 41, 44, 47, 51, 55,
 *    58, 61) — a row would be required to carry a sub-type the client
 *    never renders a control for. The clause below is copied from that
 *    fixture's `requires_subtype_correct` column (`:337-340`): `t.parent_code
 *    IS NULL AND t.is_active = TRUE AND EXISTS(SELECT 1 FROM
 *    clarisa_institution_types c WHERE c.parent_code = t.code)` —
 *    `is_active` binds to the PARENT only, never to `c` (`N-7`: an
 *    inactive child must still make the select, and therefore the
 *    requirement, render). Rule 8b (a chosen sub-type must belong to its
 *    chosen type, `DD-5b`) is a second, independent EXISTS joining
 *    `parent_code = institution_type_id`.
 *
 * **The rule table this body implements** (design.md §3.1, rules 1-15;
 * rule 13 — "at least one actor" — is deleted per `R-IUR-011`; rule 12 has
 * no check; rule 1 is structurally vacuous, `actor_type_id` is `bigint NOT
 * NULL`):
 *
 *   | # | Collection | Violation when |
 *   | - | ---------- | --------------- |
 *   | 2 | actor | `actor_type_id = 5` AND `NOT valid_text(actor_type_custom_name)` |
 *   | 3+4 | actor | disaggregated mode AND (not all four counts filled OR their sum is not `> 0`) |
 *   | 5 | actor | aggregate mode AND NOT (`actors_count IS NOT NULL` AND `actors_count > 0`) |
 *   | 6 | organization | known mode AND `institution_id IS NULL` |
 *   | 7 | organization | unknown mode AND `institution_type_id IS NULL` |
 *   | 8 | organization | unknown mode AND the type requires a sub-type (`DD-5`) AND `sub_institution_type_id IS NULL` |
 *   | 8b | organization | `sub_institution_type_id IS NOT NULL` AND it does not belong to `institution_type_id` (`DD-5b`) |
 *   | 9 | organization | unknown mode AND NOT (`organization_count IS NOT NULL` AND `organization_count > 0`) |
 *   | 10 | measure | NOT (`quantification_number IS NOT NULL` AND `quantification_number <> 0`) — negatives are valid, only `0` fails |
 *   | 11 | measure | `NOT valid_text(unit)` |
 *
 * Reuses the existing `valid_text()` helper (`1779920000000-
 * ExpandReportFieldMediumtext.ts:15-28`) — introduces no new helper
 * function. `DROP`/`CREATE` name **only** `innovation_use_validation` in
 * both `up()` and `down()` (`R-IUR-011` AC.4) — `innovation_dev_validation`
 * (`actor_role_id = 1`) is never touched.
 *
 * **`down()` restores the PREVIOUS body verbatim** (`R-IUR-012` AC.4) — the
 * prior migration's own `down()` is a bare `DROP FUNCTION IF EXISTS`, so a
 * bare drop here would leave no function at all. The restored body below
 * is a byte-for-byte copy of `1787078283929-createInnovationUseValidation.ts:76-138`'s
 * `CREATE FUNCTION` statement.
 *
 * **`R-IUR-012` AC.5 / `DC-7` — recorded here as this task's Implementer
 * note (the sibling spec restates it in-file):** the sibling structural
 * spec (`src/db/migration-specs/1787280000000-updateInnovationUseValidation.spec.ts`)
 * asserts SQL **shape** only — exactly one function named, `up()`
 * DROP-then-CREATE, `down()` non-empty and restorative. **It cannot prove
 * this function's runtime behavior** — a mocked `QueryRunner` records SQL
 * text, never executes it, and cannot evaluate operator precedence. That
 * proof is `T-19`'s alone, against real MySQL.
 */
export class UpdateInnovationUseValidation1787280000000
  implements MigrationInterface
{
  name = 'UpdateInnovationUseValidation1787280000000';

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
            DECLARE tempActorViolations INT DEFAULT NULL;
            DECLARE tempOrganizationViolations INT DEFAULT NULL;
            DECLARE tempMeasureViolations INT DEFAULT NULL;

            -- Constraint 1 (C-5): rules 14-15, copied verbatim from the
            -- createInnovationUseValidation migration (see this file's
            -- header comment for the exact source lines).
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

            -- Rules 2, 3, 4, 5 — one violation count for the whole actor
            -- collection. Constraint 2: is_active = TRUE + actor_role_id = 2
            -- (Innovation Use). Constraint 3: the mode branch reuses
            -- IF(col = TRUE, a, b), NULL-safe by construction (a NULL
            -- condition takes the ELSE branch). Constraint 4: every
            -- OR/AND term is its own parenthesized group.
            SELECT COUNT(*)
            INTO tempActorViolations
            FROM result_actors ra
            WHERE ra.result_id = result_code
            AND ra.is_active = TRUE
            AND ra.actor_role_id = 2
            AND (
                (
                    IF(ra.actor_type_id = 5, NOT valid_text(ra.actor_type_custom_name), FALSE)
                )
                OR
                (
                    IF(ra.sex_age_disaggregation_not_apply = TRUE,
                        (
                            NOT (ra.actors_count IS NOT NULL AND ra.actors_count > 0)
                        ),
                        (
                            NOT (
                                (
                                    ra.women_youth_count IS NOT NULL
                                    AND ra.women_not_youth_count IS NOT NULL
                                    AND ra.men_youth_count IS NOT NULL
                                    AND ra.men_not_youth_count IS NOT NULL
                                )
                                AND
                                (
                                    (
                                        COALESCE(ra.women_youth_count, 0)
                                        + COALESCE(ra.women_not_youth_count, 0)
                                        + COALESCE(ra.men_youth_count, 0)
                                        + COALESCE(ra.men_not_youth_count, 0)
                                    ) > 0
                                )
                            )
                        )
                    )
                )
            );

            -- Rules 6, 7, 8, 8b, 9 — one violation count for the whole
            -- organization collection. Constraint 2: is_active = TRUE +
            -- institution_type_role_id = 2 (Innovation Use). Constraint 3:
            -- IF(is_organization_known = TRUE, ...) is NULL-safe the same
            -- way. Constraint 5 (DD-5): the sub-type-required EXISTS below
            -- is copied from institution-type-subtype-catalog-equivalence.
            -- fixture-spec.ts's requires_subtype_correct column — is_active
            -- and the root filter apply to the PARENT alias (t) only, never
            -- to the child alias (c), matching the client's
            -- getInstitutionTypesByDepthLevel predicate exactly.
            SELECT COUNT(*)
            INTO tempOrganizationViolations
            FROM result_institution_types rit
            WHERE rit.result_id = result_code
            AND rit.is_active = TRUE
            AND rit.institution_type_role_id = 2
            AND (
                IF(rit.is_organization_known = TRUE,
                    (
                        rit.institution_id IS NULL
                    ),
                    (
                        (
                            rit.institution_type_id IS NULL
                        )
                        OR
                        (
                            (
                                EXISTS (
                                    SELECT 1 FROM clarisa_institution_types t
                                    WHERE t.code = rit.institution_type_id
                                    AND t.parent_code IS NULL
                                    AND t.is_active = TRUE
                                    AND EXISTS (
                                        SELECT 1 FROM clarisa_institution_types c
                                        WHERE c.parent_code = t.code
                                    )
                                )
                            )
                            AND
                            (
                                rit.sub_institution_type_id IS NULL
                            )
                        )
                        OR
                        (
                            (
                                rit.sub_institution_type_id IS NOT NULL
                            )
                            AND
                            (
                                NOT EXISTS (
                                    SELECT 1 FROM clarisa_institution_types c
                                    WHERE c.code = rit.sub_institution_type_id
                                    AND c.parent_code = rit.institution_type_id
                                )
                            )
                        )
                        OR
                        (
                            NOT (rit.organization_count IS NOT NULL AND rit.organization_count > 0)
                        )
                    )
                )
            );

            -- Rules 10, 11 — one violation count for the whole measure
            -- collection. Constraint 2: is_active = TRUE +
            -- quantification_role_id = 3 (Innovation Use). Rule 10 is
            -- "<> 0", never "> 0" — a negative quantification_number is
            -- valid (changes/measure-number-signed-decimal).
            SELECT COUNT(*)
            INTO tempMeasureViolations
            FROM result_quantifications rq
            WHERE rq.result_id = result_code
            AND rq.is_active = TRUE
            AND rq.quantification_role_id = 3
            AND (
                (
                    NOT (rq.quantification_number IS NOT NULL AND rq.quantification_number <> 0)
                )
                OR
                (
                    NOT valid_text(rq.unit)
                )
            );

            RETURN commonFields
                AND IF(useLevel >= 6, explanationValid, TRUE)
                AND (tempActorViolations = 0)
                AND (tempOrganizationViolations = 0)
                AND (tempMeasureViolations = 0);
        END`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS \`innovation_use_validation\`;`,
    );

    // Restores the body from 1787078283929-createInnovationUseValidation.ts
    // verbatim (R-IUR-012 AC.4) — that migration's own down() is a bare
    // DROP, so reverting THIS migration must recreate the function it
    // replaced rather than leaving none at all.
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
}
