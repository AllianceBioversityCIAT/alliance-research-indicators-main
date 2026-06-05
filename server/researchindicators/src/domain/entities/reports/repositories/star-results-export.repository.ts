import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AppConfig } from '../../../shared/utils/app-config.util';
import { FullFiltersReportDto } from '../dto/filters-report.dto';
import { IndicatorsEnum } from '../../indicators/enum/indicators.enum';
import { ResultStatusEnum } from '../../result-status/enum/result-status.enum';
import { ReportingPlatformEnum } from '../../results/enum/reporting-platform.enum';
import { ResultSortEnum } from '../../results/enum/result-sort.enum';
import { ResultRepository } from '../../results/repositories/result.repository';

/**
 * Excel “Raw data” rows (`report_*` views).
 *
 * ## Filters / WHERE / order: same as Result Center
 *
 * The views are **not** the `results` table: the same column SQL cannot be copied there.
 * The export is therefore **two-phase** (same logic, single place where the WHERE is built):
 *
 * 1. **`ResultRepository.findResultsV2`** (`results` table + repo joins): everything applies there:
 *    - `buildFilteringV2(filters)` in the `WHERE`
 *    - If there is search text: `buildFindResultsV2SearchStaticWhereFragment` +
 *      `buildFindResultsV2CreatorNameWhereFragment` in the `WHERE`, and
 *      `buildFindResultsV2SearchRelevanceSelectFragment` in the `SELECT` (`_search_relevance` column)
 *    - `sortOrderV2WithSearchRelevance` in the `ORDER BY`
 * 2. **Query on `report_general_information gi`**: only `WHERE gi.result_id IN (…)` with the
 *    `result_id` values that already passed phase 1, and `ORDER BY FIELD(…)` to **repeat the same order**
 *    returned by `findResultsV2` (does not re-implement filters in the view).
 *
 * **Front pagination (`page` / `limit` on the DTO):** does not cap the Excel file; phase 1 walks
 * every internal page of `findResultsV2` until all rows are fetched (fixed chunk size in code).
 *
 * If the view SQL looks “sparse”, it is because **filters live in phase 1**, not duplicated here.
 *
 * Requires MySQL views: report_general_information, report_alliance_alignment,
 * report_partners, report_geo_location, report_evidences, report_ip_rights,
 * report_capacity_sharing_development, report_policy_change, report_oicr,
 * report_link_result.
 */
@Injectable()
export class StarResultsExportRepository {
  /**
   * Page size when paging `findResultsV2` until all results are loaded (the export does not use the
   * front `limit` for the Excel file; it is only for chunking requests).
   */
  private static readonly FIND_V2_EXPORT_PAGE_SIZE = 2000;

  /**
   * Raised for phase-2 only (same connection) so `report_*` views with heavy `GROUP_CONCAT`
   * are not truncated at the default 1024-byte limit. `SET LOCAL` reverts on commit/rollback.
   */
  private static readonly GROUP_CONCAT_MAX_LEN = 4_194_304;

  constructor(
    private readonly dataSource: DataSource,
    private readonly appConfig: AppConfig,
    private readonly resultRepository: ResultRepository,
  ) {}

