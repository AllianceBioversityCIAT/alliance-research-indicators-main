import { Test, TestingModule } from '@nestjs/testing';
import { SessionLengthsService } from './session-lengths.service';

describe('SessionLengthsService', () => {
  let service: SessionLengthsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SessionLengthsService],
    }).compile();

    service = module.get<SessionLengthsService>(SessionLengthsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
