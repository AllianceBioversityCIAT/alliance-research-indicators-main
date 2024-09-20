import { Test, TestingModule } from '@nestjs/testing';
import { ClarisaInstitutionTypesService } from './clarisa-institution-types.service';

describe('ClarisaInstitutionTypesService', () => {
  let service: ClarisaInstitutionTypesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ClarisaInstitutionTypesService],
    }).compile();

    service = module.get<ClarisaInstitutionTypesService>(ClarisaInstitutionTypesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
