import { Test, TestingModule } from '@nestjs/testing';
import { ResultLeverStrategicOutcomeController } from './result-lever-strategic-outcome.controller';
import { ResultLeverStrategicOutcomeService } from './result-lever-strategic-outcome.service';

describe('ResultLeverStrategicOutcomeController', () => {
  let controller: ResultLeverStrategicOutcomeController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResultLeverStrategicOutcomeController],
      providers: [
        { provide: ResultLeverStrategicOutcomeService, useValue: {} },
      ],
    }).compile();
    controller = module.get(ResultLeverStrategicOutcomeController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
