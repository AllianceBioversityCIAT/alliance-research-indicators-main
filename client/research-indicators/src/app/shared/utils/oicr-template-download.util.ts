/** Portfolio 2 — the one whose OICR template is not available yet. */
export const PORTFOLIO_2_ID = 2;

/** Re-enable when an OICR template exists for Portfolio 2. */
export const OICR_TEMPLATE_DOWNLOAD_PORTFOLIO_2_ENABLED = false;

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
 * Hides "Download OICR Template" for Portfolio 2 results only. An unknown portfolio
 * keeps the button — the download is the long-standing behaviour, so it is what an
 * unresolved metadata payload falls back to.
 */
export function isOicrTemplateDownloadHidden(source: OicrTemplatePortfolioSource | null | undefined): boolean {
  return !OICR_TEMPLATE_DOWNLOAD_PORTFOLIO_2_ENABLED && resolvePortfolioId(source) === PORTFOLIO_2_ID;
}
