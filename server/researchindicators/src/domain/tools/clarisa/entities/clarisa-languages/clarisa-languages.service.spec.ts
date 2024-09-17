import { Test, TestingModule } from '@nestjs/testing';
import { ClarisaLanguagesService } from './clarisa-languages.service';

describe('ClarisaLanguagesService', () => {
  let service: ClarisaLanguagesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ClarisaLanguagesService],
    }).compile();

    service = module.get<ClarisaLanguagesService>(ClarisaLanguagesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
