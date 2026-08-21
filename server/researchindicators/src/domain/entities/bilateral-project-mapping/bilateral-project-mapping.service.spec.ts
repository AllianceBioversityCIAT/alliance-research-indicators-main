import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BilateralProjectMappingService } from './bilateral-project-mapping.service';
import { BilateralProjectMappingRepository } from './repositories/bilateral-project-mapping.repository';
import { AgressoContract } from '../agresso-contract/entities/agresso-contract.entity';
import { ClarisaProjectsService } from '../../tools/clarisa/projects/clarisa-projects.service';
import { MappingSourceEnum } from './enum/mapping-source.enum';
import { User } from '../../complementary-entities/secondary/user/user.entity';

// @sdd-spec docs/specs/bilateral-module/pending-items — T-15.14 / T-15.6
// @sdd-spec docs/specs/changes/bilateral-mapping-table-enhancements — T-BTE-01 / T-BTE-04 / R-BTE-002 / NFR-BTE-003
// Covers R-BIL-078 (lookup helper) + R-BIL-080 scenarios (create, conflict,
// deactivate, role flow). Role-deny path is exercised in the controller spec.

const fakeUser = { sec_user_id: 42 } as User;

describe('BilateralProjectMappingService', () => {
  let service: BilateralProjectMappingService;

  const repoFindOne = jest.fn();
  const repoSave = jest.fn();

  // chainable QB stub — accepts plain async impls for getOne / getRawAndEntities / getCount.
  type QbImpl = {
    getOne?: () => Promise<unknown>;
    getRawAndEntities?: () => Promise<{ entities: unknown[]; raw: unknown[] }>;
    getCount?: () => Promise<number>;
    getManyAndCount?: () => Promise<[unknown[], number]>;
  };
  const makeQb = (impl: QbImpl = {}) => {
    const qb: Record<string, jest.Mock> = {};
    qb.leftJoin = jest.fn().mockReturnValue(qb);
    qb.addSelect = jest.fn().mockReturnValue(qb);
    qb.orderBy = jest.fn().mockReturnValue(qb);
    qb.skip = jest.fn().mockReturnValue(qb);
    qb.take = jest.fn().mockReturnValue(qb);
    qb.andWhere = jest.fn().mockReturnValue(qb);
    qb.where = jest.fn().mockReturnValue(qb);
    qb.setLock = jest.fn().mockReturnValue(qb);
    qb.getOne = jest
      .fn()
      .mockImplementation(impl.getOne ?? (() => Promise.resolve(null)));
    qb.getRawAndEntities = jest
      .fn()
      .mockImplementation(
        impl.getRawAndEntities ??
          (() => Promise.resolve({ entities: [], raw: [] })),
      );
    qb.getCount = jest
      .fn()
      .mockImplementation(impl.getCount ?? (() => Promise.resolve(0)));
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

  const mockClarisaProjectsService = {
    listBilateralProjects: jest.fn().mockResolvedValue([
      { id: 1403, short_name: 'B-A1676', full_name: 'Sustainable Rice-Wheat Cropping Initiatives' },
      { id: 1404, short_name: 'B-A1677', full_name: 'Cassava Seed Systems' },
    ]),
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
        { provide: ClarisaProjectsService, useValue: mockClarisaProjectsService },
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

  describe('list (R-BTE-002 / NFR-BTE-003)', () => {
    it('paginates with sensible defaults, joins AgressoContract, enriches CLARISA titles, and exposes meta', async () => {
      const mockEntities = [
        { id: 1, agresso_agreement_id: 'A1676', clarisa_project_id: 1403 },
        { id: 2, agresso_agreement_id: 'A1677', clarisa_project_id: 1404 },
      ];
      const mockRaw = [
        { ac_description: 'Rice-Wheat Initiative', ac_projectDescription: null },
        { ac_description: null, ac_projectDescription: 'Cassava Breeding' },
      ];

      const qb = makeQb({
        getRawAndEntities: async () => ({
          entities: mockEntities,
          raw: mockRaw,
        }),
        getCount: async () => 2,
      });
      mockRepo.createQueryBuilder.mockReturnValueOnce(qb);

      const out = await service.list({});

      expect(qb.leftJoin).toHaveBeenCalledWith(
        AgressoContract,
        'ac',
        'ac.agreement_id = bpm.agresso_agreement_id',
      );
      expect(qb.addSelect).toHaveBeenCalledWith([
        'ac.description',
        'ac.projectDescription',
      ]);
      expect(out.items).toHaveLength(2);
      expect(out.items[0]).toEqual(
        expect.objectContaining({
          id: 1,
          agresso_agreement_id: 'A1676',
          agresso_description: 'Rice-Wheat Initiative',
          clarisa_project_full_name: 'Sustainable Rice-Wheat Cropping Initiatives',
        }),
      );
      expect(out.items[1]).toEqual(
        expect.objectContaining({
          id: 2,
          agresso_agreement_id: 'A1677',
          agresso_description: 'Cassava Breeding',
          clarisa_project_full_name: 'Cassava Seed Systems',
        }),
      );
      expect(out.meta).toEqual({ total: 2, page: 1, limit: 50, totalPages: 1 });
      expect(qb.skip).toHaveBeenCalledWith(0);
      expect(qb.take).toHaveBeenCalledWith(50);
    });

    it('falls back to null when contract has no description or projectDescription (R-BTE-002 Scenario 2.2)', async () => {
      const mockEntities = [
        { id: 1, agresso_agreement_id: 'UNKNOWN_AGREEMENT', clarisa_project_id: 999 },
      ];
      const mockRaw = [{ ac_description: null, ac_projectDescription: null }];

      const qb = makeQb({
        getRawAndEntities: async () => ({
          entities: mockEntities,
          raw: mockRaw,
        }),
        getCount: async () => 1,
      });
      mockRepo.createQueryBuilder.mockReturnValueOnce(qb);

      const out = await service.list({});

      expect(out.items[0].agresso_description).toBeNull();
      expect(out.items[0].clarisa_project_full_name).toBeNull();
    });

    it('filters on is_active, source, and search across agreement ID, CLARISA short name, and contract descriptions', async () => {
      const qb = makeQb({
        getRawAndEntities: async () => ({ entities: [], raw: [] }),
        getCount: async () => 0,
      });
      mockRepo.createQueryBuilder.mockReturnValueOnce(qb);

      await service.list({
        is_active: true,
        source: MappingSourceEnum.MANUAL,
        search: 'Rice',
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
        '(bpm.agresso_agreement_id LIKE :s OR bpm.clarisa_project_short_name LIKE :s OR ac.description LIKE :s OR ac.projectDescription LIKE :s)',
        { s: '%Rice%' },
      );
      expect(qb.skip).toHaveBeenCalledWith(10);
      expect(qb.take).toHaveBeenCalledWith(10);
    });

    it('filters on status (mapped, inactive, pending, all)', async () => {
      // Test status = 'mapped'
      const qbMapped = makeQb({
        getRawAndEntities: async () => ({ entities: [], raw: [] }),
        getCount: async () => 0,
      });
      mockRepo.createQueryBuilder.mockReturnValueOnce(qbMapped);
      await service.list({ status: 'mapped' });
      expect(qbMapped.andWhere).toHaveBeenCalledWith('bpm.is_active = :is_active', {
        is_active: true,
      });

      // Test status = 'inactive'
      const qbInactive = makeQb({
        getRawAndEntities: async () => ({ entities: [], raw: [] }),
        getCount: async () => 0,
      });
      mockRepo.createQueryBuilder.mockReturnValueOnce(qbInactive);
      await service.list({ status: 'inactive' });
      expect(qbInactive.andWhere).toHaveBeenCalledWith('bpm.is_active = :is_active', {
        is_active: false,
      });

      // Test status = 'pending'
      const qbPending = makeQb({
        getRawAndEntities: async () => ({ entities: [], raw: [] }),
        getCount: async () => 0,
      });
      mockRepo.createQueryBuilder.mockReturnValueOnce(qbPending);
      await service.list({ status: 'pending' });
      expect(qbPending.andWhere).toHaveBeenCalledWith('1 = 0');

      // Test status = 'all'
      const qbAll = makeQb({
        getRawAndEntities: async () => ({ entities: [], raw: [] }),
        getCount: async () => 0,
      });
      mockRepo.createQueryBuilder.mockReturnValueOnce(qbAll);
      await service.list({ status: 'all' });
      expect(qbAll.andWhere).not.toHaveBeenCalledWith(
        expect.stringContaining('is_active'),
        expect.anything(),
      );
    });
  });
});
