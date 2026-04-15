import { Test, TestingModule } from '@nestjs/testing';
import { QuantificationRolesController } from './quantification-roles.controller';
import { QuantificationRolesService } from './quantification-roles.service';

describe('QuantificationRolesController', () => {
  let controller: QuantificationRolesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [QuantificationRolesController],
      providers: [{ provide: QuantificationRolesService, useValue: {} }],
    }).compile();
    controller = module.get(QuantificationRolesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
