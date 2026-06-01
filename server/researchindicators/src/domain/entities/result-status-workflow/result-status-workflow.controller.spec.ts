import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { ResultStatusWorkflowController } from './result-status-workflow.controller';
import { ResultStatusWorkflowService } from './result-status-workflow.service';
import { ResultsUtil } from '../../shared/utils/results.util';
import { ResponseUtils } from '../../shared/utils/response.utils';
import { SetUpInterceptor } from '../../shared/Interceptors/setup.interceptor';

jest.mock('../../shared/utils/response.utils');

describe('ResultStatusWorkflowController', () => {
  let controller: ResultStatusWorkflowController;
  const mockService = {
    getAllStatusesByindicatorId: jest.fn(),
    getHierarchicalTreeByIndicatorId: jest.fn(),
    getConfigWorkflowByIndicatorAndFromStatus: jest.fn(),
    getNextStepsByResultId: jest.fn(),
    changeStatus: jest.fn(),
  };
  const mockFormat = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();
    (ResponseUtils.format as jest.Mock) = mockFormat;
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResultStatusWorkflowController],
      providers: [
        { provide: ResultStatusWorkflowService, useValue: mockService },
        SetUpInterceptor,
        {
          provide: ResultsUtil,
          useValue: {
            resultId: 100,
            setup: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();
    controller = module.get(ResultStatusWorkflowController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('getWorkflow', async () => {
    const data = [];
    mockService.getAllStatusesByindicatorId.mockResolvedValue(data);
    mockFormat.mockReturnValue({});
    await controller.getWorkflow(3);
    expect(mockService.getAllStatusesByindicatorId).toHaveBeenCalledWith(3);
    expect(ResponseUtils.format).toHaveBeenCalledWith({
      data,
      description: 'Workflow found',
      status: HttpStatus.OK,
    });
  });

  it('getHierarchicalTree', async () => {
    const tree = {};
    mockService.getHierarchicalTreeByIndicatorId.mockResolvedValue(tree);
    mockFormat.mockReturnValue({});
    await controller.getHierarchicalTree(2);
    expect(mockService.getHierarchicalTreeByIndicatorId).toHaveBeenCalledWith(
      2,
    );
  });

  it('getConfigWorkflow', async () => {
    const cfg = [
      {
        result_status_id: 3,
        is_status_change_validation_required: true,
      },
    ];
    mockService.getConfigWorkflowByIndicatorAndFromStatus.mockResolvedValue(
      cfg,
    );
    mockFormat.mockReturnValue({});
    await controller.getConfigWorkflow('1', '2');
    expect(
      mockService.getConfigWorkflowByIndicatorAndFromStatus,
    ).toHaveBeenCalledWith(1, 2);
    expect(ResponseUtils.format).toHaveBeenCalledWith({
      data: cfg,
      description: 'Config workflow found',
      status: HttpStatus.OK,
    });
  });

  it('getNextSteps', async () => {
    const steps = [];
    mockService.getNextStepsByResultId.mockResolvedValue(steps);
    mockFormat.mockReturnValue({});
    await controller.getNextSteps();
    expect(mockService.getNextStepsByResultId).toHaveBeenCalledWith(100);
  });

  it('changeStatus', async () => {
    const body = {} as any;
    const out = {};
    mockService.changeStatus.mockResolvedValue(out);
    mockFormat.mockReturnValue({});
    await controller.changeStatus(body, '5');
    expect(mockService.changeStatus).toHaveBeenCalledWith(100, 5, body);
  });
});
