import { Injectable } from '@nestjs/common';
import { AbstractSectionHandlerRegistry } from '../../core/abstract-section-handler.registry';
import { PortfolioIdEnum } from '../../enum/portfolio-id.enum';
import { ResultAlignmentDto } from '../../../dto/result-alignment.dto';
import {
  AlignmentSectionHandler,
  AlignmentSectionView,
} from './alignment-section-handler.interface';
import { Portfolio1AlignmentHandler } from './portfolio-1/portfolio-1-alignment.handler';
import { Portfolio2AlignmentHandler } from './portfolio-2/portfolio-2-alignment.handler';

@Injectable()
export class AlignmentHandlerRegistry extends AbstractSectionHandlerRegistry<
  ResultAlignmentDto,
  AlignmentSectionView,
  AlignmentSectionHandler
> {
  protected readonly handlers = new Map<PortfolioIdEnum, AlignmentSectionHandler>(
    [
      [PortfolioIdEnum.PORTFOLIO_1, this.portfolio1Handler],
      [PortfolioIdEnum.PORTFOLIO_2, this.portfolio2Handler],
    ],
  );

  constructor(
    private readonly portfolio1Handler: Portfolio1AlignmentHandler,
    private readonly portfolio2Handler: Portfolio2AlignmentHandler,
  ) {
    super();
  }
}
