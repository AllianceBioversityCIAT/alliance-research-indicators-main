import { Test, TestingModule } from '@nestjs/testing';
import { PolicyStagesController } from './policy-stages.controller';
import { PolicyStagesService } from './policy-stages.service';

describe('PolicyStagesController', () => {
  let controller: PolicyStagesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PolicyStagesController],
      providers: [{ provide: PolicyStagesService, useValue: {} }],
    }).compile();
    controller = module.get(PolicyStagesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
