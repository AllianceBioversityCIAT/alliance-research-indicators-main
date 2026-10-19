import { lastPfmScope, rememberPfmScope } from './pfm-last-scope.util';

describe('pfm-last-scope.util', () => {
  beforeEach(() => sessionStorage.clear());
  afterEach(() => jest.restoreAllMocks());

  it('returns null when nothing is stored', () => {
    expect(lastPfmScope()).toBeNull();
  });

  it('round-trips mine and all', () => {
    rememberPfmScope('all');
    expect(lastPfmScope()).toBe('all');
    rememberPfmScope('mine');
    expect(lastPfmScope()).toBe('mine');
  });

  it('stores under the namespaced key', () => {
    rememberPfmScope('all');
    expect(sessionStorage.getItem('ari.pfm.lastScope')).toBe('all');
  });

  it('an invalid stored value reads as null', () => {
    sessionStorage.setItem('ari.pfm.lastScope', 'everyone');
    expect(lastPfmScope()).toBeNull();
  });

  it('never throws when sessionStorage is blocked', () => {
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(() => rememberPfmScope('all')).not.toThrow();
    expect(lastPfmScope()).toBeNull();
  });
});
