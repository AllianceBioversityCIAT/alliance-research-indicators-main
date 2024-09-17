import { Test, TestingModule } from '@nestjs/testing';
import { ResultEvidencesService } from './result-evidences.service';

describe('ResultEvidencesService', () => {
  let service: ResultEvidencesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ResultEvidencesService],
    }).compile();

    service = module.get<ResultEvidencesService>(ResultEvidencesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
