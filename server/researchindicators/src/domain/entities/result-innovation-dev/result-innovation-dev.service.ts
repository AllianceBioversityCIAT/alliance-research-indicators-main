import { Injectable, NotFoundException } from '@nestjs/common';
import {
  CreateResultInnovationDevDto,
  ResultInnovationDevKnouldgeSharingDto,
} from './dto/create-result-innovation-dev.dto';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { ResultInnovationDev } from './entities/result-innovation-dev.entity';
import {
  CurrentUserUtil,
  SetAutitEnum,
} from '../../shared/utils/current-user.util';
import { selectManager } from '../../shared/utils/orm.util';
import { ResultActorsService } from '../result-actors/result-actors.service';
import { ActorRolesEnum } from '../actor-roles/enum/actor-roles.enum';
import { ResultInstitutionTypesService } from '../result-institution-types/result-institution-types.service';
import { InstitutionTypeRoleEnum } from '../institution-type-roles/enum/institution-type-role.enum';
import { ClarisaActorTypesService } from '../../tools/clarisa/entities/clarisa-actor-types/clarisa-actor-types.service';
import {
  isEmpty,
  setDefaultValueInObject,
} from '../../shared/utils/object.utils';
import { LinkResultsService } from '../link-results/link-results.service';
import { LinkResult } from '../link-results/entities/link-result.entity';
import { LinkResultRolesEnum } from '../link-result-roles/enum/link-result-roles.enum';
import { UpdateDataUtil } from '../../shared/utils/update-data.util';
import { ClarisaInnovationReadinessLevel } from '../../tools/clarisa/entities/clarisa-innovation-readiness-levels/entities/clarisa-innovation-readiness-level.entity';
@Injectable()
export class ResultInnovationDevService {
  private readonly mainRepo: Repository<ResultInnovationDev>;
  constructor(
    private readonly dataSource: DataSource,
    private readonly _currentUser: CurrentUserUtil,
    private readonly _resultActorsService: ResultActorsService,
    private readonly _resultInstitutionTypesService: ResultInstitutionTypesService,
    private readonly _clarisaActorTypesService: ClarisaActorTypesService,
    private readonly _linkResultsService: LinkResultsService,
    private readonly _updateDataUtil: UpdateDataUtil,
  ) {
    this.mainRepo = this.dataSource.getRepository(ResultInnovationDev);
  }

  async create(resultId: number, manager?: EntityManager) {
    const entityManager: Repository<ResultInnovationDev> = selectManager(
      manager,
      ResultInnovationDev,
      this.mainRepo,
    );

    return entityManager.save({
      result_id: resultId,
      ...this._currentUser.audit(SetAutitEnum.NEW),
    });
  }

