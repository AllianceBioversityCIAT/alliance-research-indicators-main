import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateGreenOicrEvidence1763649577865
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP FUNCTION IF EXISTS \`oicr_validation\`;`);
    await queryRunner.query(`CREATE FUNCTION \`oicr_validation\`(result_code BIGINT) RETURNS tinyint(1)
    READS SQL DATA
BEGIN
                                    DECLARE general_validation BOOLEAN DEFAULT FALSE;
                                    
                                    SELECT 
                                        valid_text(ro.oicr_internal_code) AND
                                        ro.maturity_level_id IS NOT NULL AND
                                        valid_text(ro.outcome_impact_statement) AND
                                        valid_text(ro.short_outcome_impact_statement)
                                        INTO
                                        general_validation
                                    FROM result_oicrs ro 
                                    WHERE ro.result_id = result_code;
                                    
                                    SELECT 
                                        COUNT(rt.id) > 0 AND general_validation
                                        INTO
                                        general_validation
                                    FROM result_tags rt 
                                    WHERE rt.is_active = TRUE
                                        AND rt.result_id = result_code;
                                    
                                    SELECT 
                                        COUNT( treo.id > 0) AND general_validation
                                        INTO
                                        general_validation
                                    FROM TEMP_result_external_oicrs treo 
                                    WHERE treo.result_id = result_code
                                        AND treo.is_active = TRUE;
                                    
                                    SELECT 
                                        IFNULL(COUNT(rq.id) = SUM(valid_text(rq.unit) AND 
                                                            rq.quantification_number IS NOT NULL AND 
                                                            valid_text(rq.description)), TRUE) AND general_validation
                                        INTO
                                        general_validation
                                    FROM result_quantifications rq 
                                    WHERE rq.result_id = result_code
                                        AND rq.is_active = TRUE
                                        AND rq.quantification_role_id = 1;
                                    
                                    SELECT 
                                        IFNULL(COUNT(rq.id) = SUM(valid_text(rq.unit) AND 
                                                            rq.quantification_number IS NOT NULL AND 
                                                            valid_text(rq.description)), TRUE) AND general_validation
                                        INTO
                                        general_validation
                                    FROM result_quantifications rq 
                                    WHERE rq.result_id = result_code
                                        AND rq.is_active = TRUE
                                        AND rq.quantification_role_id = 2;
                                    
                                    SELECT 
                                    	COUNT(cia.id) = SUM(ria.impact_area_score_id IS NOT NULL) AND general_validation
                                    	INTO
                                    	general_validation
                                    FROM clarisa_impact_areas cia 	
                                    	LEFT JOIN result_impact_areas ria ON ria.impact_area_id = cia.id 
                                    									AND ria.is_active = TRUE
                                    									AND ria.result_id = result_code;
                                    
                                    
                                    SELECT 
                                        count(temp.id) = sum(temp.valid) AND general_validation
                                        INTO
                                        general_validation
                                    FROM (SELECT ria.id, count(riagt.id > 0) AS valid
                                    FROM result_impact_areas ria
                                    LEFT JOIN result_impact_area_global_target riagt ON riagt.result_impact_area_id = ria.id
                                                                                    AND riagt.is_active = TRUE
                                    WHERE ria.result_id = result_code
                                        AND ria.impact_area_score_id = 3
                                    GROUP BY ria.id) temp;
                                        
                                    RETURN general_validation;     
                                END;`);

    await queryRunner.query(
      `DROP FUNCTION IF EXISTS \`evidences_validation\`;`,
    );
    await queryRunner.query(`CREATE FUNCTION \`evidences_validation\`(result_code BIGINT) RETURNS tinyint(1)
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

            SELECT 
                IFNULL(COUNT(rnr.id) = SUM(valid_text(rnr.link) AND 
                                    rnr.notable_reference_type_id IS NOT NULL), TRUE) AND reurn_validation 
                INTO
                reurn_validation
            FROM result_notable_references rnr 
            WHERE rnr.is_active = TRUE
                AND rnr.result_id = result_code;
                
            return reurn_validation;
            
        end`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP FUNCTION IF EXISTS \`oicr_validation\`;`);
    await queryRunner.query(`CREATE FUNCTION \`oicr_validation\`(result_code BIGINT) RETURNS tinyint(1)
    READS SQL DATA
BEGIN
                                    DECLARE general_validation BOOLEAN DEFAULT FALSE;
                                    
                                    SELECT 
                                        valid_text(ro.oicr_internal_code) AND
                                        ro.maturity_level_id IS NOT NULL AND
                                        valid_text(ro.outcome_impact_statement) AND
                                        valid_text(ro.short_outcome_impact_statement)
                                        INTO
                                        general_validation
                                    FROM result_oicrs ro 
                                    WHERE ro.result_id = result_code;
                                    
                                    SELECT 
                                        COUNT(rt.id) > 0 AND general_validation
                                        INTO
                                        general_validation
                                    FROM result_tags rt 
                                    WHERE rt.is_active = TRUE
                                        AND rt.result_id = result_code;
                                    
                                    SELECT 
                                        COUNT( treo.id > 0) AND general_validation
                                        INTO
                                        general_validation
                                    FROM TEMP_result_external_oicrs treo 
                                    WHERE treo.result_id = result_code
                                        AND treo.is_active = TRUE;
                                    
                                    SELECT 
                                        IFNULL(COUNT(rq.id) = SUM(valid_text(rq.unit) AND 
                                                            rq.quantification_number IS NOT NULL AND 
                                                            valid_text(rq.description)), TRUE) AND general_validation
                                        INTO
                                        general_validation
                                    FROM result_quantifications rq 
                                    WHERE rq.result_id = result_code
                                        AND rq.is_active = TRUE
                                        AND rq.quantification_role_id = 1;
                                    
                                    SELECT 
                                        IFNULL(COUNT(rq.id) = SUM(valid_text(rq.unit) AND 
                                                            rq.quantification_number IS NOT NULL AND 
                                                            valid_text(rq.description)), TRUE) AND general_validation
                                        INTO
                                        general_validation
                                    FROM result_quantifications rq 
                                    WHERE rq.result_id = result_code
                                        AND rq.is_active = TRUE
                                        AND rq.quantification_role_id = 2;
                                    
                                    SELECT 
                                        IFNULL(COUNT(rnr.id) = SUM(valid_text(rnr.link) AND 
                                                            rnr.notable_reference_type_id IS NOT NULL), TRUE) AND general_validation 
                                        INTO
                                        general_validation
                                    FROM result_notable_references rnr 
                                    WHERE rnr.is_active = TRUE
                                        AND rnr.result_id = result_code;
                                    
                                    SELECT 
                                    	COUNT(cia.id) = SUM(ria.impact_area_score_id IS NOT NULL) AND general_validation
                                    	INTO
                                    	general_validation
                                    FROM clarisa_impact_areas cia 	
                                    	LEFT JOIN result_impact_areas ria ON ria.impact_area_id = cia.id 
                                    									AND ria.is_active = TRUE
                                    									AND ria.result_id = result_code;
                                    
                                    
                                    SELECT 
                                        count(temp.id) = sum(temp.valid) AND general_validation
                                        INTO
                                        general_validation
                                    FROM (SELECT ria.id, count(riagt.id > 0) AS valid
                                    FROM result_impact_areas ria
                                    LEFT JOIN result_impact_area_global_target riagt ON riagt.result_impact_area_id = ria.id
                                                                                    AND riagt.is_active = TRUE
                                    WHERE ria.result_id = result_code
                                        AND ria.impact_area_score_id = 3
                                    GROUP BY ria.id) temp;
                                        
                                    RETURN general_validation;     
                                END;`);

    await queryRunner.query(
      `DROP FUNCTION IF EXISTS \`evidences_validation\`;`,
    );
    await queryRunner.query(`CREATE FUNCTION \`evidences_validation\`(result_code BIGINT) RETURNS tinyint(1)
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
  }
}
