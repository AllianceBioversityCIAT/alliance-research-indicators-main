import { Test, TestingModule } from '@nestjs/testing';
import { ClarisaSdgTargetsController } from './clarisa-sdg-targets.controller';
import { ClarisaSdgTargetsService } from './clarisa-sdg-targets.service';

describe('ClarisaSdgTargetsController', () => {
  let controller: ClarisaSdgTargetsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClarisaSdgTargetsController],
      providers: [{ provide: ClarisaSdgTargetsService, useValue: {} }],
    }).compile();
    controller = module.get(ClarisaSdgTargetsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
