import {
  GEO_ISO_EXCEPTIONS_MAP,
  getGeometryValidIsoSet,
  buildGeoChoroplethSeriesData,
  buildGeoChoroplethTableModel,
  getGeoChoroplethMaxCount
} from './geo-choropleth.util';
import { CLARISA_COUNTRY_CODES_FIXTURE } from '../../testing/fixtures/clarisa-country-codes.fixture';
import worldCountriesGeoJson from '../../pages/platform/pages/project-detail/components/geo-scope-map/world-countries.geo.json';
import { GeoScopeCountry } from '@interfaces/geo-scope.interface';

describe('geo-choropleth.util', () => {
  describe('getGeometryValidIsoSet', () => {
    it('should return an empty set for invalid or empty geoJson', () => {
      expect(getGeometryValidIsoSet(null).size).toBe(0);
      expect(getGeometryValidIsoSet(undefined).size).toBe(0);
      expect(getGeometryValidIsoSet({}).size).toBe(0);
      expect(getGeometryValidIsoSet({ features: [] }).size).toBe(0);
    });

    it('should extract valid ISO_A2 and ISO_A2_EH codes, excluding -99', () => {
      const mockGeo = {
        type: 'FeatureCollection',
        features: [
          { type: 'Feature', properties: { ISO_A2: 'CO', ISO_A2_EH: 'CO' }, geometry: null },
          { type: 'Feature', properties: { ISO_A2: '-99', ISO_A2_EH: 'FR' }, geometry: null },
          { type: 'Feature', properties: { ISO_A2: '-99', ISO_A2_EH: '-99' }, geometry: null }
        ]
      };
      const set = getGeometryValidIsoSet(mockGeo);
      expect(set.has('CO')).toBe(true);
      expect(set.has('FR')).toBe(true);
      expect(set.has('-99')).toBe(false);
      expect(set.size).toBe(2);
    });
  });

  describe('buildGeoChoroplethSeriesData', () => {
    const mockValidIsoSet = new Set(['CO', 'KE', 'VN', 'FR', 'NO']);

    it('should extract ISO alpha-2 codes and map count correctly', () => {
      const input: GeoScopeCountry[] = [
        { iso_alpha_2: 'CO', country_name: 'Colombia', count: 12 },
        { iso_alpha_2: 'ke', country_name: 'Kenya', count: 5 }
      ];
      const result = buildGeoChoroplethSeriesData(input, mockValidIsoSet);
      expect(result).toEqual([
        { name: 'CO', value: 12 },
        { name: 'KE', value: 5 }
      ]);
    });

    it('should exclude country when code is absent from geometry (e.g., HK) without error (R-GEO-003 AC.1)', () => {
      const input: GeoScopeCountry[] = [
        { iso_alpha_2: 'HK', country_name: 'Hong Kong', count: 3 },
        { iso_alpha_2: 'CO', country_name: 'Colombia', count: 10 }
      ];
      const result = buildGeoChoroplethSeriesData(input, mockValidIsoSet);
      expect(result).toEqual([{ name: 'CO', value: 10 }]);
    });

    it('should exclude row with iso_alpha_2: undefined without error (R-GEO-003 AC.3)', () => {
      const input: GeoScopeCountry[] = [
        { iso_alpha_2: undefined, country_name: 'Unknown', count: 1 },
        { country_name: 'No ISO', count: 2 } as GeoScopeCountry,
        { iso_alpha_2: 'CO', country_name: 'Colombia', count: 7 }
      ];
      const result = buildGeoChoroplethSeriesData(input, mockValidIsoSet);
      expect(result).toEqual([{ name: 'CO', value: 7 }]);
    });

    it('should map France (FR) and Norway (NO) correctly', () => {
      const input: GeoScopeCountry[] = [
        { iso_alpha_2: 'FR', country_name: 'France', count: 4 },
        { iso_alpha_2: 'NO', country_name: 'Norway', count: 2 }
      ];
      const result = buildGeoChoroplethSeriesData(input, mockValidIsoSet);
      expect(result).toEqual([
        { name: 'FR', value: 4 },
        { name: 'NO', value: 2 }
      ]);
    });

    it('should return all valid mapped codes when validIsoSet is omitted', () => {
      const input: GeoScopeCountry[] = [
        { iso_alpha_2: 'CO', country_name: 'Colombia', count: 1 },
        { iso_alpha_2: 'XX', country_name: 'Unknown Land', count: 2 }
      ];
      const result = buildGeoChoroplethSeriesData(input);
      expect(result).toEqual([
        { name: 'CO', value: 1 },
        { name: 'XX', value: 2 }
      ]);
    });
  });

  describe('buildGeoChoroplethTableModel', () => {
    it('should contain caption, headers, and ALL countries (matched and unmatched) (R-GEO-005 AC.1)', () => {
      const input: GeoScopeCountry[] = [
        { iso_alpha_2: 'CO', country_name: 'Colombia', count: 12 },
        { iso_alpha_2: 'HK', country_name: 'Hong Kong', count: 3 },
        { iso_alpha_2: undefined, country_name: 'Unknown Territory', count: 1 }
      ];
      const model = buildGeoChoroplethTableModel(input);
      expect(model.caption).toBe('Geographic scope results by country');
      expect(model.headers).toEqual(['Country', 'Results']);
      expect(model.rows).toEqual([
        ['Colombia', 12],
        ['Hong Kong', 3],
        ['Unknown Territory', 1]
      ]);
    });

    it('should handle empty input safely', () => {
      const model = buildGeoChoroplethTableModel([]);
      expect(model.rows).toEqual([]);
    });
  });

  describe('getGeoChoroplethMaxCount', () => {
    it('should return at least 1 for empty or 0-count lists', () => {
      expect(getGeoChoroplethMaxCount([])).toBe(1);
      expect(getGeoChoroplethMaxCount([{ country_name: 'A', count: 0 }])).toBe(1);
    });

    it('should return max count from countries', () => {
      const input: GeoScopeCountry[] = [
        { country_name: 'A', count: 2 },
        { country_name: 'B', count: 15 },
        { country_name: 'C', count: 7 }
      ];
      expect(getGeoChoroplethMaxCount(input)).toBe(15);
    });

    it('should maintain monotonicity as counts increase (R-GEO-002)', () => {
      const list1: GeoScopeCountry[] = [{ country_name: 'A', count: 5 }];
      const list2: GeoScopeCountry[] = [{ country_name: 'A', count: 5 }, { country_name: 'B', count: 10 }];
      const list3: GeoScopeCountry[] = [{ country_name: 'A', count: 5 }, { country_name: 'B', count: 20 }];
      expect(getGeoChoroplethMaxCount(list1)).toBeLessThanOrEqual(getGeoChoroplethMaxCount(list2));
      expect(getGeoChoroplethMaxCount(list2)).toBeLessThanOrEqual(getGeoChoroplethMaxCount(list3));
    });
  });

  describe('CLARISA Country Codes Coverage Test (R-GEO-003 AC.2)', () => {
    const validGeometryIsoSet = getGeometryValidIsoSet(worldCountriesGeoJson);

    // Known microstates and small territories not represented as separate 1:110m land polygons
    const KNOWN_UNMAPPED_MICROSTATES = new Set([
      'AD', 'AG', 'AI', 'AS', 'AW', 'AX', 'BB', 'BH', 'BL', 'BM', 'BQ', 'BV', 'CC', 'CK', 'CV',
      'CW', 'CX', 'DM', 'FM', 'FO', 'GD', 'GF', 'GG', 'GI', 'GP', 'GS', 'GU', 'HK', 'HM', 'IM',
      'IO', 'JE', 'KI', 'KM', 'KN', 'KY', 'LC', 'LI', 'MC', 'MF', 'MH', 'MO', 'MP', 'MQ', 'MS',
      'MT', 'MU', 'MV', 'NF', 'NR', 'NU', 'PF', 'PM', 'PN', 'PW', 'RE', 'SC', 'SG', 'SH', 'SJ',
      'SM', 'ST', 'SX', 'TC', 'TK', 'TO', 'TV', 'UM', 'VA', 'VC', 'VG', 'VI', 'WF', 'WS', 'YT'
    ]);

    function resolvesOrKnown(code: string): boolean {
      const mapped = GEO_ISO_EXCEPTIONS_MAP[code] ?? code;
      return validGeometryIsoSet.has(mapped) || KNOWN_UNMAPPED_MICROSTATES.has(code);
    }

    it('should verify every alpha-2 code in CLARISA_COUNTRY_CODES_FIXTURE resolves or is known unmapped', () => {
      const unresolvable: string[] = [];
      for (const code of CLARISA_COUNTRY_CODES_FIXTURE) {
        if (!resolvesOrKnown(code)) {
          unresolvable.push(code);
        }
      }
      expect(unresolvable).toEqual([]);
    });

    it('should FAIL when a fake unmapped code is added (proven able to fail - K-004)', () => {
      const fakeCode = 'XX';
      expect(resolvesOrKnown(fakeCode)).toBe(false);
    });
  });
});
