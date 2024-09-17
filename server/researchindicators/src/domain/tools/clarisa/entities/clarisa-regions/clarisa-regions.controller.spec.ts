import { Test, TestingModule } from '@nestjs/testing';
import { ClarisaRegionsController } from './clarisa-regions.controller';
import { ClarisaRegionsService } from './clarisa-regions.service';

describe('ClarisaRegionsController', () => {
  let controller: ClarisaRegionsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClarisaRegionsController],
      providers: [ClarisaRegionsService],
    }).compile();

    controller = module.get<ClarisaRegionsController>(ClarisaRegionsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
