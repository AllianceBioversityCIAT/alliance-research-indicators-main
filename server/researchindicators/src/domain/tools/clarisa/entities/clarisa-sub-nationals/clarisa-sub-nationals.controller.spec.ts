import { Test, TestingModule } from '@nestjs/testing';
import { ClarisaSubNationalsController } from './clarisa-sub-nationals.controller';
import { ClarisaSubNationalsService } from './clarisa-sub-nationals.service';

describe('ClarisaSubNationalsController', () => {
  let controller: ClarisaSubNationalsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClarisaSubNationalsController],
      providers: [ClarisaSubNationalsService],
    }).compile();

    controller = module.get<ClarisaSubNationalsController>(ClarisaSubNationalsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
