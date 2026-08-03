import { GeocodedLocation } from '@interfaces/geo-scope.interface';

export const PROJECT_DASHBOARD_DEFAULT_LIMIT = 5;

export const GEO_SCOPE_MAP_STYLE = 'mapbox://styles/mapbox/outdoors-v12';
export const GEO_SCOPE_SOURCE_ID = 'geo-scope-points';
export const GEO_SCOPE_LAYER_ID = 'geo-scope-circles';

/** Approximate country centroids [lng, lat] keyed by ISO 3166-1 alpha-2. */
export const COUNTRY_CENTROIDS: Readonly<Record<string, readonly [number, number]>> = {
  AF: [67.709953, 33.93911],
  AL: [20.168331, 41.153332],
  AR: [-63.616672, -38.416097],
  AU: [133.775136, -25.274398],
  BD: [90.356331, 23.684994],
  BE: [4.469936, 50.503887],
  BO: [-63.588653, -16.290154],
  BR: [-51.92528, -14.235004],
  CA: [-106.346771, 56.130366],
  CH: [8.227512, 46.818188],
  CL: [-71.542969, -35.675147],
  CN: [104.195397, 35.86166],
  CO: [-74.297333, 4.570868],
  CR: [-83.753428, 9.748917],
  DE: [10.451526, 51.165691],
  EC: [-78.183406, -1.831239],
  EG: [30.802498, 26.820553],
  ES: [-3.74922, 40.463667],
  ET: [40.489673, 9.145],
  FR: [2.213749, 46.227638],
  GB: [-3.435973, 55.378051],
  GH: [-1.023194, 7.946527],
  GT: [-90.230759, 15.783471],
  HN: [-86.241905, 15.199999],
  ID: [113.921327, -0.789275],
  IN: [78.96288, 20.593684],
  IT: [12.56738, 41.87194],
  JP: [138.252924, 36.204824],
  KE: [37.906193, -0.023559],
  KR: [127.766922, 35.907757],
  MX: [-102.552784, 23.634501],
  MY: [101.975766, 4.210484],
  NG: [8.675277, 9.081999],
  NI: [-85.207229, 12.865416],
  NL: [5.291266, 52.132633],
  PE: [-75.015152, -9.189967],
  PH: [121.774017, 12.879721],
  PK: [69.345116, 30.375321],
  PY: [-58.443832, -23.442503],
  SN: [-14.452362, 14.497401],
  SV: [-88.89653, 13.794185],
  TH: [100.992541, 15.870032],
  TZ: [34.888822, -6.369028],
  UG: [32.290275, 1.373333],
  US: [-95.712891, 37.09024],
  UY: [-55.765835, -32.522779],
  VE: [-66.58973, 6.42375],
  VN: [108.277199, 14.058324],
  ZA: [22.937506, -30.559482],
  ZM: [27.849332, -13.133897],
  ZW: [29.154857, -19.015438]
};

export function getCountryCentroid(isoAlpha2?: string): GeocodedLocation | null {
  const iso = isoAlpha2?.trim().toUpperCase();
  if (!iso) {
    return null;
  }

  const centroid = COUNTRY_CENTROIDS[iso];
  if (!centroid) {
    return null;
  }

  return { lng: centroid[0], lat: centroid[1] };
}
