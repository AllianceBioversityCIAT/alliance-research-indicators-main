import { Injectable } from '@nestjs/common';
import {
  CapacityDevelopmentSummaryMapper,
  InnovationDevelopmentQuestionnaireMapper,
  InnovationDevelopmentSummaryMapper,
  PrmsKnowledgeProductDto,
  PrmsTemporalResponseMapper,
  PolicyChangeSummaryMapper,
  ResultResponseMapper,
  SearcherResponseDto,
} from './dto/prms-response.dto';
import { HttpService } from '@nestjs/axios';
import { AppConfig } from '../../../shared/utils/app-config.util';
import {
  ExternalMappersDto,
  ExternalMappersInterface,
} from '../../../shared/global-dto/external-mappers.dto';
import { IndicatorHomologation } from './homologation/indicator.homologation';
import { AllianceUserStaff } from '../../../entities/alliance-user-staff/entities/alliance-user-staff.entity';
import { ResultRepository } from '../../../entities/results/repositories/result.repository';
import { isEmpty } from '../../../shared/utils/object.utils';
import { DataSource, Like } from 'typeorm';
import { ResultEvidence } from '../../../entities/result-evidences/entities/result-evidence.entity';
import { ResultKnowledgeProduct } from '../../../entities/result-knowledge-product/entities/result-knowledge-product.entity';
import {
  filterByUniqueKeyWithPriority,
  mergeArraysWithPriority,
} from '../../../shared/utils/array.util';
import { ResultLever } from '../../../entities/result-levers/entities/result-lever.entity';
import { TrueFalseEnum } from '../../../shared/enum/queries.enum';
import { Result } from '../../../entities/results/entities/result.entity';
import { ResultStatusEnum } from '../../../entities/result-status/enum/result-status.enum';
import { ReportingPlatformEnum } from '../../../entities/results/enum/reporting-platform.enum';
import { ResultsService } from '../../../entities/results/results.service';
import { QueryService } from '../../../shared/utils/query.service';
import { ResultKnowledgeProductService } from '../../../entities/result-knowledge-product/result-knowledge-product.service';
import { CurrentUserUtil } from '../../../shared/utils/current-user.util';
import { PooledFundingContractsService } from '../../../entities/pooled-funding-contracts/pooled-funding-contracts.service';
import {
  AcronymExContractEnum,
  ResultPrmsStatusMapper,
} from './enum/rsult-type.enum';
import { ClarisaLeversService } from '../../clarisa/entities/clarisa-levers/clarisa-levers.service';
import { ResultContract } from '../../../entities/result-contracts/entities/result-contract.entity';
import { LoggerUtil } from '../../../shared/utils/logger.util';
import { firstValueFrom } from 'rxjs';
import { CounterResults } from '../../tip-integration/dto/response-year-tip.dto';
import { SyncProcessLogService } from '../../../entities/sync-process-log/sync-process-log.service';
import { SyncProcessEnum } from '../../../entities/sync-process-log/enum/sync-process.enum';
import { SaveResultService } from '../../../shared/services/save-all-sections.service';
import { SyncStagingRecordsEntity } from './entities/sync-staging-records.entity';
import { PrmsRepository } from './repositories/prms.repository';
import { v4 as uuidv4 } from 'uuid';
import { ClarisaCountriesService } from '../../clarisa/entities/clarisa-countries/clarisa-countries.service';
import { ClarisaRegionsService } from '../../clarisa/entities/clarisa-regions/clarisa-regions.service';
import { ClarisaInstitutionsService } from '../../clarisa/entities/clarisa-institutions/clarisa-institutions.service';
import { ClarisaGeoScopeEnum } from '../../clarisa/entities/clarisa-geo-scope/enum/clarisa-geo-scope.enum';
import { ClarisaInnovationCharacteristicsService } from '../../clarisa/entities/clarisa-innovation-characteristics/clarisa-innovation-characteristics.service';
import { ClarisaInnovationTypesService } from '../../clarisa/entities/clarisa-innovation-types/clarisa-innovation-types.service';
import { ClarisaInnovationReadinessLevelsService } from '../../clarisa/entities/clarisa-innovation-readiness-levels/clarisa-innovation-readiness-levels.service';
import { ClarisaActorTypesService } from '../../clarisa/entities/clarisa-actor-types/clarisa-actor-types.service';
import { ClarisaInstitutionTypesService } from '../../clarisa/entities/clarisa-institution-types/clarisa-institution-types.service';
import { ResultCountry } from '../../../entities/result-countries/entities/result-country.entity';
import { ResultRegion } from '../../../entities/result-regions/entities/result-region.entity';
import { ResultInstitution } from '../../../entities/result-institutions/entities/result-institution.entity';
import { SaveGeoLocationDto } from '../../../entities/results/dto/save-geo-location.dto';
import { CreateResultInstitutionDto } from '../../../entities/result-institutions/dto/create-result-institution.dto';
import { CreateResultEvidenceDto } from '../../../entities/result-evidences/dto/create-result-evidence.dto';
import { CreateResultPolicyChangeDto } from '../../../entities/result-policy-change/dto/create-result-policy-change.dto';
import {
  CapDevGroupDto,
  UpdateResultCapacitySharingDto,
} from '../../../entities/result-capacity-sharing/dto/update-result-capacity-sharing.dto';
import { CreateResultInnovationDevDto } from '../../../entities/result-innovation-dev/dto/create-result-innovation-dev.dto';
import { UpdateIpRightDto } from '../../../entities/result-ip-rights/dto/update-ip-right.dto';
import { CreateResultActorDto } from '../../../entities/result-actors/dto/create-result-actor.dto';
import { CreateResultInstitutionTypeDto } from '../../../entities/result-institution-types/dto/create-result-institution-type.dto';
import { IndicatorsEnum } from '../../../entities/indicators/enum/indicators.enum';
import { PolicyTypeHomologation } from './homologation/policy-type.homologation';
import { PolicyStageHomologation } from './homologation/policy-stage.homologation';
import { DeliveryModalityHomologation } from './homologation/delivery-modality.homologation';
import { SessionLengthHomologation } from './homologation/session-length.homologation';
import { DegreeHomologation } from './homologation/degree.homologation';
import { IpRightsApplicationHomologation } from './homologation/ip-rights-application.homologation';
import { PrmsInnovationIpQuestionEnum } from './homologation/prms-innovation-question.homologation';
import { SessionFormatEnum } from '../../../entities/session-formats/enums/session-format.enum';
import { SessionLengthEnum } from '../../../entities/session-lengths/enum/session-lengths.enum';
import { InnovationDevAnticipatedUsers } from '../../../entities/innovation-dev-anticipated-users/enum/innovation-dev-anticipated-users.enum';
import { ActorRolesEnum } from '../../../entities/actor-roles/enum/actor-roles.enum';

