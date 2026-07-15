import { EntityManager } from 'typeorm';
import { PortfolioIdEnum } from '../enum/portfolio-id.enum';
import { Result } from '../../entities/result.entity';
import { Portfolio } from '../../../portfolios/entities/portfolio.entity';

/**
 * Minimal context passed to each handler.
 * Built by the orchestrator from the result + request.
 */
export interface PortfolioHandlerContext {
  resultId: number;
  portfolioId: PortfolioIdEnum;
  manager?: EntityManager;
  result?: Partial<Result>;
  portfolio?: Partial<Portfolio>;
}
