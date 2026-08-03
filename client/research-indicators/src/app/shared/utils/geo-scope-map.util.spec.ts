import { GeoScopeGeocodeTask, GeocodedLocation } from '@interfaces/geo-scope.interface';
import * as geoScopeMapUtil from './geo-scope-map.util';
import { buildGeoScopeFeatureCollection, buildGeoScopePopupHtml, buildGeoScopeResolutionPlan, getGeoScopeMaxCount } from './geo-scope-map.util';

type BuildGeoScopeGeocodeTasks = typeof buildGeoScopeResolutionPlan extends (countries: infer Countries) => unknown
  ? (countries: Countries) => GeoScopeGeocodeTask[]
  : never;

describe('geo-scope-map util', () => {
  it('should build an empty resolution plan when countries are missing', () => {
    const buildPlan = buildGeoScopeResolutionPlan as unknown as (countries?: []) => ReturnType<typeof buildGeoScopeResolutionPlan>;
    const plan = buildPlan();

    expect(plan.staticCoordinates.size).toBe(0);
    expect(plan.displayTasks).toEqual([]);
    expect(plan.geocodeTasks).toEqual([]);
  });

  it('should build static country tasks and geocoding tasks for unresolved sub-national locations', () => {
    const plan = buildGeoScopeResolutionPlan([
      {
        iso_alpha_2: 'CO',
        country_name: ' Colombia ',
        count: undefined as unknown as number,
        results_count: 7,
        top_sub_nationals: [
          { sub_national_id: 1, sub_national_name: ' Cundinamarca ', count: 4 },
          { sub_national_id: 2, sub_national_name: '   ', count: 2 }
        ]
      },
      {
        iso_alpha_2: 'XX',
        country_name: 'Atlantis',
        count: -1,
        top_sub_nationals: [{ sub_national_id: 'abc', sub_national_name: 'Capital', count: undefined as unknown as number }]
      },
      {
        iso_alpha_2: 'XX',
        country_name: 'Atlantis',
        count: 3
      },
      {
        country_name: '   ',
        count: 1
      }
    ]);

    expect(plan.staticCoordinates.get('country:colombia')).toEqual({ lng: -74.297333, lat: 4.570868 });
    expect(plan.displayTasks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ cacheKey: 'country:colombia', count: 7, countryCode: 'CO', level: 'country' }),
        expect.objectContaining({
          cacheKey: 'sub:colombia:1:cundinamarca',
          count: 4,
          fallbackSeed: 1,
          level: 'sub-national',
          query: 'Cundinamarca, Colombia'
        }),
        expect.objectContaining({ cacheKey: 'country:atlantis', count: 0, countryCode: 'XX', level: 'country' }),
        expect.objectContaining({
          cacheKey: 'sub:atlantis:abc:capital',
          count: 0,
          fallbackSeed: 'Capital'.length,
          level: 'sub-national'
        })
      ])
    );
    expect(plan.geocodeTasks.map(task => task.cacheKey)).toEqual([
      'sub:colombia:1:cundinamarca',
      'country:atlantis',
      'sub:atlantis:abc:capital'
    ]);
  });

  it('should build features from static, geocoded and jittered fallback coordinates', () => {
    const tasks: GeoScopeGeocodeTask[] = [
      createTask('country:colombia', 'country', 'Colombia', 'Colombia', 7),
      createTask('sub:colombia:1:cundinamarca', 'sub-national', 'Cundinamarca', 'Colombia', 4, 1),
      createTask('sub:colombia:2:antioquia', 'sub-national', 'Antioquia', 'Colombia', 2, 2),
      createTask('sub:colombia:3:valle', 'sub-national', 'Valle', 'Colombia', 3),
      createTask('country:atlantis', 'country', 'Atlantis', 'Atlantis', 1),
      createTask('country:colombia', 'country', 'Colombia', 'Colombia', 7)
    ];
    const staticCoordinates = new Map<string, GeocodedLocation>([
      ['country:colombia', { lng: -74.297333, lat: 4.570868 }]
    ]);
    const geocodedCoordinates = new Map<string, GeocodedLocation | null>([
      ['sub:colombia:1:cundinamarca', { lng: -74, lat: 4 }],
      ['country:atlantis', null]
    ]);

    const collection = buildGeoScopeFeatureCollection(tasks, geocodedCoordinates, staticCoordinates);

    expect(collection.type).toBe('FeatureCollection');
    expect(collection.features).toHaveLength(4);
    expect(collection.features[0].geometry.coordinates).toEqual([-74.297333, 4.570868]);
    expect(collection.features[1].geometry.coordinates).toEqual([-74, 4]);
    expect(collection.features[2].properties.name).toBe('Antioquia');
    expect(collection.features[2].geometry.coordinates).not.toEqual([-74.297333, 4.570868]);
    expect(collection.features[3].properties.name).toBe('Valle');
    expect(collection.features[3].geometry.coordinates).not.toEqual([-74.297333, 4.570868]);
  });

  it('should skip sub-national features when country fallback coordinates are unavailable', () => {
    const collection = buildGeoScopeFeatureCollection(
      [createTask('sub:atlantis:1:capital', 'sub-national', 'Capital', 'Atlantis', 1, 1)],
      new Map()
    );

    expect(collection.features).toEqual([]);
  });

  it('should calculate the max count with safe fallbacks', () => {
    expect(getGeoScopeMaxCount([])).toBe(1);
    expect(
      getGeoScopeMaxCount([
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [0, 0] },
          properties: { level: 'country', name: 'Zero', countryName: 'Zero', count: 0 }
        },
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [1, 1] },
          properties: { level: 'country', name: 'High', countryName: 'High', count: 9 }
        }
      ])
    ).toBe(9);
    expect(
      getGeoScopeMaxCount([
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [0, 0] }
        } as never
      ])
    ).toBe(1);
  });

  it('should escape popup HTML for country and sub-national properties', () => {
    expect(buildGeoScopePopupHtml({ level: 'country', name: '<Colombia & Co>', countryName: 'Colombia', count: 2 })).toContain(
      '&lt;Colombia &amp; Co&gt;'
    );
    expect(
      buildGeoScopePopupHtml({
        level: 'sub-national',
        name: 'Bobota "North"',
        countryName: "Colombia's Region",
        count: 1
      })
    ).toContain('Colombia&#39;s Region');
  });

  it('should expose display tasks through the deprecated geocode task helper', () => {
    const buildTasks = (geoScopeMapUtil as unknown as { buildGeoScopeGeocodeTasks: BuildGeoScopeGeocodeTasks })[
      'buildGeoScopeGeocodeTasks'
    ];

    expect(buildTasks([{ country_name: 'Colombia', iso_alpha_2: 'CO', count: 1 }])).toEqual([
      expect.objectContaining({ cacheKey: 'country:colombia', level: 'country' })
    ]);
  });
});

function createTask(
  cacheKey: string,
  level: GeoScopeGeocodeTask['level'],
  name: string,
  countryName: string,
  count: number,
  fallbackSeed?: number
): GeoScopeGeocodeTask {
  return {
    cacheKey,
    query: name,
    level,
    name,
    countryName,
    count,
    fallbackSeed
  };
}
