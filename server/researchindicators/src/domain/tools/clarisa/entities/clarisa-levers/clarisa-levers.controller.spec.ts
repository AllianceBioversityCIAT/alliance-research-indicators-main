import { Test, TestingModule } from '@nestjs/testing';
import { ClarisaLeversController } from './clarisa-levers.controller';
import { ClarisaLeversService } from './clarisa-levers.service';

describe('ClarisaLeversController', () => {
  let controller: ClarisaLeversController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClarisaLeversController],
      providers: [ClarisaLeversService],
    }).compile();

    controller = module.get<ClarisaLeversController>(ClarisaLeversController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
