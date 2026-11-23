import { Injectable } from '@nestjs/common';
import { ResultOicr } from '../entities/result-oicr.entity';
import { EntityManager, Repository } from 'typeorm';
import { AppConfig } from '../../../shared/utils/app-config.util';
import {
  OicrWordTemplateAreaRow,
  OicrWordTemplateContactRow,
  OicrWordTemplateCountryRow,
  OicrWordTemplateData,
  OicrWordTemplateProjectRow,
  OicrWordTemplateRegionRow,
} from '../word-template/dto/oicr-word-template-data.dto';

@Injectable()
export class ResultOicrRepository extends Repository<ResultOicr> {
  constructor(
    entityManager: EntityManager,
    private readonly appConfig: AppConfig,
  ) {
    super(ResultOicr, entityManager);
  }

  async getDataToNewOicrMessage(resultId: number) {
    const query = ` SELECT 
                    r.result_official_code as result_code,
                    r.title as result_title,
                    r.created_at as cration_date,
                    rc.contract_id as contract_code,
                    ac.description as contract_description,
                    ac.project_lead_description as principal_investigator,
                    IFNULL(GROUP_CONCAT(cl.full_name separator ', '), 'No lever associated') as primary_lever,
                    IF(aus.carnet IS NOT NULL, CONCAT(aus.first_name, ', ',aus.last_name), 'Not Provided') as main_contact_person,
                    r.description as oicr_description
                    FROM results r
                    INNER JOIN result_oicrs ro ON ro.result_id = r.result_id 
                    INNER JOIN result_contracts rc ON rc.result_id = r.result_id 
                                                    AND rc.is_primary = TRUE
                                                    AND rc.is_active = TRUE
                                                    AND rc.contract_role_id = 1
                    INNER JOIN agresso_contracts ac ON ac.agreement_id = rc.contract_id 
                    LEFT JOIN result_levers rl ON rl.result_id = r.result_id 
                                                AND rl.is_primary = TRUE
                                                -- Portfolio 2 keeps step 2 as Research Areas (role 3)
                                                AND rl.lever_role_id = IF(get_portfolio_id_by_result(r.result_id) = 2, 3, 1)
                    LEFT JOIN clarisa_levers cl ON cl.id = rl.lever_id 
                    LEFT JOIN result_users ru ON ru.result_id = r.result_id 
                                                AND ru.is_active = TRUE
                                                AND ru.user_role_id = 1
                    LEFT JOIN alliance_user_staff aus ON aus.carnet = ru.user_id 
                    WHERE r.is_active = TRUE
                        AND r.result_id = ?
                    LIMIT 1;`;

    const result = await this.query(query, [resultId]).then((res) => res?.[0]);
    result.oicr_link = `${this.appConfig.ARI_CLIENT_HOST}/result/${result.result_code}/general-information`;
    return result;
  }

