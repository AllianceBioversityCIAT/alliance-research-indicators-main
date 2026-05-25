import { MigrationInterface, QueryRunner } from 'typeorm';

export class ReportCapSharingDateView1779723460547
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE OR REPLACE VIEW report_capacity_sharing_development AS
SELECT 
	root.result_id,
	report_field(cps.training_engagement_report, TRUE, root.indicator_id = 1) training_engagement_report,
	report_field(cps.is_this_training_engagement, TRUE, root.indicator_id = 1) is_this_training_engagement,
	report_field(cps.length_training, TRUE, root.indicator_id = 1) length_training,
	report_field(cps.\`degree\`, TRUE, root.indicator_id = 1) \`degree\`,
	report_field(ts.traning_supervisor, TRUE, root.indicator_id = 1) traning_supervisor,
	report_field(rl.\`language\`, TRUE, root.indicator_id = 1) \`language\`,
	report_field(cps.start_date, TRUE, root.indicator_id = 1) start_date,
	report_field(cps.end_date, TRUE, root.indicator_id = 1) end_date,
	report_field(cps.delivery_modality, TRUE, root.indicator_id = 1) delivery_modality,
	report_field(ita.individual_trainee_affiliation, TRUE, cps.session_format_id = 1 AND root.indicator_id = 1) individual_trainee_affiliation,
	report_field(cps.individual_trainee_name, TRUE, root.indicator_id = 1) individual_trainee_name,
	report_field(itn.individual_trainee_nationality, TRUE, cps.session_format_id = 1 AND root.indicator_id = 1) individual_trainee_nationality,
	report_field(cps.individual_gender, TRUE, root.indicator_id = 1) individual_gender,
	report_field(cps.group_session_participants_total, TRUE, root.indicator_id = 1) group_session_participants_total,
	report_field(cps.group_session_participants_female, TRUE, root.indicator_id = 1) group_session_participants_female,
	report_field(cps.group_session_participants_male, TRUE, root.indicator_id = 1) group_session_participants_male,
	report_field(cps.group_session_participants_non_binary, TRUE, root.indicator_id = 1) group_session_participants_non_binary,
	report_field(cps.group_session_purpose_name, TRUE, root.indicator_id = 1) group_session_purpose_name,
	report_field(cps.group_session_purpose_description, TRUE, root.indicator_id = 1) group_session_purpose_description,
	report_field(cps.group_is_attending_organization, TRUE, root.indicator_id = 1) group_is_attending_organization
FROM results root
	LEFT JOIN (SELECT 	
					rcs.result_id,
					DATE_FORMAT(rcs.end_date, '%Y-%m-%d') end_date,
					DATE_FORMAT(rcs.start_date, '%Y-%m-%d') start_date,
					sf.session_format_id,
					sf.name training_engagement_report,
					st.name is_this_training_engagement,
					sl.name length_training,
					report_field(d.name, TRUE, rcs.session_length_id = 2 AND rcs.session_length_id IS NOT NULL) degree,
					dm.name delivery_modality,
					rcs.is_attending_organization group_is_attending_organization_boolean,
					report_field(IF(rcs.is_attending_organization IS NULL, NULL, IF(rcs.is_attending_organization, 'YES', 'NO')),TRUE, sf.session_format_id = 2) group_is_attending_organization,
					report_field(rcs.session_participants_female, FALSE, sf.session_format_id = 2) group_session_participants_female,
					report_field(rcs.session_participants_male, FALSE, sf.session_format_id = 2) group_session_participants_male,
					report_field(rcs.session_participants_non_binary, FALSE, sf.session_format_id = 2) group_session_participants_non_binary,
					report_field(rcs.session_participants_total, TRUE, sf.session_format_id = 2) group_session_participants_total,
					report_field(sp.name, TRUE, sf.session_format_id = 2) group_session_purpose_name,
					report_field(rcs.session_purpose_description, TRUE, sf.session_format_id = 2 AND rcs.session_purpose_id = 4 AND rcs.session_purpose_id IS NOT NULL) group_session_purpose_description,
					report_field(rcs.trainee_name, TRUE, sf.session_format_id = 1) individual_trainee_name,
					report_field(g.name, TRUE, sf.session_format_id = 1) individual_gender
				FROM result_capacity_sharing rcs 
					LEFT JOIN delivery_modalities dm ON dm.delivery_modality_id = rcs.delivery_modality_id 
					LEFT JOIN session_formats sf ON sf.session_format_id = rcs.session_format_id 
					LEFT JOIN session_types st ON st.session_type_id = rcs.session_type_id 
					LEFT JOIN degrees d ON d.degree_id = rcs.degree_id 
					LEFT JOIN session_lengths sl ON sl.session_length_id = rcs.session_length_id 
					LEFT JOIN session_purposes sp ON sp.session_purpose_id = rcs.session_purpose_id 
					LEFT JOIN gender g ON g.gender_id = rcs.gender_id 
				WHERE rcs.is_active = TRUE) cps ON cps.result_id = root.result_id 
	LEFT JOIN (SELECT 
					ru.result_id,
					CONCAT_WS('', aus.first_name, ' ', aus.last_name) traning_supervisor
				FROM result_users ru 
					LEFT JOIN alliance_user_staff aus ON aus.carnet = ru.user_id 
				WHERE ru.is_active = TRUE
					AND ru.informative_role_id = 2
				GROUP BY ru.result_id) ts ON ts.result_id = root.result_id 
	LEFT JOIN (SELECT 
					rl.result_id,
					cl.name language
				FROM result_languages rl 
					INNER JOIN clarisa_languages cl ON cl.id = rl.language_id 
				WHERE rl.language_role_id = 1
					AND rl.is_active = TRUE
				GROUP BY rl.result_id) rl ON rl.result_id = root.result_id 
	LEFT JOIN (SELECT 	
					ri.result_id,
					concat_ws('','[id: ', \`ci\`.\`code\`, '] ', \`ci\`.\`acronym\`, ' - (HQ:', \`cil\`.\`name\`, ') ', \`ci\`.\`name\`) individual_trainee_affiliation
				FROM  result_institutions ri 
					INNER JOIN clarisa_institutions ci ON ci.code = ri.institution_id 
					LEFT JOIN clarisa_institution_locations cil ON cil.institution_id = ci.code 
				WHERE ri.institution_role_id = 1
				GROUP BY ri.result_id) ita ON ita.result_id = root.result_id 
	LEFT JOIN (SELECT 
					rc.result_id,
					CONCAT_WS('', '[',cc.isoAlpha2 ,'] ',cc.name) individual_trainee_nationality
				FROM result_countries rc 
					LEFT JOIN clarisa_countries cc ON cc.isoAlpha2 = rc.isoAlpha2 
				WHERE rc.is_active = TRUE
					AND rc.country_role_id = 1
				GROUP BY rc.result_id) itn ON itn.result_id = root.result_id 
WHERE root.is_active = TRUE
	AND root.is_snapshot = FALSE
ORDER BY root.result_id ASC;`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP VIEW IF EXISTS report_capacity_sharing_development;`,
    );
  }
}
