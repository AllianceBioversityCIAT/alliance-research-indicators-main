import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BilateralProjectMappingService } from './bilateral-project-mapping.service';
import { BilateralProjectMappingRepository } from './repositories/bilateral-project-mapping.repository';
import { MappingSourceEnum } from './enum/mapping-source.enum';
import { User } from '../../complementary-entities/secondary/user/user.entity';

// @sdd-spec docs/specs/bilateral-module/pending-items — T-15.14 / T-15.6
// Covers R-BIL-078 (lookup helper) + R-BIL-080 scenarios (create, conflict,
// deactivate, role flow). Role-deny path is exercised in the controller spec.

const fakeUser = { sec_user_id: 42 } as User;

describe('BilateralProjectMappingService', () => {
  let service: BilateralProjectMappingService;

  const repoFindOne = jest.fn();
  const repoSave = jest.fn();

  // chainable QB stub — accepts plain async impls for getOne / getManyAndCount.
  type QbImpl = {
    getOne?: () => Promise<unknown>;
    getManyAndCount?: () => Promise<[unknown[], number]>;
  };
  const makeQb = (impl: QbImpl = {}) => {
    const qb: Record<string, jest.Mock> = {};
    qb.orderBy = jest.fn().mockReturnValue(qb);
    qb.skip = jest.fn().mockReturnValue(qb);
    qb.take = jest.fn().mockReturnValue(qb);
    qb.andWhere = jest.fn().mockReturnValue(qb);
    qb.where = jest.fn().mockReturnValue(qb);
    qb.setLock = jest.fn().mockReturnValue(qb);
    qb.getOne = jest
      .fn()
      .mockImplementation(impl.getOne ?? (() => Promise.resolve(null)));
    qb.getManyAndCount = jest
      .fn()
      .mockImplementation(
        impl.getManyAndCount ?? (() => Promise.resolve([[], 0])),
      );
    return qb;
  };

  const txCreate = jest.fn();
  const txSave = jest.fn();
  const txCreateQueryBuilder = jest.fn();
  const txGetRepository = jest.fn().mockReturnValue({
    create: txCreate,
    save: txSave,
    createQueryBuilder: txCreateQueryBuilder,
  });

  const mockDataSource = {
    transaction: jest
      .fn()
      .mockImplementation(async (fn) => fn({ getRepository: txGetRepository })),
  };

  const mockRepo = {
    findOne: repoFindOne,
    save: repoSave,
    createQueryBuilder: jest.fn().mockReturnValue(makeQb()),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BilateralProjectMappingService,
        { provide: BilateralProjectMappingRepository, useValue: mockRepo },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get(BilateralProjectMappingService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findActiveByAgreementId (R-BIL-078)', () => {
    it('returns the active row when one exists', async () => {
      const row = { id: 1, agresso_agreement_id: 'D527', is_active: true };
      repoFindOne.mockResolvedValueOnce(row);

      const found = await service.findActiveByAgreementId('D527');

      expect(found).toBe(row);
      expect(repoFindOne).toHaveBeenCalledWith({
        where: { agresso_agreement_id: 'D527', is_active: true },
        order: { updated_at: 'DESC' },
      });
    });

    it('returns null when no active row exists', async () => {
      repoFindOne.mockResolvedValueOnce(null);
      expect(await service.findActiveByAgreementId('ZZZ999')).toBeNull();
    });

    it('trims input and short-circuits on empty', async () => {
      expect(await service.findActiveByAgreementId('')).toBeNull();
      expect(await service.findActiveByAgreementId('   ')).toBeNull();
      expect(repoFindOne).not.toHaveBeenCalled();
    });
  });

  describe('create (R-BIL-080)', () => {
    it('inserts when no active mapping exists for the contract', async () => {
      txCreateQueryBuilder.mockReturnValue(
        makeQb({ getOne: async () => null }),
      );
      txCreate.mockImplementation((x) => x);
      txSave.mockResolvedValue({ id: 7, agresso_agreement_id: 'D527' });

      const result = await service.create(
        {
          agresso_agreement_id: 'D527',
          clarisa_project_id: 1,
          clarisa_project_short_name: 'T-PJ-003262-...',
        },
        fakeUser,
      );

      expect(result).toEqual({ id: 7, agresso_agreement_id: 'D527' });
      expect(txCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          agresso_agreement_id: 'D527',
          clarisa_project_id: 1,
          source: MappingSourceEnum.MANUAL,
          is_active: true,
          created_by: 42,
          updated_by: 42,
        }),
      );
      expect(txSave).toHaveBeenCalled();
    });

    it('throws ConflictException when an active mapping already exists', async () => {
      txCreateQueryBuilder.mockReturnValue(
        makeQb({
          getOne: async () => ({
            id: 1,
            agresso_agreement_id: 'D527',
            is_active: true,
          }),
        }),
      );

      await expect(
        service.create(
          { agresso_agreement_id: 'D527', clarisa_project_id: 2 },
          fakeUser,
        ),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(txSave).not.toHaveBeenCalled();
    });

    it('trims agreement_id before lookup + insert', async () => {
      const captureWhere = jest.fn();
      const qb = makeQb({ getOne: async () => null });
      qb.where = jest.fn().mockImplementation((sql, params) => {
        captureWhere(params);
        return qb;
      });
      txCreateQueryBuilder.mockReturnValue(qb);
      txCreate.mockImplementation((x) => x);
      txSave.mockResolvedValue({ id: 8 });

      await service.create(
        { agresso_agreement_id: '  D527  ', clarisa_project_id: 1 },
        fakeUser,
      );

      expect(captureWhere).toHaveBeenCalledWith({ id: 'D527' });
      expect(txCreate).toHaveBeenCalledWith(
        expect.objectContaining({ agresso_agreement_id: 'D527' }),
      );
    });
  });

  describe('update', () => {
    it('updates only the fields supplied and stamps updated_by', async () => {
      const row = {
        id: 5,
        agresso_agreement_id: 'D527',
        clarisa_project_id: 1,
        clarisa_project_short_name: 'old',
        source: MappingSourceEnum.MANUAL,
        confidence_score: null,
        notes: null,
        is_active: true,
        updated_by: null,
      };
      repoFindOne.mockResolvedValueOnce(row);
      repoSave.mockImplementation(async (x) => x);

      const out = await service.update(5, { notes: 'updated' }, fakeUser);

      expect(out.notes).toBe('updated');
      expect(out.clarisa_project_short_name).toBe('old');
      expect(out.updated_by).toBe(42);
    });

    it('404s when the row does not exist', async () => {
      repoFindOne.mockResolvedValueOnce(null);
      await expect(service.update(999, {}, fakeUser)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('deactivate (R-BIL-080)', () => {
    it('sets is_active=false, deleted_at, updated_by; preserves audit history', async () => {
      const row = { id: 5, is_active: true, agresso_agreement_id: 'D527' };
      repoFindOne.mockResolvedValueOnce(row);
      repoSave.mockImplementation(async (x) => x);

      const out = await service.deactivate(5, fakeUser, 'wrong project');

      expect(out.is_active).toBe(false);
      expect(out.deleted_at).toBeInstanceOf(Date);
      expect(out.updated_by).toBe(42);
      expect(out.notes).toBe('wrong project');
    });

    it('is idempotent when the row is already inactive', async () => {
      const row = { id: 5, is_active: false };
      repoFindOne.mockResolvedValueOnce(row);

      const out = await service.deactivate(5, fakeUser);

      expect(out).toBe(row);
      expect(repoSave).not.toHaveBeenCalled();
    });

    it('404s when the row does not exist', async () => {
      repoFindOne.mockResolvedValueOnce(null);
      await expect(service.deactivate(999, fakeUser)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('list', () => {
    it('paginates with sensible defaults and exposes meta', async () => {
      const qb = makeQb({
        getManyAndCount: async () => [[{ id: 1 }, { id: 2 }], 2],
      });
      mockRepo.createQueryBuilder.mockReturnValueOnce(qb);

      const out = await service.list({});

      expect(out.items).toHaveLength(2);
      expect(out.meta).toEqual({ total: 2, page: 1, limit: 50, totalPages: 1 });
      expect(qb.skip).toHaveBeenCalledWith(0);
      expect(qb.take).toHaveBeenCalledWith(50);
    });

    it('filters on is_active, source, and search', async () => {
      const qb = makeQb({ getManyAndCount: async () => [[], 0] });
      mockRepo.createQueryBuilder.mockReturnValueOnce(qb);

      await service.list({
        is_active: true,
        source: MappingSourceEnum.MANUAL,
        search: 'D527',
        page: 2,
        limit: 10,
      });

      expect(qb.andWhere).toHaveBeenCalledWith('bpm.is_active = :is_active', {
        is_active: true,
      });
      expect(qb.andWhere).toHaveBeenCalledWith('bpm.source = :source', {
        source: MappingSourceEnum.MANUAL,
      });
      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('bpm.agresso_agreement_id LIKE :s'),
        { s: '%D527%' },
      );
      expect(qb.skip).toHaveBeenCalledWith(10);
      expect(qb.take).toHaveBeenCalledWith(10);
    });
  });
});
