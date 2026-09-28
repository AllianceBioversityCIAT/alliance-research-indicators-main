export enum PolicyAmountStatusEnum {
  CONFIRMED = 'Confirmed',
  ESTIMATED = 'Estimated',
  UNKNOWN = 'Unknown',
}

export const POLICY_AMOUNT_STATUS_VALUES = Object.values(
  PolicyAmountStatusEnum,
) as string[];
