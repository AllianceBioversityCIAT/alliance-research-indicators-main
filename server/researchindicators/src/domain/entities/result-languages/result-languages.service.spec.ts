import { Test, TestingModule } from '@nestjs/testing';
import { ResultLanguagesService } from './result-languages.service';

describe('ResultLanguagesService', () => {
  let service: ResultLanguagesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ResultLanguagesService],
    }).compile();

    service = module.get<ResultLanguagesService>(ResultLanguagesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
