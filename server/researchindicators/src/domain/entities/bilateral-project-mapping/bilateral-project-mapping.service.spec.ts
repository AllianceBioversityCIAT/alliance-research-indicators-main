import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BilateralProjectMappingService } from './bilateral-project-mapping.service';
import { BilateralProjectMapping } from './entities/bilateral-project-mapping.entity';
import { BilateralProjectMappingRepository } from './repositories/bilateral-project-mapping.repository';
import { AgressoContract } from '../agresso-contract/entities/agresso-contract.entity';
import { ClarisaProjectsService } from '../../tools/clarisa/projects/clarisa-projects.service';
import { MappingSourceEnum } from './enum/mapping-source.enum';
import { User } from '../../complementary-entities/secondary/user/user.entity';
import { ReportingYearResolver } from '../../shared/utils/reporting-year.resolver';
import { LoggerUtil } from '../../shared/utils/logger.util';

// @sdd-spec docs/specs/bilateral-module/pending-items — T-15.14 / T-15.6
// @sdd-spec docs/specs/changes/bilateral-mapping-table-enhancements — T-BTE-01 / T-BTE-04 / R-BTE-002 / NFR-BTE-003
// Covers R-BIL-078 (lookup helper) + R-BIL-080 scenarios (create, conflict,
// deactivate, role flow). Role-deny path is exercised in the controller spec.

const fakeUser = { sec_user_id: 42 } as User;
const CURRENT_YEAR = 2026;

type UpsertResult = BilateralProjectMapping & {
  outcome?: 'created' | 'updated';
};

