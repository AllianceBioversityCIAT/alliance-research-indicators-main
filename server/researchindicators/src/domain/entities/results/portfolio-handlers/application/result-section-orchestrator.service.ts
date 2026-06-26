import { Injectable, NotFoundException } from '@nestjs/common';
import {
  DataSource,
  EntityManager,
  LessThanOrEqual,
  MoreThanOrEqual,
} from 'typeorm';
import { PortfolioIdEnum } from '../enum/portfolio-id.enum';
import { PortfolioHandlerContext } from '../core/portfolio-handler-context.interface';
import { ResultAlignmentDto } from '../../dto/result-alignment.dto';
import { AlignmentHandlerRegistry } from '../sections/alignment/alignment-handler.registry';
import {
  AlignmentSectionHandler,
} from '../sections/alignment/alignment-section-handler.interface';
import { AlignmentHandlerFlowDto } from '../dto/alignment-handler-flow.dto';
import { Result } from '../../entities/result.entity';
import { Portfolio } from '../../../portfolios/entities/portfolio.entity';

/**
 * Single delegation point from ResultsService / controller to alignment handlers.
 */
@Injectable()
export class ResultSectionOrchestratorService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly alignmentRegistry: AlignmentHandlerRegistry,
  ) {}

  buildContext(
    resultId: number,
    portfolioId: PortfolioIdEnum,
    manager?: EntityManager,
  ): PortfolioHandlerContext {
    return { resultId, portfolioId, manager };
  }

  async resolvePortfolioId(resultId: number): Promise<PortfolioIdEnum> {
    const result = await this.dataSource.getRepository(Result).findOne({
      where: { result_id: resultId, is_active: true },
      select: { report_year_id: true },
    });

    if (!result?.report_year_id) {
      return PortfolioIdEnum.PORTFOLIO_1;
    }

    const portfolio = await this.dataSource.getRepository(Portfolio).findOne({
      where: {
        is_active: true,
        start_year: LessThanOrEqual(result.report_year_id),
        end_year: MoreThanOrEqual(result.report_year_id),
      },
      select: { id: true },
    });

    if (!portfolio?.id) {
      throw new NotFoundException(
        `No active portfolio found for report year ${result.report_year_id}`,
      );
    }

    return portfolio.id as PortfolioIdEnum;
  }

  async findAlignmentFlow(resultId: number): Promise<AlignmentHandlerFlowDto> {
    const portfolioId = await this.resolvePortfolioId(resultId);
    const handler = this.alignmentRegistry.get(portfolioId);
    return this.buildFlowView(resultId, portfolioId, handler);
  }

  async saveAlignmentFlow(
    resultId: number,
    payload: ResultAlignmentDto,
  ): Promise<AlignmentHandlerFlowDto> {
    const portfolioId = await this.resolvePortfolioId(resultId);
    const handler = this.alignmentRegistry.get(portfolioId);

    await this.dataSource.transaction(async (manager) => {
      await handler.save(
        this.buildContext(resultId, portfolioId, manager),
        payload,
      );
    });

    return this.buildFlowView(resultId, portfolioId, handler);
  }

  private async buildFlowView(
    resultId: number,
    portfolioId: PortfolioIdEnum,
    handler: AlignmentSectionHandler,
  ): Promise<AlignmentHandlerFlowDto> {
    const alignment = await handler.find(
      this.buildContext(resultId, portfolioId),
    );

    return {
      portfolio_id: portfolioId,
      handler: handler.constructor.name,
      section: handler.sectionKey,
      alignment,
    };
  }
}
