import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateReportInnovationDevView1781300000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE OR REPLACE VIEW report_innovation_dev AS
SELECT
    root.result_id,
    report_field(rid.short_title, TRUE, root.indicator_id = 2) short_title,
    report_field(cic.name, TRUE, root.indicator_id = 2) innovation_nature,
    report_field(cit.name, TRUE, root.indicator_id = 2) innovation_type,
    report_field(CONCAT('(IRL ', cirl.level, ') ', cirl.name), TRUE, root.indicator_id = 2) innovation_readiness_level,
    report_field(rid.innovation_readiness_explanation, TRUE, root.indicator_id = 2) innovation_readiness_explanation,
    report_field(IF(rid.no_sex_age_disaggregation, 'YES', 'NO'), FALSE, root.indicator_id = 2) no_sex_age_disaggregation,
    report_field(idau.name, TRUE, root.indicator_id = 2) anticipated_users,
    report_field(rid.expected_outcome, TRUE, root.indicator_id = 2 AND rid.anticipated_users_id != 1 AND rid.anticipated_users_id IS NOT NULL) expected_outcome,
    report_field(rid.intended_beneficiaries_description, TRUE, root.indicator_id = 2 AND rid.anticipated_users_id != 1 AND rid.anticipated_users_id IS NOT NULL) intended_beneficiaries_description,
    report_field(IF(rid.is_new_or_improved_variety, 'YES', 'NO'), FALSE, root.indicator_id = 2) is_new_or_improved_variety,
    report_field(rid.new_or_improved_varieties_count, FALSE, root.indicator_id = 2 AND rid.is_new_or_improved_variety = TRUE) new_or_improved_varieties_count,
    report_field(ra.actors, FALSE, root.indicator_id = 2 AND rid.anticipated_users_id != 1 AND rid.anticipated_users_id IS NOT NULL) actors,
    report_field(rit.institution_types, FALSE, root.indicator_id = 2 AND rid.anticipated_users_id != 1 AND rid.anticipated_users_id IS NOT NULL) innovation_partners,
    report_field(IF(rid.is_knowledge_sharing, 'YES', 'NO'), FALSE, root.indicator_id = 2) is_knowledge_sharing,
    report_field(dq.name, TRUE, root.indicator_id = 2 AND rid.is_knowledge_sharing = TRUE) dissemination_qualification,
    report_field(rid.tool_useful_context, FALSE, root.indicator_id = 2 AND rid.is_knowledge_sharing = TRUE) tool_useful_context,
    report_field(rid.results_achieved_expected, FALSE, root.indicator_id = 2 AND rid.is_knowledge_sharing = TRUE) results_achieved_expected,
    report_field(tf.tool_functions, FALSE, root.indicator_id = 2 AND rid.is_knowledge_sharing = TRUE) tool_functions,
    report_field(IF(rid.is_used_beyond_original_context, 'YES', 'NO'), FALSE, root.indicator_id = 2 AND rid.is_knowledge_sharing = TRUE) is_used_beyond_original_context,
    report_field(rid.adoption_adaptation_context, FALSE, root.indicator_id = 2 AND rid.is_knowledge_sharing = TRUE AND rid.is_used_beyond_original_context = TRUE) adoption_adaptation_context,
    report_field(rid.other_tools, FALSE, root.indicator_id = 2 AND rid.is_knowledge_sharing = TRUE) other_tools,
    report_field(rid.other_tools_integration, FALSE, root.indicator_id = 2 AND rid.is_knowledge_sharing = TRUE AND rid.other_tools IS NOT NULL) other_tools_integration,
    report_field(lr.link_to_results, FALSE, root.indicator_id = 2 AND rid.is_knowledge_sharing = TRUE) link_to_results,
    report_field(rid.is_cheaper_than_alternatives, FALSE, root.indicator_id = 2) is_cheaper_than_alternatives,
    report_field(rid.is_simpler_to_use, FALSE, root.indicator_id = 2) is_simpler_to_use,
    report_field(rid.does_perform_better, FALSE, root.indicator_id = 2) does_perform_better,
    report_field(rid.is_desirable_to_users, FALSE, root.indicator_id = 2) is_desirable_to_users,
    report_field(rid.has_commercial_viability, FALSE, root.indicator_id = 2) has_commercial_viability,
    report_field(rid.has_suitable_enabling_environment, FALSE, root.indicator_id = 2) has_suitable_enabling_environment,
    report_field(rid.has_evidence_of_uptake, FALSE, root.indicator_id = 2) has_evidence_of_uptake,
    report_field(ep.name, FALSE, root.indicator_id = 2) expansion_potential,
    report_field(rid.expansion_adaptation_details, FALSE, root.indicator_id = 2 AND rid.expansion_potential_id = 2) expansion_adaptation_details
