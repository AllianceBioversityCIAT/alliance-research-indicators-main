import { Test, TestingModule } from '@nestjs/testing';
import { ResultCapacitySharingService } from './result-capacity-sharing.service';

describe('ResultCapacitySharingService', () => {
  let service: ResultCapacitySharingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ResultCapacitySharingService],
    }).compile();

    service = module.get<ResultCapacitySharingService>(ResultCapacitySharingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
