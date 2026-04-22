import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateSectionViews1776874787128 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE OR REPLACE VIEW report_general_information AS
SELECT
	root.result_id,
	root.result_official_code AS result_code,
	root.platform_code,
	root.public_link,
	root.external_link AS platform_link,
	i.name as indicator,
	rs.name AS status,
	report_field(root.title, TRUE, NULL) AS result_title,
	report_field(root.description, TRUE, NULL) AS result_description,
	report_field(root.report_year_id, TRUE, NULL) AS reporting_year,
	versions.reporting_years AS approved_versions,
	report_field(rk.keywords, FALSE, NULL) AS keywords,
	CONCAT_WS('',su.first_name, ' ',su.last_name ) AS creator,
	DATE_FORMAT(root.created_at, '%d/%m/%Y') AS creation_date,
	report_field(mcp.user_name, TRUE, NULL) AS main_contact_person
FROM results root
	INNER JOIN indicators i ON i.indicator_id = root.indicator_id 
	INNER JOIN result_status rs ON rs.result_status_id = root.result_status_id 
	LEFT JOIN (SELECT
					versions.result_official_code,
					GROUP_CONCAT(versions.report_year_id SEPARATOR ', ') AS reporting_years
				FROM results versions
				WHERE versions.is_active = TRUE
					AND versions.is_snapshot = TRUE
				GROUP BY versions.result_official_code) versions ON versions.result_official_code = root.result_official_code 
	LEFT JOIN (SELECT 
					rk.result_id,
					GROUP_CONCAT(rk.keyword SEPARATOR ', ') AS keywords
				FROM result_keywords rk 
				WHERE rk.is_active = TRUE
				GROUP BY rk.result_id) rk ON rk.result_id = root.result_id 
	LEFT JOIN sec_users su ON su.sec_user_id = root.created_by 
	LEFT JOIN (SELECT 
					ru.result_id, 
					CONCAT_WS('',aus.first_name, ' ',aus.last_name ) AS user_name
				FROM result_users ru 
				LEFT JOIN alliance_user_staff aus ON aus.carnet = ru.user_id 
				WHERE ru.user_role_id = 1
					AND ru.is_active = TRUE
				GROUP BY ru.result_id 
				ORDER BY ru.updated_by DESC) mcp ON mcp.result_id = root.result_id 
WHERE root.is_active = TRUE
	AND root.is_snapshot = FALSE
