import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateLinkResultView1780688964262 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE OR REPLACE VIEW report_link_result AS
SELECT 
	root.result_id,
	report_field(GROUP_CONCAT(CONCAT('', '• [',i.name ,']', r.result_official_code, ' - ', r.title ) SEPARATOR '\n'), FALSE, NULL) link_results
FROM results root
	LEFT JOIN link_results lr ON lr.result_id = root.result_id 
		AND lr.link_result_role_id = 4
	LEFT JOIN results r ON r.result_id = lr.other_result_id 
	LEFT JOIN indicators i ON i.indicator_id = r.indicator_id 
WHERE root.is_active
	AND NOT root.is_snapshot
GROUP BY root.result_id;`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP VIEW IF EXISTS report_link_result;`);
  }
}
