import { Test, TestingModule } from '@nestjs/testing';
import { ResultLanguagesController } from './result-languages.controller';
import { ResultLanguagesService } from './result-languages.service';

describe('ResultLanguagesController', () => {
  let controller: ResultLanguagesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResultLanguagesController],
      providers: [ResultLanguagesService],
    }).compile();

    controller = module.get<ResultLanguagesController>(
      ResultLanguagesController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
