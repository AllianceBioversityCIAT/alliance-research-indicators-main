import { Test, TestingModule } from '@nestjs/testing';
import { SessionFormatsService } from './session-formats.service';

describe('SessionFormatsService', () => {
  let service: SessionFormatsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SessionFormatsService],
    }).compile();

    service = module.get<SessionFormatsService>(SessionFormatsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
