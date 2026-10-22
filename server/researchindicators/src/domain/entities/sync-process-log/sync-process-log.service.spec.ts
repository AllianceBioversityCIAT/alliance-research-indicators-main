import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { SyncProcessLogService } from './sync-process-log.service';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';
import {
  SyncProcessEnum,
  SyncProcessStatusEnum,
} from './enum/sync-process.enum';
import { SyncProcessLog } from './entities/sync-process-log.entity';

describe('SyncProcessLogService', () => {
  let service: SyncProcessLogService;
  const mockInsert = jest.fn();
  const mockFindOne = jest.fn();
  const mockUpdate = jest.fn();

  const mockCurrentUser = {
    audit: jest.fn().mockReturnValue({ updated_by: 1, created_by: 1 }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SyncProcessLogService,
        {
          provide: DataSource,
          useValue: {
            getRepository: jest.fn().mockReturnValue({
              insert: mockInsert,
              findOne: mockFindOne,
              update: mockUpdate,
            }),
          },
        },
        {
          provide: CurrentUserUtil,
          useValue: mockCurrentUser,
        },
      ],
    }).compile();

    service = module.get<SyncProcessLogService>(SyncProcessLogService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // [CLAUDE/DONE] 149
  describe('initiateSync', () => {
    it('should insert a new IN_PROGRESS sync log and return it', async () => {
      const insertResult = { identifiers: [{ id: 10 }] };
      const savedLog: Partial<SyncProcessLog> = {
        id: 10,
        process_status: SyncProcessStatusEnum.IN_PROGRESS,
        process_name: SyncProcessEnum.TIP_INTEGRATION,
        created_records: 0,
      };
      mockInsert.mockResolvedValue(insertResult);
      mockFindOne.mockResolvedValue(savedLog);

      const result = await service.initiateSync(
        SyncProcessEnum.TIP_INTEGRATION,
      );

      expect(mockInsert).toHaveBeenCalled();
      expect(mockFindOne).toHaveBeenCalledWith({
        where: { id: 10 },
      });
      expect(result).toEqual(savedLog);
    });

    it('should throw BadRequestException when insert fails', async () => {
      mockInsert.mockRejectedValue(new Error('DB error'));

      await expect(
        service.initiateSync(SyncProcessEnum.TIP_INTEGRATION),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // [CLAUDE/DONE] 150
  describe('update', () => {
    it('should update the sync log counters and return the updated record', async () => {
      const existing: Partial<SyncProcessLog> = {
        id: 5,
        created_records: 10,
        updated_records: 5,
        error_records: 1,
        total_records: 16,
        success_records: 15,
      };
      const updated: Partial<SyncProcessLog> = {
        ...existing,
        created_records: 12,
      };
      mockFindOne
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce(updated);
      mockUpdate.mockResolvedValue(undefined);

      const result = await service.update(5, { createdRecords: 2 } as any);

      expect(mockUpdate).toHaveBeenCalledWith(5, expect.any(Object));
      expect(result).toEqual(updated);
    });

    it('should throw NotFoundException when sync log does not exist', async () => {
      mockFindOne.mockResolvedValue(null);

      await expect(service.update(999, {})).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when update query fails', async () => {
      mockFindOne.mockResolvedValue({
        id: 3,
        created_records: 0,
        updated_records: 0,
        error_records: 0,
      });
      mockUpdate.mockRejectedValue(new Error('DB error'));

      await expect(service.update(3, {})).rejects.toThrow(BadRequestException);
    });
  });

  // [CLAUDE/DONE] 151
  describe('endSync', () => {
    it('should set status to COMPLETED and calculate totals', async () => {
      const existing: Partial<SyncProcessLog> = {
        id: 1,
        created_records: 10,
        updated_records: 5,
        error_records: 2,
        total_records: 0,
        success_records: 0,
      };
      const ended: Partial<SyncProcessLog> = {
        ...existing,
        total_records: 17,
        success_records: 15,
        process_status: SyncProcessStatusEnum.COMPLETED,
      };

      mockFindOne.mockResolvedValueOnce(existing).mockResolvedValueOnce(ended);
      mockUpdate.mockResolvedValue(undefined);
      mockCurrentUser.audit.mockReturnValue({ updated_by: 1 });

      const result = await service.endSync(1);

      expect(mockUpdate).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          total_records: 17,
          success_records: 15,
          process_status: SyncProcessStatusEnum.COMPLETED,
        }),
      );
      expect(result).toEqual(ended);
    });

    it('should throw NotFoundException when sync log does not exist', async () => {
      mockFindOne.mockResolvedValue(null);

      await expect(service.endSync(999)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when update query fails', async () => {
      mockFindOne.mockResolvedValue({
        id: 2,
        created_records: 0,
        updated_records: 0,
        error_records: 0,
      });
      mockUpdate.mockRejectedValue(new Error('DB error'));

      await expect(service.endSync(2)).rejects.toThrow(BadRequestException);
    });
  });

  describe('isInProgressYoungerThan', () => {
    const hours = 6;

    function matchesWhere(
      row: {
        process_name: SyncProcessEnum;
        process_status: SyncProcessStatusEnum;
        created_at: Date;
      },
      where: {
        process_name?: SyncProcessEnum;
        process_status?: SyncProcessStatusEnum;
        created_at?: { type?: string; value?: unknown };
      },
    ): boolean {
      if (
        where.process_name !== undefined &&
        where.process_name !== row.process_name
      ) {
        return false;
      }
      if (
        where.process_status !== undefined &&
        where.process_status !== row.process_status
      ) {
        return false;
      }
      const createdAt = where.created_at;
      if (createdAt == null || typeof createdAt !== 'object') {
        return true;
      }
      const cutoff = createdAt.value;
      if (!(cutoff instanceof Date)) {
        return false;
      }
      if (createdAt.type === 'moreThan') {
        return row.created_at > cutoff;
      }
      if (createdAt.type === 'lessThan') {
        return row.created_at < cutoff;
      }
      return false;
    }

    function stubFindOne(row: {
      process_name: SyncProcessEnum;
      process_status: SyncProcessStatusEnum;
      created_at: Date;
    }) {
      mockFindOne.mockReset();
      mockFindOne.mockImplementation(async (options: { where: object }) =>
        matchesWhere(row, options.where) ? row : null,
      );
    }

    it('refuses when an IN_PROGRESS row is 1 h old', async () => {
      const row = {
        process_name: SyncProcessEnum.TIP_INTEGRATION,
        process_status: SyncProcessStatusEnum.IN_PROGRESS,
        created_at: new Date(Date.now() - 1 * 60 * 60 * 1000),
      };
      stubFindOne(row);

      await expect(
        service.isInProgressYoungerThan(SyncProcessEnum.TIP_INTEGRATION, hours),
      ).resolves.toBe(true);

      const where = mockFindOne.mock.calls[0][0].where;
      expect(where.process_name).toBe(SyncProcessEnum.TIP_INTEGRATION);
      expect(where.process_status).toBe(SyncProcessStatusEnum.IN_PROGRESS);
      expect(where.created_at.type).toBe('moreThan');
      const cutoff = where.created_at.value as Date;
      const ageMs = Date.now() - cutoff.getTime();
      expect(ageMs).toBeGreaterThan(5.9 * 60 * 60 * 1000);
      expect(ageMs).toBeLessThan(6.1 * 60 * 60 * 1000);
    });

    it('allows when an IN_PROGRESS row is 7 h old', async () => {
      stubFindOne({
        process_name: SyncProcessEnum.TIP_INTEGRATION,
        process_status: SyncProcessStatusEnum.IN_PROGRESS,
        created_at: new Date(Date.now() - 7 * 60 * 60 * 1000),
      });

      await expect(
        service.isInProgressYoungerThan(SyncProcessEnum.TIP_INTEGRATION, hours),
      ).resolves.toBe(false);
    });

    it.each([SyncProcessStatusEnum.FAILED, SyncProcessStatusEnum.COMPLETED])(
      'allows when the last row is %s',
      async (processStatus) => {
        stubFindOne({
          process_name: SyncProcessEnum.TIP_INTEGRATION,
          process_status: processStatus,
          created_at: new Date(Date.now() - 1 * 60 * 60 * 1000),
        });

        await expect(
          service.isInProgressYoungerThan(
            SyncProcessEnum.TIP_INTEGRATION,
            hours,
          ),
        ).resolves.toBe(false);
      },
    );

    it('filters by the process argument', async () => {
      mockFindOne.mockReset();
      mockFindOne.mockResolvedValue(null);

      await service.isInProgressYoungerThan(
        SyncProcessEnum.PRMS_INTEGRATION,
        hours,
      );

      expect(mockFindOne).toHaveBeenCalledWith({
        where: expect.objectContaining({
          process_name: SyncProcessEnum.PRMS_INTEGRATION,
          process_status: SyncProcessStatusEnum.IN_PROGRESS,
        }),
      });
    });
  });

  describe('markFailed', () => {
    it('writes process_status FAILED', async () => {
      mockFindOne.mockReset();
      mockFindOne.mockResolvedValue({ id: 4 });
      mockUpdate.mockResolvedValue(undefined);
      mockCurrentUser.audit.mockReturnValue({ updated_by: 1 });

      await service.markFailed(4);

      expect(mockUpdate).toHaveBeenCalledWith(
        4,
        expect.objectContaining({
          process_status: SyncProcessStatusEnum.FAILED,
        }),
      );
    });

    it('throws NotFoundException when the log row does not exist', async () => {
      mockFindOne.mockReset();
      mockFindOne.mockResolvedValue(null);

      await expect(service.markFailed(404)).rejects.toThrow(NotFoundException);
      expect(mockUpdate).not.toHaveBeenCalled();
    });
  });
});
