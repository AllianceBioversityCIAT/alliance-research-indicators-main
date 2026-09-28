/** Clarisa `sdg_target_code` values allowed on 2026 OICRs. */
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
  '15.3',
] as const;

export const PORTFOLIO_2026_SDG_TARGET_CODE_SET = new Set<string>(
  PORTFOLIO_2026_SDG_TARGET_CODES,
);
