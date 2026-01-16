import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateSpVersioning1768576733813 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP PROCEDURE IF EXISTS \`SP_versioning\``);
    await queryRunner.query(`CREATE PROCEDURE \`SP_versioning\`(IN resultCode BIGINT)
            BEGIN
                                    DECLARE temp_result_id BIGINT;
                                    DECLARE new_result_id BIGINT;
                                    DECLARE report_year INT;
                                    DECLARE exists_result BOOLEAN DEFAULT FALSE;
                                    
                                    SELECT 
                                    r.result_id,
                                    r.report_year_id 
                                        INTO
                                    temp_result_id,
                                    report_year
                                    FROM results r
                                    WHERE r.is_active = TRUE
                                        AND r.is_snapshot = FALSE
                                        AND r.result_official_code = resultCode
                                        AND r.platform_code = 'STAR';
                                    
                                    IF (temp_result_id IS NULL) THEN
                                        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Result not found - temp_result_id is NULL';
                                    END IF;
                                    
                                    SELECT 
                                        if(r.result_id IS NOT NULL, TRUE, FALSE)
                                        INTO
                                        exists_result
                                    FROM results r 
                                    WHERE r.result_official_code = resultCode 
                                        AND r.is_snapshot = true
                                        AND r.is_active = true
                                        AND r.report_year_id = report_year;
                                    
                                    IF (exists_result = TRUE) THEN
                                        SIGNAL SQLSTATE '45001' SET MESSAGE_TEXT = 'Duplicate entry: temp_result_id already exists';
                                    END IF;
                                    
                                    INSERT
                                        INTO
                                        results (created_at,
                                        created_by,
                                        updated_at,
                                        updated_by,
                                        is_active,
                                        result_official_code,
                                        version_id,
                                        title,
                                        description,
                                        indicator_id,
                                        geo_scope_id,
                                        result_status_id,
                                        deleted_at,
                                        report_year_id,
                                        tip_id,
                                        is_snapshot,
                                        is_ai,
                                        platform_code,
                                        comment_geo_scope)
                                    SELECT
                                        r.created_at,
                                        r.created_by,
                                        r.updated_at,
                                        r.updated_by,
                                        r.is_active,
                                        r.result_official_code,
                                        r.version_id,
                                        r.title,
                                        r.description,
                                        r.indicator_id,
                                        r.geo_scope_id,
                                        r.result_status_id,
                                        r.deleted_at,
                                        r.report_year_id,
                                        r.tip_id,
                                        TRUE AS is_snapshot,
                                        r.is_ai,
                                        r.platform_code,
                                        r.comment_geo_scope
                                    FROM
                                        results r
                                    WHERE
                                        r.result_id = temp_result_id;
                                    
                                    SET new_result_id = last_insert_id();
                                    
                                    INSERT 
                                        INTO
                                        result_keywords(
                                        created_at,
                                        created_by,
                                        updated_at,
                                        updated_by,
                                        is_active,
                                        result_id,
                                        keyword,
                                        deleted_at)
                                    SELECT rk.created_at,
                                        rk.created_by,
                                        rk.updated_at,
                                        rk.updated_by,
                                        rk.is_active,
                                        new_result_id as result_id,
                                        rk.keyword,
                                        rk.deleted_at
                                    FROM result_keywords rk 
                                    WHERE rk.is_active = TRUE
                                        AND rk.result_id = temp_result_id;
                                    
                                    INSERT
                                        INTO
                                        result_oicrs(
                                        created_at,
                                        created_by,
                                        updated_at,
                                        updated_by,
                                        is_active,
                                        deleted_at,
                                        result_id,
                                        outcome_impact_statement,
                                        general_comment,
                                        oicr_internal_code,
                                        short_outcome_impact_statement,
                                        maturity_level_id,
                                        elaboration_narrative,
                                        mel_regional_expert,
                                        sharepoint_link,
                                        mel_staff_group_id,
                                        for_external_use,
                                        for_external_use_description)
                                    SELECT 
                                        ro.created_at,
                                        ro.created_by,
                                        ro.updated_at,
                                        ro.updated_by,
                                        ro.is_active,
                                        ro.deleted_at,
                                        new_result_id AS result_id,
                                        ro.outcome_impact_statement,
                                        ro.general_comment,
                                        ro.oicr_internal_code,
                                        ro.short_outcome_impact_statement,
                                        ro.maturity_level_id,
                                        ro.elaboration_narrative,
                                        ro.mel_regional_expert,
                                        ro.sharepoint_link,
                                        ro.mel_staff_group_id,
                                        ro.for_external_use,
                                        ro.for_external_use_description
                                    FROM result_oicrs ro 
                                    WHERE ro.is_active = TRUE
                                        AND ro.result_id = temp_result_id;
                                    
                                    INSERT 
                                        INTO
                                        result_notable_references(
                                        created_at,
                                        created_by,
                                        updated_at,
                                        updated_by,
                                        is_active,
                                        deleted_at,
                                        notable_reference_type_id,
                                        link,
                                        result_id)
                                    SELECT 
                                        rnr.created_at,
                                        rnr.created_by,
                                        rnr.updated_at,
                                        rnr.updated_by,
                                        rnr.is_active,
                                        rnr.deleted_at,
                                        rnr.notable_reference_type_id,
                                        rnr.link,
                                        new_result_id AS result_id
                                    FROM result_notable_references rnr 
                                    WHERE rnr.is_active = TRUE
                                        AND rnr.result_id = temp_result_id;
                                    
                                    INSERT
                                        INTO  
                                        result_impact_areas(
                                        created_at,
                                        created_by,
                                        updated_at,
                                        updated_by,
                                        is_active,
                                        deleted_at,
                                        result_id,
                                        impact_area_id,
                                        impact_area_score_id)
                                    SELECT 
                                        ria.created_at,
                                        ria.created_by,
                                        ria.updated_at,
                                        ria.updated_by,
                                        ria.is_active,
                                        ria.deleted_at,
                                        new_result_id as result_id,
                                        ria.impact_area_id,
                                        ria.impact_area_score_id
                                    FROM result_impact_areas ria 
                                    WHERE ria.is_active = TRUE 
                                        AND ria.result_id = temp_result_id;
                                    
                                    INSERT
                                        INTO 
                                        result_impact_area_global_target(
                                        created_at,
                                        created_by,
                                        updated_at,
                                        updated_by,
                                        is_active,
                                        deleted_at,
                                        result_impact_area_id,
                                        global_target_id)
                                    SELECT 
                                        riagt.created_at,
                                        riagt.created_by,
                                        riagt.updated_at,
                                        riagt.updated_by,
                                        riagt.is_active,
                                        riagt.deleted_at,
                                        temp.id AS result_impact_area_id,
                                        riagt.global_target_id
                                    FROM result_impact_areas ria 
                                        INNER JOIN result_impact_area_global_target riagt ON ria.id = riagt.result_impact_area_id 
                                        INNER JOIN (SELECT ria2.id, ria2.result_id, ria2.impact_area_id 
                                                    FROM result_impact_areas ria2
                                                    INNER JOIN results r ON r.result_id = ria2.result_id 
                                                                        AND r.is_active = TRUE
                                                                        AND r.result_id = new_result_id) temp ON temp.impact_area_id = ria.impact_area_id
                                    WHERE ria.result_id = temp_result_id
                                        AND ria.is_active = TRUE
                                        AND riagt.is_active = TRUE;
                                    
                                    INSERT 
                                        INTO result_quantifications(
                                        created_at,
                                        created_by,
                                        updated_at,
                                        updated_by,
                                        is_active,
                                        deleted_at,
                                        quantification_number,
                                        unit,
                                        description,
                                        result_id,
                                        quantification_role_id
                                        )
                                    SELECT 
                                        rq.created_at,
                                        rq.created_by,
                                        rq.updated_at,
                                        rq.updated_by,
                                        rq.is_active,
                                        rq.deleted_at,
                                        rq.quantification_number,
                                        rq.unit,
                                        rq.description,
                                        new_result_id as result_id,
                                        rq.quantification_role_id
                                    FROM result_quantifications rq
                                    WHERE rq.is_active = TRUE
                                        AND rq.result_id  = temp_result_id;
                                    
                                    
                                    INSERT
                                        INTO
                                            result_users(
                                            created_at,
                                            created_by,
                                            updated_at,
                                            updated_by,
                                            is_active,
                                            result_id,
                                            user_role_id,
                                            user_id,
                                            deleted_at)
                                        SELECT 
                                            ru.created_at,
                                            ru.created_by,
                                            ru.updated_at,
                                            ru.updated_by,
                                            ru.is_active,
                                            new_result_id as result_id,
                                            ru.user_role_id,
                                            ru.user_id,
                                            ru.deleted_at
                                        FROM result_users ru 
                                        WHERE ru.is_active = TRUE
                                            AND ru.result_id = temp_result_id;
                                    
                                    INSERT INTO result_contracts (
                                            created_at,
                                            created_by,
                                            updated_at,
                                            updated_by,
                                            is_active,
                                            result_id,
                                            contract_role_id,
                                            contract_id,
                                            is_primary,
                                            deleted_at
                                        )
                                        SELECT
                                            rc.created_at,
                                            rc.created_by,
                                            rc.updated_at,
                                            rc.updated_by,
                                            rc.is_active,
                                            new_result_id as result_id,
                                            rc.contract_role_id,
                                            rc.contract_id,
                                            rc.is_primary,
                                            rc.deleted_at
                                        FROM
                                            result_contracts rc
                                        WHERE rc.is_active = TRUE
                                            AND rc.result_id = temp_result_id;
                                    
                                    INSERT INTO result_levers (
                                            created_at,
                                            created_by,
                                            updated_at,
                                            updated_by,
                                            is_active,
                                            result_id,
                                            lever_role_id,
                                            lever_id,
                                            is_primary,
                                            deleted_at
                                        )
                                        SELECT
                                            rl.created_at,
                                            rl.created_by,
                                            rl.updated_at,
                                            rl.updated_by,
                                            rl.is_active,
                                            new_result_id as result_id,
                                            rl.lever_role_id,
                                            rl.lever_id,
                                            rl.is_primary,
                                            rl.deleted_at
                                        FROM
                                            result_levers AS rl
                                        WHERE rl.is_active = TRUE
                                            AND rl.result_id = temp_result_id;
                                    
                                    INSERT INTO result_institutions (
                                            created_at,
                                            created_by,
                                            updated_at,
                                            updated_by,
                                            is_active,
                                            result_id,
                                            institution_id,
                                            institution_role_id,
                                            deleted_at
                                        )
                                        SELECT
                                            ri.created_at,
                                            ri.created_by,
                                            ri.updated_at,
                                            ri.updated_by,
                                            ri.is_active,
                                            new_result_id as result_id,
                                            ri.institution_id,
                                            ri.institution_role_id,
                                            ri.deleted_at
                                        FROM
                                            result_institutions AS ri
                                        WHERE ri.is_active = TRUE
                                            AND ri.result_id = temp_result_id;
                                    
                                        INSERT INTO result_evidences (
                                                created_at,
                                                created_by,
                                                updated_at,
                                                updated_by,
                                                is_active,
                                                result_id,
                                                evidence_description,
                                                evidence_url,
                                                evidence_role_id,
                                                deleted_at,
                                                is_private
                                            )
                                            SELECT
                                                re.created_at,
                                                re.created_by,
                                                re.updated_at,
                                                re.updated_by,
                                                re.is_active,
                                                new_result_id as result_id,
                                                re.evidence_description,
                                                re.evidence_url,
                                                re.evidence_role_id,
                                                re.deleted_at,
                                                re.is_private
                                            FROM
                                                result_evidences AS re
                                            WHERE re.is_active = TRUE
                                                AND re.result_id = temp_result_id;
                                        
                                        INSERT INTO result_capacity_sharing (
                                                created_at,
                                                created_by,
                                                updated_at,
                                                updated_by,
                                                is_active,
                                                result_id,
                                                training_title,
                                                session_format_id,
                                                session_type_id,
                                                degree_id,
                                                gender_id,
                                                session_length_id,
                                                session_purpose_id,
                                                session_purpose_description,
                                                session_participants_male,
                                                session_participants_female,
                                                session_participants_non_binary,
                                                session_description,
                                                is_attending_organization,
                                                start_date,
                                                end_date,
                                                delivery_modality_id,
                                                trainee_name,
                                                session_participants_total,
                                                deleted_at
                                            )
                                            SELECT
                                                rcs.created_at,
                                                rcs.created_by,
                                                rcs.updated_at,
                                                rcs.updated_by,
                                                rcs.is_active,
                                                new_result_id as result_id,
                                                rcs.training_title,
                                                rcs.session_format_id,
                                                rcs.session_type_id,
                                                rcs.degree_id,
                                                rcs.gender_id,
                                                rcs.session_length_id,
                                                rcs.session_purpose_id,
                                                rcs.session_purpose_description,
                                                rcs.session_participants_male,
                                                rcs.session_participants_female,
                                                rcs.session_participants_non_binary,
                                                rcs.session_description,
                                                rcs.is_attending_organization,
                                                rcs.start_date,
                                                rcs.end_date,
                                                rcs.delivery_modality_id,
                                                rcs.trainee_name,
                                                rcs.session_participants_total,
                                                rcs.deleted_at
                                            FROM
                                                result_capacity_sharing AS rcs
                                            WHERE rcs.is_active = TRUE
                                                AND rcs.result_id = temp_result_id;
                                            
                                    INSERT INTO result_ip_rights (
                                        created_at,
                                        created_by,
                                        updated_at,
                                        updated_by,
                                        is_active,
                                        deleted_at,
                                        result_ip_rights_id,
                                        publicity_restriction,
                                        publicity_restriction_description,
                                        requires_futher_development,
                                        requires_futher_development_description,
                                        asset_ip_owner_id,
                                        asset_ip_owner_description,
                                        potential_asset,
                                        potential_asset_description,
                                        private_sector_engagement_id,
                                        formal_ip_rights_application_id
                                    )
                                    SELECT 
                                    rir.created_at,
                                    rir.created_by,
                                    rir.updated_at,
                                    rir.updated_by,
                                    rir.is_active,
                                    rir.deleted_at,
                                    new_result_id AS result_ip_rights_id,
                                    rir.publicity_restriction,
                                    rir.publicity_restriction_description,
                                    rir.requires_futher_development,
                                    rir.requires_futher_development_description,
                                    rir.asset_ip_owner_id,
                                    rir.asset_ip_owner_description,
                                    rir.potential_asset,
                                    rir.potential_asset_description,
                                    rir.private_sector_engagement_id,
                                    rir.formal_ip_rights_application_id
                                    FROM result_ip_rights rir 
                                    WHERE rir.is_active = true
                                        AND rir.result_ip_rights_id = temp_result_id;
                                    
                                    INSERT INTO result_actors (
                                        created_at,
                                        created_by,
                                        updated_at,
                                        updated_by,
                                        is_active,
                                        deleted_at,
                                        result_id,
                                        actor_type_id,
                                        sex_age_disaggregation_not_apply,
                                        women_youth,
                                        women_not_youth,
                                        men_youth,
                                        men_not_youth,
                                        actor_role_id,
                                        actor_type_custom_name
                                    )
                                    SELECT 
                                    ra.created_at,
                                    ra.created_by,
                                    ra.updated_at,
                                    ra.updated_by,
                                    ra.is_active,
                                    ra.deleted_at,
                                    new_result_id AS result_id,
                                    ra.actor_type_id,
                                    ra.sex_age_disaggregation_not_apply,
                                    ra.women_youth,
                                    ra.women_not_youth,
                                    ra.men_youth,
                                    ra.men_not_youth,
                                    ra.actor_role_id,
                                    ra.actor_type_custom_name
                                    FROM result_actors ra 
                                    WHERE ra.is_active = TRUE
                                        AND ra.result_id = temp_result_id;
                                    
                                    INSERT INTO result_institution_types (
                                        created_at,
                                        created_by,
                                        updated_at,
                                        updated_by,
                                        is_active,
                                        deleted_at,
                                        result_id,
                                        institution_type_id,
                                        institution_type_role_id,
                                        sub_institution_type_id,
                                        institution_type_custom_name,
                                        is_organization_known,
                                        institution_id
                                    )
                                    SELECT 
                                    rit.created_at,
                                    rit.created_by,
                                    rit.updated_at,
                                    rit.updated_by,
                                    rit.is_active,
                                    rit.deleted_at,
                                    new_result_id AS result_id,
                                    rit.institution_type_id,
                                    rit.institution_type_role_id,
                                    rit.sub_institution_type_id,
                                    rit.institution_type_custom_name,
                                    rit.is_organization_known,
                                    rit.institution_id
                                    FROM result_institution_types rit 
                                    WHERE rit.is_active = TRUE
                                        AND rit.result_id = temp_result_id;
                                    
                                    INSERT INTO result_innovation_dev(
                                        created_at,
                                        created_by,
                                        updated_at,
                                        updated_by,
                                        is_active,
                                        deleted_at,
                                        result_id,
                                        short_title,
                                        innovation_nature_id,
                                        innovation_type_id,
                                        innovation_readiness_id,
                                        no_sex_age_disaggregation,
                                        anticipated_users_id,
                                        expected_outcome,
                                        intended_beneficiaries_description,
                                        is_knowledge_sharing,
                                        dissemination_qualification_id,
                                        tool_useful_context,
                                        results_achieved_expected,
                                        is_used_beyond_original_context,
                                        adoption_adaptation_context,
                                        other_tools,
                                        other_tools_integration,
                                        is_cheaper_than_alternatives,
                                        is_simpler_to_use,
                                        does_perform_better,
                                        is_desirable_to_users,
                                        has_commercial_viability,
                                        has_suitable_enabling_environment,
                                        has_evidence_of_uptake,
                                        expansion_potential_id,
                                        expansion_adaptation_details,
                                        new_or_improved_varieties_count,
                                        is_new_or_improved_variety,
                                        innovation_readiness_explanation
                                    )
                                    SELECT 
                                    rid.created_at,
                                    rid.created_by,
                                    rid.updated_at,
                                    rid.updated_by,
                                    rid.is_active,
                                    rid.deleted_at,
                                    new_result_id AS result_id,
                                    rid.short_title,
                                    rid.innovation_nature_id,
                                    rid.innovation_type_id,
                                    rid.innovation_readiness_id,
                                    rid.no_sex_age_disaggregation,
                                    rid.anticipated_users_id,
                                    rid.expected_outcome,
                                    rid.intended_beneficiaries_description,
                                    rid.is_knowledge_sharing,
                                    rid.dissemination_qualification_id,
                                    rid.tool_useful_context,
                                    rid.results_achieved_expected,
                                    rid.is_used_beyond_original_context,
                                    rid.adoption_adaptation_context,
                                    rid.other_tools,
                                    rid.other_tools_integration,
                                    rid.is_cheaper_than_alternatives,
                                    rid.is_simpler_to_use,
                                    rid.does_perform_better,
                                    rid.is_desirable_to_users,
                                    rid.has_commercial_viability,
                                    rid.has_suitable_enabling_environment,
                                    rid.has_evidence_of_uptake,
                                    rid.expansion_potential_id,
                                    rid.expansion_adaptation_details,
                                    rid.new_or_improved_varieties_count,
                                    rid.is_new_or_improved_variety,
                                    rid.innovation_readiness_explanation
                                    FROM result_innovation_dev rid 
                                    WHERE rid.is_active = TRUE
                                        AND rid.result_id = temp_result_id;
                                    
                                    INSERT 
                                        INTO 
                                        result_innovation_tool_function(
                                        created_at,
                                        created_by,
                                        deleted_at,
                                        is_active,
                                        tool_function_id,
                                        result_id,
                                        updated_at,
                                        updated_by)
                                    SELECT 
                                        ritf.created_at,
                                        ritf.created_by,
                                        ritf.deleted_at,
                                        ritf.is_active,
                                        ritf.tool_function_id,
                                        new_result_id as result_id,
                                        ritf.updated_at,
                                        ritf.updated_by 
                                    FROM result_innovation_tool_function ritf 
                                    WHERE ritf.is_active = TRUE
                                        AND ritf.result_id = temp_result_id;
                                    
                                    INSERT INTO result_sdgs(
                                        created_at,
                                        created_by,
                                        updated_at,
                                        updated_by,
                                        is_active,
                                        deleted_at,
                                        result_id,
                                        clarisa_sdg_id
                                    )
                                    SELECT 
                                    rs.created_at,
                                    rs.created_by,
                                    rs.updated_at,
                                    rs.updated_by,
                                    rs.is_active,
                                    rs.deleted_at,
                                    new_result_id as result_id,
                                    rs.clarisa_sdg_id
                                    FROM result_sdgs rs
                                    WHERE rs.is_active = TRUE
                                        AND rs.result_id = temp_result_id;
                                            
                                    INSERT INTO result_policy_change (
                                        created_at,
                                        created_by,
                                        updated_at,
                                        updated_by,
                                        is_active,
                                        result_id,
                                        policy_type_id,
                                        policy_stage_id,
                                        evidence_stage,
                                        deleted_at
                                    )
                                    SELECT
                                        rpc.created_at,
                                        rpc.created_by,
                                        rpc.updated_at,
                                        rpc.updated_by,
                                        rpc.is_active,
                                        new_result_id as result_id,
                                        rpc.policy_type_id,
                                        rpc.policy_stage_id,
                                        rpc.evidence_stage,
                                        rpc.deleted_at
                                    FROM
                                        result_policy_change AS rpc
                                    WHERE rpc.is_active = TRUE
                                        AND rpc.result_id = temp_result_id;
                                    
                                    INSERT INTO result_regions (
                                        created_at,
                                        created_by,
                                        updated_at,
                                        updated_by,
                                        is_active,
                                        result_id,
                                        region_id,
                                        deleted_at
                                    )
                                    SELECT
                                        rr.created_at,
                                        rr.created_by,
                                        rr.updated_at,
                                        rr.updated_by,
                                        rr.is_active,
                                        new_result_id as result_id,
                                        rr.region_id,
                                        rr.deleted_at
                                    FROM
                                        result_regions AS rr
                                    WHERE rr.is_active = TRUE 
                                        AND rr.result_id = temp_result_id;
                                    
                                    INSERT INTO result_countries (
                                        created_at,
                                        created_by,
                                        updated_at,
                                        updated_by,
                                        is_active,
                                        result_id,
                                        country_role_id,
                                        isoAlpha2,
                                        deleted_at
                                    )
                                    SELECT
                                        rc.created_at,
                                        rc.created_by,
                                        rc.updated_at,
                                        rc.updated_by,
                                        rc.is_active,
                                        new_result_id as result_id,
                                        rc.country_role_id,
                                        rc.isoAlpha2,
                                        rc.deleted_at
                                    FROM
                                        result_countries AS rc
                                    WHERE rc.is_active = TRUE
                                        AND rc.result_id = temp_result_id;
                                    
                                    
                                    INSERT 
                                        INTO result_countries_sub_nationals(
                                        created_at,
                                        created_by,
                                        updated_at,
                                        updated_by,
                                        is_active,
                                        result_country_id,
                                        sub_national_id,
                                        deleted_at
                                        )
                                        SELECT 
                                        rcsn.created_at,
                                        rcsn.created_by,
                                        rcsn.updated_at,
                                        rcsn.updated_by,
                                        rcsn.is_active,
                                        temp.result_country_id AS result_country_id,
                                        rcsn.sub_national_id,
                                        rcsn.deleted_at
                                    from result_countries rc 
                                        inner join result_countries_sub_nationals rcsn on rc.result_country_id = rcsn.result_country_id
                                        inner join (select rc2.result_country_id, rc2.result_id, rc2.isoAlpha2  from result_countries rc2 
                                                                inner join results r on r.result_id = rc2.result_id 
                                                                            and r.is_active = true
                                                                            and r.result_id = new_result_id) temp on temp.isoAlpha2 = rc.isoAlpha2
                                    where rc.result_id = temp_result_id
                                        and rcsn.is_active = true
                                        and rc.is_active = true;
                                                                            
                                                                        
                                    
                                    INSERT INTO result_languages (
                                        created_at,
                                        created_by,
                                        updated_at,
                                        updated_by,
                                        is_active,
                                        result_id,
                                        language_id,
                                        language_role_id,
                                        deleted_at
                                    )
                                    SELECT
                                        rl.created_at,
                                        rl.created_by,
                                        rl.updated_at,
                                        rl.updated_by,
                                        rl.is_active,
                                        new_result_id as result_id,
                                        rl.language_id,
                                        rl.language_role_id,
                                        rl.deleted_at
                                    FROM
                                        result_languages AS rl
                                    WHERE rl.is_active = TRUE
                                        AND rl.result_id = temp_result_id;
                                    
                                    INSERT INTO submission_history (
                                        created_at,
                                        created_by,
                                        updated_at,
                                        updated_by,
                                        is_active,
                                        deleted_at,
                                        result_id,
                                        submission_comment,
                                        from_status_id,
                                        to_status_id
                                    )
                                    SELECT
                                        rh.created_at,
                                        rh.created_by,
                                        rh.updated_at,
                                        rh.updated_by,
                                        rh.is_active,
                                        rh.deleted_at,
                                        new_result_id as result_id,
                                        rh.submission_comment,
                                        rh.from_status_id,
                                        rh.to_status_id
                                    FROM
                                        submission_history AS rh
                                    WHERE rh.is_active = TRUE
                                        AND rh.result_id = temp_result_id;
                                    
                                    SELECT *
                                    FROM results r
                                    WHERE r.result_id = new_result_id;
                                    
                                END`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP PROCEDURE IF EXISTS \`SP_versioning\``);
    await queryRunner.query(`CREATE PROCEDURE \`SP_versioning\`(IN resultCode BIGINT)
BEGIN
                        DECLARE temp_result_id BIGINT;
                        DECLARE new_result_id BIGINT;
                        DECLARE report_year INT;
                        DECLARE exists_result BOOLEAN DEFAULT FALSE;
                        
                        SELECT 
                        r.result_id,
                        r.report_year_id 
                            INTO
                        temp_result_id,
                        report_year
                        FROM results r
                        WHERE r.is_active = TRUE
                            AND r.is_snapshot = FALSE
                            AND r.result_official_code = resultCode;
                        
                        IF (temp_result_id IS NULL) THEN
                            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Result not found - temp_result_id is NULL';
                        END IF;
                        
                        SELECT 
                            if(r.result_id IS NOT NULL, TRUE, FALSE)
                            INTO
                            exists_result
                        FROM results r 
                        WHERE r.result_official_code = resultCode 
                            AND r.is_snapshot = true
                            AND r.is_active = true
                            AND r.report_year_id = report_year;
                        
                        IF (exists_result = TRUE) THEN
                            SIGNAL SQLSTATE '45001' SET MESSAGE_TEXT = 'Duplicate entry: temp_result_id already exists';
                        END IF;
                        
                        INSERT
                            INTO
                            results (created_at,
                            created_by,
                            updated_at,
                            updated_by,
                            is_active,
                            result_official_code,
                            version_id,
                            title,
                            description,
                            indicator_id,
                            geo_scope_id,
                            result_status_id,
                            deleted_at,
                            report_year_id,
                            tip_id,
                            is_snapshot,
                            is_ai,
                            platform_code,
                            comment_geo_scope)
                        SELECT
                            r.created_at,
                            r.created_by,
                            r.updated_at,
                            r.updated_by,
                            r.is_active,
                            r.result_official_code,
                            r.version_id,
                            r.title,
                            r.description,
                            r.indicator_id,
                            r.geo_scope_id,
                            r.result_status_id,
                            r.deleted_at,
                            r.report_year_id,
                            r.tip_id,
                            TRUE AS is_snapshot,
                            r.is_ai,
                            r.platform_code,
                            r.comment_geo_scope
                        FROM
                            results r
                        WHERE
                            r.result_id = temp_result_id;
                        
                        SET new_result_id = last_insert_id();
                        
                        INSERT 
                            INTO
                            result_keywords(
                            created_at,
                            created_by,
                            updated_at,
                            updated_by,
                            is_active,
                            result_id,
                            keyword,
                            deleted_at)
                        SELECT rk.created_at,
                            rk.created_by,
                            rk.updated_at,
                            rk.updated_by,
                            rk.is_active,
                            new_result_id as result_id,
                            rk.keyword,
                            rk.deleted_at
                        FROM result_keywords rk 
                        WHERE rk.is_active = TRUE
                            AND rk.result_id = temp_result_id;
                        
                        INSERT
							INTO
							result_oicrs(
							created_at,
							created_by,
							updated_at,
							updated_by,
							is_active,
							deleted_at,
							result_id,
							outcome_impact_statement,
							general_comment,
							oicr_internal_code,
							short_outcome_impact_statement,
							maturity_level_id,
							elaboration_narrative,
							mel_regional_expert,
							sharepoint_link,
							mel_staff_group_id,
							for_external_use,
							for_external_use_description)
						SELECT 
							ro.created_at,
							ro.created_by,
							ro.updated_at,
							ro.updated_by,
							ro.is_active,
							ro.deleted_at,
							new_result_id AS result_id,
							ro.outcome_impact_statement,
							ro.general_comment,
							ro.oicr_internal_code,
							ro.short_outcome_impact_statement,
							ro.maturity_level_id,
							ro.elaboration_narrative,
							ro.mel_regional_expert,
							ro.sharepoint_link,
							ro.mel_staff_group_id,
							ro.for_external_use,
							ro.for_external_use_description
						FROM result_oicrs ro 
						WHERE ro.is_active = TRUE
							AND ro.result_id = temp_result_id;
                        
                        INSERT 
							INTO
							result_notable_references(
							created_at,
							created_by,
							updated_at,
							updated_by,
							is_active,
							deleted_at,
							notable_reference_type_id,
							link,
							result_id)
						SELECT 
							rnr.created_at,
							rnr.created_by,
							rnr.updated_at,
							rnr.updated_by,
							rnr.is_active,
							rnr.deleted_at,
							rnr.notable_reference_type_id,
							rnr.link,
							new_result_id AS result_id
						FROM result_notable_references rnr 
						WHERE rnr.is_active = TRUE
							AND rnr.result_id = temp_result_id;
                        
                        INSERT
                        	INTO  
                        	result_impact_areas(
                        	created_at,
							created_by,
							updated_at,
							updated_by,
							is_active,
							deleted_at,
							result_id,
							impact_area_id,
							impact_area_score_id)
                        SELECT 
							ria.created_at,
							ria.created_by,
							ria.updated_at,
							ria.updated_by,
							ria.is_active,
							ria.deleted_at,
							new_result_id as result_id,
							ria.impact_area_id,
							ria.impact_area_score_id
						FROM result_impact_areas ria 
						WHERE ria.is_active = TRUE 
							AND ria.result_id = temp_result_id;
                        
                        INSERT
							INTO 
							result_impact_area_global_target(
							created_at,
							created_by,
							updated_at,
							updated_by,
							is_active,
							deleted_at,
							result_impact_area_id,
							global_target_id)
						SELECT 
							riagt.created_at,
							riagt.created_by,
							riagt.updated_at,
							riagt.updated_by,
							riagt.is_active,
							riagt.deleted_at,
							temp.id AS result_impact_area_id,
							riagt.global_target_id
						FROM result_impact_areas ria 
							INNER JOIN result_impact_area_global_target riagt ON ria.id = riagt.result_impact_area_id 
							INNER JOIN (SELECT ria2.id, ria2.result_id, ria2.impact_area_id 
										FROM result_impact_areas ria2
										INNER JOIN results r ON r.result_id = ria2.result_id 
															AND r.is_active = TRUE
															AND r.result_id = new_result_id) temp ON temp.impact_area_id = ria.impact_area_id
						WHERE ria.result_id = temp_result_id
							AND ria.is_active = TRUE
							AND riagt.is_active = TRUE;
                        
                        INSERT 
                        	INTO result_quantifications(
                        	created_at,
							created_by,
							updated_at,
							updated_by,
							is_active,
							deleted_at,
							quantification_number,
							unit,
							description,
							result_id,
							quantification_role_id
                        	)
                        SELECT 
							rq.created_at,
							rq.created_by,
							rq.updated_at,
							rq.updated_by,
							rq.is_active,
							rq.deleted_at,
							rq.quantification_number,
							rq.unit,
							rq.description,
							new_result_id as result_id,
							rq.quantification_role_id
						FROM result_quantifications rq
						WHERE rq.is_active = TRUE
							AND rq.result_id  = temp_result_id;
                        
                        
                        INSERT
                            INTO
                                result_users(
                                created_at,
                                created_by,
                                updated_at,
                                updated_by,
                                is_active,
                                result_id,
                                user_role_id,
                                user_id,
                                deleted_at)
                            SELECT 
                                ru.created_at,
                                ru.created_by,
                                ru.updated_at,
                                ru.updated_by,
                                ru.is_active,
                                new_result_id as result_id,
                                ru.user_role_id,
                                ru.user_id,
                                ru.deleted_at
                            FROM result_users ru 
                            WHERE ru.is_active = TRUE
                                AND ru.result_id = temp_result_id;
                        
                        INSERT INTO result_contracts (
                                created_at,
                                created_by,
                                updated_at,
                                updated_by,
                                is_active,
                                result_id,
                                contract_role_id,
                                contract_id,
                                is_primary,
                                deleted_at
                            )
                            SELECT
                                rc.created_at,
                                rc.created_by,
                                rc.updated_at,
                                rc.updated_by,
                                rc.is_active,
                                new_result_id as result_id,
                                rc.contract_role_id,
                                rc.contract_id,
                                rc.is_primary,
                                rc.deleted_at
                            FROM
                                result_contracts rc
                            WHERE rc.is_active = TRUE
                                AND rc.result_id = temp_result_id;
                        
                        INSERT INTO result_levers (
                                created_at,
                                created_by,
                                updated_at,
                                updated_by,
                                is_active,
                                result_id,
                                lever_role_id,
                                lever_id,
                                is_primary,
                                deleted_at
                            )
                            SELECT
                                rl.created_at,
                                rl.created_by,
                                rl.updated_at,
                                rl.updated_by,
                                rl.is_active,
                                new_result_id as result_id,
                                rl.lever_role_id,
                                rl.lever_id,
                                rl.is_primary,
                                rl.deleted_at
                            FROM
                                result_levers AS rl
                            WHERE rl.is_active = TRUE
                                AND rl.result_id = temp_result_id;
                        
                        INSERT INTO result_institutions (
                                created_at,
                                created_by,
                                updated_at,
                                updated_by,
                                is_active,
                                result_id,
                                institution_id,
                                institution_role_id,
                                deleted_at
                            )
                            SELECT
                                ri.created_at,
                                ri.created_by,
                                ri.updated_at,
                                ri.updated_by,
                                ri.is_active,
                                new_result_id as result_id,
                                ri.institution_id,
                                ri.institution_role_id,
                                ri.deleted_at
                            FROM
                                result_institutions AS ri
                            WHERE ri.is_active = TRUE
                                AND ri.result_id = temp_result_id;
                        
                            INSERT INTO result_evidences (
                                    created_at,
                                    created_by,
                                    updated_at,
                                    updated_by,
                                    is_active,
                                    result_id,
                                    evidence_description,
                                    evidence_url,
                                    evidence_role_id,
                                    deleted_at,
                                    is_private
                                )
                                SELECT
                                    re.created_at,
                                    re.created_by,
                                    re.updated_at,
                                    re.updated_by,
                                    re.is_active,
                                    new_result_id as result_id,
                                    re.evidence_description,
                                    re.evidence_url,
                                    re.evidence_role_id,
                                    re.deleted_at,
                                    re.is_private
                                FROM
                                    result_evidences AS re
                                WHERE re.is_active = TRUE
                                    AND re.result_id = temp_result_id;
                            
                            INSERT INTO result_capacity_sharing (
                                    created_at,
                                    created_by,
                                    updated_at,
                                    updated_by,
                                    is_active,
                                    result_id,
                                    training_title,
                                    session_format_id,
                                    session_type_id,
                                    degree_id,
                                    gender_id,
                                    session_length_id,
                                    session_purpose_id,
                                    session_purpose_description,
                                    session_participants_male,
                                    session_participants_female,
                                    session_participants_non_binary,
                                    session_description,
                                    is_attending_organization,
                                    start_date,
                                    end_date,
                                    delivery_modality_id,
                                    trainee_name,
                                    session_participants_total,
                                    deleted_at
                                )
                                SELECT
                                    rcs.created_at,
                                    rcs.created_by,
                                    rcs.updated_at,
                                    rcs.updated_by,
                                    rcs.is_active,
                                    new_result_id as result_id,
                                    rcs.training_title,
                                    rcs.session_format_id,
                                    rcs.session_type_id,
                                    rcs.degree_id,
                                    rcs.gender_id,
                                    rcs.session_length_id,
                                    rcs.session_purpose_id,
                                    rcs.session_purpose_description,
                                    rcs.session_participants_male,
                                    rcs.session_participants_female,
                                    rcs.session_participants_non_binary,
                                    rcs.session_description,
                                    rcs.is_attending_organization,
                                    rcs.start_date,
                                    rcs.end_date,
                                    rcs.delivery_modality_id,
                                    rcs.trainee_name,
                                    rcs.session_participants_total,
                                    rcs.deleted_at
                                FROM
                                    result_capacity_sharing AS rcs
                                WHERE rcs.is_active = TRUE
                                    AND rcs.result_id = temp_result_id;
                                
                        INSERT INTO result_ip_rights (
                            created_at,
                            created_by,
                            updated_at,
                            updated_by,
                            is_active,
                            deleted_at,
                            result_ip_rights_id,
                            publicity_restriction,
                            publicity_restriction_description,
                            requires_futher_development,
                            requires_futher_development_description,
                            asset_ip_owner_id,
                            asset_ip_owner_description,
                            potential_asset,
                            potential_asset_description,
                            private_sector_engagement_id,
                            formal_ip_rights_application_id
                        )
                        SELECT 
                        rir.created_at,
                        rir.created_by,
                        rir.updated_at,
                        rir.updated_by,
                        rir.is_active,
                        rir.deleted_at,
                        new_result_id AS result_ip_rights_id,
                        rir.publicity_restriction,
                        rir.publicity_restriction_description,
                        rir.requires_futher_development,
                        rir.requires_futher_development_description,
                        rir.asset_ip_owner_id,
                        rir.asset_ip_owner_description,
                        rir.potential_asset,
                        rir.potential_asset_description,
                        rir.private_sector_engagement_id,
                        rir.formal_ip_rights_application_id
                        FROM result_ip_rights rir 
                        WHERE rir.is_active = true
                            AND rir.result_ip_rights_id = temp_result_id;
                        
                        INSERT INTO result_actors (
                            created_at,
                            created_by,
                            updated_at,
                            updated_by,
                            is_active,
                            deleted_at,
                            result_id,
                            actor_type_id,
                            sex_age_disaggregation_not_apply,
                            women_youth,
                            women_not_youth,
                            men_youth,
                            men_not_youth,
                            actor_role_id,
                            actor_type_custom_name
                        )
                        SELECT 
                        ra.created_at,
                        ra.created_by,
                        ra.updated_at,
                        ra.updated_by,
                        ra.is_active,
                        ra.deleted_at,
                        new_result_id AS result_id,
                        ra.actor_type_id,
                        ra.sex_age_disaggregation_not_apply,
                        ra.women_youth,
                        ra.women_not_youth,
                        ra.men_youth,
                        ra.men_not_youth,
                        ra.actor_role_id,
                        ra.actor_type_custom_name
                        FROM result_actors ra 
                        WHERE ra.is_active = TRUE
                            AND ra.result_id = temp_result_id;
                        
                        INSERT INTO result_institution_types (
                            created_at,
                            created_by,
                            updated_at,
                            updated_by,
                            is_active,
                            deleted_at,
                            result_id,
                            institution_type_id,
                            institution_type_role_id,
                            sub_institution_type_id,
                            institution_type_custom_name,
                            is_organization_known,
                            institution_id
                        )
                        SELECT 
                        rit.created_at,
                        rit.created_by,
                        rit.updated_at,
                        rit.updated_by,
                        rit.is_active,
                        rit.deleted_at,
                        new_result_id AS result_id,
                        rit.institution_type_id,
                        rit.institution_type_role_id,
                        rit.sub_institution_type_id,
                        rit.institution_type_custom_name,
                        rit.is_organization_known,
                        rit.institution_id
                        FROM result_institution_types rit 
                        WHERE rit.is_active = TRUE
                            AND rit.result_id = temp_result_id;
                        
                        INSERT INTO result_innovation_dev(
                            created_at,
                            created_by,
                            updated_at,
                            updated_by,
                            is_active,
                            deleted_at,
                            result_id,
                            short_title,
                            innovation_nature_id,
                            innovation_type_id,
                            innovation_readiness_id,
                            no_sex_age_disaggregation,
                            anticipated_users_id,
                            expected_outcome,
                            intended_beneficiaries_description,
                            is_knowledge_sharing,
                            dissemination_qualification_id,
                            tool_useful_context,
                            results_achieved_expected,
                            is_used_beyond_original_context,
                            adoption_adaptation_context,
                            other_tools,
                            other_tools_integration,
                            is_cheaper_than_alternatives,
                            is_simpler_to_use,
                            does_perform_better,
                            is_desirable_to_users,
                            has_commercial_viability,
                            has_suitable_enabling_environment,
                            has_evidence_of_uptake,
                            expansion_potential_id,
                            expansion_adaptation_details,
                            new_or_improved_varieties_count,
                            is_new_or_improved_variety,
                            innovation_readiness_explanation
                        )
                        SELECT 
                        rid.created_at,
                        rid.created_by,
                        rid.updated_at,
                        rid.updated_by,
                        rid.is_active,
                        rid.deleted_at,
                        new_result_id AS result_id,
                        rid.short_title,
                        rid.innovation_nature_id,
                        rid.innovation_type_id,
                        rid.innovation_readiness_id,
                        rid.no_sex_age_disaggregation,
                        rid.anticipated_users_id,
                        rid.expected_outcome,
                        rid.intended_beneficiaries_description,
                        rid.is_knowledge_sharing,
                        rid.dissemination_qualification_id,
                        rid.tool_useful_context,
                        rid.results_achieved_expected,
                        rid.is_used_beyond_original_context,
                        rid.adoption_adaptation_context,
                        rid.other_tools,
                        rid.other_tools_integration,
                        rid.is_cheaper_than_alternatives,
                        rid.is_simpler_to_use,
                        rid.does_perform_better,
                        rid.is_desirable_to_users,
                        rid.has_commercial_viability,
                        rid.has_suitable_enabling_environment,
                        rid.has_evidence_of_uptake,
                        rid.expansion_potential_id,
                        rid.expansion_adaptation_details,
                        rid.new_or_improved_varieties_count,
                        rid.is_new_or_improved_variety,
                        rid.innovation_readiness_explanation
                        FROM result_innovation_dev rid 
                        WHERE rid.is_active = TRUE
                            AND rid.result_id = temp_result_id;
                        
                        INSERT 
                        	INTO 
                        	result_innovation_tool_function(
                        	created_at,
                        	created_by,
                        	deleted_at,
                        	is_active,
                        	tool_function_id,
                        	result_id,
                        	updated_at,
                        	updated_by)
                        SELECT 
                        	ritf.created_at,
                        	ritf.created_by,
                        	ritf.deleted_at,
                        	ritf.is_active,
                        	ritf.tool_function_id,
                        	new_result_id as result_id,
                        	ritf.updated_at,
                        	ritf.updated_by 
                        FROM result_innovation_tool_function ritf 
                        WHERE ritf.is_active = TRUE
                        	AND ritf.result_id = temp_result_id;
                        
                        INSERT INTO result_sdgs(
                            created_at,
                            created_by,
                            updated_at,
                            updated_by,
                            is_active,
                            deleted_at,
                            result_id,
                            clarisa_sdg_id
                        )
                        SELECT 
                        rs.created_at,
                        rs.created_by,
                        rs.updated_at,
                        rs.updated_by,
                        rs.is_active,
                        rs.deleted_at,
                        new_result_id as result_id,
                        rs.clarisa_sdg_id
                        FROM result_sdgs rs
                        WHERE rs.is_active = TRUE
                            AND rs.result_id = temp_result_id;
                                
                        INSERT INTO result_policy_change (
                            created_at,
                            created_by,
                            updated_at,
                            updated_by,
                            is_active,
                            result_id,
                            policy_type_id,
                            policy_stage_id,
                            evidence_stage,
                            deleted_at
                        )
                        SELECT
                            rpc.created_at,
                            rpc.created_by,
                            rpc.updated_at,
                            rpc.updated_by,
                            rpc.is_active,
                            new_result_id as result_id,
                            rpc.policy_type_id,
                            rpc.policy_stage_id,
                            rpc.evidence_stage,
                            rpc.deleted_at
                        FROM
                            result_policy_change AS rpc
                        WHERE rpc.is_active = TRUE
                            AND rpc.result_id = temp_result_id;
                        
                        INSERT INTO result_regions (
                            created_at,
                            created_by,
                            updated_at,
                            updated_by,
                            is_active,
                            result_id,
                            region_id,
                            deleted_at
                        )
                        SELECT
                            rr.created_at,
                            rr.created_by,
                            rr.updated_at,
                            rr.updated_by,
                            rr.is_active,
                            new_result_id as result_id,
                            rr.region_id,
                            rr.deleted_at
                        FROM
                            result_regions AS rr
                        WHERE rr.is_active = TRUE 
                            AND rr.result_id = temp_result_id;
                        
                        INSERT INTO result_countries (
                            created_at,
                            created_by,
                            updated_at,
                            updated_by,
                            is_active,
                            result_id,
                            country_role_id,
                            isoAlpha2,
                            deleted_at
                        )
                        SELECT
                            rc.created_at,
                            rc.created_by,
                            rc.updated_at,
                            rc.updated_by,
                            rc.is_active,
                            new_result_id as result_id,
                            rc.country_role_id,
                            rc.isoAlpha2,
                            rc.deleted_at
                        FROM
                            result_countries AS rc
                        WHERE rc.is_active = TRUE
                            AND rc.result_id = temp_result_id;
                        
                        
                        INSERT 
                            INTO result_countries_sub_nationals(
                            created_at,
                            created_by,
                            updated_at,
                            updated_by,
                            is_active,
                            result_country_id,
                            sub_national_id,
                            deleted_at
                            )
                            SELECT 
                            rcsn.created_at,
                            rcsn.created_by,
                            rcsn.updated_at,
                            rcsn.updated_by,
                            rcsn.is_active,
                            temp.result_country_id AS result_country_id,
                            rcsn.sub_national_id,
                            rcsn.deleted_at
                        from result_countries rc 
                            inner join result_countries_sub_nationals rcsn on rc.result_country_id = rcsn.result_country_id
                            inner join (select rc2.result_country_id, rc2.result_id, rc2.isoAlpha2  from result_countries rc2 
                                                    inner join results r on r.result_id = rc2.result_id 
                                                                and r.is_active = true
                                                                and r.result_id = new_result_id) temp on temp.isoAlpha2 = rc.isoAlpha2
                        where rc.result_id = temp_result_id
                            and rcsn.is_active = true
                            and rc.is_active = true;
                                                                
                                                            
                        
                        INSERT INTO result_languages (
                            created_at,
                            created_by,
                            updated_at,
                            updated_by,
                            is_active,
                            result_id,
                            language_id,
                            language_role_id,
                            deleted_at
                        )
                        SELECT
                            rl.created_at,
                            rl.created_by,
                            rl.updated_at,
                            rl.updated_by,
                            rl.is_active,
                            new_result_id as result_id,
                            rl.language_id,
                            rl.language_role_id,
                            rl.deleted_at
                        FROM
                            result_languages AS rl
                        WHERE rl.is_active = TRUE
                            AND rl.result_id = temp_result_id;
                        
                        INSERT INTO submission_history (
                            created_at,
                            created_by,
                            updated_at,
                            updated_by,
                            is_active,
                            deleted_at,
                            result_id,
                            submission_comment,
                            from_status_id,
                            to_status_id
                        )
                        SELECT
                            rh.created_at,
                            rh.created_by,
                            rh.updated_at,
                            rh.updated_by,
                            rh.is_active,
                            rh.deleted_at,
                            new_result_id as result_id,
                            rh.submission_comment,
                            rh.from_status_id,
                            rh.to_status_id
                        FROM
                            submission_history AS rh
                        WHERE rh.is_active = TRUE
                            AND rh.result_id = temp_result_id;
                        
                        SELECT *
                        FROM results r
                        WHERE r.result_id = new_result_id;
                        
                    END`);
  }
}
