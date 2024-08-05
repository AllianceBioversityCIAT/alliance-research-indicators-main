import { Test, TestingModule } from '@nestjs/testing';
import { AgressoContractCountriesController } from './agresso-contract-countries.controller';
import { AgressoContractCountriesService } from './agresso-contract-countries.service';

describe('AgressoContractCountriesController', () => {
  let controller: AgressoContractCountriesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AgressoContractCountriesController],
      providers: [AgressoContractCountriesService],
    }).compile();

    controller = module.get<AgressoContractCountriesController>(AgressoContractCountriesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
