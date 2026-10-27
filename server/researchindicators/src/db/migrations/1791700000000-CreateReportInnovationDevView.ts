// @akili-spec docs/specs/innovation-dev/excel-export
import { MigrationInterface, QueryRunner } from 'typeorm';
import { ActorRolesEnum } from '../../domain/entities/actor-roles/enum/actor-roles.enum';
import { DisseminationQualificationsEnum } from '../../domain/entities/dissemination-qualifications/enum/dissemination-qualifications.enum';
import { ExpansionPotentialEnum } from '../../domain/entities/expansion-potentials/enum/expansion-potentials.enum';
import { IndicatorsEnum } from '../../domain/entities/indicators/enum/indicators.enum';
import { InnovationDevAnticipatedUsers } from '../../domain/entities/innovation-dev-anticipated-users/enum/innovation-dev-anticipated-users.enum';
import { InstitutionTypeRoleEnum } from '../../domain/entities/institution-type-roles/enum/institution-type-role.enum';
import { LinkResultRolesEnum } from '../../domain/entities/link-result-roles/enum/link-result-roles.enum';
import { ClarisaActorTypesEnum } from '../../domain/tools/clarisa/entities/clarisa-actor-types/enum/clarisa-actor-types.enum';
import { ClarisaInstitutionTypeEnum } from '../../domain/tools/clarisa/entities/clarisa-institution-types/enum/clarisa-institution-type.enum';

/**
 * Creates `report_innovation_dev` for the Results Center Excel export
 * (docs/specs/innovation-dev/excel-export, design section 3, DD-2, DD-5,
 * DD-6, DD-7). One row per live result. Collections are four
 * LEFT JOIN LATERAL blocks so the outer SELECT stays one row per result.
 *
 * Mandatory gate for any future migration that redefines
 * `innovation_dev_validation`, `valid_text` or `report_field`.
 * The parity fixture is
 * test/fixtures/innovation-dev/report-innovation-dev-view.fixture-spec.ts
 * (T-02). The sibling SQL-text spec proves shape only, not cell values.
 *
 * `down()` drops the view. The baseline definition is not restored (DD-6).
 */
const INDICATOR = `root.indicator_id = ${IndicatorsEnum.INNOVATION_DEV}`;
const USERS_DETERMINED = `${INDICATOR} AND rid.anticipated_users_id = ${InnovationDevAnticipatedUsers.USERS_HAVE_BEEN_DETERMINED}`;
const LEVEL_AT_LEAST_7 = `${INDICATOR} AND cirl.level >= 7`;
const KNOWLEDGE_SHARING_YES = `${LEVEL_AT_LEAST_7} AND rid.is_knowledge_sharing = TRUE`;
const TOOL_BLOCK = `${KNOWLEDGE_SHARING_YES} AND rid.dissemination_qualification_id = ${DisseminationQualificationsEnum.PROCEED}`;
const VARIETY_APPLIES = `${INDICATOR} AND rid.is_new_or_improved_variety = TRUE`;
const ADOPTION_APPLIES = `${TOOL_BLOCK} AND rid.is_used_beyond_original_context IS NOT NULL`;
const EXPANSION_DETAILS_APPLIES = `${LEVEL_AT_LEAST_7} AND rid.expansion_potential_id = ${ExpansionPotentialEnum.YES_WITH_ADAPTATIONS}`;

function applies(expression: string): string {
  return `COALESCE((${expression}), FALSE)`;
}

function catalogName(idExpr: string, nameExpr: string): string {
  return `IF(${idExpr} IS NULL, NULL, COALESCE(NULLIF(${nameExpr}, ''), CONCAT('Unknown (id ', ${idExpr}, ')')))`;
}

function yesNo(column: string): string {
  return `CASE WHEN ${column} IS NULL THEN NULL WHEN ${column} = TRUE THEN 'Yes' ELSE 'No' END`;
}

const READINESS_LEVEL_SQL = `IF(
            rid.innovation_readiness_id IS NULL,
            NULL,
            IF(
              cirl.id IS NULL OR cirl.level IS NULL,
              CONCAT('Unknown (id ', rid.innovation_readiness_id, ')'),
              CONCAT(
                'Level ',
                cirl.level,
                ': ',
                COALESCE(NULLIF(cirl.name, ''), CONCAT('Unknown (id ', cirl.id, ')'))
              )
            )
          )`;

const VARIETIES_COUNT_SQL = `IF(
            rid.new_or_improved_varieties_count > 0,
            CAST(rid.new_or_improved_varieties_count AS CHAR),
            NULL
          )`;

