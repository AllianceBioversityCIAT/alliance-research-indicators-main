import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateEvidenceSection1781214360181 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE OR REPLACE VIEW report_evidences AS
                SELECT 
                    root.result_id,
                    report_field(re.evidences, TRUE, NULL) AS evidences,
                    report_field(GROUP_CONCAT(CONCAT_WS('', '• Type: ', report_field(nrt.name, TRUE, TRUE), ' - Link: ',report_field(rnr.link, TRUE, TRUE)) SEPARATOR '\n'), TRUE, root.indicator_id = 5) notable_references
                FROM results root
                    LEFT JOIN (SELECT
                                    re.result_id,
                                    GROUP_CONCAT(CONCAT_WS('','• <', re.evidence_url,'> ',re.evidence_description ,' [Is public: ',IF(re.is_private, 'FALSE', 'TRUE'),']') SEPARATOR '\n') AS evidences
                                FROM result_evidences re 
                                WHERE re.is_active = TRUE
                                GROUP BY re.result_id) re ON re.result_id = root.result_id 
                    LEFT JOIN result_notable_references rnr ON rnr.result_id = root.result_id 
                    								 		AND rnr.is_active = TRUE
                    LEFT JOIN notable_reference_types nrt ON nrt.id = rnr.notable_reference_type_id 
                WHERE root.is_active = TRUE
                    AND root.is_snapshot = FALSE
                GROUP BY root.result_id
                ORDER BY root.result_id ASC`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE OR REPLACE VIEW report_evidences AS
            SELECT 
                root.result_id,
                report_field(re.evidences, TRUE, NULL) AS evidences
            FROM results root
                LEFT JOIN (SELECT
                                re.result_id,
                                GROUP_CONCAT(CONCAT_WS('','• <', re.evidence_url,'> ',re.evidence_description ,' [Is public: ',IF(re.is_private, 'FALSE', 'TRUE'),']') SEPARATOR '\n') AS evidences
                            FROM result_evidences re 
                            WHERE re.is_active = TRUE
                            GROUP BY re.result_id) re ON re.result_id = root.result_id 
            WHERE root.is_active = TRUE
                AND root.is_snapshot = FALSE
            ORDER BY root.result_id ASC`);
  }
}
