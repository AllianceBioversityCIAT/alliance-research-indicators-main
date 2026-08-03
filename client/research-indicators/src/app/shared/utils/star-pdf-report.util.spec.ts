import {
  CAPACITY_SHARING_INDICATOR_ID,
  getStarFrontendResultCode,
  getStarPdfReportName,
  getStarReportViewerUrl,
  getStarReportYear,
  INNOVATION_DEVELOPMENT_INDICATOR_ID,
  isStarInnDevPdfTemporarilyDisabled,
  isStarPdfReportEligible,
  isStarPdfReportEligibleFromResultId,
  openStarPdfReportInNewTab,
  STAR_INN_DEV_PDF_ENABLED
} from './star-pdf-report.util';

describe('star-pdf-report.util', () => {
  it('getStarPdfReportName should map supported indicators to report names', () => {
    expect(getStarPdfReportName(CAPACITY_SHARING_INDICATOR_ID)).toBe('cap_sharing');
    expect(getStarPdfReportName(INNOVATION_DEVELOPMENT_INDICATOR_ID)).toBe('inn_dev');
    expect(getStarPdfReportName(4)).toBeNull();
  });

  it('isStarInnDevPdfTemporarilyDisabled should reflect STAR_INN_DEV_PDF_ENABLED flag', () => {
    expect(isStarInnDevPdfTemporarilyDisabled(INNOVATION_DEVELOPMENT_INDICATOR_ID)).toBe(!STAR_INN_DEV_PDF_ENABLED);
    expect(isStarInnDevPdfTemporarilyDisabled(CAPACITY_SHARING_INDICATOR_ID)).toBe(false);
  });

  it('isStarPdfReportEligible should require STAR platform and supported indicator', () => {
    expect(isStarPdfReportEligible({ platform_code: 'STAR', indicator_id: CAPACITY_SHARING_INDICATOR_ID })).toBe(true);
    expect(isStarPdfReportEligible({ platform_code: 'STAR', indicator_id: INNOVATION_DEVELOPMENT_INDICATOR_ID })).toBe(true);
    expect(isStarPdfReportEligible({ platform_code: 'STAR', indicator_id: 4 })).toBe(false);
    expect(isStarPdfReportEligible({ platform_code: 'PRMS', indicator_id: CAPACITY_SHARING_INDICATOR_ID })).toBe(false);
  });

  it('isStarPdfReportEligibleFromResultId should require STAR result id and supported indicator', () => {
    expect(isStarPdfReportEligibleFromResultId(1, 'STAR-8')).toBe(true);
    expect(isStarPdfReportEligibleFromResultId(2, 'STAR-8')).toBe(true);
    expect(isStarPdfReportEligibleFromResultId(4, 'STAR-8')).toBe(false);
    expect(isStarPdfReportEligibleFromResultId(1, 'PRMS-8')).toBe(false);
    expect(isStarPdfReportEligibleFromResultId(1, null)).toBe(false);
    expect(isStarPdfReportEligibleFromResultId(1, undefined)).toBe(false);
    expect(isStarPdfReportEligibleFromResultId(1, '  star-8  ')).toBe(true);
  });

  it('getStarReportYear should resolve from report_year_id, report_year, snapshot_years, or year', () => {
    expect(getStarReportYear({ report_year_id: 2024 })).toBe(2024);
    expect(getStarReportYear({ report_year: 2023 })).toBe(2023);
    expect(getStarReportYear({ snapshot_years: [2022, 2026] })).toBe(2026);
    expect(getStarReportYear({ year: 2025 })).toBe(2025);
    expect(getStarReportYear({})).toBeNull();
  });

  it('getStarFrontendResultCode should normalize STAR prefix', () => {
    expect(getStarFrontendResultCode(7)).toBe('STAR-7');
    expect(getStarFrontendResultCode('STAR-7')).toBe('STAR-7');
    expect(getStarFrontendResultCode(undefined, 'STAR-9')).toBe('STAR-9');
    expect(getStarFrontendResultCode(undefined)).toBe('STAR-');
  });

  it('getStarReportViewerUrl should include version query param when requested', () => {
    expect(
      getStarReportViewerUrl({
        platform_code: 'STAR',
        indicator_id: 1,
        result_official_code: 7,
        report_year_id: 2024
      })
    ).toBe('/reports/result/STAR-7?version=2024');

    expect(
      getStarReportViewerUrl({
        platform_code: 'STAR',
        indicator_id: 2,
        result_official_code: 8,
        report_year_id: 2026
      })
    ).toBe('/reports/result/STAR-8?version=2026');
  });

  it('getStarReportViewerUrl should use versionOverride when provided', () => {
    expect(getStarReportViewerUrl({ result_official_code: 7 }, { versionOverride: 2025 })).toBe(
      '/reports/result/STAR-7?version=2025'
    );
    expect(getStarReportViewerUrl({ result_official_code: 7 }, { versionOverride: '  ' })).toBe('/reports/result/STAR-7');
  });

  it('getStarReportViewerUrl should omit version when includeVersion is false', () => {
    expect(
      getStarReportViewerUrl(
        {
          platform_code: 'STAR',
          indicator_id: 1,
          result_official_code: 7,
          report_year_id: 2024
        },
        { includeVersion: false }
      )
    ).toBe('/reports/result/STAR-7');
  });

  it('openStarPdfReportInNewTab should open a new tab and clear opener', () => {
    const openedWindow = { opener: {} as Window | null };
    const openSpy = jest.spyOn(globalThis, 'open').mockReturnValue(openedWindow as Window);

    openStarPdfReportInNewTab('/reports/result/STAR-7');

    expect(openSpy).toHaveBeenCalledWith('/reports/result/STAR-7', '_blank', 'noopener,noreferrer');
    expect(openedWindow.opener).toBeNull();
    openSpy.mockRestore();
  });

  it('openStarPdfReportInNewTab should handle blocked popups', () => {
    const openSpy = jest.spyOn(globalThis, 'open').mockReturnValue(null);

    expect(() => openStarPdfReportInNewTab('/reports/result/STAR-7')).not.toThrow();

    openSpy.mockRestore();
  });
});