  async update(
    resultId: number,
    createResultInnovationDevDto: CreateResultInnovationDevDto,
  ) {
    const existingResult = await this.mainRepo.findOne({
      where: { result_id: resultId, is_active: true },
    });

    if (!existingResult) {
      throw new NotFoundException(`Result with ID ${resultId} not found`);
    }

    const adddExtraData = !(
      createResultInnovationDevDto?.anticipated_users_id == 1 ||
      isEmpty(createResultInnovationDevDto?.anticipated_users_id)
    );

    return this.dataSource.transaction(async (manager) => {
      manager.getRepository(this.mainRepo.target).update(resultId, {
        innovation_nature_id:
          createResultInnovationDevDto?.innovation_nature_id,
        innovation_readiness_id:
          createResultInnovationDevDto?.innovation_readiness_id,
        innovation_type_id: createResultInnovationDevDto?.innovation_type_id,
        no_sex_age_disaggregation:
          createResultInnovationDevDto?.no_sex_age_disaggregation,
        short_title: createResultInnovationDevDto?.short_title,
        is_new_or_improved_variety:
          createResultInnovationDevDto?.is_new_or_improved_variety,
        new_or_improved_varieties_count:
          createResultInnovationDevDto?.is_new_or_improved_variety
            ? createResultInnovationDevDto?.new_or_improved_varieties_count
            : null,
        anticipated_users_id:
          createResultInnovationDevDto?.anticipated_users_id,
        ...(adddExtraData
          ? {
              expected_outcome: createResultInnovationDevDto?.expected_outcome,
              intended_beneficiaries_description:
                createResultInnovationDevDto?.intended_beneficiaries_description,
            }
          : {
              expected_outcome: null,
              intended_beneficiaries_description: null,
            }),
        ...this._currentUser.audit(SetAutitEnum.UPDATE),
      });

      const filterIds = await this._clarisaActorTypesService.validateActorTypes(
        createResultInnovationDevDto?.actors.map(
          (actor) => actor.actor_type_id,
        ),
      );

      const saveActors = createResultInnovationDevDto?.actors.filter(
        (actor) => !filterIds.includes(actor.actor_type_id),
      );

      await this._resultActorsService.customSaveInnovationDev(
        resultId,
        adddExtraData ? saveActors : [],
        manager,
      );

      await this._resultInstitutionTypesService.customSaveInnovationDev(
        resultId,
        adddExtraData
          ? createResultInnovationDevDto?.institution_types?.filter((el) =>
              Boolean(el?.institution_type_id),
            )
          : [],
        manager,
      );

      const readinessLevel = await this.dataSource
        .getRepository(ClarisaInnovationReadinessLevel)
        .findOne({
          where: {
            id: createResultInnovationDevDto?.innovation_readiness_id,
          },
        })
        .then((res) => res.level);

      await this.knouldgeSharing(
        resultId,
        createResultInnovationDevDto,
        readinessLevel,
        manager,
      );
      await this.scalingPotential(
        resultId,
        createResultInnovationDevDto,
        readinessLevel,
        manager,
      );

      await this._updateDataUtil.updateLastUpdatedDate(resultId, manager);

      return this.mainRepo.findOne({
        where: { result_id: resultId, is_active: true },
      });
    });
  }

  private async scalingPotential(
    resultId: number,
    createResultInnovationDevDto: CreateResultInnovationDevDto,
    readinessLevel: number,
    manager?: EntityManager,
  ) {
    const entityManager = selectManager(
      manager,
      ResultInnovationDev,
      this.mainRepo,
    );
    const scalingPotentialData =
      createResultInnovationDevDto.scaling_potential_form;
    if (readinessLevel < 7) {
      setDefaultValueInObject(scalingPotentialData, [
        'is_cheaper_than_alternatives',
        'is_simpler_to_use',
        'does_perform_better',
        'is_desirable_to_users',
        'has_commercial_viability',
        'has_suitable_enabling_environment',
        'has_evidence_of_uptake',
        'expansion_potential_id',
        'expansion_adaptation_details',
      ]);
    }

    await entityManager.update(resultId, {
      is_cheaper_than_alternatives:
        scalingPotentialData?.is_cheaper_than_alternatives,
      is_simpler_to_use: scalingPotentialData?.is_simpler_to_use,
      does_perform_better: scalingPotentialData?.does_perform_better,
      is_desirable_to_users: scalingPotentialData?.is_desirable_to_users,
      has_commercial_viability: scalingPotentialData?.has_commercial_viability,
      has_suitable_enabling_environment:
        scalingPotentialData?.has_suitable_enabling_environment,
      has_evidence_of_uptake: scalingPotentialData?.has_evidence_of_uptake,
      expansion_potential_id: scalingPotentialData?.expansion_potential_id,
      expansion_adaptation_details:
        scalingPotentialData?.expansion_potential_id == 2
          ? scalingPotentialData.expansion_adaptation_details
          : null,
    });
  }

