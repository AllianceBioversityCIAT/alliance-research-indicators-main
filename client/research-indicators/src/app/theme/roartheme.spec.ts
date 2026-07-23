jest.mock('@primeng/themes/aura', () => ({}), { virtual: true });
jest.mock('@primeng/themes', () => ({ definePreset: jest.fn((a, b) => ({ preset: b })) }), { virtual: true });

import { MyPreset, appConfig } from './roartheme';

describe('roartheme', () => {
  it('should export MyPreset', () => {
    expect(MyPreset).toBeDefined();
  });

  it('should export appConfig', () => {
    expect(appConfig).toBeDefined();
    expect(appConfig.providers).toBeInstanceOf(Array);
  });
});
