import { ConflictException, Injectable } from '@nestjs/common';
import { LinkResultsService } from '../link-results/link-results.service';
import { CreateResultPolicyChangeDto } from './dto/create-result-policy-change.dto';
import { LinkResultRolesEnum } from '../link-result-roles/enum/link-result-roles.enum';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { ResultInstitutionsService } from '../result-institutions/result-institutions.service';
import { ResultPolicyChange } from './entities/result-policy-change.entity';
import { InstitutionRolesEnum } from '../institution-roles/enums/institution-roles.enum';
import { IndicatorsEnum } from '../indicators/enum/indicators.enum';
import { selectManager } from '../../shared/utils/orm.util';
import {
  CurrentUserUtil,
  SetAuditEnum,
} from '../../shared/utils/current-user.util';
import { UpdateDataUtil } from '../../shared/utils/update-data.util';
import { LinkResult } from '../link-results/entities/link-result.entity';
import { ResultRawAi } from '../results/dto/result-ai.dto';
import { PolicyStagesService } from '../policy-stages/policy-stages.service';
import { PolicyStage } from '../policy-stages/entities/policy-stage.entity';
import { PolicyTypesService } from '../policy-types/policy-types.service';
import { PolicyType } from '../policy-types/entities/policy-type.entity';

@Injectable()
export class ResultPolicyChangeService {
  private readonly mainRepo: Repository<ResultPolicyChange>;

  constructor(
    private readonly dataSource: DataSource,
    private readonly linkResultsService: LinkResultsService,
    private readonly resultInstitutionsService: ResultInstitutionsService,
    private readonly currentUser: CurrentUserUtil,
    private readonly _updateDataUtil: UpdateDataUtil,
    private readonly _policyStagesService: PolicyStagesService,
    private readonly _policyTypesService: PolicyTypesService,
  ) {
    this.mainRepo = dataSource.getRepository(ResultPolicyChange);
  }

  //Is preferable to use the BaseServiceSimple class because it has a lot of methods that can be reused
  async create(result_id: number, manager?: EntityManager) {
    const entityManager: Repository<ResultPolicyChange> = selectManager(
      manager,
      ResultPolicyChange,
      this.mainRepo,
    );

    const existResult = await entityManager.findOne({
      where: {
        result_id: result_id,
      },
    });

    if (existResult) {
      throw new ConflictException('Result Policy Change already exists');
    }

    const resultPolicyChange = entityManager.save({
      result_id: result_id,
      ...this.currentUser.audit(SetAuditEnum.NEW),
    });
    return resultPolicyChange;
  }

  async processedAiInfo(
    rawData: ResultRawAi,
  ): Promise<CreateResultPolicyChangeDto> {
    const newData = new CreateResultPolicyChangeDto();
    newData.evidence_stage = rawData.evidence_for_stage;
    const regex: RegExp = /stage\s{1}\d[1-2]?/i;
    const match = regex.exec(rawData.stage_in_policy_process);
    if (match) {
      const policyStage: PolicyStage =
        await this._policyStagesService.findByName(match[0]);
      newData.policy_stage_id = policyStage?.policy_stage_id;
    }

    const policyType: PolicyType = await this._policyTypesService.findByName(
      rawData.policy_type,
    );
    newData.policy_type_id = policyType?.policy_type_id;

    return newData;
  }

  async update(
    result_id: number,
    createResultPolicyChangeDto: CreateResultPolicyChangeDto,
  ) {
    const innoSave: Partial<LinkResult>[] = [];
    if (createResultPolicyChangeDto?.innovation_development)
      innoSave.push({
        other_result_id: createResultPolicyChangeDto.innovation_development,
      });

    if (createResultPolicyChangeDto?.innovation_use)
      innoSave.push({
        other_result_id: createResultPolicyChangeDto.innovation_use,
      });

    return this.dataSource.transaction(async (manager) => {
      await this.linkResultsService.create(
        result_id,
        innoSave,
        'other_result_id',
        LinkResultRolesEnum.POLICY_CHANGE,
        manager,
      );

      await this.resultInstitutionsService.create(
        result_id,
        createResultPolicyChangeDto?.implementing_organization ?? [],
        'institution_id',
        InstitutionRolesEnum.POLICY_CHANGE,
        manager,
      );

      await manager.getRepository(ResultPolicyChange).update(result_id, {
        policy_type_id: createResultPolicyChangeDto?.policy_type_id,
        policy_stage_id: createResultPolicyChangeDto?.policy_stage_id,
        evidence_stage: createResultPolicyChangeDto?.evidence_stage,
        ...this.currentUser.audit(SetAuditEnum.BOTH),
      });

      await this._updateDataUtil.updateLastUpdatedDate(result_id, manager);
      return undefined;
    });
  }

  async findPolicyChange(
    result_id: number,
  ): Promise<CreateResultPolicyChangeDto> {
    const policyChange = await this.mainRepo.findOne({
      where: { result_id, is_active: true },
    });
    const institutions =
      await this.resultInstitutionsService.findInstitutionsByRoleResult(
        result_id,
        InstitutionRolesEnum.POLICY_CHANGE,
      );

    const linkResults = await this.linkResultsService.findAndDetails(
      result_id,
      LinkResultRolesEnum.POLICY_CHANGE,
    );

    const innoDev = linkResults.find(
      (el) => el.other_result.indicator_id === IndicatorsEnum.INNOVATION_DEV,
    );

    const innoUse = linkResults.find(
      (el) => el.other_result.indicator_id === IndicatorsEnum.INNOVATION_USE,
    );

    return {
      evidence_stage: policyChange?.evidence_stage,
      policy_stage_id: policyChange?.policy_stage_id,
      policy_type_id: policyChange?.policy_type_id,
      implementing_organization: institutions,
      innovation_development: innoDev?.other_result_id,
      innovation_use: innoUse?.other_result_id,
    };
  }
}
