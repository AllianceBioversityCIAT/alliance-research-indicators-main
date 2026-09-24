import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { ResultAlignmentDto } from '../../../../dto/result-alignment.dto';
import { ResultContractsService } from '../../../../../result-contracts/result-contracts.service';
import { ContractRolesEnum } from '../../../../../result-contracts/enum/contract-roles.enum';
import { ResultLeversService } from '../../../../../result-levers/result-levers.service';
import { LeverRolesEnum } from '../../../../../lever-roles/enum/lever-roles.enum';
import { ResultLeverStrategicOutcomeService } from '../../../../../result-lever-strategic-outcome/result-lever-strategic-outcome.service';
import { ResultLeverSdgTargetsService } from '../../../../../result-lever-sdg-targets/result-lever-sdg-targets.service';
import { ResultSdgsService } from '../../../../../result-sdgs/result-sdgs.service';
import { ResultStrategicObjectivesService } from '../../../../../result-strategic-objectives/result-strategic-objectives.service';
import { ResultImpactOutcomesService } from '../../../../../result-impact-outcomes/result-impact-outcomes.service';
import { ResultSdgTargetsService } from '../../../../../result-sdg-targets/result-sdg-targets.service';
import { ResultStrategicObjectiveRolesEnum } from '../../../../../result-strategic-objectives/enum/result-strategic-objective-roles.enum';
import { ResultImpactOutcomeRolesEnum } from '../../../../../result-impact-outcomes/enum/result-impact-outcome-roles.enum';
import { PortfolioIdEnum } from '../../../enum/portfolio-id.enum';
import { UpdateDataUtil } from '../../../../../../shared/utils/update-data.util';
import { filterByUniqueKeyWithPriority } from '../../../../../../shared/utils/array.util';
import { ResultLever } from '../../../../../result-levers/entities/result-lever.entity';

