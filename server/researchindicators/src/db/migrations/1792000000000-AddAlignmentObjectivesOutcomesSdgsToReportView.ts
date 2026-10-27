import { MigrationInterface, QueryRunner } from 'typeorm';
import { IndicatorsEnum } from '../../domain/entities/indicators/enum/indicators.enum';
import { ResultImpactOutcomeRolesEnum } from '../../domain/entities/result-impact-outcomes/enum/result-impact-outcome-roles.enum';
import { ResultStrategicObjectiveRolesEnum } from '../../domain/entities/result-strategic-objectives/enum/result-strategic-objective-roles.enum';

/**
 * Adds `strategic_objectives`, `impact_outcomes` and `sdgs` to
 * `report_alliance_alignment` for the STAR Excel export. Each column follows
 * the `alignment_validation` green check (IncludeInnovationUseImpactOutcomes1788972162238):
 * - strategic_objectives: required on Portfolio 2, Not applicable on Portfolio 1.
 * - impact_outcomes: required on Portfolio 2 for Policy Change, OICR and
 *   Innovation Use, Not applicable otherwise.
 * - sdgs (Contribution to SDG, `result_sdgs`): required on every indicator
 *   except OICR, which reports SDG targets instead.
 * A result without a reporting year has no portfolio and reads Not applicable
 * on the first two.
 *
 * It also corrects `sdg_targets` (Contribution to SDG targets):
 * - The catalog was joined on the row's own key
 *   (`result_lever_sdg_target_id`) instead of `sdg_target_id`, so the column
 *   named a target other than the one selected.
 * - Portfolio 2 targets are stored without a lever (`result_lever_id` NULL,
 *   `result_id` set) and were never read. They now print as
 *   `• code - target`; Portfolio 1 keeps `• (lever) - code - target`.
 * - The form only asks for SDG targets on OICR, so every other indicator now
 *   reads Not applicable instead of Not provided. Every other column stays the definition from
 * UpdateDateFormat1777046263538, which `down()` restores verbatim.
 */
