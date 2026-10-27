import type { FiltersReportDto } from '../../dto/filters-report.dto';
import { indicatorsEnumDisplayName } from '../../../indicators/enum/indicators.enum';
import {
  ResultStatusNameEnum,
  type ResultStatusEnum,
} from '../../../result-status/enum/result-status.enum';

export const STAR_RAW_BANNER_SUBTITLE_PREFIX =
  'This file contains the results generated from the selected filters in STAR';

function trimOrEmpty(s: string | undefined): string {
  return (s ?? '').trim();
}

/**
 * Row 2 banner text: fixed prefix, then `Label - value` segments joined with ` | `.
 */
export function buildStarRawBannerSubtitle(filters: FiltersReportDto): string {
  const segments: string[] = [];
  const q = trimOrEmpty(filters.search);
  if (q) {
    segments.push(`Search - ${q}`);
  }
  if (filters.statusCodes?.length) {
    const names = filters.statusCodes.map(
      (c) => ResultStatusNameEnum[c as ResultStatusEnum] ?? `Status ${c}`,
    );
    segments.push(`Status - ${names.join(', ')}`);
  }
  if (filters.contractCodes?.length) {
    segments.push(`Contract - ${filters.contractCodes.join(', ')}`);
  }
  if (filters.years?.length) {
    segments.push(`Year - ${filters.years.join(', ')}`);
  }
  if (filters.platformCode?.length) {
    segments.push(`Platform - ${filters.platformCode.join(', ')}`);
  }
  if (filters.indicators?.length) {
    const names = filters.indicators.map((i) => indicatorsEnumDisplayName(i));
    segments.push(`Indicator - ${names.join(', ')}`);
  }
  if (filters.onlyOwnResults) {
    const who = trimOrEmpty(filters.currentUserDisplayName);
    if (who) {
      segments.push(`User - ${who}`);
    }
  }
  if (segments.length === 0) {
    return `${STAR_RAW_BANNER_SUBTITLE_PREFIX}.`;
  }
  return `${STAR_RAW_BANNER_SUBTITLE_PREFIX}: ${segments.join(' | ')}`;
}
