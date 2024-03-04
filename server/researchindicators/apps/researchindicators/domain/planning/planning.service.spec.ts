import { Test, TestingModule } from '@nestjs/testing';
import { PlanningService } from './planning.service';

describe('PlanningService', () => {
  let service: PlanningService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PlanningService],
    }).compile();

    service = module.get<PlanningService>(PlanningService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
