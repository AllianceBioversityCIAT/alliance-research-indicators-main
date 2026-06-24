import { Test, TestingModule } from '@nestjs/testing';
import { mockPortfolioUtilProvider } from '../../shared/testing/mock-portfolio.util';
import { HttpStatus } from '@nestjs/common';
import { LinkResultsController } from './link-results.controller';
import { LinkResultsService } from './link-results.service';
import { ResultsUtil } from '../../shared/utils/results.util';
import { ResponseUtils } from '../../shared/utils/response.utils';
import { SetUpInterceptor } from '../../shared/Interceptors/setup.interceptor';
import { LinkResultRolesEnum } from '../link-result-roles/enum/link-result-roles.enum';
import { IndicatorsEnum } from '../indicators/enum/indicators.enum';
import { ResultStatusGuard } from '../../shared/guards/result-status.guard';

jest.mock('../../shared/utils/response.utils');

describe('LinkResultsController', () => {
  let controller: LinkResultsController;
  const mockService = {
    findAndDetails: jest.fn(),
    saveLinkResults: jest.fn(),
  };
  const mockFormat = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();
    (ResponseUtils.format as jest.Mock) = mockFormat;
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LinkResultsController],
      providers: [
        { provide: LinkResultsService, useValue: mockService },
        SetUpInterceptor,
        {
          provide: ResultsUtil,
          useValue: {
            resultId: 42,
            setup: jest.fn().mockResolvedValue(undefined),
          },
        },
        mockPortfolioUtilProvider,
      ],
    })
      .overrideGuard(ResultStatusGuard)
      .useValue({ canActivate: () => true })
      .compile();
    controller = module.get(LinkResultsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('getLinkResultsDetails', async () => {
    const details = [];
    mockService.findAndDetails.mockResolvedValue(details);
    mockFormat.mockReturnValue({});
    await controller.getLinkResultsDetails();
    expect(mockService.findAndDetails).toHaveBeenCalledWith(
      42,
      LinkResultRolesEnum.LINK_RESULT_SECTION,
    );
    expect(ResponseUtils.format).toHaveBeenCalledWith({
      data: { link_results: details },
      description: 'Linked results retrieved successfully',
      status: HttpStatus.OK,
    });
  });

  it('patchLinkResultsDetails', async () => {
    const body = { link_results: [] } as any;
    const saved = [];
    mockService.saveLinkResults.mockResolvedValue(saved);
    mockFormat.mockReturnValue({});
    await controller.patchLinkResultsDetails(body);
    expect(mockService.saveLinkResults).toHaveBeenCalledWith(
      42,
      body,
      [IndicatorsEnum.OICR],
      LinkResultRolesEnum.LINK_RESULT_SECTION,
    );
    expect(ResponseUtils.format).toHaveBeenCalledWith({
      data: saved,
      description: 'Linked results updated successfully',
      status: HttpStatus.OK,
    });
  });
});
