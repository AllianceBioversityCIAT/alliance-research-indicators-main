import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { LinkResultsService } from '../link-results/link-results.service';
import { CreateResultPolicyChangeDto } from './dto/create-result-policy-change.dto';
import { LinkResultRolesEnum } from '../link-result-roles/enum/link-result-roles.enum';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { Result } from '../results/entities/result.entity';
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
import { PolicyTypesEnum } from '../policy-types/enum/policy-types.enum';
import {
  POLICY_AMOUNT_STATUS_VALUES,
  PolicyAmountStatusEnum,
} from './enum/policy-amount-status.enum';

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
    const { usd_amount, amount_status } = this.resolveAmountFields(
      createResultPolicyChangeDto,
    );

    await this.assertInnovationLinkTypes(createResultPolicyChangeDto);

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
        usd_amount,
        amount_status,
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
      usd_amount:
        policyChange?.usd_amount == null
          ? null
          : Number(policyChange.usd_amount),
      amount_status: policyChange?.amount_status ?? null,
    };
  }

  /**
   * Rejects a non-null link whose result is missing or has the wrong
   * indicator. Status and `is_active` are not part of the check: a link
   * saved before its target changed status must still save (DD-3).
   * Runs before the transaction, so a rejection writes nothing.
   */
  private async assertInnovationLinkTypes(
    dto: CreateResultPolicyChangeDto,
  ): Promise<void> {
    const required: {
      field: 'innovation_development' | 'innovation_use';
      id: number;
      indicator: IndicatorsEnum;
    }[] = [];

    if (dto?.innovation_development != null) {
      required.push({
        field: 'innovation_development',
        id: dto.innovation_development,
        indicator: IndicatorsEnum.INNOVATION_DEV,
      });
    }
    if (dto?.innovation_use != null) {
      required.push({
        field: 'innovation_use',
        id: dto.innovation_use,
        indicator: IndicatorsEnum.INNOVATION_USE,
      });
    }
    if (required.length === 0) {
      return;
    }

    const found = await this.dataSource.getRepository(Result).find({
      select: { result_id: true, indicator_id: true },
      where: { result_id: In(required.map((item) => item.id)) },
    });
    const indicatorById = new Map(
      found.map((row) => [row.result_id, row.indicator_id]),
    );

    for (const item of required) {
      if (indicatorById.get(item.id) !== item.indicator) {
        throw new BadRequestException(
          item.field === 'innovation_development'
            ? 'innovation_development is not an existing Innovation Development result'
            : 'innovation_use is not an existing Innovation Use result',
        );
      }
    }
  }

  /**
   * Type 3 stores a non-negative amount (0 is valid) and a known status.
   * Missing or invalid values are stored as null so save never rejects them;
   * the green check is what reports the section as incomplete.
   */
  private resolveAmountFields(dto: CreateResultPolicyChangeDto): {
    usd_amount: number | null;
    amount_status: string | null;
  } {
    const isProgramBudgetInvestment =
      dto?.policy_type_id === PolicyTypesEnum.PROGRAM_BUDGET_OR_INVESTMENT;

    if (!isProgramBudgetInvestment) {
      return { usd_amount: null, amount_status: null };
    }

    const amount =
      dto.usd_amount === null || dto.usd_amount === undefined
        ? null
        : Number(dto.usd_amount);
    const status = dto.amount_status;

    return {
      usd_amount:
        amount !== null && Number.isFinite(amount) && amount >= 0
          ? amount
          : null,
      amount_status:
        status && POLICY_AMOUNT_STATUS_VALUES.includes(String(status))
          ? (status as PolicyAmountStatusEnum)
          : null,
    };
  }
}
