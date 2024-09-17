import { Test, TestingModule } from '@nestjs/testing';
import { SessionLengthsController } from './session-lengths.controller';
import { SessionLengthsService } from './session-lengths.service';

describe('SessionLengthsController', () => {
  let controller: SessionLengthsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SessionLengthsController],
      providers: [SessionLengthsService],
    }).compile();

    controller = module.get<SessionLengthsController>(SessionLengthsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