  /**
   * Same criteria as Result Center: via {@link ResultRepository.findResultsV2} (phase 1) then
   * projection to views (phase 2). See class JSDoc.
   *
   * `FullFiltersReportDto` must be normalized with {@link mergeFullFiltersReportDto}.
   */
  async findStarResultsMetadataRows(
    filters: FullFiltersReportDto,
  ): Promise<Record<string, unknown>[]> {
    const selectBody = `
      SELECT
        gi.result_code AS result_code,
        gi.platform_code AS platform_code,
        gi.public_link AS public_link,
        IF(gi.platform_code = 'STAR',CONCAT_WS('','STAR-',gi.result_code),NULL) AS platform_link_display,
        IF(gi.platform_code = 'STAR', CONCAT_WS('','${this.appConfig.ARI_CLIENT_HOST}/result/STAR-',gi.result_code,'/general-information'),gi.platform_link) AS platform_link,
        gi.indicator AS indicator,
        gi.status AS status,
        gi.result_title AS result_title,
        gi.result_description AS result_description,
        gi.reporting_year AS reporting_year,
        gi.approved_versions AS approved_versions,
        gi.keywords AS keywords,
        gi.creator AS creator,
        gi.creation_date AS creation_date,
        gi.main_contact_person AS main_contact_person,
        aa.primary_project AS primary_project,
        aa.primary_project_principal_investigator AS primary_project_principal_investigator,
        aa.primary_project_start_date AS primary_project_start_date,
        aa.primary_project_end_date AS primary_project_end_date,
        aa.contributing_projects AS contributing_projects,
        aa.primary_lever AS primary_lever,
        aa.contributor_lever AS contributor_lever,
        aa.sdg_targets AS sdg_targets,
        pr.partners AS partners,
        gl.geo_scope_name AS geo_scope_name,
        gl.countries AS countries,
        gl.regions AS regions,
        gl.sub_nationals AS sub_nationals,
        ev.evidences AS evidences,
        ip.who_owns_ip_rights AS who_owns_ip_rights,
        ip.third_party AS third_party,
        ip.legal_restrictions_publication AS legal_restrictions_publication,
        ip.commercialization_potential_asset AS commercialization_potential_asset,
        ip.asset_need_refinement AS asset_need_refinement,
        csd.training_engagement_report AS training_engagement_report,
        csd.is_this_training_engagement AS is_this_training_engagement,
        csd.length_training AS length_training,
        csd.\`degree\` AS \`degree\`,
        csd.group_session_participants_total AS total_participants,
        csd.group_session_participants_total AS number_people_trained_total,
        csd.group_session_participants_female AS number_people_trained_female,
        csd.group_session_participants_male AS number_people_trained_male,
        csd.group_session_participants_non_binary AS number_people_trained_non_binary,
        csd.group_session_purpose_name AS group_session_purpose_name,
        csd.group_is_attending_organization AS group_is_attending_organization,
        csd.individual_trainee_affiliation AS individual_trainee_affiliation,
        csd.individual_trainee_name AS individual_trainee_name,
        csd.individual_trainee_nationality AS individual_trainee_nationality,
        csd.individual_gender AS individual_gender,
        csd.traning_supervisor AS traning_supervisor,
        csd.\`language\` AS \`language\`,
        csd.start_date AS start_date,
        csd.end_date AS end_date,
        csd.delivery_modality AS delivery_modality,
        pc.policy_type AS policy_type,
        pc.policy_stage AS policy_stage,
        pc.evidence_stage AS evidence_stage,
        pc.implementing_organizations AS implementing_organizations,
        oc.impact_area AS impact_area,
        oc.mel_regional_expert AS mel_regional_expert,
        oc.sharepoint_link AS sharepoint_link,
        oc.oicr_internal_code AS oicr_internal_code,
        oc.tagging AS tagging,
        oc.general_comment AS general_comment,
        oc.maturity_level AS maturity_level,
        oc.outcome_impact_statement AS outcome_impact_statement,
        oc.short_outcome_impact_statement AS short_outcome_impact_statement,
        CONCAT_WS(CHAR(10), oc.quantifications, oc.extrapolated_estimates) AS quantification,
        oc.authors_contact_persons AS authors_contact_persons,
        oc.for_external_use AS for_external_use,
        oc.for_external_use_description AS for_external_use_description,
        oc.existing_oicr AS existing_oicr,
        lkr.link_results AS link_results
      FROM report_general_information gi
      LEFT JOIN report_alliance_alignment aa ON aa.result_id = gi.result_id
      LEFT JOIN report_partners pr ON pr.result_id = gi.result_id
      LEFT JOIN report_geo_location gl ON gl.result_id = gi.result_id
      LEFT JOIN report_evidences ev ON ev.result_id = gi.result_id
      LEFT JOIN report_ip_rights ip ON ip.result_id = gi.result_id
      LEFT JOIN report_capacity_sharing_development csd ON csd.result_id = gi.result_id
      LEFT JOIN report_policy_change pc ON pc.result_id = gi.result_id
      LEFT JOIN report_oicr oc ON oc.result_id = gi.result_id
      LEFT JOIN report_link_result lkr ON lkr.result_id = gi.result_id`;

    const v2Filters = this.mapReportDtoToFindResultsV2Filters(filters);
    const search = filters.filters.search ?? '';
    const sorting = {
      field: filters.sorting.sortField,
      order: filters.sorting.sortOrder,
    };

    const orderedIds = await this.collectOrderedResultIdsViaFindResultsV2(
      search,
      sorting,
      v2Filters,
    );
    if (orderedIds.length === 0) {
      return [];
    }

    // Phase 2: narrow by IDs already filtered/ordered in findResultsV2 (does not duplicate buildFilteringV2 here).
    const ph = orderedIds.map(() => '?').join(',');
    const sql = `${selectBody}
      WHERE gi.result_id IN (${ph})
      ORDER BY FIELD(gi.result_id, ${ph})`;
    const params = [...orderedIds, ...orderedIds];
    return this.queryPhase2WithGroupConcatLimit(sql, params);
  }

