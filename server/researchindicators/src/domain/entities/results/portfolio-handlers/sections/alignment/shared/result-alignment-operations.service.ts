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
    private readonly updateDataUtil: UpdateDataUtil,
  ) {}

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
          lever?.result_lever_strategic_outcomes ?? [],
          'lever_strategic_outcome_id',
          undefined,
          entityManager,
        );
      }

      for (const lever of emergedLever) {
        await this.resultLeverSdgTargetsService.create(
          lever.result_lever_id,
          lever?.result_lever_sdg_targets ?? [],
          'sdg_target_id',
          undefined,
          entityManager,
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
        (so) => so.result_lever_id === lever.result_lever_id,
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
}
