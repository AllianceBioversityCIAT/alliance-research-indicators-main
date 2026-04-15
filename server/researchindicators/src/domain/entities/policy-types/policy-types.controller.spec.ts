import { Test, TestingModule } from '@nestjs/testing';
import { PolicyTypesController } from './policy-types.controller';
import { PolicyTypesService } from './policy-types.service';

describe('PolicyTypesController', () => {
  let controller: PolicyTypesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PolicyTypesController],
      providers: [{ provide: PolicyTypesService, useValue: {} }],
    }).compile();
    controller = module.get(PolicyTypesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
