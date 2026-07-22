import { BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ResultSectionOrchestratorService } from './result-section-orchestrator.service';
import { AlignmentHandlerRegistry } from '../sections/alignment/alignment-handler.registry';
import { PortfolioUtil } from '../../../../shared/utils/portfolio.util';
import { ResultsUtil } from '../../../../shared/utils/results.util';
import { PortfolioIdEnum } from '../enum/portfolio-id.enum';
import { TrueFalseEnum } from '../../../../shared/enum/queries.enum';

describe('ResultSectionOrchestratorService', () => {
  let service: ResultSectionOrchestratorService;
  let dataSource: { transaction: jest.Mock };
  let alignmentRegistry: { get: jest.Mock };
  let portfolioUtil: { nullPortfolioId: number | null; portfolio: unknown };
  let resultsUtil: { result: unknown };
  let handler: { save: jest.Mock; find: jest.Mock };

  const resultId = 42;
  const manager = { id: 'tx-manager' };
  const mockResult = { result_id: resultId, indicator_id: 3 };
  const mockPortfolio = { id: PortfolioIdEnum.PORTFOLIO_2, name: '2026–2030' };

  beforeEach(() => {
    handler = { save: jest.fn(), find: jest.fn() };
    alignmentRegistry = { get: jest.fn().mockReturnValue(handler) };
    portfolioUtil = {
      nullPortfolioId: PortfolioIdEnum.PORTFOLIO_2,
      portfolio: mockPortfolio,
    };
    resultsUtil = { result: mockResult };
    dataSource = {
      transaction: jest.fn(async (callback) => callback(manager)),
    };

    service = new ResultSectionOrchestratorService(
      dataSource as unknown as DataSource,
      alignmentRegistry as unknown as AlignmentHandlerRegistry,
      portfolioUtil as unknown as PortfolioUtil,
      resultsUtil as unknown as ResultsUtil,
    );
  });

  describe('resolvePortfolioId', () => {
    it('should return portfolio id from PortfolioUtil', () => {
      expect(service.resolvePortfolioId()).toBe(PortfolioIdEnum.PORTFOLIO_2);
    });

    it('should throw when portfolio is not resolved', () => {
      portfolioUtil.nullPortfolioId = null;

      expect(() => service.resolvePortfolioId()).toThrow(BadRequestException);
      expect(() => service.resolvePortfolioId()).toThrow('Portfolio not found');
    });
  });

  describe('buildContext', () => {
    it('should build handler context with result and portfolio', () => {
      const context = service.buildContext(
        resultId,
        PortfolioIdEnum.PORTFOLIO_2,
        manager as any,
        mockResult as any,
        mockPortfolio as any,
      );

      expect(context).toEqual({
        resultId,
        portfolioId: PortfolioIdEnum.PORTFOLIO_2,
        manager,
        result: mockResult,
        portfolio: mockPortfolio,
      });
    });
  });

  describe('findAlignment', () => {
    it('should delegate to the portfolio handler with enriched context', async () => {
      const alignment = { contracts: [], research_areas: [] };
      handler.find.mockResolvedValue(alignment);

      const result = await service.findAlignment(resultId);

      expect(alignmentRegistry.get).toHaveBeenCalledWith(
        PortfolioIdEnum.PORTFOLIO_2,
      );
      expect(handler.find).toHaveBeenCalledWith({
        resultId,
        portfolioId: PortfolioIdEnum.PORTFOLIO_2,
        manager: undefined,
        result: mockResult,
        portfolio: mockPortfolio,
      });
      expect(result).toBe(alignment);
    });
  });

  describe('saveAlignment', () => {
    const payload = {
      contracts: [],
      research_areas: [],
      strategic_objectives: [],
      impact_outcomes: [],
    } as any;

    it('should run save inside a transaction', async () => {
      handler.save.mockResolvedValue(undefined);

      await service.saveAlignment(resultId, payload);

      expect(dataSource.transaction).toHaveBeenCalled();
      expect(handler.save).toHaveBeenCalledWith(
        {
          resultId,
          portfolioId: PortfolioIdEnum.PORTFOLIO_2,
          manager,
          result: mockResult,
          portfolio: mockPortfolio,
        },
        payload,
      );
    });

    it('should return undefined when return flag is false', async () => {
      handler.save.mockResolvedValue(undefined);

      const result = await service.saveAlignment(
        resultId,
        payload,
        TrueFalseEnum.FALSE,
      );

      expect(result).toBeUndefined();
      expect(handler.find).not.toHaveBeenCalled();
    });

    it('should re-fetch alignment when return flag is true', async () => {
      const savedView = { contracts: [], research_areas: [{ lever_id: '1' }] };
      handler.save.mockResolvedValue(undefined);
      handler.find.mockResolvedValue(savedView);

      const result = await service.saveAlignment(
        resultId,
        payload,
        TrueFalseEnum.TRUE,
      );

      expect(handler.find).toHaveBeenCalled();
      expect(result).toBe(savedView);
    });
  });
});
