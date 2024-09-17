import { Test, TestingModule } from '@nestjs/testing';
import { ContractRolesService } from './contract-roles.service';

describe('ContractRolesService', () => {
  let service: ContractRolesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ContractRolesService],
    }).compile();

    service = module.get<ContractRolesService>(ContractRolesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
