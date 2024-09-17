import { Test, TestingModule } from '@nestjs/testing';
import { SessionPurposesService } from './session-purposes.service';

describe('SessionPurposesService', () => {
  let service: SessionPurposesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SessionPurposesService],
    }).compile();

    service = module.get<SessionPurposesService>(SessionPurposesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
