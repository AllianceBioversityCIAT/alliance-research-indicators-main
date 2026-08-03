/** AGRESSO funding_type short codes — keep in sync with backend isBilateralTagTarget. */
export const BILATERAL_FUNDING_CODES = ['BLR', 'BILATERAL'] as const;

export type BilateralFundingCode = (typeof BILATERAL_FUNDING_CODES)[number];

export function isBilateralFundingType(fundingType: string | null | undefined): boolean {
  const normalized = fundingType?.trim().toUpperCase();
  if (!normalized) return false;
  return (BILATERAL_FUNDING_CODES as readonly string[]).includes(normalized);
}

export interface PooledFundingContractRef {
  is_active?: boolean;
}

/** Mirrors backend: bilateral tag is blocked when an active pooled-funding row exists. */
export function hasActivePooledFundingContract(
  contract: { pooled_funding_contracts?: PooledFundingContractRef[] | null } | null | undefined
): boolean {
  return contract?.pooled_funding_contracts?.some(item => item.is_active) ?? false;
}