  private async knouldgeSharing(
    resultId: number,
    createResultInnovationDevDto: CreateResultInnovationDevDto,
    readinessLevel: number,
    manager?: EntityManager,
  ) {
    console.log('entro');
    const entityManager = selectManager(
      manager,
      ResultInnovationDev,
      this.mainRepo,
    );

    const knowledgeSharingData =
      createResultInnovationDevDto.knowledge_sharing_form;
    let linkToResult: Partial<LinkResult>[] =
      knowledgeSharingData?.link_to_result?.map((link) => ({
        other_result_id: link?.other_result_id,
      }));
    delete knowledgeSharingData.link_to_result;

    if (!knowledgeSharingData?.is_knowledge_sharing || readinessLevel < 7) {
      const defaultAttributes: (keyof ResultInnovationDevKnouldgeSharingDto)[] =
        [
          'adoption_adaptation_context',
          'dissemination_qualification_id',
          'is_used_beyond_original_context',
          'other_tools',
          'other_tools_integration',
          'results_achieved_expected',
          'tool_function_id',
          'tool_useful_context',
        ];
      if (readinessLevel < 7) defaultAttributes.push('is_knowledge_sharing');
      setDefaultValueInObject(knowledgeSharingData, defaultAttributes);
      linkToResult = [];
    }

    await this._linkResultsService.create(
      resultId,
      linkToResult,
      'other_result_id',
      LinkResultRolesEnum.INNOVATION_DEV,
    );

    await entityManager.update(resultId, {
      adoption_adaptation_context:
        knowledgeSharingData?.adoption_adaptation_context,
      dissemination_qualification_id:
        knowledgeSharingData?.dissemination_qualification_id,
      is_knowledge_sharing: knowledgeSharingData?.is_knowledge_sharing,
      is_used_beyond_original_context:
        knowledgeSharingData?.is_used_beyond_original_context,
      other_tools: knowledgeSharingData?.other_tools,
      other_tools_integration: knowledgeSharingData?.other_tools_integration,
      results_achieved_expected:
        knowledgeSharingData?.results_achieved_expected,
      tool_function_id: knowledgeSharingData?.tool_function_id,
      tool_useful_context: knowledgeSharingData?.tool_useful_context,
      ...this._currentUser.audit(SetAutitEnum.UPDATE),
    });
  }

  async findOne(id: number): Promise<CreateResultInnovationDevDto> {
    const resultInnovationDev = await this.mainRepo.findOne({
      where: { result_id: id, is_active: true },
    });

    const link_to_result = await this._linkResultsService.find(
      id,
      LinkResultRolesEnum.INNOVATION_DEV,
    );

    const institution_types = await this._resultInstitutionTypesService.find(
      id,
      InstitutionTypeRoleEnum.INNOVATION_DEV,
    );

    const actors = await this._resultActorsService.find(
      id,
      ActorRolesEnum.INNOVATION_DEV,
    );

    return {
      short_title: resultInnovationDev.short_title,
      innovation_nature_id: resultInnovationDev.innovation_nature_id,
      innovation_type_id: resultInnovationDev.innovation_type_id,
      innovation_readiness_id: resultInnovationDev.innovation_readiness_id,
      no_sex_age_disaggregation: resultInnovationDev.no_sex_age_disaggregation,
      anticipated_users_id: resultInnovationDev.anticipated_users_id,
      expected_outcome: resultInnovationDev.expected_outcome,
      intended_beneficiaries_description:
        resultInnovationDev.intended_beneficiaries_description,
      is_new_or_improved_variety:
        resultInnovationDev.is_new_or_improved_variety,
      new_or_improved_varieties_count:
        resultInnovationDev.new_or_improved_varieties_count,
      actors,
      institution_types,
      knowledge_sharing_form: {
        is_knowledge_sharing: resultInnovationDev.is_knowledge_sharing,
        dissemination_qualification_id:
          resultInnovationDev.dissemination_qualification_id,
        tool_useful_context: resultInnovationDev.tool_useful_context,
        results_achieved_expected:
          resultInnovationDev.results_achieved_expected,
        tool_function_id: resultInnovationDev.tool_function_id,
        is_used_beyond_original_context:
          resultInnovationDev.is_used_beyond_original_context,
        adoption_adaptation_context:
          resultInnovationDev.adoption_adaptation_context,
        other_tools: resultInnovationDev.other_tools,
        other_tools_integration: resultInnovationDev.other_tools_integration,
        link_to_result,
      },
      scaling_potential_form: {
        is_cheaper_than_alternatives:
          resultInnovationDev.is_cheaper_than_alternatives,
        is_simpler_to_use: resultInnovationDev.is_simpler_to_use,
        does_perform_better: resultInnovationDev.does_perform_better,
        is_desirable_to_users: resultInnovationDev.is_desirable_to_users,
        has_commercial_viability: resultInnovationDev.has_commercial_viability,
        has_suitable_enabling_environment:
          resultInnovationDev.has_suitable_enabling_environment,
        has_evidence_of_uptake: resultInnovationDev.has_evidence_of_uptake,
        expansion_potential_id: resultInnovationDev.expansion_potential_id,
        expansion_adaptation_details:
          resultInnovationDev.expansion_adaptation_details,
      },
    };
  }
}
