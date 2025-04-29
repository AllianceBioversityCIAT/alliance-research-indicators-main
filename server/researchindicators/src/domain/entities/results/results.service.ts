import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager, In } from 'typeorm';
import {
  ResultFiltersInterface,
  ResultRepository,
} from './repositories/result.repository';
import { validObject } from '../../shared/utils/object.utils';
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
import { ReportYearService } from '../report-year/report-year.service';
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
import { CountryAreas, ResultAiDto, ResultRawAi } from './dto/result-ai.dto';
import { TempResultAi } from './entities/temp-result-ai.entity';
import { ClarisaSubNationalsService } from '../../tools/clarisa/entities/clarisa-sub-nationals/clarisa-sub-nationals.service';
import { ResultCapSharingIpService } from '../result-cap-sharing-ip/result-cap-sharing-ip.service';
import { AllianceUserStaffService } from '../alliance-user-staff/alliance-user-staff.service';
import { AllianceUserStaff } from '../alliance-user-staff/entities/alliance-user-staff.entity';
import { ResultUser } from '../result-users/entities/result-user.entity';

@Injectable()
export class ResultsService {
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
    private readonly _reportYearService: ReportYearService,
    private readonly _resultCountriesService: ResultCountriesService,
    private readonly _resultRegionsService: ResultRegionsService,
    private readonly _resultCountriesSubNationalsService: ResultCountriesSubNationalsService,
    private readonly _clarisaGeoScopeService: ClarisaGeoScopeService,
    private readonly _updateDataUtil: UpdateDataUtil,
    private readonly _openSearchResultApi: OpenSearchResultApi,
    private readonly _indicatorsService: IndicatorsService,
    private readonly _clarisaSubNationalsService: ClarisaSubNationalsService,
    private readonly _resultCapSharingIpService: ResultCapSharingIpService,
    private readonly _agressoUserStaffService: AllianceUserStaffService,
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
    });
  }

  async createResult(createResult: CreateResultDto): Promise<Result> {
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
      .findOne({ where: { title, is_active: true } })
      .then((result) => {
        if (result) {
          throw new ConflictException(
            'The name of the result is already registered',
          );
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
          result_official_code: newOfficialCode,
          report_year_id: year,
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
        await this._resultCapSharingIpService.create(resultId, manager);
        break;
      case IndicatorsEnum.POLICY_CHANGE:
        await this._resultPolicyChangeService.create(resultId, manager);
        break;
      default:
        break;
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
    return result;
  }

  async updateGeneralInfo(
    result_id: number,
    generalInformation: UpdateGeneralInformation,
    returnData: TrueFalseEnum = TrueFalseEnum.FALSE,
  ) {
    return this.dataSource.transaction(async (manager) => {
      await manager.getRepository(this.mainRepo.target).update(result_id, {
        title: generalInformation.title,
        description: generalInformation.description,
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
      select: ['title', 'description', 'result_id', 'created_at', 'updated_at'],
      where: { result_id: resultId, is_active: true },
    });

    const keywords =
      await this._resultKeywordsService.findKeywordsByResultId(resultId);

    const mainContactPerson = await this._resultUsersService
      .findUsersByRoleResult(UserRolesEnum.MAIN_CONTACT, resultId)
      .then((data) => (data?.length > 0 ? data[0] : null));

    const generalInformation: UpdateGeneralInformation = {
      ...result,
      year: result.report_year_id,
      keywords: keywords.map((keyword) => keyword.keyword),
      main_contact_person: mainContactPerson,
    };

    return generalInformation;
  }

  async updateResultAlignment(
    resultId: number,
    alignmentData: ResultAlignmentDto,
    returnData: TrueFalseEnum = TrueFalseEnum.FALSE,
  ) {
    const { contracts, levers } = alignmentData;
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

      const primaryLevers =
        levers?.length == 1
          ? levers.map((el) => ({ ...el, is_primary: true }))
          : levers;

      await this._resultLeversService.create<LeverRolesEnum>(
        resultId,
        primaryLevers,
        'lever_id',
        LeverRolesEnum.ALIGNMENT,
        manager,
        ['is_primary'],
        {
          is_primary: false,
        },
      );

      await this._updateDataUtil.updateLastUpdatedDate(resultId, manager);
    });

    if (returnData === TrueFalseEnum.TRUE) {
      return this.findResultAlignment(resultId);
    }

    return undefined;
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

    const resultAlignment: ResultAlignmentDto = {
      contracts,
      levers,
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

    const { is_principal } =
      await this.mainRepo.metadataPrincipalInvestigator(result_id);

    if (!result) {
      throw new NotFoundException('Result not found');
    }

    return {
      indicator_id: result?.indicator?.indicator_id,
      indicator_name: result?.indicator?.name,
      result_id: result?.result_id,
      result_official_code: result?.result_id,
      status_id: result?.result_status_id,
      status_name: result?.result_status?.name,
      result_title: result?.title,
      created_by: result?.created_by,
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
    const processedResult = await this.createResultFromAiRoar(result);
    const newResult = await this.createResult(processedResult.result);
    await this.updateGeneralInfo(
      newResult.result_id,
      processedResult.generalInformation,
    );
    await this.saveGeoLocation(newResult.result_id, processedResult.geoScope);
    switch (newResult.indicator_id) {
      case IndicatorsEnum.CAPACITY_SHARING_FOR_DEVELOPMENT:
        await this._resultCapacitySharingService.update(
          newResult.result_id,
          processedResult.capSharing,
        );
        break;
      case IndicatorsEnum.POLICY_CHANGE:
        await this._resultPolicyChangeService.update(
          newResult.result_id,
          processedResult.policyChange,
        );
        break;
    }

    return newResult;
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

      tmpNewData.result = newResult;
    }

    {
      const tempGeneralInformation: UpdateGeneralInformation =
        new UpdateGeneralInformation();
      tempGeneralInformation.title = result.title;
      tempGeneralInformation.description = result.description;
      tempGeneralInformation.keywords = result.keywords;
      tempGeneralInformation.year = 2025;
      const userStaff: AllianceUserStaff =
        await this._agressoUserStaffService.findUserByFirstAndLastName(
          result?.alliance_main_contact_person_first_name,
          result?.alliance_main_contact_person_last_name,
        );
      if (userStaff)
        tempGeneralInformation.main_contact_person = {
          user_id: userStaff.carnet,
        } as ResultUser;

      tmpNewData.generalInformation = tempGeneralInformation;
    }

    {
      const tempGeoscope: SaveGeoLocationDto = new SaveGeoLocationDto();
      const geoscope: ClarisaGeoScope =
        await this._clarisaGeoScopeService.findByName(result.geoscope.level);
      tempGeoscope.geo_scope_id = geoscope?.code;

      const tempCountries: ResultCountry[] = [];
      if (result.geoscope?.sub_list?.length > 0) {
        const tempParseCountries: Partial<CountryAreas>[] =
          result.geoscope.sub_list.map((el) =>
            typeof el === 'string' ? { country_code: el } : el,
          );
        for (const country of tempParseCountries) {
          const tempCountry: ResultCountry = new ResultCountry();
          tempCountry.isoAlpha2 = country.country_code;
          const tempCountryAreas: string[] = country?.areas ?? [];
          const tempSubNational: ResultCountriesSubNational[] =
            await this._clarisaSubNationalsService
              .findByNames(tempCountryAreas)
              .then((response) =>
                response.map(
                  (el) =>
                    ({
                      sub_national_id: el.id,
                    }) as ResultCountriesSubNational,
                ),
              );
          tempCountry.result_countries_sub_nationals = tempSubNational;
          tempCountries.push(tempCountry);
        }
      }
      tempGeoscope.countries = tempCountries;

      tmpNewData.geoScope = tempGeoscope;
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
    return this.dataSource.transaction(async (manager) => {
      const geoScopeId: ClarisaGeoScopeEnum =
        this._clarisaGeoScopeService.transformGeoScope(
          saveGeoLocationDto.geo_scope_id,
          saveGeoLocationDto.countries,
        );
      await manager.getRepository(this.mainRepo.target).update(resultId, {
        geo_scope_id: geoScopeId,
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

      return this.findGeoLocation(resultId);
    });
  }

  async findGeoLocation(resultId: number): Promise<SaveGeoLocationDto> {
    const geoScopeId = await this.mainRepo
      .findOne({
        where: { result_id: resultId, is_active: true },
        select: ['geo_scope_id'],
      })
      .then((result) => result?.geo_scope_id);

    const cliGeoScope = this._clarisaGeoScopeService.transformGeoScope(
      geoScopeId,
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
