import { Test, TestingModule } from '@nestjs/testing';
import { ClarisaRegionsService } from './clarisa-regions.service';

describe('ClarisaRegionsService', () => {
  let service: ClarisaRegionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ClarisaRegionsService],
    }).compile();

    service = module.get<ClarisaRegionsService>(ClarisaRegionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
