import { Test, TestingModule } from '@nestjs/testing';
import { ClarisaLeversService } from './clarisa-levers.service';

describe('ClarisaLeversService', () => {
  let service: ClarisaLeversService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ClarisaLeversService],
    }).compile();

    service = module.get<ClarisaLeversService>(ClarisaLeversService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
