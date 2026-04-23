import { Test, TestingModule } from '@nestjs/testing';
import { ResultImpactAreasController } from './result-impact-areas.controller';
import { ResultImpactAreasService } from './result-impact-areas.service';

describe('ResultImpactAreasController', () => {
  let controller: ResultImpactAreasController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResultImpactAreasController],
      providers: [{ provide: ResultImpactAreasService, useValue: {} }],
    }).compile();
    controller = module.get(ResultImpactAreasController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
