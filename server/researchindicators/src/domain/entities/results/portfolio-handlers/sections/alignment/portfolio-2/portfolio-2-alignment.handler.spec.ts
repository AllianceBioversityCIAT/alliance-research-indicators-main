import { Portfolio2AlignmentHandler } from './portfolio-2-alignment.handler';
import { ResultAlignmentOperationsService } from '../shared/result-alignment-operations.service';
import { ResultLeversService } from '../../../../../result-levers/result-levers.service';
import { ResultStrategicObjectivesService } from '../../../../../result-strategic-objectives/result-strategic-objectives.service';
import { ResultImpactOutcomesService } from '../../../../../result-impact-outcomes/result-impact-outcomes.service';
import { StrategicObjectivesService } from '../../../../../strategic-objectives/strategic-objectives.service';
import { StrategicObjective } from '../../../../../strategic-objectives/entities/strategic-objective.entity';
import { PortfolioIdEnum } from '../../../enum/portfolio-id.enum';
import { ResultSectionKeyEnum } from '../../../enum/result-section-key.enum';
import { PortfolioHandlerContext } from '../../../core/portfolio-handler-context.interface';
import { LeverRolesEnum } from '../../../../../lever-roles/enum/lever-roles.enum';
import { ResultStrategicObjectiveRolesEnum } from '../../../../../result-strategic-objectives/enum/result-strategic-objective-roles.enum';
import { ResultImpactOutcomeRolesEnum } from '../../../../../result-impact-outcomes/enum/result-impact-outcome-roles.enum';
import { IndicatorsEnum } from '../../../../../indicators/enum/indicators.enum';
import { DataSource } from 'typeorm';