@Injectable()
export class PrmsOpenSearchService
  implements ExternalMappersInterface<ExternalMappersDto>
{
  private readonly logger = new LoggerUtil({
    name: PrmsOpenSearchService.name,
  });
  constructor(
    private readonly httpService: HttpService,
    private readonly appConfig: AppConfig,
    private readonly resultRepository: ResultRepository,
    private readonly dataSource: DataSource,
    private readonly resultsService: ResultsService,
    private readonly _queryService: QueryService,
    private readonly resultKnowledgeProductService: ResultKnowledgeProductService,
    private readonly _currentUser: CurrentUserUtil,
    private readonly pooledFundingContractsService: PooledFundingContractsService,
    private readonly clarisaLeversService: ClarisaLeversService,
    private readonly syncProcessLogService: SyncProcessLogService,
    private readonly saveResultService: SaveResultService,
    private readonly prmsRepository: PrmsRepository,
    private readonly clarisaCountriesService: ClarisaCountriesService,
    private readonly clarisaRegionsService: ClarisaRegionsService,
    private readonly clarisaInstitutionsService: ClarisaInstitutionsService,
    private readonly clarisaInnovationCharacteristicsService: ClarisaInnovationCharacteristicsService,
    private readonly clarisaInnovationTypesService: ClarisaInnovationTypesService,
    private readonly clarisaInnovationReadinessLevelsService: ClarisaInnovationReadinessLevelsService,
    private readonly clarisaActorTypesService: ClarisaActorTypesService,
    private readonly clarisaInstitutionTypesService: ClarisaInstitutionTypesService,
  ) {}

  async mapToExternalCreateResultDto(res: ExternalMappersDto[]): Promise<void> {
    for (const result of res) {
      this.logger.debug(`Processing result ${result.official_code} from TIP.`);
      this._currentUser.setSystemUser(result.userData, true);
      let createNewResult: Result = null;
      try {
        let findResult = await this.dataSource.getRepository(Result).findOne({
          where: {
            result_official_code: result.official_code,
            platform_code: ReportingPlatformEnum.TIP,
            report_year_id: result.createResult.year,
          },
        });

        if (!findResult) {
          createNewResult = await this.resultsService.createResult(
            result.createResult,
            ReportingPlatformEnum.PRMS,
            {
              notContract: true,
              result_status_id: ResultStatusEnum.APPROVED,
              validateTitle: false,
            },
            result.official_code,
          );
          findResult = createNewResult;
          this.logger.debug(
            `Creating new result ${findResult.result_official_code} from TIP.`,
          );
        } else {
          this.logger.debug(
            `Updating result ${findResult.result_official_code} from TIP.`,
          );
        }
        await this.dataSource
          .getRepository(Result)
          .update(findResult.result_id, {
            external_link: result.external_link,
            created_at: result.created_at,
          });

        await this.resultsService.updateGeneralInfo(
          findResult.result_id,
          result.generalInformation,
          TrueFalseEnum.FALSE,
          false,
          false,
        );

        const tempAlignment = await this.resultsService.findResultAlignment(
          findResult.result_id,
        );

        result.alignments.primary_levers = filterByUniqueKeyWithPriority(
          mergeArraysWithPriority<ResultLever>(
            tempAlignment.primary_levers,
            result.alignments.primary_levers,
            'lever_id',
          ),
          'lever_id',
          'is_primary',
        ) as ResultLever[];

        await this.resultsService.updateResultAlignment(
          findResult.result_id,
          result.alignments,
        );

        await this.resultsService.saveGeoLocation(
          findResult.result_id,
          result.geoScope,
        );

        await this.resultKnowledgeProductService.update(
          findResult.result_id,
          result.knowledgeProduct,
        );
        this.logger.log(
          `Processed result ${findResult.result_official_code} from TIP.`,
        );
        this.logger.log(
          `Successfully processed result ${findResult.result_id} from TIP.`,
        );
      } catch (error) {
        const errorMessage = (error as Error).message ?? 'Unknown error';
        if (createNewResult) {
          this.logger.error(
            `Error processing result ${createNewResult.result_id}, rolling back. Error: ${errorMessage}`,
          );
          await this._queryService.deleteFullResultById(
            createNewResult.result_id,
          );
        }
        this.logger.error(`Error processing tip result: ${errorMessage}`);
      }
      this._currentUser.clearSystemUser();
      this.logger.debug(
        `Finished processing result ${result.official_code} from TIP.`,
      );
    }
  }

  //TODO: Review this function to check if it is working correctly and complete the process
  async getData(year: number) {
    const size = 50;
    let page = 1;
    let keepGoing = true;
    const executionCode = uuidv4();
    const currentCode: { current: number } = { current: null };
    const resultSaved: number[] = [];
    const counters: CounterResults = {
      createdRecords: 0,
      updatedRecords: 0,
      errorRecords: 0,
    };
    try {
      const syncProcessLog = await this.syncProcessLogService.initiateSync(
        SyncProcessEnum.PRMS_INTEGRATION,
      );
      while (keepGoing) {
        const centerAcronym = ['ABC', 'ABC RH'];
        let prmsUrl = `${this.appConfig.SEARCH_PRMS_URL}/result?size=${size}&page=${page}&fundingType=Result&centerAcronym=${encodeURIComponent(centerAcronym.join(','))}`;
        if (!isEmpty(year)) {
          prmsUrl += `&year=${year}`;
        }
        const response = await firstValueFrom(
          this.httpService.get<SearcherResponseDto>(prmsUrl),
        ).then((response) => response.data);
        response.data.forEach(async (item) => {
          await this.dataSource
            .getRepository(SyncStagingRecordsEntity)
            .save({
              execution_code: executionCode,
              code: parseInt(item.result_code),
              year: parseInt(item.year),
              data: item,
            })
            .catch((error) => {
              this.logger.error(
                `Error saving temporal result ${item.result_code}: ${error.message} \n ${error.stack}`,
              );
            });
        });

        if (page >= response.totalPages) {
          keepGoing = false;
        }

        page++;
      }
      const prmsResults =
        await this.prmsRepository.findTemporalResults<ResultResponseMapper>(
          executionCode,
        );

      const dataProcessed = await this.processData(prmsResults);

      await this.saveResultService.bulkSaveAllSections(dataProcessed, {
        platformCode: ReportingPlatformEnum.PRMS,
        resultSaved,
        currentCode,
        counters,
        statusMapper: ResultPrmsStatusMapper,
      });
      await this.syncProcessLogService.update(syncProcessLog.id, counters);
      await this.syncProcessLogService.endSync(syncProcessLog.id);
    } catch (error) {
      const errorMessage = (error as Error).message ?? 'Unknown error';
      this.logger.error(`Error getting data from PRMS: ${errorMessage}`);
    } finally {
      await this.prmsRepository.deleteTemporalResults(executionCode);
    }
  }

  private processKnowledgeProduct(
    knowledgeProduct?: PrmsKnowledgeProductDto | PrmsKnowledgeProductDto[],
    body?: ExternalMappersDto,
  ) {
    if (isEmpty(knowledgeProduct)) return;
    let tempKnowledgeProduct: PrmsKnowledgeProductDto[];
    if (Array.isArray(knowledgeProduct)) {
      tempKnowledgeProduct = knowledgeProduct as PrmsKnowledgeProductDto[];
    } else {
      tempKnowledgeProduct = [knowledgeProduct as PrmsKnowledgeProductDto];
    }
    const evidence: Partial<ResultEvidence>[] = [];
    const resultKnowledgeProduct = new ResultKnowledgeProduct();

    for (const knowledgeProduct of tempKnowledgeProduct) {
      resultKnowledgeProduct.type = knowledgeProduct.knowledge_product_type;
      resultKnowledgeProduct.citation = knowledgeProduct.handle;
      if (!isEmpty(knowledgeProduct.handle)) {
        evidence.push({
          evidence_url: knowledgeProduct.handle,
          evidence_description: 'Handled',
        });
        body.external_link = knowledgeProduct.handle;
      }
      if (!isEmpty(knowledgeProduct.doi)) {
        evidence.push({
          evidence_url: knowledgeProduct.doi,
          evidence_description: 'DOI',
        });
      }
    }
    body.knowledgeProduct = resultKnowledgeProduct;

    const tempEvidence = body?.evidence?.evidence
      ? [...body.evidence.evidence]
      : [];
    const existingEvidenceUrls = new Set(
      tempEvidence.map((el) => el.evidence_url),
    );
    const newEvidence = evidence.filter(
      (el) => !existingEvidenceUrls.has(el.evidence_url),
    );
    tempEvidence.push(...(newEvidence as ResultEvidence[]));

    body.evidence = {
      ...body.evidence,
      evidence: tempEvidence as ResultEvidence[],
    };
  }

  private mapEvidence(item: ResultResponseMapper): CreateResultEvidenceDto {
    const evidence = (item?.evidences ?? [])
      .filter((el) => !isEmpty(el?.link))
      .map(
        (el) =>
          ({
            evidence_url: el.link,
            evidence_description: el.description ?? 'Not Provided by PRMS',
          }) as ResultEvidence,
      );

    return { evidence } as CreateResultEvidenceDto;
  }

  private async mapGeoScope(
    item: ResultResponseMapper,
  ): Promise<SaveGeoLocationDto> {
    const countryCodes = (item?.countries ?? []).map((country) => country.code);
    const regionCodes = (item?.regions ?? []).map((region) =>
      parseInt(region.code),
    );

    const [countries, regions] = await Promise.all([
      isEmpty(countryCodes)
        ? Promise.resolve([])
        : this.clarisaCountriesService.findByIso2(countryCodes),
      isEmpty(regionCodes)
        ? Promise.resolve([])
        : this.clarisaRegionsService.findByUm49Codes(regionCodes),
    ]);

    return {
      geo_scope_id: parseInt(
        item?.geographic_focus?.code,
      ) as ClarisaGeoScopeEnum,
      countries: countries.map(
        (country) => ({ isoAlpha2: country.isoAlpha2 }) as ResultCountry,
      ),
      regions: regions.map(
        (region) => ({ region_id: region.um49Code }) as ResultRegion,
      ),
      comment_geo_scope: null,
    };
  }

  private async mapPartners(
    item: ResultResponseMapper,
  ): Promise<CreateResultInstitutionDto> {
    const partnerCodes = (item?.contributing_partners ?? []).map((partner) =>
      parseInt(partner.code),
    );

    if (isEmpty(partnerCodes)) {
      return { institutions: [] };
    }

    const institutions =
      await this.clarisaInstitutionsService.findByCodes(partnerCodes);

    return {
      institutions: institutions.map(
        (institution) =>
          ({ institution_id: institution.code }) as ResultInstitution,
      ),
    };
  }

  /**
   * Maps PRMS `policy_change_summary` into the STAR policy-change section DTO.
   *
   * PRMS only exposes boolean flags for linked innovation results (not result
   * IDs), so `innovation_development` / `innovation_use` stay unset here.
   */
  private async mapPolicyChange(
    summary?: PolicyChangeSummaryMapper | null,
  ): Promise<CreateResultPolicyChangeDto | undefined> {
    if (isEmpty(summary)) return undefined;

    const orgIds = (summary.policy_implementing_organizations ?? [])
      .map((org) => org?.id)
      .filter((id) => !isEmpty(id));

    const institutions = isEmpty(orgIds)
      ? []
      : await this.clarisaInstitutionsService.findByCodes(orgIds);

    return {
      policy_type_id: PolicyTypeHomologation[summary.policy_type?.id],
      policy_stage_id: PolicyStageHomologation[summary.policy_stage?.id],
      evidence_stage: undefined,
      implementing_organization: institutions.map(
        (institution) =>
          ({ institution_id: institution.code }) as ResultInstitution,
      ),
      innovation_development: undefined,
      innovation_use: undefined,
    };
  }

  /**
   * Maps PRMS `capacity_development_summary` into STAR capacity-sharing DTO.
   *
   * PRMS participant counts imply a group session, so `session_format_id` is
   * always set to {@link SessionFormatEnum.GROUP}.
   */
  private async mapCapacitySharing(
    summary?: CapacityDevelopmentSummaryMapper | null,
  ): Promise<UpdateResultCapacitySharingDto | undefined> {
    if (isEmpty(summary)) return undefined;

    const orgIds = (summary.on_behalf_organizations ?? [])
      .map((org) => org?.id)
      .filter((id) => !isEmpty(id));

    const institutions = isEmpty(orgIds)
      ? []
      : await this.clarisaInstitutionsService.findByCodes(orgIds);

    const male = summary?.male_using ?? 0;
    const female = summary?.female_using ?? 0;
    const nonBinary = summary?.non_binary_using ?? 0;
    const unknown = summary?.has_unkown_using ?? 0;

    const group = new CapDevGroupDto();
    group.session_participants_male = male;
    group.session_participants_female = female;
    group.session_participants_non_binary = nonBinary;
    group.session_participants_total = male + female + nonBinary + unknown;
    group.is_attending_organization = summary?.is_attending_for_organization;
    group.trainee_organization_representative = institutions.map(
      (institution) =>
        ({ institution_id: institution.code }) as ResultInstitution,
    );

    const capacitySharing = new UpdateResultCapacitySharingDto();
    capacitySharing.session_format_id = SessionFormatEnum.GROUP;
    capacitySharing.delivery_modality_id =
      DeliveryModalityHomologation[summary?.delivery_method?.name];
    // `term` → session length; `name` → degree only when term is Long-term.
    capacitySharing.session_length_id =
      SessionLengthHomologation[summary?.training_length?.term];
    if (capacitySharing.session_length_id === SessionLengthEnum.LONG_TERM) {
      capacitySharing.degree_id =
        DegreeHomologation[summary?.training_length?.name];
    }
    capacitySharing.group = group;

    return capacitySharing;
  }

  /**
   * Maps PRMS `innovation_development_summary` into STAR innovation-dev + IP rights.
   */
  private async mapInnovationDev(
    summary?: InnovationDevelopmentSummaryMapper | null,
  ): Promise<{
    innovationDev?: CreateResultInnovationDevDto;
    ipRights?: UpdateIpRightDto;
  }> {
    if (isEmpty(summary)) return {};

    const innovationDev = new CreateResultInnovationDevDto();
    innovationDev.short_title = summary?.short_name;
    innovationDev.innovation_readiness_explanation =
      summary?.evidences_justification;
    innovationDev.anticipated_users_id =
      summary.innovation_user_to_be_determined
        ? InnovationDevAnticipatedUsers.THIS_IS_YET_TO_BE_DETERMINED
        : InnovationDevAnticipatedUsers.USERS_HAVE_BEEN_DETERMINED;

    if (!isEmpty(summary?.characterization?.name)) {
      const nature =
        await this.clarisaInnovationCharacteristicsService.findByName(
          summary?.characterization.name,
        );
      innovationDev.innovation_nature_id =
        nature?.id ??
        (await this.clarisaInnovationCharacteristicsService
          .findOne(summary?.characterization?.id)
          .then((res) => res?.id));
    }

    if (!isEmpty(summary?.typology?.name) || !isEmpty(summary.typology?.code)) {
      const typeByName = !isEmpty(summary?.typology?.name)
        ? await this.clarisaInnovationTypesService.findByName(
            summary?.typology.name,
          )
        : null;
      innovationDev.innovation_type_id =
        typeByName?.code ??
        (await this.clarisaInnovationTypesService
          .findOne(summary?.typology?.code)
          .then((res) => res?.code));
    }

    if (!isEmpty(summary?.innovation_readiness_level?.level)) {
      const readiness =
        await this.clarisaInnovationReadinessLevelsService.findByValue(
          summary?.innovation_readiness_level.level,
        );
      innovationDev.innovation_readiness_id = readiness?.id;
    }

    const demand = summary?.anticipated_user_demand;
    const demandTexts = new Set<string>();
    const actors: CreateResultActorDto[] = [];

    for (const actor of demand?.actors ?? []) {
      if (isEmpty(actor?.actor_type_name)) continue;
      const actorType = await this.clarisaActorTypesService.findByName(
        actor.actor_type_name,
      );
      if (isEmpty(actorType?.code)) continue;
      const dto = new CreateResultActorDto();
      dto.actor_type_id = actorType.code;
      dto.actor_role_id = ActorRolesEnum.INNOVATION_DEV;
      dto.sex_age_disaggregation_not_apply = !actor.sex_and_age_disaggregation;
      actors.push(dto);
      if (!isEmpty(actor.addressing_demands)) {
        demandTexts.add(actor.addressing_demands.trim());
      }
    }
    innovationDev.actors = actors;

    const institutionTypes: CreateResultInstitutionTypeDto[] = [];
    for (const org of demand?.organizations ?? []) {
      if (isEmpty(org?.institution_type_name)) continue;
      const institutionType =
        await this.clarisaInstitutionTypesService.findByName(
          org.institution_type_name,
        );
      if (isEmpty(institutionType?.code)) continue;
      const dto = new CreateResultInstitutionTypeDto();
      dto.institution_type_id = institutionType.code;
      dto.is_organization_known = false;
      institutionTypes.push(dto);
      if (!isEmpty(org.addressing_demands)) {
        demandTexts.add(org.addressing_demands.trim());
      }
    }
    innovationDev.institution_types = institutionTypes;

    if (demandTexts.size > 0) {
      const outcome = [...demandTexts].join('\n');
      innovationDev.expected_outcome = outcome;
      innovationDev.intended_beneficiaries_description = outcome;
    }

    innovationDev.no_sex_age_disaggregation =
      actors.length > 0 &&
      actors.every((actor) => actor.sex_age_disaggregation_not_apply === true);

    const ipRights = this.mapIpRightsFromQuestionnaire(
      summary?.innovation_development_questionnaire,
    );

    return { innovationDev, ipRights };
  }

  private mapIpRightsFromQuestionnaire(
    questionnaire?: InnovationDevelopmentQuestionnaireMapper | null,
  ): UpdateIpRightDto | undefined {
    const questions = questionnaire?.intellectual_property_rights ?? [];
    if (isEmpty(questions)) return undefined;

    const ipRights = new UpdateIpRightDto();
    let mapped = false;

    for (const item of questions) {
      const answerText = item?.answer?.text;
      const option = IpRightsApplicationHomologation[answerText];
      if (isEmpty(option)) continue;

      if (
        item.question_id ===
        PrmsInnovationIpQuestionEnum.PRIVATE_SECTOR_ENGAGEMENT
      ) {
        ipRights.private_sector_engagement_id = option;
        mapped = true;
      }
      if (
        item.question_id ===
        PrmsInnovationIpQuestionEnum.FORMAL_IP_RIGHTS_APPLICATION
      ) {
        ipRights.formal_ip_rights_application_id = option;
        mapped = true;
      }
    }

    return mapped ? ipRights : undefined;
  }

  async processData(
    prmsData: PrmsTemporalResponseMapper[],
  ): Promise<ExternalMappersDto[]> {
    const results: ExternalMappersDto[] = [];
    for (const data of prmsData) {
      if (isEmpty(data?.data)) continue;
      const isVersion = data.is_version ?? false;
      const item = data.data;
      const indicator = IndicatorHomologation[item.indicator_category.code];
      if (!indicator) {
        this.logger.warn(
          `Skipping result ${item.result_code} because indicator ${item.indicator_category.code} is not homologated.`,
        );
        continue;
      }
      const result = new ExternalMappersDto();
      result.official_code = parseInt(item.result_code);
      result.is_version_applied = isVersion;
      result.external_link = item?.prms_link;
      result.public_link = item?.pdf_link;
      result.created_at = item?.created_date;
      result.status_id = ResultPrmsStatusMapper?.[item?.status_id];

      const leadCenterAcronym: string = item?.contributing_centers?.find(
        (center) => center.is_lead,
      )?.acronym;

      const contracts =
        await this.pooledFundingContractsService.findMappingPooledFundingContracts(
          item?.primary_entity?.official_code,
        );

      const primaryContract = contracts.find(
        (contract) =>
          contract?.ubwClientDescription?.toUpperCase()?.trim() ===
          AcronymExContractEnum[leadCenterAcronym],
      );

      const contributingContracts = contracts.filter(
        (contract) =>
          contract?.ubwClientDescription?.toUpperCase()?.trim() !==
          AcronymExContractEnum[leadCenterAcronym],
      );

      if (!isEmpty(item?.created_by)) {
        const existsUser = await this.resultRepository.findUserByEmailOrCarnet(
          null,
          item.created_by?.email,
        );
        let allianceUserStaff: AllianceUserStaff = null;
        if (isEmpty(item.created_by?.email)) {
          allianceUserStaff = await this.dataSource
            .getRepository(AllianceUserStaff)
            .findOne({
              where: {
                email: Like(
                  `%${item.created_by?.email?.trim()?.toLowerCase()}%`,
                ),
              },
            });
        }
        if (isEmpty(existsUser) && !isEmpty(allianceUserStaff)) {
          result.userData =
            await this.resultsService.createUserProcess(allianceUserStaff);
        } else {
          await this.resultRepository.unpdateCarnetUser(
            existsUser?.sec_user_id,
            existsUser?.carnet,
          );
          result.userData = existsUser;
          if (!isEmpty(allianceUserStaff)) {
            result.userData.carnet = allianceUserStaff.center;
          }
        }
      }

      result.public_link = item?.pdf_link;
      result.external_link = item?.prms_link;

      result.createResult = {
        year: parseInt(item.year),
        indicator_id: indicator,
        title: item?.result_title,
        description: item?.description,
        contract_id: primaryContract?.agreement_id,
      };

      const prmsLever = await this.clarisaLeversService.findOne(
        item?.result_level?.code,
      );

      const lever = await this.clarisaLeversService.homologatedData(
        primaryContract?.departmentId,
      );
      const clarisaLever =
        await this.clarisaLeversService.findByShortName(lever);

      const savedPrimaryContract = [
        ...contributingContracts
          .map(
            (contract) =>
              ({
                contract_id: contract?.agreement_id,
                is_primary: false,
              }) as ResultContract,
          )
          .filter((contract) => !isEmpty(contract?.contract_id)),
      ];

      if (!isEmpty(primaryContract?.agreement_id)) {
        savedPrimaryContract.push({
          contract_id: primaryContract?.agreement_id,
          is_primary: true,
        } as ResultContract);
      }

      result.alignments = {
        primary_levers: [
          {
            lever_id: prmsLever?.id ?? clarisaLever?.id,
          } as unknown as ResultLever,
        ],
        contracts: savedPrimaryContract,
        contributor_levers: [],
        result_sdgs: [],
      };

      result.generalInformation = {
        title: item.result_title,
        description: item.description,
        keywords: [],
        main_contact_person: null,
        main_contact_person_ai: null,
        year: parseInt(item.year),
      };

      result.geoScope = await this.mapGeoScope(item);
      result.partners = await this.mapPartners(item);
      result.evidence = this.mapEvidence(item);

      if (indicator === IndicatorsEnum.POLICY_CHANGE) {
        result.policyChange = await this.mapPolicyChange(
          item.policy_change_summary,
        );
      }

      if (indicator === IndicatorsEnum.CAPACITY_SHARING_FOR_DEVELOPMENT) {
        result.capacitySharing = await this.mapCapacitySharing(
          item.capacity_development_summary,
        );
      }

      if (indicator === IndicatorsEnum.INNOVATION_DEV) {
        const mapped = await this.mapInnovationDev(
          item.innovation_development_summary,
        );
        result.innovationDev = mapped.innovationDev;
        result.ipRights = mapped.ipRights;
      }

      results.push(result);
    }
    return results;
  }
}
