import { Injectable } from '@nestjs/common';
import { PortfolioIdEnum } from '../../../enum/portfolio-id.enum';
import { ResultSectionKeyEnum } from '../../../enum/result-section-key.enum';
import { PortfolioHandlerContext } from '../../../core/portfolio-handler-context.interface';
import { ResultAlignmentDto } from '../../../../dto/result-alignment.dto';
import {
  AlignmentSectionHandler,
  AlignmentSectionView,
  LeversSaveReport,
  StrategicObjectivesSaveReport,
} from '../alignment-section-handler.interface';
import { ResultAlignmentOperationsService } from '../shared/result-alignment-operations.service';
import { ResultLeversService } from '../../../../../result-levers/result-levers.service';
import { ClarisaLeversService } from '../../../../../../tools/clarisa/entities/clarisa-levers/clarisa-levers.service';
import { LeverRolesEnum } from '../../../../../lever-roles/enum/lever-roles.enum';
import { ResultStrategicObjectivesService } from '../../../../../result-strategic-objectives/result-strategic-objectives.service';
import { StrategicObjectivesService } from '../../../../../strategic-objectives/strategic-objectives.service';
import { ResultImpactOutcomesService } from '../../../../../result-impact-outcomes/result-impact-outcomes.service';
import { ResultStrategicObjectiveRolesEnum } from '../../../../../result-strategic-objectives/enum/result-strategic-objective-roles.enum';
import { ResultImpactOutcomeRolesEnum } from '../../../../../result-impact-outcomes/enum/result-impact-outcome-roles.enum';
import { DataSource } from 'typeorm';
import { IndicatorsEnum } from '../../../../../indicators/enum/indicators.enum';
import { ResultLever } from '../../../../../result-levers/entities/result-lever.entity';

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
    private readonly strategicObjectivesService: StrategicObjectivesService,
    private readonly clarisaLeversService: ClarisaLeversService,
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

    // DD-10 (amended 2026-09-04, second Pivot): an absent/`null`
    // `research_areas` is treated as empty, matching the guard `[SO]
    // R-RES-010` already applies to `strategic_objectives` and
    // `impact_outcomes` below. This is a TYPE-HONESTY / sibling-consistency
    // alignment, NOT a wipe guard: `create`'s only consumer of this
    // argument is `formatDataToArray` (base-service.ts:130-132), and
    // `isNotEmpty` (array.util.ts:89-93) maps `undefined`/`null` and `[]`
    // alike to `[]` one call later, so this expression is behaviour-neutral
    // — the declared `Partial<ResultLever>[]` simply no longer holds
    // `undefined` at runtime. The real, pre-existing hazard — `create`
    // reconciling the whole `(result_id, role)` set when an absent key
    // effectively passes an empty array — remains open and out of scope
    // here; see execution.md → Pivot Record: T-03 (second).
    const saveResearchAreas: Partial<ResultLever>[] = (
      payload?.research_areas ?? []
    ).map((researchArea) => ({
      lever_id: parseInt(researchArea?.lever_id) as unknown as string,
      is_primary: true,
      custom_lever_name: researchArea?.custom_lever_name,
    }));

    const researchAreas = await this.resultLeversService.create(
      context.resultId,
      saveResearchAreas,
      'lever_id',
      LeverRolesEnum.RESEARCH_AREAS_ALIGNMENT,
      context.manager,
      ['is_primary', 'custom_lever_name'],
    );

    responseData.research_areas = researchAreas;

    const strategicObjectives =
      await this.resultStrategicObjectivesService.create(
        context.resultId,
        (payload.strategic_objectives ?? []).map((strategicObjective) => ({
          strategic_objective_id: parseInt(
            strategicObjective?.strategic_objective_id as unknown as string,
          ),
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
        (payload.impact_outcomes ?? []).map((impactOutcome) => ({
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

  /**
   * Narrow strategic-objectives-only save (DD-1/DD-4). Validates ids
   * against portfolio 2's own `strategic_objectives` rows and writes only
   * the survivors — never calls `ResultAlignmentOperationsService.save` or
   * threads an `EntityManager` (DD-8), so it cannot reach, let alone
   * reconcile away, any row the section-wide `save` owns.
   */
  async saveStrategicObjectives(
    resultId: number,
    ids: number[],
  ): Promise<StrategicObjectivesSaveReport> {
    const uniqueIds = Array.from(new Set(ids ?? []));

    if (uniqueIds.length === 0) {
      return { supported: true, saved: [], discarded: [] };
    }

    const validObjectives =
      await this.strategicObjectivesService.findActiveByIdsForPortfolio(
        uniqueIds,
        this.portfolioId,
      );
    const validIds = new Set(validObjectives.map((objective) => objective.id));

    const saved = uniqueIds.filter((id) => validIds.has(id));
    const discarded = uniqueIds.filter((id) => !validIds.has(id));

    // BaseServiceSimple.create is a reconciler: calling it with an empty
    // array would deactivate every pre-existing ALIGNMENT-role row for this
    // result (design.md's DD-1 rationale). When nothing survived validation
    // there is nothing to write, so the call must not happen at all.
    if (saved.length === 0) {
      return { supported: true, saved: [], discarded };
    }

    await this.resultStrategicObjectivesService.create(
      resultId,
      saved.map((strategicObjectiveId) => ({
        strategic_objective_id: strategicObjectiveId,
      })),
      'strategic_objective_id',
      ResultStrategicObjectiveRolesEnum.ALIGNMENT,
    );

    return { supported: true, saved, discarded };
  }

  /**
   * Narrow levers-only save (design.md DD-1/DD-2/DD-3/DD-9). Portfolio 2
   * treats `primary_levers` ids as **research areas**: validates them
   * against its own lever set, deduplicates, and writes the survivors
   * directly at `lever_role_id = RESEARCH_AREAS_ALIGNMENT` — the same role
   * and `is_primary` value its own section `save` uses for
   * `research_areas` above (DD-9) — never by constructing a
   * `research_areas` payload and delegating to that section save, which is
   * precisely what DD-1 forbids.
   */
  async saveLevers(resultId: number, ids: number[]): Promise<LeversSaveReport> {
    const uniqueIds = Array.from(new Set(ids ?? []));

    if (uniqueIds.length === 0) {
      return { saved: [], discarded: [] };
    }

    const validLevers =
      await this.clarisaLeversService.findActiveByIdsForPortfolio(
        uniqueIds,
        this.portfolioId,
      );
    // clarisa_levers.id sits on a `@PrimaryGeneratedColumn({ type: 'bigint' })`
    // column declared `number` on the entity but hydrated as a *string* by
    // TypeORM — normalize both sides before comparing, or every id
    // classifies as discarded despite a perfectly correct query
    // (execution.md T-02 advisory; RK-3).
    const validIds = new Set(validLevers.map((lever) => Number(lever.id)));

    const saved = uniqueIds.filter((id) => validIds.has(Number(id)));
    const discarded = uniqueIds.filter((id) => !validIds.has(Number(id)));

    // BaseServiceSimple.create is a reconciler: calling it with an empty
    // array would deactivate every pre-existing RESEARCH_AREAS_ALIGNMENT
    // row for this result (design.md DD-1's rationale, R-RES-005 AC.4).
    // Nothing survived validation, so the call must not happen at all.
    if (saved.length === 0) {
      return { saved: [], discarded };
    }

    await this.resultLeversService.create(
      resultId,
      saved.map((leverId) => ({
        lever_id: leverId as unknown as string,
        is_primary: true,
      })),
      'lever_id',
      LeverRolesEnum.RESEARCH_AREAS_ALIGNMENT,
      undefined,
      ['is_primary'],
    );

    return { saved, discarded };
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
