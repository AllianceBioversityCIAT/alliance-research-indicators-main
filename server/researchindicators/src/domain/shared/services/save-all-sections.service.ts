// @sdd-spec results/cross-platform-duplicate-resolution
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
import {
  DuplicateGroupClassification,
  DuplicateGroupParticipant,
  DuplicateGroupResolution,
  resolveDuplicateGroup,
} from '../utils/duplicate-result-priority.util';
import { isEmpty } from '../utils/object.utils';
import { QueryService, ResultDeleteStatus } from '../utils/query.service';
import {
  DuplicateCandidate,
  DuplicateCandidateRepository,
} from '../../entities/results/repositories/duplicate-candidate.repository';
import {
  DuplicateResolutionMode,
  DuplicateResolutionSource,
} from '../../entities/results/entities/result-duplicate-resolution-log.entity';
import { ResultDuplicateResolutionLogService } from '../../entities/results/result-duplicate-resolution-log.service';
import { DuplicateResolutionRunner } from './duplicate-resolution-runner.service';

/** A participant enriched with the payload the audit record needs. */
type SyncParticipant = DuplicateGroupParticipant & {
  resultOfficialCode?: number | null;
  rawPublicLink?: string | null;
  normalizedPublicLink?: string | null;
};

/**
 * Persists externally-synced result sections (PRMS, TIP) into the `results` table.
 *
 * Cross-platform duplicate resolution runs here, and two properties of how it runs
 * are the whole point:
 *
 *  1. **The incoming payload and the stored row it updates are ONE participant.**
 *     Counting them separately put two same-platform rows in the group for one
 *     physical row, which fired the same-platform ambiguity branch on every routine
 *     re-sync — the shape of every live duplicate group.
 *  2. **Deletion happens after the winner is committed, outside the winner's
 *     `try`.** The `catch` in this method deletes the result it just created; a
 *     hard delete inside that block would let a duplicate-cleanup failure destroy
 *     the row the cleanup was meant to protect.
 *
 * And the reported bug lives in the third: when the incoming row loses, **its own
 * stored row is submitted for deletion**. The previous implementation excluded it
 * from the candidate set and returned, so a stored losing row survived every
 * subsequent sync while the omission counter made it look handled.
 */
@Injectable()
export class SaveResultService {
  private readonly logger = new CgiarLogger(SaveResultService.name);
  constructor(
    private readonly dataSource: DataSource,
    private readonly _currentUser: CurrentUserUtil,
    private readonly _resultsService: ResultsService,
    private readonly _resultKnowledgeProductService: ResultKnowledgeProductService,
    private readonly _queryService: QueryService,
    private readonly _duplicateCandidates: DuplicateCandidateRepository,
    private readonly _resolutionRunner: DuplicateResolutionRunner,
  ) {}

  public async bulkSaveAllSections(
    results: ExternalMappersDto[],
    extraData?: ExtraData<ExternalMappersDto>,
  ) {
    // One run id for the whole batch, so every audit row of a sync pass can be
    // retrieved together.
    const runId =
      extraData?.runId ?? ResultDuplicateResolutionLogService.newRunId();
    for (const result of results) {
      await this.saveAllSections(result, { ...extraData, runId });
    }
  }

