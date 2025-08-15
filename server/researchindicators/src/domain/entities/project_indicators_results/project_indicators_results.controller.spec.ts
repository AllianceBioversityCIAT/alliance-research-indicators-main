import { Test, TestingModule } from '@nestjs/testing';
import { ProjectIndicatorsResultsController } from './project_indicators_results.controller';
import { ProjectIndicatorsResultsService } from './project_indicators_results.service';

describe('ProjectIndicatorsResultsController', () => {
  let controller: ProjectIndicatorsResultsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProjectIndicatorsResultsController],
      providers: [ProjectIndicatorsResultsService],
    }).compile();

    controller = module.get<ProjectIndicatorsResultsController>(ProjectIndicatorsResultsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
