import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatFullDelete1760533918462 implements MigrationInterface {
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
                            FROM result_oicrs 
                            WHERE result_id = temp_result_id;

                        DELETE 
                            FROM link_results
                            WHERE result_id = temp_result_id; 

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

                        
                    END;`);

    await queryRunner.query(
      `DROP PROCEDURE IF EXISTS \`SP_delete_result_version\``,
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
                            FROM link_results
                            WHERE result_id = temp_result_id; 

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

                        
                    END;`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS \`full_delete_result_version\``,
    );
    await queryRunner.query(
      `DROP PROCEDURE IF EXISTS \`SP_delete_result_version\``,
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

                        
                    END;`);
  }
}
