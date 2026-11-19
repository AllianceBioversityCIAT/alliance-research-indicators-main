import {
  CODE_MAX_LENGTH,
  DEFAULT_LEVELS,
  MAX_ELEMENTS_PER_PORTFOLIO,
  NAME_MAX_LENGTH,
  STAFF_SEARCH_LIMIT,
} from './strategy-framework.constants';

describe('strategy-framework constants (design 2.1, R-STF-002)', () => {
  it('caps staff search, code, name and portfolio size at the design limits', () => {
    expect(STAFF_SEARCH_LIMIT).toBe(20);
    expect(CODE_MAX_LENGTH).toBe(30);
    expect(NAME_MAX_LENGTH).toBe(255);
    expect(MAX_ELEMENTS_PER_PORTFOLIO).toBe(500);
  });

  it('seeds Performance Area, Dimension and Indicator, with the indicator flag only at depth 3', () => {
    expect(DEFAULT_LEVELS).toEqual([
      {
        depth: 1,
        name: 'Performance Area',
        plural_name: 'Performance Areas',
        short_label: 'AREA',
        is_indicator_level: 0,
      },
      {
        depth: 2,
        name: 'Dimension',
        plural_name: 'Dimensions',
        short_label: 'DIMENSION',
        is_indicator_level: 0,
      },
      {
        depth: 3,
        name: 'Indicator',
        plural_name: 'Indicators',
        short_label: 'INDICATOR',
        is_indicator_level: 1,
      },
    ]);
  });
});
