import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * T-02 — completes `full_delete_result_version` so a hard delete of a result
 * cannot raise MySQL errno 1451.
 *
 * Baseline: the definition dumped from the live database (T-01,
 * docs/specs/results/cross-platform-duplicate-resolution/fk-inventory.md §6),
 * measured as identical in coverage to migration
 * 1783029013035-UpdateDeleteAndVersionSp.ts. The prior definition covered 35
 * tables while 38 foreign keys reference `results`, 37 of them ON DELETE
 * NO ACTION.
 *
 * Added (owning direction only, `result_id = temp_result_id`):
 *   result_pool_funding_indicator_mapping, result_pool_funding_alignment_sp,
 *   result_pool_funding_alignment, result_pool_funding_toc_alignment,
 *   result_review_history, bulk_upload_results, temp_result_ai,
 *   result_cap_sharing_ip (keyed on result_cap_sharing_ip_id), and
 *   TEMP_result_external_oicrs (no FK — orphan hygiene).
 *
 * Ordering is load-bearing:
 *  - result_pool_funding_indicator_mapping is deleted BEFORE the sub-table
 *    deletes, because it holds FKs into result_capacity_sharing,
 *    result_knowledge_products, result_policy_change and result_innovation_dev,
 *    all of which this function deletes early.
 *  - result_pool_funding_alignment_sp is deleted BEFORE its parent
 *    result_pool_funding_alignment. It is a transitive dependency: it does not
 *    reference `results`, so the one-level FK inventory in T-01 does not name
 *    it, and it was absent from the live function.
 *
 * DELIBERATELY NOT DONE — the cross-result columns of
 * result_pool_funding_indicator_mapping (result_capacity_sharing_id,
 * result_knowledge_product_id, result_policy_change_id,
 * result_innovation_dev_id) are NOT cleared, which deviates from design.md
 * §3.2. Those rows belong to a DIFFERENT, surviving result; nulling them would
 * silently strip that result's indicator link, which is the row's entire
 * purpose. StarRelationshipService (T-05) treats a cross-result reference as
 * protecting, so this state should never be reached — and if the guard ever has
 * a gap, the untouched FK raises errno 1451 and fails loudly. On an
 * irreversible path a loud failure is strictly better than silent mutation of
 * data owned by someone else.
 *
 * Proof of completeness is NOT this migration applying cleanly — that only
 * shows the SQL parses. It is the seeded end-to-end delete in T-11, whose seed
 * must cover T-01's full enumeration.
 */
export class CompleteFullDeleteResultVersion1785866413438 implements MigrationInterface {
  name = 'CompleteFullDeleteResultVersion1785866413438';

  public async up(queryRunner: QueryRunner): Promise<void> {
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
                            FROM result_pool_funding_indicator_mapping
                            WHERE result_id = temp_result_id;

                        
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
                            FROM result_pool_funding_alignment_sp
                            WHERE alignment_id IN (SELECT rpfa.id
                        FROM result_pool_funding_alignment rpfa
                        WHERE rpfa.result_id = temp_result_id);

                        DELETE
                            FROM result_pool_funding_alignment
                            WHERE result_id = temp_result_id;

                        DELETE
                            FROM result_pool_funding_toc_alignment
                            WHERE result_id = temp_result_id;

                        DELETE
                            FROM result_review_history
                            WHERE result_id = temp_result_id;

                        DELETE
                            FROM bulk_upload_results
                            WHERE result_id = temp_result_id;

                        DELETE
                            FROM temp_result_ai
                            WHERE result_id = temp_result_id;

                        DELETE
                            FROM result_cap_sharing_ip
                            WHERE result_cap_sharing_ip_id = temp_result_id;

                        DELETE
                            FROM TEMP_result_external_oicrs
                            WHERE result_id = temp_result_id;

                        DELETE 
                            FROM results
                            WHERE result_id = temp_result_id;
                       
                        RETURN TRUE;

                        
                    END`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
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
