import { Portfolio1AlignmentHandler } from './portfolio-1-alignment.handler';
import { ResultAlignmentOperationsService } from '../shared/result-alignment-operations.service';
import { PortfolioIdEnum } from '../../../enum/portfolio-id.enum';
import { ResultSectionKeyEnum } from '../../../enum/result-section-key.enum';
import { PortfolioHandlerContext } from '../../../core/portfolio-handler-context.interface';

describe('Portfolio1AlignmentHandler', () => {
  let handler: Portfolio1AlignmentHandler;
  let alignmentOperations: jest.Mocked<
    Pick<ResultAlignmentOperationsService, 'save' | 'find'>
  >;

  const context: PortfolioHandlerContext = {
    resultId: 1,
    portfolioId: PortfolioIdEnum.PORTFOLIO_1,
  };

  beforeEach(() => {
    alignmentOperations = {
      save: jest.fn(),
      find: jest.fn(),
    };
    handler = new Portfolio1AlignmentHandler(
      alignmentOperations as unknown as ResultAlignmentOperationsService,
    );
  });

  it('should expose portfolio 1 metadata', () => {
    expect(handler.portfolioId).toBe(PortfolioIdEnum.PORTFOLIO_1);
    expect(handler.sectionKey).toBe(ResultSectionKeyEnum.ALIGNMENT);
  });

  it('should delegate save to ResultAlignmentOperationsService', async () => {
    const payload = { contracts: [], result_sdgs: [] } as any;
    const expected = { ...payload, primary_levers: [] };
    alignmentOperations.save.mockResolvedValue(expected);

    const result = await handler.save(context, payload);

    expect(alignmentOperations.save).toHaveBeenCalledWith(
      context.resultId,
      payload,
      context.manager,
    );
    expect(result).toBe(expected);
  });

  it('should delegate find to ResultAlignmentOperationsService', async () => {
    const expected = {
      contracts: [],
      primary_levers: [],
      contributor_levers: [],
      result_sdgs: [],
    };
    alignmentOperations.find.mockResolvedValue(expected as any);

    const result = await handler.find(context);

    expect(alignmentOperations.find).toHaveBeenCalledWith(context.resultId);
    expect(result).toBe(expected);
  });
});
