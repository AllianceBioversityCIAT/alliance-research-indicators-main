import { Test, TestingModule } from '@nestjs/testing';
import { SessionTypesController } from './session-types.controller';
import { SessionTypesService } from './session-types.service';

describe('SessionTypesController', () => {
  let controller: SessionTypesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SessionTypesController],
      providers: [SessionTypesService],
    }).compile();

    controller = module.get<SessionTypesController>(SessionTypesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
