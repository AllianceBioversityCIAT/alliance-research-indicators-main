import { Test, TestingModule } from '@nestjs/testing';
import { UserAgressoContractsController } from './user-agresso-contracts.controller';
import { UserAgressoContractsService } from './user-agresso-contracts.service';

describe('UserAgressoContractsController', () => {
  let controller: UserAgressoContractsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserAgressoContractsController],
      providers: [UserAgressoContractsService],
    }).compile();

    controller = module.get<UserAgressoContractsController>(
      UserAgressoContractsController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
