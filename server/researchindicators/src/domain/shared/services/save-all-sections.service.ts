import { BadRequestException, Injectable } from '@nestjs/common';
import { DataSource, FindOptionsWhere, In } from 'typeorm';
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
import { IndicatorsEnum } from '../../entities/indicators/enum/indicators.enum';
import { LinkResult } from '../../entities/link-results/entities/link-result.entity';
import {
  DUPLICATE_RESULT_PLATFORMS,
  DuplicateResultValidationResult,
  evaluateDuplicateResults,
  normalizePublicLink,
} from '../utils/duplicate-result-priority.util';
import { isEmpty } from '../utils/object.utils';

/**
 * Persists externally-synced result sections (PRMS, TIP) into the `results` table.
 *
 * Before creating or updating a row, {@link duplicateResultValidation} enforces
 * cross-platform public-link deduplication between PRMS, TIP, and migrated AICCRA
 * data. See `duplicate-result-priority.util.ts` for the full rule set.
 */
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
    let createNewResult: Result = null;
    try {
      const isAppliedVersion = result?.is_version_applied ?? false;
      const findOptions: FindOptionsWhere<Result> = {
        result_official_code: result.official_code,
        platform_code: extraData?.platformCode,
        report_year_id: result.createResult.year,
      };

      const statusId =
        extraData?.statusMapper?.[result.status_id] ??
        result?.status_id ??
        ResultStatusEnum.DRAFT;

      if (!isEmpty(extraData?.findOptions)) {
        delete findOptions.result_official_code;

        for (const key in extraData?.findOptions) {
          findOptions[key] = result[extraData?.findOptions[key]];
        }
      }

      let findResult = await this.dataSource.getRepository(Result).findOne({
        where: findOptions,
      });

      // Cross-platform duplicate check (Rules 1–4).
      // Matching is done exclusively on `public_link` (official publication URL).
      // `external_link` is platform-specific (TIP/AICCRA/PRMS portal) and must
      // never be used for deduplication.
      const duplicateValidation = await this.duplicateResultValidation({
        platformCode: extraData.platformCode,
        publicLink: result.public_link,
        indicatorId: result.createResult.indicator_id,
        reportYearId: result.createResult.year,
        // When updating an existing row, exclude it from the duplicate set.
        excludeResultId: findResult?.result_id,
      });

      // Rule 1 & 2: skip creation/update when a higher-priority duplicate exists.
      if (duplicateValidation.shouldOmit) {
        this.logger.debug(
          `Skipping result ${result.official_code} from ${this.platformCode(extraData.platformCode)} because a higher-priority duplicate exists for public link.`,
        );
        this._currentUser.clearSystemUser();
        return;
      }

      extraData.resultSaved?.push(result.official_code);

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
            result_status_id: statusId,
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

      await this._resultsService.updateResultStatus(
        findResult.result_id,
        statusId,
      );

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

      // After a successful save, remove lower-priority duplicates (Rule 1 & 2).
      // Rows protected by link_results (Rule 4) are logged but not deleted.
      await this.deleteDuplicateResults(duplicateValidation);
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
      this.logger.error(
        `Error processing ${this.platformCode(extraData?.platformCode)} result: ${errorMessage}`,
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

  /**
   * Determines whether an incoming sync row should be omitted and which stored
   * duplicates may be deleted, based on cross-platform public-link rules.
   *
   * All platforms (PRMS, TIP, AICCRA) live in the same `results` table and are
   * differentiated by `platform_code`. Duplicates are detected by matching
   * `public_link` (official publication URL) within the same `report_year_id`.
   *
   * `external_link` is intentionally excluded: it points to the source platform
   * portal (TIP, AICCRA, or PRMS) and would never produce reliable cross-platform
   * matches.
   *
   * Linked business rules — see `duplicate-result-priority.util.ts`:
   *  - Rule 1: TIP prevails over PRMS and AICCRA.
   *  - Rule 2: AICCRA prevails over PRMS (when TIP is not involved).
   *  - Rule 3: AICCRA Capacity Sharing prevails over any PRMS/TIP result.
   *  - Rule 4: duplicates referenced in `link_results.other_result_id` are protected.
   *
   * @returns
   *  - `shouldOmit`              → do not create or update the incoming result.
   *  - `resultsToDelete`         → `result_id` values safe to remove after sync.
   *  - `protectedFromDeletion`   → duplicates that lost but cannot be deleted (Rule 4).
   */
  async duplicateResultValidation(params: {
    platformCode: ReportingPlatformEnum;
    publicLink?: string | null;
    indicatorId: IndicatorsEnum;
    reportYearId: number;
    excludeResultId?: number;
  }): Promise<DuplicateResultValidationResult> {
    const normalizedLink = normalizePublicLink(params.publicLink);

    // No public link means there is nothing to deduplicate against.
    if (!normalizedLink) {
      return {
        shouldOmit: false,
        resultsToDelete: [],
        protectedFromDeletion: [],
      };
    }

    const resultRepository = this.dataSource.getRepository(Result);
    const where = {
      report_year_id: params.reportYearId,
      platform_code: In([...DUPLICATE_RESULT_PLATFORMS]),
    };

    // Match only on `public_link` — the single official publication identifier.
    const candidates = await resultRepository.find({
      where: {
        ...where,
        public_link: normalizedLink,
      },
      select: {
        result_id: true,
        platform_code: true,
        indicator_id: true,
      },
    });

    // Only cross-platform conflicts matter; same-platform rows are handled by
    // the official-code lookup above, not by public-link deduplication.
    const duplicates = candidates
      .filter((candidate) => candidate.platform_code !== params.platformCode)
      .filter((candidate) => candidate.result_id !== params.excludeResultId)
      .map((candidate) => ({
        resultId: candidate.result_id,
        platformCode: candidate.platform_code as ReportingPlatformEnum,
        indicatorId: candidate.indicator_id as IndicatorsEnum,
      }));

    if (!duplicates.length) {
      return {
        shouldOmit: false,
        resultsToDelete: [],
        protectedFromDeletion: [],
      };
    }

    // Rule 4: a duplicate already linked as `other_result_id` must not be deleted,
    // even when the incoming result has higher priority.
    const duplicateIds = duplicates.map((duplicate) => duplicate.resultId);
    const protectedRows = await this.dataSource.getRepository(LinkResult).find({
      where: { other_result_id: In(duplicateIds) },
      select: { other_result_id: true },
    });
    const protectedResultIds = [
      ...new Set(protectedRows.map((row) => row.other_result_id)),
    ];

    // Delegate priority resolution to the pure util (Rules 1–3).
    return evaluateDuplicateResults(
      {
        platformCode: params.platformCode,
        indicatorId: params.indicatorId,
      },
      duplicates,
      protectedResultIds,
    );
  }

  /**
   * Removes lower-priority duplicate rows after a successful sync.
   *
   * Deletion runs through {@link QueryService.deleteFullResultById}, which hard-deletes
   * the seed row and, when it is live (`is_snapshot = false`), every snapshot/version
   * that shares the same `result_official_code` + `platform_code`.
   *
   * Only runs on `resultsToDelete` — rows in `protectedFromDeletion` are kept
   * because they are still referenced in `link_results.other_result_id` (Rule 4).
   */
  private async deleteDuplicateResults(
    validation: DuplicateResultValidationResult,
  ) {
    for (const resultId of validation.resultsToDelete) {
      this.logger.debug(
        `Deleting duplicate result ${resultId} superseded by higher-priority public link.`,
      );
      await this._queryService.deleteLogicalResultById(resultId);
    }

    // Rule 4: warn when a duplicate could not be removed due to link_results usage.
    for (const resultId of validation.protectedFromDeletion) {
      this.logger.warn(
        `Duplicate result ${resultId} was not deleted because it is referenced in link_results.other_result_id.`,
      );
    }
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
