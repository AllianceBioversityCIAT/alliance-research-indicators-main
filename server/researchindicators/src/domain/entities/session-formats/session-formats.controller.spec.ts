import { Test, TestingModule } from '@nestjs/testing';
import { SessionFormatsController } from './session-formats.controller';
import { SessionFormatsService } from './session-formats.service';

describe('SessionFormatsController', () => {
  let controller: SessionFormatsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SessionFormatsController],
      providers: [SessionFormatsService],
    }).compile();

    controller = module.get<SessionFormatsController>(SessionFormatsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
