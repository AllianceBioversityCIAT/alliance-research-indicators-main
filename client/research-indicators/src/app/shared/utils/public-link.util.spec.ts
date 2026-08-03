import { openPublicLink } from './public-link.util';

describe('public-link.util', () => {
  it('openPublicLink should open trimmed link in a new tab', () => {
    const openSpy = jest.spyOn(globalThis, 'open').mockImplementation(() => null);
    openPublicLink('  https://hdl.handle.net/10568/1  ');
    expect(openSpy).toHaveBeenCalledWith('https://hdl.handle.net/10568/1', '_blank', 'noopener,noreferrer');
    openSpy.mockRestore();
  });

  it('openPublicLink should no-op when link is empty', () => {
    const openSpy = jest.spyOn(globalThis, 'open').mockImplementation(() => null);
    openPublicLink('');
    openPublicLink(null);
    expect(openSpy).not.toHaveBeenCalled();
    openSpy.mockRestore();
  });
});
