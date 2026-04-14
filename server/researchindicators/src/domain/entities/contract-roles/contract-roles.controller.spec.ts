import { Test, TestingModule } from '@nestjs/testing';
import { ContractRolesController } from './contract-roles.controller';
import { ContractRolesService } from './contract-roles.service';

describe('ContractRolesController', () => {
  let controller: ContractRolesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ContractRolesController],
      providers: [{ provide: ContractRolesService, useValue: {} }],
    }).compile();
    controller = module.get(ContractRolesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
