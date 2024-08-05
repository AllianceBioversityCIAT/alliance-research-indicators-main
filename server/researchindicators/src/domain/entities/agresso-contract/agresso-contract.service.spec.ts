import { Test, TestingModule } from '@nestjs/testing';
import { AgressoContractService } from './agresso-contract.service';

describe('AgressoContractService', () => {
  let service: AgressoContractService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AgressoContractService],
    }).compile();

    service = module.get<AgressoContractService>(AgressoContractService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
