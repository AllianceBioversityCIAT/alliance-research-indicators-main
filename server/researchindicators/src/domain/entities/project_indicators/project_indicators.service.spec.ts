import { Test, TestingModule } from '@nestjs/testing';
import { ProjectIndicatorsService } from './project_indicators.service';

describe('ProjectIndicatorsService', () => {
  let service: ProjectIndicatorsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProjectIndicatorsService],
    }).compile();

    service = module.get<ProjectIndicatorsService>(ProjectIndicatorsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
