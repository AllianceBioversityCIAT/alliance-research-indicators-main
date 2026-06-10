import { Test, TestingModule } from '@nestjs/testing';
import { AiReportsController } from './ai-reports.controller';
import { AiReportsService } from './ai-reports.service';

describe('AiReportsController', () => {
  let controller: AiReportsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AiReportsController],
      providers: [AiReportsService],
    }).compile();

    controller = module.get<AiReportsController>(AiReportsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
