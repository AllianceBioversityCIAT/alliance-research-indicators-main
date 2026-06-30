import { BadRequestException, Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { PortfolioIdEnum } from '../enum/portfolio-id.enum';
import { PortfolioHandlerContext } from '../core/portfolio-handler-context.interface';
import { ResultAlignmentDto } from '../../dto/result-alignment.dto';
import { AlignmentHandlerRegistry } from '../sections/alignment/alignment-handler.registry';
import { PortfolioUtil } from '../../../../shared/utils/portfolio.util';
import { TrueFalseEnum } from '../../../../shared/enum/queries.enum';

/**
 * Single delegation point from ResultsService / controller to alignment handlers.
 *
 * Portfolio resolution relies on PortfolioUtil, which is populated by SetUpInterceptor
 * from portfolioId (query/param) or reportYear (result / query).
 */
@Injectable()
export class ResultSectionOrchestratorService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly alignmentRegistry: AlignmentHandlerRegistry,
    private readonly portfolioUtil: PortfolioUtil,
  ) {}

  buildContext(
    resultId: number,
    portfolioId: PortfolioIdEnum,
    manager?: EntityManager,
  ): PortfolioHandlerContext {
    return { resultId, portfolioId, manager };
  }

  resolvePortfolioId(): PortfolioIdEnum {
    const portfolioId = this.portfolioUtil.nullPortfolioId;

    if (!portfolioId) {
      throw new BadRequestException('Portfolio not found');
    }

    return portfolioId as PortfolioIdEnum;
  }

  async findAlignment(resultId: number): Promise<ResultAlignmentDto> {
    const portfolioId = this.resolvePortfolioId();
    const handler = this.alignmentRegistry.get(portfolioId);
    return handler.find(this.buildContext(resultId, portfolioId));
  }

  async saveAlignment(
    resultId: number,
    payload: ResultAlignmentDto,
    returnData: TrueFalseEnum = TrueFalseEnum.FALSE,
  ): Promise<ResultAlignmentDto | void> {
    const portfolioId = this.resolvePortfolioId();
    const handler = this.alignmentRegistry.get(portfolioId);

    await this.dataSource.transaction(async (manager) => {
      await handler.save(
        this.buildContext(resultId, portfolioId, manager),
        payload,
      );
    });

    if (returnData === TrueFalseEnum.TRUE) {
      return this.findAlignment(resultId);
    }

    return undefined;
  }
}
