import { Test, TestingModule } from '@nestjs/testing';
import { LeverRolesController } from './lever-roles.controller';
import { LeverRolesService } from './lever-roles.service';

describe('LeverRolesController', () => {
  let controller: LeverRolesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LeverRolesController],
      providers: [LeverRolesService],
    }).compile();

    controller = module.get<LeverRolesController>(LeverRolesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
