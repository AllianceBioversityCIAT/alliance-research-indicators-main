import { MigrationInterface, QueryRunner } from 'typeorm';

export class ReportPolicyView1779746894326 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE OR REPLACE VIEW report_policy_change AS
SELECT
	root.result_id,
	report_field(rpc.evidence_stage, TRUE, root.indicator_id = 4) evidence_stage,
	report_field(pt.name, TRUE, root.indicator_id = 4) policy_type,
	report_field(ps.name, TRUE, root.indicator_id = 4) policy_stage,
	report_field(ri2.implementing_organizations, TRUE, root.indicator_id = 4) implementing_organizations
FROM results root
	LEFT JOIN result_policy_change rpc ON rpc.result_id = root.result_id 
	LEFT JOIN policy_types pt ON pt.policy_type_id = rpc.policy_type_id 
	LEFT JOIN policy_stage ps ON ps.policy_stage_id = rpc.policy_stage_id 
	LEFT JOIN (SELECT 	
					ri.result_id,
					group_concat(concat_ws('', '• ', '[id: ',\`ci\`.\`code\`, '] ', \`ci\`.\`acronym\`, ' - (HQ:', \`cil\`.\`name\`, ') ', \`ci\`.\`name\`) separator '\n') implementing_organizations
				FROM  result_institutions ri 
					INNER JOIN clarisa_institutions ci ON ci.code = ri.institution_id 
					LEFT JOIN clarisa_institution_locations cil ON cil.institution_id = ci.code 
						AND cil.isHeadquarter = TRUE
				WHERE ri.institution_role_id = 4
				GROUP BY ri.result_id) ri2 ON ri2.result_id = root.result_id
WHERE root.is_active = TRUE
	AND root.is_snapshot = FALSE
ORDER BY root.result_id ASC; `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP VIEW IF EXISTS report_policy_change;`);
  }
}
