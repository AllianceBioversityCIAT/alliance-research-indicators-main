import { Test, TestingModule } from '@nestjs/testing';
import { ResultInnovationToolFunctionService } from './result-innovation-tool-function.service';

describe('ResultInnovationToolFunctionService', () => {
  let service: ResultInnovationToolFunctionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ResultInnovationToolFunctionService],
    }).compile();

    service = module.get<ResultInnovationToolFunctionService>(ResultInnovationToolFunctionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
