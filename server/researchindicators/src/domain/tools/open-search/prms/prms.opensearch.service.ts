import { Injectable } from '@nestjs/common';
import {
  CapacityDevelopmentSummaryMapper,
  InnovationDevelopmentQuestionnaireMapper,
  InnovationDevelopmentSummaryMapper,
  InnovationUseLinkedResultMapper,
  InnovationUseSummaryMapper,
  PrmsKnowledgeProductDto,
  PrmsSearchParams,
  PrmsTemporalResponseMapper,
  PolicyChangeSummaryMapper,
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
  PrmsImportedDecision,
  ResultPrmsToStarStatusMapper,
} from './enum/rsult-type.enum';
import {
  PrmsWebhookDeliveryRepository,
  RecordImportedHistoryInput,
} from '../../../entities/prms-webhook/repositories/prms-webhook-delivery.repository';
import { BilateralService } from '../../../entities/bilateral/bilateral.service';
import { tocLevelCode } from '../../../entities/prms-webhook/pool-funding-mapping-diff.service';
import { TocLevel } from '../../toc-integration/dto/toc-integration.types';
import { GreenCheckRepository } from '../../../entities/green-checks/repository/green-checks.repository';
import { ClarisaLeversService } from '../../clarisa/entities/clarisa-levers/clarisa-levers.service';
import { ResultContract } from '../../../entities/result-contracts/entities/result-contract.entity';
import { LoggerUtil } from '../../../shared/utils/logger.util';
import { firstValueFrom } from 'rxjs';
import { CounterResults } from '../../tip-integration/dto/response-year-tip.dto';
import { SyncProcessLogService } from '../../../entities/sync-process-log/sync-process-log.service';
import { SyncProcessEnum } from '../../../entities/sync-process-log/enum/sync-process.enum';
import { SaveResultService } from '../../../shared/services/save-all-sections.service';
import { SyncStagingRecordsEntity } from './entities/sync-staging-records.entity';
import { PrmsRepository } from './repositories/prms.repository';
import { v4 as uuidv4 } from 'uuid';
import { ClarisaCountriesService } from '../../clarisa/entities/clarisa-countries/clarisa-countries.service';
import { ClarisaRegionsService } from '../../clarisa/entities/clarisa-regions/clarisa-regions.service';
import { ClarisaInstitutionsService } from '../../clarisa/entities/clarisa-institutions/clarisa-institutions.service';
import { ClarisaGeoScopeEnum } from '../../clarisa/entities/clarisa-geo-scope/enum/clarisa-geo-scope.enum';
import { ClarisaInnovationCharacteristicsService } from '../../clarisa/entities/clarisa-innovation-characteristics/clarisa-innovation-characteristics.service';
import { ClarisaInnovationTypesService } from '../../clarisa/entities/clarisa-innovation-types/clarisa-innovation-types.service';
import { ClarisaInnovationReadinessLevelsService } from '../../clarisa/entities/clarisa-innovation-readiness-levels/clarisa-innovation-readiness-levels.service';
import { ClarisaActorTypesService } from '../../clarisa/entities/clarisa-actor-types/clarisa-actor-types.service';
import { ClarisaInstitutionTypesService } from '../../clarisa/entities/clarisa-institution-types/clarisa-institution-types.service';
import { ResultCountry } from '../../../entities/result-countries/entities/result-country.entity';
import { ResultRegion } from '../../../entities/result-regions/entities/result-region.entity';
import { ResultInstitution } from '../../../entities/result-institutions/entities/result-institution.entity';
import { SaveGeoLocationDto } from '../../../entities/results/dto/save-geo-location.dto';
import { CreateResultInstitutionDto } from '../../../entities/result-institutions/dto/create-result-institution.dto';
import { CreateResultEvidenceDto } from '../../../entities/result-evidences/dto/create-result-evidence.dto';
import { CreateResultPolicyChangeDto } from '../../../entities/result-policy-change/dto/create-result-policy-change.dto';
import {
  CapDevGroupDto,
  UpdateResultCapacitySharingDto,
} from '../../../entities/result-capacity-sharing/dto/update-result-capacity-sharing.dto';
import { CreateResultInnovationDevDto } from '../../../entities/result-innovation-dev/dto/create-result-innovation-dev.dto';
import { UpdateIpRightDto } from '../../../entities/result-ip-rights/dto/update-ip-right.dto';
import { CreateResultActorDto } from '../../../entities/result-actors/dto/create-result-actor.dto';
import { CreateResultInstitutionTypeDto } from '../../../entities/result-institution-types/dto/create-result-institution-type.dto';
import { IndicatorsEnum } from '../../../entities/indicators/enum/indicators.enum';
import {
  CreateResultInnovationUseDto,
  InnovationUseActorDto,
  InnovationUseOrganizationDto,
  InnovationUseQuantificationDto,
} from '../../../entities/result-innovation-use/dto/create-result-innovation-use.dto';
import { ClarisaInstitutionType } from '../../clarisa/entities/clarisa-institution-types/entities/clarisa-institution-type.entity';
import { ClarisaInnovationUseLevel } from '../../clarisa/entities/clarisa-innovation-use-levels/entities/clarisa-innovation-use-level.entity';
import { ClarisaActorTypesEnum } from '../../clarisa/entities/clarisa-actor-types/enum/clarisa-actor-types.enum';
import { homologateInnovationUseActorType } from './homologation/innovation-use-actor-type.homologation';
import { PolicyTypeHomologation } from './homologation/policy-type.homologation';
import { PolicyStageHomologation } from './homologation/policy-stage.homologation';
import { DeliveryModalityHomologation } from './homologation/delivery-modality.homologation';
import { SessionLengthHomologation } from './homologation/session-length.homologation';
import { DegreeHomologation } from './homologation/degree.homologation';
import { IpRightsApplicationHomologation } from './homologation/ip-rights-application.homologation';
import { PrmsInnovationIpQuestionEnum } from './homologation/prms-innovation-question.homologation';
import { SessionFormatEnum } from '../../../entities/session-formats/enums/session-format.enum';
import { SessionLengthEnum } from '../../../entities/session-lengths/enum/session-lengths.enum';
import { InnovationDevAnticipatedUsers } from '../../../entities/innovation-dev-anticipated-users/enum/innovation-dev-anticipated-users.enum';
import { ActorRolesEnum } from '../../../entities/actor-roles/enum/actor-roles.enum';

