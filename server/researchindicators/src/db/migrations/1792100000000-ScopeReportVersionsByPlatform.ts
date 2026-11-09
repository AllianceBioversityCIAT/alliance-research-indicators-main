import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * result_official_code is only unique per platform (STAR, PRMS, TIP, AICCRA
 * each keep their own sequence), so the approved-versions subquery must be
 * keyed by (result_official_code, platform_code). Without it, a STAR result
 * reports the snapshot years of a PRMS result that happens to share its code.
 */
export class ScopeReportVersionsByPlatform1792100000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE OR REPLACE VIEW report_general_information AS
            SELECT
                root.result_id,
                root.result_official_code AS result_code,
                root.platform_code,
                root.public_link,
                root.external_link AS platform_link,
                i.name as indicator,
                rs.name AS status,
                report_field(root.title, TRUE, NULL) AS result_title,
                report_field(root.description, TRUE, NULL) AS result_description,
                report_field(root.report_year_id, TRUE, NULL) AS reporting_year,
                versions.reporting_years AS approved_versions,
                report_field(rk.keywords, FALSE, NULL) AS keywords,
                CONCAT_WS('',su.first_name, ' ',su.last_name ) AS creator,
                DATE_FORMAT(root.created_at, '%Y-%m-%d') AS creation_date,
                report_field(mcp.user_name, TRUE, NULL) AS main_contact_person
            FROM results root
                INNER JOIN indicators i ON i.indicator_id = root.indicator_id 
                INNER JOIN result_status rs ON rs.result_status_id = root.result_status_id 
                LEFT JOIN (SELECT
                                versions.result_official_code,
                                versions.platform_code,
                                GROUP_CONCAT(versions.report_year_id SEPARATOR ', ') AS reporting_years
                            FROM results versions
                            WHERE versions.is_active = TRUE
                                AND versions.is_snapshot = TRUE
                            GROUP BY versions.result_official_code, versions.platform_code) versions ON versions.result_official_code = root.result_official_code
                                AND versions.platform_code = root.platform_code
                LEFT JOIN (SELECT 
                                rk.result_id,
                                GROUP_CONCAT(rk.keyword SEPARATOR ', ') AS keywords
                            FROM result_keywords rk 
                            WHERE rk.is_active = TRUE
                            GROUP BY rk.result_id) rk ON rk.result_id = root.result_id 
                LEFT JOIN sec_users su ON su.sec_user_id = root.created_by 
                LEFT JOIN (SELECT 
                                ru.result_id, 
                                CONCAT_WS('',aus.first_name, ' ',aus.last_name ) AS user_name
                            FROM result_users ru 
                            LEFT JOIN alliance_user_staff aus ON aus.carnet = ru.user_id 
                            WHERE ru.user_role_id = 1
                                AND ru.is_active = TRUE
                            GROUP BY ru.result_id 
                            ORDER BY ru.updated_by DESC) mcp ON mcp.result_id = root.result_id 
            WHERE root.is_active = TRUE
                AND root.is_snapshot = FALSE
            ORDER BY root.result_id ASC`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE OR REPLACE VIEW report_general_information AS
            SELECT
                root.result_id,
                root.result_official_code AS result_code,
                root.platform_code,
                root.public_link,
                root.external_link AS platform_link,
                i.name as indicator,
                rs.name AS status,
                report_field(root.title, TRUE, NULL) AS result_title,
                report_field(root.description, TRUE, NULL) AS result_description,
                report_field(root.report_year_id, TRUE, NULL) AS reporting_year,
                versions.reporting_years AS approved_versions,
                report_field(rk.keywords, FALSE, NULL) AS keywords,
                CONCAT_WS('',su.first_name, ' ',su.last_name ) AS creator,
                DATE_FORMAT(root.created_at, '%Y-%m-%d') AS creation_date,
                report_field(mcp.user_name, TRUE, NULL) AS main_contact_person
            FROM results root
                INNER JOIN indicators i ON i.indicator_id = root.indicator_id 
                INNER JOIN result_status rs ON rs.result_status_id = root.result_status_id 
                LEFT JOIN (SELECT
                                versions.result_official_code,
                                GROUP_CONCAT(versions.report_year_id SEPARATOR ', ') AS reporting_years
                            FROM results versions
                            WHERE versions.is_active = TRUE
                                AND versions.is_snapshot = TRUE
                            GROUP BY versions.result_official_code) versions ON versions.result_official_code = root.result_official_code 
                LEFT JOIN (SELECT 
                                rk.result_id,
                                GROUP_CONCAT(rk.keyword SEPARATOR ', ') AS keywords
                            FROM result_keywords rk 
                            WHERE rk.is_active = TRUE
                            GROUP BY rk.result_id) rk ON rk.result_id = root.result_id 
                LEFT JOIN sec_users su ON su.sec_user_id = root.created_by 
                LEFT JOIN (SELECT 
                                ru.result_id, 
                                CONCAT_WS('',aus.first_name, ' ',aus.last_name ) AS user_name
                            FROM result_users ru 
                            LEFT JOIN alliance_user_staff aus ON aus.carnet = ru.user_id 
                            WHERE ru.user_role_id = 1
                                AND ru.is_active = TRUE
                            GROUP BY ru.result_id 
                            ORDER BY ru.updated_by DESC) mcp ON mcp.result_id = root.result_id 
            WHERE root.is_active = TRUE
                AND root.is_snapshot = FALSE
            ORDER BY root.result_id ASC`);
  }
}
