import { Test, TestingModule } from '@nestjs/testing';
import { ResultStrategicObjectivesService } from './result-strategic-objectives.service';

describe('ResultStrategicObjectivesService', () => {
  let service: ResultStrategicObjectivesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ResultStrategicObjectivesService],
    }).compile();

    service = module.get<ResultStrategicObjectivesService>(ResultStrategicObjectivesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
