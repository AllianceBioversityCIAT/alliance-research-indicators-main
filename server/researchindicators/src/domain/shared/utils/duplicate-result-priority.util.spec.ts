import { IndicatorsEnum } from '../../entities/indicators/enum/indicators.enum';
import { ReportingPlatformEnum } from '../../entities/results/enum/reporting-platform.enum';
import {
  evaluateDuplicateResults,
  resolveDuplicateWinner,
} from './duplicate-result-priority.util';

describe('resolveDuplicateWinner', () => {
  const kp = (platformCode: ReportingPlatformEnum) => ({
    platformCode,
    indicatorId: IndicatorsEnum.KNOWLEDGE_PRODUCT,
  });

  const cs = (platformCode: ReportingPlatformEnum) => ({
    platformCode,
    indicatorId: IndicatorsEnum.CAPACITY_SHARING_FOR_DEVELOPMENT,
  });

  it('TIP prevails over PRMS', () => {
    expect(
      resolveDuplicateWinner(
        kp(ReportingPlatformEnum.TIP),
        kp(ReportingPlatformEnum.PRMS),
      ),
    ).toBe('incoming');
    expect(
      resolveDuplicateWinner(
        kp(ReportingPlatformEnum.PRMS),
        kp(ReportingPlatformEnum.TIP),
      ),
    ).toBe('existing');
  });

  it('TIP prevails over AICCRA when AICCRA is not Capacity Sharing', () => {
    const tipInnovation = {
      platformCode: ReportingPlatformEnum.TIP,
      indicatorId: IndicatorsEnum.INNOVATION_DEV,
    };
    const aiccraInnovation = {
      platformCode: ReportingPlatformEnum.AICCRA,
      indicatorId: IndicatorsEnum.INNOVATION_DEV,
    };

    expect(resolveDuplicateWinner(tipInnovation, aiccraInnovation)).toBe(
      'incoming',
    );
    expect(resolveDuplicateWinner(aiccraInnovation, tipInnovation)).toBe(
      'existing',
    );
  });

  it('AICCRA prevails over PRMS when TIP is not involved', () => {
    expect(
      resolveDuplicateWinner(
        kp(ReportingPlatformEnum.AICCRA),
        kp(ReportingPlatformEnum.PRMS),
      ),
    ).toBe('incoming');
    expect(
      resolveDuplicateWinner(
        kp(ReportingPlatformEnum.PRMS),
        kp(ReportingPlatformEnum.AICCRA),
      ),
    ).toBe('existing');
  });

  it('AICCRA Capacity Sharing prevails over any PRMS/TIP result', () => {
    expect(
      resolveDuplicateWinner(
        cs(ReportingPlatformEnum.AICCRA),
        kp(ReportingPlatformEnum.PRMS),
      ),
    ).toBe('incoming');
    expect(
      resolveDuplicateWinner(
        cs(ReportingPlatformEnum.AICCRA),
        kp(ReportingPlatformEnum.TIP),
      ),
    ).toBe('incoming');
    expect(
      resolveDuplicateWinner(
        kp(ReportingPlatformEnum.TIP),
        cs(ReportingPlatformEnum.AICCRA),
      ),
    ).toBe('existing');
    // TIP Capacity Sharing also loses against existing AICCRA Capacity Sharing.
    expect(
      resolveDuplicateWinner(
        cs(ReportingPlatformEnum.TIP),
        cs(ReportingPlatformEnum.AICCRA),
      ),
    ).toBe('existing');
    expect(
      resolveDuplicateWinner(
        cs(ReportingPlatformEnum.AICCRA),
        cs(ReportingPlatformEnum.TIP),
      ),
    ).toBe('incoming');
  });
});

describe('evaluateDuplicateResults', () => {
  it('omits PRMS when TIP duplicate exists and marks TIP duplicate for deletion when PRMS wins locally', () => {
    const result = evaluateDuplicateResults(
      {
        platformCode: ReportingPlatformEnum.PRMS,
        indicatorId: IndicatorsEnum.KNOWLEDGE_PRODUCT,
      },
      [
        {
          resultId: 10,
          platformCode: ReportingPlatformEnum.TIP,
          indicatorId: IndicatorsEnum.KNOWLEDGE_PRODUCT,
        },
      ],
    );

    expect(result.shouldOmit).toBe(true);
    expect(result.resultsToDelete).toEqual([]);
  });

  it('marks lower-priority duplicates for deletion when incoming TIP wins', () => {
    const result = evaluateDuplicateResults(
      {
        platformCode: ReportingPlatformEnum.TIP,
        indicatorId: IndicatorsEnum.KNOWLEDGE_PRODUCT,
      },
      [
        {
          resultId: 20,
          platformCode: ReportingPlatformEnum.PRMS,
          indicatorId: IndicatorsEnum.KNOWLEDGE_PRODUCT,
        },
        {
          resultId: 30,
          platformCode: ReportingPlatformEnum.AICCRA,
          indicatorId: IndicatorsEnum.INNOVATION_DEV,
        },
      ],
    );

    expect(result.shouldOmit).toBe(false);
    expect(result.resultsToDelete).toEqual([20, 30]);
  });

  it('does not delete duplicates referenced in link_results', () => {
    const result = evaluateDuplicateResults(
      {
        platformCode: ReportingPlatformEnum.TIP,
        indicatorId: IndicatorsEnum.KNOWLEDGE_PRODUCT,
      },
      [
        {
          resultId: 40,
          platformCode: ReportingPlatformEnum.PRMS,
          indicatorId: IndicatorsEnum.KNOWLEDGE_PRODUCT,
        },
      ],
      [40],
    );

    expect(result.resultsToDelete).toEqual([]);
    expect(result.protectedFromDeletion).toEqual([40]);
  });

  it('omits incoming TIP Capacity Sharing when AICCRA Capacity Sharing exists', () => {
    const result = evaluateDuplicateResults(
      {
        platformCode: ReportingPlatformEnum.TIP,
        indicatorId: IndicatorsEnum.CAPACITY_SHARING_FOR_DEVELOPMENT,
      },
      [
        {
          resultId: 50,
          platformCode: ReportingPlatformEnum.AICCRA,
          indicatorId: IndicatorsEnum.CAPACITY_SHARING_FOR_DEVELOPMENT,
        },
      ],
    );

    expect(result.shouldOmit).toBe(true);
    expect(result.resultsToDelete).toEqual([]);
  });
});
