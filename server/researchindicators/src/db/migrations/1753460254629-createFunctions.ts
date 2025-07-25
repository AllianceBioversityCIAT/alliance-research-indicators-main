import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateFunctions1753460254629 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP FUNCTION IF EXISTS \`valid_text\``);
    await queryRunner.query(`
        CREATE FUNCTION \`valid_text\`(text TEXT) RETURNS tinyint(1)
            READS SQL DATA
            DETERMINISTIC
        BEGIN
            RETURN IF(text IS NOT NULL, LENGTH(TRIM(text)) > 0, FALSE);
        END`);

    await queryRunner.query(
      `DROP FUNCTION IF EXISTS \`count_words_and_validate\``,
    );
    await queryRunner.query(`
        CREATE FUNCTION \`count_words_and_validate\`(text TEXT, max_words INT) RETURNS tinyint(1)
            READS SQL DATA
            DETERMINISTIC
        BEGIN
            DECLARE word_count INT;
        
            SET word_count = LENGTH(TRIM(text)) - LENGTH(REPLACE(TRIM(text), ' ', '')) + 1;
            
            IF text IS NULL OR TRIM(text) = '' THEN
                RETURN FALSE;
            END IF;
            
            IF word_count <= max_words THEN
                RETURN TRUE;
            ELSE
                RETURN FALSE;
            END IF;
        END`);

    await queryRunner.query(
      `DROP FUNCTION IF EXISTS \`policy_change_validation\``,
    );
    await queryRunner.query(`
        CREATE FUNCTION \`policy_change_validation\`(result_code BIGINT) RETURNS tinyint(1)
            READS SQL DATA
        begin
            DECLARE validation BOOLEAN DEFAULT FALSE;

            SELECT 
                (rpc.policy_type_id IS NOT NULL
                    AND rpc.policy_stage_id IS NOT NULL
                    AND valid_text(rpc.evidence_stage))
                INTO
                validation
            FROM result_policy_change rpc 
            WHERE rpc.is_active = TRUE
                AND rpc.result_id = result_code;
            
            SELECT 
                (COUNT(ri.institution_id) > 0 AND validation)
                INTO
                validation
            FROM result_institutions ri 
            WHERE ri.institution_role_id = 4
                AND ri.is_active = TRUE
                AND ri.result_id = result_code;
            
            RETURN validation;
            
        end`);

    await queryRunner.query(`DROP FUNCTION IF EXISTS \`partners_validation\``);
    await queryRunner.query(`
        CREATE FUNCTION \`partners_validation\`(result_code BIGINT) RETURNS tinyint(1)
            READS SQL DATA
        begin
            declare temp_institution boolean default null;

            select 
                if(count(ri.institution_id) > 0, true, false) 
                into
                temp_institution
            from result_institutions ri 
            where ri.is_active = true 
                and ri.institution_role_id in (1,2,3)
                and ri.institution_id is not null
                and ri.result_id = result_code
            limit 1;

            return temp_institution;
            
        end`);

    await queryRunner.query(
      `DROP FUNCTION IF EXISTS \`intellectual_property_validation\``,
    );
    await queryRunner.query(`
        CREATE FUNCTION \`intellectual_property_validation\`(result_code BIGINT) RETURNS tinyint(1)
            READS SQL DATA
        BEGIN
            
            DECLARE validation BOOLEAN DEFAULT false;
            DECLARE validationInnoDev BOOLEAN DEFAULT false;
            DECLARE indicatorId BIGINT DEFAULT NULL;

            SELECT 
                IF(rir.asset_ip_owner_id = 4, count_words_and_validate(rir.asset_ip_owner_description, 1000), rir.asset_ip_owner_id IS NOT NULL )
                AND IF(rir.potential_asset = TRUE, valid_text(rir.potential_asset_description), TRUE)
                AND rir.publicity_restriction IS NOT NULL
                AND IF(rir.publicity_restriction = TRUE, valid_text(rir.publicity_restriction_description), TRUE)
                AND rir.requires_futher_development IS NOT NULL
                AND IF(rir.requires_futher_development = TRUE, valid_text(rir.requires_futher_development_description), TRUE),
                (rir.formal_ip_rights_application_id IS NOT NULL
                AND rir.private_sector_engagement_id IS NOT NULL),
                r.indicator_id 
                INTO
                validation,
                validationInnoDev,
                indicatorId
            FROM result_ip_rights rir
            INNER JOIN results r ON r.result_id = rir.result_ip_rights_id 
            WHERE rir.is_active = TRUE
                AND rir.result_ip_rights_id = result_code
            LIMIT 1;
            
            IF indicatorId = 2 THEN 
                RETURN validation AND validationInnoDev;
            END IF;
            
            RETURN validation;

        END`);

    await queryRunner.query(
      `DROP FUNCTION IF EXISTS \`innovation_dev_validation\``,
    );
    await queryRunner.query(`
        CREATE FUNCTION \`innovation_dev_validation\`(result_code BIGINT) RETURNS tinyint(1)
            READS SQL DATA
        BEGIN
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
                rid.anticipated_users_id IS NOT NULL),
                rid.anticipated_users_id,
                (valid_text(rid.expected_outcome) AND
                valid_text(rid.intended_beneficiaries_description)),
                IF(rid.is_knowledge_sharing = TRUE AND rid.is_knowledge_sharing IS NOT NULL, 
                IF(rid.dissemination_qualification_id IS NOT NULL AND rid.dissemination_qualification_id = 2,
                valid_text(rid.tool_useful_context) 
                AND valid_text(rid.results_achieved_expected)
                AND rid.tool_function_id IS NOT NULL
                AND IF(rid.is_used_beyond_original_context = TRUE,
                valid_text(rid.adoption_adaptation_context),IF(rid.is_used_beyond_original_context IS NULL, FALSE, TRUE)),  IF(rid.dissemination_qualification_id IS NULL, FALSE, TRUE)) ,IF(rid.is_knowledge_sharing IS NULL, FALSE, TRUE)),
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
            
            SELECT
                COUNT(ra.result_actors_id)
                INTO
                tempFullActors
            FROM result_actors ra 
            WHERE ra.result_id = result_code
                AND ra.is_active = TRUE;
            
            SELECT 
                IFNULL(
                    SUM(
                        CASE
                            WHEN ra.actor_type_id = 5 THEN ra.actor_type_custom_name IS NOT NULL
                            ELSE ra.actor_type_id IS NOT NULL
                        END
                    ), FALSE)
                INTO
                tempActors
            FROM result_actors ra 
            WHERE ra.result_id = result_code
                AND ra.is_active = TRUE;
            
            SELECT 
                IFNULL(SUM(CASE
                    WHEN rit.institution_type_id = 78 THEN rit.institution_type_custom_name IS NOT NULL
                    WHEN (rit.institution_type_id != 78 AND rit.institution_type_id IS NOT NULL) THEN CASE 
                        WHEN (SELECT COUNT(cit.code) FROM clarisa_institution_types cit WHERE cit.parent_code = rit.institution_type_id) > 0 THEN rit.sub_institution_type_id IS NOT NULL
                        ELSE rit.institution_type_id IS NOT NULL
                    END
                    ELSE FALSE
                END), FALSE)
                INTO
                tempInstitutionType
            FROM result_institution_types rit 
            WHERE rit.result_id = result_code
                AND rit.is_active = TRUE;
                
            SELECT 
                count(rit.result_institution_type_id)
                INTO
                tempFullInstitutionType
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
        END`);

    await queryRunner.query(
      `DROP FUNCTION IF EXISTS \`geo_location_validation\``,
    );
    await queryRunner.query(`
        CREATE FUNCTION \`geo_location_validation\`(result_code BIGINT) RETURNS tinyint(1)
            READS SQL DATA
        begin
            declare reurn_validation boolean default false;
            declare temp_geo_scope_id int default 0;
            declare count_country int default 0;
            declare count_subnationals int default 0;
            declare ids_list text default '';
            select 
                r.geo_scope_id 
                into
                temp_geo_scope_id
            from results r
            where r.is_active = true
                and r.result_id = result_code
            limit 1;
            
            if temp_geo_scope_id in (1, 50) then
            
                return true;
                
            end if;
            if temp_geo_scope_id = 2 then
            
                select 
                    if(count(rr.region_id) > 0, true, false)
                    into
                    reurn_validation
                from result_regions rr 
                where rr.is_active = true
                    and rr.result_id = result_code
                    and rr.result_region_id is not null;
                    
                return reurn_validation;
            
            end if;
            if temp_geo_scope_id in (3, 4, 5) then
            
                select 
                    count(rc.isoAlpha2),
                    group_concat(rc.result_country_id separator ',') 
                    into
                    count_country,
                    ids_list
                from result_countries rc
                where rc.is_active = true   
                    and rc.country_role_id = 2
                    and rc.result_id = result_code
                    and rc.isoAlpha2 is not null;
                
                set reurn_validation = if (count_country > 0, true, false);
                    
            end if;
            if temp_geo_scope_id = 5 then
                
                select 
                    sum(temp_sn.valid)
                    into
                    count_subnationals
                from (select 
                    if(count(rcsn.sub_national_id) > 0, 1, 0) as valid
                    from result_countries_sub_nationals rcsn 
                    where find_in_set(rcsn.result_country_id, ids_list)
                        and rcsn.is_active = true
                        and rcsn.sub_national_id is not null
                    group by rcsn.result_country_id) temp_sn;
                
                set reurn_validation = if (count_country > 0 and count_subnationals = count_country, true, false);
                
            end if;
            
            return reurn_validation;
            
        end`);

    await queryRunner.query(
      `DROP FUNCTION IF EXISTS \`general_information_validation\``,
    );
    await queryRunner.query(`
        CREATE FUNCTION \`general_information_validation\`(result_code BIGINT) RETURNS tinyint(1)
            READS SQL DATA
        BEGIN
            
            DECLARE temp_title BOOLEAN DEFAULT FALSE;
            DECLARE temp_contact_person BOOLEAN DEFAULT FALSE; 
            DECLARE temp_description BOOLEAN DEFAULT FALSE;

            SELECT 
                valid_text(r.title),
                valid_text(r.description),
                IF(ru.user_id IS NOT NULL, TRUE, FALSE)
                INTO
                temp_title,
                temp_description,
                temp_contact_person
            FROM results r 
            LEFT JOIN result_users ru ON ru.result_id = r.result_id
                                        AND ru.is_active = 1
                                        AND ru.user_role_id = 1
            WHERE r.result_id = result_code
                AND r.is_active = TRUE
                AND r.indicator_id IS NOT NULL
            LIMIT 1;
            
            RETURN temp_title AND temp_contact_person AND temp_description;
        
        END`);

    await queryRunner.query(`DROP FUNCTION IF EXISTS \`evidences_validation\``);
    await queryRunner.query(`
        CREATE FUNCTION \`evidences_validation\`(result_code BIGINT) RETURNS tinyint(1)
            READS SQL DATA
        begin 
            
            declare temp_count_url int default 0;
            declare temp_count_description int default 0;
            declare temp_count_evidences int default 0;
            declare reurn_validation boolean default false;

            select 
                count(re.result_evidence_id),
                sum(valid_text(re.evidence_url)),
                sum(valid_text(re.evidence_description)) 
                into
                temp_count_evidences,
                temp_count_url,
                temp_count_description
            from result_evidences re 
            where re.is_active = true
                and re.evidence_role_id = 1
                and re.result_id = result_code
            group by re.result_id;
                
            set reurn_validation = if( temp_count_evidences > 0 and temp_count_url = temp_count_description, true, false );
                
            return reurn_validation;
            
        end`);

    await queryRunner.query(
      `DROP FUNCTION IF EXISTS \`cap_sharing_validation\``,
    );
    await queryRunner.query(`
        CREATE FUNCTION \`cap_sharing_validation\`(result_code BIGINT) RETURNS tinyint(1)
            READS SQL DATA
        BEGIN 
            
            DECLARE session_format BIGINT DEFAULT NULL;
            DECLARE individual_validation BOOLEAN DEFAULT FALSE;
            DECLARE group_validation BOOLEAN DEFAULT FALSE;
            DECLARE common_data BOOLEAN DEFAULT FALSE;
            DECLARE specific_individual_validation BOOLEAN DEFAULT FALSE;
            DECLARE specific_group_validation BOOLEAN DEFAULT FALSE; 
            
            SELECT 
                rcs.session_format_id,
                (rcs.session_type_id IS NOT NULL
                    AND rcs.gender_id IS NOT NULL
                    AND valid_text(rcs.trainee_name)),
                (rcs.session_purpose_id IS NOT NULL
                    AND IFNULL(rcs.session_participants_total, 0) > 0
                    AND rcs.is_attending_organization IS NOT NULL
                    AND IF(rcs.session_purpose_id = 4, valid_text(rcs.session_purpose_description), TRUE)),
                (rcs.session_format_id IS NOT NULL  
                    AND rcs.delivery_modality_id IS NOT NULL
                    AND rcs.session_length_id IS NOT NULL
                    AND rcs.start_date IS NOT NULL
                    AND rcs.end_date IS NOT NULL
                    AND IF(rcs.session_length_id = 2, rcs.degree_id IS NOT NULL, TRUE))
                INTO
                session_format,
                individual_validation,
                group_validation,
                common_data
            FROM result_capacity_sharing rcs 
            WHERE rcs.is_active = TRUE
                AND rcs.result_id = result_code
            LIMIT 1;
            
            SELECT 
                COUNT(ru.user_id) = 1 AND common_data
                INTO
                common_data
            FROM result_users ru 
            WHERE ru.is_active = TRUE
                AND ru.user_role_id = 2
                AND ru.result_id = result_code
            LIMIT 1;
            
            IF common_data = FALSE THEN
            
                RETURN FALSE;
            
            END IF;
            
            IF session_format = 1 THEN 
                
                RETURN TRUE;
            
            ELSEIF  session_format = 2 THEN
            
                SELECT 
                    COUNT(ri.institution_id) > 0
                    INTO 
                    specific_group_validation
                FROM result_institutions ri 
                WHERE ri.is_active = TRUE
                    AND ri.institution_role_id = 2
                    AND ri.result_id = result_code;
                
                RETURN specific_group_validation AND group_validation;
            
            END IF;
            
            
                
            RETURN FALSE;
            
        END`);

    await queryRunner.query(`DROP FUNCTION IF EXISTS \`alignment_validation\``);
    await queryRunner.query(`
        CREATE FUNCTION \`alignment_validation\`(result_code BIGINT) RETURNS tinyint(1)
            READS SQL DATA
        begin
            declare temp_contract boolean default null;
            declare temp_lever boolean default null;
            declare temp_sdg boolean default null;
            
            select 
                if(count(rc.contract_id) > 0, true, false)
                into
                temp_contract
            from result_contracts rc 
            where rc.is_active = true 
                and rc.is_primary = true 
                and rc.contract_role_id = 1
                and rc.result_id = result_code
                and rc.contract_id is not null
            limit 1;
            
            select
                if(count(rs.result_sdg_id) > 0, true, false)
                into
                temp_sdg
            from result_sdgs rs 
            where rs.is_active = true
                and rs.result_id = result_code
                and rs.clarisa_sdg_id is not NULL 
            limit 1;
                
            
            select 
                if(count(rl.lever_id) > 0, true, false) 
                into 
                temp_lever
            from result_levers rl 
            where rl.is_active = true 
                and rl.is_primary = true 
                and rl.lever_role_id = 1
                and rl.result_id = result_code
                and rl.lever_id is not null
            limit 1;
            
            return temp_contract and temp_sdg;
            
        end`);

    await queryRunner.query(`DROP FUNCTION IF EXISTS \`delete_result\``);
    await queryRunner.query(`
        CREATE FUNCTION \`delete_result\`(result_code BIGINT) RETURNS tinyint(1)
            DETERMINISTIC
        BEGIN
            DECLARE resultId BIGINT DEFAULT NULL;
            DECLARE deleteDate TIMESTAMP DEFAULT NOW();
            
            SELECT 
                r.result_id 
                INTO
                resultId
            FROM results r 
            WHERE r.is_active = TRUE
                AND r.result_id = result_code
            LIMIT 1;
            
            IF resultId IS NULL THEN 
                RETURN FALSE;
            END IF;
            
            UPDATE results r
            SET r.is_active = FALSE,
                r.deleted_at = deleteDate,
                r.result_status_id = 8
            WHERE r.result_id = resultId
                AND r.is_active = TRUE;
            
            UPDATE result_keywords rk
            SET rk.is_active = FALSE,
                rk.deleted_at = deleteDate
            WHERE rk.result_id = resultId
                AND rk.is_active = TRUE;
            
            UPDATE result_users ru 
            SET ru.is_active = FALSE,
                ru.deleted_at = deleteDate
            WHERE ru.result_id = resultId
                AND ru.is_active = TRUE;
            
            UPDATE result_contracts rc 
            SET rc.is_active = FALSE,
                rc.deleted_at =  deleteDate
            WHERE rc.result_id = resultId
                AND rc.is_active = TRUE;
            
            UPDATE result_levers rl 
            SET rl.is_active = FALSE,
                rl.deleted_at = deleteDate
            WHERE rl.result_id = resultId
                AND rl.is_active = TRUE;
            
            UPDATE result_institutions ri 
            SET ri.is_active = FALSE,
                ri.deleted_at = deleteDate
            WHERE ri.result_id = resultId
                AND ri.is_active = TRUE;
            
            UPDATE result_countries rc 
            INNER JOIN result_countries_sub_nationals rcsn ON rc.result_country_id = rcsn.result_country_id 
            SET rcsn.is_active = FALSE,
                rcsn.deleted_at = deleteDate
            WHERE rc.is_active = TRUE
                AND rc.result_id = resultId
                AND rcsn.is_active = TRUE;
            
            UPDATE result_countries rc 
            SET rc.is_active = FALSE,
                rc.deleted_at = deleteDate
            WHERE rc.result_id = resultId
                AND rc.is_active = TRUE;
            
            UPDATE result_regions rr 
            SET rr.is_active = FALSE,
                rr.deleted_at = deleteDate
            WHERE rr.result_id = resultId
                AND rr.is_active = TRUE;
            
            UPDATE result_evidences re 
            SET re.is_active = FALSE,
                re.deleted_at = deleteDate
            WHERE re.result_id = resultId
                AND re.is_active = TRUE;
            
            UPDATE link_results lr 
            SET lr.is_active = FALSE,
                lr.deleted_at = deleteDate
            WHERE lr.result_id = resultId
                AND lr.is_active = TRUE;
            
            UPDATE result_policy_change rpc 
            SET rpc.is_active = FALSE,
                rpc.deleted_at = deleteDate
            WHERE rpc.result_id = resultId
                AND rpc.is_active = TRUE;
            
            UPDATE result_capacity_sharing rcs 
            SET rcs.is_active = FALSE,
                rcs.deleted_at = deleteDate
            WHERE rcs.result_id = resultId
                AND rcs.is_active = TRUE;
            
            UPDATE result_innovation_dev rid 
            SET rid.is_active = FALSE, 
                rid.deleted_at = deleteDate
            WHERE rid.result_id = resultId
                AND rid.is_active = TRUE;
            
            UPDATE result_ip_rights rir  
            SET rir.is_active = FALSE, 
                rir.deleted_at = deleteDate
            WHERE rir.result_ip_rights_id = resultId
                AND rir.is_active = TRUE;

            UPDATE result_languages rl 
            SET  rl.is_active = FALSE, 
                rl.deleted_at = deleteDate
            WHERE rl.result_id = resultId
                AND rl.is_active = TRUE;

            UPDATE result_institution_types rit 
            SET rl.is_active = FALSE,
                rl.deleted_at = deleteDate
            WHERE rit.is_active = TRUE
                AND rit.result_id = resultId;
            
            UPDATE result_actors ra 
            SET ra.is_active = FALSE,
                ra.deleted_at = deleteDate
            WHERE ra.is_active = TRUE
                AND ra.result_id = resultId;
            
            RETURN TRUE;
            
        END`);

    await queryRunner.query(`DROP PROCEDURE IF EXISTS \`SP_versioning\``);
    await queryRunner.query(`
        CREATE PROCEDURE \`SP_versioning\`(IN resultCode BIGINT)
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
                    is_ai)
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
                    r.is_ai
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
                    institution_type_custom_name
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
                rit.institution_type_custom_name
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
                    tool_function_id,
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
                    expansion_adaptation_details
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
                rid.tool_function_id,
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
                rid.expansion_adaptation_details
                FROM result_innovation_dev rid 
                WHERE rid.is_active = TRUE
                    AND rid.result_id = temp_result_id;
                        
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

    await queryRunner.query(
      `DROP PROCEDURE IF EXISTS \`SP_delete_result_version\``,
    );
    await queryRunner.query(`
        CREATE PROCEDURE \`SP_delete_result_version\`(IN resultCode BIGINT,IN reportYear INT)
        BEGIN
                
                DECLARE temp_result_id BIGINT;
                
                SELECT 
                r.result_id
                    INTO
                temp_result_id
                FROM results r
                WHERE r.is_active = TRUE
                    AND r.is_snapshot = TRUE
                    AND r.report_year_id = reportYear
                    AND r.result_official_code = resultCode;
                
                IF (temp_result_id IS NULL) THEN
                    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Result not found - temp_result_id is NULL';
                END IF;
                
                DELETE 
                    FROM result_keywords 
                    WHERE result_id = temp_result_id;
                
                DELETE 
                    FROM result_users 
                    WHERE result_id = temp_result_id;
                
                DELETE 
                    FROM result_contracts 
                    WHERE result_id = temp_result_id;
                
                DELETE 
                    FROM result_levers 
                    WHERE result_id = temp_result_id;
                
                DELETE 
                    FROM result_institutions 
                    WHERE result_id = temp_result_id;
                
                DELETE 
                    FROM result_evidences 
                    WHERE result_id = temp_result_id;
                
                DELETE 
                    FROM result_innovation_dev 
                    WHERE result_id = temp_result_id;
                
                DELETE 
                    FROM result_actors 
                    WHERE result_id = temp_result_id;
                
                DELETE 
                    FROM result_institution_types 
                    WHERE result_id = temp_result_id;
                
                DELETE
                    FROM result_ip_rights 
                    WHERE result_ip_rights_id = temp_result_id;
                
                DELETE 
                    FROM result_capacity_sharing 
                    WHERE result_id = temp_result_id;
                
                DELETE 
                    FROM result_policy_change 
                    WHERE result_id = temp_result_id;
                
                DELETE 
                    FROM result_regions 
                    WHERE result_id = temp_result_id;
                
                DELETE
                    FROM result_countries_sub_nationals
                    WHERE result_countries_sub_nationals.result_country_id IN (SELECT rc.result_country_id 
                FROM result_countries rc
                WHERE rc.result_id = temp_result_id	);
                    
                DELETE 
                    FROM result_countries
                    WHERE result_id = temp_result_id;
                    
                DELETE 
                    FROM result_languages
                    WHERE result_id = temp_result_id;
                    
                DELETE 
                    FROM submission_history
                    WHERE result_id = temp_result_id;
                    
                DELETE 
                    FROM results
                    WHERE result_id = temp_result_id;

                
            END`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP FUNCTION IF EXISTS \`valid_text\``);
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS \`count_words_and_validate\``,
    );
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS \`policy_change_validation\``,
    );
    await queryRunner.query(`DROP FUNCTION IF EXISTS \`partners_validation\``);
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS \`intellectual_property_validation\``,
    );
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS \`innovation_dev_validation\``,
    );
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS \`geo_location_validation\``,
    );
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS \`general_information_validation\``,
    );
    await queryRunner.query(`DROP FUNCTION IF EXISTS \`evidences_validation\``);
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS \`cap_sharing_validation\``,
    );
    await queryRunner.query(`DROP FUNCTION IF EXISTS \`alignment_validation\``);
    await queryRunner.query(`DROP FUNCTION IF EXISTS \`delete_result\``);
    await queryRunner.query(`DROP PROCEDURE IF EXISTS \`SP_versioning\``);
    await queryRunner.query(
      `DROP PROCEDURE IF EXISTS \`SP_delete_result_version\``,
    );
  }
}
