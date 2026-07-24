import { PLATFORM_CODES } from '@shared/constants/platform-codes';

export const CAPACITY_SHARING_INDICATOR_ID = 1;
export const INNOVATION_DEVELOPMENT_INDICATOR_ID = 2;

/** Re-enable when inn_dev PDF reports are ready on the backend. */
export const STAR_INN_DEV_PDF_ENABLED = false;

export const STAR_PDF_COMING_SOON_TOOLTIP = 'Coming soon';

export type StarPdfReportName = 'cap_sharing' | 'inn_dev';
export type StarResultCodeValue = number | string;
export type StarResultIdValue = string | number | null;

export interface StarPdfReportSource {
  platform_code?: string;
  indicator_id?: number;
  result_official_code?: StarResultCodeValue;
  report_year_id?: number;
  report_year?: number;
  snapshot_years?: number[];
  year?: StarResultCodeValue;
}

export function getStarPdfReportName(indicatorId: number | undefined): StarPdfReportName | null {
  if (indicatorId === CAPACITY_SHARING_INDICATOR_ID) return 'cap_sharing';
  if (indicatorId === INNOVATION_DEVELOPMENT_INDICATOR_ID) return 'inn_dev';
  return null;
}

export function isStarInnDevPdfTemporarilyDisabled(indicatorId: number | undefined): boolean {
  return indicatorId === INNOVATION_DEVELOPMENT_INDICATOR_ID && !STAR_INN_DEV_PDF_ENABLED;
}

export function isStarPdfReportEligible(source: StarPdfReportSource): boolean {
  return source.platform_code === PLATFORM_CODES.STAR && getStarPdfReportName(source.indicator_id) != null;
}

export function isStarPdfReportEligibleFromResultId(indicatorId: number | undefined, resultId: StarResultIdValue | undefined): boolean {
  if (getStarPdfReportName(indicatorId) == null) return false;
  const normalized = String(resultId ?? '')
    .trim()
    .toUpperCase();
  return normalized.startsWith(`${PLATFORM_CODES.STAR}-`);
}

export function getStarReportYear(source: Pick<StarPdfReportSource, 'report_year_id' | 'report_year' | 'snapshot_years' | 'year'>): number | null {
  if (typeof source.report_year_id === 'number') {
    return source.report_year_id;
  }

  if (typeof source.report_year === 'number') {
    return source.report_year;
  }

  if (Array.isArray(source.snapshot_years) && source.snapshot_years.length > 0) {
    return Math.max(...source.snapshot_years);
  }

  const parsedYear = Number(source.year);
  return Number.isFinite(parsedYear) ? parsedYear : null;
}

export function getStarFrontendResultCode(resultOfficialCode: StarResultCodeValue | undefined, resultIdFallback?: StarResultIdValue): string {
  const officialCode = String(resultOfficialCode ?? resultIdFallback ?? '').trim();
  if (!officialCode) return `${PLATFORM_CODES.STAR}-`;
  if (officialCode.toUpperCase().startsWith(`${PLATFORM_CODES.STAR}-`)) {
    return officialCode;
  }
  return `${PLATFORM_CODES.STAR}-${officialCode}`;
}

export function getStarReportViewerUrl(
  source: StarPdfReportSource,
  options?: {
    resultIdFallback?: StarResultIdValue;
    versionOverride?: StarResultIdValue;
    includeVersion?: boolean;
  }
): string {
  const resultCode = getStarFrontendResultCode(source.result_official_code, options?.resultIdFallback);
  const includeVersion = options?.includeVersion !== false;
  let version: StarResultIdValue = null;

  if (includeVersion) {
    const override = options?.versionOverride;
    version = override != null && String(override).trim() !== '' ? override : getStarReportYear(source);
  }

  const queryParts: string[] = [];

  if (version != null && String(version).trim() !== '') {
    queryParts.push(`version=${encodeURIComponent(String(version))}`);
  }

  const query = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
  return `/reports/result/${encodeURIComponent(resultCode)}${query}`;
}

export function openStarPdfReportInNewTab(url: string): void {
  const reportWindow = globalThis.open(url, '_blank', 'noopener,noreferrer');
  if (reportWindow) reportWindow.opener = null;
}
