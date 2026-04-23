import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { SyncProcessLogStaleService } from './sync-process-log-stale.service';
import { SyncProcessStatusEnum } from './enum/sync-process.enum';

describe('SyncProcessLogStaleService', () => {
  let service: SyncProcessLogStaleService;
  const mockUpdate = jest.fn();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SyncProcessLogStaleService,
        {
          provide: DataSource,
          useValue: {
            getRepository: jest.fn().mockReturnValue({
              update: mockUpdate,
            }),
          },
        },
      ],
    }).compile();

    service = module.get<SyncProcessLogStaleService>(
      SyncProcessLogStaleService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // [CLAUDE/DONE] 148
  describe('markStaleInProgressAsFailed', () => {
    it('should update IN_PROGRESS logs older than cutoff and return affected count', async () => {
      mockUpdate.mockResolvedValue({ affected: 3 });

      const result = await service.markStaleInProgressAsFailed();

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          process_status: SyncProcessStatusEnum.IN_PROGRESS,
        }),
        { process_status: SyncProcessStatusEnum.FAILED },
      );
      expect(result).toEqual({ updated: 3 });
    });

    it('should return updated = 0 when no stale logs are found', async () => {
      mockUpdate.mockResolvedValue({ affected: 0 });

      const result = await service.markStaleInProgressAsFailed();

      expect(result).toEqual({ updated: 0 });
    });

    it('should return updated = 0 when affected is undefined', async () => {
      mockUpdate.mockResolvedValue({ affected: undefined });

      const result = await service.markStaleInProgressAsFailed();

      expect(result).toEqual({ updated: 0 });
    });

    it('should use a cutoff date approximately 24 hours in the past', async () => {
      mockUpdate.mockResolvedValue({ affected: 0 });
      const before = new Date(Date.now() - 25 * 60 * 60 * 1000);
      const after = new Date(Date.now() - 23 * 60 * 60 * 1000);

      await service.markStaleInProgressAsFailed();

      const callArg = mockUpdate.mock.calls[0][0];
      const cutoff = callArg.created_at?.value ?? callArg.created_at;
      expect(new Date(cutoff).getTime()).toBeGreaterThan(before.getTime());
      expect(new Date(cutoff).getTime()).toBeLessThan(after.getTime());
    });
  });
});
