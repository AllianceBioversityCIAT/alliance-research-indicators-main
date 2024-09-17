import { Test, TestingModule } from '@nestjs/testing';
import { ResultContractsController } from './result-contracts.controller';
import { ResultContractsService } from './result-contracts.service';

describe('ResultContractsController', () => {
  let controller: ResultContractsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResultContractsController],
      providers: [ResultContractsService],
    }).compile();

    controller = module.get<ResultContractsController>(ResultContractsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