/**
 * PRMS `toc_alignment` -> the pool-funding alignment STAR stores. The SP
 * whose role is "Primary submitter" (or `primary_entity`) is the primary
 * SP; every other entity contributes. STAR keeps one ToC row, on the
 * primary SP, so the first named ToC result of that SP is the one saved.
 * Returns null when PRMS sends no ToC alignment.
 */
export const mapPrmsAlignment = (
  source: ResultResponseMapper | undefined,
): {
  primarySpCode: string;
  contributingSpCodes: string[];
  toc: { level: TocLevel | null; title: string } | null;
} | null => {
  const entries = (source?.toc_alignment ?? []).filter(
    (entry) => !isEmpty(entry?.entity?.official_code?.trim()),
  );
  if (!entries.length) return null;

  const primaryEntry =
    entries.find((entry) => /primary/i.test(entry.initiative_role ?? '')) ??
    entries.find(
      (entry) =>
        entry.entity.official_code.trim() ===
        source?.primary_entity?.official_code?.trim(),
    ) ??
    entries[0];
  const primarySpCode = primaryEntry.entity.official_code.trim();
  const tocResult = (primaryEntry.toc_results ?? []).find(
    (candidate) => !isEmpty(candidate?.result_name?.trim()),
  );

  return {
    primarySpCode,
    contributingSpCodes: entries
      .filter((entry) => entry !== primaryEntry)
      .map((entry) => entry.entity.official_code.trim()),
    toc: tocResult
      ? {
          level: tocLevelCode(tocResult.level ?? null),
          title: tocResult.result_name.trim(),
        }
      : null,
  };
};

const validDate = (value: unknown): Date | null => {
  if (value == null || value === '') return null;
  const date = new Date(value as string);
  return isNaN(date.getTime()) ? null : date;
};

/** A decision can never be dated before the submission it answers. */
const laterOf = (candidate: Date | null, floor: Date): Date =>
  candidate && candidate.getTime() >= floor.getTime() ? candidate : floor;

/** PRMS `result_type_id` of an Innovation Development result. */
const PRMS_INNOVATION_DEVELOPMENT_TYPE_ID = 7;

