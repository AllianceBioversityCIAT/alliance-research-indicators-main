import { MigrationInterface, QueryRunner } from "typeorm";

export class AdaptInnovationDevValidationToManyToolFunctions1758125999162 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
        DROP FUNCTION IF EXISTS \`innovation_dev_validation\`;
        `);

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
        END`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP FUNCTION IF EXISTS \`innovation_dev_validation\`;`);

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
                        AND rid.tool_function_id IS NOT NULL
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
        END`);
    }

}
