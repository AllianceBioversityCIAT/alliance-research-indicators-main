import { Test, TestingModule } from '@nestjs/testing';
import { SessionTypesService } from './session-types.service';

describe('SessionTypesService', () => {
  let service: SessionTypesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SessionTypesService],
    }).compile();

    service = module.get<SessionTypesService>(SessionTypesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
