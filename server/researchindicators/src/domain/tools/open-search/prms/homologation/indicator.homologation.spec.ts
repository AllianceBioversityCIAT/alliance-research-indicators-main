import { IndicatorHomologation } from './indicator.homologation';
import { IndicatorsEnum } from '../../../../entities/indicators/enum/indicators.enum';
import { ResultTypeEnum } from '../enum/rsult-type.enum';

describe('IndicatorHomologation', () => {
  it('maps PRMS result types to internal indicators or null', () => {
    expect(IndicatorHomologation[ResultTypeEnum.POLICY_CHANGE]).toBe(
      IndicatorsEnum.POLICY_CHANGE,
    );
    expect(IndicatorHomologation[ResultTypeEnum.INNOVATION_USE]).toBe(
      IndicatorsEnum.INNOVATION_USE,
    );
    expect(IndicatorHomologation[ResultTypeEnum.CAPACITY_CHANGE]).toBeNull();
    expect(
      IndicatorHomologation[ResultTypeEnum.CAPACITY_SHARING_FOR_DEVELOPMENT],
    ).toBe(IndicatorsEnum.CAPACITY_SHARING_FOR_DEVELOPMENT);
    expect(IndicatorHomologation[ResultTypeEnum.KNOWLEDGE_PRODUCT]).toBe(
      IndicatorsEnum.KNOWLEDGE_PRODUCT,
    );
    expect(IndicatorHomologation[ResultTypeEnum.INNOVATION_DEVELOPMENT]).toBe(
      IndicatorsEnum.INNOVATION_DEV,
    );
  });
});
