import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { DataSource } from 'typeorm';
import { AgressoStaffToolsService } from './agresso-staff-tools.service';
import { SecUserReconcilerService } from './sec-user-reconciler.service';
import { AgressoStaffRawDto } from './dto/agresso-staff-raw.dto';

describe('AgressoStaffToolsService', () => {
  let service: AgressoStaffToolsService;
  let mockConnection: { getRaw: jest.Mock };
  let reconciler: SecUserReconcilerService;

  beforeEach(async () => {
    mockConnection = { getRaw: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgressoStaffToolsService,
        { provide: HttpService, useValue: { get: jest.fn() } },
        {
          provide: DataSource,
          useValue: {
            getRepository: jest.fn().mockReturnValue({ save: jest.fn() }),
          },
        },
        {
          // T-07 wires the reconciler into the sync. These tests cover the PAGINATION contract
          // only (findNumberOfPages arithmetic and the per-page base() calls), so the reconciler
          // is stubbed — its own behaviour is covered exhaustively in
          // sec-user-reconciler.service.spec.ts.
          provide: SecUserReconcilerService,
          useValue: {
            reconcile: jest.fn().mockResolvedValue({
              skipped: [],
              collapsed: [],
              create: [],
              refresh: [],
              reactivate: [],
            }),
            applyCreateAndGrant: jest.fn().mockResolvedValue({
              created: 0,
              rolesGranted: 0,
              createsDiscarded: 0,
              namesRefreshed: 0,
              namesTruncated: 0,
              carnetBackfilled: 0,
              carnetConflicts: 0,
              reactivated: 0,
              rolesReactivated: 0,
              rolesGrantedOnReactivation: 0,
              rolesLeftInactive: [],
              accountsWithoutRole: [],
            }),
            buildSummary: jest.fn().mockReturnValue({ staffFetched: 0 }),
          },
        },
      ],
    }).compile();

    service = module.get<AgressoStaffToolsService>(AgressoStaffToolsService);
    reconciler = module.get<SecUserReconcilerService>(SecUserReconcilerService);
    (service as any).connection = mockConnection;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // [CLAUDE/DONE] 161
  describe('cloneAllAgressoStaff', () => {
    it('should call base once per page when totalElements fits exactly in 1000-item pages', async () => {
      mockConnection.getRaw.mockResolvedValue({ totalElements: 2000 });
      const baseSpy = jest.spyOn(service as any, 'base').mockResolvedValue([]);

      await service.cloneAllAgressoStaff();

      expect(baseSpy).toHaveBeenCalledTimes(2);
    });

    it('should compute pages with round + remainder (1500 -> 3 calls)', async () => {
      mockConnection.getRaw.mockResolvedValue({ totalElements: 1500 });
      const baseSpy = jest.spyOn(service as any, 'base').mockResolvedValue([]);

      await service.cloneAllAgressoStaff();

      expect(baseSpy).toHaveBeenCalledTimes(3);
    });

    it('should call base with the correct query for each page', async () => {
      mockConnection.getRaw.mockResolvedValue({ totalElements: 1000 });
      const baseSpy = jest.spyOn(service as any, 'base').mockResolvedValue([]);

      await service.cloneAllAgressoStaff();

      expect(baseSpy).toHaveBeenCalledWith(
        'ErpEmploymentServices/api/v1/employees?page=1&pageSize=1000',
        expect.anything(),
        expect.any(Function),
      );
    });

    it('should not call base when totalElements is 0', async () => {
      mockConnection.getRaw.mockResolvedValue({ totalElements: 0 });
      const baseSpy = jest.spyOn(service as any, 'base').mockResolvedValue([]);

      await service.cloneAllAgressoStaff();

      expect(baseSpy).not.toHaveBeenCalled();
    });
  });

  describe('T-07 — accumulation and the run summary (R-AGS-001, NFR-AGS-003)', () => {
    /** Drives `base` so it invokes the mapper once per member, exactly as the real one does. */
    function basePagesReturning(pages: Record<number, string[]>) {
      type BaseHost = {
        base: (
          path: string,
          entity: unknown,
          mapper: (d: AgressoStaffRawDto) => unknown,
        ) => Promise<unknown[]>;
      };
      return jest
        .spyOn(service as unknown as BaseHost, 'base')
        .mockImplementation(async (path, _entity, mapper) => {
          const pageNumber = Number(/page=(\d+)/.exec(path)?.[1]);
          for (const carnet of pages[pageNumber] ?? []) {
            mapper({
              resourceId: carnet,
              firstName: 'First',
              lastName: 'Last',
              email: `${carnet}@alliance.org`,
              center: 'Alliance',
              status: 'Active',
            });
          }
          return [];
        });
    }

    it("hands every page's members to the reconciler in ONE call, in payload order", async () => {
      mockConnection.getRaw.mockResolvedValue({ totalElements: 3000 });
      basePagesReturning({ 1: ['A1', 'A2'], 2: ['B1'], 3: ['C1'] });

      await service.cloneAllAgressoStaff();

      // ONE call, not one per page: the collapse and the bulk read are defined over the whole run.
      expect(reconciler.reconcile).toHaveBeenCalledTimes(1);
      expect(
        (reconciler.reconcile as jest.Mock).mock.calls[0][0].map(
          (m: AgressoStaffRawDto) => m.resourceId,
        ),
      ).toEqual(['A1', 'A2', 'B1', 'C1']);
    });

    it('does NOT abort when a page fetch fails — the surviving members are still reconciled', async () => {
      mockConnection.getRaw.mockResolvedValue({ totalElements: 3000 });
      // `base()` catches its own fetch error and returns [] without invoking the mapper, so a
      // failed page contributes no members. design.md §5.1: that is benign HERE (fewer people
      // provisioned this run, the next run corrects it) and fatal in the sibling deactivation
      // spec, which is why the completeness guard travelled there with R-AGS-005.
      basePagesReturning({ 1: ['A1'], 2: [], 3: ['C1'] });

      await service.cloneAllAgressoStaff();

      expect(reconciler.reconcile).toHaveBeenCalledTimes(1);
      expect(
        (reconciler.reconcile as jest.Mock).mock.calls[0][0].map(
          (m: AgressoStaffRawDto) => m.resourceId,
        ),
      ).toEqual(['A1', 'C1']);
      expect(reconciler.applyCreateAndGrant).toHaveBeenCalledTimes(1);
    });

    it("emits the summary at log — the run's only feedback channel (RSK-4)", async () => {
      mockConnection.getRaw.mockResolvedValue({ totalElements: 1000 });
      basePagesReturning({ 1: ['A1'] });
      (reconciler.buildSummary as jest.Mock).mockReturnValue({
        staffFetched: 1,
        created: 1,
      });
      const logSpy = jest.spyOn(service['_logger'], 'log');

      await service.cloneAllAgressoStaff();

      expect(reconciler.buildSummary).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        1,
      );
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('"staffFetched":1'),
      );
    });
  });
});
