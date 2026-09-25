import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { InstitutionRolesEnum } from '../../institution-roles/enums/institution-roles.enum';
import { ResultStatusEnum } from '../../result-status/enum/result-status.enum';
import { UserRolesEnum } from '../../user-roles/enum/user-roles.enum';
import { AppConfig } from '../../../shared/utils/app-config.util';
import {
  PrmsContractSnapshot,
  PrmsStaffSnapshot,
  PrmsSyncAggregate,
  PrmsSyncTypeSlices,
} from '../../../tools/prms-normalizer/dto/prms-sync-aggregate';

const asBoolean = (value: unknown): boolean =>
  value === true || value === 1 || value === '1';

const asStaff = (row: {
  email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
}): PrmsStaffSnapshot | null => {
  if (!row?.email && !row?.first_name && !row?.last_name) {
    return null;
  }
  return {
    email: row.email ?? '',
    first_name: row.first_name ?? '',
    last_name: row.last_name ?? '',
  };
};

const trimOrNull = (value: string | null | undefined): string | null => {
  const trimmed = value?.trim() ?? '';
  return trimmed === '' ? null : trimmed;
};

const mapContract = (row: {
  agreement_id: string;
  description?: string | null;
  ubwClientDescription?: string | null;
  is_primary?: unknown;
  clarisa_project_short_name?: string | null;
  clarisa_external_code?: string | null;
}): PrmsContractSnapshot => ({
  agreement_id: row.agreement_id,
  description: row.description ?? null,
  ubwClientDescription: row.ubwClientDescription ?? null,
  is_primary: asBoolean(row.is_primary),
  // Blank strings are normalised to null so the builder's fallback chain does not
  // have to distinguish "absent" from "present but empty".
  clarisa_project_short_name: trimOrNull(row.clarisa_project_short_name),
  clarisa_external_code: trimOrNull(row.clarisa_external_code),
});

@Injectable()
export class ResultPrmsSyncAggregateRepository {
  constructor(
    private readonly dataSource: DataSource,
    private readonly appConfig: AppConfig,
  ) {}

