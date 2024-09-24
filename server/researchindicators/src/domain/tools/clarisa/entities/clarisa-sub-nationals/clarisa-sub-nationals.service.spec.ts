import { Test, TestingModule } from '@nestjs/testing';
import { ClarisaSubNationalsService } from './clarisa-sub-nationals.service';

describe('ClarisaSubNationalsService', () => {
  let service: ClarisaSubNationalsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ClarisaSubNationalsService],
    }).compile();

    service = module.get<ClarisaSubNationalsService>(
      ClarisaSubNationalsService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
