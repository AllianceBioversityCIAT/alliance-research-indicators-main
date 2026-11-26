import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * OICR Details 2026. Additive only: new nullable columns, three seeded
 * catalogs, two result link tables, and `oicr_validation` recreated with a
 * branch for report year 2026 and later. The branch for earlier years keeps
 * the previous rule unchanged. Seed SQL is inlined (no bound parameters).
 */
const AUDIENCES = [
  'Industry and Private Sector',
  'Government and Policymakers',
  'Philanthropy',
  'Research',
  'Development Agencies',
  'Academia',
  'Farmers and Communities',
];

const THEMATIC_KEYWORDS = [
  'Food Security',
  'Nutrition, Diets, Health',
  'Conflicts, Crisis, Recovery',
  'Climate Adaptation and Resilience',
  'Climate Mitigation, Emissions, Carbon Sequestration',
  'Prosperity & Economic Opportunity',
  'Women and Youth Empowerment',
  'Biodiversity and Plant Genetic Resources',
  'Regenerative Agriculture and Landscapes',
  'Agri-Tech Innovation',
  'Inclusive Digital Tools / Artificial Intelligence',
  'Sustainable Supply Chains',
];

const UNIT_CATEGORIES: [string, string][] = [
  [
    'Individuals',
    'Breeders; Community Members; Community Seedbank Members; Entrepreneurs; Experts; Extension Officers; Farmers; Farming Families; Financial Institution Managers; Genebank Users; Germplasm Curators; Government Officials; Investors; Land Managers; Machine Operators; Participants/Trainees; Pastoralists; Private Sector Representatives; Producers; Researchers; Smallholder Farmers; Students; Technicians; Users; Women Vendors; Youth Market Facilitators',
  ],
  ['Households/Families', 'Households'],
  [
    'Organizations',
    'Agribusinesses; Community Seedbank Enterprises; Companies; Cooperatives; Financial Institutions; Government Institutions; NGOs; Producer Organizations; Research Organizations; SMEs',
  ],
  [
    'Geographic Units',
    'Countries; Regions; Provinces; Districts; Municipalities; Counties; Communities',
  ],
  [
    'Land & Natural Resources',
    'Land area footprint (Acres, Hectares includes research plots, control fields); Trees count (individual trees); Tree Species diversity; Genetic Resources (Genetic Germplasm, Crop Varieties, Legume Bean Varieties)',
  ],
  [
    'Financial Resources',
    'Liquid assets (such as USD); Insurance Products; Financing and Credit Services; Capital Investments; Investment Funds',
  ],
  ['Production Quantities', 'Tons/Kg; kg/ha; t/ha'],
  [
    'Knowledge & Information Products',
    'Knowledge Products; Information Services',
  ],
  [
    'Events & Capacity Development',
    'Events; Business Incubation and Acceleration Programs',
  ],
  [
    'Policies & Governance',
    'Policies/Strategies; Regulation, Standards, Agreements',
  ],
  [
    'Systems & Digital Assets',
    'Systems/Tools; Digital Platforms; Digital Climate Advisories; Investment Readiness Tools',
  ],
  ['Research & Data Assets', 'Data Assets; Genomic Data'],
  ['Partnerships & Investments', 'Partnerships; Investment Proposals'],
  ['Governance & Institutional Structures', 'Committees; Teams'],
  [
    'Performance Metrics & Indicators',
    'Adoption Rate; Post-harvest Losses; Productivity; Yield; Income; Revenue; Food Losses; Food Waste; Resilience Index; Capacity Score; Sustainability Score; Dietary Diversity Score; Water Use Efficiency; GHG Emissions; Carbon Footprint; Time Saved; Labour Savings; Other Performance Indicators',
  ],
];

const PERCENTAGE_UNITS = ['Adoption Rate', 'Post-harvest Losses'];

const sqlString = (value: string): string => `'${value.replace(/'/g, "''")}'`;

const AUDIT_COLUMNS = `
        \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`created_by\` bigint NULL,
        \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`updated_by\` bigint NULL,
        \`is_active\` tinyint NOT NULL DEFAULT 1,
        \`deleted_at\` timestamp NULL,`;

