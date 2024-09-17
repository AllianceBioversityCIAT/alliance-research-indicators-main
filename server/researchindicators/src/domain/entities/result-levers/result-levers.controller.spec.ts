import { Test, TestingModule } from '@nestjs/testing';
import { ResultLeversController } from './result-levers.controller';
import { ResultLeversService } from './result-levers.service';

describe('ResultLeversController', () => {
  let controller: ResultLeversController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResultLeversController],
      providers: [ResultLeversService],
    }).compile();

    controller = module.get<ResultLeversController>(ResultLeversController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
