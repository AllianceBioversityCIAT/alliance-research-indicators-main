import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateLinkResultValidation1763671794160
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP FUNCTION IF EXISTS link_result_validation;`);
    await queryRunner.query(`CREATE FUNCTION \`link_result_validation\`(result_code BIGINT) RETURNS tinyint(1)
    READS SQL DATA
begin
            declare reurn_validation boolean default false;
            
			SELECT 
				COALESCE(COUNT(lr.link_result_id) = SUM(lr.other_result_id IS NOT NULL), TRUE)
				INTO
				reurn_validation
			FROM link_results lr 
			WHERE lr.result_id = result_code
				AND lr.is_active = TRUE
				AND lr.link_result_role_id = 4;            

            RETURN reurn_validation;
            
END;`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP FUNCTION IF EXISTS link_result_validation;`);
  }
}
