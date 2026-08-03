import {
  normalizeLeverSdgTargetMappingList,
  normalizeLeverSdgTargetMappingRow
} from './lever-sdg-target.interface';

describe('normalizeLeverSdgTargetMappingRow', () => {
  it('maps nested GET lever-sdg-targets row', () => {
    const row = {
      id: 32,
      lever: { id: 1, short_name: 'Lever 1', full_name: 'Lever 1: Food' },
      sdg_target: { id: 1, sdg_target: 'Poverty', sdg_target_code: '1.1' }
    };
    expect(normalizeLeverSdgTargetMappingRow(row)).toEqual({
      id: 32,
      lever_id: 1,
      sdg_target_id: 1,
      sdg_target: 'Poverty',
      sdg_target_code: '1.1'
    });
  });

  it('maps flat row with lever_id and sdg_target_id', () => {
    const row = { id: 7, lever_id: 2, sdg_target_id: 3 };
    expect(normalizeLeverSdgTargetMappingRow(row)).toEqual({
      id: 7,
      lever_id: 2,
      sdg_target_id: 3,
      sdg_target: undefined,
      sdg_target_code: undefined
    });
  });

  it('maps flat row with string ids', () => {
    const row = { id: '7', lever_id: '2', sdg_target_id: '3' };
    const out = normalizeLeverSdgTargetMappingRow(row);
    expect(out).toEqual({
      id: 7,
      lever_id: 2,
      sdg_target_id: 3,
      sdg_target: undefined,
      sdg_target_code: undefined
    });
  });

  it('returns null for invalid input', () => {
    expect(normalizeLeverSdgTargetMappingRow(null)).toBeNull();
    expect(normalizeLeverSdgTargetMappingRow({})).toBeNull();
  });

  it('maps flat row with optional clarisa_sdg', () => {
    const row = {
      id: 1,
      lever_id: 1,
      sdg_target_id: 2,
      clarisa_sdg: { id: 1, short_name: 'SDG1' }
    };
    expect(normalizeLeverSdgTargetMappingRow(row)).toEqual({
      id: 1,
      lever_id: 1,
      sdg_target_id: 2,
      sdg_target: undefined,
      sdg_target_code: undefined,
      clarisa_sdg: { id: 1, short_name: 'SDG1' }
    });
  });

  it('prefers flat when flat parse succeeds even with nested fields', () => {
    const row = { id: 2, lever_id: 1, sdg_target_id: 3, sdg_target: 't', sdg_target_code: '1' };
    expect(normalizeLeverSdgTargetMappingRow(row)!.sdg_target).toBe('t');
  });

  it('uses nested when flat fails; id 0 is valid in nested', () => {
    const row = {
      id: 0,
      lever: { id: 1, short_name: 'L' },
      sdg_target: { id: 2, sdg_target: 't', sdg_target_code: '1' }
    };
    expect(normalizeLeverSdgTargetMappingRow(row)).toEqual({
      id: 0,
      lever_id: 1,
      sdg_target_id: 2,
      sdg_target: 't',
      sdg_target_code: '1'
    });
  });

  it('returns null for nested when lever is not an object', () => {
    expect(
      normalizeLeverSdgTargetMappingRow({ id: 1, lever: 'x', sdg_target: { id: 1, sdg_target: 'a', sdg_target_code: '1' } })
    ).toBeNull();
  });

  it('returns null for nested when sdg_target is not an object', () => {
    expect(
      normalizeLeverSdgTargetMappingRow({ id: 1, lever: { id: 1 }, sdg_target: 1 })
    ).toBeNull();
  });

  it('returns null for nested when lever id is not positive', () => {
    expect(
      normalizeLeverSdgTargetMappingRow({
        id: 1,
        lever: { id: 0 },
        sdg_target: { id: 1, sdg_target: 'a', sdg_target_code: '1' }
      })
    ).toBeNull();
  });

  it('returns null for nested when sdg target id is not positive', () => {
    expect(
      normalizeLeverSdgTargetMappingRow({
        id: 1,
        lever: { id: 1 },
        sdg_target: { id: 0, sdg_target: 'a', sdg_target_code: '1' }
      })
    ).toBeNull();
  });

  it('returns null when flat sdg_target_id is empty string', () => {
    expect(normalizeLeverSdgTargetMappingRow({ id: 1, lever_id: 1, sdg_target_id: '' })).toBeNull();
  });

  it('returns null in nested when sdg target id is NaN', () => {
    expect(
      normalizeLeverSdgTargetMappingRow({
        id: 1,
        lever: { id: 1 },
        sdg_target: { id: Number.NaN, sdg_target: 'a', sdg_target_code: '1' }
      })
    ).toBeNull();
  });

  it('returns null in nested when lever id is negative', () => {
    expect(
      normalizeLeverSdgTargetMappingRow({
        id: 1,
        lever: { id: -1 },
        sdg_target: { id: 1, sdg_target: 'a', sdg_target_code: '1' }
      })
    ).toBeNull();
  });
});

describe('normalizeLeverSdgTargetMappingList', () => {
  it('filters and maps an array', () => {
    const data = [
      { id: 1, lever: { id: 1 }, sdg_target: { id: 10, sdg_target: 'a', sdg_target_code: '1' } },
      null,
      { id: 2, lever_id: 2, sdg_target_id: 20 }
    ];
    const out = normalizeLeverSdgTargetMappingList(data);
    expect(out).toHaveLength(2);
    expect(out[0].sdg_target_id).toBe(10);
    expect(out[1].lever_id).toBe(2);
  });

  it('returns empty array when not an array', () => {
    expect(normalizeLeverSdgTargetMappingList(null)).toEqual([]);
    expect(normalizeLeverSdgTargetMappingList({})).toEqual([]);
  });
});
