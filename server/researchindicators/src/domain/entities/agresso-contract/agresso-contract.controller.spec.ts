import { Test, TestingModule } from '@nestjs/testing';
import { AgressoContractController } from './agresso-contract.controller';
import { AgressoContractService } from './agresso-contract.service';

describe('AgressoContractController', () => {
  let controller: AgressoContractController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AgressoContractController],
      providers: [AgressoContractService],
    }).compile();

    controller = module.get<AgressoContractController>(AgressoContractController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
