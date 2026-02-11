import { Injectable, NotFoundException } from '@nestjs/common';
import {
  CreateResultInnovationDevDto,
  ResultInnovationDevKnouldgeSharingDto,
} from './dto/create-result-innovation-dev.dto';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { ResultInnovationDev } from './entities/result-innovation-dev.entity';
import {
  CurrentUserUtil,
  SetAuditEnum,
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
import { ResultRawAi } from '../results/dto/result-ai.dto';
import { ClarisaInnovationCharacteristicsService } from '../../tools/clarisa/entities/clarisa-innovation-characteristics/clarisa-innovation-characteristics.service';
import { ClarisaInnovationTypesService } from '../../tools/clarisa/entities/clarisa-innovation-types/clarisa-innovation-types.service';
import { ClarisaInnovationReadinessLevelsService } from '../../tools/clarisa/entities/clarisa-innovation-readiness-levels/clarisa-innovation-readiness-levels.service';
import { InnovationDevAnticipatedUsersService } from '../innovation-dev-anticipated-users/innovation-dev-anticipated-users.service';
import { ClarisaActorTypesEnum } from '../../tools/clarisa/entities/clarisa-actor-types/enum/clarisa-actor-types.enum';
import { CreateResultActorDto } from '../result-actors/dto/create-result-actor.dto';
import { ClarisaInstitutionsService } from '../../tools/clarisa/entities/clarisa-institutions/clarisa-institutions.service';
import { ClarisaInstitution } from '../../tools/clarisa/entities/clarisa-institutions/entities/clarisa-institution.entity';
import { CreateResultInstitutionTypeDto } from '../result-institution-types/dto/create-result-institution-type.dto';
import { ClarisaInstitutionTypesService } from '../../tools/clarisa/entities/clarisa-institution-types/clarisa-institution-types.service';
import { ResultInnovationToolFunction } from '../result-innovation-tool-function/entities/result-innovation-tool-function.entity';
import { ResultInnovationToolFunctionService } from '../result-innovation-tool-function/result-innovation-tool-function.service';
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
    private readonly _clarisaInnovationCharacteristicService: ClarisaInnovationCharacteristicsService,
    private readonly _clarisaInnovationTypesService: ClarisaInnovationTypesService,
    private readonly _clarisaInnovationReadinessLevelsService: ClarisaInnovationReadinessLevelsService,
    private readonly _innovationDevAnticipatedUsersService: InnovationDevAnticipatedUsersService,
    private readonly _clarisaInstitutionsService: ClarisaInstitutionsService,
    private readonly _clarisaInstitutionTypesService: ClarisaInstitutionTypesService,
    private readonly _resultInnovationToolFunctionService: ResultInnovationToolFunctionService,
  ) {
    this.mainRepo = this.dataSource.getRepository(ResultInnovationDev);
  }

  async processedAiInfo(
    result: ResultRawAi,
  ): Promise<CreateResultInnovationDevDto> {
    const innovationDev = new CreateResultInnovationDevDto();
    innovationDev.short_title = result.short_title;

    innovationDev.innovation_nature_id =
      await this._clarisaInnovationCharacteristicService
        .findByName(result?.innovation_nature)
        .then((res) => res?.id);

    innovationDev.innovation_type_id = await this._clarisaInnovationTypesService
      .findByName(result?.innovation_type)
      .then((res) => res?.code);

    innovationDev.innovation_readiness_id =
      await this._clarisaInnovationReadinessLevelsService
        .findByValue(result?.assess_readiness)
        .then((res) => res?.id);

    innovationDev.anticipated_users_id =
      await this._innovationDevAnticipatedUsersService
        .findByName(result?.anticipated_users)
        .then((res) => res?.id);

    const actors = result.innovation_actors_detailed;
    const newActors: Partial<CreateResultActorDto>[] = [];
    for (const actor of actors) {
      const actorTypeCode = await this._clarisaActorTypesService
        .findByName(actor.type)
        .then((res) => res?.code);
      const isOther = ClarisaActorTypesEnum.OTHER === actorTypeCode;
      newActors.push({
        actor_type_id: actorTypeCode,
        actor_role_id: ActorRolesEnum.INNOVATION_DEV,
        actor_type_custom_name: isOther ? actor.other_actor_type : null,
        men_not_youth: actor.gender_age.includes('Men: Non-youth'),
        men_youth: actor.gender_age.includes('Men: Youth'),
        women_not_youth: actor.gender_age.includes('Women: Non-youth'),
        women_youth: actor.gender_age.includes('Women: Youth'),
      });
    }
    innovationDev.actors = newActors as CreateResultActorDto[];

    const organizationsNames = result.organizations;
    let clarisaInstitutions: ClarisaInstitution[] = [];
    if (Array.isArray(organizationsNames) && organizationsNames.length > 0) {
      clarisaInstitutions =
        await this._clarisaInstitutionsService.findByLikeNames(
          organizationsNames,
        );
    }
    const newInstitutionTypes: Partial<CreateResultInstitutionTypeDto>[] = [];

    for (const institution of clarisaInstitutions) {
      newInstitutionTypes.push({
        institution_type_id: null,
        sub_institution_type_id: null,
        institution_type_custom_name: null,
        is_organization_known: true,
        institution_id: institution.code,
      });
    }

    const preProcessedTypes = this.processDataArrayString(
      result?.organization_type,
    );
    const clarisaInstitutionsType = preProcessedTypes.length
      ? await this._clarisaInstitutionTypesService.findByLikeNames(
          preProcessedTypes,
        )
      : [];
    const newArray: string[] = Array.isArray(result?.organization_sub_type)
      ? result?.organization_sub_type
      : result?.organization_sub_type !== 'Not collected'
        ? [result?.organization_sub_type]
        : [];

    const preProcessedSubTypes = this.processDataArrayString(newArray);

    const clarisaInstitutionsSubType = preProcessedSubTypes.length
      ? await this._clarisaInstitutionTypesService.findByLikeNames(
          preProcessedSubTypes,
        )
      : [];

    for (const institutionsType of clarisaInstitutionsType) {
      newInstitutionTypes.push({
        institution_type_id: institutionsType.code,
        sub_institution_type_id: null,
        institution_type_custom_name: null,
        is_organization_known: false,
        institution_id: null,
      });
    }

    for (const institutionsSubType of clarisaInstitutionsSubType) {
      newInstitutionTypes.push({
        institution_type_id: institutionsSubType?.parent?.code,
        sub_institution_type_id: institutionsSubType.code,
        institution_type_custom_name: null,
        is_organization_known: false,
        institution_id: null,
      });
    }

    innovationDev.institution_types =
      newInstitutionTypes as CreateResultInstitutionTypeDto[];

    return innovationDev;
  }

  processDataArrayString(input: string | string[]): string[] {
    if (Array.isArray(input)) {
      return input?.map((el) => el.trim());
    }
    if (typeof input === 'string') {
      return input?.split(',').map((el) => el.trim());
    }
    return [];
  }

  async create(resultId: number, manager?: EntityManager) {
    const entityManager: Repository<ResultInnovationDev> = selectManager(
      manager,
      ResultInnovationDev,
      this.mainRepo,
    );

    return entityManager.save({
      result_id: resultId,
      ...this._currentUser.audit(SetAuditEnum.NEW),
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
      await manager.getRepository(this.mainRepo.target).update(resultId, {
        innovation_nature_id:
          createResultInnovationDevDto?.innovation_nature_id,
        innovation_readiness_id:
          createResultInnovationDevDto?.innovation_readiness_id,
        innovation_readiness_explanation:
          createResultInnovationDevDto?.innovation_readiness_explanation,
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
        ...this._currentUser.audit(SetAuditEnum.UPDATE),
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
              Boolean(el?.institution_type_id || el?.institution_id),
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
    delete knowledgeSharingData?.link_to_result;

    let toolFunction: Partial<ResultInnovationToolFunction>[] =
      knowledgeSharingData?.tool_function_id?.map((id) => ({
        tool_function_id: id?.tool_function_id,
      }));
    delete knowledgeSharingData?.link_to_result;

    if (!knowledgeSharingData?.is_knowledge_sharing || readinessLevel < 7) {
      const defaultAttributes: (keyof ResultInnovationDevKnouldgeSharingDto)[] =
        [
          'adoption_adaptation_context',
          'dissemination_qualification_id',
          'is_used_beyond_original_context',
          'other_tools',
          'other_tools_integration',
          'results_achieved_expected',
          'tool_useful_context',
        ];
      if (readinessLevel < 7) defaultAttributes.push('is_knowledge_sharing');
      setDefaultValueInObject(knowledgeSharingData, defaultAttributes);
      linkToResult = [];
      toolFunction = [];
    }

    await this._linkResultsService.create(
      resultId,
      linkToResult,
      'other_result_id',
      LinkResultRolesEnum.INNOVATION_DEV,
      manager,
    );

    await this._resultInnovationToolFunctionService.create(
      resultId,
      toolFunction,
      'tool_function_id',
      undefined,
      manager,
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
      tool_useful_context: knowledgeSharingData?.tool_useful_context,
      ...this._currentUser.audit(SetAuditEnum.UPDATE),
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

    const tool_function_id =
      await this._resultInnovationToolFunctionService.find(id, null);

    return {
      short_title: resultInnovationDev.short_title,
      innovation_nature_id: resultInnovationDev.innovation_nature_id,
      innovation_type_id: resultInnovationDev.innovation_type_id,
      innovation_readiness_id: resultInnovationDev.innovation_readiness_id,
      innovation_readiness_explanation:
        resultInnovationDev.innovation_readiness_explanation,
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
        tool_function_id,
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