  async loadByResultId(resultId: number): Promise<PrmsSyncAggregate | null> {
    const secondary = this.appConfig.ARI_SECONDARY_MYSQL_NAME;
    // homologation.md §4 created_by.email: hop r.created_by → sec_users, then
    // resolve the staff row. Carnet is preferred — it is the stable id — but
    // `sec_users.carnet` is NULL for every creator of an Approved result measured
    // on Dev (279/279), which made the whole payload unbuildable via P-1. Email is
    // the fallback, and it is guarded rather than matched naively: DC-1 is real
    // (`alliance_user_staff` holds duplicate emails, and 199 rows carry ''), so the
    // subquery excludes blanks and picks ONE row deterministically (active first,
    // then lowest carnet) instead of letting a LEFT JOIN multiply the header row.
    const headerRows = await this.dataSource.query(
      `
      SELECT
        r.result_id,
        r.result_official_code,
        r.indicator_id,
        r.title,
        r.description,
        r.geo_scope_id,
        r.is_partner_not_applicable,
        r.created_at,
        creator.email AS created_by_email,
        creator.first_name AS created_by_first_name,
        creator.last_name AS created_by_last_name
      FROM results r
      LEFT JOIN ${secondary}.sec_users su
        ON su.sec_user_id = r.created_by
      LEFT JOIN alliance_user_staff creator
        ON creator.carnet = COALESCE(
          su.carnet,
          (SELECT a.carnet
             FROM alliance_user_staff a
            WHERE a.email = su.email
              AND su.email IS NOT NULL
              AND su.email <> ''
            ORDER BY a.is_active DESC, a.carnet ASC
            LIMIT 1)
        )
      WHERE r.result_id = ?
        AND r.is_active = TRUE
      `,
      [resultId],
    );

    const header = headerRows[0];
    if (!header) {
      return null;
    }

    const [
      contactRows,
      submissionRows,
      contractRows,
      programRows,
      regionRows,
      countryRows,
      subnationalRows,
      partnerRows,
      evidenceRows,
      capacityRows,
      innovationDevRows,
      policyRows,
      innovationUseRows,
      actorRows,
      institutionTypeRows,
      quantificationRows,
      implementingOrgRows,
      innovationTypeRows,
      innovationReadinessRows,
    ] = await Promise.all([
      this.dataSource.query(
        `
        SELECT aus.email, aus.first_name, aus.last_name
        FROM result_users ru
        INNER JOIN alliance_user_staff aus ON aus.carnet = ru.user_id
        WHERE ru.result_id = ?
          AND ru.user_role_id = ?
          AND ru.is_active = TRUE
        LIMIT 1
        `,
        [resultId, UserRolesEnum.MAIN_CONTACT],
      ),
      // homologation.md §4 submitted_by.submitted_date: pick created_at, not custom_date.
      // created_at is the immutable audit timestamp of the approval transition — the
      // same column that ranks "latest" (ORDER BY sh.created_at DESC). custom_date is
      // a nullable, later-editable display date (green-checks updateChageStatusDate);
      // rewriting it after the fact would send a date that is not the event time of
      // the transition and would desynchronize the selected row from the reported timestamp.
      this.dataSource.query(
        `
        SELECT
          sh.created_at,
          sh.submission_comment,
          aus.email,
          aus.first_name,
          aus.last_name
        FROM submission_history sh
        LEFT JOIN ${secondary}.sec_users su
          ON su.sec_user_id = sh.created_by
        LEFT JOIN alliance_user_staff aus
          ON aus.carnet = COALESCE(
            su.carnet,
            (SELECT a.carnet
               FROM alliance_user_staff a
              WHERE a.email = su.email
                AND su.email IS NOT NULL
                AND su.email <> ''
              ORDER BY a.is_active DESC, a.carnet ASC
              LIMIT 1)
          )
        WHERE sh.result_id = ?
          AND sh.to_status_id = ?
          AND sh.is_active = TRUE
        ORDER BY sh.created_at DESC
        LIMIT 1
        `,
        [resultId, ResultStatusEnum.APPROVED],
      ),
      this.dataSource.query(
        `
        SELECT
          ac.agreement_id,
          ac.description,
          ac.ubwClientDescription,
          rc.is_primary,
          bpm.clarisa_project_short_name,
          bpm.clarisa_external_code
        FROM result_contracts rc
        INNER JOIN agresso_contracts ac ON ac.agreement_id = rc.contract_id
        -- LEFT, not INNER: 8 of the 28 contracts currently used by pool-funding
        -- results have no active mapping row at all (measured 2026-09-21).
        -- Dropping those contracts from the payload would be worse than sending
        -- them with a fallback identifier.
        LEFT JOIN bilateral_project_mapping bpm
          ON bpm.agresso_agreement_id = rc.contract_id
          AND bpm.is_active = TRUE
        WHERE rc.result_id = ?
          AND rc.is_active = TRUE
        `,
        [resultId],
      ),
      this.dataSource.query(
        `
        SELECT
          sp.sp_code,
          sp.sp_role,
          toc.toc_result_id,
          toc.toc_result_title,
          toc.indicator_description,
          toc.aligns_with_toc
        FROM result_pool_funding_alignment a
        INNER JOIN result_pool_funding_alignment_sp sp
          ON sp.alignment_id = a.id
          AND sp.is_active = TRUE
        LEFT JOIN result_pool_funding_toc_alignment toc
          ON toc.result_id = a.result_id
          AND toc.sp_code = sp.sp_code
          AND toc.is_active = TRUE
        WHERE a.result_id = ?
          AND a.is_active = TRUE
        `,
        [resultId],
      ),
      this.dataSource.query(
        `
        SELECT cr.um49Code AS um49code, cr.name
        FROM result_regions rr
        INNER JOIN clarisa_regions cr ON cr.um49Code = rr.region_id
        WHERE rr.result_id = ?
          AND rr.is_active = TRUE
        `,
        [resultId],
      ),
      this.dataSource.query(
        `
        SELECT
          cc.code AS id,
          cc.name,
          cc.isoAlpha3 AS iso_alpha_3,
          cc.isoAlpha2 AS iso_alpha_2
        FROM result_countries rc
        INNER JOIN clarisa_countries cc ON cc.isoAlpha2 = rc.isoAlpha2
        WHERE rc.result_id = ?
          AND rc.is_active = TRUE
        `,
        [resultId],
      ),
      this.dataSource.query(
        `
        SELECT csn.id, csn.name
        FROM result_countries rc
        INNER JOIN result_countries_sub_nationals rcsn
          ON rcsn.result_country_id = rc.result_country_id
          AND rcsn.is_active = TRUE
        INNER JOIN clarisa_sub_nationals csn ON csn.id = rcsn.sub_national_id
        WHERE rc.result_id = ?
          AND rc.is_active = TRUE
        `,
        [resultId],
      ),
      this.dataSource.query(
        `
        SELECT ci.code AS institution_id, ci.acronym, ci.name
        FROM result_institutions ri
        INNER JOIN clarisa_institutions ci ON ci.code = ri.institution_id
        WHERE ri.result_id = ?
          AND ri.institution_role_id = ?
          AND ri.is_active = TRUE
        `,
        [resultId, InstitutionRolesEnum.PARTNERS],
      ),
      this.dataSource.query(
        `
        SELECT
          re.evidence_url AS link,
          re.evidence_description AS description,
          re.is_private
        FROM result_evidences re
        WHERE re.result_id = ?
          AND re.is_active = TRUE
        `,
        [resultId],
      ),
      this.dataSource.query(
        `SELECT * FROM result_capacity_sharing WHERE result_id = ? AND is_active = TRUE`,
        [resultId],
      ),
      this.dataSource.query(
        `SELECT * FROM result_innovation_dev WHERE result_id = ? AND is_active = TRUE`,
        [resultId],
      ),
      this.dataSource.query(
        `SELECT * FROM result_policy_change WHERE result_id = ? AND is_active = TRUE`,
        [resultId],
      ),
      this.dataSource.query(
        `SELECT * FROM result_innovation_use WHERE result_id = ? AND is_active = TRUE`,
        [resultId],
      ),
      this.dataSource.query(
        `SELECT * FROM result_actors WHERE result_id = ? AND is_active = TRUE`,
        [resultId],
      ),
      this.dataSource.query(
        `SELECT * FROM result_institution_types WHERE result_id = ? AND is_active = TRUE`,
        [resultId],
      ),
      this.dataSource.query(
        `SELECT * FROM result_quantifications WHERE result_id = ? AND is_active = TRUE`,
        [resultId],
      ),
      // R-PRMS-006 AC.1: policy_change.implementing_organizations.
      // Role filter is InstitutionRolesEnum.POLICY_CHANGE — not a literal,
      // and not InstitutionTypeRoleEnum (different table, different numbering).
      this.dataSource.query(
        `
        SELECT
          ri.institution_id,
          ri.institution_role_id,
          ci.acronym,
          ci.name
        FROM result_institutions ri
        LEFT JOIN clarisa_institutions ci ON ci.code = ri.institution_id
        WHERE ri.result_id = ?
          AND ri.institution_role_id = ?
          AND ri.is_active = TRUE
        `,
        [resultId, InstitutionRolesEnum.POLICY_CHANGE],
      ),
      // R-PRMS-005 AC.1: innovation_dev.innovation_type { code, name }.
      // clarisa_innovation_types is keyed on `code`, not `id`.
      this.dataSource.query(
        `
        SELECT cit.code, cit.name
        FROM result_innovation_dev rid
        INNER JOIN clarisa_innovation_types cit
          ON cit.code = rid.innovation_type_id
        WHERE rid.result_id = ?
          AND rid.is_active = TRUE
        `,
        [resultId],
      ),
      // R-PRMS-005 AC.2: innovation_dev.innovation_readiness { id, name }.
      // Do not select `level` — T-07 chose { id, name } and recorded it as
      // unproven at the persistence layer.
      this.dataSource.query(
        `
        SELECT cirl.id, cirl.name
        FROM result_innovation_dev rid
        INNER JOIN clarisa_innovation_readiness_levels cirl
          ON cirl.id = rid.innovation_readiness_id
        WHERE rid.result_id = ?
          AND rid.is_active = TRUE
        `,
        [resultId],
      ),
    ]);

    const contracts = (
      contractRows as Array<Parameters<typeof mapContract>[0]>
    ).map(mapContract);
    const primaryContract =
      contracts.find((contract) => contract.is_primary) ?? null;

    const submission = submissionRows[0];
    const implementingOrganizations = (
      implementingOrgRows as Array<{
        institution_id: number;
        institution_role_id: number;
        acronym: string | null;
        name: string | null;
      }>
    ).map((row) => ({
      institution_id: Number(row.institution_id),
      institution_role_id: Number(row.institution_role_id),
      acronym: row.acronym ?? null,
      name: row.name ?? null,
    }));

    const innovationTypeRow = (
      innovationTypeRows as Array<{ code: number; name: string }>
    )[0];
    const innovationReadinessRow = (
      innovationReadinessRows as Array<{ id: number; name: string }>
    )[0];

    const typeSlices: PrmsSyncTypeSlices = {
      capacity_sharing: capacityRows[0] ?? null,
      innovation_dev: innovationDevRows[0]
        ? {
            ...(innovationDevRows[0] as Record<string, unknown>),
            innovation_type: innovationTypeRow
              ? {
                  code: Number(innovationTypeRow.code),
                  name: innovationTypeRow.name,
                }
              : null,
            innovation_readiness: innovationReadinessRow
              ? {
                  id: Number(innovationReadinessRow.id),
                  name: innovationReadinessRow.name,
                }
              : null,
          }
        : null,
      policy_change: policyRows[0]
        ? {
            ...(policyRows[0] as Record<string, unknown>),
            implementing_organizations: implementingOrganizations,
          }
        : null,
      innovation_use: innovationUseRows[0] ?? null,
      actors: actorRows ?? [],
      institution_types: institutionTypeRows ?? [],
      quantifications: quantificationRows ?? [],
    };

    return {
      result_id: Number(header.result_id),
      result_official_code: header.result_official_code,
      indicator_id:
        header.indicator_id == null ? null : Number(header.indicator_id),
      created_at: new Date(header.created_at),
      title: header.title ?? null,
      description: header.description ?? null,
      geo_scope_id:
        header.geo_scope_id == null ? null : Number(header.geo_scope_id),
      is_partner_not_applicable: asBoolean(header.is_partner_not_applicable),
      created_by: asStaff({
        email: header.created_by_email,
        first_name: header.created_by_first_name,
        last_name: header.created_by_last_name,
      }),
      submitted_by: submission
        ? {
            staff: asStaff(submission) as PrmsStaffSnapshot,
            submitted_date: new Date(submission.created_at),
            comment: submission.submission_comment ?? null,
          }
        : null,
      lead_contact: asStaff((contactRows ?? [])[0] ?? {}),
      primary_contract: primaryContract,
      contracts,
      science_programs: (programRows ?? []).map(
        (row: {
          sp_code: string;
          sp_role: string | null;
          toc_result_id: number | null;
          toc_result_title: string | null;
          indicator_description: string | null;
          aligns_with_toc: unknown;
        }) => ({
          sp_code: row.sp_code,
          sp_role:
            row.sp_role === 'PRIMARY' || row.sp_role === 'CONTRIBUTING'
              ? row.sp_role
              : null,
          toc_result_id:
            row.toc_result_id == null ? null : Number(row.toc_result_id),
          toc_result_title: row.toc_result_title ?? null,
          indicator_description: row.indicator_description ?? null,
          aligns_with_toc:
            row.aligns_with_toc == null ? null : asBoolean(row.aligns_with_toc),
        }),
      ),
      regions: (regionRows ?? []).map(
        (row: { um49code: number; name: string }) => ({
          um49code: Number(row.um49code),
          name: row.name,
        }),
      ),
      countries: (countryRows ?? []).map(
        (row: {
          id: number;
          name: string;
          iso_alpha_3: string;
          iso_alpha_2: string;
        }) => ({
          id: Number(row.id),
          name: row.name,
          iso_alpha_3: row.iso_alpha_3,
          iso_alpha_2: row.iso_alpha_2,
        }),
      ),
      subnational_areas: (subnationalRows ?? []).map(
        (row: { id: number; name: string }) => ({
          id: Number(row.id),
          name: row.name,
        }),
      ),
      partners: (partnerRows ?? []).map(
        (row: {
          institution_id: number;
          acronym: string | null;
          name: string;
        }) => ({
          institution_id: Number(row.institution_id),
          acronym: row.acronym ?? null,
          name: row.name,
        }),
      ),
      evidence: (evidenceRows ?? []).map(
        (row: {
          link: string;
          description: string | null;
          is_private: unknown;
        }) => ({
          link: row.link,
          description: row.description ?? null,
          is_private: asBoolean(row.is_private),
        }),
      ),
      type_slices: typeSlices,
    };
  }
}
