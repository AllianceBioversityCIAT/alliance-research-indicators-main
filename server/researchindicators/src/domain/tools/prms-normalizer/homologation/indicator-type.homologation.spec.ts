import { IndicatorsEnum } from '../../../entities/indicators/enum/indicators.enum';
import { IndicatorTypeHomologation } from './indicator-type.homologation';

const starIndicators = (): IndicatorsEnum[] =>
  Object.values(IndicatorsEnum).filter(
    (value): value is IndicatorsEnum => typeof value === 'number',
  );

describe('IndicatorTypeHomologation', () => {
  it('maps each of STAR’s six indicators to its documented Normalizer type or null', () => {
    expect(IndicatorTypeHomologation).toEqual({
      [IndicatorsEnum.CAPACITY_SHARING_FOR_DEVELOPMENT]: 'capacity_sharing',
      [IndicatorsEnum.INNOVATION_DEV]: 'innovation_development',
      [IndicatorsEnum.KNOWLEDGE_PRODUCT]: null,
      [IndicatorsEnum.POLICY_CHANGE]: 'policy_change',
      [IndicatorsEnum.OICR]: null,
      [IndicatorsEnum.INNOVATION_USE]: 'innovation_use',
    });
  });

  it('is total over the current IndicatorsEnum members', () => {
    const mappedIndicators = Object.keys(IndicatorTypeHomologation)
      .map(Number)
      .sort();

    expect(mappedIndicators).toEqual(starIndicators().sort());
    expect(starIndicators()).toHaveLength(6);
    for (const indicator of starIndicators()) {
      expect(IndicatorTypeHomologation[indicator]).not.toBeUndefined();
    }
  });
});
