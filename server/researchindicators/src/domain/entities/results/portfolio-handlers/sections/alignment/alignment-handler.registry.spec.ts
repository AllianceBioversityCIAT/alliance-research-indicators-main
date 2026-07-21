import { NotFoundException } from '@nestjs/common';
import { AlignmentHandlerRegistry } from './alignment-handler.registry';
import { PortfolioIdEnum } from '../../enum/portfolio-id.enum';
import { Portfolio1AlignmentHandler } from './portfolio-1/portfolio-1-alignment.handler';
import { Portfolio2AlignmentHandler } from './portfolio-2/portfolio-2-alignment.handler';

describe('AlignmentHandlerRegistry', () => {
  const portfolio1Handler = {
    portfolioId: PortfolioIdEnum.PORTFOLIO_1,
  } as Portfolio1AlignmentHandler;
  const portfolio2Handler = {
    portfolioId: PortfolioIdEnum.PORTFOLIO_2,
  } as Portfolio2AlignmentHandler;

  let registry: AlignmentHandlerRegistry;

  beforeEach(() => {
    registry = new AlignmentHandlerRegistry(
      portfolio1Handler,
      portfolio2Handler,
    );
  });

  it('should return portfolio 1 handler', () => {
    expect(registry.get(PortfolioIdEnum.PORTFOLIO_1)).toBe(portfolio1Handler);
  });

  it('should return portfolio 2 handler', () => {
    expect(registry.get(PortfolioIdEnum.PORTFOLIO_2)).toBe(portfolio2Handler);
  });

  it('should list registered portfolio ids', () => {
    expect(registry.getRegisteredPortfolioIds()).toEqual([
      PortfolioIdEnum.PORTFOLIO_1,
      PortfolioIdEnum.PORTFOLIO_2,
    ]);
  });

  it('should throw NotFoundException for unknown portfolio', () => {
    expect(() => registry.get(999 as PortfolioIdEnum)).toThrow(
      NotFoundException,
    );
    expect(() => registry.get(999 as PortfolioIdEnum)).toThrow(
      'No handler registered for portfolio 999',
    );
  });
});
