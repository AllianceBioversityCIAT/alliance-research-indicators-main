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
  ResultsTipMapping,
  TipKnowledgeProductDto,
  TipKnowledgeProductsResponseDto,
  TipRegionDto,
} from './dto/response-year-tip.dto';
import { ClarisaRegionsService } from '../clarisa/entities/clarisa-regions/clarisa-regions.service';
import { IndicatorsEnum } from '../../entities/indicators/enum/indicators.enum';
import { ResultRepository } from '../../entities/results/repositories/result.repository';
import { SecUser } from '../../complementary-entities/secondary/user/dto/sec-user.dto';
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
import { DataSource } from 'typeorm';
import { Result } from '../../entities/results/entities/result.entity';
import { ReportingPlatformEnum } from '../../entities/results/enum/reporting-platform.enum';
import { ResultStatusEnum } from '../../entities/result-status/enum/result-status.enum';
import { QueryService } from '../../shared/utils/query.service';
import { ResultKnowledgeProductService } from '../../entities/result-knowledge-product/result-knowledge-product.service';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';
import {
  filterByUniqueKeyWithPriority,
  mergeArraysWithPriority,
} from '../../shared/utils/array.util';

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

  async getKnowledgeProductsByYear(year: number) {
    if (isEmpty(year) || year != 2025) {
      throw new BadRequestException('Only year 2025 is supported');
    }
    const limit = 50;
    let offset = 0;
    let pendingData = true;
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
      const mappedData = await this.processing(response.data, year);
      await this.createKpInStar(mappedData);
      if (response.data_count < limit) {
        pendingData = false;
      } else {
        offset += limit;
      }
    }
  }

  async processing(results: TipKnowledgeProductDto[], year: number) {
    const resultsMapped: ResultsTipMapping[] = [];
    for (const result of results) {
      const resultMapped: ResultsTipMapping = new ResultsTipMapping();
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

      if (!isEmpty(result?.submitter)) {
        const existsUser = await this.resultRepository.findUserByEmailOrCarnet(
          result.submitter?.idCard,
          result.submitter?.email,
        );

        const allianceUserStaff = await this.dataSource
          .getRepository(AllianceUserStaff)
          .findOne({
            where: {
              carnet: result.submitter?.idCard,
            },
          });
        if (isEmpty(existsUser) && !isEmpty(allianceUserStaff)) {
          resultMapped.userData =
            await this.createUserProcess(allianceUserStaff);
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

      resultMapped.generalInformation = {
        title: result.name,
        year: year,
        description: result.abstract,
        main_contact_person: {
          user_id: resultMapped.userData?.carnet,
        } as ResultUser,
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

      resultMapped.external_link = result.link;
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

  private createUserProcess(user: AllianceUserStaff): Promise<SecUser> {
    const newUser: SecUser = new SecUser();
    newUser.first_name = user.first_name;
    newUser.last_name = user.last_name;
    newUser.email = user.email;
    newUser.carnet = user.carnet;
    return this.resultRepository.createUserInSecUsers(newUser);
  }

  async createKpInStar(results: ResultsTipMapping[]) {
    for (const result of results) {
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
            ReportingPlatformEnum.TIP,
            { notContract: true, result_status_id: ResultStatusEnum.APPROVED },
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
        if (createNewResult) {
          this.logger.error(
            `Error processing result ${createNewResult.result_id}, rolling back. Error: ${error.message}`,
          );
          await this._queryService.deleteFullResultById(
            createNewResult.result_id,
          );
        }
        this.logger.error(`Error processing tip result: ${error.message}`);
      }
      this._currentUser.clearSystemUser();
      this.logger.debug(
        `Finished processing result ${result.official_code} from TIP.`,
      );
    }
  }
}
