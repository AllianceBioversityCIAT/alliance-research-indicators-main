import { IndicatorsEnum } from '../../../../entities/indicators/enum/indicators.enum';
import { ResultTypeEnum } from '../enum/rsult-type.enum';

export const IndicatorHomologation = {
  [ResultTypeEnum.POLICY_CHANGE]: IndicatorsEnum.POLICY_CHANGE,
  [ResultTypeEnum.INNOVATION_USE]: IndicatorsEnum.INNOVATION_USE,
  [ResultTypeEnum.CAPACITY_CHANGE]: null,
  [ResultTypeEnum.OTHER_OUTCOME]: null,
  [ResultTypeEnum.CAPACITY_SHARING_FOR_DEVELOPMENT]:
    IndicatorsEnum.CAPACITY_SHARING_FOR_DEVELOPMENT,
  [ResultTypeEnum.KNOWLEDGE_PRODUCT]: IndicatorsEnum.KNOWLEDGE_PRODUCT,
  [ResultTypeEnum.INNOVATION_DEVELOPMENT]: IndicatorsEnum.INNOVATION_DEV,
  [ResultTypeEnum.OTHER_OUTPUT]: null,
  [ResultTypeEnum.IMPACT_CONTRIBUTION]: null,
  [ResultTypeEnum.INNOVATION_USE_IPSR]: null,
  [ResultTypeEnum.COMPLIMENTARY_INNOVATION]: null,
};
