import { PortfolioUtil } from '../utils/portfolio.util';

export const mockPortfolioUtilValue = {
  setup: jest.fn().mockResolvedValue(undefined),
  nullPortfolioId: null,
  nullPortfolio: null,
  nullPortfolioName: null,
  nullPortfolioDescription: null,
  clearManually: jest.fn(),
  setCurrentPortfolio: jest.fn().mockResolvedValue(undefined),
};

export const mockPortfolioUtilProvider = {
  provide: PortfolioUtil,
  useValue: mockPortfolioUtilValue,
};
