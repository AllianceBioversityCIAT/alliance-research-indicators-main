import { BadRequestException, Injectable } from '@nestjs/common';
import { TipIprDataDto } from './dto/tip-ipr-data.dto';
import { ResultsService } from '../../entities/results/results.service';
import { AppConfig } from '../../shared/utils/app-config.util';
import { tipIntegrationMapper } from './mapper/tip-integration.mapper';
import { BaseApi } from '../core/base-api';
import { HttpService } from '@nestjs/axios';
import { isEmpty } from '../../shared/utils/object.utils';
import { firstValueFrom } from 'rxjs';
import {
  CounterResults,
  TipKnowledgeProductDto,
  TipKnowledgeProductsResponseDto,
  TipRegionDto,
} from './dto/response-year-tip.dto';
import { ClarisaRegionsService } from '../clarisa/entities/clarisa-regions/clarisa-regions.service';
import { IndicatorsEnum } from '../../entities/indicators/enum/indicators.enum';
import { ResultRepository } from '../../entities/results/repositories/result.repository';
import { AllianceUserStaff } from '../../entities/alliance-user-staff/entities/alliance-user-staff.entity';
import { ResultUser } from '../../entities/result-users/entities/result-user.entity';
import { ClarisaLeversService } from '../clarisa/entities/clarisa-levers/clarisa-levers.service';
import { ResultLever } from '../../entities/result-levers/entities/result-lever.entity';
import { ResultContract } from '../../entities/result-contracts/entities/result-contract.entity';
import { ClarisaCountriesService } from '../clarisa/entities/clarisa-countries/clarisa-countries.service';
import { ResultRegion } from '../../entities/result-regions/entities/result-region.entity';
import { ResultCountry } from '../../entities/result-countries/entities/result-country.entity';
import { ClarisaGeoScopeEnum } from '../clarisa/entities/clarisa-geo-scope/enum/clarisa-geo-scope.enum';
import { ClarisaRegion } from '../clarisa/entities/clarisa-regions/entities/clarisa-region.entity';
import { ClarisaCountry } from '../clarisa/entities/clarisa-countries/entities/clarisa-country.entity';
import { ResultEvidence } from '../../entities/result-evidences/entities/result-evidence.entity';
import { ResultKnowledgeProduct } from '../../entities/result-knowledge-product/entities/result-knowledge-product.entity';
import { DataSource, Like } from 'typeorm';
import { ReportingPlatformEnum } from '../../entities/results/enum/reporting-platform.enum';
import { QueryService } from '../../shared/utils/query.service';
import { ResultKnowledgeProductService } from '../../entities/result-knowledge-product/result-knowledge-product.service';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';

import { TipIntegrationRepository } from './repository/tip-integration.repository';
import { SyncProcessLogService } from '../../entities/sync-process-log/sync-process-log.service';
import { SyncProcessEnum } from '../../entities/sync-process-log/enum/sync-process.enum';
import { SaveResultService } from '../../shared/services/save-all-sections.service';
import { ExternalMappersDto } from '../../shared/global-dto/external-mappers.dto';
import { v4 as uuidv4 } from 'uuid';
import { SyncStagingRecordsEntity } from '../open-search/prms/entities/sync-staging-records.entity';
import { PrmsRepository } from '../open-search/prms/repositories/prms.repository';
import { TemportalDataResponse } from '../open-search/prms/dto/prms-response.dto';
import { ResultSdg } from '../../entities/result-sdgs/entities/result-sdg.entity';
import { ClarisaSdgsService } from '../clarisa/entities/clarisa-sdgs/clarisa-sdgs.service';

@Injectable()
export class TipIntegrationService extends BaseApi {
  constructor(
    private readonly appConfig: AppConfig,
    private readonly resultsService: ResultsService,
    private readonly resultRepository: ResultRepository,
    private readonly clarisaLeversService: ClarisaLeversService,
    private readonly clarisaRegionsService: ClarisaRegionsService,
    private readonly clarisaCountriesService: ClarisaCountriesService,
    private readonly _queryService: QueryService,
    httpService: HttpService,
    private readonly dataSource: DataSource,
    private readonly resultKnowledgeProductService: ResultKnowledgeProductService,
    private readonly _currentUser: CurrentUserUtil,
    private readonly tipIntegrationRepository: TipIntegrationRepository,
    private readonly syncProcessLogService: SyncProcessLogService,
    private readonly saveResultService: SaveResultService,
    private readonly prmsRepository: PrmsRepository,
    private readonly clarisaSdgsService: ClarisaSdgsService,
  ) {
    super(
      httpService,
      appConfig.TIP_API_URL,
      TipIntegrationService.name,
      undefined,
      undefined,
      appConfig.TIP_TOKEN,
    );
  }

