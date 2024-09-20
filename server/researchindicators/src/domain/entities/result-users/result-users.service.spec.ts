import { Test, TestingModule } from '@nestjs/testing';
import { ResultUsersService } from './result-users.service';

describe('ResultUsersService', () => {
  let service: ResultUsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ResultUsersService],
    }).compile();

    service = module.get<ResultUsersService>(ResultUsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
