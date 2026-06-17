import { IndicatorsEnum } from '../../../../indicators/enum/indicators.enum';
import { ResultPdfReportCapSharingSection } from '../result-pdf-report.types';

/**
 * Indicator-specific PDF payload keys. Add a new optional section here when a new
 * indicator needs extra report data (e.g. `policy_change?: ...`).
 */
export type ResultPdfIndicatorSections = {
  cap_sharing?: ResultPdfReportCapSharingSection;
};

export type ResultPdfIndicatorSectionHandler = {
  readonly indicatorId: IndicatorsEnum;
  buildSections(
    resultId: number,
  ): Promise<Partial<ResultPdfIndicatorSections>>;
};