  async getResultOicrDetailsByOfficialCode(resultId: number) {
    const query = `
    SELECT
        r.result_id,
        r.result_official_code as result_code,
        r.title,
        ac_main.agreement_id AS main_project_id,
        ac_main.description AS main_project_title,
        ac.agreement_id as project_id,
        ac.description as project_title,
        t.id as tag_id,
        t.name as tag_name,
        ro.outcome_impact_statement,
        cl_main.id as main_lever_id,
        -- Research Areas (Portfolio 2) have no short_name
        COALESCE(cl_main.short_name, cl_main.full_name) as main_lever,
        cl_main.full_name as main_lever_name,
        cl.id as lever_id,
        COALESCE(cl.short_name, cl.full_name) as lever,
        cl.full_name as lever_name,
        cgs.name as geographic_scope,
        cr.um49Code as region_code,
        cr.name as region_name,
        cc.isoAlpha2 as country_code,
        cc.name as country_name,
        r.comment_geo_scope,
        COALESCE(teo.handle_link, ro_linked.cgspace_link) AS handle_link
      FROM results r
      INNER JOIN result_oicrs ro ON ro.result_id = r.result_id
      INNER JOIN result_contracts rc_main 
        ON rc_main.result_id = r.result_id 
        AND rc_main.is_active = TRUE 
        AND rc_main.is_primary = 1
      INNER JOIN agresso_contracts ac_main 
      ON ac_main.agreement_id = rc_main.contract_id
      LEFT JOIN result_contracts rc 
        ON rc.result_id = r.result_id 
        AND rc.is_active = TRUE 
        AND rc.is_primary = 0
      LEFT JOIN agresso_contracts ac 
        ON ac.agreement_id = rc.contract_id
      LEFT JOIN result_levers rl_main ON rl_main.result_id = r.result_id 
        -- Portfolio 2 keeps step 2 as Research Areas (role 3)
        AND rl_main.lever_role_id = IF(get_portfolio_id_by_result(r.result_id) = 2, 3, 1)
        AND rl_main.is_active = TRUE 
        AND rl_main.is_primary = 1
      LEFT JOIN clarisa_levers cl_main ON cl_main.id = rl_main.lever_id
      LEFT JOIN result_levers rl ON rl.result_id = r.result_id 
        AND rl.lever_role_id = IF(get_portfolio_id_by_result(r.result_id) = 2, 3, 1)
        AND rl.is_active = TRUE 
        AND rl.is_primary = 0
      LEFT JOIN clarisa_levers cl ON cl.id = rl.lever_id 
      LEFT JOIN result_tags rt on rt.result_id = r.result_id
        AND rt.is_active = TRUE
      LEFT JOIN tags t on t.id = rt.tag_id
        AND t.is_active = TRUE
      LEFT JOIN clarisa_geo_scope cgs on cgs.code = r.geo_scope_id
      LEFT JOIN result_regions rg on rg.result_id = r.result_id
        AND rg.is_active = TRUE
      LEFT JOIN clarisa_regions cr on cr.um49Code = rg.region_id
      LEFT JOIN result_countries rco on rco.result_id = r.result_id
        AND rco.is_active = TRUE
      LEFT JOIN clarisa_countries cc on cc.isoAlpha2 = rco.isoAlpha2
      LEFT JOIN TEMP_result_external_oicrs treo on treo.result_id = r.result_id
        AND treo.is_active = TRUE
      LEFT JOIN TEMP_external_oicrs teo on teo.id = treo.external_oicr_id
        AND treo.source = 'external'
      LEFT JOIN result_oicrs ro_linked on ro_linked.result_id = treo.external_oicr_id
        AND treo.source = 'result'
      WHERE r.result_id = ?
        AND r.is_active = TRUE;
    `;
    return await this.query(query, [resultId]);
  }

  /**
   * Modal rows for the 2026 OICR Word template. One query per source so the
   * joins cannot multiply rows. Every source is filtered with `is_active = 1`.
   */
  async getWordTemplateData(resultId: number): Promise<OicrWordTemplateData> {
    const [
      coreRows,
      handleRows,
      projectRows,
      areaRows,
      regionRows,
      countryRows,
      subRows,
      contactRows,
    ] = await Promise.all([
      this.query(CORE_SQL, [resultId]),
      this.query(HANDLE_SQL, [resultId]),
      this.query(PROJECT_SQL, [resultId]),
      this.query(AREA_SQL, [resultId]),
      this.query(REGION_SQL, [resultId]),
      this.query(COUNTRY_SQL, [resultId]),
      this.query(SUB_NATIONAL_SQL, [resultId]),
      this.query(CONTACT_SQL, [resultId]),
    ]);

    const core = coreRows[0] as CoreRow | undefined;
    const handle = handleRows[0] as HandleRow | undefined;
    const project = projectRows[0] as ProjectRow | undefined;
    const contact = contactRows[0] as ContactRow | undefined;

    return {
      reportingYear: core ? textOrNull(core.reporting_year) : null,
      title: core ? textOrNull(core.title) : null,
      geoScopeId: core ? numOrNull(core.geo_scope_id) : null,
      geoComment: core ? textOrNull(core.comment_geo_scope) : null,
      elaboration: core ? textOrNull(core.elaboration) : null,
      tagId: core ? numOrNull(core.tag_id) : null,
      previousHandle: textOrNull(handle?.handle_link),
      mainProject: mapMainProject(project),
      researchAreas: mapResearchAreas(areaRows as AreaRow[]),
      regions: mapRegions(regionRows as RegionRow[]),
      countries: mapCountries(
        countryRows as CountryRow[],
        subRows as SubNationalRow[],
      ),
      contact: mapContact(contact),
    };
  }
}

