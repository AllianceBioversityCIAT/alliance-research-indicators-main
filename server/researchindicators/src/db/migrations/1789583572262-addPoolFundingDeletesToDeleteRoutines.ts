import { MigrationInterface, QueryRunner } from 'typeorm';

// @akili-spec bugfix/pool-funding-alignment-versioning
/**
 * T-03 / R-PFV-003 / DD-4 — re-declares `SP_delete_result_version` and
 * `full_delete_result_version` so each physically deletes the four pool
 * funding tables before `DELETE FROM results` (FK 1451 otherwise).
 *
 * Both bodies are copied verbatim from
 * `1787083305648-AmendLifecycleRoutinesForInnovationUse.ts` `up()`, the
 * currently-deployed text. The only edit in each body is the four
 * `DELETE` blocks, keyed on `temp_result_id`, with `_sp` before
 * `alignment` (`fk_rpfas_alignment`). `down()` restores those pre-change
 * bodies verbatim (NFR-PFV-001). No schema change (NFR-PFV-002).
 *
 * Out of scope: `delete_result`, `SP_full_delete_results_by_platform`,
 * `SP_versioning` (T-02).
 *
 * See `docs/specs/bugfix/pool-funding-alignment-versioning/` (T-03).
 */
export class AddPoolFundingDeletesToDeleteRoutines1789583572262
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP PROCEDURE IF EXISTS SP_delete_result_version`,
    );
    await queryRunner.query(`CREATE PROCEDURE \`SP_delete_result_version\`(IN resultCode BIGINT,IN reportYear INT)
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
                            FROM result_oicrs 
                            WHERE result_id = temp_result_id;
                        
                        DELETE 
                        	FROM result_notable_references
                        	WHERE result_id = temp_result_id;

                        DELETE
                        	FROM result_knowledge_products 
                        	WHERE result_id = temp_result_id;
                        
                        DELETE 
                        	FROM result_quantifications
                        	WHERE result_id = temp_result_id;
                        
                        DELETE 
                        	FROM result_impact_area_global_target
                        	WHERE result_impact_area_global_target.result_impact_area_id IN(SELECT ria.id 
	                        	FROM result_impact_areas ria
	                        	WHERE ria.result_id = temp_result_id);
                        
                        DELETE
                        	FROM result_impact_areas
                        	WHERE result_id = temp_result_id;
                        
                        DELETE 
                            FROM link_results
                            WHERE result_id = temp_result_id
                        		OR other_result_id = temp_result_id; 

                        DELETE 
                            FROM result_innovation_tool_function
                            WHERE result_id = temp_result_id;
                        
                        DELETE 
                            FROM result_keywords 
                            WHERE result_id = temp_result_id;

                        DELETE 
                        	FROM result_institution_ai 
                        	WHERE result_id = temp_result_id;
                        
                        DELETE 
                        	FROM result_user_ai 
                        	WHERE result_id = temp_result_id;

                        DELETE 
                            FROM result_initiatives
                            WHERE result_id = temp_result_id;
                            
                        DELETE
                            FROM result_tags
                            WHERE result_id = temp_result_id;

                        DELETE 
                            FROM result_users 
                            WHERE result_id = temp_result_id;
                        
                        DELETE 
                            FROM result_contracts 
                            WHERE result_id = temp_result_id;
                        
                        DELETE
                        FROM result_lever_sdg_targets
                            WHERE result_lever_sdg_targets.result_lever_id IN (SELECT rl.result_lever_id  
 													  FROM result_levers rl 
 													  WHERE rl.result_id = temp_result_id);
                        
                        DELETE
                        FROM result_lever_strategic_outcome
                            WHERE result_lever_strategic_outcome.result_lever_id IN (SELECT rl.result_lever_id  
 													  FROM result_levers rl 
 													  WHERE rl.result_id = temp_result_id);
                        
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
                            FROM result_innovation_use 
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
                            FROM result_sdgs 
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
                        	FROM result_impact_outcomes
                        	WHERE result_id = temp_result_id;
                        
                        DELETE 
                        	FROM result_strategic_objectives
                        	WHERE result_id = temp_result_id;
                        
                        DELETE FROM result_pool_funding_alignment_sp
                            WHERE alignment_id IN (
                                SELECT rpfa.id
                                FROM result_pool_funding_alignment rpfa
                                WHERE rpfa.result_id = temp_result_id
                            );

                        DELETE FROM result_pool_funding_alignment
                            WHERE result_id = temp_result_id;

                        DELETE FROM result_pool_funding_toc_alignment
                            WHERE result_id = temp_result_id;

                        DELETE FROM result_pool_funding_indicator_mapping
                            WHERE result_id = temp_result_id;

                        DELETE 
                            FROM results
                            WHERE result_id = temp_result_id;

                        
                    END`);

    await queryRunner.query(
      `DROP FUNCTION IF EXISTS \`full_delete_result_version\``,
    );
    await queryRunner.query(`CREATE FUNCTION \`full_delete_result_version\`(resultCode BIGINT) RETURNS tinyint(1)
    READS SQL DATA
BEGIN
                        
                        DECLARE temp_result_id BIGINT;
                        
                        SELECT 
                        r.result_id
                            INTO
                        temp_result_id
                        FROM results r
                        WHERE  r.result_id  = resultCode;
                        
                        IF (temp_result_id IS NULL) THEN
                            RETURN FALSE;
                        END IF;
                        
                        DELETE
                            FROM result_oicrs 
                            WHERE result_id = temp_result_id;
                        
                        DELETE 
                        	FROM result_notable_references
                        	WHERE result_id = temp_result_id;

                        DELETE
                        	FROM result_knowledge_products 
                        	WHERE result_id = temp_result_id;
                        
                        DELETE 
                        	FROM result_quantifications
                        	WHERE result_id = temp_result_id;
                        
                        DELETE 
                        	FROM result_impact_area_global_target
                        	WHERE result_impact_area_global_target.result_impact_area_id IN(SELECT ria.id 
	                        	FROM result_impact_areas ria
	                        	WHERE ria.result_id = temp_result_id);
                        
                        DELETE
                        	FROM result_impact_areas
                        	WHERE result_id = temp_result_id;
                        
                        DELETE 
                            FROM link_results
                            WHERE result_id = temp_result_id
                        		OR other_result_id = temp_result_id; 
                        

                        DELETE 
                            FROM result_innovation_tool_function
                            WHERE result_id = temp_result_id;
                        
                        DELETE 
                        	FROM result_impact_outcomes
                        	WHERE result_id = temp_result_id;
                        
                        DELETE 
                        	FROM result_strategic_objectives
                        	WHERE result_id = temp_result_id;
                        
                        DELETE 
                            FROM result_keywords 
                            WHERE result_id = temp_result_id;

                        DELETE 
                        	FROM result_institution_ai 
                        	WHERE result_id = temp_result_id;
                        
                        DELETE 
                        	FROM result_user_ai 
                        	WHERE result_id = temp_result_id;

                        DELETE 
                            FROM result_initiatives
                            WHERE result_id = temp_result_id;
                            
                        DELETE
                            FROM result_tags
                            WHERE result_id = temp_result_id;

                        DELETE 
                            FROM result_users 
                            WHERE result_id = temp_result_id;
                        
                        DELETE 
                            FROM result_contracts 
                            WHERE result_id = temp_result_id;
                        
                        DELETE
                        FROM result_lever_sdg_targets
                            WHERE result_lever_sdg_targets.result_lever_id IN (SELECT rl.result_lever_id  
 													  FROM result_levers rl 
 													  WHERE rl.result_id = temp_result_id);
                        
                        DELETE
                        FROM result_lever_strategic_outcome
                            WHERE result_lever_strategic_outcome.result_lever_id IN (SELECT rl.result_lever_id  
 													  FROM result_levers rl 
 													  WHERE rl.result_id = temp_result_id);
                        
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
                            FROM result_innovation_use 
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
                            FROM result_sdgs 
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
                            
                        DELETE FROM result_pool_funding_alignment_sp
                            WHERE alignment_id IN (
                                SELECT rpfa.id
                                FROM result_pool_funding_alignment rpfa
                                WHERE rpfa.result_id = temp_result_id
                            );

                        DELETE FROM result_pool_funding_alignment
                            WHERE result_id = temp_result_id;

                        DELETE FROM result_pool_funding_toc_alignment
                            WHERE result_id = temp_result_id;

                        DELETE FROM result_pool_funding_indicator_mapping
                            WHERE result_id = temp_result_id;

                        DELETE 
                            FROM results
                            WHERE result_id = temp_result_id;
                       
                        RETURN TRUE;

                        
                    END`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP PROCEDURE IF EXISTS SP_delete_result_version`,
    );
    await queryRunner.query(`CREATE PROCEDURE \`SP_delete_result_version\`(IN resultCode BIGINT,IN reportYear INT)
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
                            FROM result_oicrs 
                            WHERE result_id = temp_result_id;
                        
                        DELETE 
                        	FROM result_notable_references
                        	WHERE result_id = temp_result_id;

                        DELETE
                        	FROM result_knowledge_products 
                        	WHERE result_id = temp_result_id;
                        
                        DELETE 
                        	FROM result_quantifications
                        	WHERE result_id = temp_result_id;
                        
                        DELETE 
                        	FROM result_impact_area_global_target
                        	WHERE result_impact_area_global_target.result_impact_area_id IN(SELECT ria.id 
	                        	FROM result_impact_areas ria
	                        	WHERE ria.result_id = temp_result_id);
                        
                        DELETE
                        	FROM result_impact_areas
                        	WHERE result_id = temp_result_id;
                        
                        DELETE 
                            FROM link_results
                            WHERE result_id = temp_result_id
                        		OR other_result_id = temp_result_id; 

                        DELETE 
                            FROM result_innovation_tool_function
                            WHERE result_id = temp_result_id;
                        
                        DELETE 
                            FROM result_keywords 
                            WHERE result_id = temp_result_id;

                        DELETE 
                        	FROM result_institution_ai 
                        	WHERE result_id = temp_result_id;
                        
                        DELETE 
                        	FROM result_user_ai 
                        	WHERE result_id = temp_result_id;

                        DELETE 
                            FROM result_initiatives
                            WHERE result_id = temp_result_id;
                            
                        DELETE
                            FROM result_tags
                            WHERE result_id = temp_result_id;

                        DELETE 
                            FROM result_users 
                            WHERE result_id = temp_result_id;
                        
                        DELETE 
                            FROM result_contracts 
                            WHERE result_id = temp_result_id;
                        
                        DELETE
                        FROM result_lever_sdg_targets
                            WHERE result_lever_sdg_targets.result_lever_id IN (SELECT rl.result_lever_id  
 													  FROM result_levers rl 
 													  WHERE rl.result_id = temp_result_id);
                        
                        DELETE
                        FROM result_lever_strategic_outcome
                            WHERE result_lever_strategic_outcome.result_lever_id IN (SELECT rl.result_lever_id  
 													  FROM result_levers rl 
 													  WHERE rl.result_id = temp_result_id);
                        
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
                            FROM result_innovation_use 
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
                            FROM result_sdgs 
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
                        	FROM result_impact_outcomes
                        	WHERE result_id = temp_result_id;
                        
                        DELETE 
                        	FROM result_strategic_objectives
                        	WHERE result_id = temp_result_id;
                        
                        DELETE 
                            FROM results
                            WHERE result_id = temp_result_id;

                        
                    END`);

    await queryRunner.query(
      `DROP FUNCTION IF EXISTS \`full_delete_result_version\``,
    );
    await queryRunner.query(`CREATE FUNCTION \`full_delete_result_version\`(resultCode BIGINT) RETURNS tinyint(1)
    READS SQL DATA
BEGIN
                        
                        DECLARE temp_result_id BIGINT;
                        
                        SELECT 
                        r.result_id
                            INTO
                        temp_result_id
                        FROM results r
                        WHERE  r.result_id  = resultCode;
                        
                        IF (temp_result_id IS NULL) THEN
                            RETURN FALSE;
                        END IF;
                        
                        DELETE
                            FROM result_oicrs 
                            WHERE result_id = temp_result_id;
                        
                        DELETE 
                        	FROM result_notable_references
                        	WHERE result_id = temp_result_id;

                        DELETE
                        	FROM result_knowledge_products 
                        	WHERE result_id = temp_result_id;
                        
                        DELETE 
                        	FROM result_quantifications
                        	WHERE result_id = temp_result_id;
                        
                        DELETE 
                        	FROM result_impact_area_global_target
                        	WHERE result_impact_area_global_target.result_impact_area_id IN(SELECT ria.id 
	                        	FROM result_impact_areas ria
	                        	WHERE ria.result_id = temp_result_id);
                        
                        DELETE
                        	FROM result_impact_areas
                        	WHERE result_id = temp_result_id;
                        
                        DELETE 
                            FROM link_results
                            WHERE result_id = temp_result_id
                        		OR other_result_id = temp_result_id; 
                        

                        DELETE 
                            FROM result_innovation_tool_function
                            WHERE result_id = temp_result_id;
                        
                        DELETE 
                        	FROM result_impact_outcomes
                        	WHERE result_id = temp_result_id;
                        
                        DELETE 
                        	FROM result_strategic_objectives
                        	WHERE result_id = temp_result_id;
                        
                        DELETE 
                            FROM result_keywords 
                            WHERE result_id = temp_result_id;

                        DELETE 
                        	FROM result_institution_ai 
                        	WHERE result_id = temp_result_id;
                        
                        DELETE 
                        	FROM result_user_ai 
                        	WHERE result_id = temp_result_id;

                        DELETE 
                            FROM result_initiatives
                            WHERE result_id = temp_result_id;
                            
                        DELETE
                            FROM result_tags
                            WHERE result_id = temp_result_id;

                        DELETE 
                            FROM result_users 
                            WHERE result_id = temp_result_id;
                        
                        DELETE 
                            FROM result_contracts 
                            WHERE result_id = temp_result_id;
                        
                        DELETE
                        FROM result_lever_sdg_targets
                            WHERE result_lever_sdg_targets.result_lever_id IN (SELECT rl.result_lever_id  
 													  FROM result_levers rl 
 													  WHERE rl.result_id = temp_result_id);
                        
                        DELETE
                        FROM result_lever_strategic_outcome
                            WHERE result_lever_strategic_outcome.result_lever_id IN (SELECT rl.result_lever_id  
 													  FROM result_levers rl 
 													  WHERE rl.result_id = temp_result_id);
                        
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
                            FROM result_innovation_use 
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
                            FROM result_sdgs 
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
                       
                        RETURN TRUE;

                        
                    END`);
  }
}
