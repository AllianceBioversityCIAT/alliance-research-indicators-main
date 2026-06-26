import { Injectable } from '@nestjs/common';
import { PortfolioIdEnum } from '../../../enum/portfolio-id.enum';
import { ResultSectionKeyEnum } from '../../../enum/result-section-key.enum';
import { PortfolioHandlerContext } from '../../../core/portfolio-handler-context.interface';
import { ResultAlignmentDto } from '../../../../dto/result-alignment.dto';
import {
  AlignmentSectionHandler,
  AlignmentSectionView,
} from '../alignment-section-handler.interface';
import { ResultAlignmentOperationsService } from '../shared/result-alignment-operations.service';

/**
 * Portfolio 2 (2026–2030) — test handler.
 * Reuses legacy save/find for now; extend here with portfolio-specific rules.
 */
@Injectable()
export class Portfolio2AlignmentHandler implements AlignmentSectionHandler {
  readonly portfolioId = PortfolioIdEnum.PORTFOLIO_2;
  readonly sectionKey = ResultSectionKeyEnum.ALIGNMENT;

  constructor(
    private readonly alignmentOperations: ResultAlignmentOperationsService,
  ) {}

  save(
    context: PortfolioHandlerContext,
    payload: ResultAlignmentDto,
  ): Promise<void> {
    return this.alignmentOperations.save(
      context.resultId,
      payload,
      context.manager,
    );
  }

  find(context: PortfolioHandlerContext): Promise<AlignmentSectionView> {
    return this.alignmentOperations.find(context.resultId);
  }
}
