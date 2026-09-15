import { IndicatorsEnum } from '../../../entities/indicators/enum/indicators.enum';

/** PRMS Normalizer `type` values STAR can represent. */
export type PrmsIndicatorType =
  | 'capacity_sharing'
  | 'innovation_development'
  | 'policy_change'
  | 'innovation_use';

/**
 * Maps every STAR indicator to its PRMS Normalizer type, or null where PRMS
 * cannot receive that STAR indicator. This is an outbound map: its strings
 * deliberately do not correspond to the numeric OpenSearch ResultTypeEnum.
 */
export const IndicatorTypeHomologation: Record<
  IndicatorsEnum,
  PrmsIndicatorType | null
> = {
  [IndicatorsEnum.CAPACITY_SHARING_FOR_DEVELOPMENT]: 'capacity_sharing',
  [IndicatorsEnum.INNOVATION_DEV]: 'innovation_development',
  [IndicatorsEnum.KNOWLEDGE_PRODUCT]: null,
  [IndicatorsEnum.POLICY_CHANGE]: 'policy_change',
  [IndicatorsEnum.OICR]: null,
  [IndicatorsEnum.INNOVATION_USE]: 'innovation_use',
};
