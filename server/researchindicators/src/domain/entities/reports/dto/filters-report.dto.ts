import { IndicatorsEnum } from '../../indicators/enum/indicators.enum';
import { ResultStatusEnum } from '../../result-status/enum/result-status.enum';
import { ReportingPlatformEnum } from '../../results/enum/reporting-platform.enum';
import { ResultSortEnum } from '../../results/enum/result-sort.enum';

export class FiltersReportDto {
  search: string;
  statusCodes: ResultStatusEnum[];
  contractCodes: string[];
  years: string[];
  platformCode: ReportingPlatformEnum[];
  indicators: IndicatorsEnum[];
  onlyOwnResults: boolean;
  /** Injected server-side for `onlyOwnResults` (same as Result Center). */
  currentUserId?: number;
  /**
   * Full name (or email fallback) of the current user; used in export banner when
   * `onlyOwnResults` is true.
   */
  currentUserDisplayName?: string;
}

export class SortingReportDto {
  sortOrder: 'ASC' | 'DESC';
  sortField: ResultSortEnum;
}

export class FullFiltersReportDto {
  filters: FiltersReportDto;
  sorting: SortingReportDto;
}

/** Defaults aligned with Result Center when query params are omitted. */
export function emptyFullFiltersReportDto(): FullFiltersReportDto {
  return {
    filters: {
      search: '',
      statusCodes: [],
      contractCodes: [],
      years: [],
      platformCode: [],
      indicators: [],
      onlyOwnResults: false,
      currentUserId: undefined,
      currentUserDisplayName: undefined,
    },
    sorting: { sortOrder: 'DESC', sortField: ResultSortEnum.CODE },
  };
}

/**
 * Merges a partial `FullFiltersReportDto` with the same defaults as Result Center
 * before using it in export (`findStarResultsMetadataRows` → `findResultsV2`).
 */
export function mergeFullFiltersReportDto(
  input: FullFiltersReportDto,
): FullFiltersReportDto {
  const base = emptyFullFiltersReportDto();
  return {
    filters: { ...base.filters, ...input.filters },
    sorting: { ...base.sorting, ...input.sorting },
  };
}
