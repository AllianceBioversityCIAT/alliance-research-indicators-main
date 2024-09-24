import { Test, TestingModule } from '@nestjs/testing';
import { ClarisaLanguagesController } from './clarisa-languages.controller';
import { ClarisaLanguagesService } from './clarisa-languages.service';

describe('ClarisaLanguagesController', () => {
  let controller: ClarisaLanguagesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClarisaLanguagesController],
      providers: [ClarisaLanguagesService],
    }).compile();

    controller = module.get<ClarisaLanguagesController>(
      ClarisaLanguagesController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
