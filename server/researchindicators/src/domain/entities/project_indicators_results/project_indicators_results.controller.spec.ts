import { Test, TestingModule } from '@nestjs/testing';
import { ProjectIndicatorsResultsController } from './project_indicators_results.controller';
import { ProjectIndicatorsResultsService } from './project_indicators_results.service';
import { SyncProjectIndicatorsResultDto } from './dto/sync-project_indicators_result.dto';
import { ResponseUtils } from '../../shared/utils/response.utils';
import { HttpStatus } from '@nestjs/common';
import { ResultsUtil } from '../../shared/utils/results.util';

describe('ProjectIndicatorsResultsController', () => {
  let controller: ProjectIndicatorsResultsController;
  let service: ProjectIndicatorsResultsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProjectIndicatorsResultsController],
      providers: [
        {
          provide: ProjectIndicatorsResultsService,
          useValue: {
            syncResultToIndicator: jest.fn(),
            findByResultId: jest.fn(),
          },
        },
        {
          provide: ResultsUtil,
          useValue: {
            transform: jest.fn((data) => data), // mock simple
          },
        },
      ],
    }).compile();

    controller = module.get<ProjectIndicatorsResultsController>(
      ProjectIndicatorsResultsController,
    );
    service = module.get<ProjectIndicatorsResultsService>(
      ProjectIndicatorsResultsService,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createResult', () => {
    it('should call service.syncResultToIndicator and return formatted response', async () => {
      const resultId = 1;
      const dtos: SyncProjectIndicatorsResultDto[] = [
        { indicatorId: 2, value: 10 } as any,
      ];
      const serviceResult = [{ id: 1, indicatorId: 2, value: 10 }];
      (service.syncResultToIndicator as jest.Mock).mockResolvedValue(
        serviceResult,
      );

      const expectedResponse = ResponseUtils.format({
        description: 'Contributions synced successfully',
        status: HttpStatus.CREATED,
        data: serviceResult,
      });

      const response = await controller.createResult(resultId, dtos);
      expect(service.syncResultToIndicator).toHaveBeenCalledWith(
        dtos,
        resultId,
      );
      expect(response).toEqual(expectedResponse);
    });
  });

  describe('findByResultId', () => {
    it('should call service.findByResultId and return formatted response', async () => {
      const resultId = 1;
      const agreementId = 'abc';
      const serviceResult = [{ id: 1, indicatorId: 2, value: 10 }];
      (service.findByResultId as jest.Mock).mockResolvedValue(serviceResult);

      const expectedResponse = ResponseUtils.format({
        description: 'Contributions retrieved successfully',
        status: HttpStatus.OK,
        data: serviceResult,
      });

      const response = await controller.findByResultId(resultId, agreementId);
      expect(service.findByResultId).toHaveBeenCalledWith(
        resultId,
        agreementId,
      );
      expect(response).toEqual(expectedResponse);
    });
  });
});
