import { Test, TestingModule } from '@nestjs/testing';
import { ResultKeywordsController } from './result-keywords.controller';
import { ResultKeywordsService } from './result-keywords.service';

describe('ResultKeywordsController', () => {
  let controller: ResultKeywordsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResultKeywordsController],
      providers: [ResultKeywordsService],
    }).compile();

    controller = module.get<ResultKeywordsController>(ResultKeywordsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
