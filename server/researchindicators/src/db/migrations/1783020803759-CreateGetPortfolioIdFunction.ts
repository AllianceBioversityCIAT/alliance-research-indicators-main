import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateGetPortfolioIdFunction1783020803759
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS \`get_portfolio_id_by_result\`;`,
    );
    await queryRunner.query(`CREATE FUNCTION \`get_portfolio_id_by_result\`(p_result_id BIGINT)
    RETURNS BIGINT
    READS SQL DATA
    DETERMINISTIC
    BEGIN
        DECLARE v_report_year INT DEFAULT NULL;
        DECLARE v_portfolio_id BIGINT DEFAULT NULL;
        SELECT r.report_year_id
        INTO v_report_year
        FROM results r
        WHERE r.result_id = p_result_id
        LIMIT 1;
        IF v_report_year IS NULL THEN
            RETURN NULL;
        END IF;
        SELECT p.id
        INTO v_portfolio_id
        FROM portfolios p
        WHERE p.is_active = 1
        AND p.start_year <= v_report_year
        AND p.end_year >= v_report_year
        ORDER BY p.id
        LIMIT 1;
        RETURN v_portfolio_id;
    END;`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS \`get_portfolio_id_by_result\`;`,
    );
  }
}
