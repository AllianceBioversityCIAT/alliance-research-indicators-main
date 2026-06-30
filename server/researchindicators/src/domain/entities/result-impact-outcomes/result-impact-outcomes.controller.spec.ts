import { Test, TestingModule } from '@nestjs/testing';
import { ResultImpactOutcomesController } from './result-impact-outcomes.controller';
import { ResultImpactOutcomesService } from './result-impact-outcomes.service';

describe('ResultImpactOutcomesController', () => {
  let controller: ResultImpactOutcomesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResultImpactOutcomesController],
      providers: [{ provide: ResultImpactOutcomesService, useValue: {} }],
    }).compile();

    controller = module.get<ResultImpactOutcomesController>(ResultImpactOutcomesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
