import { EntityManager } from 'typeorm';
import { PortfolioIdEnum } from '../enum/portfolio-id.enum';

/**
 * Minimal context passed to each handler.
 * Built by the orchestrator from the result + request.
 */
export interface PortfolioHandlerContext {
  resultId: number;
  portfolioId: PortfolioIdEnum;
  manager?: EntityManager;
}
