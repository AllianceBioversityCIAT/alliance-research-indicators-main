import { Test, TestingModule } from '@nestjs/testing';
import { AgressoContractCountriesService } from './agresso-contract-countries.service';

describe('AgressoContractCountriesService', () => {
  let service: AgressoContractCountriesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AgressoContractCountriesService],
    }).compile();

    service = module.get<AgressoContractCountriesService>(
      AgressoContractCountriesService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
