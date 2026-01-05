import { Injectable } from '@nestjs/common';
import { BaseExternalOpenSearchApi } from '../core/external-base-open-search-api';
import {
  PrmsKnowledgeProductDto,
  PrmsResponseDto,
} from './dto/prms-response.dto';
import { HttpService } from '@nestjs/axios';
import { AppConfig } from '../../../shared/utils/app-config.util';
import {
  ExternalMappersDto,
  ExternalMappersInterface,
} from '../../../shared/global-dto/external-mappers.dto';
import { IndicatorHomologation } from './homologation/indicator.homologation';
import { SecUser } from '../../../complementary-entities/secondary/user/dto/sec-user.dto';
import { AllianceUserStaff } from '../../../entities/alliance-user-staff/entities/alliance-user-staff.entity';
import { ResultRepository } from '../../../entities/results/repositories/result.repository';
import { isEmpty } from '../../../shared/utils/object.utils';
import { DataSource } from 'typeorm';
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

@Injectable()
export class PrmsOpenSearchService
  extends BaseExternalOpenSearchApi<PrmsResponseDto>
  implements ExternalMappersInterface<ExternalMappersDto>
{
  constructor(
    httpService: HttpService,
    private readonly appConfig: AppConfig,
    private readonly resultRepository: ResultRepository,
    private readonly dataSource: DataSource,
    private readonly resultsService: ResultsService,
    private readonly _queryService: QueryService,
    private readonly resultKnowledgeProductService: ResultKnowledgeProductService,
    private readonly _currentUser: CurrentUserUtil,
  ) {
    super(
      httpService,
      appConfig,
      appConfig.OPEN_SEARCH_PRMS_HOST,
      appConfig.OPEN_SEARCH_PRMS_USER,
      appConfig.OPEN_SEARCH_PRMS_PASS,
      'result_id',
      ['prms-results*'],
    );
  }

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

  async getData() {
    const size = 50;
    let from = 0;
    let keepGoing = true;
    while (keepGoing) {
      const response = await this.search(undefined, {}, size, from);
      const dataProcessed = await this.processData(response.data);
      this.mapToExternalCreateResultDto(dataProcessed);
      if (response.currentSize < size) {
        keepGoing = false;
      }
      from += size;
    }
  }

  private createUserProcess(user: AllianceUserStaff): Promise<SecUser> {
    const newUser: SecUser = new SecUser();
    newUser.first_name = user.first_name;
    newUser.last_name = user.last_name;
    newUser.email = user.email;
    newUser.carnet = user.carnet;
    return this.resultRepository.createUserInSecUsers(newUser);
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

  async processData(data: PrmsResponseDto[]): Promise<ExternalMappersDto[]> {
    const results: ExternalMappersDto[] = [];
    for (const item of data) {
      const indicator = IndicatorHomologation[item.result_type_id];
      if (!indicator) {
        continue;
      }
      const result = new ExternalMappersDto();
      result.official_code = item.result_code;
      result.external_link = '';
      result.created_at = item.created_date;

      if (!isEmpty(item?.obj_created)) {
        const existsUser = await this.resultRepository.findUserByEmailOrCarnet(
          null,
          item.obj_created?.email,
        );

        const allianceUserStaff = await this.dataSource
          .getRepository(AllianceUserStaff)
          .findOne({
            where: {
              email: item.obj_created?.email,
            },
          });
        if (isEmpty(existsUser) && !isEmpty(allianceUserStaff)) {
          result.userData = await this.createUserProcess(allianceUserStaff);
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
      this.processKnowledgeProduct(
        item?.result_knowledge_product_array,
        result,
      );

      result.createResult = {
        year: item.reported_year_id,
        indicator_id: indicator,
        title: item.title,
        description: item.description,
        contract_id: null,
      };

      result.generalInformation = {
        title: item.title,
        description: item.description,
        keywords: [],
        main_contact_person: null,
        main_contact_person_ai: null,
        year: item.reported_year_id,
      };

      results.push(result);
    }
    return results ?? [];
  }
}
