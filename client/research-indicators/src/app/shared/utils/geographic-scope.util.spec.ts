import {
  getGeoScopeMultiselectTexts,
  mapCountriesToSubnationalSignals,
  syncSubnationalArrayFromSignals,
  isRegionsRequiredByScope,
  isCountriesRequiredByScope,
  isSubNationalRequiredByScope,
  updateCountryRegions,
  removeSubnationalRegionFromCountries,
  shouldShowSubnationalError,
  normalizeStepThree
} from './geographic-scope.util';

describe('geographic-scope.util', () => {
  it('getGeoScopeMultiselectTexts covers all scopes', () => {
    expect(getGeoScopeMultiselectTexts(1).country.label).toBeTruthy();
    expect(getGeoScopeMultiselectTexts(1).region.label).toBeTruthy();
    expect(getGeoScopeMultiselectTexts(2).region.label).toBeTruthy();
    expect(getGeoScopeMultiselectTexts(4).country.label).toBeTruthy();
    expect(getGeoScopeMultiselectTexts(5).country.label).toBeTruthy();
    expect(getGeoScopeMultiselectTexts(99).country.label).toBe('');
  });

  it('mapCountriesToSubnationalSignals: uses existing signal.set', () => {
    const set = jest.fn();
    const signalMock: any = Object.assign(() => ({ regions: [] }), { set });
    const countries: any[] = [{ isoAlpha2: 'CO', result_countries_sub_nationals: [{ id: 1 }], result_countries_sub_nationals_signal: signalMock }];
    mapCountriesToSubnationalSignals(countries as any);
    expect(set).toHaveBeenCalledWith({ regions: [{ id: 1 }] });
  });

  it('mapCountriesToSubnationalSignals: handles non-array input as empty array', () => {
    const set = jest.fn();
    const signalMock: any = Object.assign(() => ({ regions: [] }), { set });
    const countries: any[] = [{ isoAlpha2: 'BR', result_countries_sub_nationals: null, result_countries_sub_nationals_signal: signalMock }];
    mapCountriesToSubnationalSignals(countries as any);
    expect(set).toHaveBeenCalledWith({ regions: [] });
  });

  it('mapCountriesToSubnationalSignals: creates new signal when missing', () => {
    const countries: any[] = [{ isoAlpha2: 'PE', result_countries_sub_nationals: [] }];
    mapCountriesToSubnationalSignals(countries as any);
    expect(typeof countries[0].result_countries_sub_nationals_signal).toBe('function');
    expect(countries[0].result_countries_sub_nationals_signal()).toEqual({ regions: [] });
  });

  it('mapCountriesToSubnationalSignals: replaces existing signal without set', () => {
    const existingSignal: any = Object.assign(() => ({ regions: [{ id: 9 }] }));
    const countries: any[] = [
      { isoAlpha2: 'AR', result_countries_sub_nationals: [{ id: 1 }], result_countries_sub_nationals_signal: existingSignal }
    ];
    mapCountriesToSubnationalSignals(countries as any);
    expect(typeof countries[0].result_countries_sub_nationals_signal).toBe('function');
    expect(countries[0].result_countries_sub_nationals_signal).not.toBe(existingSignal);
    expect(countries[0].result_countries_sub_nationals_signal()).toEqual({ regions: [{ id: 1 }] });
  });

  it('syncSubnationalArrayFromSignals sets array from signal', () => {
    const signalMock: any = Object.assign(() => ({ regions: [{ a: 1 }] }));
    const countries: any[] = [{ isoAlpha2: 'CO', result_countries_sub_nationals_signal: signalMock }];
    syncSubnationalArrayFromSignals(countries as any);
    expect(countries[0].result_countries_sub_nationals).toEqual([{ a: 1 }]);
  });

  it('syncSubnationalArrayFromSignals handles undefined regions', () => {
    const signalMock: any = Object.assign(() => ({}));
    const countries: any[] = [{ isoAlpha2: 'CO', result_countries_sub_nationals_signal: signalMock }];
    syncSubnationalArrayFromSignals(countries as any);
    expect(countries[0].result_countries_sub_nationals).toEqual([]);
  });

  it('isRegionsRequiredByScope/isCountriesRequiredByScope/isSubNationalRequiredByScope', () => {
    expect(isRegionsRequiredByScope(2)).toBe(true);
    expect(isRegionsRequiredByScope(3)).toBe(false);
    expect(isCountriesRequiredByScope(4)).toBe(true);
    expect(isCountriesRequiredByScope(5)).toBe(true);
    expect(isCountriesRequiredByScope(1)).toBe(false);
    expect(isSubNationalRequiredByScope(5)).toBe(true);
    expect(isSubNationalRequiredByScope(4)).toBe(false);
  });

  it('updateCountryRegions updates when country exists and ignores when not found', () => {
    const countries: any[] = [
      { isoAlpha2: 'CO', result_countries_sub_nationals: [] },
      { isoAlpha2: 'PE', result_countries_sub_nationals: [] }
    ];
    updateCountryRegions(countries as any, 'CO', [{ x: 1 }] as any);
    expect(countries[0].result_countries_sub_nationals).toEqual([{ x: 1 }]);
    expect(() => updateCountryRegions(countries as any, 'BR', [{ y: 2 }] as any)).not.toThrow();
  });

  describe('removeSubnationalRegionFromCountries', () => {
    it('returns undefined when subNationalIdToRemove is undefined', () => {
      const countries: any[] = [{ isoAlpha2: 'CO' }];
      expect(removeSubnationalRegionFromCountries(countries as any, 'CO', undefined)).toBeUndefined();
    });

    it('returns undefined when target has no set on signal', () => {
      const signalMock: any = Object.assign(() => ({ regions: [{ sub_national_id: 1 }] }));
      const countries: any[] = [{ isoAlpha2: 'CO', result_countries_sub_nationals_signal: signalMock }];
      expect(removeSubnationalRegionFromCountries(countries as any, 'CO', 1)).toBeUndefined();
    });

    it('returns undefined when country is not found', () => {
      const set = jest.fn();
      const signalMock: any = Object.assign(() => ({ regions: [{ sub_national_id: 1 }] }), { set });
      const countries: any[] = [{ isoAlpha2: 'PE', result_countries_sub_nationals_signal: signalMock }];
      expect(removeSubnationalRegionFromCountries(countries as any, 'CO', 1)).toBeUndefined();
      expect(set).not.toHaveBeenCalled();
    });

    it('returns undefined when target is undefined', () => {
      expect(removeSubnationalRegionFromCountries(undefined, 'CO', 1)).toBeUndefined();
    });

    it('removes region when present and returns removed id', () => {
      const set = jest.fn();
      const signalMock: any = Object.assign(() => ({ regions: [{ sub_national_id: 1 }, { sub_national_id: 2 }] }), { set });
      const countries: any[] = [
        {
          isoAlpha2: 'CO',
          result_countries_sub_nationals_signal: signalMock,
          result_countries_sub_nationals: [{ sub_national_id: 1 }, { sub_national_id: 2 }]
        }
      ];
      const removed = removeSubnationalRegionFromCountries(countries as any, 'CO', 1);
      expect(removed).toBe(1);
      expect(set).toHaveBeenCalledWith({ regions: [{ sub_national_id: 2 }] });
      expect(countries[0].result_countries_sub_nationals).toEqual([{ sub_national_id: 2 }]);
    });

    it('handles signal with undefined regions gracefully', () => {
      const set = jest.fn();
      const signalMock: any = Object.assign(() => ({}), { set });
      const countries: any[] = [{ isoAlpha2: 'CO', result_countries_sub_nationals_signal: signalMock, result_countries_sub_nationals: [] }];
      const removed = removeSubnationalRegionFromCountries(countries as any, 'CO', 1);
      expect(removed).toBe(1);
      expect(set).toHaveBeenCalledWith({ regions: [] });
      expect(countries[0].result_countries_sub_nationals).toEqual([]);
    });
  });

  describe('shouldShowSubnationalError', () => {
    it('returns false when scope is not 5', () => {
      expect(shouldShowSubnationalError(4, [])).toBe(false);
    });

    it('returns false when scope 5 and countries empty', () => {
      expect(shouldShowSubnationalError(5, [])).toBe(false);
    });

    it('returns true when country has no signal function', () => {
      const countries: any[] = [{ isoAlpha2: 'CO' }];
      expect(shouldShowSubnationalError(5, countries as any)).toBe(true);
    });

    it('returns true when regions array is empty', () => {
      const signalMock: any = Object.assign(() => ({ regions: [] }));
      const countries: any[] = [{ isoAlpha2: 'CO', result_countries_sub_nationals_signal: signalMock }];
      expect(shouldShowSubnationalError(5, countries as any)).toBe(true);
    });

    it('returns true when signal exists but returns undefined', () => {
      const signalMock: any = Object.assign(() => undefined);
      const countries: any[] = [{ isoAlpha2: 'CO', result_countries_sub_nationals_signal: signalMock }];
      expect(shouldShowSubnationalError(5, countries as any)).toBe(true);
    });

    it('returns true when signal returns regions with length 0', () => {
      const signalMock: any = Object.assign(() => ({ regions: [] }));
      const countries: any[] = [{ isoAlpha2: 'CO', result_countries_sub_nationals_signal: signalMock }];
      expect(shouldShowSubnationalError(5, countries as any)).toBe(true);
    });

    it('returns false when countries is undefined (nullish coalescing path)', () => {
      expect(shouldShowSubnationalError(5, undefined)).toBe(false);
    });

    it('returns false when at least one country has regions', () => {
      const signalMock: any = Object.assign(() => ({ regions: [{ id: 1 }] }));
      const countries: any[] = [{ isoAlpha2: 'CO', result_countries_sub_nationals_signal: signalMock }];
      expect(shouldShowSubnationalError(5, countries as any)).toBe(false);
    });

    it('returns false when signal returns regions with length greater than 0', () => {
      const signalMock: any = Object.assign(() => ({ regions: [{ id: 1 }, { id: 2 }] }));
      const countries: any[] = [{ isoAlpha2: 'CO', result_countries_sub_nationals_signal: signalMock }];
      expect(shouldShowSubnationalError(5, countries as any)).toBe(false);
    });

    it('returns true when signal returns object with undefined regions', () => {
      const signalMock: any = Object.assign(() => ({ regions: undefined }));
      const countries: any[] = [{ isoAlpha2: 'CO', result_countries_sub_nationals_signal: signalMock }];
      expect(shouldShowSubnationalError(5, countries as any)).toBe(true);
    });
  });

  describe('normalizeStepThree', () => {
    it('returns empty countries and regions when geo_scope_id is 1 (global)', () => {
      const step = { geo_scope_id: 1, countries: [{ isoAlpha2: 'CO' }], regions: [{ region_id: 1 }], comment_geo_scope: null };
      const out = normalizeStepThree(step);
      expect(out.countries).toEqual([]);
      expect(out.regions).toEqual([]);
      expect(out.geo_scope_id).toBe(1);
      expect(out.comment_geo_scope).toBe('');
    });

    it('filters countries: keeps only items with non-empty isoAlpha2', () => {
      const step = {
        geo_scope_id: 2,
        countries: [
          { isoAlpha2: 'CO' },
          { isoAlpha2: '' },
          { isoAlpha2: '  ' },
          { isoAlpha2: null },
          {},
          { isoAlpha2: 'PE' }
        ],
        regions: [],
        comment_geo_scope: 'x'
      };
      const out = normalizeStepThree(step);
      expect(out.countries).toHaveLength(2);
      expect(out.countries).toEqual([{ isoAlpha2: 'CO' }, { isoAlpha2: 'PE' }]);
      expect(out.comment_geo_scope).toBe('x');
    });

    it('filters regions: keeps only items with non-null region_id', () => {
      const step = {
        geo_scope_id: 2,
        countries: [],
        regions: [{ region_id: 1 }, { region_id: null }, {}, { region_id: 2 }],
        comment_geo_scope: null
      };
      const out = normalizeStepThree(step);
      expect(out.regions).toHaveLength(2);
      expect(out.regions).toEqual([{ region_id: 1 }, { region_id: 2 }]);
    });

    it('handles missing or non-array countries/regions', () => {
      const step = { geo_scope_id: 3, comment_geo_scope: '' };
      const out = normalizeStepThree(step);
      expect(out.countries).toEqual([]);
      expect(out.regions).toEqual([]);
      expect(out.geo_scope_id).toBe(3);
    });

    it('handles null stepThree and undefined geo_scope_id', () => {
      const step = { countries: [], regions: [], comment_geo_scope: null };
      const out = normalizeStepThree(step);
      expect(out.geo_scope_id).toBeUndefined();
      expect(out.countries).toEqual([]);
      expect(out.regions).toEqual([]);
      expect(out.comment_geo_scope).toBe('');
    });
  });
});