const TABLE_OPTIONS =
  'ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci';

const OICR_VALIDATION_2026 = `CREATE FUNCTION \`oicr_validation\`(result_code BIGINT) RETURNS tinyint(1)
    READS SQL DATA
BEGIN
DECLARE general_validation BOOLEAN DEFAULT FALSE;
DECLARE v_report_year INT DEFAULT NULL;

SELECT r.report_year_id
    INTO
    v_report_year
FROM results r
WHERE r.result_id = result_code;

IF v_report_year >= 2026 THEN
    SELECT 
        valid_text(ro.oicr_internal_code) AND
        ro.maturity_level_id IS NOT NULL AND
        valid_text(ro.outcome_impact_statement) AND
        valid_text(ro.problem_statement) AND
        valid_text(ro.alliance_solution) AND
        valid_text(ro.beneficiaries) AND
        valid_text(ro.outcome_achieved)
        INTO
        general_validation
    FROM result_oicrs ro 
    WHERE ro.result_id = result_code;
ELSE
    SELECT 
        valid_text(ro.oicr_internal_code) AND
        ro.maturity_level_id IS NOT NULL AND
        valid_text(ro.outcome_impact_statement) AND
        valid_text(ro.short_outcome_impact_statement)
        INTO
        general_validation
    FROM result_oicrs ro 
    WHERE ro.result_id = result_code;
END IF;


SELECT 
    COUNT(rt.id) > 0 AND general_validation
    INTO
    general_validation
FROM result_tags rt 
WHERE rt.is_active = TRUE
    AND rt.result_id = result_code;
                                               

SELECT 
    COUNT( treo.id > 0) AND general_validation
    INTO
    general_validation
FROM TEMP_result_external_oicrs treo 
WHERE treo.result_id = result_code
    AND treo.is_active = TRUE;


SELECT 
    IFNULL(COUNT(rq.id) = SUM(valid_text(rq.unit) AND 
                        rq.quantification_number IS NOT NULL AND 
                        valid_text(rq.description)), TRUE) AND general_validation
    INTO
    general_validation
FROM result_quantifications rq 
WHERE rq.result_id = result_code
    AND rq.is_active = TRUE
    AND rq.quantification_role_id = 1;

SELECT 
    IFNULL(COUNT(rq.id) = SUM(valid_text(rq.unit) AND 
                        rq.quantification_number IS NOT NULL AND 
                        valid_text(rq.description)), TRUE) AND general_validation
    INTO
    general_validation
FROM result_quantifications rq 
WHERE rq.result_id = result_code
    AND rq.is_active = TRUE
    AND rq.quantification_role_id = 2;

SELECT 
	COUNT(cia.id) = SUM(ria.impact_area_score_id IS NOT NULL) AND general_validation
	INTO
	general_validation
FROM clarisa_impact_areas cia 	
	LEFT JOIN result_impact_areas ria ON ria.impact_area_id = cia.id 
									AND ria.is_active = TRUE
									AND ria.result_id = result_code;


SELECT 
    count(temp.id) = COALESCE(COUNT(temp.valid), FALSE) AND general_validation
    INTO
    general_validation
FROM (SELECT ria.id, SUM(riagt.id > 0) > 0 AS valid
FROM result_impact_areas ria
LEFT JOIN result_impact_area_global_target riagt ON riagt.result_impact_area_id = ria.id
                                                AND riagt.is_active = TRUE
WHERE ria.result_id = result_code
    AND ria.impact_area_score_id = 3
GROUP BY ria.id) temp;
IF v_report_year >= 2026 THEN
    SELECT 
        COUNT(roa.id) > 0 AND general_validation
        INTO
        general_validation
    FROM result_oicr_audiences roa
    WHERE roa.is_active = TRUE
        AND roa.result_id = result_code;

    SELECT 
        COUNT(rotk.id) > 0 AND general_validation
        INTO
        general_validation
    FROM result_oicr_thematic_keywords rotk
    WHERE rotk.is_active = TRUE
        AND rotk.result_id = result_code;
END IF;

RETURN general_validation;     
                                END;`;

