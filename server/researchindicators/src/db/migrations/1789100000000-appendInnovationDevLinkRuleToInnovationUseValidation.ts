import { MigrationInterface, QueryRunner } from 'typeorm';
import { LinkResultRolesEnum } from '../../domain/entities/link-result-roles/enum/link-result-roles.enum';

/**
 * Migration B of docs/specs/innovation-use/link-innovation-dev (T-02,
 * R-IUL-009 — both scenarios and every `BUT`/`AND IT MUST` clause), design.md
 * §3.3, §11.3, §11.4, DD-5, DD-10.
 *
 * Appends **rule 16** to `innovation_use_validation`: the green check now
 * additionally requires an active `link_results` row under
 * `LinkResultRolesEnum.INNOVATION_USE_LINKED_DEV = 5`, pointing at an
 * active, `indicator_id = 2` (Innovation Dev) result. No grandfathering
 * (`DD-8` / `OQ-1`, user ruling) — every pre-existing Innovation Use result
 * is retroactively gated the moment this migration is applied.
 *
 * **Depends on Migration A (`1789000000000-insertInnovationUseLinkedDevRole.ts`)**
 * — it needs `LinkResultRolesEnum.INNOVATION_USE_LINKED_DEV` (added there)
 * and the catalog row it seeds (R-IUL-011: the seed must be applied first,
 * or every save 500s on the `link_result_role_id` FK — that is an
 * operational sequencing concern, not something this migration's DDL can
 * enforce).
 *
 * **Rules 2-15 are copied byte-identically from `1787280000000-
 * updateInnovationUseValidation.ts`'s `up()`** (`R-IUL-009` "IT MUST NOT
 * weaken, reorder or drop any of rules 2-15 already in that function") —
 * every DECLARE, every `SELECT ... INTO` block (including the `is_active`
 * filters on both `r`/`riu` for rules 14-15 and on `ra`/`rit`/`rq` for the
 * violation counts), every comment, is untouched. The **only** change is
 * one additional `AND (...)` conjunct appended to the `RETURN` statement,
 * verified by diff against the source migration (see this task's
 * Implementer report) rather than by eye.
 *
 * **Rule 16's shape (design.md §3.3, DD-5):**
 * `EXISTS` over `link_results lr` joined to `results r2 ON r2.result_id =
 * lr.other_result_id`, requiring `lr.result_id = result_code`,
 * `lr.link_result_role_id` set from `LinkResultRolesEnum.INNOVATION_USE_LINKED_DEV`
 * (never a bare `5` — `C3` binds both migrations to the enum; written here in
 * prose, not as the `${...}` template form, so this comment cannot itself
 * satisfy a source-text check for the interpolation it describes),
 * `lr.is_active = TRUE`, `r2.is_active = TRUE` and `r2.indicator_id = 2`.
 * `EXISTS`, never `COUNT(*) = 1` (`DD-5`): a cardinality assertion would
 * turn an application-layer invariant violation (the concurrent-PATCH race,
 * design §3.2, accepted and unmitigated) into a red check the reporter has
 * no way to clear. Every OR/AND term in the appended conjunct is its own
 * parenthesized group (`KZ-017` — `A OR B AND C` has previously passed as
 * `(A OR B) AND C` in this repo; this conjunct in fact contains no `OR` at
 * all, only a chain of `AND`s inside the `EXISTS` subquery's `WHERE`, which
 * is unambiguous either way, but the whole conjunct is still wrapped in its
 * own parentheses to match the style of every other top-level `RETURN`
 * conjunct in this function).
 *
 * **No grandfathering clause of any kind** (`DD-8`, `OQ-1` — user ruling,
 * *"yo las ejecutaré contra la db real"*): no created-before cut-off, no
 * date predicate, anywhere in the appended conjunct. The retroactive break
 * is intended.
 *
 * **Never names `innovation_dev_validation`** — that is a different
 * function (indicator 2's own green check) and is out of scope for this
 * spec; `DROP`/`CREATE` below name only `innovation_use_validation`, in
 * both `up()` and `down()`.
 *
 * **`down()` restores `1787280000000`'s `up()` body verbatim** — not a bare
 * `DROP FUNCTION`. Per design §11.4, MySQL DDL implicitly commits, so a
 * `DROP` followed by a `CREATE` that then fails leaves **no function at
 * all**; every caller errors outright instead of degrading to a closed
 * gate. `down()`'s body here is exactly the CREATE FUNCTION statement
 * `1787280000000`'s own `up()` sent to MySQL — the version of the function
 * this migration replaces — so it is the copy-pasteable recovery SQL if a
 * shared-environment `up()` fails mid-flight (design §11.4 mitigation/
 * recovery procedure).
 *
 * **`R-IUL-009`'s sibling structural spec** (`src/db/migration-specs/
 * 1789100000000-appendInnovationDevLinkRuleToInnovationUseValidation.spec.ts`)
 * asserts SQL **shape** only — exactly one function named
 * `innovation_use_validation`, `up()` is DROP-then-CREATE, `down()` is
 * non-empty and restorative, rule 16's conjunct is present and
 * enum-interpolated. **It cannot and does not prove rule 16's runtime
 * behavior, nor that rules 2-15 still discriminate correctly** — a mocked
 * `QueryRunner` records SQL text and never evaluates it (`KZ-001`). That
 * proof belongs to T-03's real-MySQL fixture spec alone.
 */
export class AppendInnovationDevLinkRuleToInnovationUseValidation1789100000000
  implements MigrationInterface
{
  name = 'AppendInnovationDevLinkRuleToInnovationUseValidation1789100000000';

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
                AND (tempMeasureViolations = 0)
                AND (
                    EXISTS (
                        SELECT 1 FROM link_results lr
                        INNER JOIN results r2 ON r2.result_id = lr.other_result_id
                        WHERE lr.result_id = result_code
                        AND lr.link_result_role_id = ${LinkResultRolesEnum.INNOVATION_USE_LINKED_DEV}
                        AND lr.is_active = TRUE
                        AND r2.is_active = TRUE
                        AND r2.indicator_id = 2
                    )
                );
        END`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS \`innovation_use_validation\`;`,
    );

    // Restores 1787280000000-updateInnovationUseValidation.ts's up() body
    // verbatim (design §11.3, §11.4) — that migration's own down() restores
    // one version further back (1787078283929's body), so reverting THIS
    // migration must recreate the function IT replaced, never leave none at
    // all.
    //
    // MID-`up()` FAILURE RECOVERY (design §11.4 mitigation/recovery, B-2):
    // if a shared environment's `up()` fails after the `DROP FUNCTION` but
    // before this file's `CREATE FUNCTION` commits, `innovation_use_validation`
    // no longer exists at all and every caller errors outright instead of
    // degrading to a closed gate. Recovery is to immediately re-run the
    // exact `CREATE FUNCTION` statement below against MySQL by hand — it is
    // interpolation-free, so no TypeScript value needs resolving first. The
    // paste-ready copy of this same SQL, wrapped in `DELIMITER` so a plain
    // `mysql` client run does not choke on the body's internal `;`, lives in
    // this spec's runbook: `docs/specs/innovation-use/link-innovation-dev/
    // runbook.md`. Use that file when recovering — it does not depend on
    // having this repo open.
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
}