FROM results root
    LEFT JOIN result_innovation_dev rid ON rid.result_id = root.result_id
    LEFT JOIN clarisa_innovation_characteristics cic ON cic.id = rid.innovation_nature_id
    LEFT JOIN clarisa_innovation_types cit ON cit.code = rid.innovation_type_id
    LEFT JOIN clarisa_innovation_readiness_levels cirl ON cirl.id = rid.innovation_readiness_id
    LEFT JOIN innovation_dev_anticipated_users idau ON idau.id = rid.anticipated_users_id
    LEFT JOIN dissemination_qualifications dq ON dq.id = rid.dissemination_qualification_id
    LEFT JOIN expansion_potentials ep ON ep.id = rid.expansion_potential_id
    LEFT JOIN (SELECT
                    ra.result_id,
                    GROUP_CONCAT(
                        CONCAT_WS('',
                            '• ', IFNULL(NULLIF(ra.actor_type_custom_name, ''), cat.name),
                            IF(
                                ra.women_youth OR ra.women_not_youth OR ra.men_youth OR ra.men_not_youth,
                                CONCAT_WS('', ' [',
                                    IF(ra.women_youth, 'Women Youth, ', ''),
                                    IF(ra.women_not_youth, 'Women Non-youth, ', ''),
                                    IF(ra.men_youth, 'Men Youth, ', ''),
                                    IF(ra.men_not_youth, 'Men Non-youth', ''),
                                    ']'
                                ), ''
                            )
                        ) SEPARATOR '\n'
                    ) actors
                FROM result_actors ra
                    INNER JOIN clarisa_actor_types cat ON cat.code = ra.actor_type_id
                WHERE ra.actor_role_id = 1
                    AND ra.is_active = TRUE
                GROUP BY ra.result_id) ra ON ra.result_id = root.result_id
    LEFT JOIN (SELECT
                    rit.result_id,
                    GROUP_CONCAT(
                        CONCAT_WS('', '• ',
                            IF(rit.is_organization_known,
                                CONCAT_WS('', '[id: ', ci.code, '] ', ci.acronym, ' - (HQ: ', cil.name, ') ', ci.name),
                                IFNULL(
                                    IFNULL(
                                        CONCAT_WS(' > ', cit_parent.name, cit_sub.name),
                                        rit.institution_type_custom_name
                                    ),
                                    cit_main.name
                                )
                            )
                        ) SEPARATOR '\n'
                    ) institution_types
                FROM result_institution_types rit
                    LEFT JOIN clarisa_institution_types cit_main ON cit_main.code = rit.institution_type_id
                    LEFT JOIN clarisa_institution_types cit_sub ON cit_sub.code = rit.sub_institution_type_id
                    LEFT JOIN clarisa_institution_types cit_parent ON cit_parent.code = cit_sub.parent_code
                    LEFT JOIN clarisa_institutions ci ON ci.code = rit.institution_id
                    LEFT JOIN clarisa_institution_locations cil ON cil.institution_id = ci.code
                        AND cil.isHeadquarter = TRUE
                WHERE rit.institution_type_role_id = 1
                    AND rit.is_active = TRUE
                GROUP BY rit.result_id) rit ON rit.result_id = root.result_id
    LEFT JOIN (SELECT
                    ritf.result_id,
                    GROUP_CONCAT(CONCAT_WS('', '• ', tf.name) SEPARATOR '\n') tool_functions
                FROM result_innovation_tool_function ritf
                    INNER JOIN tool_functions tf ON tf.id = ritf.tool_function_id
                WHERE ritf.is_active = TRUE
                GROUP BY ritf.result_id) tf ON tf.result_id = root.result_id
    LEFT JOIN (SELECT
                    lr.result_id,
                    GROUP_CONCAT(
                        CONCAT_WS('', '• [', i.name, '] ', r.result_official_code, ' - ', r.title)
                        SEPARATOR '\n'
                    ) link_to_results
                FROM link_results lr
                    INNER JOIN results r ON r.result_id = lr.other_result_id
                    LEFT JOIN indicators i ON i.indicator_id = r.indicator_id
                WHERE lr.link_result_role_id = 2
                    AND lr.is_active = TRUE
                GROUP BY lr.result_id) lr ON lr.result_id = root.result_id
WHERE root.is_active = TRUE
    AND root.is_snapshot = FALSE
ORDER BY root.result_id ASC;`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP VIEW IF EXISTS report_innovation_dev;`);
  }
}
