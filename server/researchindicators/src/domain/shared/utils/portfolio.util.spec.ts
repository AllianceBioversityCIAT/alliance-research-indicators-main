import { BadRequestException } from '@nestjs/common';
import { PortfolioUtil } from './portfolio.util';
import { Portfolio } from '../../entities/portfolios/entities/portfolio.entity';
import { ResultsUtil } from './results.util';
import { PORTFOLIO_ID_PARAM } from '../decorators/portfolio.decorator';
import { REPORT_YEAR_PARAM } from './results.util';

describe('PortfolioUtil', () => {
  const mockFindOne = jest.fn();
  const mockGetRepository = jest.fn().mockReturnValue({
    findOne: mockFindOne,
  });

  const mockResultsUtil = {
    nullReportYearId: null,
  } as unknown as ResultsUtil;

  const buildUtil = (request: {
    params?: Record<string, string>;
    query?: Record<string, string>;
  }) =>
    new PortfolioUtil(
      { getRepository: mockGetRepository } as any,
      request as any,
      mockResultsUtil,
    );

  beforeEach(() => {
    jest.clearAllMocks();
    (mockResultsUtil as { nullReportYearId: number | null }).nullReportYearId =
      null;
  });

  describe('setup', () => {
    it('should resolve portfolio by portfolioId param', async () => {
      const portfolio = {
        id: 3,
        name: 'Portfolio 3',
        description: 'Desc',
        start_year: 2024,
        end_year: 2026,
      } as Portfolio;
      mockFindOne.mockResolvedValue(portfolio);

      const util = buildUtil({ params: { [PORTFOLIO_ID_PARAM]: '3' } });
      const result = await util.setup();

      expect(mockFindOne).toHaveBeenCalledWith({
        select: {
          id: true,
          name: true,
          description: true,
          start_year: true,
          end_year: true,
        },
        where: { is_active: true, id: 3 },
      });
      expect(result).toBe(portfolio);
      expect(util.nullPortfolioId).toBe(3);
    });

    it('should resolve portfolio by portfolioId query param', async () => {
      const portfolio = { id: 5, name: 'Q Portfolio' } as Portfolio;
      mockFindOne.mockResolvedValue(portfolio);

      const util = buildUtil({ query: { [PORTFOLIO_ID_PARAM]: '5' } });
      await util.setup();

      expect(mockFindOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { is_active: true, id: 5 },
        }),
      );
      expect(util.nullPortfolioId).toBe(5);
    });

    it('should resolve portfolio by report year when portfolioId is absent', async () => {
      const portfolio = { id: 2, name: 'Year Portfolio' } as Portfolio;
      mockFindOne.mockResolvedValue(portfolio);

      const util = buildUtil({ query: { [REPORT_YEAR_PARAM]: '2025' } });
      await util.setup();

      expect(mockFindOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            is_active: true,
            start_year: expect.anything(),
            end_year: expect.anything(),
          }),
        }),
      );
      expect(util.nullPortfolioId).toBe(2);
    });

    it('should prefer report year from ResultsUtil over query', async () => {
      (mockResultsUtil as { nullReportYearId: number }).nullReportYearId = 2024;
      mockFindOne.mockResolvedValue({ id: 1 } as Portfolio);

      const util = buildUtil({ query: { [REPORT_YEAR_PARAM]: '2020' } });
      await util.setup();

      expect(mockFindOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            is_active: true,
          }),
        }),
      );
    });

    it('should return null when neither portfolioId nor report year is provided', async () => {
      const util = buildUtil({});
      const result = await util.setup();

      expect(result).toBeNull();
      expect(mockFindOne).not.toHaveBeenCalled();
      expect(util.nullPortfolioId).toBeNull();
    });
  });

  describe('setCurrentPortfolio', () => {
    it('should load portfolio by id', async () => {
      const portfolio = { id: 7, name: 'Current' } as Portfolio;
      mockFindOne.mockResolvedValue(portfolio);

      const util = buildUtil({});
      await util.setCurrentPortfolio(7);

      expect(mockFindOne).toHaveBeenCalledWith({
        select: {
          id: true,
          name: true,
          description: true,
          start_year: true,
          end_year: true,
        },
        where: { id: 7, is_active: true },
      });
      expect(util.nullPortfolioId).toBe(7);
    });
  });

  describe('clearManually', () => {
    it('should reset current portfolio state', async () => {
      mockFindOne.mockResolvedValue({ id: 1, name: 'A' } as Portfolio);
      const util = buildUtil({ params: { [PORTFOLIO_ID_PARAM]: '1' } });
      await util.setup();
      expect(util.nullPortfolioId).toBe(1);

      util.clearManually();

      expect(util.nullPortfolioId).toBeNull();
    });
  });

  describe('strict getters', () => {
    it('should throw when portfolio is not loaded', () => {
      const util = buildUtil({});

      expect(() => util.portfolio).toThrow(BadRequestException);
      expect(() => util.portfolioId).toThrow(BadRequestException);
      expect(() => util.portfolioName).toThrow(BadRequestException);
      expect(() => util.portfolioDescription).toThrow(BadRequestException);
    });

    it('should return portfolio data when loaded', async () => {
      mockFindOne.mockResolvedValue({
        id: 4,
        name: 'Loaded',
        description: 'Details',
      } as Portfolio);
      const util = buildUtil({ params: { [PORTFOLIO_ID_PARAM]: '4' } });
      await util.setup();

      expect(util.portfolioId).toBe(4);
      expect(util.portfolioName).toBe('Loaded');
      expect(util.portfolioDescription).toBe('Details');
    });
  });
});
