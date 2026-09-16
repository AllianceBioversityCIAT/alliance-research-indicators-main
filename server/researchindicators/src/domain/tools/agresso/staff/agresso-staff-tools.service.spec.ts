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

    // @akili-spec changes/agresso-staff-deactivation (T-02, DD-D2)
    //
    // This test previously asserted 3 calls for 1500 and was named "round + remainder" — it PINNED
    // the arithmetic bug. `Math.round(1.5) = 2`, plus the remainder term, gave 3 pages where 2
    // cover the data, so page 3 always came back empty. Updating it is the falsifier the design's
    // reversion challenge named: restoring `round + remainder` reddens every row below.
    it.each([
      // [totalElements, expected pages] — the second column is ceil(total / 1000).
      [500, 1], // old arithmetic: 2
      [1000, 1],
      [1500, 2], // old arithmetic: 3
      [2000, 2],
      [2400, 3],
      [2500, 3], // old arithmetic: 4
      [3500, 4], // old arithmetic: 5
    ])(
      'requests exactly ceil(total/1000) pages for totalElements=%i',
      async (totalElements, expectedPages) => {
        mockConnection.getRaw.mockResolvedValue({ totalElements });
        const baseSpy = jest
          .spyOn(service as any, 'base')
          .mockResolvedValue([]);

        await service.cloneAllAgressoStaff();

        expect(baseSpy).toHaveBeenCalledTimes(expectedPages);
      },
    );

    // R-AGD-004 — C-2 reads these three numbers. They are measured, not assumed.
    describe('fetch report', () => {
      const member = (resourceId: string, email = 'a@cgiar.org') =>
        ({ resourceId, email, firstName: 'F', lastName: 'L' }) as any;

      const runWithPages = async (
        totalElements: number,
        pages: Array<ReturnType<typeof member>[]>,
      ) => {
        mockConnection.getRaw.mockResolvedValue({ totalElements });
        let call = 0;
        jest
          .spyOn(service as any, 'base')
          .mockImplementation(async (..._args: any[]) => {
            const mapper = _args[2] as (d: any) => unknown;
            for (const m of pages[call] ?? []) {
              mapper(m);
            }
            call += 1;
            return [];
          });
        const logSpy = jest.spyOn((service as any)._logger, 'log');
        await service.cloneAllAgressoStaff();
        const line = logSpy.mock.calls
          .map((c) => String(c[0]))
          .find((l) => l.startsWith('Agresso staff fetch report:'));
        return JSON.parse(line!.replace('Agresso staff fetch report: ', ''));
      };

      it('records each page contribution separately, in page order', async () => {
        const report = await runWithPages(2400, [
          [member('A1'), member('A2')],
          [member('B1')],
          [member('C1'), member('C2'), member('C3')],
        ]);

        expect(report.pageRowCounts).toEqual([2, 1, 3]);
        expect(report.totalElements).toBe(2400);
      });

      it('records a page that contributed nothing as 0, not as absent', async () => {
        const report = await runWithPages(2400, [
          [member('A1')],
          [], // the shape `base()` produces when the fetch threw
          [member('C1')],
        ]);

        expect(report.pageRowCounts).toEqual([1, 0, 1]);
      });

      // JD-1. Carnets are varied per row on purpose: a fixture whose rows share defaults cannot
      // distinguish distinct counting from row counting (KZ-004).
      it('counts DISTINCT carnets, so a repeated record does not mask an omitted one', async () => {
        const report = await runWithPages(2000, [
          [member('A1'), member('A2'), member('A3')],
          [member('A3'), member('A4')], // A3 repeats across the page boundary
        ]);

        expect(report.pageRowCounts).toEqual([3, 2]); // 5 rows fetched
        expect(report.distinctCarnets).toBe(4); // but only 4 distinct people
      });

      it('ignores empty and whitespace-only carnets when counting distinct', async () => {
        const report = await runWithPages(1000, [
          [member('A1'), member(''), member('   '), member('A2')],
        ]);

        expect(report.distinctCarnets).toBe(2);
      });
    });

    it('should call base with the correct query for each page', async () => {
      mockConnection.getRaw.mockResolvedValue({ totalElements: 1000 });
      const baseSpy = jest.spyOn(service as any, 'base').mockResolvedValue([]);

      await service.cloneAllAgressoStaff();

      expect(baseSpy).toHaveBeenCalledWith(
        'ErpEmploymentServices/api/v1/employees?page=1&pageSize=1000&status=active',
        expect.anything(),
        expect.any(Function),
      );
    });

    it('filters the fetch to ACTIVE staff — this is what closes RSK-9 (2026-09-15)', async () => {
      mockConnection.getRaw.mockResolvedValue({ totalElements: 1000 });
      const baseSpy = jest.spyOn(service as any, 'base').mockResolvedValue([]);

      await service.cloneAllAgressoStaff();

      // RSK-9 asked what happens if the employees endpoint returns terminated or on-leave staff:
      // this spec would create accounts and grant CONTRIBUTOR to departed people, and R-AGS-007
      // would reactivate them. A pre-flight on `alliance_user_staff.status` returned only
      // {'N', NULL} — the column cannot discriminate, so it could never have gated anything.
      // Agresso's own documented `?status=active` filter closes the risk UPSTREAM instead: if the
      // payload only contains active staff, there is nothing departed to provision.
      //
      // The parameter lives in `private query()`, which BOTH `findNumberOfPages()` and the page
      // loop call. Adding it at only one of those two sites would desynchronise pagination: the
      // count would report every employee while the pages returned only actives, so the loop would
      // walk empty trailing pages.
      const [firstUrl] = baseSpy.mock.calls[0] as [string];
      expect(firstUrl).toContain('status=active');
      expect(mockConnection.getRaw).toHaveBeenCalledWith(
        expect.stringContaining('status=active'),
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