@Injectable()
export class PrmsOpenSearchService
  implements ExternalMappersInterface<ExternalMappersDto>
{
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
    private readonly saveResultService: SaveResultService,
    private readonly prmsRepository: PrmsRepository,
    private readonly clarisaCountriesService: ClarisaCountriesService,
    private readonly clarisaRegionsService: ClarisaRegionsService,
    private readonly clarisaInstitutionsService: ClarisaInstitutionsService,
    private readonly clarisaInnovationCharacteristicsService: ClarisaInnovationCharacteristicsService,
    private readonly clarisaInnovationTypesService: ClarisaInnovationTypesService,
    private readonly clarisaInnovationReadinessLevelsService: ClarisaInnovationReadinessLevelsService,
    private readonly clarisaActorTypesService: ClarisaActorTypesService,
    private readonly clarisaInstitutionTypesService: ClarisaInstitutionTypesService,
    private readonly greenCheckRepository: GreenCheckRepository,
    private readonly prmsHistoryRepository: PrmsWebhookDeliveryRepository,
    private readonly bilateralService: BilateralService,
  ) {}

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
        const errorMessage = (error as Error).message ?? 'Unknown error';
        if (createNewResult) {
          this.logger.error(
            `Error processing result ${createNewResult.result_id}, rolling back. Error: ${errorMessage}`,
          );
          await this._queryService.deleteFullResultById(
            createNewResult.result_id,
          );
        }
        this.logger.error(`Error processing tip result: ${errorMessage}`);
      }
      this._currentUser.clearSystemUser();
      this.logger.debug(
        `Finished processing result ${result.official_code} from TIP.`,
      );
    }
  }

  //TODO: Review this function to check if it is working correctly and complete the process
  async getData(year: number) {
    const executionCode = uuidv4();
    const currentCode: { current: number } = { current: null };
    const resultSaved: number[] = [];
    const counters: CounterResults = {
      createdRecords: 0,
      updatedRecords: 0,
      errorRecords: 0,
    };
    try {
      const syncProcessLog = await this.syncProcessLogService.initiateSync(
        SyncProcessEnum.PRMS_INTEGRATION,
      );
      const centerAcronym = ['Bioversity (Alliance)', 'CIAT (Alliance)'];
      const params: PrmsSearchParams = {
        fundingType: 'Result',
        centerAcronym: centerAcronym.join(','),
      };
      if (!isEmpty(year)) {
        params.year = year;
      }
      await this.fetchPrmsPages(params, executionCode);
      const prmsResults =
        await this.prmsRepository.findTemporalResults<ResultResponseMapper>(
          executionCode,
        );

      const dataProcessed = await this.processData(prmsResults);
      // A PRMS-platform row uses the PRMS code as its official code; it is
      // also kept in `prms_result_code`, the column STAR looks PRMS codes up by.
      for (const result of dataProcessed) {
        result.prms_result_code = result.official_code;
      }

      await this.saveResultService.bulkSaveAllSections(dataProcessed, {
        platformCode: ReportingPlatformEnum.PRMS,
        resultSaved,
        currentCode,
        counters,
        statusMapper: ResultPrmsStatusMapper,
      });
      await this.importPrmsResultAlignments(dataProcessed, prmsResults);
      await this.syncProcessLogService.update(syncProcessLog.id, counters);
      await this.syncProcessLogService.endSync(syncProcessLog.id);
    } catch (error) {
      const errorMessage = (error as Error).message ?? 'Unknown error';
      this.logger.error(`Error getting data from PRMS: ${errorMessage}`);
    } finally {
      await this.prmsRepository.deleteTemporalResults(executionCode);
    }
  }

  /**
   * Imports PRMS results as STAR results. STAR assigns the official code; the
   * PRMS `result_code` is kept in `prms_result_code` and is the key a re-run
   * uses to update instead of creating again. A result that lands as APPROVED
   * is versioned right away, without checking completeness.
   */
  async getDataAsStar(params: PrmsSearchParams) {
    const executionCode = uuidv4();
    const currentCode: { current: number } = { current: null };
    const resultSaved: number[] = [];
    const counters: CounterResults = {
      createdRecords: 0,
      updatedRecords: 0,
      errorRecords: 0,
    };
    try {
      const syncProcessLog = await this.syncProcessLogService.initiateSync(
        SyncProcessEnum.PRMS_INTEGRATION,
      );
      await this.fetchPrmsPages(params, executionCode);
      const prmsResults =
        await this.prmsRepository.findTemporalResults<ResultResponseMapper>(
          executionCode,
        );

      const { results: dataProcessed, sources } =
        await this.processDataAsStar(prmsResults);

      await this.saveResultService.bulkSaveAllSections(dataProcessed, {
        platformCode: ReportingPlatformEnum.STAR,
        resultSaved,
        currentCode,
        counters,
        manageOfficialCode: true,
        duplicateByTitle: true,
        findOptions: {
          prms_result_code: 'prms_result_code',
          is_snapshot: 'is_version_applied',
        },
      });
      await this.finalizeImportedResults(dataProcessed, sources);
      await this.syncProcessLogService.update(syncProcessLog.id, counters);
      await this.syncProcessLogService.endSync(syncProcessLog.id);
    } catch (error) {
      const errorMessage = (error as Error).message ?? 'Unknown error';
      this.logger.error(`Error getting PRMS data as STAR: ${errorMessage}`);
    } finally {
      await this.prmsRepository.deleteTemporalResults(executionCode);
    }
  }

  private async fetchPrmsPages(
    params: PrmsSearchParams,
    executionCode: string,
  ): Promise<void> {
    const size = 50;
    let page = 1;
    let keepGoing = true;
    while (keepGoing) {
      const response = await firstValueFrom(
        this.httpService.get<SearcherResponseDto>(
          this.buildPrmsUrl(size, page, params),
        ),
      ).then((response) => response.data);
      await Promise.all(
        response.data.map(async (item) => {
          await this.dataSource
            .getRepository(SyncStagingRecordsEntity)
            .save({
              execution_code: executionCode,
              code: parseInt(item.result_code),
              year: parseInt(item.year),
              data: item,
            })
            .catch((error) => {
              this.logger.error(
                `Error saving temporal result ${item.result_code}: ${error.message} \n ${error.stack}`,
              );
            });
        }),
      );

      if (page >= response.totalPages) {
        keepGoing = false;
      }

      page++;
    }
  }

  private buildPrmsUrl(
    size: number,
    page: number,
    params: PrmsSearchParams,
  ): string {
    const query = [`size=${size}`, `page=${page}`];
    for (const [key, value] of Object.entries(params)) {
      if (isEmpty(value)) continue;
      query.push(`${key}=${encodeURIComponent(String(value))}`);
    }
    return `${this.appConfig.SEARCH_PRMS_URL}/result?${query.join('&')}`;
  }

  private async processDataAsStar(
    prmsData: PrmsTemporalResponseMapper[],
  ): Promise<{
    results: ExternalMappersDto[];
    sources: Map<number, ResultResponseMapper>;
  }> {
    const sources = new Map<number, ResultResponseMapper>();
    const importable = prmsData.filter((data) => {
      const starStatus =
        ResultPrmsToStarStatusMapper[Number(data?.data?.status_id)];
      if (!starStatus) {
        this.logger.warn(
          `Skipping PRMS result ${data?.data?.result_code} because status ${data?.data?.status_id} is not imported into STAR.`,
        );
        return false;
      }
      sources.set(parseInt(data.data.result_code), data.data);
      return true;
    });

    const results = await this.processData(importable);
    for (const result of results) {
      const source = sources.get(result.official_code);
      result.status_id = ResultPrmsToStarStatusMapper[Number(source.status_id)];
      result.prms_result_code = result.official_code;
      // `phase_id` is not copied here: the live row keeps only the PRMS
      // result code. The phase goes on the version (see storePhaseOnVersion).
    }
    return { results, sources };
  }

  /**
   * For every imported result that was saved: writes its PRMS sync history
   * and versions it. Every one of them is Approved in STAR, so every one is
   * versioned, without checking completeness.
   */
  private async finalizeImportedResults(
    results: ExternalMappersDto[],
    sources: Map<number, ResultResponseMapper>,
  ): Promise<void> {
    for (const result of results) {
      const year = result.createResult.year;
      // Missing when the save failed or was skipped as a duplicate.
      const saved = await this.dataSource
        .getRepository(Result)
        .findOne({
          where: {
            prms_result_code: result.prms_result_code,
            platform_code: ReportingPlatformEnum.STAR,
            report_year_id: year,
            is_snapshot: false,
          },
          select: { result_id: true, result_official_code: true },
        })
        .catch((error) => {
          this.logger.error(
            `Error finding imported PRMS result ${result.prms_result_code}: ${(error as Error).message}`,
          );
          return null;
        });
      if (!saved) continue;

      await this.importAlignment(
        result,
        sources.get(result.prms_result_code),
        saved.result_id,
      );

      await this.recordImportedHistory(
        result,
        sources.get(result.prms_result_code),
        saved.result_official_code,
      );

      if (result.status_id !== ResultStatusEnum.APPROVED) continue;
      try {
        await this.greenCheckRepository.createSnapshot(
          saved.result_official_code,
          year,
        );
      } catch (error) {
        const errorMessage = (error as Error).message ?? 'Unknown error';
        this.logger.error(
          `Error versioning PRMS result ${result.prms_result_code}: ${errorMessage}`,
        );
        continue;
      }

      await this.storePhaseOnVersion(
        result,
        sources.get(result.prms_result_code),
        saved.result_id,
        saved.result_official_code,
      );
    }
  }

  /**
   * The PRMS phase belongs to the version, not to the live row: the live row
   * keeps only `prms_result_code`. Clears any phase an earlier import left on
   * the live row, then writes the PRMS `phase_id` onto the version just created.
   */
  private async storePhaseOnVersion(
    result: ExternalMappersDto,
    source: ResultResponseMapper,
    liveResultId: number,
    resultOfficialCode: number,
  ): Promise<void> {
    const repository = this.dataSource.getRepository(Result);
    try {
      await repository.update(liveResultId, { prms_phase_id: null });
      if (isEmpty(source?.phase_id)) return;
      await repository.update(
        {
          result_official_code: resultOfficialCode,
          report_year_id: result.createResult.year,
          platform_code: ReportingPlatformEnum.STAR,
          is_snapshot: true,
          is_active: true,
        },
        { prms_phase_id: source.phase_id },
      );
    } catch (error) {
      const errorMessage = (error as Error).message ?? 'Unknown error';
      this.logger.error(
        `Error storing the PRMS phase of result ${result.prms_result_code}: ${errorMessage}`,
      );
    }
  }

  /**
   * `fetch-prms-data` counterpart of the alignment step in
   * `finalizeImportedResults`: only the pool-funding alignment and ToC, no
   * history, versioning or phase. The row is found with the same keys
   * `bulkSaveAllSections` matched it on for the PRMS platform.
   */
  private async importPrmsResultAlignments(
    results: ExternalMappersDto[],
    prmsData: PrmsTemporalResponseMapper[],
  ): Promise<void> {
    const sources = new Map<number, ResultResponseMapper>();
    for (const data of prmsData) {
      if (isEmpty(data?.data)) continue;
      sources.set(parseInt(data.data.result_code), data.data);
    }

    for (const result of results) {
      const source = sources.get(result.official_code);
      // Skips the lookup for results PRMS sends without a ToC alignment.
      if (!mapPrmsAlignment(source)) continue;
      // Missing when the save failed.
      const saved = await this.dataSource
        .getRepository(Result)
        .findOne({
          where: {
            result_official_code: result.official_code,
            platform_code: ReportingPlatformEnum.PRMS,
            report_year_id: result.createResult.year,
          },
          select: { result_id: true },
        })
        .catch((error) => {
          this.logger.error(
            `Error finding PRMS result ${result.official_code}: ${(error as Error).message}`,
          );
          return null;
        });
      if (!saved) continue;

      await this.importAlignment(result, source, saved.result_id);
    }
  }

  /**
   * Saves the pool-funding alignment and ToC PRMS has for the result, when
   * PRMS sends them. Goes before the version so the version carries them.
   */
  private async importAlignment(
    result: ExternalMappersDto,
    source: ResultResponseMapper,
    resultId: number,
  ): Promise<void> {
    const alignment = mapPrmsAlignment(source);
    if (!alignment) return;
    try {
      await this.bilateralService.importAlignmentFromPrms(
        resultId,
        alignment,
        result.userData?.sec_user_id ?? null,
      );
    } catch (error) {
      const errorMessage = (error as Error).message ?? 'Unknown error';
      this.logger.error(
        `Error saving the ToC alignment of PRMS result ${result.prms_result_code ?? result.official_code}: ${errorMessage}`,
      );
    }
  }

  /**
   * Every imported result gets the PENDING_REVIEW row a push would have
   * written. A PRMS Approved or Rejected result also gets the decision row
   * a PRMS callback would have written, so the history keeps what PRMS
   * decided even though STAR shows all of them as Approved. Re-running the
   * import replaces these rows instead of adding more.
   */
  private async recordImportedHistory(
    result: ExternalMappersDto,
    source: ResultResponseMapper,
    resultOfficialCode: number,
  ): Promise<void> {
    const key = {
      resultOfficialCode: String(resultOfficialCode),
      resultYear: result.createResult.year,
    };
    const base = {
      ...key,
      prmsResultCode: result.prms_result_code,
      environment: this.appConfig.ARI_IS_PRODUCTION ? 'PROD' : 'TEST',
    };
    const submittedAt = validDate(source?.created_date) ?? new Date();
    const decidedAt = laterOf(
      validDate(source?.last_updated_date),
      submittedAt,
    );
    const decision = PrmsImportedDecision[Number(source?.status_id)];

    const rows: RecordImportedHistoryInput[] = [
      {
        ...base,
        occurredAt: submittedAt,
        eventSource: 'STAR',
        status: 'PENDING_REVIEW',
        decision: null,
        decidedAt: null,
        actorUserId: result.userData?.sec_user_id ?? null,
      },
    ];
    if (decision) {
      rows.push({
        ...base,
        occurredAt: decidedAt,
        eventSource: 'PRMS',
        status: decision.status,
        decision: decision.decision,
        decidedAt,
        actorUserId: null,
      });
    }

    try {
      await this.prmsHistoryRepository.replaceImportedHistory(key, rows);
    } catch (error) {
      const errorMessage = (error as Error).message ?? 'Unknown error';
      this.logger.error(
        `Error writing PRMS sync history for result ${resultOfficialCode} (PRMS ${result.prms_result_code}): ${errorMessage}`,
      );
    }
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
    const existingEvidenceUrls = new Set(
      tempEvidence.map((el) => el.evidence_url),
    );
    const newEvidence = evidence.filter(
      (el) => !existingEvidenceUrls.has(el.evidence_url),
    );
    tempEvidence.push(...(newEvidence as ResultEvidence[]));

    body.evidence = {
      ...body.evidence,
      evidence: tempEvidence as ResultEvidence[],
    };
  }

  private mapEvidence(item: ResultResponseMapper): CreateResultEvidenceDto {
    const evidence = (item?.evidences ?? [])
      .filter((el) => !isEmpty(el?.link))
      .map(
        (el) =>
          ({
            evidence_url: el.link,
            evidence_description: el.description ?? 'Not Provided by PRMS',
          }) as ResultEvidence,
      );

    return { evidence } as CreateResultEvidenceDto;
  }

  private async mapGeoScope(
    item: ResultResponseMapper,
  ): Promise<SaveGeoLocationDto> {
    const countryCodes = (item?.countries ?? []).map((country) => country.code);
    const regionCodes = (item?.regions ?? []).map((region) =>
      parseInt(region.code),
    );

    const [countries, regions] = await Promise.all([
      isEmpty(countryCodes)
        ? Promise.resolve([])
        : this.clarisaCountriesService.findByIso2(countryCodes),
      isEmpty(regionCodes)
        ? Promise.resolve([])
        : this.clarisaRegionsService.findByUm49Codes(regionCodes),
    ]);

    return {
      geo_scope_id: parseInt(
        item?.geographic_focus?.code,
      ) as ClarisaGeoScopeEnum,
      countries: countries.map(
        (country) => ({ isoAlpha2: country.isoAlpha2 }) as ResultCountry,
      ),
      regions: regions.map(
        (region) => ({ region_id: region.um49Code }) as ResultRegion,
      ),
      comment_geo_scope: null,
    };
  }

  private async mapPartners(
    item: ResultResponseMapper,
  ): Promise<CreateResultInstitutionDto> {
    const partnerCodes = (item?.contributing_partners ?? []).map((partner) =>
      parseInt(partner.code),
    );

    if (isEmpty(partnerCodes)) {
      return { institutions: [] };
    }

    const institutions =
      await this.clarisaInstitutionsService.findByCodes(partnerCodes);

    return {
      institutions: institutions.map(
        (institution) =>
          ({ institution_id: institution.code }) as ResultInstitution,
      ),
    };
  }

  /**
   * Maps PRMS `policy_change_summary` into the STAR policy-change section DTO.
   *
   * PRMS only exposes boolean flags for linked innovation results (not result
   * IDs), so `innovation_development` / `innovation_use` stay unset here.
   */
  private async mapPolicyChange(
    summary?: PolicyChangeSummaryMapper | null,
  ): Promise<CreateResultPolicyChangeDto | undefined> {
    if (isEmpty(summary)) return undefined;

    const orgIds = (summary.policy_implementing_organizations ?? [])
      .map((org) => org?.id)
      .filter((id) => !isEmpty(id));

    const institutions = isEmpty(orgIds)
      ? []
      : await this.clarisaInstitutionsService.findByCodes(orgIds);

    return {
      policy_type_id: PolicyTypeHomologation[summary.policy_type?.id],
      policy_stage_id: PolicyStageHomologation[summary.policy_stage?.id],
      evidence_stage: undefined,
      implementing_organization: institutions.map(
        (institution) =>
          ({ institution_id: institution.code }) as ResultInstitution,
      ),
      innovation_development: undefined,
      innovation_use: undefined,
    };
  }

  /**
   * Maps PRMS `capacity_development_summary` into STAR capacity-sharing DTO.
   *
   * PRMS participant counts imply a group session, so `session_format_id` is
   * always set to {@link SessionFormatEnum.GROUP}.
   */
  private async mapCapacitySharing(
    summary?: CapacityDevelopmentSummaryMapper | null,
  ): Promise<UpdateResultCapacitySharingDto | undefined> {
    if (isEmpty(summary)) return undefined;

    const orgIds = (summary.on_behalf_organizations ?? [])
      .map((org) => org?.id)
      .filter((id) => !isEmpty(id));

    const institutions = isEmpty(orgIds)
      ? []
      : await this.clarisaInstitutionsService.findByCodes(orgIds);

    const male = summary?.male_using ?? 0;
    const female = summary?.female_using ?? 0;
    const nonBinary = summary?.non_binary_using ?? 0;
    const unknown = summary?.has_unkown_using ?? 0;

    const group = new CapDevGroupDto();
    group.session_participants_male = male;
    group.session_participants_female = female;
    group.session_participants_non_binary = nonBinary;
    group.session_participants_total = male + female + nonBinary + unknown;
    group.is_attending_organization = summary?.is_attending_for_organization;
    group.trainee_organization_representative = institutions.map(
      (institution) =>
        ({ institution_id: institution.code }) as ResultInstitution,
    );

    const capacitySharing = new UpdateResultCapacitySharingDto();
    capacitySharing.session_format_id = SessionFormatEnum.GROUP;
    capacitySharing.delivery_modality_id =
      DeliveryModalityHomologation[summary?.delivery_method?.name];
    // `term` → session length; `name` → degree only when term is Long-term.
    capacitySharing.session_length_id =
      SessionLengthHomologation[summary?.training_length?.term];
    if (capacitySharing.session_length_id === SessionLengthEnum.LONG_TERM) {
      capacitySharing.degree_id =
        DegreeHomologation[summary?.training_length?.name];
    }
    capacitySharing.group = group;

    return capacitySharing;
  }

  /**
   * Maps PRMS `innovation_development_summary` into STAR innovation-dev + IP rights.
   */
  private async mapInnovationDev(
    summary?: InnovationDevelopmentSummaryMapper | null,
  ): Promise<{
    innovationDev?: CreateResultInnovationDevDto;
    ipRights?: UpdateIpRightDto;
  }> {
    if (isEmpty(summary)) return {};

    const innovationDev = new CreateResultInnovationDevDto();
    innovationDev.short_title = summary?.short_name;
    innovationDev.innovation_readiness_explanation =
      summary?.evidences_justification;
    innovationDev.anticipated_users_id =
      summary.innovation_user_to_be_determined
        ? InnovationDevAnticipatedUsers.THIS_IS_YET_TO_BE_DETERMINED
        : InnovationDevAnticipatedUsers.USERS_HAVE_BEEN_DETERMINED;

    if (!isEmpty(summary?.characterization?.name)) {
      const nature =
        await this.clarisaInnovationCharacteristicsService.findByName(
          summary?.characterization.name,
        );
      innovationDev.innovation_nature_id =
        nature?.id ??
        (await this.clarisaInnovationCharacteristicsService
          .findOne(summary?.characterization?.id)
          .then((res) => res?.id));
    }

    if (!isEmpty(summary?.typology?.name) || !isEmpty(summary.typology?.code)) {
      const typeByName = !isEmpty(summary?.typology?.name)
        ? await this.clarisaInnovationTypesService.findByName(
            summary?.typology.name,
          )
        : null;
      innovationDev.innovation_type_id =
        typeByName?.code ??
        (await this.clarisaInnovationTypesService
          .findOne(summary?.typology?.code)
          .then((res) => res?.code));
    }

    if (!isEmpty(summary?.innovation_readiness_level?.level)) {
      const readiness =
        await this.clarisaInnovationReadinessLevelsService.findByValue(
          summary?.innovation_readiness_level.level,
        );
      innovationDev.innovation_readiness_id = readiness?.id;
    }

    const demand = summary?.anticipated_user_demand;
    const demandTexts = new Set<string>();
    const actors: CreateResultActorDto[] = [];

    for (const actor of demand?.actors ?? []) {
      if (isEmpty(actor?.actor_type_name)) continue;
      const actorType = await this.clarisaActorTypesService.findByName(
        actor.actor_type_name,
      );
      if (isEmpty(actorType?.code)) continue;
      const dto = new CreateResultActorDto();
      dto.actor_type_id = actorType.code;
      dto.actor_role_id = ActorRolesEnum.INNOVATION_DEV;
      dto.sex_age_disaggregation_not_apply = !actor.sex_and_age_disaggregation;
      actors.push(dto);
      if (!isEmpty(actor.addressing_demands)) {
        demandTexts.add(actor.addressing_demands.trim());
      }
    }
    innovationDev.actors = actors;

    const institutionTypes: CreateResultInstitutionTypeDto[] = [];
    for (const org of demand?.organizations ?? []) {
      if (isEmpty(org?.institution_type_name)) continue;
      const institutionType =
        await this.clarisaInstitutionTypesService.findByName(
          org.institution_type_name,
        );
      if (isEmpty(institutionType?.code)) continue;
      const selectable =
        await this.toSelectableInstitutionType(institutionType);
      const dto = new CreateResultInstitutionTypeDto();
      dto.institution_type_id = selectable.institution_type_id;
      dto.sub_institution_type_id = selectable.sub_institution_type_id;
      dto.is_organization_known = false;
      institutionTypes.push(dto);
      if (!isEmpty(org.addressing_demands)) {
        demandTexts.add(org.addressing_demands.trim());
      }
    }
    innovationDev.institution_types = institutionTypes;

    innovationDev.no_sex_age_disaggregation =
      actors.length > 0 &&
      actors.every((actor) => actor.sex_age_disaggregation_not_apply === true);

    const ipRights = this.mapIpRightsFromQuestionnaire(
      summary?.innovation_development_questionnaire,
    );

    return { innovationDev, ipRights };
  }

  /**
   * Maps PRMS `innovation_use_summary` into the STAR Innovation Use section.
   *
   * STAR holds only the current use: the 2030 section, the budgets, the
   * scaling studies and the to-be-determined core numbers have no column and
   * are dropped. When PRMS marks the current use as to be determined it sends
   * no `current_section`, so the actors, organizations and measures are
   * cleared. Rows that do not resolve to a STAR catalog are skipped: the save
   * service rejects the whole result for one bad row.
   */
  private async mapInnovationUse(
    summary: InnovationUseSummaryMapper | null | undefined,
    year: number,
  ): Promise<CreateResultInnovationUseDto | undefined> {
    if (isEmpty(summary)) return undefined;

    const innovationUse = new CreateResultInnovationUseDto();

    if (!isEmpty(summary.innovation_use_level?.level)) {
      const level = await this.dataSource
        .getRepository(ClarisaInnovationUseLevel)
        .findOne({
          where: {
            level: Number(summary.innovation_use_level.level),
            is_active: true,
          },
        });
      innovationUse.innovation_use_level_id = level?.id;
    }
    const explanation = summary.readiness_level_explanation?.trim();
    // The save service stores it only for levels 6 and above.
    innovationUse.innovation_use_level_explanation = explanation || undefined;

    const section = summary.current_section;
    innovationUse.actors = this.mapInnovationUseActors(section?.actors ?? []);
    innovationUse.organizations = await this.mapInnovationUseOrganizations(
      section?.organizations ?? [],
    );
    innovationUse.quantifications = (section?.other_quantitative ?? [])
      .filter((measure) => typeof measure?.quantity === 'number')
      .map((measure) => {
        const dto = new InnovationUseQuantificationDto();
        dto.quantification_number = measure.quantity;
        dto.unit = measure.unit_of_measure?.trim() || undefined;
        return dto;
      });

    innovationUse.innovation_dev_result_id =
      await this.resolveLinkedInnovationDev(summary.linked_results ?? [], year);

    return innovationUse;
  }

  private mapInnovationUseActors(
    actors: InnovationUseSummaryMapper['current_section']['actors'],
  ): InnovationUseActorDto[] {
    const seen = new Set<string>();
    const mapped: InnovationUseActorDto[] = [];
    for (const actor of actors) {
      const actorTypeId = homologateInnovationUseActorType(
        actor?.actor_type_name,
      );
      if (!actorTypeId) {
        this.logger.warn(
          `Skipping PRMS innovation use actor type "${actor?.actor_type_name}": not homologated.`,
        );
        continue;
      }
      const isOther = actorTypeId === ClarisaActorTypesEnum.OTHER;
      const customName = isOther ? actor.other_actor_type?.trim() : undefined;
      if (isOther && !customName) continue;

      // STAR refuses a repeated actor type (or a repeated "Other" name).
      const key = `${actorTypeId}:${customName?.toLowerCase() ?? ''}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const dto = new InnovationUseActorDto();
      dto.actor_type_id = actorTypeId;
      dto.actor_type_custom_name = customName;
      // PRMS `true` = only the total is known, which is STAR's "not apply".
      dto.sex_age_disaggregation_not_apply = !!actor.sex_and_age_disaggregation;
      if (dto.sex_age_disaggregation_not_apply) {
        dto.actors_count = actor.how_many ?? undefined;
      } else {
        const womenYouth = actor.women_youth ?? 0;
        const menYouth = actor.men_youth ?? 0;
        dto.women_youth_count = womenYouth;
        dto.women_not_youth_count = Math.max(
          (actor.women ?? 0) - womenYouth,
          0,
        );
        dto.men_youth_count = menYouth;
        dto.men_not_youth_count = Math.max((actor.men ?? 0) - menYouth, 0);
      }
      mapped.push(dto);
    }
    return mapped;
  }

  /**
   * PRMS can list one organization type twice. An exact repeat is dropped;
   * different counts for the same type are added up, because the save
   * service keeps only one row per type.
   */
  private async mapInnovationUseOrganizations(
    organizations: InnovationUseSummaryMapper['current_section']['organizations'],
  ): Promise<InnovationUseOrganizationDto[]> {
    const byKey = new Map<
      string,
      { dto: InnovationUseOrganizationDto; counts: Set<number | null> }
    >();
    for (const org of organizations) {
      const typeName = org?.institution_type_name?.trim();
      if (!typeName) continue;
      const institutionType = await this.dataSource
        .getRepository(ClarisaInstitutionType)
        .findOne({ where: { name: typeName, is_active: true } });
      if (isEmpty(institutionType?.code)) {
        this.logger.warn(
          `Skipping PRMS innovation use organization type "${typeName}": not in the STAR catalog.`,
        );
        continue;
      }
      const selectable =
        await this.toSelectableInstitutionType(institutionType);
      const customName = org.other_institution?.trim() || undefined;
      const key = `${selectable.institution_type_id}:${selectable.sub_institution_type_id ?? ''}:${customName?.toLowerCase() ?? ''}`;
      const count = org.how_many ?? null;

      const existing = byKey.get(key);
      if (existing) {
        if (existing.counts.has(count)) continue;
        existing.counts.add(count);
        if (count !== null) {
          existing.dto.organization_count =
            (existing.dto.organization_count ?? 0) + count;
        }
        continue;
      }

      const dto = new InnovationUseOrganizationDto();
      dto.institution_type_id = selectable.institution_type_id;
      dto.sub_institution_type_id = selectable.sub_institution_type_id;
      dto.institution_type_custom_name = customName;
      dto.is_organization_known = false;
      dto.organization_count = count ?? undefined;
      byKey.set(key, { dto, counts: new Set([count]) });
    }
    return [...byKey.values()].map(({ dto }) => dto);
  }

  /**
   * STAR reports an organization as a root type plus, optionally, one direct
   * child as its sub-type: the type dropdown lists only `parent_code IS NULL`
   * rows, the sub-type dropdown only that root's children, and the Innovation
   * Use validation rejects anything else. PRMS sends the deepest type name,
   * so a child becomes root + child, and a grandchild becomes root + its
   * parent — the third level has no place in STAR and is dropped.
   */
  private async toSelectableInstitutionType(
    institutionType: ClarisaInstitutionType,
  ): Promise<{
    institution_type_id: number;
    sub_institution_type_id?: number;
  }> {
    const chain: ClarisaInstitutionType[] = [institutionType];
    const repo = this.dataSource.getRepository(ClarisaInstitutionType);
    // Bounded walk: the catalog is three levels deep; the limit only guards
    // against a malformed parent cycle.
    while (!isEmpty(chain[0].parent_code) && chain.length < 10) {
      const parent = await repo.findOne({
        where: { code: chain[0].parent_code },
      });
      if (isEmpty(parent?.code)) break;
      chain.unshift(parent);
    }
    return {
      institution_type_id: Number(chain[0].code),
      sub_institution_type_id:
        chain.length > 1 ? Number(chain[1].code) : undefined,
    };
  }

  /**
   * STAR links an Innovation Use to one Innovation Development. Takes the
   * first PRMS linked Innovation Development already in STAR, found by its
   * `prms_result_code` (or, for a PRMS-platform row, its official code),
   * preferring the same year. `undefined` when none is
   * there yet, so an existing link is kept and a later sync can fill it.
   */
  private async resolveLinkedInnovationDev(
    linkedResults: InnovationUseLinkedResultMapper[],
    year: number,
  ): Promise<number | undefined> {
    const codes = linkedResults
      .filter(
        (linked) =>
          linked?.result_type_id === PRMS_INNOVATION_DEVELOPMENT_TYPE_ID &&
          !isEmpty(linked.result_id),
      )
      .map((linked) => Number(linked.result_id))
      .filter((code) => Number.isInteger(code));

    const repository = this.dataSource.getRepository(Result);
    const base = {
      indicator_id: IndicatorsEnum.INNOVATION_DEV,
      is_active: true,
      is_snapshot: false,
    };
    for (const code of codes) {
      // A STAR row keeps the PRMS code in `prms_result_code`; a row the
      // PRMS fetch saved IS the PRMS code, as its official code.
      for (const where of [
        { ...base, prms_result_code: code },
        {
          ...base,
          result_official_code: code,
          platform_code: ReportingPlatformEnum.PRMS,
        },
      ]) {
        const target =
          (await repository.findOne({
            where: { ...where, report_year_id: year },
            select: { result_id: true },
          })) ??
          (await repository.findOne({
            where,
            select: { result_id: true },
            order: { report_year_id: 'DESC' },
          }));
        if (target) return target.result_id;
      }
    }
    return undefined;
  }

  private mapIpRightsFromQuestionnaire(
    questionnaire?: InnovationDevelopmentQuestionnaireMapper | null,
  ): UpdateIpRightDto | undefined {
    const questions = questionnaire?.intellectual_property_rights ?? [];
    if (isEmpty(questions)) return undefined;

    const ipRights = new UpdateIpRightDto();
    let mapped = false;

    for (const item of questions) {
      const answerText = item?.answer?.text;
      const option = IpRightsApplicationHomologation[answerText];
      if (isEmpty(option)) continue;

      if (
        item.question_id ===
        PrmsInnovationIpQuestionEnum.PRIVATE_SECTOR_ENGAGEMENT
      ) {
        ipRights.private_sector_engagement_id = option;
        mapped = true;
      }
      if (
        item.question_id ===
        PrmsInnovationIpQuestionEnum.FORMAL_IP_RIGHTS_APPLICATION
      ) {
        ipRights.formal_ip_rights_application_id = option;
        mapped = true;
      }
    }

    return mapped ? ipRights : undefined;
  }

  async processData(
    prmsData: PrmsTemporalResponseMapper[],
  ): Promise<ExternalMappersDto[]> {
    const results: ExternalMappersDto[] = [];
    for (const data of prmsData) {
      if (isEmpty(data?.data)) continue;
      const isVersion = data.is_version ?? false;
      const item = data.data;
      const indicator = IndicatorHomologation[item.indicator_category.code];
      if (!indicator) {
        this.logger.warn(
          `Skipping result ${item.result_code} because indicator ${item.indicator_category.code} is not homologated.`,
        );
        continue;
      }
      const result = new ExternalMappersDto();
      result.official_code = parseInt(item.result_code);
      result.is_version_applied = isVersion;
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
        let allianceUserStaff: AllianceUserStaff = null;
        if (isEmpty(item.created_by?.email)) {
          allianceUserStaff = await this.dataSource
            .getRepository(AllianceUserStaff)
            .findOne({
              where: {
                email: Like(
                  `%${item.created_by?.email?.trim()?.toLowerCase()}%`,
                ),
              },
            });
        }
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

      const prmsLever = await this.clarisaLeversService.findOne(
        item?.result_level?.code,
      );

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
            lever_id: prmsLever?.id ?? clarisaLever?.id,
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

      result.geoScope = await this.mapGeoScope(item);
      result.partners = await this.mapPartners(item);
      result.evidence = this.mapEvidence(item);

      if (indicator === IndicatorsEnum.POLICY_CHANGE) {
        result.policyChange = await this.mapPolicyChange(
          item.policy_change_summary,
        );
      }

      if (indicator === IndicatorsEnum.CAPACITY_SHARING_FOR_DEVELOPMENT) {
        result.capacitySharing = await this.mapCapacitySharing(
          item.capacity_development_summary,
        );
      }

      if (indicator === IndicatorsEnum.INNOVATION_DEV) {
        const mapped = await this.mapInnovationDev(
          item.innovation_development_summary,
        );
        result.innovationDev = mapped.innovationDev;
        result.ipRights = mapped.ipRights;
      }

      if (indicator === IndicatorsEnum.INNOVATION_USE) {
        result.innovationUse = await this.mapInnovationUse(
          item.innovation_use_summary,
          parseInt(item.year),
        );
      }

      results.push(result);
    }
    return results;
  }
}
