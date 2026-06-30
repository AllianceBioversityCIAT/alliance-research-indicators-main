import { Portfolio2AlignmentHandler } from './portfolio-2-alignment.handler';
import { ResultAlignmentOperationsService } from '../shared/result-alignment-operations.service';
import { ResultLeversService } from '../../../../../result-levers/result-levers.service';
import { ResultStrategicObjectivesService } from '../../../../../result-strategic-objectives/result-strategic-objectives.service';
import { ResultImpactOutcomesService } from '../../../../../result-impact-outcomes/result-impact-outcomes.service';
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

    handler = new Portfolio2AlignmentHandler(
      {} as DataSource,
      alignmentOperations as unknown as ResultAlignmentOperationsService,
      resultLeversService as unknown as ResultLeversService,
      resultStrategicObjectivesService as unknown as ResultStrategicObjectivesService,
      resultImpactOutcomesService as unknown as ResultImpactOutcomesService,
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
      research_areas: [{ lever_id: 'RA1' }],
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
    const researchAreas = [{ lever_id: 'RA1', result_lever_id: 100 }];
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
        payload.research_areas,
        'lever_id',
        LeverRolesEnum.RESEARCH_AREAS_ALIGNMENT,
        manager,
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