type ActivateFn = (
  id: number,
  user: User,
  notes?: string,
) => Promise<BilateralProjectMapping>;

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

  // HEAD's create() adds `is_active = true` to the lock query, so an
  // inactive-only agreement looks absent and is inserted. The upsert looks
  // up the current-year row in any state. getOne follows that difference.
  const lockLookup = (row: Record<string, unknown> | null) => {
    const clauses: string[] = [];
    const qb = makeQb();
    const record = (sql: unknown) => {
      if (typeof sql === 'string') clauses.push(sql);
      return qb;
    };
    qb.where = jest.fn().mockImplementation(record);
    qb.andWhere = jest.fn().mockImplementation(record);
    qb.getOne = jest.fn().mockImplementation(async () => {
      const filtersActive = clauses.some((clause) =>
        clause.includes('is_active'),
      );
      return filtersActive ? null : row;
    });
    txCreateQueryBuilder.mockReturnValue(qb);
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

  const bilateralFeed = [
    {
      id: 1403,
      short_name: 'B-A1676',
      full_name: 'Sustainable Rice-Wheat Cropping Initiatives',
    },
    { id: 1404, short_name: 'B-A1677', full_name: 'Cassava Seed Systems' },
  ];

  const mockClarisaProjectsService = {
    listBilateralProjects: jest.fn().mockResolvedValue(bilateralFeed),
    findProjectById: jest.fn().mockResolvedValue(null),
  };

  const mockReportingYearResolver = {
    resolve: jest.fn().mockResolvedValue(CURRENT_YEAR),
  };

  const mockRepo = {
    findOne: repoFindOne,
    save: repoSave,
    createQueryBuilder: jest.fn().mockReturnValue(makeQb()),
  };

  beforeEach(async () => {
    mockReportingYearResolver.resolve.mockReset();
    mockReportingYearResolver.resolve.mockResolvedValue(CURRENT_YEAR);
    mockClarisaProjectsService.findProjectById.mockReset();
    mockClarisaProjectsService.findProjectById.mockResolvedValue(null);
    mockClarisaProjectsService.listBilateralProjects.mockReset();
    mockClarisaProjectsService.listBilateralProjects.mockResolvedValue(
      bilateralFeed,
    );
    mockDataSource.transaction.mockReset();
    mockDataSource.transaction.mockImplementation(async (fn) =>
      fn({ getRepository: txGetRepository }),
    );
    repoFindOne.mockReset();
    repoSave.mockReset();
    txCreate.mockReset();
    txSave.mockReset();
    txCreateQueryBuilder.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BilateralProjectMappingService,
        { provide: BilateralProjectMappingRepository, useValue: mockRepo },
        { provide: DataSource, useValue: mockDataSource },
        {
          provide: ClarisaProjectsService,
          useValue: mockClarisaProjectsService,
        },
        {
          provide: ReportingYearResolver,
          useValue: mockReportingYearResolver,
        },
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
        where: {
          agresso_agreement_id: 'D527',
          is_active: true,
          reporting_year: CURRENT_YEAR,
        },
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

      expect(result).toEqual({
        id: 7,
        agresso_agreement_id: 'D527',
        outcome: 'created',
      });
      expect(txCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          agresso_agreement_id: 'D527',
          reporting_year: CURRENT_YEAR,
          clarisa_project_id: 1,
          clarisa_external_code: null,
          source: MappingSourceEnum.MANUAL,
          is_active: true,
          created_by: 42,
          updated_by: 42,
        }),
      );
      expect(txSave).toHaveBeenCalled();
    });

    it('create on an active row updates that row and stays active', async () => {
      const active = {
        id: 1,
        agresso_agreement_id: 'D527',
        reporting_year: CURRENT_YEAR,
        clarisa_project_id: 1,
        source: MappingSourceEnum.DERIVED,
        is_active: true,
      };
      lockLookup(active);
      txSave.mockImplementation(async (row) => row);

      const result = (await service.create(
        { agresso_agreement_id: 'D527', clarisa_project_id: 2 },
        fakeUser,
      )) as UpsertResult;

      expect(result.id).toBe(1);
      expect(result.is_active).toBe(true);
      expect(result.outcome).toBe('updated');
      expect(result.source).toBe(MappingSourceEnum.MANUAL);
      expect(txCreate).not.toHaveBeenCalled();
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
        reporting_year: CURRENT_YEAR,
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
      const row = {
        id: 5,
        is_active: true,
        agresso_agreement_id: 'D527',
        reporting_year: CURRENT_YEAR,
      };
      repoFindOne.mockResolvedValueOnce(row);
      repoSave.mockImplementation(async (x) => x);

      const out = await service.deactivate(5, fakeUser, 'wrong project');

      expect(out.is_active).toBe(false);
      expect(out.deleted_at).toBeInstanceOf(Date);
      expect(out.updated_by).toBe(42);
      expect(out.notes).toBe('wrong project');
    });

    it('is idempotent when the row is already inactive', async () => {
      const row = {
        id: 5,
        is_active: false,
        reporting_year: CURRENT_YEAR,
      };
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
        {
          ac_description: 'Rice-Wheat Initiative',
          ac_projectDescription: null,
        },
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
          clarisa_project_full_name:
            'Sustainable Rice-Wheat Cropping Initiatives',
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
        {
          id: 1,
          agresso_agreement_id: 'UNKNOWN_AGREEMENT',
          clarisa_project_id: 999,
        },
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
      expect(qbMapped.andWhere).toHaveBeenCalledWith(
        'bpm.is_active = :is_active',
        {
          is_active: true,
        },
      );

      // Test status = 'inactive'
      const qbInactive = makeQb({
        getRawAndEntities: async () => ({ entities: [], raw: [] }),
        getCount: async () => 0,
      });
      mockRepo.createQueryBuilder.mockReturnValueOnce(qbInactive);
      await service.list({ status: 'inactive' });
      expect(qbInactive.andWhere).toHaveBeenCalledWith(
        'bpm.is_active = :is_active',
        {
          is_active: false,
        },
      );

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

    it('scopes an unfiltered list to the current reporting year (R-APM-004 AC.2)', async () => {
      const qb = makeQb({
        getRawAndEntities: async () => ({
          entities: [
            {
              id: 1,
              reporting_year: CURRENT_YEAR,
              clarisa_project_id: 1403,
            },
          ],
          raw: [{}],
        }),
        getCount: async () => 1,
      });
      mockRepo.createQueryBuilder.mockReturnValueOnce(qb);

      const out = await service.list({});

      expect(qb.andWhere).toHaveBeenCalledWith(
        'bpm.reporting_year = :reportingYear',
        { reportingYear: CURRENT_YEAR },
      );
      expect(out.items[0].reporting_year).toBe(CURRENT_YEAR);
    });
  });

  // @akili-spec docs/specs/bilateral/annualized-project-mapping — T-06 /
  // R-APM-006 AC.1–4, R-APM-004 by-id 404, R-APM-011 activate.
  describe('create upsert (R-APM-006)', () => {
    it('create on an absent row returns outcome created', async () => {
      lockLookup(null);
      txCreate.mockImplementation((row) => row);
      txSave.mockImplementation(async (row) => ({ id: 7, ...row }));
      mockClarisaProjectsService.findProjectById.mockResolvedValue({
        id: 1,
        external_code: 'B-D527',
      });

      const result = (await service.create(
        {
          agresso_agreement_id: 'D527',
          clarisa_project_id: 1,
          source: MappingSourceEnum.AI_SUGGESTED,
        },
        fakeUser,
      )) as UpsertResult;

      expect(result.outcome).toBe('created');
      expect(result.id).toBe(7);
      expect(result.is_active).toBe(true);
      expect(txCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          agresso_agreement_id: 'D527',
          reporting_year: CURRENT_YEAR,
          clarisa_project_id: 1,
          clarisa_external_code: 'D527',
          source: MappingSourceEnum.MANUAL,
          is_active: true,
          created_by: 42,
          updated_by: 42,
        }),
      );
    });

    it('create on an absent row with source AI_AUTO stores MANUAL (R-APM-006 AC.5)', async () => {
      lockLookup(null);
      txCreate.mockImplementation((row) => row);
      txSave.mockImplementation(async (row) => ({ id: 31, ...row }));
      mockClarisaProjectsService.findProjectById.mockResolvedValue({
        id: 1,
        external_code: 'B-D527',
      });

      const result = (await service.create(
        {
          agresso_agreement_id: 'D900',
          clarisa_project_id: 1,
          source: MappingSourceEnum.AI_AUTO,
        },
        fakeUser,
      )) as UpsertResult;

      expect(result.outcome).toBe('created');
      expect(result.source).toBe(MappingSourceEnum.MANUAL);
    });

    it('create on an inactive row returns the same id and stays inactive', async () => {
      const inactive = {
        id: 11,
        agresso_agreement_id: 'A1697',
        reporting_year: CURRENT_YEAR,
        clarisa_project_id: 1,
        clarisa_external_code: 'OLD',
        clarisa_project_short_name: 'old',
        source: MappingSourceEnum.DERIVED,
        is_active: false,
        notes: 'kept',
      };
      lockLookup(inactive);
      txCreate.mockImplementation((row) => row);
      txSave.mockImplementation(async (row) => ({
        id: (row as { id?: number }).id ?? 99,
        ...row,
      }));
      mockClarisaProjectsService.findProjectById.mockResolvedValue({
        id: 2,
        external_code: 'C-NEW',
      });

      const result = (await service.create(
        {
          agresso_agreement_id: 'A1697',
          clarisa_project_id: 2,
          clarisa_project_short_name: 'new-short',
          source: MappingSourceEnum.AI_SUGGESTED,
        },
        fakeUser,
      )) as UpsertResult;

      expect(result.id).toBe(11);
      expect(result.is_active).toBe(false);
      expect(result.outcome).toBe('updated');
      expect(result.source).toBe(MappingSourceEnum.MANUAL);
      expect(result.clarisa_project_id).toBe(2);
      expect(result.clarisa_project_short_name).toBe('new-short');
      expect(result.clarisa_external_code).toBe('NEW');
      expect(txCreate).not.toHaveBeenCalled();
    });

    it('forces MANUAL when the same project is resubmitted and keeps clarisa_external_code', async () => {
      const inactive = {
        id: 12,
        agresso_agreement_id: 'A1697',
        reporting_year: CURRENT_YEAR,
        clarisa_project_id: 5,
        clarisa_external_code: 'KEEP',
        source: MappingSourceEnum.DERIVED,
        is_active: false,
      };
      lockLookup(inactive);
      txCreate.mockImplementation((row) => row);
      txSave.mockImplementation(async (row) => ({
        id: (row as { id?: number }).id ?? 99,
        ...row,
      }));

      const result = (await service.create(
        {
          agresso_agreement_id: 'A1697',
          clarisa_project_id: 5,
          source: MappingSourceEnum.AI_AUTO,
        },
        fakeUser,
      )) as UpsertResult;

      expect(result.id).toBe(12);
      expect(result.source).toBe(MappingSourceEnum.MANUAL);
      expect(result.clarisa_external_code).toBe('KEEP');
      expect(result.is_active).toBe(false);
      expect(mockClarisaProjectsService.findProjectById).not.toHaveBeenCalled();
    });

    it('retries once when the first transaction fails with errno 1213', async () => {
      lockLookup(null);
      txCreate.mockImplementation((row) => row);
      txSave.mockImplementation(async (row) => ({ id: 21, ...row }));
      mockDataSource.transaction.mockReset();
      mockDataSource.transaction
        .mockRejectedValueOnce({
          errno: 1213,
          code: 'ER_LOCK_DEADLOCK',
          message: 'Deadlock found when trying to get lock',
        })
        .mockImplementationOnce(async (fn) =>
          fn({ getRepository: txGetRepository }),
        );

      const result = (await service.create(
        { agresso_agreement_id: 'D527', clarisa_project_id: 1 },
        fakeUser,
      )) as UpsertResult;

      expect(mockDataSource.transaction).toHaveBeenCalledTimes(2);
      expect(result.id).toBe(21);
      expect(result.outcome).toBe('created');
    });

    it('surfaces a second 1213 as an HttpException, not the driver message', async () => {
      mockDataSource.transaction.mockReset();
      mockDataSource.transaction.mockRejectedValue({
        errno: 1213,
        code: 'ER_LOCK_DEADLOCK',
        message: 'Deadlock found when trying to get lock',
      });

      await expect(
        service.create(
          { agresso_agreement_id: 'D527', clarisa_project_id: 1 },
          fakeUser,
        ),
      ).rejects.toBeInstanceOf(HttpException);

      try {
        await service.create(
          { agresso_agreement_id: 'D527', clarisa_project_id: 1 },
          fakeUser,
        );
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        expect((error as HttpException).getStatus()).toBe(409);
        expect((error as HttpException).message).not.toContain(
          'Deadlock found',
        );
      }
    });

    it('sets clarisa_external_code to null and warns when the feed throws on create', async () => {
      lockLookup(null);
      txCreate.mockImplementation((row) => row);
      txSave.mockImplementation(async (row) => ({ id: 8, ...row }));
      mockClarisaProjectsService.findProjectById.mockRejectedValue(
        new Error('clarisa down'),
      );
      const warn = jest
        .spyOn(LoggerUtil.prototype, '_warn')
        .mockImplementation(() => undefined);

      const result = (await service.create(
        { agresso_agreement_id: 'D527', clarisa_project_id: 9 },
        fakeUser,
      )) as UpsertResult;

      expect(result.outcome).toBe('created');
      expect(result.clarisa_external_code).toBeNull();
      expect(warn).toHaveBeenCalled();
      warn.mockRestore();
    });
  });

  describe('update ownership (R-APM-006 AC.4)', () => {
    it('PATCH on a DERIVED row forces MANUAL when the project changes', async () => {
      const row = {
        id: 5,
        reporting_year: CURRENT_YEAR,
        clarisa_project_id: 1,
        clarisa_external_code: 'OLD',
        clarisa_project_short_name: 'old',
        source: MappingSourceEnum.DERIVED,
        is_active: true,
      };
      repoFindOne.mockResolvedValueOnce(row);
      repoSave.mockImplementation(async (saved) => saved);
      mockClarisaProjectsService.findProjectById.mockResolvedValue({
        id: 2,
        external_code: 'B-D527',
      });

      const out = await service.update(
        5,
        {
          clarisa_project_id: 2,
          source: MappingSourceEnum.AI_SUGGESTED,
        },
        fakeUser,
      );

      expect(out.source).toBe(MappingSourceEnum.MANUAL);
      expect(out.clarisa_project_id).toBe(2);
      expect(out.clarisa_external_code).toBe('D527');
    });

    it('PATCH a MANUAL row with an unchanged project and source AI_SUGGESTED stays MANUAL (R-APM-006 AC.5)', async () => {
      const row = {
        id: 6,
        reporting_year: CURRENT_YEAR,
        clarisa_project_id: 4,
        clarisa_external_code: 'KEEP',
        source: MappingSourceEnum.MANUAL,
        is_active: true,
      };
      repoFindOne.mockResolvedValueOnce(row);
      repoSave.mockImplementation(async (saved) => saved);

      const out = await service.update(
        6,
        {
          clarisa_project_id: 4,
          source: MappingSourceEnum.AI_SUGGESTED,
        },
        fakeUser,
      );

      expect(out.source).toBe(MappingSourceEnum.MANUAL);
      expect(out.clarisa_project_id).toBe(4);
      expect(out.clarisa_external_code).toBe('KEEP');
    });

    it('PATCH a DERIVED row with an unchanged project stores MANUAL (R-APM-006 AC.5)', async () => {
      const row = {
        id: 8,
        reporting_year: CURRENT_YEAR,
        clarisa_project_id: 4,
        clarisa_external_code: 'KEEP',
        source: MappingSourceEnum.DERIVED,
        is_active: true,
      };
      repoFindOne.mockResolvedValueOnce(row);
      repoSave.mockImplementation(async (saved) => saved);

      const out = await service.update(
        8,
        {
          clarisa_project_id: 4,
          source: MappingSourceEnum.AI_AUTO,
        },
        fakeUser,
      );

      expect(out.source).toBe(MappingSourceEnum.MANUAL);
      expect(out.clarisa_external_code).toBe('KEEP');
    });

    it('sets clarisa_external_code to null and warns when the feed throws on PATCH', async () => {
      const row = {
        id: 5,
        reporting_year: CURRENT_YEAR,
        clarisa_project_id: 1,
        clarisa_external_code: 'OLD',
        source: MappingSourceEnum.DERIVED,
        is_active: true,
      };
      repoFindOne.mockResolvedValueOnce(row);
      repoSave.mockImplementation(async (saved) => saved);
      mockClarisaProjectsService.findProjectById.mockRejectedValue(
        new Error('clarisa down'),
      );
      const warn = jest
        .spyOn(LoggerUtil.prototype, '_warn')
        .mockImplementation(() => undefined);

      const out = await service.update(5, { clarisa_project_id: 2 }, fakeUser);

      expect(out.clarisa_external_code).toBeNull();
      expect(out.source).toBe(MappingSourceEnum.MANUAL);
      expect(warn).toHaveBeenCalled();
      warn.mockRestore();
    });

    it('returns 404 when update is given a prior-year id', async () => {
      repoFindOne.mockResolvedValueOnce({
        id: 5,
        reporting_year: CURRENT_YEAR - 1,
        is_active: true,
      });

      await expect(
        service.update(5, { notes: 'x' }, fakeUser),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(repoSave).not.toHaveBeenCalled();
    });
  });

  describe('activate (R-APM-011)', () => {
    const activate = (id: number, notes?: string) =>
      (service as unknown as { activate: ActivateFn }).activate(
        id,
        fakeUser,
        notes,
      );

    it('activate is idempotent on an already-active row', async () => {
      const row = {
        id: 5,
        is_active: true,
        reporting_year: CURRENT_YEAR,
        deleted_at: null,
      };
      repoFindOne.mockResolvedValueOnce(row);

      const out = await activate(5);

      expect(out).toBe(row);
      expect(repoSave).not.toHaveBeenCalled();
    });

    it('activate on an inactive current-year row sets is_active and clears deleted_at', async () => {
      const row = {
        id: 5,
        is_active: false,
        reporting_year: CURRENT_YEAR,
        deleted_at: new Date('2026-01-02T00:00:00.000Z'),
        notes: 'old',
      };
      repoFindOne.mockResolvedValueOnce(row);
      repoSave.mockImplementation(async (saved) => saved);

      const out = await activate(5, 'back on');

      expect(out.is_active).toBe(true);
      expect(out.deleted_at).toBeNull();
      expect(out.updated_by).toBe(42);
      expect(out.notes).toBe('back on');
      expect(repoSave).toHaveBeenCalledTimes(1);
    });

    it('activate on a prior-year id returns 404', async () => {
      repoFindOne.mockResolvedValueOnce({
        id: 8,
        reporting_year: CURRENT_YEAR - 1,
        is_active: false,
      });

      await expect(activate(8)).rejects.toBeInstanceOf(NotFoundException);
      expect(repoSave).not.toHaveBeenCalled();
    });
  });

  describe('findById year scope (R-APM-004)', () => {
    it('returns 404 for a prior-year id', async () => {
      repoFindOne.mockReset();
      repoFindOne.mockResolvedValueOnce({
        id: 8,
        reporting_year: CURRENT_YEAR - 1,
      });

      await expect(service.findById(8)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
