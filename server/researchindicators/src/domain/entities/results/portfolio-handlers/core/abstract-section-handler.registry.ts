import { NotFoundException } from '@nestjs/common';
import { PortfolioIdEnum } from '../enum/portfolio-id.enum';
import { PortfolioSectionHandler } from './portfolio-section-handler.interface';

/**
 * Generic registry: resolves a handler by portfolioId.
 * Each section extends this class with its concrete handler map.
 */
export abstract class AbstractSectionHandlerRegistry<
  TSave,
  TView,
  THandler extends PortfolioSectionHandler<TSave, TView>,
> {
  protected abstract readonly handlers: ReadonlyMap<PortfolioIdEnum, THandler>;

  get(portfolioId: PortfolioIdEnum): THandler {
    const handler = this.handlers.get(portfolioId);

    if (!handler) {
      throw new NotFoundException(
        `No handler registered for portfolio ${portfolioId} in ${this.constructor.name}`,
      );
    }

    return handler;
  }

  getRegisteredPortfolioIds(): PortfolioIdEnum[] {
    return [...this.handlers.keys()];
  }
}