ORDER BY root.result_id ASC`);

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
                        DATE_FORMAT(ac.start_date, '%d/%m/%Y') AS start_date,
                        DATE_FORMAT(ac.end_date, '%d/%m/%Y') AS end_date  
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


        await queryRunner.query(`CREATE OR REPLACE VIEW report_partners AS
    SELECT 
        root.result_id,
        report_field(pr.partners, TRUE, NOT root.is_partner_not_applicable ) AS partners
    FROM results root
        LEFT JOIN (SELECT 
                        ri.result_id,
                        GROUP_CONCAT(CONCAT_WS('','• ',ci.acronym, ' - (HQ:', cil.name, ') ', ci.name) SEPARATOR '\n') AS partners
                    FROM result_institutions ri 
                        INNER JOIN clarisa_institutions ci ON ci.code = ri.institution_id 
                        LEFT JOIN clarisa_institution_locations cil ON cil.institution_id  = ci.code 
                            AND cil.isHeadquarter = TRUE
                    WHERE ri.is_active = TRUE
                        AND ri.institution_role_id = 3
                    GROUP BY ri.result_id) AS pr ON pr.result_id = root.result_id 
    WHERE root.is_active = TRUE
        AND root.is_snapshot = FALSE
    ORDER BY root.result_id ASC`);

        await queryRunner.query(`CREATE OR REPLACE VIEW report_geo_location AS
    SELECT 
        root.result_id,
        report_field(cgs.name, TRUE, NULL) AS geo_scope_name,
        report_field(rc.countries, root.geo_scope_id IN (3,4, 5), root.geo_scope_id IN (1,3,4,5)) AS countries,
        report_field(rr.regions , root.geo_scope_id IN (2), root.geo_scope_id IN (1,2)) AS regions,
        report_field(rc.sub_nationals, root.geo_scope_id IN (5), root.geo_scope_id IN (5)) AS sub_nationals
    FROM results root
        LEFT JOIN clarisa_geo_scope cgs ON cgs.code = root.geo_scope_id 
        LEFT JOIN (SELECT 
                        rc.result_id,
                        GROUP_CONCAT(CONCAT('(',cc.isoAlpha2 ,') ',cc.name) SEPARATOR ', ') AS countries,
                        IF(rcs.sub_nationals IS NOT NULL,GROUP_CONCAT(CONCAT_WS('','• ',CONCAT('(',cc.isoAlpha2 ,') ',cc.name),': ', rcs.sub_nationals ) SEPARATOR '\n'), NULL) AS sub_nationals
                    FROM result_countries rc 
                        INNER JOIN clarisa_countries cc ON cc.isoAlpha2 = rc.isoAlpha2 
                        LEFT JOIN (SELECT 
                                        rcsn.result_country_id,
                                        GROUP_CONCAT(CONCAT_WS('','(',csn.code ,') ',csn.name) SEPARATOR ', ') AS sub_nationals
                                    FROM result_countries_sub_nationals rcsn 
                                        INNER JOIN clarisa_sub_nationals csn ON csn.id  = rcsn.sub_national_id 
                                    WHERE rcsn.is_active = TRUE
                                    GROUP BY rcsn.result_country_id) AS rcs ON rcs.result_country_id = rc.result_country_id 
                    WHERE rc.is_active = TRUE
                        AND rc.country_role_id = 2
                    GROUP BY rc.result_id ) AS rc ON rc.result_id = root.result_id 
        LEFT JOIN (SELECT 
                        rr.result_id,
                        GROUP_CONCAT(cr.name SEPARATOR ', ') AS regions
                    FROM result_regions rr 
                        INNER JOIN clarisa_regions cr ON cr.um49Code = rr.region_id 
                    WHERE rr.is_active = TRUE
                    GROUP BY rr.result_id) AS rr ON rr.result_id = root.result_id 
    WHERE root.is_active = TRUE
        AND root.is_snapshot = FALSE
    ORDER BY root.result_id ASC`);

        await queryRunner.query(`CREATE OR REPLACE VIEW report_evidences AS
    SELECT 
        root.result_id,
        report_field(re.evidences, TRUE, NULL) AS evidences
    FROM results root
        LEFT JOIN (SELECT
                        re.result_id,
                        GROUP_CONCAT(CONCAT_WS('','• <', re.evidence_url,'> ',re.evidence_description ,' [Is public: ',IF(re.is_private, 'FALSE', 'TRUE'),']') SEPARATOR '\n') AS evidences
                    FROM result_evidences re 
                    WHERE re.is_active = TRUE
                    GROUP BY re.result_id) re ON re.result_id = root.result_id 
    WHERE root.is_active = TRUE
        AND root.is_snapshot = FALSE
    ORDER BY root.result_id ASC`);

        await queryRunner.query(`CREATE OR REPLACE VIEW report_ip_rights AS
    SELECT 
        root.result_id,
        report_field(rir.who_owns_ip_rights, TRUE, NULL) AS who_owns_ip_rights,
        report_field(rir.third_party, TRUE, NULL) AS third_party,
        report_field(rir.legal_restrictions_publication, TRUE, NULL) AS legal_restrictions_publication,
        report_field(rir.commercialization_potential_asset, TRUE, NULL) AS commercialization_potential_asset,
        report_field(rir.asset_need_refinement , TRUE, NULL) AS asset_need_refinement
    FROM results root
        LEFT JOIN (SELECT 
                        rir.result_ip_rights_id AS result_id,
                        ipo.name AS who_owns_ip_rights,
                        rir.asset_ip_owner_description AS third_party,
                        IF(rir.publicity_restriction IS NULL, NULL, CONCAT_WS('','[',IF(rir.publicity_restriction, 'YES', 'NO'),']', IF(rir.publicity_restriction = TRUE,CONCAT_WS('',' ',report_field(rir.publicity_restriction_description, rir.publicity_restriction = TRUE, rir.publicity_restriction = TRUE) ), ''))) AS legal_restrictions_publication,
                        IF(rir.potential_asset IS NULL, NULL, CONCAT_WS('','[',IF(rir.potential_asset, 'YES', 'NO'),']', IF(rir.potential_asset = TRUE,CONCAT_WS('',' ',report_field(rir.potential_asset_description , rir.potential_asset = TRUE, rir.potential_asset = TRUE) ), ''))) AS commercialization_potential_asset,
                        IF(rir.requires_futher_development IS NULL, NULL, CONCAT_WS('','[',IF(rir.requires_futher_development, 'YES', 'NO'),']', IF(rir.requires_futher_development = TRUE,CONCAT_WS('',' ',report_field(rir.requires_futher_development_description  , rir.requires_futher_development = TRUE, rir.requires_futher_development = TRUE) ), ''))) AS asset_need_refinement 
                    FROM result_ip_rights rir
                        LEFT JOIN intellectual_property_owner ipo ON ipo.intellectual_property_owner_id = rir.asset_ip_owner_id 
                    WHERE rir.is_active = TRUE
                    ORDER BY rir.result_ip_rights_id ASC) AS rir ON rir.result_id = root.result_id 
    WHERE root.is_active = TRUE
        AND root.is_snapshot = FALSE
    ORDER BY root.result_id ASC`)
    }



    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP VIEW IF EXISTS report_general_information`);
        await queryRunner.query(`DROP VIEW IF EXISTS report_alliance_alignment`);
        await queryRunner.query(`DROP VIEW IF EXISTS report_partners`);
        await queryRunner.query(`DROP VIEW IF EXISTS report_geo_location`);
        await queryRunner.query(`DROP VIEW IF EXISTS report_evidences`);
        await queryRunner.query(`DROP VIEW IF EXISTS report_ip_rights`);
    }

}
