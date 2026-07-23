import { getCountryCentroid } from './country-centroids.constants';

describe('country-centroids constants', () => {
  it('should return null when the ISO code is missing or blank', () => {
    expect(getCountryCentroid()).toBeNull();
    expect(getCountryCentroid('   ')).toBeNull();
  });

  it('should return null for an unknown ISO code', () => {
    expect(getCountryCentroid('XX')).toBeNull();
  });

  it('should return a centroid for a known ISO code after trimming and normalizing it', () => {
    expect(getCountryCentroid(' co ')).toEqual({ lng: -74.297333, lat: 4.570868 });
  });
});