const CORE_SQL = `
SELECT
  r.report_year_id AS reporting_year,
  r.title AS title,
  r.geo_scope_id AS geo_scope_id,
  r.comment_geo_scope AS comment_geo_scope,
  ro.outcome_impact_statement AS elaboration,
  rt.tag_id AS tag_id
FROM results r
INNER JOIN result_oicrs ro
  ON ro.result_id = r.result_id
 AND ro.is_active = 1
LEFT JOIN result_tags rt
  ON rt.result_id = r.result_id
 AND rt.is_active = 1
WHERE r.result_id = ?
  AND r.is_active = 1
ORDER BY rt.id ASC
LIMIT 1`;

const HANDLE_SQL = `
SELECT COALESCE(teo.handle_link, ro_linked.cgspace_link) AS handle_link
FROM TEMP_result_external_oicrs treo
LEFT JOIN TEMP_external_oicrs teo
  ON teo.id = treo.external_oicr_id
 AND treo.source = 'external'
 AND teo.is_active = 1
LEFT JOIN result_oicrs ro_linked
  ON ro_linked.result_id = treo.external_oicr_id
 AND treo.source = 'result'
 AND ro_linked.is_active = 1
WHERE treo.result_id = ?
  AND treo.is_active = 1
ORDER BY treo.id ASC
LIMIT 1`;

const PROJECT_SQL = `
SELECT
  ac.agreement_id AS agreement_id,
  ac.description AS description
FROM result_contracts rc
INNER JOIN agresso_contracts ac
  ON ac.agreement_id = rc.contract_id
 AND ac.is_active = 1
WHERE rc.result_id = ?
  AND rc.is_active = 1
  AND rc.is_primary = 1
  AND rc.contract_role_id = 1
ORDER BY rc.result_contract_id ASC
LIMIT 1`;

const AREA_SQL = `
SELECT
  rl.lever_id AS lever_id,
  rl.is_primary AS is_primary,
  rl.custom_lever_name AS custom_lever_name
FROM result_levers rl
WHERE rl.result_id = ?
  AND rl.is_active = 1
  AND rl.lever_role_id = 3
ORDER BY rl.result_lever_id`;

const REGION_SQL = `
SELECT
  cr.um49Code AS code,
  cr.name AS name
FROM result_regions rr
INNER JOIN clarisa_regions cr
  ON cr.um49Code = rr.region_id
 AND cr.is_active = 1
WHERE rr.result_id = ?
  AND rr.is_active = 1
ORDER BY cr.name`;

const COUNTRY_SQL = `
SELECT
  rc.result_country_id AS result_country_id,
  cc.name AS name
FROM result_countries rc
INNER JOIN clarisa_countries cc
  ON cc.isoAlpha2 = rc.isoAlpha2
 AND cc.is_active = 1
WHERE rc.result_id = ?
  AND rc.is_active = 1
ORDER BY cc.name`;

const SUB_NATIONAL_SQL = `
SELECT
  s.result_country_id AS result_country_id,
  sn.name AS name
FROM result_countries rc
INNER JOIN result_countries_sub_nationals s
  ON s.result_country_id = rc.result_country_id
 AND s.is_active = 1
INNER JOIN clarisa_sub_nationals sn
  ON sn.id = s.sub_national_id
 AND sn.is_active = 1
WHERE rc.result_id = ?
  AND rc.is_active = 1
ORDER BY sn.name`;

