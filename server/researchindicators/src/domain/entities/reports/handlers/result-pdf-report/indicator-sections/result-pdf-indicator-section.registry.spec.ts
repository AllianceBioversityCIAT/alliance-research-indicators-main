import { IndicatorsEnum } from '../../../../indicators/enum/indicators.enum';
import { ResultPdfIndicatorSectionRegistry } from './result-pdf-indicator-section.registry';
import { ResultPdfIndicatorSectionHandler } from './result-pdf-indicator-section.types';

describe('ResultPdfIndicatorSectionRegistry', () => {
  const capSharingHandler: ResultPdfIndicatorSectionHandler = {
    indicatorId: IndicatorsEnum.CAPACITY_SHARING_FOR_DEVELOPMENT,
    buildSections: jest.fn(),
  };

  let registry: ResultPdfIndicatorSectionRegistry;

  beforeEach(() => {
    jest.clearAllMocks();
    registry = new ResultPdfIndicatorSectionRegistry([capSharingHandler]);
  });

  it('returns an empty object for indicators without a handler', async () => {
    await expect(
      registry.buildSections(10, IndicatorsEnum.POLICY_CHANGE),
    ).resolves.toEqual({});
    expect(capSharingHandler.buildSections).not.toHaveBeenCalled();
  });

  it('delegates to the registered handler for the matching indicator', async () => {
    (capSharingHandler.buildSections as jest.Mock).mockResolvedValue({
      cap_sharing: { session_format_id: 1 },
    });

    await expect(
      registry.buildSections(
        17898,
        IndicatorsEnum.CAPACITY_SHARING_FOR_DEVELOPMENT,
      ),
    ).resolves.toEqual({
      cap_sharing: { session_format_id: 1 },
    });
    expect(capSharingHandler.buildSections).toHaveBeenCalledWith(17898);
  });

  it('omits undefined section values from the merged payload', async () => {
    (capSharingHandler.buildSections as jest.Mock).mockResolvedValue({
      cap_sharing: undefined,
    });

    await expect(
      registry.buildSections(
        17898,
        IndicatorsEnum.CAPACITY_SHARING_FOR_DEVELOPMENT,
      ),
    ).resolves.toEqual({});
  });
});
