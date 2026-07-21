import { Test, TestingModule } from '@nestjs/testing';
import { AiReportsController } from './ai-reports.controller';
import { AiReportsService } from './ai-reports.service';

describe('AiReportsController', () => {
  let controller: AiReportsController;

  const mockAiReportsService = {
    create: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AiReportsController],
      providers: [
        {
          provide: AiReportsService,
          useValue: mockAiReportsService,
        },
      ],
    }).compile();

    controller = module.get<AiReportsController>(AiReportsController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
