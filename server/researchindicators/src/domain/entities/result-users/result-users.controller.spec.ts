import { Test, TestingModule } from '@nestjs/testing';
import { ResultUsersController } from './result-users.controller';
import { ResultUsersService } from './result-users.service';

describe('ResultUsersController', () => {
  let controller: ResultUsersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResultUsersController],
      providers: [ResultUsersService],
    }).compile();

    controller = module.get<ResultUsersController>(ResultUsersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
