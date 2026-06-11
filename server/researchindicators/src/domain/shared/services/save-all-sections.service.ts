import { BadRequestException, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ExternalMappersDto } from '../global-dto/external-mappers.dto';
import {
  CounterResults,
  CounterResultsEnum,
} from '../../tools/tip-integration/dto/response-year-tip.dto';
import { CgiarLogger } from '../utils/cgiar-logs/logs.util';
import { CurrentUserUtil } from '../utils/current-user.util';
import { Result } from '../../entities/results/entities/result.entity';
import { QueryService } from '../utils/query.service';
import { ReportingPlatformEnum } from '../../entities/results/enum/reporting-platform.enum';
import { ResultsService } from '../../entities/results/results.service';
import { ResultStatusEnum } from '../../entities/result-status/enum/result-status.enum';
import { TrueFalseEnum } from '../enum/queries.enum';
import {
  filterByUniqueKeyWithPriority,
  mergeArraysWithPriority,
} from '../utils/array.util';
import { ResultLever } from '../../entities/result-levers/entities/result-lever.entity';
import { ResultKnowledgeProductService } from '../../entities/result-knowledge-product/result-knowledge-product.service';

@Injectable()
export class SaveResultService {
  private readonly logger = new CgiarLogger(SaveResultService.name);
  constructor(
    private readonly dataSource: DataSource,
    private readonly _currentUser: CurrentUserUtil,
    private readonly _queryService: QueryService,
    private readonly _resultsService: ResultsService,
    private readonly _resultKnowledgeProductService: ResultKnowledgeProductService,
  ) {}

  public async bulkSaveAllSections(
    results: ExternalMappersDto[],
    extraData?: ExtraData,
  ) {
    for (const result of results) {
      await this.saveAllSections(result, extraData);
    }
  }

  public async saveAllSections(
    result: ExternalMappersDto,
    extraData?: ExtraData,
  ) {
    let typeCounter: CounterResultsEnum = null;
    let isNewCode = false;
    if (
      extraData?.appliedVersion &&
      extraData?.currentCode?.current !== result.official_code
    ) {
      extraData.currentCode.current = result.official_code;
      isNewCode = true;
    }

    this.logger.debug(
      `Processing result ${result.official_code} from ${this.platformCode(extraData?.platformCode)}.`,
    );
    this._currentUser.setSystemUser(result.userData, true);
    extraData.resultSaved?.push(result.official_code);
    let createNewResult: Result = null;
    try {
      let findResult = await this.dataSource.getRepository(Result).findOne({
        where: {
          result_official_code: result.official_code,
          platform_code: extraData?.platformCode,
          report_year_id: result.createResult.year,
        },
      });

      const snapshotMessage =
        (!isNewCode && extraData?.appliedVersion
          ? 'is a snapshot'
          : 'is a live version') +
        ' from year ' +
        result.createResult.year;

      if (!findResult) {
        createNewResult = await this._resultsService.createResult(
          result.createResult,
          ReportingPlatformEnum.PRMS,
          {
            notContract: true,
            result_status_id:
              extraData?.statusMapper?.[result.status_id] ?? result.status_id,
            validateTitle: false,
            isSnapshot: extraData?.appliedVersion ? !isNewCode : false,
          },
          result.official_code,
        );
        findResult = createNewResult;
        this.logger.debug(
          `Creating new result ${findResult.result_official_code} from ${this.platformCode(extraData?.platformCode)}, ${snapshotMessage}`,
        );
        typeCounter = CounterResultsEnum.CREATED;
      } else {
        await this._resultsService.updateInactiveResult(
          findResult.result_id,
          !isNewCode,
        );
        this.logger.debug(
          `Updating result ${findResult.result_official_code} from ${this.platformCode(extraData?.platformCode)}, ${snapshotMessage}`,
        );
        typeCounter = CounterResultsEnum.UPDATED;
      }

      await this.dataSource.getRepository(Result).update(findResult.result_id, {
        external_link: result?.external_link,
        public_link: result?.public_link,
        created_at: result.created_at,
      });

      await this._resultsService.updateGeneralInfo(
        findResult.result_id,
        result.generalInformation,
        TrueFalseEnum.FALSE,
        false,
        false,
      );
      const tempAlignment = await this._resultsService.findResultAlignment(
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

      await this._resultsService.updateResultAlignment(
        findResult.result_id,
        result.alignments,
      );

      await this._resultsService.saveGeoLocation(
        findResult.result_id,
        result?.geoScope,
      );

      await this._resultKnowledgeProductService.update(
        findResult.result_id,
        result.knowledgeProduct,
      );

      this.logger.log(
        `Processed result ${findResult.result_official_code} from ${this.platformCode(extraData?.platformCode)}.`,
      );
      this.logger.log(
        `Successfully processed result ${findResult.result_official_code} from ${this.platformCode(extraData?.platformCode)}.`,
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
      this.logger.error(
        `Error processing ${this.platformCode(extraData?.platformCode)} result: ${error.message}`,
      );
      typeCounter = CounterResultsEnum.ERROR;
    }
    extraData.counters[typeCounter]++;
    this._currentUser.clearSystemUser();
    this.logger.debug(
      `Finished processing result ${result.official_code} from ${this.platformCode(extraData?.platformCode)}.`,
    );
  }

  private platformCode(platformCode?: ReportingPlatformEnum) {
    if (!platformCode)
      throw new BadRequestException('Platform code is required');
    const platform = ReportingPlatformEnum?.[platformCode];
    if (!platform) throw new BadRequestException('Invalid platform code');
    return platform;
  }
}

export type ExtraData = {
  resultSaved?: number[];
  currentCode?: { current: number };
  appliedVersion?: boolean;
  counters?: CounterResults;
  platformCode?: ReportingPlatformEnum;
  statusMapper?: Record<number, ResultStatusEnum>;
};