export class CreateReportInnovationDevView1791700000000
  implements MigrationInterface
{
  name = 'CreateReportInnovationDevView1791700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE OR REPLACE VIEW report_innovation_dev AS
      SELECT
        root.result_id AS result_id,
        report_field(
          rid.short_title,
          TRUE,
          ${applies(INDICATOR)}
        ) AS innovation_dev_short_title,
        report_field(
          ${catalogName('rid.innovation_nature_id', 'cic.name')},
          TRUE,
          ${applies(INDICATOR)}
        ) AS innovation_dev_nature,
        report_field(
          ${catalogName('rid.innovation_type_id', 'cit.name')},
          TRUE,
          ${applies(INDICATOR)}
        ) AS innovation_dev_type,
        report_field(
          ${yesNo('rid.is_new_or_improved_variety')},
          FALSE,
          ${applies(INDICATOR)}
        ) AS innovation_dev_is_new_variety,
        report_field(
          ${VARIETIES_COUNT_SQL},
          TRUE,
          ${applies(VARIETY_APPLIES)}
        ) AS innovation_dev_varieties_count,
        report_field(
          ${READINESS_LEVEL_SQL},
          TRUE,
          ${applies(INDICATOR)}
        ) AS innovation_dev_readiness_level,
        report_field(
          rid.innovation_readiness_explanation,
          TRUE,
          ${applies(INDICATOR)}
        ) AS innovation_dev_readiness_explanation,
        report_field(
          ${catalogName('rid.anticipated_users_id', 'idau.name')},
          TRUE,
          ${applies(INDICATOR)}
        ) AS innovation_dev_anticipated_users,
        report_field(
          ${yesNo('rid.no_sex_age_disaggregation')},
          FALSE,
          ${applies(INDICATOR)}
        ) AS innovation_dev_no_sex_age_disaggregation,
        report_field(
          actors_lat.bullet_lines,
          TRUE,
          ${applies(USERS_DETERMINED)}
        ) AS innovation_dev_actors,
        report_field(
          orgs_lat.bullet_lines,
          TRUE,
          ${applies(USERS_DETERMINED)}
        ) AS innovation_dev_organizations,
        report_field(
          rid.intended_beneficiaries_description,
          TRUE,
          ${applies(USERS_DETERMINED)}
        ) AS innovation_dev_beneficiaries,
        report_field(
          rid.expected_outcome,
          TRUE,
          ${applies(USERS_DETERMINED)}
        ) AS innovation_dev_expected_outcome,
        report_field(
          ${yesNo('rid.is_knowledge_sharing')},
          TRUE,
          ${applies(LEVEL_AT_LEAST_7)}
        ) AS innovation_dev_knowledge_sharing,
        report_field(
          ${catalogName('rid.dissemination_qualification_id', 'dq.name')},
          TRUE,
          ${applies(KNOWLEDGE_SHARING_YES)}
        ) AS innovation_dev_dissemination,
        report_field(
          rid.tool_useful_context,
          TRUE,
          ${applies(TOOL_BLOCK)}
        ) AS innovation_dev_tool_useful_context,
        report_field(
          rid.results_achieved_expected,
          TRUE,
          ${applies(TOOL_BLOCK)}
        ) AS innovation_dev_results_achieved_expected,
        report_field(
          tool_functions_lat.bullet_lines,
          TRUE,
          ${applies(TOOL_BLOCK)}
        ) AS innovation_dev_tool_functions,
        report_field(
          ${yesNo('rid.is_used_beyond_original_context')},
          TRUE,
          ${applies(TOOL_BLOCK)}
        ) AS innovation_dev_used_beyond_context,
        report_field(
          rid.adoption_adaptation_context,
          COALESCE(rid.is_used_beyond_original_context = TRUE, FALSE),
          ${applies(ADOPTION_APPLIES)}
        ) AS innovation_dev_adoption_context,
        report_field(
          linked_lat.bullet_lines,
          FALSE,
          ${applies(TOOL_BLOCK)}
        ) AS innovation_dev_linked_tools,
        report_field(
          rid.other_tools,
          FALSE,
          ${applies(TOOL_BLOCK)}
        ) AS innovation_dev_other_tools,
        report_field(
          rid.other_tools_integration,
          FALSE,
          ${applies(TOOL_BLOCK)}
        ) AS innovation_dev_other_tools_integration,
        report_field(
          CAST(rid.is_cheaper_than_alternatives AS CHAR),
          FALSE,
          ${applies(LEVEL_AT_LEAST_7)}
        ) AS innovation_dev_cheaper,
        report_field(
          CAST(rid.is_simpler_to_use AS CHAR),
          FALSE,
          ${applies(LEVEL_AT_LEAST_7)}
        ) AS innovation_dev_simpler,
        report_field(
          CAST(rid.does_perform_better AS CHAR),
          FALSE,
          ${applies(LEVEL_AT_LEAST_7)}
        ) AS innovation_dev_performs_better,
        report_field(
          CAST(rid.is_desirable_to_users AS CHAR),
          FALSE,
          ${applies(LEVEL_AT_LEAST_7)}
        ) AS innovation_dev_desirable,
        report_field(
          CAST(rid.has_commercial_viability AS CHAR),
          FALSE,
          ${applies(LEVEL_AT_LEAST_7)}
        ) AS innovation_dev_commercial_viability,
        report_field(
          CAST(rid.has_suitable_enabling_environment AS CHAR),
          FALSE,
          ${applies(LEVEL_AT_LEAST_7)}
        ) AS innovation_dev_enabling_environment,
        report_field(
          CAST(rid.has_evidence_of_uptake AS CHAR),
          FALSE,
          ${applies(LEVEL_AT_LEAST_7)}
        ) AS innovation_dev_evidence_of_uptake,
        report_field(
          ${catalogName('rid.expansion_potential_id', 'ep.name')},
          FALSE,
          ${applies(LEVEL_AT_LEAST_7)}
        ) AS innovation_dev_expansion_potential,
        report_field(
          rid.expansion_adaptation_details,
          FALSE,
          ${applies(EXPANSION_DETAILS_APPLIES)}
        ) AS innovation_dev_expansion_details
      FROM results root
      LEFT JOIN result_innovation_dev rid
        ON rid.result_id = root.result_id
        AND rid.is_active = TRUE
      LEFT JOIN clarisa_innovation_characteristics cic
        ON cic.id = rid.innovation_nature_id
      LEFT JOIN clarisa_innovation_types cit
        ON cit.code = rid.innovation_type_id
      LEFT JOIN clarisa_innovation_readiness_levels cirl
        ON cirl.id = rid.innovation_readiness_id
      LEFT JOIN innovation_dev_anticipated_users idau
        ON idau.id = rid.anticipated_users_id
      LEFT JOIN dissemination_qualifications dq
        ON dq.id = rid.dissemination_qualification_id
      LEFT JOIN expansion_potentials ep
        ON ep.id = rid.expansion_potential_id
      LEFT JOIN LATERAL (
        SELECT GROUP_CONCAT(
          IF(
            ra.actor_type_id IS NULL,
            CONCAT('• ', report_field(NULL, TRUE, TRUE)),
            CONCAT_WS(
              '',
              '• ',
              COALESCE(
                NULLIF(cat.name, ''),
                CONCAT('Unknown (id ', ra.actor_type_id, ')')
              ),
              IF(
                ra.actor_type_id = ${ClarisaActorTypesEnum.OTHER},
                CONCAT(
                  ': ',
                  IF(
                    ra.actor_type_custom_name IS NOT NULL,
                    ra.actor_type_custom_name,
                    report_field(NULL, TRUE, TRUE)
                  )
                ),
                NULL
              ),
              IF(
                ra.sex_age_disaggregation_not_apply = TRUE,
                ' — Sex and age disaggregation not applicable',
                CONCAT(
                  ' — ',
                  NULLIF(
                    CONCAT_WS(
                      ', ',
                      IF(ra.women_youth = TRUE, 'Women (youth)', NULL),
                      IF(ra.women_not_youth = TRUE, 'Women (non-youth)', NULL),
                      IF(ra.men_youth = TRUE, 'Men (youth)', NULL),
                      IF(ra.men_not_youth = TRUE, 'Men (non-youth)', NULL)
                    ),
                    ''
                  )
                )
              )
            )
          )
          ORDER BY ra.result_actors_id
          SEPARATOR '\n'
        ) AS bullet_lines
        FROM result_actors ra
        LEFT JOIN clarisa_actor_types cat
          ON cat.code = ra.actor_type_id
        WHERE root.indicator_id = ${IndicatorsEnum.INNOVATION_DEV}
          AND ra.result_id = root.result_id
          AND ra.actor_role_id = ${ActorRolesEnum.INNOVATION_DEV}
          AND ra.is_active = TRUE
      ) AS actors_lat ON TRUE
      LEFT JOIN LATERAL (
        SELECT GROUP_CONCAT(
          IF(
            rit.is_organization_known = TRUE,
            IF(
              rit.institution_id IS NULL,
              CONCAT('• ', report_field(NULL, TRUE, TRUE)),
              CONCAT(
                '• ',
                CONCAT_WS(
                  ' - ',
                  IF(valid_text(ci.acronym), ci.acronym, NULL),
                  COALESCE(
                    NULLIF(ci.name, ''),
                    CONCAT('Unknown (id ', rit.institution_id, ')')
                  )
                )
              )
            ),
            IF(
              rit.institution_type_id = ${ClarisaInstitutionTypeEnum.OTHER},
              CONCAT(
                '• ',
                COALESCE(
                  NULLIF(parent_type.name, ''),
                  CONCAT('Unknown (id ', rit.institution_type_id, ')')
                ),
                ' (',
                IF(
                  rit.institution_type_custom_name IS NOT NULL,
                  rit.institution_type_custom_name,
                  report_field(NULL, TRUE, TRUE)
                ),
                ')'
              ),
              IF(
                rit.institution_type_id IS NOT NULL,
                IF(
                  (
                    SELECT COUNT(child_type.code)
                    FROM clarisa_institution_types child_type
                    WHERE child_type.parent_code = rit.institution_type_id
                  ) > 0,
                  CONCAT(
                    '• ',
                    COALESCE(
                      NULLIF(parent_type.name, ''),
                      CONCAT('Unknown (id ', rit.institution_type_id, ')')
                    ),
                    ' > ',
                    IF(
                      rit.sub_institution_type_id IS NULL,
                      report_field(NULL, TRUE, TRUE),
                      COALESCE(
                        NULLIF(sub_type.name, ''),
                        CONCAT(
                          'Unknown (id ',
                          rit.sub_institution_type_id,
                          ')'
                        )
                      )
                    )
                  ),
                  CONCAT(
                    '• ',
                    COALESCE(
                      NULLIF(parent_type.name, ''),
                      CONCAT('Unknown (id ', rit.institution_type_id, ')')
                    )
                  )
                ),
                CONCAT('• ', report_field(NULL, TRUE, TRUE))
              )
            )
          )
          ORDER BY rit.result_institution_type_id
          SEPARATOR '\n'
        ) AS bullet_lines
        FROM result_institution_types rit
        LEFT JOIN clarisa_institutions ci
          ON ci.code = rit.institution_id
        LEFT JOIN clarisa_institution_types parent_type
          ON parent_type.code = rit.institution_type_id
        LEFT JOIN clarisa_institution_types sub_type
          ON sub_type.code = rit.sub_institution_type_id
        WHERE root.indicator_id = ${IndicatorsEnum.INNOVATION_DEV}
          AND rit.result_id = root.result_id
          AND rit.institution_type_role_id = ${InstitutionTypeRoleEnum.INNOVATION_DEV}
          AND rit.is_active = TRUE
      ) AS orgs_lat ON TRUE
      LEFT JOIN LATERAL (
        SELECT GROUP_CONCAT(
          CONCAT(
            '• ',
            IF(
              NULLIF(tf.name, '') IS NOT NULL,
              NULLIF(tf.name, ''),
              IF(
                ritf.tool_function_id IS NOT NULL,
                CONCAT('Unknown (id ', ritf.tool_function_id, ')'),
                ''
              )
            )
          )
          ORDER BY ritf.innovation_tool_function_id
          SEPARATOR '\n'
        ) AS bullet_lines
        FROM result_innovation_tool_function ritf
        LEFT JOIN tool_functions tf
          ON tf.id = ritf.tool_function_id
        WHERE root.indicator_id = ${IndicatorsEnum.INNOVATION_DEV}
          AND ritf.result_id = root.result_id
          AND ritf.is_active = TRUE
      ) AS tool_functions_lat ON TRUE
      LEFT JOIN LATERAL (
        SELECT GROUP_CONCAT(
          CONCAT(
            '• ',
            IFNULL(
              CONCAT_WS(
                ' - ',
                CONCAT_WS(
                  '-',
                  r2.platform_code,
                  CAST(r2.result_official_code AS CHAR)
                ),
                r2.title
              ),
              ''
            )
          )
          ORDER BY lr.link_result_id
          SEPARATOR '\n'
        ) AS bullet_lines
        FROM link_results lr
        INNER JOIN results r2
          ON r2.result_id = lr.other_result_id
          AND r2.is_active = TRUE
        WHERE root.indicator_id = ${IndicatorsEnum.INNOVATION_DEV}
          AND lr.result_id = root.result_id
          AND lr.link_result_role_id = ${LinkResultRolesEnum.INNOVATION_DEV}
          AND lr.is_active = TRUE
      ) AS linked_lat ON TRUE
      WHERE root.is_active = TRUE
        AND root.is_snapshot = FALSE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP VIEW IF EXISTS report_innovation_dev');
  }
}
