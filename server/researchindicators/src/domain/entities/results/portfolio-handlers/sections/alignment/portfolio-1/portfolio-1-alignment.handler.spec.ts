import { Portfolio1AlignmentHandler } from './portfolio-1-alignment.handler';
import { ResultAlignmentOperationsService } from '../shared/result-alignment-operations.service';
import { ClarisaLeversService } from '../../../../../../tools/clarisa/entities/clarisa-levers/clarisa-levers.service';
import { ResultLeversService } from '../../../../../result-levers/result-levers.service';
import { LeverRolesEnum } from '../../../../../lever-roles/enum/lever-roles.enum';
import { PortfolioIdEnum } from '../../../enum/portfolio-id.enum';
import { ResultSectionKeyEnum } from '../../../enum/result-section-key.enum';
import { PortfolioHandlerContext } from '../../../core/portfolio-handler-context.interface';

describe('Portfolio1AlignmentHandler', () => {
  let handler: Portfolio1AlignmentHandler;
  let alignmentOperations: jest.Mocked<
    Pick<ResultAlignmentOperationsService, 'save' | 'find'>
  >;
  let clarisaLeversService: jest.Mocked<
    Pick<ClarisaLeversService, 'findActiveByIdsForPortfolio'>
  >;
  let resultLeversService: jest.Mocked<
    Pick<ResultLeversService, 'create' | 'find'>
  >;

  const context: PortfolioHandlerContext = {
    resultId: 1,
    portfolioId: PortfolioIdEnum.PORTFOLIO_1,
  };

  beforeEach(() => {
    alignmentOperations = {
      save: jest.fn(),
      find: jest.fn(),
    };
    clarisaLeversService = {
      findActiveByIdsForPortfolio: jest.fn(),
    };
    resultLeversService = {
      create: jest.fn(),
      find: jest.fn(),
    };
    handler = new Portfolio1AlignmentHandler(
      alignmentOperations as unknown as ResultAlignmentOperationsService,
      clarisaLeversService as unknown as ClarisaLeversService,
      resultLeversService as unknown as ResultLeversService,
    );
  });

  it('should expose portfolio 1 metadata', () => {
    expect(handler.portfolioId).toBe(PortfolioIdEnum.PORTFOLIO_1);
    expect(handler.sectionKey).toBe(ResultSectionKeyEnum.ALIGNMENT);
  });

  it('should delegate save to ResultAlignmentOperationsService', async () => {
    const payload = { contracts: [], result_sdgs: [] } as any;
    const expected = { ...payload, primary_levers: [] };
    alignmentOperations.save.mockResolvedValue(expected);

    const result = await handler.save(context, payload);

    expect(alignmentOperations.save).toHaveBeenCalledWith(
      context.resultId,
      payload,
      context.manager,
    );
    expect(result).toBe(expected);
  });

  it('should delegate find to ResultAlignmentOperationsService', async () => {
    const expected = {
      contracts: [],
      primary_levers: [],
      contributor_levers: [],
      result_sdgs: [],
    };
    alignmentOperations.find.mockResolvedValue(expected as any);

    const result = await handler.find(context);

    expect(alignmentOperations.find).toHaveBeenCalledWith(context.resultId);
    expect(result).toBe(expected);
  });

  describe('saveStrategicObjectives', () => {
    it('reports unsupported, saves nothing, and discards every id — without any reference-data query (R-RES-004)', async () => {
      const report = await handler.saveStrategicObjectives(1, [1, 999, 3]);

      expect(report).toEqual({
        supported: false,
        saved: [],
        discarded: [1, 999, 3],
      });
      // Portfolio 1 has no StrategicObjectivesService dependency at all
      // (the constructor takes ResultAlignmentOperationsService plus the
      // two lever collaborators `saveLevers` uses, but never a
      // StrategicObjectivesService), so "zero reference-data queries" holds
      // by construction. The only collaborator this method can reach is
      // alignmentOperations — assert it is never touched either.
      expect(alignmentOperations.save).not.toHaveBeenCalled();
      expect(alignmentOperations.find).not.toHaveBeenCalled();
    });

    it('deduplicates the discarded ids', async () => {
      const report = await handler.saveStrategicObjectives(1, [1, 1, 3]);

      expect(report).toEqual({
        supported: false,
        saved: [],
        discarded: [1, 3],
      });
    });

    it('tolerates an absent id list', async () => {
      const report = await handler.saveStrategicObjectives(
        1,
        undefined as unknown as number[],
      );

      expect(report).toEqual({ supported: false, saved: [], discarded: [] });
    });
  });

  describe('saveLevers', () => {
    // A genuine predicate evaluator over the fixture list — not a canned
    // return value — so the foreign-portfolio and unknown-id discard causes
    // can actually fail against an implementation that filters only by id
    // (KZ-001), matching the standard portfolios.service.spec.ts sets.
    const buildLeverFixture = (overrides: Record<string, any>) => ({
      id: 11,
      portfolio_id: PortfolioIdEnum.PORTFOLIO_1,
      is_active: true,
      ...overrides,
    });

    const fakeFindActiveByIdsForPortfolio = (fixtures: Record<string, any>[]) =>
      (async (ids: number[], portfolioId: number) =>
        fixtures.filter(
          (fixture) =>
            ids.map(Number).includes(Number(fixture.id)) &&
            fixture.portfolio_id === portfolioId &&
            fixture.is_active,
        )) as unknown as ClarisaLeversService['findActiveByIdsForPortfolio'];

    // Stateful fake replicating BaseServiceSimple.create's real
    // reconciliation (base-service.ts:143-152's role-scoped existing-row
    // lookup + :175-179's `Not(In(persistId))` deactivation): it flips
    // `is_active` to false on any seeded row whose role matches the role
    // this call is scoped to — a falsy `dataRole` is treated as "no role
    // filter", mirroring the primitive's own `dataRole ? { [roleKey]:
    // dataRole } : {}` — and whose id is absent from the incoming array.
    const buildReconcilerFake = (
      seedRows: {
        lever_id: number;
        lever_role_id: number;
        is_active: boolean;
      }[],
    ) =>
      (async (
        _resultId: number,
        dataToSave: { lever_id: number }[],
        _generalCompareKey: string,
        dataRole?: number,
      ) => {
        const incomingIds = new Set(dataToSave.map((row) => row.lever_id));
        seedRows.forEach((row) => {
          if (!dataRole || row.lever_role_id === dataRole) {
            row.is_active = incomingIds.has(row.lever_id);
          }
        });
        return seedRows.filter((row) => row.is_active);
      }) as unknown as ResultLeversService['create'];

    it('writes every survivor at lever_role_id = ALIGNMENT with is_primary explicitly true (R-RES-003 AC.1/AC.2)', async () => {
      const fixtures = [
        buildLeverFixture({ id: 11 }),
        buildLeverFixture({ id: 12 }),
      ];
      clarisaLeversService.findActiveByIdsForPortfolio.mockImplementation(
        fakeFindActiveByIdsForPortfolio(fixtures),
      );
      resultLeversService.create.mockResolvedValue([] as any);

      const report = await handler.saveLevers(1, [11, 12]);

      expect(
        clarisaLeversService.findActiveByIdsForPortfolio,
      ).toHaveBeenCalledWith([11, 12], PortfolioIdEnum.PORTFOLIO_1);
      // Value assertion, not presence: every row must carry
      // `is_primary: true` explicitly, and `is_primary` must be one of the
      // fields `create` is told to update (DD-5, DC-1).
      expect(resultLeversService.create).toHaveBeenCalledWith(
        1,
        [
          { lever_id: 11, is_primary: true },
          { lever_id: 12, is_primary: true },
        ],
        'lever_id',
        LeverRolesEnum.ALIGNMENT,
        undefined,
        ['is_primary'],
      );
      expect(report).toEqual({ saved: [11, 12], discarded: [] });
    });

    it('normalizes bigint-hydrated string ids returned by the finder before comparing (execution.md T-02 advisory)', async () => {
      // clarisa_levers.id sits on a bigint PrimaryGeneratedColumn and is
      // hydrated as a string by TypeORM at runtime despite its `number`
      // declaration — a double that only ever returns numeric ids cannot
      // see this defect class.
      clarisaLeversService.findActiveByIdsForPortfolio.mockResolvedValue([
        {
          id: '11',
          portfolio_id: PortfolioIdEnum.PORTFOLIO_1,
          is_active: true,
        },
      ] as any);
      resultLeversService.create.mockResolvedValue([] as any);

      const report = await handler.saveLevers(1, [11]);

      expect(resultLeversService.create).toHaveBeenCalledWith(
        1,
        [{ lever_id: 11, is_primary: true }],
        'lever_id',
        LeverRolesEnum.ALIGNMENT,
        undefined,
        ['is_primary'],
      );
      expect(report).toEqual({ saved: [11], discarded: [] });
    });

    it('discards an id owned by the other portfolio and an unknown id, writing only the survivor (R-RES-005 scenario 1)', async () => {
      const fixtures = [
        buildLeverFixture({ id: 11 }),
        buildLeverFixture({
          id: 4,
          portfolio_id: PortfolioIdEnum.PORTFOLIO_2,
        }),
      ];
      clarisaLeversService.findActiveByIdsForPortfolio.mockImplementation(
        fakeFindActiveByIdsForPortfolio(fixtures),
      );
      resultLeversService.create.mockResolvedValue([] as any);

      const report = await handler.saveLevers(1, [11, 999, 4]);

      expect(resultLeversService.create).toHaveBeenCalledWith(
        1,
        [{ lever_id: 11, is_primary: true }],
        'lever_id',
        LeverRolesEnum.ALIGNMENT,
        undefined,
        ['is_primary'],
      );
      expect(report).toEqual({ saved: [11], discarded: [999, 4] });
    });

    it('deduplicates a repeated id into one row (R-RES-003 AC.4)', async () => {
      clarisaLeversService.findActiveByIdsForPortfolio.mockResolvedValue([
        buildLeverFixture({ id: 11 }),
      ] as any);
      resultLeversService.create.mockResolvedValue([] as any);

      const report = await handler.saveLevers(1, [11, 11]);

      expect(
        clarisaLeversService.findActiveByIdsForPortfolio,
      ).toHaveBeenCalledWith([11], PortfolioIdEnum.PORTFOLIO_1);
      expect(resultLeversService.create).toHaveBeenCalledWith(
        1,
        [{ lever_id: 11, is_primary: true }],
        'lever_id',
        LeverRolesEnum.ALIGNMENT,
        undefined,
        ['is_primary'],
      );
      expect(report).toEqual({ saved: [11], discarded: [] });
    });

    it('writes nothing and queries nothing when the id list is empty (R-RES-008 step-1 analogue)', async () => {
      const report = await handler.saveLevers(1, []);

      expect(
        clarisaLeversService.findActiveByIdsForPortfolio,
      ).not.toHaveBeenCalled();
      expect(resultLeversService.create).not.toHaveBeenCalled();
      expect(report).toEqual({ saved: [], discarded: [] });
    });

    it('tolerates an absent id list', async () => {
      const report = await handler.saveLevers(
        1,
        undefined as unknown as number[],
      );

      expect(
        clarisaLeversService.findActiveByIdsForPortfolio,
      ).not.toHaveBeenCalled();
      expect(resultLeversService.create).not.toHaveBeenCalled();
      expect(report).toEqual({ saved: [], discarded: [] });
    });

    it(
      'does NOT call create — and so cannot deactivate any pre-existing row — ' +
        'when every id is discarded (R-RES-005 scenario 2, the empty-survivor trap)',
      async () => {
        clarisaLeversService.findActiveByIdsForPortfolio.mockResolvedValue([]);

        const report = await handler.saveLevers(1, [999, 1000]);

        expect(resultLeversService.create).not.toHaveBeenCalled();
        expect(report).toEqual({ saved: [], discarded: [999, 1000] });
      },
    );

    it(
      'hands create exactly once with only the new primary rows, never reads existing levers, and never reaches the section-wide save ' +
        "(R-RES-007 AC.1/AC.2, amended 2026-09-04 — the handler's own contribution to inertness)",
      async () => {
        // A pre-existing contributor row is seeded into a genuine
        // role-scoped reconciler fake (mirroring BaseServiceSimple.create,
        // base-service.ts:143-152/:175-179) rather than an inert local
        // snapshot. R-RES-007 AC.2 (amended 2026-09-04) does NOT claim this
        // row survives — role 1 is shared by primary and contributor
        // levers, so a primary-only write deactivates it by construction
        // (DD-6; RK-2/RB-2, accepted residual) — asserting its survival is
        // exactly what the amended check 8 forbids for portfolio 1. What IS
        // asserted, and IS achievable at this boundary: the handler calls
        // `create` exactly once, with exactly the validated survivors and
        // nothing merged in, never reads `result_levers` itself, and never
        // routes through the section-wide save.
        const preExistingContributorRow = {
          lever_id: 99,
          lever_role_id: LeverRolesEnum.ALIGNMENT,
          is_primary: false,
          is_active: true,
        };
        clarisaLeversService.findActiveByIdsForPortfolio.mockResolvedValue([
          buildLeverFixture({ id: 11 }),
          buildLeverFixture({ id: 12 }),
        ] as any);
        resultLeversService.create.mockImplementation(
          buildReconcilerFake([preExistingContributorRow]),
        );

        await handler.saveLevers(1, [11, 12]);

        expect(resultLeversService.find).not.toHaveBeenCalled();
        expect(alignmentOperations.save).not.toHaveBeenCalled();
        expect(resultLeversService.create).toHaveBeenCalledTimes(1);
        expect(resultLeversService.create).toHaveBeenCalledWith(
          1,
          [
            { lever_id: 11, is_primary: true },
            { lever_id: 12, is_primary: true },
          ],
          'lever_id',
          LeverRolesEnum.ALIGNMENT,
          undefined,
          ['is_primary'],
        );
      },
    );
  });
});
