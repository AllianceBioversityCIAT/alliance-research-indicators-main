import { Injectable } from '@nestjs/common';
import { PortfolioIdEnum } from '../../../enum/portfolio-id.enum';
import { ResultSectionKeyEnum } from '../../../enum/result-section-key.enum';
import { PortfolioHandlerContext } from '../../../core/portfolio-handler-context.interface';
import { ResultAlignmentDto } from '../../../../dto/result-alignment.dto';
import {
  AlignmentSectionHandler,
  AlignmentSectionView,
} from '../alignment-section-handler.interface';
import { ResultAlignmentOperationsService } from '../shared/result-alignment-operations.service';
import { ResultLeversService } from '../../../../../result-levers/result-levers.service';
import { LeverRolesEnum } from '../../../../../lever-roles/enum/lever-roles.enum';
import { ResultStrategicObjectivesService } from '../../../../../result-strategic-objectives/result-strategic-objectives.service';
import { ResultImpactOutcomesService } from '../../../../../result-impact-outcomes/result-impact-outcomes.service';
import { ResultStrategicObjectiveRolesEnum } from '../../../../../result-strategic-objectives/enum/result-strategic-objective-roles.enum';
import { ResultImpactOutcomeRolesEnum } from '../../../../../result-impact-outcomes/enum/result-impact-outcome-roles.enum';
import { DataSource } from 'typeorm';
import { IndicatorsEnum } from '../../../../../indicators/enum/indicators.enum';

/**
 * Portfolio 2 (2026–2030) — test handler.
 * Reuses legacy save/find for now; extend here with portfolio-specific rules.
 */
@Injectable()
export class Portfolio2AlignmentHandler implements AlignmentSectionHandler {
  readonly portfolioId = PortfolioIdEnum.PORTFOLIO_2;
  readonly sectionKey = ResultSectionKeyEnum.ALIGNMENT;

  constructor(
    private readonly dataSource: DataSource,
    private readonly alignmentOperations: ResultAlignmentOperationsService,
    private readonly resultLeversService: ResultLeversService,
    private readonly resultStrategicObjectivesService: ResultStrategicObjectivesService,
    private readonly resultImpactOutcomesService: ResultImpactOutcomesService,
  ) {}

  async save(
    context: PortfolioHandlerContext,
    payload: ResultAlignmentDto,
  ): Promise<Partial<ResultAlignmentDto>> {
    payload.primary_levers = [];
    payload.contributor_levers = [];
    let responseData: Partial<ResultAlignmentDto> = {};

    const alignment = await this.alignmentOperations.save(
      context.resultId,
      payload,
      context?.manager,
    );

    delete alignment?.primary_levers;
    delete alignment?.contributor_levers;

    responseData = { ...alignment };

    const researchAreas = await this.resultLeversService.create(
      context.resultId,
      payload.research_areas,
      'lever_id',
      LeverRolesEnum.RESEARCH_AREAS_ALIGNMENT,
      context.manager,
    );

    responseData.research_areas = researchAreas;

    const strategicObjectives =
      await this.resultStrategicObjectivesService.create(
        context.resultId,
        payload.strategic_objectives.map((strategicObjective) => ({
          strategic_objective_id: strategicObjective.strategic_objective_id,
        })),
        'strategic_objective_id',
        ResultStrategicObjectiveRolesEnum.ALIGNMENT,
        context.manager,
      );

    responseData.strategic_objectives = strategicObjectives;

    if (
      [IndicatorsEnum.OICR, IndicatorsEnum.POLICY_CHANGE].includes(
        context.result?.indicator_id,
      )
    ) {
      const impactOutcomes = await this.resultImpactOutcomesService.create(
        context.resultId,
        payload.impact_outcomes.map((impactOutcome) => ({
          impact_outcome_id: impactOutcome.impact_outcome_id,
        })),
        'impact_outcome_id',
        ResultImpactOutcomeRolesEnum.ALIGNMENT,
        context.manager,
      );

      responseData.impact_outcomes = impactOutcomes;
    }

    return responseData;
  }

  async find(
    context: PortfolioHandlerContext,
  ): Promise<Partial<AlignmentSectionView>> {
    let responseData: Partial<AlignmentSectionView> = {};
    const alignment = await this.alignmentOperations.find(context.resultId);
    responseData = { ...alignment };

    delete responseData.primary_levers;
    delete responseData.contributor_levers;

    const researchAreas = await this.resultLeversService.find(
      context.resultId,
      LeverRolesEnum.RESEARCH_AREAS_ALIGNMENT,
    );
    responseData.research_areas = researchAreas;
    const strategicObjectives =
      await this.resultStrategicObjectivesService.find(
        context.resultId,
        ResultStrategicObjectiveRolesEnum.ALIGNMENT,
      );
    responseData.strategic_objectives = strategicObjectives;

    if (
      [IndicatorsEnum.OICR, IndicatorsEnum.POLICY_CHANGE].includes(
        context.result?.indicator_id,
      )
    ) {
      const impactOutcomes = await this.resultImpactOutcomesService.find(
        context.resultId,
        ResultImpactOutcomeRolesEnum.ALIGNMENT,
      );
      responseData.impact_outcomes = impactOutcomes;
    }

    return responseData;
  }
}
