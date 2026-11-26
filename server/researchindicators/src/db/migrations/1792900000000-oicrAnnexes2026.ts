import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * OICR Evidence 2026 annexes. Additive: the `result_oicr_annexes` table and
 * `evidences_validation` recreated with an annex rule for OICRs (indicator 5)
 * whose report year is 2026 or later. The rule for earlier years and for every
 * other indicator is the previous one, unchanged. SQL is inlined (no bound
 * parameters).
 */
const EVIDENCES_VALIDATION_HEAD = `CREATE FUNCTION \`evidences_validation\`(result_code BIGINT) RETURNS tinyint(1)
    READS SQL DATA
begin 
            
            declare temp_count_url int default 0;
            declare temp_count_description int default 0;
            declare temp_count_evidences int default 0;
            declare reurn_validation boolean default false;
            DECLARE current_indicator BIGINT DEFAULT NULL;
            DECLARE v_report_year INT DEFAULT NULL;

            select 
                count(re.result_evidence_id),
                sum(valid_text(re.evidence_url)),
                sum(valid_text(re.evidence_description))
                into
                temp_count_evidences,
                temp_count_url,
                temp_count_description
            from result_evidences re 
            where re.is_active = true
                and re.evidence_role_id = 1
                and re.result_id = result_code
            group by re.result_id;
            
            SELECT 
            	r.indicator_id,
            	r.report_year_id
            	INTO 
            	current_indicator,
            	v_report_year
            FROM results r
            WHERE r.result_id = result_code
            	AND r.is_active = TRUE;
                
            set reurn_validation = if( temp_count_evidences > 0 and temp_count_url = temp_count_description, true, false );

            SELECT 
                IFNULL(COUNT(rnr.id) = SUM(valid_text(rnr.link) AND 
                                    rnr.notable_reference_type_id IS NOT NULL), TRUE) AND reurn_validation 
                INTO
                reurn_validation
            FROM result_notable_references rnr 
            WHERE rnr.is_active = TRUE
                AND rnr.result_id = result_code;
            
            IF current_indicator = 5 THEN
            
            	SELECT 
            		valid_text(ro.cgspace_link) AND reurn_validation
            		INTO
            		reurn_validation
            	FROM result_oicrs ro 
            	WHERE ro.result_id = result_code
            		AND ro.is_active = TRUE;
            	
            	
            END IF;
`;

const EVIDENCES_VALIDATION_ANNEXES = `
            IF current_indicator = 5 AND v_report_year >= 2026 THEN

                SELECT 
                    IFNULL(COUNT(roan.id) = SUM(
                        valid_text(roan.description) AND
                        valid_text(roan.link) AND
                        CASE roan.annex_type_id
                            WHEN 1 THEN valid_text(roan.photo_credits)
                            WHEN 2 THEN valid_text(roan.file_type)
                            WHEN 3 THEN valid_text(roan.partner_consent)
                            ELSE FALSE
                        END), TRUE) AND reurn_validation
                    INTO
                    reurn_validation
                FROM result_oicr_annexes roan
                WHERE roan.is_active = TRUE
                    AND roan.result_id = result_code;

            END IF;
`;

const EVIDENCES_VALIDATION_TAIL = `
                
            return reurn_validation;
            
        end;`;

const EVIDENCES_VALIDATION_2026 =
  EVIDENCES_VALIDATION_HEAD +
  EVIDENCES_VALIDATION_ANNEXES +
  EVIDENCES_VALIDATION_TAIL;

const EVIDENCES_VALIDATION_LEGACY = `CREATE FUNCTION \`evidences_validation\`(result_code BIGINT) RETURNS tinyint(1)
    READS SQL DATA
begin 
            
            declare temp_count_url int default 0;
            declare temp_count_description int default 0;
            declare temp_count_evidences int default 0;
            declare reurn_validation boolean default false;
            DECLARE current_indicator BIGINT DEFAULT NULL;

            select 
                count(re.result_evidence_id),
                sum(valid_text(re.evidence_url)),
                sum(valid_text(re.evidence_description))
                into
                temp_count_evidences,
                temp_count_url,
                temp_count_description
            from result_evidences re 
            where re.is_active = true
                and re.evidence_role_id = 1
                and re.result_id = result_code
            group by re.result_id;
            
            SELECT 
            	r.indicator_id 
            	INTO 
            	current_indicator
            FROM results r
            WHERE r.result_id = result_code
            	AND r.is_active = TRUE;
                
            set reurn_validation = if( temp_count_evidences > 0 and temp_count_url = temp_count_description, true, false );

            SELECT 
                IFNULL(COUNT(rnr.id) = SUM(valid_text(rnr.link) AND 
                                    rnr.notable_reference_type_id IS NOT NULL), TRUE) AND reurn_validation 
                INTO
                reurn_validation
            FROM result_notable_references rnr 
            WHERE rnr.is_active = TRUE
                AND rnr.result_id = result_code;
            
            IF current_indicator = 5 THEN
            
            	SELECT 
            		valid_text(ro.cgspace_link) AND reurn_validation
            		INTO
            		reurn_validation
            	FROM result_oicrs ro 
            	WHERE ro.result_id = result_code
            		AND ro.is_active = TRUE;
            	
            	
            END IF;
            
                
            return reurn_validation;
            
        end;`;

export class OicrAnnexes20261792900000000 implements MigrationInterface {
  name = 'OicrAnnexes20261792900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`result_oicr_annexes\` (
        \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`created_by\` bigint NULL,
        \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`updated_by\` bigint NULL,
        \`is_active\` tinyint NOT NULL DEFAULT 1,
        \`deleted_at\` timestamp NULL,
        \`id\` bigint NOT NULL AUTO_INCREMENT,
        \`result_id\` bigint NOT NULL,
        \`annex_type_id\` tinyint NOT NULL,
        \`description\` text NULL,
        \`photo_credits\` text NULL,
        \`file_type\` varchar(20) NULL,
        \`partner_consent\` varchar(20) NULL,
        \`link\` text NULL,
        PRIMARY KEY (\`id\`),
        INDEX \`idx_result_oicr_annexes_result\` (\`result_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci
    `);

    await queryRunner.query('DROP FUNCTION IF EXISTS `evidences_validation`;');
    await queryRunner.query(EVIDENCES_VALIDATION_2026);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP FUNCTION IF EXISTS `evidences_validation`;');
    await queryRunner.query(EVIDENCES_VALIDATION_LEGACY);
    await queryRunner.query('DROP TABLE `result_oicr_annexes`');
  }
}
