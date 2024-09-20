import { Test, TestingModule } from '@nestjs/testing';
import { ResultInstitutionsService } from './result-institutions.service';

describe('ResultInstitutionsService', () => {
  let service: ResultInstitutionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ResultInstitutionsService],
    }).compile();

    service = module.get<ResultInstitutionsService>(ResultInstitutionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
