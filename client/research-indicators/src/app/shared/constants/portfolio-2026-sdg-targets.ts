/** Clarisa SDG target codes offered on 2026 OICRs. Not lever-dependent. */
export const PORTFOLIO_2026_SDG_TARGET_CODES = [
  '1.1',
  '1.4',
  '1.5',
  '2.2',
  '2.3',
  '2.4',
  '2.5',
  '4.4',
  '12.1',
  '12.6',
  '13.1',
  '13.2',
  '13.3',
  '15.3'
] as const;

export const isPortfolio2026SdgTargetCode = (code: string | null | undefined): boolean =>
  PORTFOLIO_2026_SDG_TARGET_CODES.includes(String(code ?? '') as (typeof PORTFOLIO_2026_SDG_TARGET_CODES)[number]);

/** Portfolio 2025 levers in SDG Management: "Lever N" and "Other". Research areas have neither prefix. */
export const isPortfolio2025LeverName = (shortName: string | null | undefined): boolean => {
  const name = (shortName ?? '').trim();
  return /^lever\s+\d+/i.test(name) || /^other$/i.test(name);
};
