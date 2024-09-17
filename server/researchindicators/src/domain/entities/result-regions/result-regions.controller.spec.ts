import { Test, TestingModule } from '@nestjs/testing';
import { ResultRegionsController } from './result-regions.controller';
import { ResultRegionsService } from './result-regions.service';

describe('ResultRegionsController', () => {
  let controller: ResultRegionsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResultRegionsController],
      providers: [ResultRegionsService],
    }).compile();

    controller = module.get<ResultRegionsController>(ResultRegionsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