  async getAllIprData(options?: {
    year?: number;
    productType?: number;
  }): Promise<TipIprDataDto[]> {
    const results = await this.resultsService.findResultTIPData({
      year: options?.year,
      productType: options?.productType,
    });

    return results.map((result) =>
      tipIntegrationMapper(result, this.appConfig),
    );
  }

  async inactiveAllTipResults(
    resultCodes: number[],
    year?: number,
  ): Promise<void> {
    const tipResultIds = await this.tipIntegrationRepository.allTipResultId(
      resultCodes,
      year,
    );
    for (const resultId of tipResultIds) {
      await this.tipIntegrationRepository.inactiveAllTipResults(resultId);
    }
  }

  private async saveTemporalData(year: number, executionCode: string) {
    let pendingData = true;
    let offset = 0;
    const limit = 50;
    while (pendingData) {
      const response = await firstValueFrom(
        this.getRequest<TipKnowledgeProductsResponseDto>(
          `/publications/year/${year}?limit=${limit}&offset=${offset}`,
          {
            headers: {
              Authorization: 'Bearer ' + this.token,
            },
          },
        ),
      )
        .then(({ data }) => data)
        .catch((error) => {
          this.logger.error(
            `Error fetching knowledge products from TIP: ${error.message}`,
          );
          throw new BadRequestException(
            'Error fetching knowledge products from TIP',
          );
        });

      response.data.forEach(async (item, index) => {
        await this.dataSource
          .getRepository(SyncStagingRecordsEntity)
          .save({
            execution_code: executionCode,
            code: offset + index,
            year,
            data: item,
          })
          .catch((error) => {
            this.logger.error(
              `Error saving temporal result ${item.name}: ${error.message} \n ${error.stack}`,
            );
          });
      });

      if (response.data_count < limit) {
        pendingData = false;
      } else {
        offset += limit;
      }
    }
  }

  async getKnowledgeProductsByYear(year?: number) {
    const executionCode = uuidv4();
    const counters: CounterResults = new CounterResults();
    const resultSaved: number[] = [];
    const syncProcessLog = await this.syncProcessLogService.initiateSync(
      SyncProcessEnum.TIP_INTEGRATION,
    );
    const endYeard = year ?? new Date().getFullYear();
    let currentYear = year ?? 2021;
    for (currentYear; currentYear <= endYeard; currentYear++) {
      await this.saveTemporalData(currentYear, executionCode);
    }

    const tipResults =
      await this.prmsRepository.findTemporalResults<TipKnowledgeProductDto>(
        executionCode,
      );
    const dataProcessed = await this.processing(tipResults, year);
    await this.saveResultService.bulkSaveAllSections(dataProcessed, {
      platformCode: ReportingPlatformEnum.TIP,
      resultSaved,
      counters,
      appliedVersion: true,
    });
    await this.syncProcessLogService.update(syncProcessLog.id, counters);
    await this.syncProcessLogService.endSync(syncProcessLog.id);
  }

