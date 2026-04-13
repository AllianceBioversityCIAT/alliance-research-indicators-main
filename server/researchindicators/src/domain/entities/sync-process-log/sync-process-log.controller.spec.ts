import { Test, TestingModule } from '@nestjs/testing';
import { SyncProcessLogController } from './sync-process-log.controller';
import { SyncProcessLogService } from './sync-process-log.service';

describe('SyncProcessLogController', () => {
  let controller: SyncProcessLogController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SyncProcessLogController],
      providers: [
        { provide: SyncProcessLogService, useValue: {} },
      ],
    }).compile();
    controller = module.get(SyncProcessLogController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
