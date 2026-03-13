import { Injectable } from '@nestjs/common';
import {
  PrmsKnowledgeProductDto,
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
import {
  CounterResults,
  CounterResultsEnum,
} from '../../tip-integration/dto/response-year-tip.dto';
import { SyncProcessLogService } from '../../../entities/sync-process-log/sync-process-log.service';
import { SyncProcessEnum } from '../../../entities/sync-process-log/enum/sync-process.enum';

@Injectable()
export class PrmsOpenSearchService
  implements ExternalMappersInterface<ExternalMappersDto> {
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
  ) { }

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

  //TODO: Review this function to check if it is working correctly and complete the process
  async getData(year: number) {
    const size = 50;
    let page = 1;
    let keepGoing = true;
    const resultSaved: number[] = [];
    const syncProcessLog = await this.syncProcessLogService.initiateSync(
      SyncProcessEnum.PRMS_INTEGRATION,
    );
    while (keepGoing) {
      const counters: CounterResults = new CounterResults();
      const centerAcronym = ['ABC', 'ABC RH'];
      const prmsUrl = `${this.appConfig.SEARCH_PRMS_URL}/result?size=${size}&page=${page}&centerAcronym=${encodeURIComponent(centerAcronym.join(','))}&year=${year}`;
      const response = await firstValueFrom(
        this.httpService.get<SearcherResponseDto>(prmsUrl),
      ).then((response) => response.data);
      const dataProcessed = await this.processData(response.data);
      await this.createResultInStar(dataProcessed, resultSaved, counters);
      if (response.totalPages <= page) {
        keepGoing = false;
      }

      page++;
      await this.syncProcessLogService.update(syncProcessLog.id, counters);
    }
    await this.syncProcessLogService.endSync(syncProcessLog.id);
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
    tempEvidence.push(...(evidence as ResultEvidence[]));

    body.evidence = {
      ...body.evidence,
      evidence: tempEvidence as ResultEvidence[],
    };
  }

  async processData(
    data: ResultResponseMapper[],
  ): Promise<ExternalMappersDto[]> {
    const results: ExternalMappersDto[] = [];
    for (const item of data) {
      const indicator = IndicatorHomologation[item.indicator_category.code];
      if (!indicator) {
        this.logger.warn(`Skipping result ${item.result_code} because indicator ${item.indicator_category.code} is not homologated.`);
        continue;
      }
      const result = new ExternalMappersDto();
      result.official_code = parseInt(item.result_code);
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

        const allianceUserStaff = await this.dataSource
          .getRepository(AllianceUserStaff)
          .findOne({
            where: {
              email: Like(`%${item.created_by?.email?.trim()?.toLowerCase()}%`),
            },
          });
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
            lever_id: clarisaLever?.id,
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

      results.push(result);
    }
    return results ?? [];
  }

  async createResultInStar(
    results: ExternalMappersDto[],
    resultSaved: number[],
    counters: CounterResults = {
      createdRecords: 0,
      updatedRecords: 0,
      errorRecords: 0,
    },
  ) {
    let typeCounter: CounterResultsEnum = null;

    for (const result of results) {
      this.logger.debug(`Processing result ${result.official_code} from PRMS.`);
      this._currentUser.setSystemUser(result.userData, true);
      resultSaved.push(result.official_code);
      let createNewResult: Result = null;
      try {
        let findResult = await this.dataSource.getRepository(Result).findOne({
          where: {
            result_official_code: result.official_code,
            platform_code: ReportingPlatformEnum.PRMS,
            report_year_id: result.createResult.year,
          },
        });
        if (!findResult) {
          createNewResult = await this.resultsService.createResult(
            result.createResult,
            ReportingPlatformEnum.PRMS,
            {
              notContract: true,
              result_status_id: result.status_id,
              validateTitle: false,
            },
            result.official_code,
          );
          findResult = createNewResult;
          this.logger.debug(
            `Creating new result ${findResult.result_official_code} from PRMS.`,
          );
          typeCounter = CounterResultsEnum.CREATED;
        } else {
          await this.resultKnowledgeProductService.activeKpByResultId(
            findResult.result_id,
          );
          this.logger.debug(
            `Updating result ${findResult.result_official_code} from PRMS.`,
          );
          typeCounter = CounterResultsEnum.UPDATED;
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

        await this.resultsService.updateResultAlignment(
          findResult.result_id,
          result.alignments,
        );
        this.logger.log(
          `Processed result ${findResult.result_official_code} from PRMS.`,
        );
        this.logger.log(
          `Successfully processed result ${findResult.result_official_code} from PRMS.`,
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
        typeCounter = CounterResultsEnum.ERROR;
      }
      counters[typeCounter]++;
      this._currentUser.clearSystemUser();
      this.logger.debug(
        `Finished processing result ${result.official_code} from PRMS.`,
      );
    }
  }
}
