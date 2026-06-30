import { PortfolioIdEnum } from '../enum/portfolio-id.enum';
import { ResultSectionKeyEnum } from '../enum/result-section-key.enum';
import { PortfolioHandlerContext } from './portfolio-handler-context.interface';

/**
 * Base contract for a handler per section and portfolio.
 * TSave / TView are the concrete DTOs or views for each section.
 */
export interface PortfolioSectionHandler<TSave, TView> {
  readonly portfolioId: PortfolioIdEnum;
  readonly sectionKey: ResultSectionKeyEnum;

  save(context: PortfolioHandlerContext, payload: TSave): Promise<TView | void>;

  find(context: PortfolioHandlerContext): Promise<TView>;
}