  async processing(
    results: TemportalDataResponse<TipKnowledgeProductDto>[],
    year: number,
  ) {
    const resultsMapped: ExternalMappersDto[] = [];
    for (const data of results) {
      const result = data.data;
      const resultMapped: ExternalMappersDto = new ExternalMappersDto();
      // TIP API no longer returns id — blocked until TIP restores the field
      resultMapped.official_code = undefined as unknown as number;

      let projectId: string = null;
      if (Array.isArray(result.project)) {
        projectId =
          result.project.length > 0 ? result.project[0].agreement_id : null;
      } else {
        projectId = result.project ? result.project.agreement_id : null;
      }

      resultMapped.createResult = {
        title: result.name,
        year: year,
        description: result.abstract,
        indicator_id: IndicatorsEnum.KNOWLEDGE_PRODUCT,
        contract_id: projectId,
      };
      let allianceUserStaff: AllianceUserStaff = null;
      if (!isEmpty(result?.submitter)) {
        const existsUser = await this.resultRepository.findUserByEmailOrCarnet(
          result.submitter?.idCard,
          result.submitter?.email,
        );

        const dataToSearch =
          result.submitter?.idCard ?? result.submitter?.email;
        if (!isEmpty(dataToSearch)) {
          allianceUserStaff = await this.dataSource
            .getRepository(AllianceUserStaff)
            .findOne({
              where: [
                {
                  carnet: dataToSearch,
                },
                {
                  email: Like(`%${dataToSearch?.trim()?.toLowerCase()}%`),
                },
              ],
            });
        }

        if (!isEmpty(allianceUserStaff)) {
          if (isEmpty(existsUser) && !isEmpty(allianceUserStaff)) {
            resultMapped.userData =
              await this.resultsService.createUserProcess(allianceUserStaff);
          } else {
            await this.resultRepository.unpdateCarnetUser(
              existsUser?.sec_user_id,
              existsUser?.carnet,
            );
            resultMapped.userData = existsUser;
            if (!isEmpty(existsUser)) {
              resultMapped.userData.carnet = result.submitter?.idCard;
            }
          }
        }
      }

      let carnet = null;
      if (!isEmpty(allianceUserStaff)) {
        carnet = resultMapped?.userData?.carnet ?? result?.submitter?.idCard;
      } else {
        this.logger.warn(
          `User ${result?.submitter?.idCard} not found in Alliance User Staff`,
        );
      }

      const keywords = result.keywords?.map((keyword) => keyword?.trim());

      resultMapped.generalInformation = {
        title: result.name,
        year: year,
        description: result.abstract,
        main_contact_person: !isEmpty(carnet)
          ? ({
              user_id: carnet,
            } as ResultUser)
          : null,
        keywords: keywords,
      };

      const saveSdgs = await this.clarisaSdgsService.findSdgByTipFormat(
        result.sdgs,
      );
      const sdgs: Partial<ResultSdg>[] = saveSdgs.map((sdg) => ({
        clarisa_sdg_id: sdg.id,
      }));

      const primaryLever = await this.mapLevers(result.levers);
      resultMapped.alignments = {
        primary_levers: primaryLever.map<ResultLever>(
          (lever) =>
            ({
              lever_id: lever.id,
            }) as unknown as ResultLever,
        ),
        contracts: [
          {
            contract_id: projectId,
            is_primary: true,
          },
        ] as ResultContract[],
        contributor_levers: [],
        result_sdgs: sdgs as ResultSdg[],
      };

      const regions = await this.mapRegions(result.region);
      const countries = await this.mapCountries(result.countries);

      resultMapped.geoScope = {
        regions: regions.map(
          (region) => ({ region_id: region.um49Code }) as ResultRegion,
        ),
        countries: countries.map(
          (country) =>
            ({
              country_id: country.isoAlpha2,
            }) as unknown as ResultCountry,
        ),
        geo_scope_id: this.setGeoScopeId(regions, countries),
        comment_geo_scope: null,
      };

      resultMapped.evidence = {
        evidence: [
          {
            evidence_url: result.link,
            evidence_description: 'Handled',
          },
          {
            evidence_url: result.doi,
            evidence_description: 'DOI',
          },
        ] as unknown as ResultEvidence[],
        notable_references: [],
      };

      resultMapped.public_link = result.link;
      resultMapped.created_at = new Date(result.created_at);

      const collection = result.collection?.join('; ');
      resultMapped.knowledgeProduct = {
        type: result.type.join(', '),
        citation: result.citation,
        open_access: result.access_status === 'Open Access',
        access_status: result.access_status,
        publication_date: result.publication_date,
        collection,
      } as ResultKnowledgeProduct;

      resultsMapped.push(resultMapped);
    }
    return resultsMapped;
  }

  private setGeoScopeId(regions: ClarisaRegion[], countries: ClarisaCountry[]) {
    if (!isEmpty(regions) && isEmpty(countries))
      return ClarisaGeoScopeEnum.REGIONAL;
    if (isEmpty(regions) && !isEmpty(countries)) {
      if (countries.length === 1) {
        return ClarisaGeoScopeEnum.NATIONAL;
      }
      return ClarisaGeoScopeEnum.MULTI_NATIONAL;
    }
    return ClarisaGeoScopeEnum.GLOBAL;
  }

  async mapRegions(regions: TipRegionDto[]) {
    const um49Codes = regions.map((region) => region.un_code);
    return this.clarisaRegionsService.findByUm49Codes(um49Codes);
  }

  async mapCountries(countries: TipRegionDto[]) {
    const um49Codes = countries.map((country) => country.un_code);
    return this.clarisaCountriesService.findByUm49Codes(um49Codes);
  }

  async mapLevers(levers: string[]) {
    const clarisaLevers = [];
    for (const lever of levers) {
      const match = lever.match(/Lever(\d+)/);
      if (match) {
        clarisaLevers.push(`Lever ${match[1]}`);
      }
    }
    return this.clarisaLeversService.findByNames(clarisaLevers);
  }
}
