import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateReportView1780694172676 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE OR REPLACE VIEW report_oicr AS
            SELECT
                root.result_id,
                report_field(ro.general_comment, TRUE, root.indicator_id = 5) general_comment,
                report_field(ml.full_name , TRUE, root.indicator_id = 5) maturity_level,
                report_field(ro.oicr_internal_code, TRUE, root.indicator_id = 5) oicr_internal_code,
                report_field(ro.outcome_impact_statement, TRUE, root.indicator_id = 5) outcome_impact_statement,
                report_field(ro.short_outcome_impact_statement, TRUE, root.indicator_id = 5) short_outcome_impact_statement,
                report_field(ro.sharepoint_link, FALSE, root.indicator_id = 5) sharepoint_link,
                report_field(CONCAT_WS('', aus.first_name, ' ', aus.last_name), TRUE, root.indicator_id = 5) mel_regional_expert,
                report_field(rt.tag_name, TRUE , root.indicator_id = 5) tagging,
                report_field(rq.quantifications, FALSE, root.indicator_id = 5) quantifications,
                report_field(rq2.extrapolated_estimates , FALSE, root.indicator_id = 5) extrapolated_estimates,
                report_field(acp.authors_contact_persons, FALSE, root.indicator_id = 5) authors_contact_persons,
                report_field(IF(ro.for_external_use, 'YES', 'NO'), FALSE, root.indicator_id = 5) for_external_use,
                report_field(ro.for_external_use_description, FALSE, root.indicator_id = 5) for_external_use_description,
                report_field(ria.impact_area, TRUE, root.indicator_id = 5) impact_area,
                report_field(treo.existing_oicr, TRUE, root.indicator_id = 5 AND rt.tag_id IN (2,3) AND rt.tag_id IS NOT NULL ) existing_oicr,
                report_field(ro.cgspace_link, TRUE, root.indicator_id = 5) cgspace_link
            FROM results root
                LEFT JOIN result_oicrs ro ON ro.result_id = root.result_id 
                LEFT JOIN maturity_levels ml ON ml.id = ro.maturity_level_id 
                LEFT JOIN alliance_user_staff_groups ausg ON ausg.staff_group_id  = ro.mel_staff_group_id 
                    AND ausg.carnet = ro.mel_regional_expert 
                LEFT JOIN alliance_user_staff aus ON aus.carnet = ausg.carnet 
                LEFT JOIN (SELECT 
                                rt.result_id,
                                rt.tag_id,
                                t.name tag_name
                            FROM result_tags rt 
                                INNER JOIN tags t ON t.id = rt.tag_id 
                            WHERE rt.is_active = TRUE
                            GROUP BY rt.result_id
                            ORDER BY rt.result_id ASC) rt ON rt.result_id = root.result_id 
                LEFT JOIN (SELECT 
                                rq.result_id,
                                GROUP_CONCAT(CONCAT_WS('', '• Number: ',report_field(rq.quantification_number, TRUE, TRUE), ', Unit: ',report_field(rq.unit, TRUE, TRUE), ', Comment: ', report_field(rq.description, TRUE, TRUE)) SEPARATOR '\n') quantifications 
                            FROM result_quantifications rq 
                            WHERE rq.is_active = TRUE
                                AND rq.quantification_role_id = 1
                            GROUP BY rq.result_id) rq ON rq.result_id = root.result_id 
                LEFT JOIN (SELECT 
                                rq.result_id,
                                GROUP_CONCAT(CONCAT_WS('', '• Number: ',report_field(rq.quantification_number, TRUE, TRUE), ', Unit: ',report_field(rq.unit, TRUE, TRUE), ', Comment: ', report_field(rq.description, TRUE, TRUE)) SEPARATOR '\n') extrapolated_estimates 
                            FROM result_quantifications rq 
                            WHERE rq.is_active = TRUE
                                AND rq.quantification_role_id = 2
                            GROUP BY rq.result_id) rq2 ON rq2.result_id = root.result_id
                LEFT JOIN (SELECT
                                ru.result_id,
                                GROUP_CONCAT(CONCAT_WS('','• ',aus.first_name, ' ', aus.last_name, ' - Position: ', IFNULL(aus.\`position\`, 'N/D'), ' - Affiliation: ', IFNULL(aus.center, 'N/D')) SEPARATOR '\n') authors_contact_persons
                            FROM result_users ru 
                                INNER JOIN alliance_user_staff aus ON aus.carnet = ru.user_id 
                            WHERE ru.user_role_id = 3
                                AND ru.is_active = TRUE
                            GROUP BY ru.result_id) acp ON acp.result_id = root.result_id 
                LEFT JOIN (SELECT 
                                ria.result_id,
                                GROUP_CONCAT('• ', cia.name, ' - Score: ', report_field(CONCAT('(', ias.id - 1 ,') ', ias.name), TRUE, TRUE), '\n', rgt.global_targets   SEPARATOR '\n') impact_area
                            FROM result_impact_areas ria 
                                LEFT JOIN clarisa_impact_areas cia ON cia.id = ria.impact_area_id 
                                LEFT JOIN impact_area_scores ias ON ias.id = ria.impact_area_score_id 
                                LEFT JOIN (SELECT
                                                riagt.result_impact_area_id,
                                                GROUP_CONCAT('\t◦ ', cgt.smo_code, ' - ', cgt.target SEPARATOR '\n') global_targets
                                            FROM result_impact_area_global_target riagt
                                                LEFT JOIN clarisa_global_targets cgt ON cgt.targetId = riagt.global_target_id 
                                            WHERE riagt.is_active = TRUE
                                            GROUP BY riagt.result_impact_area_id) rgt ON rgt.result_impact_area_id = ria.id 
                            WHERE ria.is_active = TRUE
                            GROUP BY ria.result_id) ria ON ria.result_id = root.result_id 
                LEFT JOIN (SELECT 
                                treo.result_id ,
                                CONCAT(teo.external_id, ' - ', teo.title, ' <',teo.handle_link,'>') existing_oicr
                            FROM TEMP_result_external_oicrs treo 
                                INNER JOIN TEMP_external_oicrs teo on teo.id = treo.external_oicr_id 
                            WHERE treo.is_active = TRUE
                            GROUP BY treo.result_id) treo ON treo.result_id = root.result_id 
            WHERE root.is_active = TRUE
                AND root.is_snapshot = FALSE
            ORDER BY root.result_id ASC; `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE OR REPLACE VIEW report_oicr AS
            SELECT
                root.result_id,
                report_field(ro.general_comment, TRUE, root.indicator_id = 5) general_comment,
                report_field(ml.full_name , TRUE, root.indicator_id = 5) maturity_level,
                report_field(ro.oicr_internal_code, TRUE, root.indicator_id = 5) oicr_internal_code,
                report_field(ro.outcome_impact_statement, TRUE, root.indicator_id = 5) outcome_impact_statement,
                report_field(ro.short_outcome_impact_statement, TRUE, root.indicator_id = 5) short_outcome_impact_statement,
                report_field(ro.sharepoint_link, FALSE, root.indicator_id = 5) sharepoint_link,
                report_field(CONCAT_WS('', aus.first_name, ' ', aus.last_name), TRUE, root.indicator_id = 5) mel_regional_expert,
                report_field(rt.tag_name, TRUE , root.indicator_id = 5) tagging,
                report_field(rq.quantifications, FALSE, root.indicator_id = 5) quantifications,
                report_field(rq2.extrapolated_estimates , FALSE, root.indicator_id = 5) extrapolated_estimates,
                report_field(acp.authors_contact_persons, FALSE, root.indicator_id = 5) authors_contact_persons,
                report_field(IF(ro.for_external_use, 'YES', 'NO'), FALSE, root.indicator_id = 5) for_external_use,
                report_field(ro.for_external_use_description, FALSE, root.indicator_id = 5) for_external_use_description,
                report_field(ria.impact_area, TRUE, root.indicator_id = 5) impact_area,
                report_field(treo.existing_oicr, TRUE, root.indicator_id = 5 AND rt.tag_id IN (2,3) AND rt.tag_id IS NOT NULL ) existing_oicr
            FROM results root
                LEFT JOIN result_oicrs ro ON ro.result_id = root.result_id 
                LEFT JOIN maturity_levels ml ON ml.id = ro.maturity_level_id 
                LEFT JOIN alliance_user_staff_groups ausg ON ausg.staff_group_id  = ro.mel_staff_group_id 
                LEFT JOIN alliance_user_staff aus ON aus.carnet = ausg.carnet 
                LEFT JOIN (SELECT 
                                rt.result_id,
                                rt.tag_id,
                                t.name tag_name
                            FROM result_tags rt 
                                INNER JOIN tags t ON t.id = rt.tag_id 
                            WHERE rt.is_active = TRUE
                            GROUP BY rt.result_id
                            ORDER BY rt.result_id ASC) rt ON rt.result_id = root.result_id 
                LEFT JOIN (SELECT 
                                rq.result_id,
                                GROUP_CONCAT(CONCAT_WS('', '• Number: ',report_field(rq.quantification_number, TRUE, TRUE), ', Unit: ',report_field(rq.unit, TRUE, TRUE), ', Comment: ', report_field(rq.description, TRUE, TRUE)) SEPARATOR '\n') quantifications 
                            FROM result_quantifications rq 
                            WHERE rq.is_active = TRUE
                                AND rq.quantification_role_id = 1
                            GROUP BY rq.result_id) rq ON rq.result_id = root.result_id 
                LEFT JOIN (SELECT 
                                rq.result_id,
                                GROUP_CONCAT(CONCAT_WS('', '• Number: ',report_field(rq.quantification_number, TRUE, TRUE), ', Unit: ',report_field(rq.unit, TRUE, TRUE), ', Comment: ', report_field(rq.description, TRUE, TRUE)) SEPARATOR '\n') extrapolated_estimates 
                            FROM result_quantifications rq 
                            WHERE rq.is_active = TRUE
                                AND rq.quantification_role_id = 2
                            GROUP BY rq.result_id) rq2 ON rq2.result_id = root.result_id
                LEFT JOIN (SELECT
                                ru.result_id,
                                GROUP_CONCAT(CONCAT_WS('','• ',aus.first_name, ' ', aus.last_name, ' - Position: ', IFNULL(aus.\`position\`, 'N/D'), ' - Affiliation: ', IFNULL(aus.center, 'N/D')) SEPARATOR '\n') authors_contact_persons
                            FROM result_users ru 
                                INNER JOIN alliance_user_staff aus ON aus.carnet = ru.user_id 
                            WHERE ru.user_role_id = 3
                                AND ru.is_active = TRUE
                            GROUP BY ru.result_id) acp ON acp.result_id = root.result_id 
                LEFT JOIN (SELECT 
                                ria.result_id,
                                GROUP_CONCAT('• ', cia.name, ' - Score: ', report_field(CONCAT('(', ias.id - 1 ,') ', ias.name), TRUE, TRUE), '\n', rgt.global_targets   SEPARATOR '\n') impact_area
                            FROM result_impact_areas ria 
                                LEFT JOIN clarisa_impact_areas cia ON cia.id = ria.impact_area_id 
                                LEFT JOIN impact_area_scores ias ON ias.id = ria.impact_area_score_id 
                                LEFT JOIN (SELECT
                                                riagt.result_impact_area_id,
                                                GROUP_CONCAT('\t◦ ', cgt.smo_code, ' - ', cgt.target SEPARATOR '\n') global_targets
                                            FROM result_impact_area_global_target riagt
                                                LEFT JOIN clarisa_global_targets cgt ON cgt.targetId = riagt.global_target_id 
                                            WHERE riagt.is_active = TRUE
                                            GROUP BY riagt.result_impact_area_id) rgt ON rgt.result_impact_area_id = ria.id 
                            WHERE ria.is_active = TRUE
                            GROUP BY ria.result_id) ria ON ria.result_id = root.result_id 
                LEFT JOIN (SELECT 
                                treo.result_id ,
                                CONCAT(teo.external_id, ' - ', teo.title, ' <',teo.handle_link,'>') existing_oicr
                            FROM TEMP_result_external_oicrs treo 
                                INNER JOIN TEMP_external_oicrs teo on teo.id = treo.external_oicr_id 
                            WHERE treo.is_active = TRUE
                            GROUP BY treo.result_id) treo ON treo.result_id = root.result_id 
            WHERE root.is_active = TRUE
                AND root.is_snapshot = FALSE
            ORDER BY root.result_id ASC; `);
    }

}