const CONTACT_SQL = `
SELECT
  s.first_name AS first_name,
  s.last_name AS last_name,
  s.position AS position,
  s.center AS center,
  s.email AS email
FROM result_users u
INNER JOIN alliance_user_staff s
  ON s.carnet = u.user_id
 AND s.is_active = 1
WHERE u.result_id = ?
  AND u.is_active = 1
  AND u.user_role_id = 1
ORDER BY u.result_user_id ASC
LIMIT 1`;

/** MySQL text/id columns arrive as a string or a number, never an object. */
type DbScalar = string | number | null;

interface CoreRow {
  reporting_year: DbScalar;
  title: DbScalar;
  geo_scope_id: DbScalar;
  comment_geo_scope: DbScalar;
  elaboration: DbScalar;
  tag_id: DbScalar;
}

interface HandleRow {
  handle_link: DbScalar;
}

interface ProjectRow {
  agreement_id: DbScalar;
  description: DbScalar;
}

interface AreaRow {
  lever_id: DbScalar;
  is_primary: boolean | number | string | null;
  custom_lever_name: DbScalar;
}

interface RegionRow {
  code: DbScalar;
  name: DbScalar;
}

interface CountryRow {
  result_country_id: DbScalar;
  name: DbScalar;
}

interface SubNationalRow {
  result_country_id: DbScalar;
  name: DbScalar;
}

interface ContactRow {
  first_name: DbScalar;
  last_name: DbScalar;
  position: DbScalar;
  center: DbScalar;
  email: DbScalar;
}

function scalarText(value: DbScalar | undefined): string {
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') return value;
  return value === undefined ? 'undefined' : 'null';
}

function textOrNull(value: DbScalar | undefined): string | null {
  if (value === null || value === undefined) return null;
  const text = typeof value === 'number' ? String(value) : value;
  return text === '' ? null : text;
}

function numOrNull(value: DbScalar | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function indexSubNationals(
  rows: readonly SubNationalRow[],
): Map<string, string[]> {
  const subsByCountry = new Map<string, string[]>();
  for (const row of rows) {
    const name = textOrNull(row.name);
    if (!name) continue;
    const key = scalarText(row.result_country_id);
    const names = subsByCountry.get(key) ?? [];
    names.push(name);
    subsByCountry.set(key, names);
  }
  return subsByCountry;
}

function mapCountries(
  rows: readonly CountryRow[],
  subRows: readonly SubNationalRow[],
): OicrWordTemplateCountryRow[] {
  const subsByCountry = indexSubNationals(subRows);
  const countries: OicrWordTemplateCountryRow[] = [];
  for (const row of rows) {
    const name = textOrNull(row.name);
    if (!name) continue;
    countries.push({
      name,
      subNationals: subsByCountry.get(scalarText(row.result_country_id)) ?? [],
    });
  }
  return countries;
}

function mapRegions(rows: readonly RegionRow[]): OicrWordTemplateRegionRow[] {
  const regions: OicrWordTemplateRegionRow[] = [];
  for (const row of rows) {
    const code = Number(row.code);
    const name = textOrNull(row.name);
    if (!Number.isFinite(code) || !name) continue;
    regions.push({ code, name });
  }
  return regions;
}

function mapResearchAreas(rows: readonly AreaRow[]): OicrWordTemplateAreaRow[] {
  return rows.map((row) => ({
    leverId: numOrNull(row.lever_id),
    isPrimary:
      row.is_primary === true || row.is_primary === 1 || row.is_primary === '1',
    customName: textOrNull(row.custom_lever_name),
  }));
}

function mapMainProject(
  project: ProjectRow | undefined,
): OicrWordTemplateProjectRow | null {
  if (!project) return null;
  const agreementId = textOrNull(project.agreement_id);
  const description = textOrNull(project.description);
  if (!agreementId || !description) return null;
  return { agreementId, description };
}

function mapContact(
  contact: ContactRow | undefined,
): OicrWordTemplateContactRow | null {
  if (!contact) return null;
  return {
    firstName: textOrNull(contact.first_name),
    lastName: textOrNull(contact.last_name),
    position: textOrNull(contact.position),
    center: textOrNull(contact.center),
    email: textOrNull(contact.email),
  };
}
