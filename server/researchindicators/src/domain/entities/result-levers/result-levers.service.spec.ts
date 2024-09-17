import { Test, TestingModule } from '@nestjs/testing';
import { ResultLeversService } from './result-levers.service';

describe('ResultLeversService', () => {
  let service: ResultLeversService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ResultLeversService],
    }).compile();

    service = module.get<ResultLeversService>(ResultLeversService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