const OICR_VALIDATION_LEGACY = `CREATE FUNCTION \`oicr_validation\`(result_code BIGINT) RETURNS tinyint(1)
    READS SQL DATA
BEGIN
DECLARE general_validation BOOLEAN DEFAULT FALSE;

SELECT 
    valid_text(ro.oicr_internal_code) AND
    ro.maturity_level_id IS NOT NULL AND
    valid_text(ro.outcome_impact_statement) AND
    valid_text(ro.short_outcome_impact_statement)
    INTO
    general_validation
FROM result_oicrs ro 
WHERE ro.result_id = result_code;


SELECT 
    COUNT(rt.id) > 0 AND general_validation
    INTO
    general_validation
FROM result_tags rt 
WHERE rt.is_active = TRUE
    AND rt.result_id = result_code;
                                               

SELECT 
    COUNT( treo.id > 0) AND general_validation
    INTO
    general_validation
FROM TEMP_result_external_oicrs treo 
WHERE treo.result_id = result_code
    AND treo.is_active = TRUE;


SELECT 
    IFNULL(COUNT(rq.id) = SUM(valid_text(rq.unit) AND 
                        rq.quantification_number IS NOT NULL AND 
                        valid_text(rq.description)), TRUE) AND general_validation
    INTO
    general_validation
FROM result_quantifications rq 
WHERE rq.result_id = result_code
    AND rq.is_active = TRUE
    AND rq.quantification_role_id = 1;

SELECT 
    IFNULL(COUNT(rq.id) = SUM(valid_text(rq.unit) AND 
                        rq.quantification_number IS NOT NULL AND 
                        valid_text(rq.description)), TRUE) AND general_validation
    INTO
    general_validation
FROM result_quantifications rq 
WHERE rq.result_id = result_code
    AND rq.is_active = TRUE
    AND rq.quantification_role_id = 2;

SELECT 
	COUNT(cia.id) = SUM(ria.impact_area_score_id IS NOT NULL) AND general_validation
	INTO
	general_validation
FROM clarisa_impact_areas cia 	
	LEFT JOIN result_impact_areas ria ON ria.impact_area_id = cia.id 
									AND ria.is_active = TRUE
									AND ria.result_id = result_code;


SELECT 
    count(temp.id) = COALESCE(COUNT(temp.valid), FALSE) AND general_validation
    INTO
    general_validation
FROM (SELECT ria.id, SUM(riagt.id > 0) > 0 AS valid
FROM result_impact_areas ria
LEFT JOIN result_impact_area_global_target riagt ON riagt.result_impact_area_id = ria.id
                                                AND riagt.is_active = TRUE
WHERE ria.result_id = result_code
    AND ria.impact_area_score_id = 3
GROUP BY ria.id) temp;

    
RETURN general_validation;     
                                END;`;

