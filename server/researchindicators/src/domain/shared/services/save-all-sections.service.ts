import { BadRequestException, Injectable } from '@nestjs/common';
import { DataSource, FindOptionsWhere } from 'typeorm';
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
import { isEmpty } from '../utils/object.utils';

@Injectable()
export class SaveResultService {
  private readonly logger = new CgiarLogger(SaveResultService.name);
  constructor(
    private readonly dataSource: DataSource,
    private readonly _currentUser: CurrentUserUtil,
    private readonly _queryService: QueryService,
    private readonly _resultsService: ResultsService,
    private readonly _resultKnowledgeProductService: ResultKnowledgeProductService,
  ) { }

  public async bulkSaveAllSections(
    results: ExternalMappersDto[],
    extraData?: ExtraData<ExternalMappersDto>,
  ) {
    for (const result of results) {
      await this.saveAllSections(result, extraData);
    }
  }

  public async saveAllSections(
    result: ExternalMappersDto,
    extraData?: ExtraData<ExternalMappersDto>,
  ) {
    let typeCounter: CounterResultsEnum = null;
    this.logger.debug(
      `Processing result ${result.official_code} from ${this.platformCode(extraData?.platformCode)}.`,
    );
    this._currentUser.setSystemUser(result.userData, true);
    extraData.resultSaved?.push(result.official_code);
    let createNewResult: Result = null;
    try {
      const isAppliedVersion = result?.is_version_applied ?? false;
      const findOptions: FindOptionsWhere<Result> = {
        result_official_code: result.official_code,
        platform_code: extraData?.platformCode,
        report_year_id: result.createResult.year,
      };

      if (!isEmpty(extraData?.findOptions)) {
        delete findOptions.result_official_code;

        for (const key in extraData?.findOptions) {
          findOptions[key] = result[extraData?.findOptions[key]];
        }
      }

      let findResult = await this.dataSource.getRepository(Result).findOne({
        where: findOptions,
      });

      const snapshotMessage =
        (isAppliedVersion ? 'is a snapshot' : 'is a live version') +
        ' from year ' +
        result.createResult.year;

      if (!findResult) {
        let officialCode: number;
        if (extraData?.manageOfficialCode) {
          officialCode = await this._resultsService.newOfficialCode(
            extraData?.platformCode,
          );
        } else {
          officialCode = result.official_code;
        }

        createNewResult = await this._resultsService.createResult(
          result.createResult,
          extraData?.platformCode,
          {
            notContract: true,
            result_status_id:
              extraData?.statusMapper?.[result.status_id] ?? result.status_id,
            validateTitle: false,
            isSnapshot: isAppliedVersion,
          },
          officialCode,
        );
        findResult = createNewResult;
        this.logger.debug(
          `Creating new result ${findResult.result_official_code} from ${this.platformCode(extraData?.platformCode)}, ${snapshotMessage}`,
        );
        typeCounter = CounterResultsEnum.CREATED;
      } else {
        await this._resultsService.updateInactiveResult(
          findResult.result_id,
          isAppliedVersion,
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

export type ExtraData<T extends object> = {
  resultSaved?: number[];
  currentCode?: { current: number };
  appliedVersion?: boolean;
  counters?: CounterResults;
  platformCode?: ReportingPlatformEnum;
  statusMapper?: Record<number, ResultStatusEnum>;
  findOptions?: FindOptionsKeyMap<T>;
  manageOfficialCode?: boolean;
};

export type FindOptionsKeyMap<
  T extends object,
  ExcludedKeys extends keyof FindOptionsWhere<Result> =
  | 'platform_code'
  | 'report_year_id',
> = {
    [K in Exclude<keyof FindOptionsWhere<Result>, ExcludedKeys>]?: keyof T;
  };