export class AddAlignmentObjectivesOutcomesSdgsToReportView1792000000000
  implements MigrationInterface
{
  name = 'AddAlignmentObjectivesOutcomesSdgsToReportView1792000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE OR REPLACE VIEW report_alliance_alignment AS
                SELECT 
                    root.result_id,
                    report_field(pp.project, TRUE, NULL) AS primary_project,
                    report_field(pp.principal_investigator, TRUE, NULL) AS primary_project_principal_investigator,
                    report_field(pp.start_date , TRUE, NULL) AS primary_project_start_date,
                    report_field(pp.end_date  , TRUE, NULL) AS primary_project_end_date,
                    report_field(cp.projects, FALSE, NULL) AS contributing_projects,
                    report_field(rl.primary_lever , TRUE, NULL) AS primary_lever,
                    report_field(rl.contributor_lever , FALSE, NULL) AS contributor_lever,
                    report_field(sdt.sdg_targets , TRUE, root.indicator_id = ${IndicatorsEnum.OICR}) AS sdg_targets,
                    report_field(so.strategic_outcome , TRUE, root.indicator_id IN (5)) AS strategic_outcomes,
                    report_field(
                        sob.strategic_objectives,
                        TRUE,
                        COALESCE(get_portfolio_id_by_result(root.result_id) = 2, FALSE)
                    ) AS strategic_objectives,
                    report_field(
                        iot.impact_outcomes,
                        TRUE,
                        COALESCE(get_portfolio_id_by_result(root.result_id) = 2, FALSE)
                            AND root.indicator_id IN (${IndicatorsEnum.POLICY_CHANGE}, ${IndicatorsEnum.OICR}, ${IndicatorsEnum.INNOVATION_USE})
                    ) AS impact_outcomes,
                    report_field(
                        sdg.sdgs,
                        TRUE,
                        root.indicator_id <> ${IndicatorsEnum.OICR}
                    ) AS sdgs
                FROM results root
                    LEFT JOIN (SELECT 
                                    rc.result_id,
                                    CONCAT_WS('', '[',ac.agreement_id, '] ',ac.description) AS project,
                                    ac.project_lead_description AS principal_investigator,
                                    DATE_FORMAT(ac.start_date, '%Y-%m-%d') AS start_date,
                                    DATE_FORMAT(ac.end_date, '%Y-%m-%d') AS end_date  
                                FROM result_contracts rc
                                    LEFT JOIN agresso_contracts ac ON ac.agreement_id = rc.contract_id 
                                WHERE rc.is_primary = TRUE
                                    AND rc.is_active = TRUE
                                GROUP BY rc.result_id 
                                ORDER BY rc.updated_by DESC) AS pp ON pp.result_id = root.result_id 
                    LEFT JOIN (SELECT 
                                    rc.result_id,
                                    GROUP_CONCAT(CONCAT_WS('', '• [',ac.agreement_id, '] ',ac.description) SEPARATOR '\n') AS projects
                                FROM result_contracts rc
                                    LEFT JOIN agresso_contracts ac ON ac.agreement_id = rc.contract_id 
                                WHERE rc.is_primary = FALSE
                                    AND rc.is_active = TRUE
                                GROUP BY rc.result_id 
                                ORDER BY rc.updated_by DESC) AS cp ON cp.result_id = root.result_id 
                    LEFT JOIN (SELECT 
                                    rl.result_id,
                                    GROUP_CONCAT(
                                       CASE WHEN rl.is_primary  = TRUE THEN cl.short_name END
                                       ORDER BY rl.lever_id 
                                       SEPARATOR ', '
                                    ) AS primary_lever,
                                    GROUP_CONCAT(
                                       CASE WHEN rl.is_primary  = FALSE THEN cl.short_name END
                                       ORDER BY rl.lever_id 
                                       SEPARATOR ', '
                                    ) AS contributor_lever
                                FROM result_levers rl 
                                    LEFT JOIN clarisa_levers cl ON cl.id = rl.lever_id 
                                WHERE rl.is_active = TRUE
                                GROUP BY rl.result_id) AS rl ON rl.result_id = root.result_id
                    LEFT JOIN (SELECT
                                    COALESCE(rl.result_id, rlst.result_id) AS result_id,
                                    GROUP_CONCAT(
                                        CONCAT_WS('', '• ', IF(cl.short_name IS NULL, NULL, CONCAT('(', cl.short_name, ') - ')), cst.sdg_target_code, ' - ', cst.sdg_target)
                                        ORDER BY rl.lever_id, cst.id
                                        SEPARATOR '\n'
                                    ) AS sdg_targets
                                FROM result_lever_sdg_targets rlst
                                    LEFT JOIN result_levers rl ON rl.result_lever_id = rlst.result_lever_id
                                    LEFT JOIN clarisa_levers cl ON cl.id = rl.lever_id
                                    LEFT JOIN clarisa_sdg_targets cst ON cst.id = rlst.sdg_target_id
                                WHERE rlst.is_active = TRUE
                                    AND (rlst.result_lever_id IS NULL OR rl.is_active = TRUE)
                                GROUP BY COALESCE(rl.result_id, rlst.result_id)) AS sdt ON sdt.result_id = root.result_id 
                    LEFT JOIN (SELECT
                                    rl.result_id,
                                    GROUP_CONCAT(CONCAT_WS('', '• (', cl.short_name, ') - ', lso.strategic_outcome) SEPARATOR '\n') strategic_outcome
                                FROM result_levers rl 
                                    LEFT JOIN clarisa_levers cl ON cl.id = rl.lever_id 
                                    INNER JOIN result_lever_strategic_outcome rlso ON rlso.result_lever_id = rl.result_lever_id  
                                        AND rlso.is_active = TRUE
                                    INNER JOIN lever_strategic_outcome lso ON lso.id  = rlso.lever_strategic_outcome_id 
                                WHERE rl.is_active = TRUE
                                GROUP BY rl.result_id) AS so ON so.result_id = root.result_id 
                    LEFT JOIN (SELECT
                                    rso.result_id,
                                    GROUP_CONCAT(CONCAT('• ', sobj.name) ORDER BY sobj.id SEPARATOR '\n') AS strategic_objectives
                                FROM result_strategic_objectives rso
                                    INNER JOIN strategic_objectives sobj ON sobj.id = rso.strategic_objective_id
                                WHERE rso.is_active = TRUE
                                    AND rso.role_id = ${ResultStrategicObjectiveRolesEnum.ALIGNMENT}
                                GROUP BY rso.result_id) AS sob ON sob.result_id = root.result_id
                    LEFT JOIN (SELECT
                                    rio.result_id,
                                    GROUP_CONCAT(CONCAT('• ', io.name) ORDER BY io.id SEPARATOR '\n') AS impact_outcomes
                                FROM result_impact_outcomes rio
                                    INNER JOIN impact_outcomes io ON io.id = rio.impact_outcome_id
                                WHERE rio.is_active = TRUE
                                    AND rio.role_id = ${ResultImpactOutcomeRolesEnum.ALIGNMENT}
                                GROUP BY rio.result_id) AS iot ON iot.result_id = root.result_id
                    LEFT JOIN (SELECT
                                    rs.result_id,
                                    GROUP_CONCAT(CONCAT('• ', cs.short_name) ORDER BY cs.id SEPARATOR '\n') AS sdgs
                                FROM result_sdgs rs
                                    INNER JOIN clarisa_sdgs cs ON cs.id = rs.clarisa_sdg_id
                                WHERE rs.is_active = TRUE
                                GROUP BY rs.result_id) AS sdg ON sdg.result_id = root.result_id
                WHERE root.is_active = TRUE
                    AND root.is_snapshot = FALSE
                ORDER BY root.result_id ASC`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE OR REPLACE VIEW report_alliance_alignment AS
                SELECT 
                    root.result_id,
                    report_field(pp.project, TRUE, NULL) AS primary_project,
                    report_field(pp.principal_investigator, TRUE, NULL) AS primary_project_principal_investigator,
                    report_field(pp.start_date , TRUE, NULL) AS primary_project_start_date,
                    report_field(pp.end_date  , TRUE, NULL) AS primary_project_end_date,
                    report_field(cp.projects, FALSE, NULL) AS contributing_projects,
                    report_field(rl.primary_lever , TRUE, NULL) AS primary_lever,
                    report_field(rl.contributor_lever , FALSE, NULL) AS contributor_lever,
                    report_field(sdt.sdg_targets , TRUE, NULL) AS sdg_targets,
                    report_field(so.strategic_outcome , TRUE, root.indicator_id IN (5)) AS strategic_outcomes
                FROM results root
                    LEFT JOIN (SELECT 
                                    rc.result_id,
                                    CONCAT_WS('', '[',ac.agreement_id, '] ',ac.description) AS project,
                                    ac.project_lead_description AS principal_investigator,
                                    DATE_FORMAT(ac.start_date, '%Y-%m-%d') AS start_date,
                                    DATE_FORMAT(ac.end_date, '%Y-%m-%d') AS end_date  
                                FROM result_contracts rc
                                    LEFT JOIN agresso_contracts ac ON ac.agreement_id = rc.contract_id 
                                WHERE rc.is_primary = TRUE
                                    AND rc.is_active = TRUE
                                GROUP BY rc.result_id 
                                ORDER BY rc.updated_by DESC) AS pp ON pp.result_id = root.result_id 
                    LEFT JOIN (SELECT 
                                    rc.result_id,
                                    GROUP_CONCAT(CONCAT_WS('', '• [',ac.agreement_id, '] ',ac.description) SEPARATOR '\n') AS projects
                                FROM result_contracts rc
                                    LEFT JOIN agresso_contracts ac ON ac.agreement_id = rc.contract_id 
                                WHERE rc.is_primary = FALSE
                                    AND rc.is_active = TRUE
                                GROUP BY rc.result_id 
                                ORDER BY rc.updated_by DESC) AS cp ON cp.result_id = root.result_id 
                    LEFT JOIN (SELECT 
                                    rl.result_id,
                                    GROUP_CONCAT(
                                       CASE WHEN rl.is_primary  = TRUE THEN cl.short_name END
                                       ORDER BY rl.lever_id 
                                       SEPARATOR ', '
                                    ) AS primary_lever,
                                    GROUP_CONCAT(
                                       CASE WHEN rl.is_primary  = FALSE THEN cl.short_name END
                                       ORDER BY rl.lever_id 
                                       SEPARATOR ', '
                                    ) AS contributor_lever
                                FROM result_levers rl 
                                    LEFT JOIN clarisa_levers cl ON cl.id = rl.lever_id 
                                WHERE rl.is_active = TRUE
                                GROUP BY rl.result_id) AS rl ON rl.result_id = root.result_id
                    LEFT JOIN (SELECT 
                                    rl.result_id,
                                    GROUP_CONCAT(CONCAT_WS('', '• (', cl.short_name, ') - ', cst.sdg_target_code, ' - ', cst.sdg_target) SEPARATOR '\n') AS sdg_targets
                                FROM result_levers rl
                                    LEFT JOIN clarisa_levers cl ON cl.id = rl.lever_id 
                                    INNER JOIN result_lever_sdg_targets rlst ON rlst.result_lever_id = rl.result_lever_id 
                                        AND rlst.is_active = TRUE
                                    LEFT JOIN clarisa_sdg_targets cst ON cst.id = rlst.result_lever_sdg_target_id 
                                WHERE rl.is_active = TRUE
                                GROUP BY rl.result_id) AS sdt ON sdt.result_id = root.result_id 
                    LEFT JOIN (SELECT
                                    rl.result_id,
                                    GROUP_CONCAT(CONCAT_WS('', '• (', cl.short_name, ') - ', lso.strategic_outcome) SEPARATOR '\n') strategic_outcome
                                FROM result_levers rl 
                                    LEFT JOIN clarisa_levers cl ON cl.id = rl.lever_id 
                                    INNER JOIN result_lever_strategic_outcome rlso ON rlso.result_lever_id = rl.result_lever_id  
                                        AND rlso.is_active = TRUE
                                    INNER JOIN lever_strategic_outcome lso ON lso.id  = rlso.lever_strategic_outcome_id 
                                WHERE rl.is_active = TRUE
                                GROUP BY rl.result_id) AS so ON so.result_id = root.result_id 
                WHERE root.is_active = TRUE
                    AND root.is_snapshot = FALSE
                ORDER BY root.result_id ASC`);
  }
}
