import { PORTFOLIO_2_ID, isOicrTemplateDownloadHidden, resolvePortfolioId } from './oicr-template-download.util';

describe('oicr-template-download.util', () => {
  describe('resolvePortfolioId', () => {
    it.each([
      [{ portfolio_id: 2 }, 2],
      [{ portfolioId: 2 }, 2],
      [{ portafolio_id: 2 }, 2],
      [{ portfolio: { id: 2 } }, 2],
      [{ portfolio_id: 1, portfolio: { id: 2 } }, 1],
      [{}, null],
      [undefined, null],
      [null, null],
      [{ portfolio: {} }, null]
    ])('resolves %p to %p', (source, expected) => {
      expect(resolvePortfolioId(source as never)).toBe(expected);
    });
  });

  describe('isOicrTemplateDownloadHidden', () => {
    it('shows the download for Portfolio 2', () => {
      expect(isOicrTemplateDownloadHidden({ portfolio: { id: PORTFOLIO_2_ID } })).toBe(false);
    });

    it.each([{ portfolio: { id: 1 } }, { portfolio_id: 3 }, {}, undefined, null])('hides the download for %p', source => {
      expect(isOicrTemplateDownloadHidden(source as never)).toBe(true);
    });
  });
});
