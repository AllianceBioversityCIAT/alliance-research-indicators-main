import { Test, TestingModule } from '@nestjs/testing';
import { ResultSdgsController } from './result-sdgs.controller';
import { ResultSdgsService } from './result-sdgs.service';

describe('ResultSdgsController', () => {
  let controller: ResultSdgsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResultSdgsController],
      providers: [{ provide: ResultSdgsService, useValue: {} }],
    }).compile();
    controller = module.get(ResultSdgsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
