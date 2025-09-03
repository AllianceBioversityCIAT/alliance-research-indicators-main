import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdatePartnerGreen1756844967667 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP FUNCTION IF EXISTS partners_validation;`);
    await queryRunner.query(`CREATE FUNCTION partners_validation(result_code BIGINT) RETURNS tinyint(1)
    READS SQL DATA
begin
            declare temp_institution boolean default null;
			declare temp_section_active boolean default null;

			select 
				r.is_partner_not_applicable
				into
				temp_section_active
			from results r 
			where r.is_active = true
				and r.result_id = result_code;
			
			if temp_section_active = true then
				return true;
			end if;

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
            
        end;`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
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
  }
}
