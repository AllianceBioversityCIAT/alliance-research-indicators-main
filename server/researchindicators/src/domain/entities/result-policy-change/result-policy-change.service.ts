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

@Injectable()
export class ResultPolicyChangeService {
  private readonly mainRepo: Repository<ResultPolicyChange>;

  constructor(
    private readonly dataSource: DataSource,
    private readonly linkResultsService: LinkResultsService,
    private readonly resultInstitutionsService: ResultInstitutionsService,
  ) {
    this.mainRepo = dataSource.getRepository(ResultPolicyChange);
  }

  //TODO: Refactor this method to use the BaseServiceSimple class
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
    });
    return resultPolicyChange;
  }

  async save(
    result_id: number,
    createResultPolicyChangeDto: CreateResultPolicyChangeDto,
  ) {
    const {
      innovation_development,
      innovation_use,
      implementing_organization,
      evidence_stage,
      policy_stage_id,
      policy_type_id,
    } = createResultPolicyChangeDto;

    const innoSave = [...innovation_development, ...innovation_use];

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
        implementing_organization,
        'institution_id',
        LinkResultRolesEnum.POLICY_CHANGE,
        manager,
      );

      await manager.getRepository(ResultPolicyChange).update(result_id, {
        policy_type_id: policy_type_id,
        policy_stage_id: policy_stage_id,
        evidence_stage: evidence_stage,
      });

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

    const innoDev = linkResults.filter(
      (el) => el.other_result.indicator_id === IndicatorsEnum.INNOVATION_DEV,
    );

    const innoUse = linkResults.filter(
      (el) => el.other_result.indicator_id === IndicatorsEnum.INNOVATION_USE,
    );

    return {
      evidence_stage: policyChange.evidence_stage,
      policy_stage_id: policyChange.policy_stage_id,
      policy_type_id: policyChange.policy_type_id,
      implementing_organization: institutions,
      innovation_development: innoDev,
      innovation_use: innoUse,
    };
  }
}