  public async saveAllSections(
    result: ExternalMappersDto,
    extraData?: ExtraData<ExternalMappersDto>,
  ) {
    let typeCounter: CounterResultsEnum = null;
    let findResult: Result = null;
    this.logger.debug(
      `Processing result ${result.official_code} from ${this.platformCode(extraData?.platformCode)}.`,
    );
    this._currentUser.setSystemUser(result.userData, true);
    let createNewResult: Result = null;

    // Hoisted so the destructive step can run AFTER the winner is committed and
    // OUTSIDE the try whose catch rolls the winner back.
    let resolution: DuplicateGroupResolution = null;
    let participants: SyncParticipant[] = [];
    let normalizedPublicLink: string = null;
    let incomingIsLoser = false;

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

      findResult = await this.dataSource.getRepository(Result).findOne({
        where: findOptions,
      });

      // Cross-platform duplicate check. Matching is on `public_link` only —
      // `external_link` points at the source platform portal and would never
      // produce a reliable cross-platform match.
      const group = await this.buildDuplicateGroup({
        publicLink: result.public_link,
        reportYearId: result.createResult.year,
        platformCode: extraData.platformCode,
        indicatorId: result.createResult.indicator_id,
        officialCode: result.official_code,
        findResult,
      });
      resolution = group.resolution;
      participants = group.participants;
      normalizedPublicLink = group.normalizedPublicLink;
      incomingIsLoser = group.incomingIsLoser;

      if (incomingIsLoser) {
        // Do not create or update. The loser's own stored family, if any, is
        // handed to the single loser loop below — never deleted here, and never
        // by a direct call.
        this.logger.debug(
          `Omitting result ${result.official_code} from ${this.platformCode(extraData.platformCode)}: a higher-priority duplicate prevails for this public link.`,
        );
        typeCounter = CounterResultsEnum.OMITTED_DUPLICATE;
      } else {
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

        await this.dataSource
          .getRepository(Result)
          .update(findResult.result_id, {
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
          `Successfully processed result ${findResult.result_official_code} from ${this.platformCode(extraData?.platformCode)}.`,
        );
      }
    } catch (error) {
      const errorMessage = (error as Error).message ?? 'Unknown error';
      if (createNewResult) {
        this.logger.error(
          `Error processing result ${createNewResult.result_id}, rolling back. Error: ${errorMessage}`,
        );
        await this.rollbackCreatedResult(createNewResult.result_id);
      }
      this.logger.error(
        `Error processing ${this.platformCode(extraData?.platformCode)} result: ${errorMessage}`,
      );
      typeCounter = CounterResultsEnum.ERROR;
      // A failed save means the group was never resolved into a durable state, so
      // nothing is submitted for deletion.
      resolution = null;
    }

    // ---- the destructive step, outside the winner's try --------------------
    // Reached only after the winner is durably stored (or after an omission, where
    // nothing was written). A failure here is recorded per row and never rethrown.
    if (resolution && this.hasDeletableLosers(resolution)) {
      try {
        await this._resolutionRunner.applyGroup({
          context: {
            runId:
              extraData?.runId ??
              ResultDuplicateResolutionLogService.newRunId(),
            source:
              extraData?.platformCode === ReportingPlatformEnum.TIP
                ? DuplicateResolutionSource.SYNC_TIP
                : DuplicateResolutionSource.SYNC_PRMS,
            mode: DuplicateResolutionMode.SYNC,
          },
          normalizedPublicLink,
          participants,
          resolution,
        });
      } catch (error) {
        // The runner already isolates per-row failures; this only catches a
        // failure of the audit write itself, which must not undo a good save.
        this.logger.error(
          `Duplicate resolution bookkeeping failed for public link ${normalizedPublicLink}: ${(error as Error).message}`,
        );
      }
    }

    extraData.counters[typeCounter]++;
    this._currentUser.clearSystemUser();
    this.logger.debug(
      `Finished processing result ${result.official_code ?? findResult?.result_official_code} from ${this.platformCode(extraData?.platformCode)}.`,
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
   * Builds the duplicate group for one incoming row and resolves it.
   *
   * The incoming payload and `findResult` are collapsed into **one** participant:
   * when a stored row is being updated, the participant carries that row's
   * `result_id` with the incoming payload's platform and indicator, because the
   * incoming data is the newer truth. Counting them as two put two same-platform
   * rows in every routine re-sync and fired the ambiguity branch, leaving the path
   * with no defined outcome.
   */
  async buildDuplicateGroup(params: {
    publicLink?: string | null;
    reportYearId: number;
    platformCode: ReportingPlatformEnum;
    indicatorId: IndicatorsEnum;
    officialCode?: number | null;
    findResult?: Result | null;
  }): Promise<{
    resolution: DuplicateGroupResolution | null;
    participants: SyncParticipant[];
    normalizedPublicLink: string | null;
    incomingIsLoser: boolean;
  }> {
    const rawLink = params.publicLink?.trim();
    if (!rawLink) {
      // No public link means there is nothing to deduplicate against.
      return {
        resolution: null,
        participants: [],
        normalizedPublicLink: null,
        incomingIsLoser: false,
      };
    }

    const candidates =
      await this._duplicateCandidates.findCandidatesForIncoming({
        publicLink: rawLink,
        reportYearId: params.reportYearId,
      });

    const incoming: SyncParticipant = {
      resultId: params.findResult?.result_id ?? null,
      platformCode: params.platformCode,
      indicatorId: params.indicatorId,
      reportYearId: params.reportYearId,
      resultOfficialCode:
        params.findResult?.result_official_code ?? params.officialCode ?? null,
      rawPublicLink: rawLink,
    };

    const stored: SyncParticipant[] = candidates
      // The stored row being updated IS the incoming participant, not a second one.
      .filter(
        (candidate: DuplicateCandidate) =>
          candidate.resultId !== params.findResult?.result_id,
      )
      .map((candidate) => ({
        resultId: candidate.resultId,
        platformCode: candidate.platformCode,
        indicatorId: candidate.indicatorId,
        reportYearId: candidate.reportYearId,
        resultOfficialCode: candidate.resultOfficialCode,
        rawPublicLink: candidate.rawPublicLink,
        normalizedPublicLink: candidate.normalizedPublicLink,
      }));

    const normalizedPublicLink =
      candidates.find(
        (candidate) => candidate.resultId === params.findResult?.result_id,
      )?.normalizedPublicLink ??
      candidates[0]?.normalizedPublicLink ??
      rawLink;

    const participants = [incoming, ...stored];
    const resolution = resolveDuplicateGroup(participants);

    const incomingIsLoser = resolution.losers.some(
      (loser) => loser.resultId === incoming.resultId,
    );

    return {
      resolution,
      participants,
      normalizedPublicLink,
      incomingIsLoser,
    };
  }

  /** Whether the group has any stored row the rules authorized deleting. */
  private hasDeletableLosers(resolution: DuplicateGroupResolution): boolean {
    return (
      resolution.classification === DuplicateGroupClassification.RESOLVED &&
      resolution.losers.some((loser) => loser.resultId !== null)
    );
  }

  /**
   * Removes a result created in this pass after a failure.
   *
   * Kept deliberately narrow: it undoes only what this pass created, and it is the
   * ONLY delete on the error path. Duplicate cleanup never runs from here.
   */
  private async rollbackCreatedResult(resultId: number): Promise<void> {
    // Goes through QueryService so the rollback inherits year-scoped family
    // resolution and the single transaction — a raw call would bypass both.
    await this._queryService
      .deleteFullResultById(resultId)
      .then((outcomes) => {
        // T-07 pivot per-caller verdict: a REFUSED rollback resolves without
        // throwing, so the `.catch` below never sees it — the row is left in
        // place and, without this check, silently. A silently retained
        // result on an ambiguous identity is a live row the duplicate
        // matcher will see again on the next run.
        if (
          outcomes?.some(
            (outcome) => outcome.status === ResultDeleteStatus.REFUSED,
          )
        ) {
          this.logger.warn(
            `Rollback of result ${resultId} was REFUSED: its identity has more than one live row, so snapshot ownership is undecidable. Needs manual handling — the row was NOT removed.`,
          );
        }
      })
      .catch((error: Error) =>
        this.logger.error(
          `Rollback of result ${resultId} failed: ${error.message}`,
        ),
      );
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
  /** Shared by every audit row of one sync pass. */
  runId?: string;
};

export type FindOptionsKeyMap<
  T extends object,
  ExcludedKeys extends keyof FindOptionsWhere<Result> =
    | 'platform_code'
    | 'report_year_id',
> = {
  [K in Exclude<keyof FindOptionsWhere<Result>, ExcludedKeys>]?: keyof T;
};
