# Recovery: `innovation_use_validation` missing mid-migration

**Use this when:** migration `1789100000000-appendInnovationDevLinkRuleToInnovationUseValidation`'s
`up()` fails *after* its `DROP FUNCTION` but *before* its `CREATE FUNCTION` commits (design
§11.4). MySQL DDL implicitly commits, so at that point `innovation_use_validation` does not
exist at all and every caller errors outright. Run the SQL below immediately to restore the
function this migration was replacing (`1787280000000`'s version — rule 16 not yet applied).
This is a stopgap: once the environment is stable, still fix and re-run the migration properly.

## Run it

Paste the whole block into a `mysql` client connected to the affected database. `DELIMITER` is
required because the function body itself contains `;` — without it the client stops at the
first one.

```sql
DELIMITER //

CREATE FUNCTION `innovation_use_validation`(result_code BIGINT) RETURNS tinyint(1)
    READS SQL DATA
BEGIN
    DECLARE commonFields BOOLEAN DEFAULT FALSE;
    DECLARE useLevel BIGINT DEFAULT NULL;
    DECLARE explanationValid BOOLEAN DEFAULT FALSE;
    DECLARE tempActorViolations INT DEFAULT NULL;
    DECLARE tempOrganizationViolations INT DEFAULT NULL;
    DECLARE tempMeasureViolations INT DEFAULT NULL;

    -- Constraint 1 (C-5): rules 14-15, copied verbatim from the
    -- createInnovationUseValidation migration.
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
END//

DELIMITER ;
```

## After running it

| Check | Expected |
|---|---|
| `SHOW CREATE FUNCTION innovation_use_validation;` | Returns the function above, no error |
| A read against any Innovation Use result | No longer errors — green/red check resumes working |

This restores the function **without** rule 16 (the Innovation-Dev link requirement) — that is
expected; it is the version being replaced, used only to stop the bleeding. Once the environment
is stable, apply `1789100000000-appendInnovationDevLinkRuleToInnovationUseValidation`'s `up()`
properly to bring rule 16 back.

## Source of truth

This SQL is copied from this migration's own `down()` method:
`server/researchindicators/src/db/migrations/1789100000000-appendInnovationDevLinkRuleToInnovationUseValidation.ts`.
If the two ever disagree, the migration file wins — update this runbook to match it, never the
other way around.