describe('Portfolio2AlignmentHandler', () => {
  let handler: Portfolio2AlignmentHandler;
  let alignmentOperations: jest.Mocked<
    Pick<ResultAlignmentOperationsService, 'save' | 'find'>
  >;
  let resultLeversService: jest.Mocked<
    Pick<ResultLeversService, 'create' | 'find'>
  >;
  let resultStrategicObjectivesService: jest.Mocked<
    Pick<ResultStrategicObjectivesService, 'create' | 'find'>
  >;
  let resultImpactOutcomesService: jest.Mocked<
    Pick<ResultImpactOutcomesService, 'create' | 'find'>
  >;
  let strategicObjectivesService: jest.Mocked<
    Pick<StrategicObjectivesService, 'findActiveByIdsForPortfolio'>
  >;

  const manager = {} as any;
  const baseContext: PortfolioHandlerContext = {
    resultId: 10,
    portfolioId: PortfolioIdEnum.PORTFOLIO_2,
    manager,
  };

  beforeEach(() => {
    alignmentOperations = { save: jest.fn(), find: jest.fn() };
    resultLeversService = { create: jest.fn(), find: jest.fn() };
    resultStrategicObjectivesService = { create: jest.fn(), find: jest.fn() };
    resultImpactOutcomesService = { create: jest.fn(), find: jest.fn() };
    strategicObjectivesService = {
      findActiveByIdsForPortfolio: jest.fn(),
    };

    handler = new Portfolio2AlignmentHandler(
      {} as DataSource,
      alignmentOperations as unknown as ResultAlignmentOperationsService,
      resultLeversService as unknown as ResultLeversService,
      resultStrategicObjectivesService as unknown as ResultStrategicObjectivesService,
      resultImpactOutcomesService as unknown as ResultImpactOutcomesService,
      strategicObjectivesService as unknown as StrategicObjectivesService,
    );
  });

  it('should expose portfolio 2 metadata', () => {
    expect(handler.portfolioId).toBe(PortfolioIdEnum.PORTFOLIO_2);
    expect(handler.sectionKey).toBe(ResultSectionKeyEnum.ALIGNMENT);
  });

  describe('save', () => {
    const payload = {
      contracts: [{ contract_id: 'C1' }],
      primary_levers: [{ lever_id: '1' }],
      contributor_levers: [{ lever_id: '2' }],
      research_areas: [{ lever_id: '123', custom_lever_name: 'Custom RA' }],
      strategic_objectives: [{ strategic_objective_id: 1 }],
      impact_outcomes: [{ impact_outcome_id: 2 }],
      result_sdgs: [],
    } as any;

    const baseAlignment = {
      contracts: payload.contracts,
      primary_levers: [{ lever_id: 'legacy' }],
      contributor_levers: [{ lever_id: 'legacy-2' }],
      result_sdgs: [],
    };
    const researchAreas = [{ lever_id: 123, result_lever_id: 100 }];
    const strategicObjectives = [
      { strategic_objective_id: 1, result_strategic_objective_id: 200 },
    ];
    const impactOutcomes = [
      { impact_outcome_id: 2, result_impact_outcome_id: 300 },
    ];

    beforeEach(() => {
      alignmentOperations.save.mockResolvedValue({ ...baseAlignment } as any);
      resultLeversService.create.mockResolvedValue(researchAreas as any);
      resultStrategicObjectivesService.create.mockResolvedValue(
        strategicObjectives as any,
      );
      resultImpactOutcomesService.create.mockResolvedValue(
        impactOutcomes as any,
      );
    });

    it('should clear legacy levers and persist portfolio 2 alignment fields', async () => {
      const context: PortfolioHandlerContext = {
        ...baseContext,
        result: { indicator_id: IndicatorsEnum.KNOWLEDGE_PRODUCT },
      };

      const result = await handler.save(context, payload);

      expect(payload.primary_levers).toEqual([]);
      expect(payload.contributor_levers).toEqual([]);
      expect(alignmentOperations.save).toHaveBeenCalledWith(
        context.resultId,
        payload,
        manager,
      );
      expect(resultLeversService.create).toHaveBeenCalledWith(
        context.resultId,
        [
          {
            lever_id: 123,
            is_primary: true,
            custom_lever_name: 'Custom RA',
          },
        ],
        'lever_id',
        LeverRolesEnum.RESEARCH_AREAS_ALIGNMENT,
        manager,
        ['is_primary', 'custom_lever_name'],
      );
      expect(resultStrategicObjectivesService.create).toHaveBeenCalledWith(
        context.resultId,
        [{ strategic_objective_id: 1 }],
        'strategic_objective_id',
        ResultStrategicObjectiveRolesEnum.ALIGNMENT,
        manager,
      );
      expect(resultImpactOutcomesService.create).not.toHaveBeenCalled();
      expect(result.primary_levers).toBeUndefined();
      expect(result.contributor_levers).toBeUndefined();
      expect(result).toEqual({
        contracts: baseAlignment.contracts,
        result_sdgs: baseAlignment.result_sdgs,
        research_areas: researchAreas,
        strategic_objectives: strategicObjectives,
      });
    });

    it('should persist impact outcomes when indicator is OICR', async () => {
      const context: PortfolioHandlerContext = {
        ...baseContext,
        result: { indicator_id: IndicatorsEnum.OICR },
      };

      const result = await handler.save(context, payload);

      expect(resultImpactOutcomesService.create).toHaveBeenCalledWith(
        context.resultId,
        [{ impact_outcome_id: 2 }],
        'impact_outcome_id',
        ResultImpactOutcomeRolesEnum.ALIGNMENT,
        manager,
      );
      expect(result.impact_outcomes).toEqual(impactOutcomes);
    });

    it('should persist impact outcomes when indicator is POLICY_CHANGE', async () => {
      const context: PortfolioHandlerContext = {
        ...baseContext,
        result: { indicator_id: IndicatorsEnum.POLICY_CHANGE },
      };

      const result = await handler.save(context, payload);

      expect(resultImpactOutcomesService.create).toHaveBeenCalledWith(
        context.resultId,
        [{ impact_outcome_id: 2 }],
        'impact_outcome_id',
        ResultImpactOutcomeRolesEnum.ALIGNMENT,
        manager,
      );
      expect(result.impact_outcomes).toEqual(impactOutcomes);
    });

    it('tolerates a payload omitting strategic_objectives and impact_outcomes (R-RES-010)', async () => {
      const context: PortfolioHandlerContext = {
        ...baseContext,
        result: { indicator_id: IndicatorsEnum.OICR },
      };
      const payloadWithoutArrays = {
        contracts: payload.contracts,
        primary_levers: payload.primary_levers,
        contributor_levers: payload.contributor_levers,
        research_areas: payload.research_areas,
        result_sdgs: payload.result_sdgs,
        // strategic_objectives and impact_outcomes are absent entirely.
      } as any;

      await expect(
        handler.save(context, payloadWithoutArrays),
      ).resolves.toBeDefined();

      expect(resultStrategicObjectivesService.create).toHaveBeenCalledWith(
        context.resultId,
        [],
        'strategic_objective_id',
        ResultStrategicObjectiveRolesEnum.ALIGNMENT,
        manager,
      );
      // The OICR/POLICY_CHANGE gate itself must stay byte-identical: it
      // still calls resultImpactOutcomesService.create for this indicator,
      // just with an empty array rather than throwing.
      expect(resultImpactOutcomesService.create).toHaveBeenCalledWith(
        context.resultId,
        [],
        'impact_outcome_id',
        ResultImpactOutcomeRolesEnum.ALIGNMENT,
        manager,
      );
    });

    it('tolerates a payload with strategic_objectives and impact_outcomes explicitly null (R-RES-010)', async () => {
      const context: PortfolioHandlerContext = {
        ...baseContext,
        result: { indicator_id: IndicatorsEnum.OICR },
      };
      const payloadWithNullArrays = {
        ...payload,
        strategic_objectives: null,
        impact_outcomes: null,
      } as any;

      await expect(
        handler.save(context, payloadWithNullArrays),
      ).resolves.toBeDefined();

      expect(resultStrategicObjectivesService.create).toHaveBeenCalledWith(
        context.resultId,
        [],
        'strategic_objective_id',
        ResultStrategicObjectiveRolesEnum.ALIGNMENT,
        manager,
      );
      expect(resultImpactOutcomesService.create).toHaveBeenCalledWith(
        context.resultId,
        [],
        'impact_outcome_id',
        ResultImpactOutcomeRolesEnum.ALIGNMENT,
        manager,
      );
    });
  });

  describe('saveStrategicObjectives', () => {
    // A genuine predicate evaluator over the fixture list — not a canned
    // return value — so the foreign-portfolio and inactive discard cases can
    // actually fail against an implementation that filters only by id
    // (KZ-001), matching the standard portfolios.service.spec.ts sets.
    const buildFixture = (overrides: Record<string, any>) => ({
      id: 1,
      portfolio_id: PortfolioIdEnum.PORTFOLIO_2,
      is_active: true,
      ...overrides,
    });

    const fakeFindActiveByIdsForPortfolio = (fixtures: Record<string, any>[]) =>
      (async (ids: number[], portfolioId: number) =>
        fixtures.filter(
          (fixture) =>
            ids.includes(fixture.id) &&
            fixture.portfolio_id === portfolioId &&
            fixture.is_active,
        )) as unknown as (
        ids: number[],
        portfolioId: number,
      ) => Promise<StrategicObjective[]>;

    it('saves the survivors and discards the rest for a mixed list (R-RES-005 scenario 1)', async () => {
      const fixtures = [buildFixture({ id: 1 }), buildFixture({ id: 3 })];
      strategicObjectivesService.findActiveByIdsForPortfolio.mockImplementation(
        fakeFindActiveByIdsForPortfolio(fixtures),
      );
      resultStrategicObjectivesService.create.mockResolvedValue([
        { strategic_objective_id: 1 },
        { strategic_objective_id: 3 },
      ] as any);

      const report = await handler.saveStrategicObjectives(
        baseContext.resultId,
        [1, 999, 3],
      );

      expect(
        strategicObjectivesService.findActiveByIdsForPortfolio,
      ).toHaveBeenCalledWith([1, 999, 3], PortfolioIdEnum.PORTFOLIO_2);
      expect(resultStrategicObjectivesService.create).toHaveBeenCalledWith(
        baseContext.resultId,
        [{ strategic_objective_id: 1 }, { strategic_objective_id: 3 }],
        'strategic_objective_id',
        ResultStrategicObjectiveRolesEnum.ALIGNMENT,
      );
      expect(report).toEqual({
        supported: true,
        saved: [1, 3],
        discarded: [999],
      });
    });

    it('discards an id owned by another portfolio and an id whose row is inactive (R-RES-005 AND IT MUST clause)', async () => {
      const fixtures = [
        buildFixture({ id: 1 }),
        buildFixture({ id: 2, portfolio_id: PortfolioIdEnum.PORTFOLIO_1 }),
        buildFixture({ id: 3, is_active: false }),
      ];
      strategicObjectivesService.findActiveByIdsForPortfolio.mockImplementation(
        fakeFindActiveByIdsForPortfolio(fixtures),
      );
      resultStrategicObjectivesService.create.mockResolvedValue([
        { strategic_objective_id: 1 },
      ] as any);

      const report = await handler.saveStrategicObjectives(
        baseContext.resultId,
        [1, 2, 3],
      );

      expect(resultStrategicObjectivesService.create).toHaveBeenCalledWith(
        baseContext.resultId,
        [{ strategic_objective_id: 1 }],
        'strategic_objective_id',
        ResultStrategicObjectiveRolesEnum.ALIGNMENT,
      );
      expect(report).toEqual({
        supported: true,
        saved: [1],
        discarded: [2, 3],
      });
    });

    it('deduplicates ids before validating and persisting (R-RES-005 AC.3)', async () => {
      const fixtures = [buildFixture({ id: 1 }), buildFixture({ id: 3 })];
      strategicObjectivesService.findActiveByIdsForPortfolio.mockImplementation(
        fakeFindActiveByIdsForPortfolio(fixtures),
      );
      resultStrategicObjectivesService.create.mockResolvedValue([
        { strategic_objective_id: 1 },
        { strategic_objective_id: 3 },
      ] as any);

      const report = await handler.saveStrategicObjectives(
        baseContext.resultId,
        [1, 1, 3],
      );

      expect(
        strategicObjectivesService.findActiveByIdsForPortfolio,
      ).toHaveBeenCalledWith([1, 3], PortfolioIdEnum.PORTFOLIO_2);
      expect(resultStrategicObjectivesService.create).toHaveBeenCalledWith(
        baseContext.resultId,
        [{ strategic_objective_id: 1 }, { strategic_objective_id: 3 }],
        'strategic_objective_id',
        ResultStrategicObjectiveRolesEnum.ALIGNMENT,
      );
      expect(report).toEqual({ supported: true, saved: [1, 3], discarded: [] });
    });

    it('writes nothing and does not touch create at all when every id is empty', async () => {
      const report = await handler.saveStrategicObjectives(
        baseContext.resultId,
        [],
      );

      expect(
        strategicObjectivesService.findActiveByIdsForPortfolio,
      ).not.toHaveBeenCalled();
      expect(resultStrategicObjectivesService.create).not.toHaveBeenCalled();
      expect(report).toEqual({ supported: true, saved: [], discarded: [] });
    });

    it(
      'does NOT call create — and so does not deactivate a pre-existing row — when every id is invalid ' +
        '(R-RES-005 scenario 2, the empty-survivor trap)',
      async () => {
        // A stateful fake standing in for BaseServiceSimple.create's real
        // reconciliation behaviour: it deactivates any pre-existing row not
        // present in the incoming array. If the handler ever called
        // create([]) for the empty-survivor case, this fake would flip
        // `preExisting[0].is_active` to false and the assertion below would
        // go red (KZ-001) — proven by the falsifier probe in the task report.
        const preExisting = [{ strategic_objective_id: 5, is_active: true }];
        resultStrategicObjectivesService.create.mockImplementation((async (
          _resultId: number,
          dataToSave: { strategic_objective_id: number }[],
        ) => {
          const incomingIds = new Set(
            dataToSave.map((row) => row.strategic_objective_id),
          );
          preExisting.forEach((row) => {
            row.is_active = incomingIds.has(row.strategic_objective_id);
          });
          return preExisting.filter((row) => row.is_active);
        }) as any);
        strategicObjectivesService.findActiveByIdsForPortfolio.mockResolvedValue(
          [],
        );

        const report = await handler.saveStrategicObjectives(
          baseContext.resultId,
          [999, 1000],
        );

        expect(resultStrategicObjectivesService.create).not.toHaveBeenCalled();
        expect(preExisting).toEqual([
          { strategic_objective_id: 5, is_active: true },
        ]);
        expect(report).toEqual({
          supported: true,
          saved: [],
          discarded: [999, 1000],
        });
      },
    );
  });

  describe('find', () => {
    const baseAlignment = {
      contracts: [{ contract_id: 'C1' }],
      primary_levers: [{ lever_id: '1' }],
      contributor_levers: [{ lever_id: '2' }],
      result_sdgs: [],
    };

    beforeEach(() => {
      alignmentOperations.find.mockResolvedValue({ ...baseAlignment } as any);
      resultLeversService.find.mockResolvedValue([
        { lever_id: 'RA1', result_lever_id: 100 },
      ] as any);
      resultStrategicObjectivesService.find.mockResolvedValue([
        { strategic_objective_id: 1 },
      ] as any);
      resultImpactOutcomesService.find.mockResolvedValue([
        { impact_outcome_id: 2 },
      ] as any);
    });

    it('should omit legacy levers and include research areas and strategic objectives', async () => {
      const context: PortfolioHandlerContext = {
        ...baseContext,
        result: { indicator_id: IndicatorsEnum.KNOWLEDGE_PRODUCT },
      };

      const result = await handler.find(context);

      expect(result.primary_levers).toBeUndefined();
      expect(result.contributor_levers).toBeUndefined();
      expect(result.contracts).toEqual(baseAlignment.contracts);
      expect(result.research_areas).toHaveLength(1);
      expect(result.strategic_objectives).toHaveLength(1);
      expect(resultImpactOutcomesService.find).not.toHaveBeenCalled();
      expect(result.impact_outcomes).toBeUndefined();
    });

    it('should include impact outcomes when indicator is OICR', async () => {
      const context: PortfolioHandlerContext = {
        ...baseContext,
        result: { indicator_id: IndicatorsEnum.OICR },
      };

      const result = await handler.find(context);

      expect(resultImpactOutcomesService.find).toHaveBeenCalledWith(
        baseContext.resultId,
        ResultImpactOutcomeRolesEnum.ALIGNMENT,
      );
      expect(result.impact_outcomes).toHaveLength(1);
    });

    it('should include impact outcomes when indicator is POLICY_CHANGE', async () => {
      const context: PortfolioHandlerContext = {
        ...baseContext,
        result: { indicator_id: IndicatorsEnum.POLICY_CHANGE },
      };

      const result = await handler.find(context);

      expect(resultImpactOutcomesService.find).toHaveBeenCalledWith(
        baseContext.resultId,
        ResultImpactOutcomeRolesEnum.ALIGNMENT,
      );
      expect(result.impact_outcomes).toHaveLength(1);
    });
  });
});
