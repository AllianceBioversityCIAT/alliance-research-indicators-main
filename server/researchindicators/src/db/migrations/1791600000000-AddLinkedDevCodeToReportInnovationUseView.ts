// @akili-spec docs/specs/innovation-use/excel-export
import { MigrationInterface, QueryRunner } from 'typeorm';
import { CreateReportInnovationUseView1791300000000 } from './1791300000000-CreateReportInnovationUseView';
import { ActorRolesEnum } from '../../domain/entities/actor-roles/enum/actor-roles.enum';
import { IndicatorsEnum } from '../../domain/entities/indicators/enum/indicators.enum';
import { InstitutionTypeRoleEnum } from '../../domain/entities/institution-type-roles/enum/institution-type-role.enum';
import { LinkResultRolesEnum } from '../../domain/entities/link-result-roles/enum/link-result-roles.enum';
import { QuantificationRolesEnum } from '../../domain/entities/quantification-roles/enum/quantification-roles.enum';

/**
 * Adds `innovation_use_linked_dev_code` at the end of `report_innovation_use`
 * (docs/specs/innovation-use/excel-export, design section 3.2a, DD-8).
 * Every other column, filter and lateral stays the definition from
 * CreateReportInnovationUseView1791300000000. `down()` runs that migration
 * `up()` so the previous view returns without dropping it.
 *
 * Mandatory gate for any future migration that redefines
 * `innovation_use_validation`, `valid_text` or `report_field`
 * (requirements R3). The parity fixture is
 * test/fixtures/innovation-use/report-innovation-use-view.fixture-spec.ts
 * (T-02). The sibling SQL-text spec proves shape only, not cell values.
 *
 * Actor type Other is the literal 5 the green check already compares.
 * There is no enum for clarisa actor types.
 */
