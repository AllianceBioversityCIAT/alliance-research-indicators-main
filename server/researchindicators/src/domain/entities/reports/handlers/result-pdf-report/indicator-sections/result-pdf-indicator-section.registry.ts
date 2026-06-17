import { Inject, Injectable } from '@nestjs/common';
import { IndicatorsEnum } from '../../../../indicators/enum/indicators.enum';
import {
  ResultPdfIndicatorSectionHandler,
  ResultPdfIndicatorSections,
} from './result-pdf-indicator-section.types';

export const RESULT_PDF_INDICATOR_SECTION_HANDLERS = Symbol(
  'RESULT_PDF_INDICATOR_SECTION_HANDLERS',
);

@Injectable()
export class ResultPdfIndicatorSectionRegistry {
  private readonly handlers = new Map<
    IndicatorsEnum,
    ResultPdfIndicatorSectionHandler
  >();

  constructor(
    @Inject(RESULT_PDF_INDICATOR_SECTION_HANDLERS)
    handlers: ResultPdfIndicatorSectionHandler[],
  ) {
    handlers.forEach((handler) => this.register(handler));
  }

  register(handler: ResultPdfIndicatorSectionHandler): void {
    this.handlers.set(handler.indicatorId, handler);
  }

  async buildSections(
    resultId: number,
    indicatorId: number,
  ): Promise<Partial<ResultPdfIndicatorSections>> {
    const handler = this.handlers.get(indicatorId as IndicatorsEnum);
    if (!handler) return {};

    const sections = await handler.buildSections(resultId);
    return this.compactSections(sections);
  }

  private compactSections(
    sections: Partial<ResultPdfIndicatorSections>,
  ): Partial<ResultPdfIndicatorSections> {
    return Object.fromEntries(
      Object.entries(sections).filter(([, value]) => value !== undefined),
    ) as Partial<ResultPdfIndicatorSections>;
  }
}
