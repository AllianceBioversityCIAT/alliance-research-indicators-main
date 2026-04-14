import { Test, TestingModule } from '@nestjs/testing';
import { ResultImpactAreaGlobalTargetsController } from './result-impact-area-global-targets.controller';
import { ResultImpactAreaGlobalTargetsService } from './result-impact-area-global-targets.service';

describe('ResultImpactAreaGlobalTargetsController', () => {
  let controller: ResultImpactAreaGlobalTargetsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResultImpactAreaGlobalTargetsController],
      providers: [
        {
          provide: ResultImpactAreaGlobalTargetsService,
          useValue: {},
        },
      ],
    }).compile();
    controller = module.get(ResultImpactAreaGlobalTargetsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
