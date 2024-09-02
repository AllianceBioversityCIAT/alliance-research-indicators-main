import { Test, TestingModule } from '@nestjs/testing';
import { UserAgressoContractsService } from './user-agresso-contracts.service';

describe('UserAgressoContractsService', () => {
  let service: UserAgressoContractsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UserAgressoContractsService],
    }).compile();

    service = module.get<UserAgressoContractsService>(
      UserAgressoContractsService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