export class AddLinkedDevCodeToReportInnovationUseView1791600000000
  implements MigrationInterface
{
  name = 'AddLinkedDevCodeToReportInnovationUseView1791600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE OR REPLACE VIEW report_innovation_use AS
      SELECT
        root.result_id AS result_id,
        report_field(
          IF(
            riu.innovation_use_level_id IS NULL,
            NULL,
            IF(
              ciul.id IS NULL OR ciul.level IS NULL,
              CONCAT('Unknown (id ', riu.innovation_use_level_id, ')'),
              CONCAT(
                'Level ',
                ciul.level,
                ': ',
                COALESCE(ciul.name, CONCAT('Unknown (id ', ciul.id, ')'))
              )
            )
          ),
          TRUE,
          root.indicator_id = ${IndicatorsEnum.INNOVATION_USE}
        ) AS innovation_use_level,
        report_field(
          riu.innovation_use_level_explanation,
          TRUE,
          root.indicator_id = ${IndicatorsEnum.INNOVATION_USE}
            AND COALESCE(ciul.level >= 6, FALSE)
        ) AS innovation_use_level_explanation,
        report_field(
          actors_lat.bullet_lines,
          FALSE,
          root.indicator_id = ${IndicatorsEnum.INNOVATION_USE}
        ) AS innovation_use_actors,
        report_field(
          orgs_lat.bullet_lines,
          FALSE,
          root.indicator_id = ${IndicatorsEnum.INNOVATION_USE}
        ) AS innovation_use_organizations,
        report_field(
          quants_lat.bullet_lines,
          FALSE,
          root.indicator_id = ${IndicatorsEnum.INNOVATION_USE}
        ) AS innovation_use_quantifications,
        report_field(
          linked_lat.label,
          TRUE,
          root.indicator_id = ${IndicatorsEnum.INNOVATION_USE}
        ) AS innovation_use_linked_dev,
        report_field(
          linked_lat.readiness,
          FALSE,
          root.indicator_id = ${IndicatorsEnum.INNOVATION_USE}
            AND linked_lat.link_result_id IS NOT NULL
        ) AS innovation_use_linked_dev_readiness,
        report_field(
          linked_lat.dev_description,
          FALSE,
          root.indicator_id = ${IndicatorsEnum.INNOVATION_USE}
            AND linked_lat.link_result_id IS NOT NULL
        ) AS innovation_use_linked_dev_description,
        report_field(
          linked_lat.geo_name,
          FALSE,
          root.indicator_id = ${IndicatorsEnum.INNOVATION_USE}
            AND linked_lat.link_result_id IS NOT NULL
        ) AS innovation_use_linked_dev_geo_scope,
        linked_lat.dev_code AS innovation_use_linked_dev_code
      FROM results root
      LEFT JOIN result_innovation_use riu
        ON riu.result_id = root.result_id
        AND riu.is_active = TRUE
      LEFT JOIN clarisa_innovation_use_levels ciul
        ON ciul.id = riu.innovation_use_level_id
      LEFT JOIN LATERAL (
        SELECT GROUP_CONCAT(
          CONCAT_WS(
            '',
            '• ',
            IF(
              ra.actor_type_id IS NULL,
              report_field(NULL, FALSE, TRUE),
              COALESCE(cat.name, CONCAT('Unknown (id ', ra.actor_type_id, ')'))
            ),
            IF(
              ra.actor_type_id = 5,
              CONCAT(': ', report_field(ra.actor_type_custom_name, TRUE, TRUE)),
              NULL
            ),
            IF(
              ra.sex_age_disaggregation_not_apply = TRUE,
              CONCAT(
                ' — Total: ',
                report_field(
                  IF(
                    ra.actors_count IS NOT NULL AND ra.actors_count > 0,
                    CAST(ra.actors_count AS CHAR),
                    NULL
                  ),
                  TRUE,
                  TRUE
                ),
                ' (sex and age disaggregation not applicable)'
              ),
              CONCAT(
                ' — Women (youth): ',
                report_field(CAST(ra.women_youth_count AS CHAR), TRUE, TRUE),
                '; Women (non-youth): ',
                report_field(CAST(ra.women_not_youth_count AS CHAR), TRUE, TRUE),
                '; Men (youth): ',
                report_field(CAST(ra.men_youth_count AS CHAR), TRUE, TRUE),
                '; Men (non-youth): ',
                report_field(CAST(ra.men_not_youth_count AS CHAR), TRUE, TRUE),
                '; Total: ',
                report_field(
                  IF(
                    (
                      COALESCE(ra.women_youth_count, 0)
                      + COALESCE(ra.women_not_youth_count, 0)
                      + COALESCE(ra.men_youth_count, 0)
                      + COALESCE(ra.men_not_youth_count, 0)
                    ) > 0,
                    CAST(
                      (
                        COALESCE(ra.women_youth_count, 0)
                        + COALESCE(ra.women_not_youth_count, 0)
                        + COALESCE(ra.men_youth_count, 0)
                        + COALESCE(ra.men_not_youth_count, 0)
                      ) AS CHAR
                    ),
                    NULL
                  ),
                  TRUE,
                  TRUE
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
        WHERE root.indicator_id = ${IndicatorsEnum.INNOVATION_USE}
          AND ra.result_id = root.result_id
          AND ra.actor_role_id = ${ActorRolesEnum.INNOVATION_USE}
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
                  COALESCE(ci.name, CONCAT('Unknown (id ', rit.institution_id, ')'))
                )
              )
            ),
            CONCAT_WS(
              '',
              '• ',
              IF(
                rit.institution_type_id IS NULL,
                report_field(NULL, TRUE, TRUE),
                COALESCE(
                  parent_type.name,
                  CONCAT('Unknown (id ', rit.institution_type_id, ')')
                )
              ),
              IF(
                rit.sub_institution_type_id IS NOT NULL
                OR EXISTS (
                  SELECT 1 FROM clarisa_institution_types t
                  WHERE t.code = rit.institution_type_id
                    AND t.parent_code IS NULL
                    AND t.is_active = TRUE
                    AND EXISTS (
                      SELECT 1 FROM clarisa_institution_types c
                      WHERE c.parent_code = t.code
                    )
                ),
                CONCAT(
                  ' > ',
                  IF(
                    rit.sub_institution_type_id IS NULL
                    OR NOT EXISTS (
                      SELECT 1 FROM clarisa_institution_types c
                      WHERE c.code = rit.sub_institution_type_id
                        AND c.parent_code = rit.institution_type_id
                    ),
                    report_field(NULL, TRUE, TRUE),
                    COALESCE(
                      sub_type.name,
                      CONCAT('Unknown (id ', rit.sub_institution_type_id, ')')
                    )
                  )
                ),
                NULL
              ),
              IF(
                valid_text(rit.institution_type_custom_name),
                CONCAT(' (', rit.institution_type_custom_name, ')'),
                NULL
              ),
              ' — Number of organizations: ',
              report_field(
                IF(
                  rit.organization_count IS NOT NULL AND rit.organization_count > 0,
                  CAST(rit.organization_count AS CHAR),
                  NULL
                ),
                TRUE,
                TRUE
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
        WHERE root.indicator_id = ${IndicatorsEnum.INNOVATION_USE}
          AND rit.result_id = root.result_id
          AND rit.institution_type_role_id = ${InstitutionTypeRoleEnum.INNOVATION_USE}
          AND rit.is_active = TRUE
      ) AS orgs_lat ON TRUE
      LEFT JOIN LATERAL (
        SELECT GROUP_CONCAT(
          CONCAT_WS(
            '',
            '• Number: ',
            report_field(
              IF(
                rq.quantification_number IS NOT NULL
                  AND rq.quantification_number <> 0,
                IF(
                  rq.quantification_number = TRUNCATE(rq.quantification_number, 0),
                  CAST(TRUNCATE(rq.quantification_number, 0) AS CHAR),
                  TRIM(TRAILING '0' FROM rq.quantification_number)
                ),
                NULL
              ),
              TRUE,
              TRUE
            ),
            ', Unit: ',
            report_field(rq.unit, TRUE, TRUE),
            ', Comment: ',
            report_field(rq.description, FALSE, TRUE)
          )
          ORDER BY rq.id
          SEPARATOR '\n'
        ) AS bullet_lines
        FROM result_quantifications rq
        WHERE root.indicator_id = ${IndicatorsEnum.INNOVATION_USE}
          AND rq.result_id = root.result_id
          AND rq.quantification_role_id = ${QuantificationRolesEnum.INNOVATION_USE}
          AND rq.is_active = TRUE
      ) AS quants_lat ON TRUE
      LEFT JOIN LATERAL (
        SELECT
          lr.link_result_id AS link_result_id,
          CONCAT_WS(
            ' - ',
            CONCAT_WS(
              '-',
              r2.platform_code,
              CAST(r2.result_official_code AS CHAR)
            ),
            r2.title
          ) AS label,
          IF(
            rid.innovation_readiness_id IS NULL,
            NULL,
            IF(
              cirl.id IS NULL OR cirl.level IS NULL,
              CONCAT('Unknown (id ', rid.innovation_readiness_id, ')'),
              CONCAT(
                'Level ',
                cirl.level,
                ': ',
                COALESCE(cirl.name, CONCAT('Unknown (id ', cirl.id, ')'))
              )
            )
          ) AS readiness,
          r2.description AS dev_description,
          IF(
            r2.geo_scope_id IS NULL,
            NULL,
            COALESCE(cgs.name, CONCAT('Unknown (id ', r2.geo_scope_id, ')'))
          ) AS geo_name,
          CONCAT(
            r2.platform_code,
            '-',
            CAST(r2.result_official_code AS CHAR)
          ) AS dev_code
        FROM link_results lr
        INNER JOIN results r2
          ON r2.result_id = lr.other_result_id
          AND r2.is_active = TRUE
          AND r2.indicator_id = ${IndicatorsEnum.INNOVATION_DEV}
        LEFT JOIN result_innovation_dev rid
          ON rid.result_id = r2.result_id
          AND rid.is_active = TRUE
        LEFT JOIN clarisa_innovation_readiness_levels cirl
          ON cirl.id = rid.innovation_readiness_id
        LEFT JOIN clarisa_geo_scope cgs
          ON cgs.code = r2.geo_scope_id
        WHERE root.indicator_id = ${IndicatorsEnum.INNOVATION_USE}
          AND lr.result_id = root.result_id
          AND lr.link_result_role_id = ${LinkResultRolesEnum.INNOVATION_USE_LINKED_DEV}
          AND lr.is_active = TRUE
        ORDER BY lr.link_result_id DESC
        LIMIT 1
      ) AS linked_lat ON TRUE
      WHERE root.is_active = TRUE
        AND root.is_snapshot = FALSE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await new CreateReportInnovationUseView1791300000000().up(queryRunner);
  }
}
