import { Test, TestingModule } from '@nestjs/testing';
import { ProjectIndicatorsResultsService } from './project_indicators_results.service';

describe('ProjectIndicatorsResultsService', () => {
  let service: ProjectIndicatorsResultsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProjectIndicatorsResultsService],
    }).compile();

    service = module.get<ProjectIndicatorsResultsService>(ProjectIndicatorsResultsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
