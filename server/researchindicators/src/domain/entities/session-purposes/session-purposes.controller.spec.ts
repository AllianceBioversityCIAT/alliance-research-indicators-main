import { Test, TestingModule } from '@nestjs/testing';
import { SessionPurposesController } from './session-purposes.controller';
import { SessionPurposesService } from './session-purposes.service';

describe('SessionPurposesController', () => {
  let controller: SessionPurposesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SessionPurposesController],
      providers: [SessionPurposesService],
    }).compile();

    controller = module.get<SessionPurposesController>(
      SessionPurposesController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
