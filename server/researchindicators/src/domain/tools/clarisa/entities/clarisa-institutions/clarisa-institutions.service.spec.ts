import { Test, TestingModule } from '@nestjs/testing';
import { ClarisaInstitutionsService } from './clarisa-institutions.service';

describe('ClarisaInstitutionsService', () => {
  let service: ClarisaInstitutionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ClarisaInstitutionsService],
    }).compile();

    service = module.get<ClarisaInstitutionsService>(ClarisaInstitutionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
