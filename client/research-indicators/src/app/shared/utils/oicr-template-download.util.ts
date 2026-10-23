/** Portfolio 2 — the only portfolio that shows the OICR template download. */
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
 * Hides "Download OICR Template" unless the portfolio resolves to 2.
 * An unknown portfolio hides the button — the 2025 fallback that showed it is retired.
 */
export function isOicrTemplateDownloadHidden(source: OicrTemplatePortfolioSource | null | undefined): boolean {
  return resolvePortfolioId(source) !== PORTFOLIO_2_ID;
}
