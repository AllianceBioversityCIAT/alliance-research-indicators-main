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

  async getKnowledgeProductsByYear(year: number) {
    if (isEmpty(year) || ![2025, 2026].includes(year)) {
      throw new BadRequestException('Only year 2025 and 2026 are supported');
    }
    const limit = 50;
    let offset = 0;
    let pendingData = true;
    const resultSaved: number[] = [];
    const syncProcessLog = await this.syncProcessLogService.initiateSync(
      SyncProcessEnum.TIP_INTEGRATION,
    );
    console.log('Bearer ' + this.token);
    while (pendingData) {
      const counters: CounterResults = new CounterResults();
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
      const mappedData = await this.processing(response.data, year);
      await this.saveResultService.bulkSaveAllSections(mappedData, {
        platformCode: ReportingPlatformEnum.TIP,
        resultSaved,
        counters,
        appliedVersion: false,
      });
      if (response.data_count < limit) {
        pendingData = false;
        await this.inactiveAllTipResults(resultSaved, year);
      } else {
        offset += limit;
      }
      await this.syncProcessLogService.update(syncProcessLog.id, counters);
    }
    await this.syncProcessLogService.endSync(syncProcessLog.id);
  }

  async processing(results: TipKnowledgeProductDto[], year: number) {
    const resultsMapped: ExternalMappersDto[] = [];
    for (const result of results) {
      const resultMapped: ExternalMappersDto = new ExternalMappersDto();
      resultMapped.official_code = result.id;

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

      resultMapped.generalInformation = {
        title: result.name,
        year: year,
        description: result.abstract,
        main_contact_person: !isEmpty(carnet)
          ? ({
              user_id: carnet,
            } as ResultUser)
          : null,
      };

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
        result_sdgs: [],
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
      resultMapped.created_at = result.created_at;

      resultMapped.knowledgeProduct = {
        type: result.type.join(', '),
        citation: result.citation,
        open_access: result.openAccess,
        publication_date: result.publication_date,
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
