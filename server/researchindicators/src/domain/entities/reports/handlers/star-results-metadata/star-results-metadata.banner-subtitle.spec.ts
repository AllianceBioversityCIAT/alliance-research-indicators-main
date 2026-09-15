import { IndicatorsEnum } from '../../../indicators/enum/indicators.enum';
import { ReportingPlatformEnum } from '../../../results/enum/reporting-platform.enum';
import { ResultStatusEnum } from '../../../result-status/enum/result-status.enum';
import {
  buildStarRawBannerSubtitle,
  STAR_RAW_BANNER_SUBTITLE_PREFIX,
} from './star-results-metadata.banner-subtitle';
import type { FiltersReportDto } from '../../dto/filters-report.dto';

function filters(partial: Partial<FiltersReportDto>): FiltersReportDto {
  return {
    search: '',
    statusCodes: [],
    contractCodes: [],
    years: [],
    platformCode: [],
    indicators: [],
    onlyOwnResults: false,
    ...partial,
  };
}

describe('buildStarRawBannerSubtitle', () => {
  it('ends with a period when no filter segments apply', () => {
    expect(buildStarRawBannerSubtitle(filters({}))).toBe(
      `${STAR_RAW_BANNER_SUBTITLE_PREFIX}.`,
    );
  });

  it('joins segments with pipe and uses display names', () => {
    const s = buildStarRawBannerSubtitle(
      filters({
        indicators: [IndicatorsEnum.CAPACITY_SHARING_FOR_DEVELOPMENT],
        years: ['2024', '2025'],
        contractCodes: ['A100'],
        platformCode: [ReportingPlatformEnum.STAR],
        statusCodes: [ResultStatusEnum.APPROVED],
        search: '  wheat  ',
        onlyOwnResults: true,
        currentUserDisplayName: 'Ana López',
      }),
    );
    expect(s).toContain(`${STAR_RAW_BANNER_SUBTITLE_PREFIX}: `);
    expect(s).toContain('Search - wheat');
    expect(s).toContain('Status - Approved');
    expect(s).toContain('Contract - A100');
    expect(s).toContain('Year - 2024, 2025');
    expect(s).toContain('Platform - STAR');
    expect(s).toContain('Indicator - Capacity Sharing for Development');
    expect(s).toContain('User - Ana López');
    expect(s.split(' | ').length).toBeGreaterThanOrEqual(7);
  });

  it('does not add User segment when onlyOwnResults without display name', () => {
    const s = buildStarRawBannerSubtitle(
      filters({ onlyOwnResults: true, currentUserDisplayName: '' }),
    );
    expect(s).toBe(`${STAR_RAW_BANNER_SUBTITLE_PREFIX}.`);
  });
});