  /**
   * Pins one pool connection, raises `group_concat_max_len` for the transaction only, then runs
   * the export SELECT (views rely on nested `GROUP_CONCAT`).
   */
  private async queryPhase2WithGroupConcatLimit(
    sql: string,
    params: unknown[],
  ): Promise<Record<string, unknown>[]> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    try {
      await queryRunner.startTransaction();
      await queryRunner.query(
        `SET LOCAL group_concat_max_len = ${StarResultsExportRepository.GROUP_CONCAT_MAX_LEN}`,
      );
      const rows = (await queryRunner.query(sql, params)) as Record<
        string,
        unknown
      >[];
      await queryRunner.commitTransaction();
      return rows;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private mapReportDtoToFindResultsV2Filters(dto: FullFiltersReportDto): {
    status: ResultStatusEnum[];
    contracts: string[];
    years: string[];
    sources: ReportingPlatformEnum[];
    indicators: IndicatorsEnum[];
    currentUser: { onlyOwnResults: boolean; userId: number };
  } {
    const f = dto.filters;
    return {
      status: f.statusCodes ?? [],
      contracts: f.contractCodes ?? [],
      years: f.years ?? [],
      sources: f.platformCode ?? [],
      indicators: f.indicators ?? [],
      currentUser: {
        onlyOwnResults: !!f.onlyOwnResults,
        userId: f.currentUserId ?? 0,
      },
    };
  }

  /**
   * Phase 1: delegates fully to `ResultRepository.findResultsV2` (WHERE + relevance + ORDER BY from the repo).
   */
  private async collectOrderedResultIdsViaFindResultsV2(
    search: string,
    sorting: { field?: ResultSortEnum; order?: 'ASC' | 'DESC' },
    filters: {
      status: ResultStatusEnum[];
      contracts: string[];
      years: string[];
      sources: ReportingPlatformEnum[];
      indicators: IndicatorsEnum[];
      currentUser: { onlyOwnResults: boolean; userId: number };
    },
  ): Promise<number[]> {
    const ids: number[] = [];
    let page = 1;
    while (true) {
      const { data, pagination } = await this.resultRepository.findResultsV2(
        search,
        { page, limit: StarResultsExportRepository.FIND_V2_EXPORT_PAGE_SIZE },
        sorting,
        filters,
      );
      for (const row of data as { result_id: number }[]) {
        ids.push(Number(row.result_id));
      }
      if (!pagination.hasNextPage || data.length === 0) {
        break;
      }
      page += 1;
    }
    return ids;
  }
}
