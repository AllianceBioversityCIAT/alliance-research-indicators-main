import { Test, TestingModule } from '@nestjs/testing';
import { ResultStrategicObjectivesController } from './result-strategic-objectives.controller';
import { ResultStrategicObjectivesService } from './result-strategic-objectives.service';

describe('ResultStrategicObjectivesController', () => {
  let controller: ResultStrategicObjectivesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResultStrategicObjectivesController],
      providers: [ResultStrategicObjectivesService],
    }).compile();

    controller = module.get<ResultStrategicObjectivesController>(ResultStrategicObjectivesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
