import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { LeverSdgTargetsService } from './lever-sdg-targets.service';
import { LeverSdgTarget } from './entities/lever-sdg-target.entity';
import {
  CurrentUserUtil,
  SetAuditEnum,
} from '../../shared/utils/current-user.util';

describe('LeverSdgTargetsService', () => {
  let service: LeverSdgTargetsService;
  const find = jest.fn();
  const update = jest.fn();
  const transaction = jest.fn();

  const mockRepository = {
    find,
    update,
    metadata: {
      primaryColumns: [{ propertyName: 'id' }],
    },
  };

  const mockDataSource = {
    getRepository: jest.fn().mockReturnValue(mockRepository),
    transaction,
  };

  const mockCurrentUser = {
    user_id: 1,
    audit: jest.fn((set: SetAuditEnum) =>
      set === SetAuditEnum.UPDATE ? { updated_by: 1 } : {},
    ),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeverSdgTargetsService,
        { provide: DataSource, useValue: mockDataSource },
        { provide: CurrentUserUtil, useValue: mockCurrentUser },
      ],
    }).compile();

    service = module.get<LeverSdgTargetsService>(LeverSdgTargetsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createDataTransaction', () => {
    it('should group sdg targets by lever_id and call create per lever', async () => {
      transaction.mockImplementation(
        async (cb: (m: unknown) => Promise<void>) => cb({}),
      );
      const createSpy = jest
        .spyOn(service, 'create')
        .mockResolvedValue([] as any);

      await service.createDataTransaction({
        leverSdgTargetList: [
          { lever_id: 1, sdg_target_id: 10 },
          { lever_id: 1, sdg_target_id: 20 },
          { lever_id: 2, sdg_target_id: 30 },
        ],
      });

      expect(transaction).toHaveBeenCalled();
      expect(createSpy).toHaveBeenCalledTimes(2);
      expect(createSpy).toHaveBeenNthCalledWith(
        1,
        1,
        [{ sdg_target_id: 10 }, { sdg_target_id: 20 }],
        'sdg_target_id',
        undefined,
        {},
      );
      expect(createSpy).toHaveBeenNthCalledWith(
        2,
        2,
        [{ sdg_target_id: 30 }],
        'sdg_target_id',
        undefined,
        {},
      );
      createSpy.mockRestore();
    });

    it('should wrap transaction errors as BadRequestException', async () => {
      transaction.mockRejectedValue(new Error('db'));

      await expect(
        service.createDataTransaction({
          leverSdgTargetList: [{ lever_id: 1, sdg_target_id: 1 }],
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('softDelete', () => {
    it('should soft-delete when row exists', async () => {
      update.mockResolvedValue({ affected: 1 });

      const res = await service.softDelete(5);

      expect(update).toHaveBeenCalledWith(
        5,
        expect.objectContaining({
          is_active: false,
          deleted_at: expect.any(Date),
          updated_by: 1,
        }),
      );
      expect(res.affected).toBe(1);
    });

    it('should wrap zero affected (inner NotFound) as BadRequestException in catch', async () => {
      update.mockResolvedValue({ affected: 0 });

      await expect(service.softDelete(999)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findAll', () => {
    it('should find with lever and sdg_target relations', async () => {
      const rows = [{ id: 1 } as LeverSdgTarget];
      find.mockResolvedValue(rows);

      const result = await service.findAll();

      expect(find).toHaveBeenCalledWith(
        expect.objectContaining({
          select: expect.objectContaining({
            id: true,
            lever: expect.any(Object),
            sdg_target: expect.any(Object),
          }),
          relations: { lever: true, sdg_target: true },
          where: { is_active: true },
          order: {
            lever: { id: 'ASC' },
            sdg_target: { sdg_target_code: 'ASC' },
          },
        }),
      );
      expect(result).toBe(rows);
    });
  });

  describe('findByLeverId', () => {
    it('should return full rows when onlySdgTargets is false', async () => {
      const rows = [
        {
          id: 1,
          sdg_target: { id: 9 },
          lever: { id: 3 },
        } as LeverSdgTarget,
      ];
      find.mockResolvedValue(rows);

      const result = await service.findByLeverId(3, false);

      expect(find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { lever_id: 3, is_active: true },
          relations: expect.objectContaining({
            sdg_target: { clarisa_sdg: true },
            lever: true,
          }),
          select: expect.objectContaining({
            id: true,
            lever: expect.any(Object),
            sdg_target: expect.any(Object),
          }),
        }),
      );
      expect(result).toBe(rows);
    });

    it('should return only sdg_target entities when onlySdgTargets is true', async () => {
      const sdg = { id: 9, sdg_target_code: '1.1' };
      find.mockResolvedValue([{ id: 1, sdg_target: sdg } as LeverSdgTarget]);

      const result = await service.findByLeverId(3, true);

      expect(find).toHaveBeenCalledWith(
        expect.objectContaining({
          relations: {
            sdg_target: { clarisa_sdg: true },
          },
        }),
      );
      expect(result).toEqual([sdg]);
    });
  });
});
