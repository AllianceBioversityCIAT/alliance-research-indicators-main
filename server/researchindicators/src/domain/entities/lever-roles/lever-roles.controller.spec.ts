import { Test, TestingModule } from '@nestjs/testing';
import { LeverRolesController } from './lever-roles.controller';
import { LeverRolesService } from './lever-roles.service';

describe('LeverRolesController', () => {
  let controller: LeverRolesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LeverRolesController],
      providers: [{ provide: LeverRolesService, useValue: {} }],
    }).compile();
    controller = module.get(LeverRolesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
