import { dataSource } from '../../../src/db/config/mysql/orm.test.config';

/**
 * T-12 (`docs/specs/innovation-use/data-model-and-catalog`) — F12, §6.5.
 * Backs R-IU-006 AC.9.
 *
 * F12 is a **stored-function comparison**, not a routine gate — it
 * executes no routine (that is F16, in T-13). None of M1–M6 in this chunk
 * DROP/CREATE or otherwise mention `innovation_dev_validation` — its last
 * defining migration is
 * `1758125999162-AdaptInnovationDevValidationToManyToolFunctions.ts`, which
 * predates this chunk's baseline snapshot and ships unmodified inside it.
 * This fixture proves that "before M1–M6" and "after M1–M6" are the SAME
 * function body by comparing the LIVE `SHOW CREATE FUNCTION
 * innovation_dev_validation` body (queried against the fully-migrated
 * scratch schema — the "after" state) against an expected string copied
 * verbatim from that migration file's `up()` (the "before" state, and an
 * independent source of truth per the `tdd` skill's anti-tautology rule —
 * it is not derived from the live query it is checked against).
 *
 * Whitespace is collapsed before comparison on both sides, since MySQL's
 * `SHOW CREATE FUNCTION` output is not guaranteed byte-identical to the
 * original `CREATE FUNCTION` statement's incidental formatting, only to its
 * significant content — the same normalization used for the F12 red/green
 * mutation demonstration reported in T-12's execution note.
 */
describe('innovation_dev_validation body is unchanged by M1-M6 (T-12, F12)', () => {
  afterAll(async () => {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  });

  // Copied verbatim from
  // `1758125999162-AdaptInnovationDevValidationToManyToolFunctions.ts`
  // `up()`, between `BEGIN` and `END` — the "before M1-M6" state, and this
  // fixture's independent source of truth.
  const expectedBody = `
            DECLARE commonFields BOOLEAN DEFAULT FALSE;
            DECLARE anticipatedUserId BIGINT DEFAULT NULL;
            DECLARE tempSecondFields BOOLEAN DEFAULT FALSE;
            DECLARE tempActors INT DEFAULT NULL;
            DECLARE tempFullActors INT DEFAULT NULL;
            DECLARE tempInstitutionType INT DEFAULT NULL;
            DECLARE tempFullInstitutionType INT DEFAULT NULL;
            DECLARE knowledgeSharing BOOLEAN DEFAULT FALSE;
            DECLARE readinessLevel BIGINT DEFAULT NULL;

            SELECT
                (valid_text(rid.short_title) AND
                rid.innovation_nature_id IS NOT NULL AND
                rid.innovation_type_id IS NOT NULL AND
                rid.innovation_readiness_id IS NOT NULL AND
                valid_text(rid.innovation_readiness_explanation) AND
                IF(rid.is_new_or_improved_variety = TRUE, rid.new_or_improved_varieties_count > 0, TRUE) AND
                rid.anticipated_users_id IS NOT NULL),
                rid.anticipated_users_id,
                (valid_text(rid.expected_outcome) AND
                valid_text(rid.intended_beneficiaries_description)),
                IF(rid.is_knowledge_sharing = TRUE AND rid.is_knowledge_sharing IS NOT NULL,
                    IF(rid.dissemination_qualification_id IS NOT NULL AND rid.dissemination_qualification_id = 2,
                        valid_text(rid.tool_useful_context)
                        AND valid_text(rid.results_achieved_expected)
                        AND EXISTS (
                            SELECT 1
                            FROM result_innovation_tool_function ritf
                            WHERE ritf.result_id = rid.result_id
                            AND ritf.is_active = TRUE
                        )
                        AND IF(rid.is_used_beyond_original_context = TRUE,
                            valid_text(rid.adoption_adaptation_context),
                            IF(rid.is_used_beyond_original_context IS NULL, FALSE, TRUE)
                        ),
                        IF(rid.dissemination_qualification_id IS NULL, FALSE, TRUE)
                    ),
                    IF(rid.is_knowledge_sharing IS NULL, FALSE, TRUE)
                ),
                cirl.level
            INTO
                commonFields,
                anticipatedUserId,
                tempSecondFields,
                knowledgeSharing,
                readinessLevel
            FROM results r
            INNER JOIN result_innovation_dev rid ON r.result_id = rid.result_id
            LEFT JOIN clarisa_innovation_readiness_levels cirl ON cirl.id = rid.innovation_readiness_id
            WHERE r.result_id = result_code
            AND r.is_active = TRUE
            LIMIT 1;

            SELECT COUNT(ra.result_actors_id)
            INTO tempFullActors
            FROM result_actors ra
            WHERE ra.result_id = result_code
            AND ra.is_active = TRUE;

            SELECT IFNULL(
                    SUM(
                        CASE
                            WHEN ra.actor_type_id = 5 THEN ra.actor_type_custom_name IS NOT NULL
                            ELSE ra.actor_type_id IS NOT NULL
                        END
                    ), FALSE)
            INTO tempActors
            FROM result_actors ra
            WHERE ra.result_id = result_code
            AND ra.is_active = TRUE;

            SELECT IFNULL(SUM(CASE
                WHEN rit.is_organization_known = TRUE THEN rit.institution_id IS NOT NULL
                ELSE (CASE
                    WHEN rit.institution_type_id = 78 THEN rit.institution_type_custom_name IS NOT NULL
                    WHEN (rit.institution_type_id != 78 AND rit.institution_type_id IS NOT NULL) THEN CASE
                        WHEN (SELECT COUNT(cit.code) FROM clarisa_institution_types cit WHERE cit.parent_code = rit.institution_type_id) > 0 THEN rit.sub_institution_type_id IS NOT NULL
                        ELSE rit.institution_type_id IS NOT NULL
                        END
                    ELSE FALSE
                    END)
                END), FALSE)
            INTO tempInstitutionType
            FROM result_institution_types rit
            WHERE rit.result_id = result_code
            AND rit.is_active = TRUE;

            SELECT count(rit.result_institution_type_id)
            INTO tempFullInstitutionType
            FROM result_institution_types rit
            WHERE rit.result_id = result_code
            AND rit.is_active = TRUE;

            RETURN IF(anticipatedUserId = 1 OR anticipatedUserId IS NULL, TRUE, (tempInstitutionType = tempFullInstitutionType) AND
                (tempInstitutionType > 0) AND
                (tempFullActors = tempActors) AND
                (tempActors > 0) AND
                tempSecondFields)
                AND commonFields
                AND IF(readinessLevel >= 7, knowledgeSharing, TRUE);
        `;

  function normalize(sql: string): string {
    return sql.replace(/\s+/g, ' ').trim();
  }

  function extractBody(createFunctionSql: string): string {
    const beginIndex = createFunctionSql.indexOf('BEGIN');
    const endIndex = createFunctionSql.lastIndexOf('END');
    expect(beginIndex).toBeGreaterThan(-1);
    expect(endIndex).toBeGreaterThan(beginIndex);
    return createFunctionSql.slice(beginIndex + 'BEGIN'.length, endIndex);
  }

  it('has the same body after M1-M6 as it did before them (R-IU-006 AC.9)', async () => {
    await dataSource.initialize();

    const [row] = await dataSource.query(
      'SHOW CREATE FUNCTION innovation_dev_validation',
    );
    const liveCreateStatement: string = row['Create Function'];
    const liveBody = normalize(extractBody(liveCreateStatement));

    expect(liveBody).toBe(normalize(expectedBody));
  });
});
