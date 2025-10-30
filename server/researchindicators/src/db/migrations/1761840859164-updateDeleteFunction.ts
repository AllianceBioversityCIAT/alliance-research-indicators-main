import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateDeleteFunction1761840859164 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP FUNCTION IF EXISTS \`delete_result\`;`);
    await queryRunner.query(`CREATE FUNCTION \`delete_result\`(result_code BIGINT) RETURNS tinyint(1)
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

            UPDATE result_oicrs ro
            SET ro.is_active = FALSE,
                ro.deleted_at = deleteDate
            WHERE ro.result_id = resultId
                AND ro.is_active = TRUE;
            
            UPDATE result_notable_references rnr
            SET rnr.is_active = FALSE,
                rnr.deleted_at = deleteDate
            WHERE rnr.result_id = resultId
            	AND rnr.is_active = TRUE;
                        
            UPDATE result_quantifications rq
            SET rq.is_active = FALSE,
                rq.deleted_at = deleteDate
            WHERE rq.result_id = resultId
            	AND rq.is_active = TRUE;
                        
             UPDATE result_impact_area_global_target rimagt
             INNER JOIN result_impact_areas ria ON ria.id = rimagt.result_impact_area_id 
             SET rimagt.is_active = FALSE,
                rimagt.deleted_at = deleteDate
             WHERE ria.result_id = resultId
             	AND rimagt.is_active = TRUE;
                        
             UPDATE result_impact_areas ria
             SET ria.is_active = FALSE,
                ria.deleted_at = deleteDate
             WHERE ria.result_id = resultId
             	AND ria.is_active = TRUE;
            
            UPDATE result_innovation_tool_function ritf
            SET ritf.is_active = FALSE,
                ritf.deleted_at = deleteDate
            WHERE ritf.result_id = resultId
                AND ritf.is_active = TRUE;

            UPDATE result_institution_ai ria
            SET ria.is_active = FALSE,
                ria.deleted_at = deleteDate
            WHERE ria.result_id  = resultId
                AND ria.is_active = TRUE;
            
            UPDATE result_user_ai rua
            SET rua.is_active = FALSE,
                rua.deleted_at = deleteDate
            WHERE rua.result_id  = resultId
                AND rua.is_active = TRUE;
            
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
            SET rit.is_active = FALSE,
                rit.deleted_at = deleteDate
            WHERE rit.is_active = TRUE
                AND rit.result_id = resultId;

            UPDATE result_tags rt 
            SET rt.is_active = FALSE,
                rt.deleted_at = deleteDate
            WHERE rt.is_active = TRUE
                AND rt.result_id = resultId;

            UPDATE result_initiatives ri
            SET ri.is_active = FALSE,
                ri.deleted_at = deleteDate
            WHERE ri.is_active = TRUE
                AND ri.result_id = resultId;
            
            UPDATE result_actors ra 
            SET ra.is_active = FALSE,
                ra.deleted_at = deleteDate
            WHERE ra.is_active = TRUE
                AND ra.result_id = resultId;
            
            RETURN TRUE;
            
        END`);
    await queryRunner.query(`SET FOREIGN_KEY_CHECKS = 0;`);
    await queryRunner.query(`DELETE FROM clarisa_actor_types;`);
    await queryRunner.query(
      `INSERT INTO clarisa_actor_types (code, name) VALUES(1, 'Farmers / (agro)pastoralist / herders / fishers');`,
    );
    await queryRunner.query(
      `INSERT INTO clarisa_actor_types (code, name) VALUES(2, 'Researchers');`,
    );
    await queryRunner.query(
      `INSERT INTO clarisa_actor_types (code, name) VALUES(3, 'Extension agents');`,
    );
    await queryRunner.query(
      `INSERT INTO clarisa_actor_types (code, name) VALUES(4, 'Policy actors (public or private)');`,
    );
    await queryRunner.query(
      `INSERT INTO clarisa_actor_types (code, name) VALUES(5, 'Other');`,
    );
    await queryRunner.query(`SET FOREIGN_KEY_CHECKS = 1;`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP FUNCTION IF EXISTS \`delete_result\`;`);
    await queryRunner.query(`CREATE FUNCTION \`delete_result\`(result_code BIGINT) RETURNS tinyint(1)
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

            UPDATE result_oicrs ro
            SET ro.is_active = FALSE,
                ro.deleted_at = deleteDate
            WHERE ro.result_id = resultId
                AND ro.is_active = TRUE;
            
            UPDATE result_notable_references rnr
            SET rnr.is_active = FALSE,
                rnr.deleted_at = deleteDate
            WHERE rnr.result_id = temp_result_id
            	AND rnr.is_active = TRUE;
                        
            UPDATE result_quantifications rq
            SET rq.is_active = FALSE,
                rq.deleted_at = deleteDate
            WHERE rq.result_id = temp_result_id
            	AND rq.is_active = TRUE;
                        
             UPDATE result_impact_area_global_target rimagt
             INNER JOIN result_impact_areas ria ON ria.id = rimagt.result_impact_area_id 
             SET rimagt.is_active = FALSE,
                rimagt.deleted_at = deleteDate
             WHERE ria.result_id = temp_result_id
             	AND rimagt.is_active = TRUE;
                        
             UPDATE result_impact_areas ria
             SET ria.is_active = FALSE,
                ria.deleted_at = deleteDate
             WHERE ria.result_id = temp_result_id
             	AND ria.is_active = TRUE;
            
            UPDATE result_innovation_tool_function ritf
            SET ritf.is_active = FALSE,
                ritf.deleted_at = deleteDate
            WHERE ritf.result_id = resultId
                AND ritf.is_active = TRUE;

            UPDATE result_institution_ai ria
            SET ria.is_active = FALSE,
                ria.deleted_at = deleteDate
            WHERE ria.result_id  = resultId
                AND ria.is_active = TRUE;
            
            UPDATE result_user_ai rua
            SET rua.is_active = FALSE,
                rua.deleted_at = deleteDate
            WHERE rua.result_id  = resultId
                AND rua.is_active = TRUE;
            
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
            SET rit.is_active = FALSE,
                rit.deleted_at = deleteDate
            WHERE rit.is_active = TRUE
                AND rit.result_id = resultId;

            UPDATE result_tags rt 
            SET rt.is_active = FALSE,
                rt.deleted_at = deleteDate
            WHERE rt.is_active = TRUE
                AND rt.result_id = resultId;

            UPDATE result_initiatives ri
            SET ri.is_active = FALSE,
                ri.deleted_at = deleteDate
            WHERE ri.is_active = TRUE
                AND ri.result_id = resultId;
            
            UPDATE result_actors ra 
            SET ra.is_active = FALSE,
                ra.deleted_at = deleteDate
            WHERE ra.is_active = TRUE
                AND ra.result_id = resultId;
            
            RETURN TRUE;
            
        END`);
  }
}
