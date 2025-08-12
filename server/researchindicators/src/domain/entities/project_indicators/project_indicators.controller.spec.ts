import { Test, TestingModule } from '@nestjs/testing';
import { ProjectIndicatorsController } from './project_indicators.controller';
import { ProjectIndicatorsService } from './project_indicators.service';

describe('ProjectIndicatorsController', () => {
  let controller: ProjectIndicatorsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProjectIndicatorsController],
      providers: [ProjectIndicatorsService],
    }).compile();

    controller = module.get<ProjectIndicatorsController>(ProjectIndicatorsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
