import { Test, TestingModule } from '@nestjs/testing';
import { ResultLeverSdgTargetsController } from './result-lever-sdg-targets.controller';
import { ResultLeverSdgTargetsService } from './result-lever-sdg-targets.service';

describe('ResultLeverSdgTargetsController', () => {
  let controller: ResultLeverSdgTargetsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResultLeverSdgTargetsController],
      providers: [{ provide: ResultLeverSdgTargetsService, useValue: {} }],
    }).compile();
    controller = module.get(ResultLeverSdgTargetsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
