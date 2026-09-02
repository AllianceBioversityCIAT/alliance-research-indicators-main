import { Injectable } from '@nestjs/common';
import { PortfolioIdEnum } from '../../../enum/portfolio-id.enum';
import { ResultSectionKeyEnum } from '../../../enum/result-section-key.enum';
import { PortfolioHandlerContext } from '../../../core/portfolio-handler-context.interface';
import { ResultAlignmentDto } from '../../../../dto/result-alignment.dto';
import {
  AlignmentSectionHandler,
  AlignmentSectionView,
  StrategicObjectivesSaveReport,
} from '../alignment-section-handler.interface';
import { ResultAlignmentOperationsService } from '../shared/result-alignment-operations.service';

/** Portfolio 1 (2021–2025) — legacy alignment behaviour. */
@Injectable()
export class Portfolio1AlignmentHandler implements AlignmentSectionHandler {
  readonly portfolioId = PortfolioIdEnum.PORTFOLIO_1;
  readonly sectionKey = ResultSectionKeyEnum.ALIGNMENT;

  constructor(
    private readonly alignmentOperations: ResultAlignmentOperationsService,
  ) {}

  save(
    context: PortfolioHandlerContext,
    payload: ResultAlignmentDto,
  ): Promise<ResultAlignmentDto> {
    return this.alignmentOperations.save(
      context.resultId,
      payload,
      context.manager,
    );
  }

  find(context: PortfolioHandlerContext): Promise<AlignmentSectionView> {
    return this.alignmentOperations.find(context.resultId);
  }

  /**
   * Portfolio 1 owns no strategic objectives (R-RES-004) — this is a
   * property of the portfolio, not something to discover per call, so it
   * reports unsupported without issuing any reference-data query. There is
   * deliberately no `StrategicObjectivesService` dependency on this class.
   */
  async saveStrategicObjectives(
    _resultId: number,
    ids: number[],
  ): Promise<StrategicObjectivesSaveReport> {
    return {
      supported: false,
      saved: [],
      discarded: Array.from(new Set(ids ?? [])),
    };
  }
}