export class OicrDetails20261792800000000 implements MigrationInterface {
  name = 'OicrDetails20261792800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`result_oicrs\`
        ADD COLUMN \`problem_statement\` text NULL,
        ADD COLUMN \`alliance_solution\` text NULL,
        ADD COLUMN \`beneficiaries\` text NULL,
        ADD COLUMN \`outcome_achieved\` text NULL,
        ADD COLUMN \`outcome_achieved_edited\` tinyint(1) NOT NULL DEFAULT 0,
        ADD COLUMN \`acknowledgments\` text NULL
    `);
    await queryRunner.query(
      `ALTER TABLE \`result_quantifications\` ADD COLUMN \`unit_macro_category\` varchar(150) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_users\` ADD COLUMN \`orcid\` varchar(19) NULL`,
    );

    await queryRunner.query(`
      CREATE TABLE \`oicr_audiences\` (${AUDIT_COLUMNS}
        \`id\` bigint NOT NULL AUTO_INCREMENT,
        \`name\` varchar(255) NOT NULL,
        PRIMARY KEY (\`id\`)
      ) ${TABLE_OPTIONS}
    `);
    await queryRunner.query(`
      CREATE TABLE \`oicr_thematic_keywords\` (${AUDIT_COLUMNS}
        \`id\` bigint NOT NULL AUTO_INCREMENT,
        \`name\` varchar(255) NOT NULL,
        PRIMARY KEY (\`id\`)
      ) ${TABLE_OPTIONS}
    `);
    await queryRunner.query(`
      CREATE TABLE \`quantification_unit_categories\` (${AUDIT_COLUMNS}
        \`id\` bigint NOT NULL AUTO_INCREMENT,
        \`macro_category\` varchar(150) NOT NULL,
        \`name\` varchar(255) NOT NULL,
        \`is_percentage\` tinyint(1) NOT NULL DEFAULT 0,
        PRIMARY KEY (\`id\`)
      ) ${TABLE_OPTIONS}
    `);
    await queryRunner.query(`
      CREATE TABLE \`result_oicr_audiences\` (${AUDIT_COLUMNS}
        \`id\` bigint NOT NULL AUTO_INCREMENT,
        \`result_id\` bigint NOT NULL,
        \`oicr_audience_id\` bigint NOT NULL,
        PRIMARY KEY (\`id\`),
        INDEX \`idx_result_oicr_audiences_result\` (\`result_id\`)
      ) ${TABLE_OPTIONS}
    `);
    await queryRunner.query(`
      CREATE TABLE \`result_oicr_thematic_keywords\` (${AUDIT_COLUMNS}
        \`id\` bigint NOT NULL AUTO_INCREMENT,
        \`result_id\` bigint NOT NULL,
        \`oicr_thematic_keyword_id\` bigint NOT NULL,
        PRIMARY KEY (\`id\`),
        INDEX \`idx_result_oicr_thematic_keywords_result\` (\`result_id\`)
      ) ${TABLE_OPTIONS}
    `);

    await queryRunner.query(
      `INSERT INTO \`oicr_audiences\` (\`name\`) VALUES ${AUDIENCES.map((name) => `(${sqlString(name)})`).join(', ')}`,
    );
    await queryRunner.query(
      `INSERT INTO \`oicr_thematic_keywords\` (\`name\`) VALUES ${THEMATIC_KEYWORDS.map((name) => `(${sqlString(name)})`).join(', ')}`,
    );
    const unitRows = UNIT_CATEGORIES.flatMap(([macro, names]) =>
      names
        .split(';')
        .map((name) => name.trim())
        .filter(Boolean)
        .map(
          (name) =>
            `(${sqlString(macro)}, ${sqlString(name)}, ${PERCENTAGE_UNITS.includes(name) ? 1 : 0})`,
        ),
    );
    await queryRunner.query(
      `INSERT INTO \`quantification_unit_categories\` (\`macro_category\`, \`name\`, \`is_percentage\`) VALUES ${unitRows.join(', ')}`,
    );

    await queryRunner.query('DROP FUNCTION IF EXISTS `oicr_validation`;');
    await queryRunner.query(OICR_VALIDATION_2026);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP FUNCTION IF EXISTS `oicr_validation`;');
    await queryRunner.query(OICR_VALIDATION_LEGACY);

    await queryRunner.query('DROP TABLE `result_oicr_thematic_keywords`');
    await queryRunner.query('DROP TABLE `result_oicr_audiences`');
    await queryRunner.query('DROP TABLE `quantification_unit_categories`');
    await queryRunner.query('DROP TABLE `oicr_thematic_keywords`');
    await queryRunner.query('DROP TABLE `oicr_audiences`');
    await queryRunner.query('ALTER TABLE `result_users` DROP COLUMN `orcid`');
    await queryRunner.query(
      'ALTER TABLE `result_quantifications` DROP COLUMN `unit_macro_category`',
    );
    await queryRunner.query(`
      ALTER TABLE \`result_oicrs\`
        DROP COLUMN \`acknowledgments\`,
        DROP COLUMN \`outcome_achieved_edited\`,
        DROP COLUMN \`outcome_achieved\`,
        DROP COLUMN \`beneficiaries\`,
        DROP COLUMN \`alliance_solution\`,
        DROP COLUMN \`problem_statement\`
    `);
  }
}
