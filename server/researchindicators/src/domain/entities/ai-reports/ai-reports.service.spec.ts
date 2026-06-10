import { Test, TestingModule } from '@nestjs/testing';
import { AiReportsService } from './ai-reports.service';

describe('AiReportsService', () => {
  let service: AiReportsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AiReportsService],
    }).compile();

    service = module.get<AiReportsService>(AiReportsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
