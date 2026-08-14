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
  refuseMultiIdentityLosers,
  resolveDuplicateGroup,
} from '../utils/duplicate-result-priority.util';
import { isEmpty } from '../utils/object.utils';
import { ResultInstitutionsService } from '../../entities/result-institutions/result-institutions.service';
import { ResultEvidencesService } from '../../entities/result-evidences/result-evidences.service';
import { ResultsUtil } from '../utils/results.util';
import { ResultPolicyChangeService } from '../../entities/result-policy-change/result-policy-change.service';
import { ResultCapacitySharingService } from '../../entities/result-capacity-sharing/result-capacity-sharing.service';
import { ResultInnovationDevService } from '../../entities/result-innovation-dev/result-innovation-dev.service';
import { ResultIpRightsService } from '../../entities/result-ip-rights/result-ip-rights.service';
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
import {
  PublicationIdentitySource,
  resolveIncomingPublicationIdentity,
} from '../utils/publication-identity.util';

/** A participant enriched with the payload the audit record needs. */
type SyncParticipant = DuplicateGroupParticipant & {
  resultOfficialCode?: number | null;
  /** Renamed from `rawPublicLink` (T-15) — see `DuplicateCandidate.rawIdentity`'s doc. */
  rawIdentity?: string | null;
  normalizedPublicLink?: string | null;
  /** Which field supplied the identity (R-RES-009 AC.4). */
  identitySource?: string | null;
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
    private readonly _resultsUtil: ResultsUtil,
    private readonly dataSource: DataSource,
    private readonly _currentUser: CurrentUserUtil,
    private readonly _resultsService: ResultsService,
    private readonly _resultKnowledgeProductService: ResultKnowledgeProductService,
    private readonly _resultInstitutionsService: ResultInstitutionsService,
    private readonly _resultEvidencesService: ResultEvidencesService,
    private readonly _resultPolicyChangeService: ResultPolicyChangeService,
    private readonly _resultCapacitySharingService: ResultCapacitySharingService,
    private readonly _resultInnovationDevService: ResultInnovationDevService,
    private readonly _resultIpRightsService: ResultIpRightsService,
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
    // resultIds `refuseMultiIdentityLosers` pulled out of `resolution.losers`
    // for R-RES-010 AC.8. Hoisted alongside `resolution` for the same reason:
    // discarding this (as attempt 1 did) makes the refusal invisible on the
    // sync path — no warn, and no audit row when it is the ONLY reason
    // `losers` ends up empty (`hasDeletableLosers` below would otherwise
    // never call `applyGroup`, and under a hard delete the audit row is the
    // only surviving trace).
    let multiIdentityRefusedResultIds: number[] = [];

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

      // Cross-platform duplicate check. `external_link` points at the source
      // platform portal and would never produce a reliable cross-platform
      // match, so it is never used. The identity FIELD is platform-dependent
      // (R-RES-010, design §5.2 step 0): TIP/AICCRA keep `public_link`
      // unchanged; PRMS's own `public_link` (its `pdf_link`) NEVER
      // contributes an identity — PRMS resolves in memory instead, from
      // `item.knowledge_product_summary.handle` (rev 4; carried into
      // `dto.evidence.evidence[]` by `processData`, never from
      // `processKnowledgeProduct`), because the sync path runs before the
      // row is saved and the stored-side SQL branch is not available yet for
      // the incoming row.
      const identityResolution = resolveIncomingPublicationIdentity({
        platformCode: extraData.platformCode,
        indicatorId: result.createResult.indicator_id,
        publicLink: result.public_link,
        evidence: result.evidence?.evidence,
      });

      if (identityResolution.refused) {
        // R-RES-010 AC.9: the payload itself carries more than one
        // qualifying identity (e.g. a two-KP PRMS item). Never resolve on the
        // first handle found — create/update normally below, count no
        // omission, and skip the duplicate check entirely so nothing is
        // submitted for deletion.
        this.logger.warn(
          `Result ${result.official_code} from ${this.platformCode(extraData.platformCode)} carries more than one publication identity; refusing duplicate resolution and processing it normally (no omission, no deletion).`,
        );
      }

      const group = await this.buildDuplicateGroup({
        publicLink: identityResolution.identity,
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
      multiIdentityRefusedResultIds = group.multiIdentityRefusedResultIds;

      if (multiIdentityRefusedResultIds.length) {
        // Mirrors the incoming-side refusal warn above (:169-171) — this is
        // the STORED side (R-RES-010 AC.8): one of this group's stored
        // participants itself resolves to more than one publication
        // identity, so it was pulled out of `resolution.losers` and will
        // never reach `deleteFullResultById`. Silent here is how the FAIL
        // this attempt fixes happened: the runner never gets asked, and
        // without this warn nothing on the sync path says so either.
        this.logger.warn(
          `Result(s) ${multiIdentityRefusedResultIds.join(', ')} refused for duplicate resolution: identity resolves to more than one publication (R-RES-010 AC.8). Skipping deletion; needs manual handling.`,
        );
      }

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

        await this._resultsUtil.setCurrentResult(findResult.result_id);

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
          result?.alignments,
        );

        await this._resultsService.saveGeoLocation(
          findResult.result_id,
          result?.geoScope,
        );

        await this._resultInstitutionsService.updatePartners(
          findResult.result_id,
          result?.partners,
        );

        await this._resultEvidencesService.updateResultEvidences(
          findResult.result_id,
          result?.evidence,
        );

        await this._resultKnowledgeProductService.update(
          findResult.result_id,
          result?.knowledgeProduct,
        );

        await this.saveIndicatorSpecificSections(findResult.result_id, result);

        this.logger.log(
          `Successfully processed result ${findResult.result_official_code} from ${this.platformCode(extraData?.platformCode)}.`,
        );
      }
    } catch (error) {
      const errorMessage = (error as Error).message ?? 'Unknown error';
      this.logger.error(error);
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
    } finally {
      this._resultsUtil.clearManually();
    }

    // ---- the destructive step, outside the winner's try --------------------
    // Reached only after the winner is durably stored (or after an omission, where
    // nothing was written). A failure here is recorded per row and never rethrown.
    //
    // The multi-identity-refused check is a SEPARATE reason to reach
    // `applyGroup`, not folded into `hasDeletableLosers`: `resolution.losers`
    // already excludes a refused participant by the time it gets here
    // (`refuseMultiIdentityLosers` ran inside `buildDuplicateGroup`), so a
    // group whose ONLY loser was refused has an empty `losers` and
    // `hasDeletableLosers` returns false — without this OR, `applyGroup`
    // (and therefore the audit row) would never be reached for that group,
    // and a safety branch that fired on a production row would leave no
    // trace of having fired.
    if (
      resolution &&
      (this.hasDeletableLosers(resolution) ||
        multiIdentityRefusedResultIds.length)
    ) {
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
          multiIdentityRefusedResultIds,
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
   * Persists indicator-specific sections after the shared result sections.
   *
   * Each indicator owns a dedicated service (`ResultPolicyChangeService`, etc.).
   * Extend this switch when a new indicator-specific mapper lands on
   * {@link ExternalMappersDto}.
   */
  private async saveIndicatorSpecificSections(
    resultId: number,
    result: ExternalMappersDto,
  ) {
    switch (result.createResult?.indicator_id) {
      case IndicatorsEnum.POLICY_CHANGE:
        if (!isEmpty(result.policyChange)) {
          await this._resultPolicyChangeService.update(
            resultId,
            result.policyChange,
          );
        }
        break;
      case IndicatorsEnum.CAPACITY_SHARING_FOR_DEVELOPMENT:
        if (!isEmpty(result.capacitySharing)) {
          await this._resultCapacitySharingService.update(
            resultId,
            result.capacitySharing,
          );
        }
        break;
      case IndicatorsEnum.INNOVATION_DEV:
        if (!isEmpty(result.innovationDev)) {
          await this._resultInnovationDevService.update(
            resultId,
            result.innovationDev,
          );
        }
        if (!isEmpty(result.ipRights)) {
          await this._resultIpRightsService.update(resultId, result.ipRights);
        }
        break;
      default:
        break;
    }
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
    /** resultIds `refuseMultiIdentityLosers` refused for R-RES-010 AC.8. */
    multiIdentityRefusedResultIds: number[];
  }> {
    const rawLink = params.publicLink?.trim();
    if (!rawLink) {
      // No public link means there is nothing to deduplicate against.
      return {
        resolution: null,
        participants: [],
        normalizedPublicLink: null,
        incomingIsLoser: false,
        multiIdentityRefusedResultIds: [],
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
      rawIdentity: rawLink,
      // The incoming identity source follows the same per-platform table as
      // the stored side (R-RES-010, design §3.1.1): PRMS resolves from its
      // evidence-shaped `dto.evidence.evidence[]` entry, TIP/AICCRA from
      // `public_link` unchanged.
      identitySource:
        params.platformCode === ReportingPlatformEnum.PRMS
          ? PublicationIdentitySource.HANDLE_EVIDENCE
          : PublicationIdentitySource.PUBLIC_LINK,
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
        rawIdentity: candidate.rawIdentity,
        normalizedPublicLink: candidate.normalizedPublicLink,
        identitySource: candidate.identitySource,
        identityCount: candidate.identityCount,
      }));

    const normalizedPublicLink =
      candidates.find(
        (candidate) => candidate.resultId === params.findResult?.result_id,
      )?.normalizedPublicLink ??
      candidates[0]?.normalizedPublicLink ??
      rawLink;

    const participants = [incoming, ...stored];
    const rawResolution = resolveDuplicateGroup(participants);

    // R-RES-010 AC.8 — the SAME per-participant refusal the sweep applies
    // (`DuplicateResolutionService.collectGroups`). Before this repository
    // method could ever return a PRMS row (T-15's UNION), a stored PRMS
    // candidate here was structurally impossible; now that it can appear,
    // an ambiguous one must be pulled out of `.losers` before anything
    // downstream (`hasDeletableLosers`, the loser loop below) can act on it
    // — the resolver never learns what `identityCount` means, so nothing
    // else in this path will stop it.
    //
    // `refusedResultIds` MUST be returned, not discarded: it is what lets
    // `saveAllSections` warn about the refusal and still reach `applyGroup`
    // (and therefore the durable audit row) when it is the ONLY reason
    // `resolution.losers` ends up empty.
    const { resolution, refusedResultIds: multiIdentityRefusedResultIds } =
      refuseMultiIdentityLosers(rawResolution);

    const incomingIsLoser = resolution.losers.some(
      (loser) => loser.resultId === incoming.resultId,
    );

    return {
      resolution,
      participants,
      normalizedPublicLink,
      incomingIsLoser,
      multiIdentityRefusedResultIds,
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
