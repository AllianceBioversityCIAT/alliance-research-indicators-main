import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateGreenAlignment1760631612967 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP FUNCTION IF EXISTS \`alignment_validation\``);
    await queryRunner.query(`CREATE FUNCTION \`alignment_validation\`(result_code BIGINT) RETURNS tinyint(1)
    READS SQL DATA
begin
            declare temp_contract boolean default null;
            declare temp_lever boolean default null;
            declare temp_sdg boolean default null;
			declare temp_lever_outcome boolean default true;
			declare count_lever int default null;
			declare result_indicator bigint default null;

			select 
				r.indicator_id
				into
				result_indicator
			from results r 
			where r.result_id = result_code;
            
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
                if(count(rl.lever_id) > 0, true, false),
                count(rl.lever_id)
                into 
                temp_lever,
                count_lever
            from result_levers rl 
            where rl.is_active = true 
                and rl.is_primary = true 
                and rl.lever_role_id = 1
                and rl.result_id = result_code
                and rl.lever_id is not null
            limit 1;
            
            if result_indicator = 5 then
            	SELECT 
            		COUNT(DISTINCT rlso.result_lever_id) = count_lever
            		INTO
            		temp_lever_outcome
				FROM result_lever_strategic_outcome rlso 
					INNER JOIN result_levers rl ON rl.result_lever_id = rlso.result_lever_id 
												AND rl.is_active = TRUE
												AND rl.is_primary = TRUE
				WHERE rl.result_id = result_code
					AND rlso.is_active = TRUE
				LIMIT 1;
            END IF;
            
            return temp_contract and temp_sdg and temp_lever_outcome and temp_lever;
            
        end`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP FUNCTION IF EXISTS \`alignment_validation\``);
    await queryRunner.query(`CREATE FUNCTION \`alignment_validation\`(result_code BIGINT) RETURNS tinyint(1)
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
  }
}
