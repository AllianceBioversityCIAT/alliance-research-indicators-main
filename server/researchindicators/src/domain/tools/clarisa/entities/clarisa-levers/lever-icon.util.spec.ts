import { resolveLeverIconUrl } from './lever-icon.util';

describe('resolveLeverIconUrl', () => {
  const bucketUrl = 'https://bucket.example';

  it('should resolve icon from short_name', () => {
    expect(resolveLeverIconUrl(bucketUrl, { shortName: 'Lever 3' })).toBe(
      'https://bucket.example/images/levers/L3-Climate-Action_COLOR.png',
    );
  });

  it('should resolve icon from full_name prefix', () => {
    expect(
      resolveLeverIconUrl(bucketUrl, {
        fullName: 'Lever 3: Climate Action',
      }),
    ).toBe('https://bucket.example/images/levers/L3-Climate-Action_COLOR.png');
  });

  it('should resolve icon from lever_id fallback', () => {
    expect(resolveLeverIconUrl(bucketUrl, { leverId: 4 })).toBe(
      'https://bucket.example/images/levers/L4-Agrobiodiversity_COLOR.png',
    );
  });

  it('should return null when bucket url is missing', () => {
    expect(resolveLeverIconUrl(undefined, { shortName: 'Lever 3' })).toBeNull();
  });

  it('should return null for unknown levers', () => {
    expect(
      resolveLeverIconUrl(bucketUrl, { shortName: 'Unknown lever' }),
    ).toBeNull();
  });
});
