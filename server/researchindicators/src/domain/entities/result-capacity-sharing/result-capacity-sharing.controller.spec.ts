import { Test, TestingModule } from '@nestjs/testing';
import { ResultCapacitySharingController } from './result-capacity-sharing.controller';
import { ResultCapacitySharingService } from './result-capacity-sharing.service';

describe('ResultCapacitySharingController', () => {
  let controller: ResultCapacitySharingController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResultCapacitySharingController],
      providers: [ResultCapacitySharingService],
    }).compile();

    controller = module.get<ResultCapacitySharingController>(ResultCapacitySharingController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
