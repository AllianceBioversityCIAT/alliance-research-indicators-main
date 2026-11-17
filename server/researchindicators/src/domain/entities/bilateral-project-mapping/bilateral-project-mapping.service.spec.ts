import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, NotFoundException } from '@nestjs/common';
import { join } from 'path';
import { DataSource, SelectQueryBuilder } from 'typeorm';
import { BilateralProjectMappingService } from './bilateral-project-mapping.service';
import { BilateralProjectMapping } from './entities/bilateral-project-mapping.entity';
import { BilateralProjectMappingRepository } from './repositories/bilateral-project-mapping.repository';
import { AgressoContract } from '../agresso-contract/entities/agresso-contract.entity';
import { ClarisaProjectsService } from '../../tools/clarisa/projects/clarisa-projects.service';
import { ClarisaProject } from '../../tools/clarisa/projects/dto/clarisa-project.types';
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
  clarisaProjectId?: number,
  justification?: string,
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
    qb.addOrderBy = jest.fn().mockReturnValue(qb);
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
    loadBilateralCohort: jest.fn().mockResolvedValue({
      projects: bilateralFeed,
      available: true,
    }),
    findProjectById: jest.fn().mockResolvedValue(null),
    hasSciencePrograms(project: ClarisaProject) {
      return ClarisaProjectsService.prototype.hasSciencePrograms.call(
        mockClarisaProjectsService as unknown as ClarisaProjectsService,
        project,
      );
    },
    scienceProgramsFor(project: ClarisaProject) {
      return ClarisaProjectsService.prototype.scienceProgramsFor.call(
        mockClarisaProjectsService as unknown as ClarisaProjectsService,
        project,
      );
    },
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
    mockClarisaProjectsService.loadBilateralCohort.mockReset();
    mockClarisaProjectsService.loadBilateralCohort.mockResolvedValue({
      projects: bilateralFeed,
      available: true,
    });
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
      expect(out.status_justification).toBe('wrong project');
      expect(out.notes).toBeUndefined();
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

    it('AC.6 writes status_justification on an already-inactive row without touching status', async () => {
      const deletedAt = new Date('2026-01-02T00:00:00.000Z');
      const row = {
        id: 5,
        is_active: false,
        reporting_year: CURRENT_YEAR,
        deleted_at: deletedAt,
        notes: 'old note',
        updated_by: 7,
      };
      repoFindOne.mockResolvedValueOnce(row);
      repoSave.mockImplementation(async (saved) => saved);

      const out = await service.deactivate(5, fakeUser, 'Late reason');

      expect(repoSave).toHaveBeenCalledTimes(1);
      expect(out.status_justification).toBe('Late reason');
      expect(out.notes).toBe('old note');
      expect(out.is_active).toBe(false);
      expect(out.deleted_at).toBe(deletedAt);
      expect(out.updated_by).toBe(42);
    });

    it('R-MSE-006 leaves notes untouched when only a justification is supplied', async () => {
      const row = {
        id: 5,
        is_active: true,
        reporting_year: CURRENT_YEAR,
        notes: 'old note',
      };
      repoFindOne.mockResolvedValueOnce(row);
      repoSave.mockImplementation(async (saved) => saved);

      const out = await service.deactivate(5, fakeUser, 'Contract closed');

      expect(out.notes).toBe('old note');
      expect(out.status_justification).toBe('Contract closed');
      expect(out.is_active).toBe(false);
    });

    it('writes notes only when deactivate is given notes', async () => {
      const row = {
        id: 5,
        is_active: true,
        reporting_year: CURRENT_YEAR,
        notes: 'old note',
      };
      repoFindOne.mockResolvedValueOnce(row);
      repoSave.mockImplementation(async (saved) => saved);

      const out = await service.deactivate(
        5,
        fakeUser,
        'Contract closed',
        'fresh note',
      );

      expect(out.status_justification).toBe('Contract closed');
      expect(out.notes).toBe('fresh note');
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

    it('returns the rows when CLARISA fails (R-MFE-006)', async () => {
      mockClarisaProjectsService.loadBilateralCohort.mockResolvedValueOnce({
        projects: [],
        available: false,
      });
      const qb = makeQb({
        getRawAndEntities: async () => ({
          entities: [
            {
              id: 1,
              agresso_agreement_id: 'A1676',
              clarisa_project_id: 1403,
            },
          ],
          raw: [{ ac_description: 'Rice-Wheat Initiative' }],
        }),
        getCount: async () => 1,
      });
      mockRepo.createQueryBuilder.mockReturnValueOnce(qb);

      const out = await service.list({});

      expect(
        mockClarisaProjectsService.loadBilateralCohort,
      ).toHaveBeenCalledWith(CURRENT_YEAR);
      expect(out.items).toEqual([
        expect.objectContaining({
          id: 1,
          agresso_agreement_id: 'A1676',
          agresso_description: 'Rice-Wheat Initiative',
          clarisa_project_full_name: null,
        }),
      ]);
      expect(out.meta).toEqual({
        total: 1,
        page: 1,
        limit: 50,
        totalPages: 1,
      });
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
    const activate = (
      id: number,
      notes?: string,
      clarisaProjectId?: number,
      justification?: string,
    ) =>
      (service as unknown as { activate: ActivateFn }).activate(
        id,
        fakeUser,
        notes,
        clarisaProjectId,
        justification,
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

    it('writes supplied notes on an already-active row without touching status', async () => {
      const row = {
        id: 5,
        is_active: true,
        reporting_year: CURRENT_YEAR,
        deleted_at: null,
        notes: 'old note',
        updated_by: 7,
      };
      repoFindOne.mockResolvedValueOnce(row);
      repoSave.mockImplementation(async (saved) => saved);

      const out = await activate(5, 'Late reason');

      expect(repoSave).toHaveBeenCalledTimes(1);
      expect(out.notes).toBe('Late reason');
      expect(out.is_active).toBe(true);
      expect(out.deleted_at).toBeNull();
      expect(out.updated_by).toBe(42);
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

    it('R-MSE-007 reactivates an inactive row onto project B with a refreshed snapshot', async () => {
      const row = {
        id: 5,
        is_active: false,
        reporting_year: CURRENT_YEAR,
        deleted_at: new Date('2026-01-02T00:00:00.000Z'),
        clarisa_project_id: 1,
        clarisa_external_code: 'OLD',
        clarisa_project_short_name: 'short-A',
        status_justification: 'Contract closed',
        source: MappingSourceEnum.DERIVED,
        notes: 'old note',
      };
      repoFindOne.mockResolvedValueOnce(row);
      repoSave.mockImplementation(async (saved) => saved);
      mockClarisaProjectsService.findProjectById.mockResolvedValue({
        id: 2,
        external_code: 'B-D527',
        short_name: 'short-B',
      });

      const out = await activate(5, undefined, 2);

      expect(out.is_active).toBe(true);
      expect(out.deleted_at).toBeNull();
      expect(out.clarisa_project_id).toBe(2);
      expect(out.clarisa_external_code).toBe('D527');
      expect(out.clarisa_project_short_name).toBe('short-A');
      expect(out.source).toBe(MappingSourceEnum.MANUAL);
      expect(out.status_justification).toBe('Contract closed');
      expect(out.notes).toBe('old note');
    });

    it('R-MSE-007 applies a different project on an already-active row', async () => {
      const row = {
        id: 5,
        is_active: true,
        reporting_year: CURRENT_YEAR,
        deleted_at: null,
        clarisa_project_id: 1,
        clarisa_external_code: 'OLD',
        clarisa_project_short_name: 'short-A',
        status_justification: 'kept',
        source: MappingSourceEnum.DERIVED,
        notes: 'old note',
      };
      repoFindOne.mockResolvedValueOnce(row);
      repoSave.mockImplementation(async (saved) => saved);
      mockClarisaProjectsService.findProjectById.mockResolvedValue({
        id: 2,
        external_code: 'B-D527',
        short_name: 'short-B',
      });

      const out = await activate(5, undefined, 2);

      expect(repoSave).toHaveBeenCalledTimes(1);
      expect(out.is_active).toBe(true);
      expect(out.deleted_at).toBeNull();
      expect(out.clarisa_project_id).toBe(2);
      expect(out.clarisa_external_code).toBe('D527');
      expect(out.status_justification).toBe('kept');
      expect(out.notes).toBe('old note');
    });

    it('activate with no body leaves status_justification unchanged', async () => {
      const row = {
        id: 5,
        is_active: false,
        reporting_year: CURRENT_YEAR,
        deleted_at: new Date('2026-01-02T00:00:00.000Z'),
        status_justification: 'Contract closed',
        notes: 'old note',
      };
      repoFindOne.mockResolvedValueOnce(row);
      repoSave.mockImplementation(async (saved) => saved);

      const out = await activate(5);

      expect(out.is_active).toBe(true);
      expect(out.status_justification).toBe('Contract closed');
      expect(out.notes).toBe('old note');
    });

    it('R-MSE-008 writes a trimmed justification when activating an inactive row', async () => {
      const row = {
        id: 5,
        is_active: false,
        reporting_year: CURRENT_YEAR,
        deleted_at: new Date('2026-01-02T00:00:00.000Z'),
        status_justification: 'Contract closed',
        notes: 'old note',
      };
      repoFindOne.mockResolvedValueOnce(row);
      repoSave.mockImplementation(async (saved) => saved);

      const out = await activate(5, undefined, undefined, ' Contract renewed ');

      expect(out.status_justification).toBe('Contract renewed');
      expect(out.notes).toBe('old note');
      expect(out.is_active).toBe(true);
      expect(repoSave).toHaveBeenCalledTimes(1);
    });

    it('R-MSE-008 saves an already-active row when only a justification is supplied', async () => {
      const row = {
        id: 5,
        is_active: true,
        reporting_year: CURRENT_YEAR,
        deleted_at: null,
        status_justification: 'Contract closed',
        notes: 'old note',
        updated_by: 7,
      };
      repoFindOne.mockResolvedValueOnce(row);
      repoSave.mockImplementation(async (saved) => saved);

      const out = await activate(5, undefined, undefined, 'Contract renewed');

      expect(repoSave).toHaveBeenCalledTimes(1);
      expect(out.status_justification).toBe('Contract renewed');
      expect(out.is_active).toBe(true);
      expect(out.deleted_at).toBeNull();
      expect(out.notes).toBe('old note');
      expect(out.updated_by).toBe(42);
    });

    it('R-MSE-008 leaves status_justification unchanged when the justification is blank', async () => {
      const row = {
        id: 5,
        is_active: false,
        reporting_year: CURRENT_YEAR,
        deleted_at: new Date('2026-01-02T00:00:00.000Z'),
        status_justification: 'Contract closed',
        notes: 'old note',
      };
      repoFindOne.mockResolvedValueOnce(row);
      repoSave.mockImplementation(async (saved) => saved);

      const out = await activate(5, undefined, undefined, '   ');

      expect(out.status_justification).toBe('Contract closed');
      expect(out.notes).toBe('old note');
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

  describe('status audit (R-MFE-007)', () => {
    it('deactivate on an active row stores the acting user and the same instant as deleted_at', async () => {
      const sentinelAt = new Date('2020-01-11T00:00:00.000Z');
      const row = {
        id: 5,
        is_active: true,
        reporting_year: CURRENT_YEAR,
        status_changed_by: 11,
        status_changed_at: sentinelAt,
      };
      repoFindOne.mockResolvedValueOnce(row);
      repoSave.mockImplementation(async (saved) => saved);

      const out = await service.deactivate(5, fakeUser, 'wrong project');

      expect(out.status_changed_by).toBe(42);
      expect(out.status_changed_by).not.toBe(11);
      expect(out.status_changed_at).toBe(out.deleted_at);
      expect(out.status_changed_at).not.toBe(sentinelAt);
      expect(out.is_active).toBe(false);
    });

    it('activate on an inactive row stores the acting user and a new date', async () => {
      const sentinelAt = new Date('2020-02-13T00:00:00.000Z');
      const row = {
        id: 5,
        is_active: false,
        reporting_year: CURRENT_YEAR,
        deleted_at: new Date('2019-06-01T00:00:00.000Z'),
        status_changed_by: 13,
        status_changed_at: sentinelAt,
      };
      repoFindOne.mockResolvedValueOnce(row);
      repoSave.mockImplementation(async (saved) => saved);

      const before = Date.now();
      const out = await service.activate(5, fakeUser);
      const after = Date.now();

      expect(out.status_changed_by).toBe(42);
      expect(out.status_changed_by).not.toBe(13);
      expect(out.status_changed_at).toBeInstanceOf(Date);
      expect(out.status_changed_at).not.toBe(sentinelAt);
      expect((out.status_changed_at as Date).getTime()).toBeGreaterThanOrEqual(
        before,
      );
      expect((out.status_changed_at as Date).getTime()).toBeLessThanOrEqual(
        after,
      );
      expect(out.is_active).toBe(true);
    });

    it('idempotent deactivate with notes leaves status_changed_by and status_changed_at unchanged', async () => {
      const sentinelAt = new Date('2020-03-17T00:00:00.000Z');
      const row = {
        id: 5,
        is_active: false,
        reporting_year: CURRENT_YEAR,
        deleted_at: new Date('2019-06-01T00:00:00.000Z'),
        notes: 'old note',
        status_changed_by: 17,
        status_changed_at: sentinelAt,
      };
      repoFindOne.mockResolvedValueOnce(row);
      repoSave.mockImplementation(async (saved) => saved);

      const out = await service.deactivate(5, fakeUser, undefined, 'a note');

      expect(repoSave).toHaveBeenCalledTimes(1);
      expect(out.notes).toBe('a note');
      expect(out.status_changed_by).toBe(17);
      expect(out.status_changed_at).toBe(sentinelAt);
    });

    it('idempotent activate leaves status_changed_by and status_changed_at unchanged', async () => {
      const sentinelAt = new Date('2020-04-19T00:00:00.000Z');
      const row = {
        id: 5,
        is_active: true,
        reporting_year: CURRENT_YEAR,
        deleted_at: null,
        status_changed_by: 19,
        status_changed_at: sentinelAt,
      };
      repoFindOne.mockResolvedValueOnce(row);

      const out = await service.activate(5, fakeUser);

      expect(repoSave).not.toHaveBeenCalled();
      expect(out.status_changed_by).toBe(19);
      expect(out.status_changed_at).toBe(sentinelAt);
    });

    it('update with notes leaves status_changed_by and status_changed_at unchanged', async () => {
      const sentinelAt = new Date('2020-05-23T00:00:00.000Z');
      const row = {
        id: 5,
        agresso_agreement_id: 'D527',
        reporting_year: CURRENT_YEAR,
        clarisa_project_id: 1,
        source: MappingSourceEnum.MANUAL,
        notes: null,
        is_active: true,
        status_changed_by: 23,
        status_changed_at: sentinelAt,
      };
      repoFindOne.mockResolvedValueOnce(row);
      repoSave.mockImplementation(async (saved) => saved);

      const out = await service.update(5, { notes: 'updated' }, fakeUser);

      expect(repoSave).toHaveBeenCalledTimes(1);
      expect(out.notes).toBe('updated');
      expect(out.status_changed_by).toBe(23);
      expect(out.status_changed_at).toBe(sentinelAt);
    });

    it('update with a project leaves status_changed_by and status_changed_at unchanged', async () => {
      const sentinelAt = new Date('2020-06-29T00:00:00.000Z');
      const row = {
        id: 5,
        reporting_year: CURRENT_YEAR,
        clarisa_project_id: 1,
        clarisa_external_code: 'OLD',
        source: MappingSourceEnum.DERIVED,
        is_active: true,
        status_changed_by: 29,
        status_changed_at: sentinelAt,
      };
      repoFindOne.mockResolvedValueOnce(row);
      repoSave.mockImplementation(async (saved) => saved);
      mockClarisaProjectsService.findProjectById.mockResolvedValue({
        id: 2,
        external_code: 'B-D527',
      });

      const out = await service.update(5, { clarisa_project_id: 2 }, fakeUser);

      expect(repoSave).toHaveBeenCalledTimes(1);
      expect(out.clarisa_project_id).toBe(2);
      expect(out.status_changed_by).toBe(29);
      expect(out.status_changed_at).toBe(sentinelAt);
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

  // Real TypeORM query builder, metadata only: DataSource is not initialize()'d
  // and never opens a connection. A mocked builder cannot show AND/OR precedence.
  describe('shared filter SQL (R-MFE-006 AC.1)', () => {
    let dataSource: DataSource;

    beforeAll(async () => {
      const domain = join(__dirname, '../..');
      dataSource = new DataSource({
        type: 'mysql',
        host: '127.0.0.1',
        port: 3306,
        username: 'sql-shape',
        password: 'sql-shape',
        database: 'sql_shape',
        entities: [join(domain, '**/*.entity{.ts,.js}')],
        synchronize: false,
      });
      await (
        dataSource as unknown as { buildMetadatas(): Promise<void> }
      ).buildMetadatas();
    }, 60_000);

    afterAll(async () => {
      if (dataSource?.isInitialized) {
        await dataSource.destroy();
      }
    });

    const captureSql = (
      qb: SelectQueryBuilder<BilateralProjectMapping>,
    ): { sql: string } => {
      const captured = { sql: '' };
      qb.getRawAndEntities = jest.fn(async () => {
        captured.sql = qb.getQuery();
        return { entities: [], raw: [] };
      }) as typeof qb.getRawAndEntities;
      qb.getCount = jest.fn(async () => 0) as typeof qb.getCount;
      return captured;
    };

    // TypeORM quotes identifiers. The parentheses are what keep the ORs
    // from escaping `is_active` and `source` (AND binds tighter than OR).
    const groupedSearch =
      '(`bpm`.`agresso_agreement_id` LIKE :s OR `bpm`.`clarisa_project_short_name` LIKE :s OR `ac`.`description` LIKE :s OR `ac`.`projectDescription` LIKE :s)';

    it('keeps the search OR inside parentheses when combined with status and source', async () => {
      const qb = dataSource
        .getRepository(BilateralProjectMapping)
        .createQueryBuilder('bpm');
      const captured = captureSql(qb);
      mockRepo.createQueryBuilder.mockReturnValueOnce(qb);

      await service.list({
        search: 'Rice',
        status: 'mapped',
        source: MappingSourceEnum.MANUAL,
      });

      const sql = captured.sql;
      expect(sql).toContain(groupedSearch);
      const outside = sql.replace(groupedSearch, '');
      expect(outside).not.toMatch(/\bOR\b/);
      expect(outside).toContain('`bpm`.`is_active` = :is_active');
      expect(outside).toContain('`bpm`.`source` = :source');
      expect(sql).toContain(
        'LEFT JOIN `sec_users` `su` ON `su`.`sec_user_id` = `bpm`.`status_changed_by`',
      );
      expect(sql).toContain(
        "NULLIF(TRIM(CONCAT_WS(' ', NULLIF(TRIM(`su`.`first_name`), ''), NULLIF(TRIM(`su`.`last_name`), ''))), '')",
      );
      expect(sql).toContain('AS `status_changed_by_name`');
      expect(sql).toMatch(
        /ORDER BY `bpm`\.`updated_at` DESC, `bpm`\.`id` DESC/,
      );
    });

    it('export SQL uses the same grouped search and does not page', async () => {
      const qb = dataSource
        .getRepository(BilateralProjectMapping)
        .createQueryBuilder('bpm');
      const captured = captureSql(qb);
      mockRepo.createQueryBuilder.mockReturnValueOnce(qb);

      await service.exportMappings({
        search: 'Rice',
        status: 'inactive',
        source: MappingSourceEnum.DERIVED,
      });

      const sql = captured.sql;
      expect(sql).toContain(groupedSearch);
      const outside = sql.replace(groupedSearch, '');
      expect(outside).not.toMatch(/\bOR\b/);
      expect(outside).toContain('`bpm`.`is_active` = :is_active');
      expect(outside).toContain('`bpm`.`source` = :source');
      expect(sql).toMatch(/ORDER BY `bpm`\.`updated_at` DESC$/);
      expect(sql).not.toMatch(/`bpm`\.`id` DESC/);
      expect(
        mockClarisaProjectsService.loadBilateralCohort,
      ).toHaveBeenCalledWith(CURRENT_YEAR, 10_000);
    });
  });

  describe('exportMappings (R-MFE-002, R-MFE-010, R-MFE-011)', () => {
    type FixtureRow = {
      id: number;
      reporting_year: number;
      is_active: boolean;
      source: MappingSourceEnum;
      agresso_agreement_id: string;
      clarisa_project_short_name: string;
      clarisa_project_id: number;
      description: string | null;
      projectDescription: string | null;
      status_changed_by: number | null;
      status_changed_at: Date | null;
      status_changed_by_name: string | null;
    };

    const changedAt = (day: number) =>
      new Date(Date.UTC(2026, 0, day, 12, 0, 0));

    const FIXTURE: FixtureRow[] = [
      {
        id: 1,
        reporting_year: CURRENT_YEAR,
        is_active: true,
        source: MappingSourceEnum.MANUAL,
        agresso_agreement_id: 'AGR-RICE',
        clarisa_project_short_name: 'short-rice',
        clarisa_project_id: 501,
        description: 'plain-a',
        projectDescription: 'plain-b',
        status_changed_by: 7,
        status_changed_at: changedAt(1),
        status_changed_by_name: 'Ana Ruiz',
      },
      {
        id: 2,
        reporting_year: CURRENT_YEAR,
        is_active: false,
        source: MappingSourceEnum.MANUAL,
        agresso_agreement_id: 'AGR-RICE-OLD',
        clarisa_project_short_name: 'short-old',
        clarisa_project_id: 502,
        description: 'plain-c',
        projectDescription: 'plain-d',
        status_changed_by: 8,
        status_changed_at: changedAt(2),
        status_changed_by_name: 'Bo Chen',
      },
      {
        id: 3,
        reporting_year: CURRENT_YEAR,
        is_active: true,
        source: MappingSourceEnum.DERIVED,
        agresso_agreement_id: 'AGR-WHEAT',
        clarisa_project_short_name: 'only-wheat',
        clarisa_project_id: 503,
        description: 'plain-e',
        projectDescription: 'plain-f',
        status_changed_by: null,
        status_changed_at: null,
        status_changed_by_name: null,
      },
      {
        id: 4,
        reporting_year: CURRENT_YEAR,
        is_active: true,
        source: MappingSourceEnum.AI_SUGGESTED,
        agresso_agreement_id: 'AGR-MAIZE',
        clarisa_project_short_name: 'short-maize',
        clarisa_project_id: 504,
        description: 'desc-maize',
        projectDescription: 'plain-g',
        status_changed_by: 9,
        status_changed_at: changedAt(4),
        status_changed_by_name: 'Cia Dos',
      },
      {
        id: 5,
        reporting_year: CURRENT_YEAR,
        is_active: true,
        source: MappingSourceEnum.AI_AUTO,
        agresso_agreement_id: 'AGR-BEAN',
        clarisa_project_short_name: 'short-bean',
        clarisa_project_id: 505,
        description: 'plain-h',
        projectDescription: 'proj-bean',
        status_changed_by: 10,
        status_changed_at: changedAt(5),
        status_changed_by_name: 'Dee El',
      },
      {
        id: 6,
        reporting_year: CURRENT_YEAR,
        is_active: false,
        source: MappingSourceEnum.DERIVED,
        agresso_agreement_id: 'AGR-DEAD',
        clarisa_project_short_name: 'dead-sorghum',
        clarisa_project_id: 506,
        description: 'plain-i',
        projectDescription: 'plain-j',
        status_changed_by: 11,
        status_changed_at: changedAt(6),
        status_changed_by_name: 'Fae Goh',
      },
      {
        id: 7,
        reporting_year: CURRENT_YEAR - 1,
        is_active: true,
        source: MappingSourceEnum.MANUAL,
        agresso_agreement_id: 'AGR-RICE',
        clarisa_project_short_name: 'prior-year',
        clarisa_project_id: 507,
        description: 'rice-prior',
        projectDescription: 'plain-k',
        status_changed_by: 12,
        status_changed_at: changedAt(7),
        status_changed_by_name: 'Prior Year',
      },
    ];

    const cohortFor = (rows: FixtureRow[]) =>
      rows.map((row) => ({
        id: row.clarisa_project_id,
        short_name: row.clarisa_project_short_name,
        full_name: `Full ${row.id}`,
        source_of_funding: 'Bilateral',
      }));

    const makeFilteringQb = (rows: FixtureRow[]) => {
      const clauses: { sql: string; params?: Record<string, unknown> }[] = [];
      let skipN = 0;
      let takeN: number | undefined;
      const qb: Record<string, jest.Mock> = {};
      qb.leftJoin = jest.fn().mockReturnValue(qb);
      qb.addSelect = jest.fn().mockReturnValue(qb);
      qb.orderBy = jest.fn().mockReturnValue(qb);
      qb.addOrderBy = jest.fn().mockReturnValue(qb);
      qb.where = jest.fn().mockReturnValue(qb);
      qb.skip = jest.fn().mockImplementation((n: number) => {
        skipN = n;
        return qb;
      });
      qb.take = jest.fn().mockImplementation((n: number) => {
        takeN = n;
        return qb;
      });
      qb.andWhere = jest
        .fn()
        .mockImplementation((sql: string, params?: Record<string, unknown>) => {
          clauses.push({ sql, params });
          return qb;
        });

      const matching = () =>
        rows.filter((row) => {
          for (const { sql, params } of clauses) {
            if (
              sql.includes('reporting_year') &&
              row.reporting_year !== params?.reportingYear
            ) {
              return false;
            }
            if (
              sql === 'bpm.is_active = :is_active' &&
              row.is_active !== params?.is_active
            ) {
              return false;
            }
            if (sql === '1 = 0') return false;
            if (
              sql === 'bpm.source = :source' &&
              row.source !== params?.source
            ) {
              return false;
            }
            if (sql.includes('LIKE :s')) {
              const term = String(params?.s ?? '')
                .replace(/%/g, '')
                .toLowerCase();
              const hay = [
                row.agresso_agreement_id,
                row.clarisa_project_short_name,
                row.description,
                row.projectDescription,
              ];
              if (
                !hay.some((value) => (value ?? '').toLowerCase().includes(term))
              ) {
                return false;
              }
            }
          }
          return true;
        });

      qb.getRawAndEntities = jest.fn(async () => {
        const filtered = matching();
        const page =
          takeN === undefined ? filtered : filtered.slice(skipN, skipN + takeN);
        return {
          entities: page.map((row) => ({
            id: row.id,
            reporting_year: row.reporting_year,
            is_active: row.is_active,
            source: row.source,
            agresso_agreement_id: row.agresso_agreement_id,
            clarisa_project_short_name: row.clarisa_project_short_name,
            clarisa_project_id: row.clarisa_project_id,
            status_changed_by: row.status_changed_by,
            status_changed_at: row.status_changed_at,
          })),
          raw: page.map((row) => ({
            ac_description: row.description,
            ac_projectDescription: row.projectDescription,
            status_changed_by_name: row.status_changed_by_name,
          })),
        };
      });
      qb.getCount = jest.fn(async () => matching().length);
      return qb;
    };

    const expectedIds = (query: {
      search?: string;
      source?: MappingSourceEnum;
      status?: string;
      is_active?: boolean;
    }) => {
      const term = query.search?.trim().toLowerCase();
      return FIXTURE.filter((row) => {
        if (row.reporting_year !== CURRENT_YEAR) return false;
        if (query.status) {
          const status = query.status.toLowerCase();
          if (status === 'mapped' && row.is_active !== true) return false;
          if (status === 'inactive' && row.is_active !== false) return false;
          if (status === 'pending') return false;
        } else if (
          query.is_active !== undefined &&
          row.is_active !== query.is_active
        ) {
          return false;
        }
        if (query.source !== undefined && row.source !== query.source) {
          return false;
        }
        if (term) {
          const hay = [
            row.agresso_agreement_id,
            row.clarisa_project_short_name,
            row.description,
            row.projectDescription,
          ];
          if (
            !hay.some((value) => (value ?? '').toLowerCase().includes(term))
          ) {
            return false;
          }
        }
        return true;
      })
        .map((row) => row.id)
        .sort((a, b) => a - b);
    };

    const signature = (row: {
      id: number;
      clarisa_project_full_name?: string | null;
      status_changed_by_name?: string | null;
      agresso_description?: string | null;
      source?: MappingSourceEnum;
      is_active?: boolean;
      status_changed_by?: number | null;
    }) => ({
      id: row.id,
      full: row.clarisa_project_full_name ?? null,
      changedByName: row.status_changed_by_name ?? null,
      agresso: row.agresso_description ?? null,
      source: row.source,
      active: row.is_active,
      changedBy: row.status_changed_by ?? null,
    });

    beforeEach(() => {
      mockClarisaProjectsService.loadBilateralCohort.mockResolvedValue({
        projects: cohortFor(FIXTURE),
        available: true,
      });
      mockRepo.createQueryBuilder.mockImplementation(() =>
        makeFilteringQb(FIXTURE),
      );
    });

    afterEach(() => {
      mockRepo.createQueryBuilder.mockReset();
      mockRepo.createQueryBuilder.mockReturnValue(makeQb());
    });

    it('returns the same row set as list() for each Search, Source and Status other than Pending', async () => {
      const searches = [
        undefined,
        'rice',
        'only-wheat',
        'desc-maize',
        'proj-bean',
      ];
      const sources = [
        undefined,
        MappingSourceEnum.MANUAL,
        MappingSourceEnum.DERIVED,
        MappingSourceEnum.AI_SUGGESTED,
        MappingSourceEnum.AI_AUTO,
      ];
      const statuses = [undefined, 'all', 'mapped', 'inactive', 'bogus'];

      for (const search of searches) {
        for (const source of sources) {
          for (const status of statuses) {
            const query = { search, source, status };
            const listed = await service.list(query);
            const exported = await service.exportMappings(query);
            const want = expectedIds(query);
            const listIds = listed.items
              .map((row) => row.id)
              .sort((a, b) => a - b);
            const exportIds = exported.rows
              .map((row) => row.id)
              .sort((a, b) => a - b);
            expect({ query, listIds, exportIds }).toEqual({
              query,
              listIds: want,
              exportIds: want,
            });
            expect(
              exported.rows.map(signature).sort((a, b) => a.id - b.id),
            ).toEqual(listed.items.map(signature).sort((a, b) => a.id - b.id));
            expect(exported.reportingYear).toBe(CURRENT_YEAR);
          }
        }
      }
    });

    it('returns all 201 matching rows without the list page', async () => {
      const rows: FixtureRow[] = Array.from({ length: 201 }, (_, index) => ({
        id: index + 1,
        reporting_year: CURRENT_YEAR,
        is_active: index % 2 === 0,
        source:
          index % 3 === 0
            ? MappingSourceEnum.MANUAL
            : index % 3 === 1
              ? MappingSourceEnum.DERIVED
              : MappingSourceEnum.AI_SUGGESTED,
        agresso_agreement_id: `VOL-${index + 1}`,
        clarisa_project_short_name: `short-${index + 1}`,
        clarisa_project_id: 20000 + index,
        description: `desc-${index + 1}`,
        projectDescription: `proj-${index + 1}`,
        status_changed_by: 1000 + index,
        status_changed_at: changedAt(1),
        status_changed_by_name: `User ${index + 1}`,
      }));
      mockRepo.createQueryBuilder.mockImplementation(() =>
        makeFilteringQb(rows),
      );
      mockClarisaProjectsService.loadBilateralCohort.mockResolvedValue({
        projects: cohortFor(rows),
        available: true,
      });

      const exported = await service.exportMappings({});

      expect(exported.rows).toHaveLength(201);
      expect(exported.rows.map((row) => row.id).sort((a, b) => a - b)).toEqual(
        rows.map((row) => row.id),
      );
      expect(exported.reportingYear).toBe(CURRENT_YEAR);
    });

    it('returns the reporting year when no row matches', async () => {
      const exported = await service.exportMappings({
        search: 'no-such-token-zz',
      });

      expect(exported.rows).toEqual([]);
      expect(exported.reportingYear).toBe(CURRENT_YEAR);
      expect(exported.clarisaAvailable).toBe(true);
      expect(mockReportingYearResolver.resolve).toHaveBeenCalledTimes(1);
    });

    it('keeps the rows and reports clarisaAvailable false when the cohort is unavailable', async () => {
      mockClarisaProjectsService.loadBilateralCohort.mockResolvedValue({
        projects: [],
        available: false,
      });

      const exported = await service.exportMappings({ status: 'mapped' });

      expect(exported.clarisaAvailable).toBe(false);
      expect(exported.reportingYear).toBe(CURRENT_YEAR);
      expect(exported.rows.map((row) => row.id).sort((a, b) => a - b)).toEqual([
        1, 3, 4, 5,
      ]);
      expect(
        exported.rows.every((row) => row.sciencePrograms.length === 0),
      ).toBe(true);
      expect(
        exported.rows.every((row) => row.clarisa_project_full_name === null),
      ).toBe(true);
      expect(
        mockClarisaProjectsService.loadBilateralCohort,
      ).toHaveBeenCalledWith(CURRENT_YEAR, 10_000);
    });

    it('attaches science programs by project id', async () => {
      const previous = process.env.ARI_BILATERAL_ACCEPTED_SP_STATUSES;
      delete process.env.ARI_BILATERAL_ACCEPTED_SP_STATUSES;
      const projects = cohortFor(FIXTURE).map((project) =>
        project.id === 501
          ? {
              ...project,
              project_mappings_array: [
                {
                  id: 1,
                  project_id: 501,
                  program_id: 20,
                  allocation: 40,
                  status: 'Confirmed',
                  global_unit_object: {
                    id: 20,
                    name: 'Plant Health',
                    smo_code: 'SP01',
                    portfolio_object: { id: 1, acronym: 'P25' },
                  },
                },
                {
                  id: 2,
                  project_id: 501,
                  program_id: 21,
                  allocation: 60,
                  status: 'Pending',
                  global_unit_object: {
                    id: 21,
                    name: 'Gender',
                    smo_code: 'SP02',
                    portfolio_object: { id: 1, acronym: 'P25' },
                  },
                },
                {
                  id: 3,
                  project_id: 501,
                  program_id: 22,
                  allocation: 10,
                  status: 'Rejected',
                  global_unit_object: {
                    id: 22,
                    name: 'Rejected program',
                    smo_code: 'SP03',
                    portfolio_object: { id: 1, acronym: 'P25' },
                  },
                },
              ],
            }
          : project,
      );
      mockClarisaProjectsService.loadBilateralCohort.mockResolvedValue({
        projects,
        available: true,
      });

      try {
        const exported = await service.exportMappings({
          search: 'short-rice',
          status: 'mapped',
          source: MappingSourceEnum.MANUAL,
        });
        expect(exported.rows).toHaveLength(1);
        expect(exported.rows[0].sciencePrograms).toEqual([
          {
            code: 'SP01',
            name: 'Plant Health',
            portfolio: 'P25',
            allocation: 40,
          },
          {
            code: 'SP02',
            name: 'Gender',
            portfolio: 'P25',
            allocation: 60,
          },
        ]);
      } finally {
        if (previous === undefined) {
          delete process.env.ARI_BILATERAL_ACCEPTED_SP_STATUSES;
        } else {
          process.env.ARI_BILATERAL_ACCEPTED_SP_STATUSES = previous;
        }
      }
    });

    it('reports clarisaCohortEmpty true when CLARISA answers with an empty cohort', async () => {
      mockClarisaProjectsService.loadBilateralCohort.mockResolvedValue({
        projects: [],
        available: true,
      });

      const exported = await service.exportMappings({ status: 'mapped' });

      expect(exported.clarisaAvailable).toBe(true);
      expect(exported.clarisaCohortEmpty).toBe(true);
      expect(exported.rows.length).toBeGreaterThan(0);
    });

    it('reports clarisaCohortEmpty false when the cohort has projects', async () => {
      const exported = await service.exportMappings({});

      expect(exported.clarisaAvailable).toBe(true);
      expect(exported.clarisaCohortEmpty).toBe(false);
      expect(exported.rows.length).toBeGreaterThan(0);
    });

    it('reports clarisaCohortEmpty false when the cohort is unavailable', async () => {
      mockClarisaProjectsService.loadBilateralCohort.mockResolvedValue({
        projects: [],
        available: false,
      });

      const exported = await service.exportMappings({ status: 'mapped' });

      expect(exported.clarisaAvailable).toBe(false);
      expect(exported.clarisaCohortEmpty).toBe(false);
      expect(exported.rows.length).toBeGreaterThan(0);
    });

    it('list rows carry status_changed_by, status_changed_at and status_changed_by_name', async () => {
      const listed = await service.list({});
      const byId = new Map(listed.items.map((row) => [row.id, row]));

      expect(byId.get(1)).toEqual(
        expect.objectContaining({
          status_changed_by: 7,
          status_changed_at: changedAt(1),
          status_changed_by_name: 'Ana Ruiz',
        }),
      );
      expect(byId.get(3)).toEqual(
        expect.objectContaining({
          status_changed_by: null,
          status_changed_at: null,
          status_changed_by_name: null,
        }),
      );
      expect(byId.has(7)).toBe(false);
    });
  });
});