@Injectable()
export class ResultAlignmentOperationsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly resultContractsService: ResultContractsService,
    private readonly resultLeversService: ResultLeversService,
    private readonly resultLeverStrategicOutcomeService: ResultLeverStrategicOutcomeService,
    private readonly resultLeverSdgTargetsService: ResultLeverSdgTargetsService,
    private readonly resultSdgsService: ResultSdgsService,
    private readonly resultStrategicObjectivesService: ResultStrategicObjectivesService,
    private readonly resultImpactOutcomesService: ResultImpactOutcomesService,
    private readonly resultSdgTargetsService: ResultSdgTargetsService,
    private readonly updateDataUtil: UpdateDataUtil,
  ) {}

  /**
   * Drops alignment rows that the destination portfolio does not show.
   * Portfolio 2025 hides research areas, strategic objectives, impact outcomes
   * and the result-level SDG target list. Portfolio 2026 hides primary and
   * contributing levers, including their lever SDG targets and outcomes.
   */
  async clearFieldsHiddenByPortfolio(
    resultId: number,
    portfolioId: number,
    manager?: EntityManager,
  ): Promise<void> {
    if (portfolioId === PortfolioIdEnum.PORTFOLIO_1) {
      await this.clearPortfolio2026Fields(resultId, manager);
      return;
    }
    if (portfolioId === PortfolioIdEnum.PORTFOLIO_2) {
      await this.clearPortfolio2025Fields(resultId, manager);
    }
  }

  private async clearPortfolio2026Fields(
    resultId: number,
    manager?: EntityManager,
  ): Promise<void> {
    await this.resultLeversService.create(
      resultId,
      [],
      'lever_id',
      LeverRolesEnum.RESEARCH_AREAS_ALIGNMENT,
      manager,
    );
    await this.resultStrategicObjectivesService.create(
      resultId,
      [],
      'strategic_objective_id',
      ResultStrategicObjectiveRolesEnum.ALIGNMENT,
      manager,
    );
    await this.resultImpactOutcomesService.create(
      resultId,
      [],
      'impact_outcome_id',
      ResultImpactOutcomeRolesEnum.ALIGNMENT,
      manager,
    );
    await this.resultSdgTargetsService.replaceForResult(resultId, [], manager);
  }

  private async clearPortfolio2025Fields(
    resultId: number,
    manager?: EntityManager,
  ): Promise<void> {
    const levers = await this.resultLeversService.find(
      resultId,
      LeverRolesEnum.ALIGNMENT,
    );
    for (const lever of levers) {
      await this.resultLeverStrategicOutcomeService.create(
        lever.result_lever_id,
        [],
        'lever_strategic_outcome_id',
        undefined,
        manager,
      );
      await this.resultLeverSdgTargetsService.create(
        lever.result_lever_id,
        [],
        'sdg_target_id',
        undefined,
        manager,
      );
    }
    await this.resultLeversService.create(
      resultId,
      [],
      'lever_id',
      LeverRolesEnum.ALIGNMENT,
      manager,
    );
  }

  async save(
    resultId: number,
    alignmentData: ResultAlignmentDto,
    manager?: EntityManager,
  ): Promise<ResultAlignmentDto> {
    const run = async (entityManager: EntityManager) => {
      const { contracts, primary_levers, contributor_levers } = alignmentData;

      await this.resultContractsService.create<ContractRolesEnum>(
        resultId,
        contracts,
        'contract_id',
        ContractRolesEnum.ALIGNMENT,
        entityManager,
        ['is_primary'],
        { is_primary: false },
      );

      const primaryLevers: Partial<ResultLever>[] =
        primary_levers?.length > 0
          ? primary_levers.map((el) => ({
              lever_id: el.lever_id,
              is_primary: true,
              custom_lever_name: el?.custom_lever_name,
              result_lever_strategic_outcomes:
                el?.result_lever_strategic_outcomes,
              result_lever_sdg_targets: el?.result_lever_sdg_targets,
            }))
          : [];

      const contributorLevers: Partial<ResultLever>[] =
        contributor_levers?.length > 0
          ? contributor_levers.map((el) => ({
              lever_id: el.lever_id,
              is_primary: false,
              custom_lever_name: el?.custom_lever_name,
              result_lever_sdg_targets: el?.result_lever_sdg_targets,
            }))
          : [];

      const fullLevers = filterByUniqueKeyWithPriority<Partial<ResultLever>>(
        [...primaryLevers, ...contributorLevers],
        'lever_id',
        'is_primary',
      );

      const newLevers = await this.resultLeversService.create<LeverRolesEnum>(
        resultId,
        fullLevers,
        'lever_id',
        LeverRolesEnum.ALIGNMENT,
        entityManager,
        ['is_primary', 'custom_lever_name'],
        { is_primary: false },
      );

      const emergedLever =
        await this.resultLeversService.comparerClientToServer(
          resultId,
          fullLevers,
          LeverRolesEnum.ALIGNMENT,
          newLevers,
        );

      for (const lever of emergedLever) {
        await this.resultLeverStrategicOutcomeService.create(
          lever.result_lever_id,
          this.strategicOutcomesToSave(lever?.result_lever_strategic_outcomes),
          'lever_strategic_outcome_id',
          undefined,
          entityManager,
        );
      }

      for (const lever of emergedLever) {
        await this.resultLeverSdgTargetsService.create(
          lever.result_lever_id,
          (lever?.result_lever_sdg_targets ?? []).map((target) => ({
            ...target,
            result_id: resultId,
          })),
          'sdg_target_id',
          undefined,
          entityManager,
          ['result_id'],
        );
      }

      await this.resultSdgsService.create(
        resultId,
        alignmentData.result_sdgs,
        'clarisa_sdg_id',
        undefined,
        entityManager,
      );

      await this.updateDataUtil.updateLastUpdatedDate(resultId, entityManager);
    };

    if (manager) {
      await run(manager);
      return this.find(resultId);
    }

    await this.dataSource.transaction(run);
    return this.find(resultId);
  }

  async find(resultId: number): Promise<ResultAlignmentDto> {
    const contracts = await this.resultContractsService.find(
      resultId,
      ContractRolesEnum.ALIGNMENT,
    );

    const levers = await this.resultLeversService.find(
      resultId,
      LeverRolesEnum.ALIGNMENT,
    );

    const sdgTargets =
      await this.resultLeverSdgTargetsService.findByMultiplesResultLeverIds(
        levers.map((el) => el.result_lever_id),
      );

    levers.forEach((lever) => {
      lever.result_lever_sdg_targets = sdgTargets.filter(
        (sdgTarget) => sdgTarget.result_lever_id === lever.result_lever_id,
      );
    });

    const primaryLevers = levers.filter((el) => el.is_primary);

    const strategicOutcomes =
      await this.resultLeverStrategicOutcomeService.findByMultiplesResultLeverIds(
        primaryLevers.map((el) => el.result_lever_id),
      );

    primaryLevers.forEach((lever) => {
      lever.result_lever_strategic_outcomes = strategicOutcomes.filter(
        (so) => Number(so.result_lever_id) === Number(lever.result_lever_id),
      );
    });

    const result_sdgs = await this.resultSdgsService.find(resultId);

    return {
      contracts,
      primary_levers: primaryLevers,
      contributor_levers: levers?.filter((el) => !el.is_primary),
      result_sdgs,
    };
  }

  /**
   * Persist only the catalog key. `id` on the payload is the catalog id, and the
   * junction row uses the same column name as its primary key. Passing it through
   * updates an existing row instead of inserting one outcome per selection.
   */
  private strategicOutcomesToSave(
    outcomes:
      | { id?: number; lever_strategic_outcome_id?: number }[]
      | undefined,
  ): { lever_strategic_outcome_id: number }[] {
    const seen = new Set<number>();
    const saved: { lever_strategic_outcome_id: number }[] = [];

    for (const outcome of outcomes ?? []) {
      const leverStrategicOutcomeId = Number(
        outcome?.lever_strategic_outcome_id ?? outcome?.id,
      );
      if (
        !Number.isFinite(leverStrategicOutcomeId) ||
        leverStrategicOutcomeId <= 0 ||
        seen.has(leverStrategicOutcomeId)
      ) {
        continue;
      }
      seen.add(leverStrategicOutcomeId);
      saved.push({ lever_strategic_outcome_id: leverStrategicOutcomeId });
    }

    return saved;
  }
}
