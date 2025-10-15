import {
  BadRequestException,
  ConflictException,
  HttpStatus,
  Injectable,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { DataSource, EntityManager, In, Not } from 'typeorm';
import {
  ResultFiltersInterface,
  ResultRepository,
} from './repositories/result.repository';
import { isEmpty, validObject } from '../../shared/utils/object.utils';
import { Result } from './entities/result.entity';
import { CreateResultDto } from './dto/create-result.dto';
import { ResultContractsService } from '../result-contracts/result-contracts.service';
import { ContractRolesEnum } from '../result-contracts/enum/contract-roles.enum';
import { ResultLeversService } from '../result-levers/result-levers.service';
import { LeverRolesEnum } from '../lever-roles/enum/lever-roles.enum';
import { UpdateGeneralInformation } from './dto/update-general-information.dto';
import { ResultKeywordsService } from '../result-keywords/result-keywords.service';
import { ResultUsersService } from '../result-users/result-users.service';
import { UserRolesEnum } from '../user-roles/enum/user-roles.enum';
import { ResultCapacitySharingService } from '../result-capacity-sharing/result-capacity-sharing.service';
import { TrueFalseEnum } from '../../shared/enum/queries.enum';
import { IndicatorsEnum } from '../indicators/enum/indicators.enum';
import { ResultAlignmentDto } from './dto/result-alignment.dto';
import { ResultContract } from '../result-contracts/entities/result-contract.entity';
import { MetadataResultDto } from './dto/metadata-result.dto';
import { ResultPolicyChangeService } from '../result-policy-change/result-policy-change.service';
import {
  CurrentUserUtil,
  SetAutitEnum,
} from '../../shared/utils/current-user.util';
import { AlianceManagementApp } from '../../tools/broker/aliance-management.app';
import { SecRolesEnum } from '../../shared/enum/sec_role.enum';
import { SaveGeoLocationDto } from './dto/save-geo-location.dto';
import { ResultCountriesService } from '../result-countries/result-countries.service';
import { ResultRegionsService } from '../result-regions/result-regions.service';
import { ResultCountriesSubNationalsService } from '../result-countries-sub-nationals/result-countries-sub-nationals.service';
import { ClarisaGeoScopeService } from '../../tools/clarisa/entities/clarisa-geo-scope/clarisa-geo-scope.service';
import { ClarisaGeoScopeEnum } from '../../tools/clarisa/entities/clarisa-geo-scope/enum/clarisa-geo-scope.enum';
import { CountryRolesEnum } from '../country-roles/enums/country-roles.anum';
import { ResultCountry } from '../result-countries/entities/result-country.entity';
import { ResultCountriesSubNational } from '../result-countries-sub-nationals/entities/result-countries-sub-national.entity';
import { UpdateDataUtil } from '../../shared/utils/update-data.util';
import { OpenSearchResultApi } from '../../tools/open-search/results/result.opensearch.api';
import { ElasticOperationEnum } from '../../tools/open-search/dto/elastic-operation.dto';
import { ResultStatusEnum } from '../result-status/enum/result-status.enum';
import { IndicatorsService } from '../indicators/indicators.service';
import { Indicator } from '../indicators/entities/indicator.entity';
import { ClarisaGeoScope } from '../../tools/clarisa/entities/clarisa-geo-scope/entities/clarisa-geo-scope.entity';
import { AiRawCountry, ResultAiDto, ResultRawAi } from './dto/result-ai.dto';
import { TempResultAi } from './entities/temp-result-ai.entity';
import { ClarisaSubNationalsService } from '../../tools/clarisa/entities/clarisa-sub-nationals/clarisa-sub-nationals.service';
import { AllianceUserStaffService } from '../alliance-user-staff/alliance-user-staff.service';
import { ResultUser } from '../result-users/entities/result-user.entity';
import { customErrorResponse } from '../../shared/utils/response.utils';
import { ResultLever } from '../result-levers/entities/result-lever.entity';
import { ClarisaLeversService } from '../../tools/clarisa/entities/clarisa-levers/clarisa-levers.service';
import { AgressoContractService } from '../agresso-contract/agresso-contract.service';
import { ResultInnovationDevService } from '../result-innovation-dev/result-innovation-dev.service';
import { ResultSdgsService } from '../result-sdgs/result-sdgs.service';
import { ResultSdg } from '../result-sdgs/entities/result-sdg.entity';
import { ResultIpRightsService } from '../result-ip-rights/result-ip-rights.service';
import { ResultOicrService } from '../result-oicr/result-oicr.service';
import { ReportingPlatformEnum } from './enum/reporting-platform.enum';
import { nextToProcessAiRaw } from '../../shared/utils/validations.utils';
import { ClarisaCountriesService } from '../../tools/clarisa/entities/clarisa-countries/clarisa-countries.service';
import {
  intersection,
  mergeArraysWithPriority,
} from '../../shared/utils/array.util';
import { ResultInstitutionsService } from '../result-institutions/result-institutions.service';
import { InstitutionRolesEnum } from '../institution-roles/enums/institution-roles.enum';
import { CreateResultInstitutionDto } from '../result-institutions/dto/create-result-institution.dto';
import { ResultInstitution } from '../result-institutions/entities/result-institution.entity';
import { ResultInstitutionAi } from '../result-institutions/entities/result-institution-ai.entity';
import { ResultEvidence } from '../result-evidences/entities/result-evidence.entity';
import { ResultEvidencesService } from '../result-evidences/result-evidences.service';
import { CreateResultEvidenceDto } from '../result-evidences/dto/create-result-evidence.dto';
import { ResultRegion } from '../result-regions/entities/result-region.entity';
import { ClarisaSdg } from '../../tools/clarisa/entities/clarisa-sdgs/entities/clarisa-sdg.entity';
import { ResultUserAi } from '../result-users/entities/result-user-ai.entity';
import { CreateResultConfigDto } from './dto/create-config.dto';
import { CgiarLogger } from '../../shared/utils/cgiar-logs/logs.util';
import { QueryService } from '../../shared/utils/query.service';

@Injectable()
export class ResultsService {
  private readonly logger = new CgiarLogger(ResultsService.name);
  constructor(
    private readonly dataSource: DataSource,
    private readonly mainRepo: ResultRepository,
    private readonly _resultContractsService: ResultContractsService,
    private readonly _resultLeversService: ResultLeversService,
    private readonly _resultKeywordsService: ResultKeywordsService,
    private readonly _resultUsersService: ResultUsersService,
    private readonly _resultCapacitySharingService: ResultCapacitySharingService,
    private readonly _resultPolicyChangeService: ResultPolicyChangeService,
    private readonly currentUser: CurrentUserUtil,
    private readonly _alianceManagementApp: AlianceManagementApp,
    private readonly _resultCountriesService: ResultCountriesService,
    private readonly _resultRegionsService: ResultRegionsService,
    private readonly _resultCountriesSubNationalsService: ResultCountriesSubNationalsService,
    private readonly _clarisaGeoScopeService: ClarisaGeoScopeService,
    private readonly _updateDataUtil: UpdateDataUtil,
    private readonly _openSearchResultApi: OpenSearchResultApi,
    private readonly _indicatorsService: IndicatorsService,
    private readonly _clarisaSubNationalsService: ClarisaSubNationalsService,
    private readonly _resultIpRightsService: ResultIpRightsService,
    private readonly _agressoUserStaffService: AllianceUserStaffService,
    private readonly _clarisaLeversService: ClarisaLeversService,
    private readonly _agressoContractService: AgressoContractService,
    private readonly _resultInnovationDevService: ResultInnovationDevService,
    private readonly _resultSdgsService: ResultSdgsService,
    @Inject(forwardRef(() => ResultOicrService))
    private readonly _resultOicrService: ResultOicrService,
    private readonly _clarisaCountriesService: ClarisaCountriesService,
    private readonly _resultInstitutionsService: ResultInstitutionsService,
    private readonly _resultEvidencesService: ResultEvidencesService,
    private readonly _queryService: QueryService,
  ) {}

  async findResults(filters: Partial<ResultFiltersInterface>) {
    return this.mainRepo.findResultsFilters({
      limit: filters.limit,
      page: filters.page,
      contracts: filters?.contracts,
      levers: filters?.levers,
      indicators: filters?.indicators,
      result_status: filters?.result_status,
      result_audit_data: filters?.result_audit_data,
      primary_contract: filters?.primary_contract,
      primary_lever: filters?.primary_lever,
      result_audit_data_objects: filters?.result_audit_data_objects,
      indicator_code: filters?.indicator_code,
      sort_order: filters?.sort_order,
      contract_codes: filters?.contract_codes,
      lever_codes: filters?.lever_codes,
      status_codes: filters?.status_codes,
      user_codes: filters?.user_codes,
      years: filters?.years,
      resultCodes: filters?.resultCodes,
    });
  }

  async findResultTIPData(options: { year?: number; productType?: number }) {
    const query = this.mainRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.indicator', 'indicator')
      .leftJoinAndSelect(
        'r.result_contracts',
        'result_contracts',
        'result_contracts.is_primary = :isPrimary',
      )
      .leftJoinAndSelect(
        'result_contracts.agresso_contract',
        'agresso_contract',
      )
      .innerJoinAndSelect('r.result_ip_rights', 'result_ip_rights')
      .leftJoinAndSelect(
        'result_ip_rights.intellectualPropertyOwner',
        'intellectualPropertyOwner',
      )
      .leftJoinAndSelect(
        'r.result_users',
        'result_users',
        'result_users.user_role_id = :roleId',
      )
      .leftJoinAndSelect('result_users.user', 'user')
      .leftJoinAndSelect('r.result_status', 'result_status')
      .where('r.is_active = :active', { active: true })
      .andWhere('r.is_snapshot = :snapshot', { snapshot: false })
      .andWhere('r.result_status_id IN (:...statusIds)', {
        statusIds: [ResultStatusEnum.APPROVED, ResultStatusEnum.SUBMITTED],
      })
      .setParameters({
        roleId: UserRolesEnum.MAIN_CONTACT,
        isPrimary: true,
      });

    if (options?.year) {
      query.andWhere('report_year_id = :year', { year: options.year });
    }

    if (options?.productType) {
      query.andWhere('r.indicator_id = :productType', {
        productType: options.productType,
      });
    }

    return query.getMany();
  }

  async findBaseInfo(resultId: number): Promise<CreateResultDto> {
    const contract_id = await this._resultContractsService
      .find(resultId, ContractRolesEnum.ALIGNMENT)
      .then((res) => res[0]?.contract_id);
    const result = await this.mainRepo.findOne({
      select: {
        title: true,
        description: true,
        indicator_id: true,
        report_year_id: true,
        is_ai: true,
      },
      where: {
        result_id: resultId,
        is_active: true,
      },
    });
    return {
      contract_id,
      year: result.report_year_id,
      title: result.title,
      description: result.description,
      indicator_id: result.indicator_id,
      is_ai: result.is_ai,
    };
  }

  private validateCreateConfig(configuration?: CreateResultConfigDto) {
    const newConfig: CreateResultConfigDto = new CreateResultConfigDto();
    newConfig.leverEnum = configuration?.leverEnum ?? LeverRolesEnum.ALIGNMENT;
    newConfig.notMap = {
      sdg: configuration?.notMap?.sdg ?? false,
      lever: configuration?.notMap?.lever ?? false,
    };
    newConfig.result_status_id =
      configuration?.result_status_id ?? ResultStatusEnum.DRAFT;
    return newConfig;
  }

  async createResult(
    createResult: CreateResultDto,
    platform_code: ReportingPlatformEnum = ReportingPlatformEnum.STAR,
    configuration?: CreateResultConfigDto,
  ): Promise<Result> {
    const config = this.validateCreateConfig(configuration);
    const { invalidFields, isValid } = validObject(createResult, [
      'contract_id',
      'indicator_id',
      'title',
      'year',
    ]);

    if (!isValid) {
      throw new BadRequestException(`Invalid fields: ${invalidFields}`);
    }

    const { description, indicator_id, title, contract_id, year } =
      createResult;

    await this.mainRepo
      .findOne({
        where: { title, is_active: true },
        relations: { indicator: true },
      })
      .then((result) => {
        if (result) {
          throw customErrorResponse<Result>({
            message: result,
            name: `Please enter a unique title. Review the existing result by selecting this link: ${result.indicator.name} - ${result.title}`,
            status: HttpStatus.CONFLICT,
          });
        }
      });

    const newOfficialCode = await this.newOfficialCode();

    const result = await this.dataSource.transaction(async (manager) => {
      const result = await manager
        .getRepository(this.mainRepo.target)
        .save({
          description,
          indicator_id,
          title,
          is_ai: createResult.is_ai ?? false,
          result_official_code: newOfficialCode,
          report_year_id: year,
          is_snapshot: false,
          platform_code,
          result_status_id: config.result_status_id,
          ...this.currentUser.audit(SetAutitEnum.NEW),
        })
        .then((result) => {
          this._alianceManagementApp.linkUserToContract(
            this.currentUser.user_id,
            contract_id,
            SecRolesEnum.CONTRACT_CONTRIBUTOR,
          );
          return result;
        });

      await this.createResultType(
        result.result_id,
        result.indicator_id,
        manager,
      );

      const agressoContract =
        await this._agressoContractService.findOne(contract_id);
      const lever = this._clarisaLeversService.homologatedData(
        agressoContract.departmentId,
      );
      const clarisaLever = await this._clarisaLeversService.findByName(lever);

      if (clarisaLever && !config.notMap.lever) {
        const primaryLever: Partial<ResultLever> = {
          lever_id: String(clarisaLever.id),
          is_primary: true,
        };

        await this._resultLeversService.create<LeverRolesEnum>(
          result.result_id,
          primaryLever,
          'lever_id',
          config.leverEnum,
          manager,
          ['is_primary'],
        );
      }

      const primaryContract: Partial<ResultContract> = {
        contract_id: contract_id,
        is_primary: true,
      };

      await this._resultContractsService.create<ContractRolesEnum>(
        result.result_id,
        primaryContract,
        'contract_id',
        ContractRolesEnum.ALIGNMENT,
        manager,
        ['is_primary'],
      );

      if (!config.notMap.sdg) {
        const tempSdg: Partial<ResultSdg>[] = agressoContract?.sdgs?.map(
          (sdg) => ({
            clarisa_sdg_id: sdg.id,
          }),
        );

        await this._resultSdgsService.create(
          result.result_id,
          tempSdg,
          'clarisa_sdg_id',
          undefined,
          manager,
        );
      }

      return result;
    });

    this._openSearchResultApi.uploadSingleToOpenSearch(
      result.result_id,
      ElasticOperationEnum.PATCH,
    );

    return result;
  }

  private async newOfficialCode() {
    const firstInsertion: number = 1;
    const lastCode: number = await this.mainRepo
      .findOne({
        where: { is_active: In([true, false]) },
        order: { result_official_code: 'DESC' },
      })
      .then((result) => {
        return result?.result_official_code
          ? result.result_official_code + 1
          : firstInsertion;
      });

    return lastCode;
  }

  private async createResultType(
    resultId: number,
    indicator: IndicatorsEnum,
    manager?: EntityManager,
  ) {
    switch (indicator) {
      case IndicatorsEnum.CAPACITY_SHARING_FOR_DEVELOPMENT:
        await this._resultCapacitySharingService.create(resultId, manager);
        break;
      case IndicatorsEnum.POLICY_CHANGE:
        await this._resultPolicyChangeService.create(resultId, manager);
        break;
      case IndicatorsEnum.INNOVATION_DEV:
        await this._resultInnovationDevService.create(resultId, manager);
        break;
      case IndicatorsEnum.OICR:
        await this._resultOicrService.create(resultId, manager);
        break;
      default:
        break;
    }

    const ipAvailables = [
      IndicatorsEnum.CAPACITY_SHARING_FOR_DEVELOPMENT,
      IndicatorsEnum.INNOVATION_DEV,
    ];

    if (ipAvailables.includes(indicator)) {
      await this._resultIpRightsService.create(resultId, manager);
    }
  }

  async deleteResult(result_id: number): Promise<Result> {
    const result = await this.mainRepo
      .findOne({
        select: {
          result_id: true,
          result_status_id: true,
          created_by: true,
        },
        where: { result_id },
      })
      .then((result) => {
        if (!result) {
          throw new NotFoundException('Result not found');
        }

        if (result.result_status_id !== ResultStatusEnum.DRAFT) {
          throw new ConflictException(
            'Only results in editing status can be deleted',
          );
        }

        return result;
      });

    await this.mainRepo.deleteResult(result.result_id);
    await this._openSearchResultApi.uploadSingleToOpenSearch(
      { result_id: result.result_id },
      ElasticOperationEnum.DELETE,
    );
    return result;
  }

  async updateGeneralInfo(
    result_id: number,
    generalInformation: UpdateGeneralInformation,
    returnData: TrueFalseEnum = TrueFalseEnum.FALSE,
    isAi: boolean = false,
  ) {
    return this.dataSource.transaction(async (manager) => {
      const existsResult = await manager
        .getRepository(this.mainRepo.target)
        .findOne({
          where: {
            result_id: Not(result_id),
            title: generalInformation.title,
            is_active: true,
            is_snapshot: false,
          },
        });

      if (existsResult) {
        throw new ConflictException(
          'The name of the result is already registered',
        );
      }
      await manager.getRepository(this.mainRepo.target).update(result_id, {
        title: generalInformation.title,
        description: generalInformation.description,
        report_year_id: generalInformation.year,
        ...this.currentUser.audit(SetAutitEnum.UPDATE),
      });

      const keywordsToSave = this._resultKeywordsService.transformData(
        generalInformation.keywords,
      );

      const keywords = await this._resultKeywordsService.create<null>(
        result_id,
        keywordsToSave,
        'keyword',
        null,
        manager,
      );

      await this._resultUsersService.create<UserRolesEnum>(
        result_id,
        generalInformation.main_contact_person,
        'user_id',
        UserRolesEnum.MAIN_CONTACT,
        manager,
      );

      if (isAi && generalInformation.main_contact_person_ai) {
        await this._resultUsersService.insertUserAi(
          result_id,
          [generalInformation.main_contact_person_ai],
          UserRolesEnum.MAIN_CONTACT,
          manager,
        );
      }

      this._openSearchResultApi.uploadSingleToOpenSearch(
        {
          result_id,
          title: generalInformation.title,
          description: generalInformation.description,
          keywords: keywords.map((el) => el.keyword),
        },
        ElasticOperationEnum.PUT,
      );

      if (returnData === TrueFalseEnum.TRUE) {
        return this.findGeneralInfo(result_id);
      }

      return undefined;
    });
  }

  async findGeneralInfo(resultId: number) {
    const result = await this.mainRepo.findOne({
      select: {
        title: true,
        description: true,
        report_year_id: true,
        result_id: true,
        created_at: true,
        updated_at: true,
      },
      where: { result_id: resultId, is_active: true },
    });
    const keywords =
      await this._resultKeywordsService.findKeywordsByResultId(resultId);

    const mainContactPerson = await this._resultUsersService
      .findUsersByRoleResult(UserRolesEnum.MAIN_CONTACT, resultId)
      .then((data) => (data?.length > 0 ? data[0] : null));
    const year = result.report_year_id;
    delete result.report_year_id;
    const generalInformation: UpdateGeneralInformation = {
      ...result,
      year,
      keywords: keywords.map((keyword) => keyword.keyword),
      main_contact_person: mainContactPerson,
    };

    return generalInformation;
  }

  async findResultVersions(resultCode: number) {
    const select = {
      result_id: true,
      result_official_code: true,
      report_year_id: true,
      result_status_id: true,
    };
    const where = {
      result_official_code: resultCode,
      is_active: true,
    };
    const versions = await this.mainRepo.find({
      select,
      where: {
        ...where,
        is_snapshot: true,
      },
    });

    const live = await this.mainRepo.find({
      select,
      where: {
        ...where,
        is_snapshot: false,
      },
    });

    return {
      live,
      versions: versions ?? [],
    };
  }

  async updateResultAlignment(
    resultId: number,
    alignmentData: ResultAlignmentDto,
    returnData: TrueFalseEnum = TrueFalseEnum.FALSE,
  ) {
    const { contracts, primary_levers, contributor_levers } = alignmentData;
    await this.dataSource.transaction(async (manager) => {
      await this._resultContractsService.create<ContractRolesEnum>(
        resultId,
        contracts,
        'contract_id',
        ContractRolesEnum.ALIGNMENT,
        manager,
        ['is_primary'],
        {
          is_primary: false,
        },
      );

      const primaryLevers: Partial<ResultLever>[] =
        primary_levers?.length == 1
          ? primary_levers.map((el) => ({
              lever_id: el.lever_id,
              is_primary: true,
            }))
          : [];

      const contributorLevers: Partial<ResultLever>[] =
        contributor_levers?.length > 0
          ? contributor_levers.map((el) => ({
              lever_id: el.lever_id,
              is_primary: false,
            }))
          : [];

      const fullLevers = mergeArraysWithPriority<ResultLever>(
        primaryLevers,
        contributorLevers,
        'lever_id',
      );

      await this._resultLeversService.create<LeverRolesEnum>(
        resultId,
        fullLevers,
        'lever_id',
        LeverRolesEnum.ALIGNMENT,
        manager,
        ['is_primary'],
        {
          is_primary: false,
        },
      );

      await this._resultSdgsService.create(
        resultId,
        alignmentData.result_sdgs,
        'clarisa_sdg_id',
        undefined,
        manager,
      );

      await this._updateDataUtil.updateLastUpdatedDate(resultId, manager);
    });

    if (returnData === TrueFalseEnum.TRUE) {
      return this.findResultAlignment(resultId);
    }

    return undefined;
  }

  async validateResultTitle(title: string): Promise<boolean> {
    return this.mainRepo
      .findOne({ where: { title: title, is_active: true } })
      .then((result) => result == null);
  }

  async findResultAlignment(resultId: number) {
    const contracts = await this._resultContractsService.find(
      resultId,
      ContractRolesEnum.ALIGNMENT,
    );

    const levers = await this._resultLeversService.find(
      resultId,
      LeverRolesEnum.ALIGNMENT,
    );

    const result_sdgs = await this._resultSdgsService.find(resultId);

    const resultAlignment: ResultAlignmentDto = {
      contracts,
      primary_levers: levers.filter((el) => el.is_primary),
      contributor_levers: levers.filter((el) => !el.is_primary),
      result_sdgs,
    };

    return resultAlignment;
  }

  async findMetadataResult(result_id: number): Promise<MetadataResultDto> {
    const result = await this.mainRepo.findOne({
      select: {
        indicator: {
          name: true,
          indicator_id: true,
        },
        report_year_id: true,
        result_id: true,
        result_official_code: true,
        result_status_id: true,
        title: true,
        result_status: {
          name: true,
        },
        created_by: true,
      },
      where: { result_id, is_active: true },
      relations: {
        indicator: true,
        result_status: true,
      },
    });

    const primaryContract =
      await this._resultContractsService.getPrimaryContract(result_id);

    const { is_principal } = await this.mainRepo.metadataPrincipalInvestigator(
      result_id,
      this.currentUser.user_id,
    );

    if (!result) {
      throw new NotFoundException('Result not found');
    }

    return {
      result_contract_id: primaryContract?.contract_id,
      indicator_id: result?.indicator?.indicator_id,
      indicator_name: result?.indicator?.name,
      result_id: result?.result_id,
      result_official_code: result?.result_official_code,
      status_id: result?.result_status_id,
      status_name: result?.result_status?.name,
      result_title: result?.title,
      created_by: result?.created_by,
      report_year: result?.report_year_id,
      is_principal_investigator: is_principal == 1,
    };
  }

  async validateIndicator(
    result_id: number,
    indicator: IndicatorsEnum,
  ): Promise<boolean> {
    return this.mainRepo
      .findOne({ where: { result_id, indicator_id: indicator } })
      .then((result) => result != null);
  }

  async formalizeResult(result: ResultRawAi) {
    let resultExists: Result = null;
    try {
      const processedResult = await this.createResultFromAiRoar(result);
      const newResult = await this.createResult(processedResult.result);
      resultExists = newResult;
      await this.updateGeneralInfo(
        newResult.result_id,
        processedResult.generalInformation,
      );

      await this._resultSdgsService.saveSdgAi(
        newResult.result_id,
        processedResult?.sdgs,
      );

      await this.saveGeoLocation(newResult.result_id, processedResult.geoScope);
      await this._resultInstitutionsService.updatePartners(
        newResult.result_id,
        processedResult?.partners,
        true,
      );
      await this._resultEvidencesService.updateResultEvidences(
        newResult.result_id,
        processedResult?.evidences,
      );
      switch (newResult.indicator_id) {
        case IndicatorsEnum.CAPACITY_SHARING_FOR_DEVELOPMENT:
          await this._resultCapacitySharingService.update(
            newResult.result_id,
            processedResult.capSharing,
            true,
          );
          break;
        case IndicatorsEnum.POLICY_CHANGE:
          await this._resultPolicyChangeService.update(
            newResult.result_id,
            processedResult.policyChange,
          );
          break;
        case IndicatorsEnum.INNOVATION_DEV:
          await this._resultInnovationDevService.update(
            newResult.result_id,
            processedResult.innovationDev,
          );
          break;
      }

      return { ...newResult, error: false };
    } catch (error) {
      if (resultExists) {
        this.logger.error(
          `Error processing result ${resultExists.result_id}, rolling back. Error: ${error.message}`,
        );
        await this._queryService.deleteFullResultById(resultExists.result_id);
      }
      this.logger.error(`Error processing AI result: ${error.message}`);
      return { ...result, error: true, message_error: error?.name || error };
    }
  }

  async createResultFromAiBulk(results: ResultRawAi[]) {
    const resultsCreated: (
      | Result
      | { error?: boolean; message_error?: string }
    )[] = [];
    for (const result of results) {
      const newResult = await this.formalizeResult(result);
      resultsCreated.push(newResult);
    }
    return {
      results_errors: resultsCreated.filter((el) => (el as any).error),
      results_created: resultsCreated.filter((el) => !(el as any).error),
    };
  }

  async validateAiRawCountries(countries: AiRawCountry) {
    const tempCountries = new ResultCountry();
    tempCountries.isoAlpha2 = countries.code;
    if (!isEmpty(countries.areas)) {
      const tempSubNational: ResultCountriesSubNational[] =
        await this._clarisaSubNationalsService
          .findByCodes(countries.areas)
          .then((response) =>
            response.map(
              (el) =>
                ({
                  sub_national_id: el.id,
                }) as ResultCountriesSubNational,
            ),
          );
      tempCountries.result_countries_sub_nationals = tempSubNational;
    }
    return tempCountries;
  }

  async createResultFromAiRoar(result: ResultRawAi) {
    const tmpNewData: ResultAiDto = new ResultAiDto();
    {
      const newResult: CreateResultDto = new CreateResultDto();
      newResult.title = result.title;
      newResult.description = result.description;
      const indicator: Indicator = await this._indicatorsService.findByName(
        result.indicator,
      );
      newResult.indicator_id = indicator?.indicator_id;
      newResult.contract_id = result.contract_code;
      newResult.is_ai = true;
      newResult.year = result?.year ?? new Date().getFullYear();

      tmpNewData.result = newResult;
    }

    if (!isEmpty(result?.sdg_targets)) {
      const existingSdgs = await this.dataSource
        .getRepository(ClarisaSdg)
        .find({
          where: { financial_code: In(result.sdg_targets) },
        });
      tmpNewData.sdgs = existingSdgs.map((el) => ({
        clarisa_sdg_id: el.id,
      })) as ResultSdg[];
    }

    {
      const tempGeneralInformation: UpdateGeneralInformation =
        new UpdateGeneralInformation();
      tempGeneralInformation.title = result.title;
      tempGeneralInformation.description = result.description;
      tempGeneralInformation.keywords = result.keywords;

      if (!isEmpty(result.main_contact_person)) {
        const { acept, pending } =
          this._resultUsersService.filterInstitutionsAi(
            [result.main_contact_person],
            UserRolesEnum.MAIN_CONTACT,
          );

        tempGeneralInformation.main_contact_person = !isEmpty(acept)
          ? (acept[0] as ResultUser)
          : null;

        tempGeneralInformation.main_contact_person_ai = !isEmpty(pending)
          ? (pending[0] as ResultUserAi)
          : null;
      }

      tmpNewData.generalInformation = tempGeneralInformation;
    }

    {
      const tempGeoscope: SaveGeoLocationDto = new SaveGeoLocationDto();
      const geoscope: ClarisaGeoScope = await nextToProcessAiRaw(
        result?.geoscope_level,
        (name) => this._clarisaGeoScopeService.findByName(name),
      );
      tempGeoscope.geo_scope_id = geoscope?.code;

      const tempCountries: ResultCountry[] = [];
      if (!isEmpty(result?.countries)) {
        const existingCountries =
          await this._clarisaCountriesService.findByIso2(
            result.countries.map((el) => el.code),
          );
        const sharedCountries = intersection(
          result.countries.map((el) => el.code),
          existingCountries.map((el) => el.isoAlpha2),
        );
        const processCountries = result.countries.filter((el) =>
          sharedCountries.includes(el.code),
        );

        for (const country of processCountries) {
          const saveCountries = await this.validateAiRawCountries(country);
          tempCountries.push(saveCountries);
        }
        tempGeoscope.countries = tempCountries;
      }

      tempGeoscope.regions = result.regions?.map((el) => ({
        region_id: el,
      })) as ResultRegion[];

      tmpNewData.geoScope = tempGeoscope;
    }

    {
      const tempCountries: CreateResultInstitutionDto =
        new CreateResultInstitutionDto();
      const { acept, pending } =
        this._resultInstitutionsService.filterInstitutionsAi(
          result?.partners,
          InstitutionRolesEnum.PARTNERS,
        );
      tempCountries.institutions = acept as ResultInstitution[];
      tempCountries.institutions_ai = pending as ResultInstitutionAi[];
      tmpNewData.partners = tempCountries;
    }

    {
      const tempUpdateResultEvidence: CreateResultEvidenceDto =
        new CreateResultEvidenceDto();
      tempUpdateResultEvidence.evidence = result?.evidences?.map((el) => ({
        evidence_description: el.evidence_description,
        evidence_url: el.evidence_link,
      })) as ResultEvidence[];

      tmpNewData.evidences = tempUpdateResultEvidence;
    }

    switch (tmpNewData.result.indicator_id) {
      case IndicatorsEnum.CAPACITY_SHARING_FOR_DEVELOPMENT:
        tmpNewData.capSharing =
          await this._resultCapacitySharingService.processedAiInfo(result);
        break;
      case IndicatorsEnum.POLICY_CHANGE:
        tmpNewData.policyChange =
          await this._resultPolicyChangeService.processedAiInfo(result);
        break;
      case IndicatorsEnum.INNOVATION_DEV:
        tmpNewData.innovationDev =
          await this._resultInnovationDevService.processedAiInfo(result);
        break;
    }

    this.dataSource.getRepository(TempResultAi).save({
      processed_object: tmpNewData,
      raw_object: result,
      ...this.currentUser.audit(SetAutitEnum.BOTH),
    });
    return tmpNewData;
  }

  async saveGeoLocation(
    resultId: number,
    saveGeoLocationDto: SaveGeoLocationDto,
  ) {
    await this.dataSource.transaction(async (manager) => {
      const geoScopeId: ClarisaGeoScopeEnum =
        this._clarisaGeoScopeService.transformGeoScope(
          saveGeoLocationDto.geo_scope_id,
          saveGeoLocationDto.countries,
        );

      await manager.getRepository(this.mainRepo.target).update(resultId, {
        geo_scope_id: geoScopeId,
        comment_geo_scope: saveGeoLocationDto?.comment_geo_scope ?? null,
        ...this.currentUser.audit(SetAutitEnum.UPDATE),
      });

      const tempData =
        await this._resultCountriesService.comparerClientToServerCountry(
          resultId,
          saveGeoLocationDto.countries,
        );

      const resultCountry: Partial<ResultCountry>[] = tempData.map(
        (country) => {
          country.result_countries_sub_nationals = country?.is_active
            ? saveGeoLocationDto.countries.find(
                (el) => el.isoAlpha2 === country.isoAlpha2,
              )?.result_countries_sub_nationals
            : [];
          return country;
        },
      );

      if (
        [ClarisaGeoScopeEnum.GLOBAL, ClarisaGeoScopeEnum.REGIONAL].includes(
          geoScopeId,
        )
      ) {
        await this._resultRegionsService.create(
          resultId,
          saveGeoLocationDto.regions,
          'region_id',
          null,
          manager,
        );
      }

      let saveCountries: Partial<ResultCountry>[] = [];
      if (
        [
          ClarisaGeoScopeEnum.GLOBAL,
          ClarisaGeoScopeEnum.NATIONAL,
          ClarisaGeoScopeEnum.MULTI_NATIONAL,
          ClarisaGeoScopeEnum.SUB_NATIONAL,
        ].includes(geoScopeId)
      ) {
        saveCountries = await this._resultCountriesService.create(
          resultId,
          saveGeoLocationDto.countries,
          'isoAlpha2',
          CountryRolesEnum.GEO_lOCATION,
          manager,
        );
      }

      if (geoScopeId === ClarisaGeoScopeEnum.SUB_NATIONAL) {
        for (const country of saveCountries) {
          const subNational: ResultCountriesSubNational[] =
            saveGeoLocationDto.countries.find(
              (el) => el.isoAlpha2 === country.isoAlpha2,
            )?.result_countries_sub_nationals;
          await this._resultCountriesSubNationalsService.create(
            country.result_country_id,
            subNational,
            'sub_national_id',
            null,
            manager,
          );
        }
      }

      if (
        [
          ClarisaGeoScopeEnum.REGIONAL,
          ClarisaGeoScopeEnum.THIS_IS_YET_TO_BE_DETERMINED,
        ].includes(geoScopeId)
      ) {
        await this._resultCountriesService.create(
          resultId,
          [],
          'isoAlpha2',
          CountryRolesEnum.GEO_lOCATION,
          manager,
        );

        for (const country of resultCountry) {
          await this._resultCountriesSubNationalsService.create(
            country.result_country_id,
            [],
            'sub_national_id',
            null,
            manager,
          );
        }
      }

      if (
        ![ClarisaGeoScopeEnum.GLOBAL, ClarisaGeoScopeEnum.REGIONAL].includes(
          geoScopeId,
        )
      ) {
        await this._resultRegionsService.create(
          resultId,
          [],
          'region_id',
          null,
          manager,
        );
      }

      await this._updateDataUtil.updateLastUpdatedDate(resultId, manager);
    });
    return this.findGeoLocation(resultId);
  }

  async findGeoLocation(resultId: number): Promise<SaveGeoLocationDto> {
    const result = await this.mainRepo.findOne({
      where: { result_id: resultId, is_active: true },
      select: {
        geo_scope_id: true,
        comment_geo_scope: true,
      },
    });

    const cliGeoScope = this._clarisaGeoScopeService.transformGeoScope(
      result?.geo_scope_id,
      undefined,
      false,
    );

    const countries = await this._resultCountriesService.find(
      resultId,
      CountryRolesEnum.GEO_lOCATION,
      {
        country: true,
      },
    );

    const subNational = await this._resultCountriesSubNationalsService.find(
      countries.map((el) => el.result_country_id),
      undefined,
      {
        sub_national: true,
      },
    );

    countries.forEach((country) => {
      country.result_countries_sub_nationals = subNational.filter(
        (el) => el.result_country_id === country.result_country_id,
      );
    });

    const regions = await this._resultRegionsService.find(resultId, undefined, {
      region: true,
    });

    return {
      geo_scope_id: cliGeoScope,
      regions,
      countries,
      comment_geo_scope: result?.comment_geo_scope,
    };
  }

  async findLastUpdatedResultByCurrentUser(take: number) {
    return this.mainRepo
      .find({
        select: [
          'updated_at',
          'is_active',
          'result_id',
          'result_official_code',
          'title',
          'description',
          'result_contracts',
          'indicator_id',
          'indicator',
          'result_status_id',
          'result_status',
        ],
        where: {
          created_by: this.currentUser.user_id,
          is_active: true,
          is_snapshot: false,
        },
        relations: {
          indicator: true,
          result_status: true,
        },
        order: {
          updated_at: 'DESC',
        },
        take: take,
      })
      .then(async (results) => {
        const results_contract = await this.dataSource
          .getRepository(ResultContract)
          .find({
            where: {
              result_id: In(results.map((el) => el.result_id)),
              is_primary: true,
              is_active: true,
            },
            relations: {
              agresso_contract: true,
            },
          });

        return results.map((result) => {
          const contract = results_contract.find(
            (el) => el.result_id === result.result_id,
          );
          return {
            ...result,
            result_contracts: contract ?? null,
          };
        });
      });
  }
}
