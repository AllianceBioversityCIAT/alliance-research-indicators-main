import { buildResultLink } from './result-link.util';

describe('buildResultLink', () => {
  it('opens the latest snapshot version for status 6 with snapshot years', () => {
    expect(buildResultLink({ platform_code: 'STAR', result_official_code: 12, result_status_id: 6, snapshot_years: [2024, 2025] })).toEqual({
      commands: ['/result', 'STAR-12', 'general-information'],
      queryParams: { version: 2025 }
    });
  });

  it('uses the plain link for status 6 with no snapshot years', () => {
    expect(buildResultLink({ platform_code: 'STAR', result_official_code: 12, result_status_id: 6, snapshot_years: [] })).toEqual({
      commands: ['/result', 'STAR-12'],
      queryParams: {}
    });
  });

  it('uses the plain link for status 6 when snapshot_years is missing', () => {
    expect(buildResultLink({ platform_code: 'STAR', result_official_code: 12, result_status_id: 6 }).commands).toEqual(['/result', 'STAR-12']);
  });

  it('uses the plain link for other statuses even with snapshot years', () => {
    expect(buildResultLink({ platform_code: 'STAR', result_official_code: 12, result_status_id: 4, snapshot_years: [2024] })).toEqual({
      commands: ['/result', 'STAR-12'],
      queryParams: {}
    });
  });

  it('prefixes the code with a non-STAR platform', () => {
    expect(buildResultLink({ platform_code: 'TIP', result_official_code: 7, result_status_id: 6, snapshot_years: [2025] })).toEqual({
      commands: ['/result', 'TIP-7', 'general-information'],
      queryParams: { version: 2025 }
    });
  });
});
