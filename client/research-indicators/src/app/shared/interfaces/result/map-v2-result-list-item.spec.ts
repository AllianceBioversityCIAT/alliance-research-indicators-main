import { mapV2ResultListItemToResult, normalizeSnapshotYears, V2ResultListItem } from './map-v2-result-list-item';

describe('mapV2ResultListItemToResult', () => {
  const minimal: V2ResultListItem = {
    result_id: 1,
    result_official_code: 'R1',
    platform_code: 'STAR',
    title: 'T',
    indicator_id: 2
  };

  it('maps a minimal row with defaults', () => {
    const r = mapV2ResultListItemToResult(minimal);
    expect(r.result_official_code).toBe('R1');
    expect(r.is_active).toBe(false);
    expect(r.snapshot_years).toEqual([]);
    expect(r.result_status).toBeUndefined();
    expect(r.result_contracts).toBeUndefined();
    expect(r.contract_id).toBeUndefined();
    expect(r.contract_description).toBeUndefined();
    expect(r.created_by_user).toBeUndefined();
    expect(r.result_levers).toBeUndefined();
  });

  it('normalizes snapshot_years when not an array', () => {
    const r = mapV2ResultListItemToResult({ ...minimal, snapshot_years: null as unknown as number[] });
    expect(r.snapshot_years).toEqual([]);
  });

  it('keeps snapshot_years when array', () => {
    const r = mapV2ResultListItemToResult({ ...minimal, snapshot_years: [2023, 2024] });
    expect(r.snapshot_years).toEqual([2023, 2024]);
  });

  it('parses snapshot_years when API sends comma-separated string', () => {
    const r = mapV2ResultListItemToResult({ ...minimal, snapshot_years: '2026,2025' });
    expect(r.snapshot_years).toEqual([2026, 2025]);
  });

  it('sets is_active true for boolean true or numeric 1', () => {
    expect(mapV2ResultListItemToResult({ ...minimal, is_active: true }).is_active).toBe(true);
    expect(mapV2ResultListItemToResult({ ...minimal, is_active: 1 }).is_active).toBe(true);
    expect(mapV2ResultListItemToResult({ ...minimal, is_active: false }).is_active).toBe(false);
  });

  it('maps status when status_id is set', () => {
    const r = mapV2ResultListItemToResult({
      ...minimal,
      status_id: 9,
      status_name: 'S',
      status_description: 'D',
      status_config: { color: 'blue' } as any
    });
    expect(r.result_status).toEqual({
      result_status_id: 9,
      name: 'S',
      description: 'D',
      config: { color: 'blue' }
    });
  });

  it('maps indicators when indicator_name is set', () => {
    const r = mapV2ResultListItemToResult({ ...minimal, indicator_name: 'Ind' });
    expect(r.indicators).toEqual({ name: 'Ind', icon_src: '' });
  });

  it('maps contract when contract_id is set', () => {
    const r = mapV2ResultListItemToResult({ ...minimal, contract_id: 'C1' });
    expect(r.contract_id).toBe('C1');
    expect(r.contract_description).toBeUndefined();
    expect(r.result_contracts).toEqual({ contract_id: 'C1', is_primary: 1 });
  });

  it('maps flat contract_id and contract_description from v2 row', () => {
    const r = mapV2ResultListItemToResult({
      ...minimal,
      contract_id: 'A1703',
      contract_description: 'CGIAR Fund-SP06 - Climate Action'
    });
    expect(r.contract_id).toBe('A1703');
    expect(r.contract_description).toBe('CGIAR Fund-SP06 - Climate Action');
    expect(r.result_contracts).toEqual({ contract_id: 'A1703', is_primary: 1 });
  });

  it('maps created_by_user when first or last name is non-empty', () => {
    expect(
      mapV2ResultListItemToResult({ ...minimal, create_user_first_name: ' A ' }).created_by_user
    ).toEqual({ first_name: 'A', last_name: '' });
    expect(
      mapV2ResultListItemToResult({ ...minimal, create_user_last_name: ' B ' }).created_by_user
    ).toEqual({ first_name: '', last_name: 'B' });
  });

  it('omits created_by_user when names are blank or null', () => {
    expect(
      mapV2ResultListItemToResult({ ...minimal, create_user_first_name: '   ', create_user_last_name: null }).created_by_user
    ).toBeUndefined();
    expect(mapV2ResultListItemToResult({ ...minimal, create_user_first_name: null, create_user_last_name: null }).created_by_user).toBeUndefined();
  });

  it('maps lever_name to result_levers', () => {
    const r = mapV2ResultListItemToResult({ ...minimal, lever_name: 'L1' });
    expect(r.result_levers).toEqual([{ is_primary: 1, lever: { short_name: 'L1' } }]);
  });

  it('coerces result_official_code to string', () => {
    expect(mapV2ResultListItemToResult({ ...minimal, result_official_code: 99 }).result_official_code).toBe('99');
  });

  it('defaults result_id to 0 when missing', () => {
    const { result_id: _, ...rest } = minimal;
    const r = mapV2ResultListItemToResult(rest as V2ResultListItem);
    expect(r.result_id).toBe(0);
  });

  it('maps status when status_id is 0', () => {
    const r = mapV2ResultListItemToResult({ ...minimal, status_id: 0, status_name: 'Zero' });
    expect(r.result_status?.result_status_id).toBe(0);
  });

  it('does not map contract when contract_id is empty string', () => {
    const r = mapV2ResultListItemToResult({ ...minimal, contract_id: '' });
    expect(r.result_contracts).toBeUndefined();
    expect(r.contract_id).toBe('');
  });

  it('does not add levers when lever_name is empty string', () => {
    const r = mapV2ResultListItemToResult({ ...minimal, lever_name: '' });
    expect((r as any).result_levers).toBeUndefined();
  });

  it('normalizes snapshot_years when value is a non-array object', () => {
    const r = mapV2ResultListItemToResult({ ...minimal, snapshot_years: {} as unknown as number[] });
    expect(r.snapshot_years).toEqual([]);
  });

  it('applies nullish defaults when platform, title, code, result_id, and indicator_id are missing', () => {
    const r = mapV2ResultListItemToResult({} as V2ResultListItem);
    expect(r.result_id).toBe(0);
    expect(r.result_platform).toBe('');
    expect(r.platform_code).toBe('');
    expect(r.title).toBe('');
    expect(r.result_official_code).toBe('');
    expect(r.indicator_id).toBe(0);
  });

  it('maps public_link from v2 list row', () => {
    const url = 'https://sharepoint.example.com/doc';
    const r = mapV2ResultListItemToResult({ ...minimal, public_link: url });
    expect(r.public_link).toBe(url);
  });
});

describe('normalizeSnapshotYears', () => {
  it('returns empty for null, undefined, non-array objects, and blank string', () => {
    expect(normalizeSnapshotYears(null)).toEqual([]);
    expect(normalizeSnapshotYears(undefined)).toEqual([]);
    expect(normalizeSnapshotYears({})).toEqual([]);
    expect(normalizeSnapshotYears('')).toEqual([]);
    expect(normalizeSnapshotYears('   ')).toEqual([]);
  });

  it('parses comma-separated years string', () => {
    expect(normalizeSnapshotYears('2026,2025')).toEqual([2026, 2025]);
    expect(normalizeSnapshotYears(' 2024 , 2023 ')).toEqual([2024, 2023]);
  });

  it('normalizes numeric array and string elements', () => {
    expect(normalizeSnapshotYears([2023, 2024])).toEqual([2023, 2024]);
    expect(normalizeSnapshotYears(['2023', '2024'])).toEqual([2023, 2024]);
  });
});
