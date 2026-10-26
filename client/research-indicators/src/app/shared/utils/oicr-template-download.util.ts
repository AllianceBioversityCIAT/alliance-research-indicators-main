/** Portfolio 1 uses the legacy download; Portfolio 2 uses the server download. Both show the button. */
export const PORTFOLIO_1_ID = 1;
export const PORTFOLIO_2_ID = 2;

/**
 * The metadata shapes the portfolio can arrive in. `GET .../metadata` returns
 * `portfolio: { id }`; the flat keys are tolerated because other payloads use them.
 * (`alliance-alignment.component.ts` resolves the same thing for its own section.)
 */
export interface OicrTemplatePortfolioSource {
  portfolio_id?: number;
  portfolioId?: number;
  portafolio_id?: number;
  portfolio?: { id?: number };
}

export function resolvePortfolioId(source: OicrTemplatePortfolioSource | null | undefined): number | null {
  const portfolioId = Number(source?.portfolio_id ?? source?.portfolioId ?? source?.portafolio_id ?? source?.portfolio?.id);
  return Number.isFinite(portfolioId) ? portfolioId : null;
}

/**
 * Hides "Download OICR Template" unless the portfolio resolves to 1 or 2.
 * An unknown portfolio, or any portfolio other than 1 and 2, hides the button.
 */
export function isOicrTemplateDownloadHidden(source: OicrTemplatePortfolioSource | null | undefined): boolean {
  const portfolioId = resolvePortfolioId(source);
  return portfolioId !== PORTFOLIO_1_ID && portfolioId !== PORTFOLIO_2_ID;
}
