import { Test, TestingModule } from '@nestjs/testing';
import { PooledFundingContractsController } from './pooled-funding-contracts.controller';
import { PooledFundingContractsService } from './pooled-funding-contracts.service';

describe('PooledFundingContractsController', () => {
  let controller: PooledFundingContractsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PooledFundingContractsController],
      providers: [{ provide: PooledFundingContractsService, useValue: {} }],
    }).compile();
    controller = module.get(PooledFundingContractsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
