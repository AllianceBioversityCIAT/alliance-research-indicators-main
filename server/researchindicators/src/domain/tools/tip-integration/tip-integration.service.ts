import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
} from '@nestjs/common';
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
  TipMappedResult,
  TipRegionDto,
  TipTocMappingDto,
} from './dto/response-year-tip.dto';
import { mapTipProjects } from './mapper/tip-projects.mapper';
import { AgressoContract } from '../../entities/agresso-contract/entities/agresso-contract.entity';
import { BilateralService } from '../../entities/bilateral/bilateral.service';
import { TocResult } from '../toc-integration/dto/toc-integration.types';
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
import { DataSource, In, Like } from 'typeorm';
import { ReportingPlatformEnum } from '../../entities/results/enum/reporting-platform.enum';
import { QueryService } from '../../shared/utils/query.service';
import { ResultKnowledgeProductService } from '../../entities/result-knowledge-product/result-knowledge-product.service';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';
import { ReportingYearResolver } from '../../shared/utils/reporting-year.resolver';

import { TipIntegrationRepository } from './repository/tip-integration.repository';
import { SyncProcessLogService } from '../../entities/sync-process-log/sync-process-log.service';
import { SyncProcessEnum } from '../../entities/sync-process-log/enum/sync-process.enum';
import { ExternalMappersDto } from '../../shared/global-dto/external-mappers.dto';
import {
  ExtraData,
  SaveAllSectionsResult,
  SaveResultService,
} from '../../shared/services/save-all-sections.service';
import {
  TipHandleRepository,
  TipHandleResolution,
} from './repository/tip-handle.repository';
import { v4 as uuidv4 } from 'uuid';
import { SyncStagingRecordsEntity } from '../open-search/prms/entities/sync-staging-records.entity';
import { PrmsRepository } from '../open-search/prms/repositories/prms.repository';
import { TemportalDataResponse } from '../open-search/prms/dto/prms-response.dto';
import { ResultSdg } from '../../entities/result-sdgs/entities/result-sdg.entity';
import { ClarisaSdgsService } from '../clarisa/entities/clarisa-sdgs/clarisa-sdgs.service';
import { ResultStatusEnum } from '../../entities/result-status/enum/result-status.enum';
import { SecUser } from '../../complementary-entities/secondary/user/dto/sec-user.dto';
import {
  PrmsSyncPersistedRefusalException,
  ResultPrmsSyncService,
} from '../../entities/result-prms-sync/result-prms-sync.service';
import { PrmsSyncOutcome } from '../prms-normalizer/enum/prms-sync-outcome.enum';

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
    private readonly prmsRepository: PrmsRepository,
    private readonly clarisaSdgsService: ClarisaSdgsService,
    private readonly bilateralService: BilateralService,
    private readonly tipHandleRepository: TipHandleRepository,
    private readonly resultPrmsSyncService: ResultPrmsSyncService,
    private readonly reportingYearResolver: ReportingYearResolver,
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

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Case Study publications are out of scope for ARI, so they never reach staging
  private isCaseStudy(product: TipKnowledgeProductDto): boolean {
    return (
      product?.type?.some(
        (type) => type?.trim()?.toLowerCase() === 'case study',
      ) ?? false
    );
  }

  private async saveTemporalData(
    year: number,
    executionCode: string,
  ): Promise<number> {
    let pendingData = true;
    let offset = 0;
    const limit = 50;
    let failedSaves = 0;
    // TIP throttles repeated calls ("Too Many Attempts."), so pace the pagination
    const delayBetweenRequestsMs = 1000;
    while (pendingData) {
      const response = await firstValueFrom(
        this.getRequest<TipKnowledgeProductsResponseDto>(
          `/publications?year=${year}&limit=${limit}&offset=${offset}`,
          {
            headers: {
              Authorization: 'Bearer ' + this.token,
            },
          },
        ),
      )
        .then((response) => response?.data)
        .catch(async (error) => {
          this.logger.error(
            `Error fetching knowledge products from TIP: ${error.message}`,
          );
          throw new BadRequestException(
            'Error fetching knowledge products from TIP',
          );
        });

      const itemsToStage =
        response?.data?.filter((item) => !this.isCaseStudy(item)) ?? [];

      const pageFailures = await Promise.all(
        itemsToStage.map(async (item) => {
          try {
            await this.dataSource.getRepository(SyncStagingRecordsEntity).save({
              execution_code: executionCode,
              code: item.id,
              year,
              data: item,
            });
            return 0;
          } catch (error) {
            const failure = error as { message?: string; stack?: string };
            this.logger.error(
              `Error saving temporal result ${item.name}: ${failure.message} \n ${failure.stack}`,
            );
            return 1;
          }
        }),
      );
      failedSaves += pageFailures.reduce((sum, failed) => sum + failed, 0);

      if (response?.data_count < limit || isEmpty(response?.data_count)) {
        pendingData = false;
      } else {
        offset += limit;
        await this.sleep(delayBetweenRequestsMs);
      }
    }
    return failedSaves;
  }

  async getKnowledgeProductsByYear(year?: number) {
    const runAlreadyInProgress =
      await this.syncProcessLogService.isInProgressYoungerThan(
        SyncProcessEnum.TIP_INTEGRATION,
        6,
      );
    if (runAlreadyInProgress) {
      this.logger.warn('TIP sync refused: a run is already in progress');
      throw new ConflictException('TIP sync already in progress');
    }

    const executionCode = uuidv4();
    let syncProcessLogId: number | undefined;
    const counters: CounterResults = new CounterResults();
    let stagingFailures = 0;
    let skippedRecords = 0;
    try {
      const resultSaved: number[] = [];
      const syncProcessLog = await this.syncProcessLogService.initiateSync(
        SyncProcessEnum.TIP_INTEGRATION,
      );
      syncProcessLogId = syncProcessLog?.id;
      const endYeard = year ?? new Date().getFullYear();
      let currentYear = year ?? 2021;
      for (currentYear; currentYear <= endYeard; currentYear++) {
        this.logger.log(`Saving temporal data for year ${currentYear}`);
        stagingFailures += await this.saveTemporalData(
          currentYear,
          executionCode,
        );
      }

      const tipResults =
        await this.prmsRepository.findTemporalResults<TipKnowledgeProductDto>(
          executionCode,
        );
      const dataProcessed = await this.processing(tipResults);
      const catalogMemo = new Map<string, TocResult[] | null>();
      const batchExtra: ExtraData<ExternalMappersDto> = {
        platformCode: ReportingPlatformEnum.TIP,
        resultSaved,
        counters,
        manageOfficialCode: true,
      };
      const pushCandidates: TipPushCandidate[] = [];
      skippedRecords = await this.persistHandles(
        dataProcessed,
        batchExtra,
        catalogMemo,
        pushCandidates,
      );
      this.logTipRunSummary(stagingFailures, counters, skippedRecords);
      await this.syncProcessLogService.update(syncProcessLog.id, counters);
      await this.pushToPrms(pushCandidates);
      await this.syncProcessLogService.endSync(syncProcessLog.id);
    } catch (error) {
      this.logger.error(
        `Error saving temporal data: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      this.logTipRunSummary(stagingFailures, counters, skippedRecords);
      if (syncProcessLogId != null) {
        await this.syncProcessLogService
          .markFailed(syncProcessLogId)
          .catch((markError) => {
            const message =
              markError instanceof Error ? markError.message : 'Unknown error';
            this.logger.error(
              `Error marking sync process log ${syncProcessLogId} as FAILED: ${message}`,
            );
          });
      }
      throw new BadRequestException('Error saving temporal data');
    } finally {
      await this.prmsRepository.deleteTemporalResults(executionCode);
    }
  }

  async processing(
    results: TemportalDataResponse<TipKnowledgeProductDto>[],
  ): Promise<TipMappedResult[]> {
    const knownAgreementIds = await this.loadKnownAgreementIds(results);
    const resultsMapped: TipMappedResult[] = [];
    for (const data of results) {
      const year = data?.year;
      if (isEmpty(data?.data)) continue;
      const result = data.data;
      const resultMapped = new TipMappedResult();
      // TIP API no longer returns id — blocked until TIP restores the field
      resultMapped.official_code = null;
      resultMapped.is_version_applied = data.is_version ?? false;
      resultMapped.public_link = result.link;
      resultMapped.created_at = new Date(result.created_at);
      resultMapped.status_id = ResultStatusEnum.COMPLETED_IN_TIP;

      const mappedProjects = mapTipProjects(
        result.project,
        knownAgreementIds,
        result.id,
        this.logger,
      );

      resultMapped.createResult = {
        title: result.name,
        year: year,
        description: result.abstract,
        indicator_id: IndicatorsEnum.KNOWLEDGE_PRODUCT,
        contract_id: mappedProjects.createContractId,
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

      const keywords = result.keywords?.map((keyword) => keyword?.trim());

      resultMapped.generalInformation = {
        title: result.name,
        year: year,
        description: result.abstract,
        main_contact_person: !isEmpty(carnet)
          ? ({
              user_id: carnet,
            } as ResultUser)
          : null,
        keywords: keywords,
      };

      const saveSdgs = await this.clarisaSdgsService.findSdgByTipFormat(
        result.sdgs,
      );
      const sdgs: Partial<ResultSdg>[] = saveSdgs.map((sdg) => ({
        clarisa_sdg_id: sdg.id,
      }));

      const primaryLever = await this.mapLevers(result.levers);
      resultMapped.alignments = {
        primary_levers: primaryLever.map<ResultLever>(
          (lever) =>
            ({
              lever_id: lever.id,
            }) as unknown as ResultLever,
        ),
        contracts: mappedProjects.contracts as ResultContract[],
        contributor_levers: [],
        result_sdgs: sdgs as ResultSdg[],
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

      const collection = result.collection?.join('; ');
      resultMapped.knowledgeProduct = {
        type: result.type.join(', '),
        citation: result.citation,
        open_access: result.access_status === 'Open Access',
        access_status: result.access_status,
        publication_date: result.publication_date,
        collection,
        tip_id: result.id,
      } as ResultKnowledgeProduct;

      resultMapped.poolFunding = mappedProjects.poolFunding;
      resultsMapped.push(resultMapped);
    }
    return resultsMapped;
  }

  private async loadKnownAgreementIds(
    results: TemportalDataResponse<TipKnowledgeProductDto>[],
  ): Promise<Set<string>> {
    const ids: string[] = [];
    const seen = new Set<string>();
    for (const data of results) {
      if (isEmpty(data?.data)) continue;
      const project = data.data.project;
      const items =
        project == null ? [] : Array.isArray(project) ? project : [project];
      for (const item of items) {
        const agreementId = item?.agreement_id;
        if (agreementId == null || agreementId === '' || seen.has(agreementId))
          continue;
        seen.add(agreementId);
        ids.push(agreementId);
      }
    }
    if (ids.length === 0) return new Set();
    const rows = await this.dataSource.getRepository(AgressoContract).find({
      where: { agreement_id: In(ids) },
      select: { agreement_id: true },
    });
    return new Set(rows.map((row) => row.agreement_id));
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

  private logTipRunSummary(
    stagingFailures: number,
    counters: CounterResults,
    skippedRecords: number,
  ): void {
    this.logger.log(
      `TIP run summary: staging failures ${stagingFailures}, created ${counters.createdRecords}, updated ${counters.updatedRecords}, skipped ${skippedRecords}, error ${counters.errorRecords}`,
    );
  }

  /**
   * One payload per handle per year. Empty links and repeated years are
   * warned and dropped; the first staging-order payload wins.
   */
  private groupByHandle(
    rows: TipMappedResult[],
  ): Map<string, Map<number, TipMappedResult>> {
    const grouped = new Map<string, Map<number, TipMappedResult>>();
    for (const row of rows) {
      const handle = row.public_link;
      if (isEmpty(handle)) {
        this.logger.warn('TIP row skipped: empty public link');
        continue;
      }
      let byYear = grouped.get(handle);
      if (!byYear) {
        byYear = new Map();
        grouped.set(handle, byYear);
      }
      const year = row.createResult?.year;
      if (byYear.has(year)) {
        this.logger.warn(
          `TIP handle ${handle}: repeated year ${year}; first payload kept`,
        );
        continue;
      }
      byYear.set(year, row);
    }
    return grouped;
  }

  private async persistHandles(
    rows: TipMappedResult[],
    batchExtra: ExtraData<ExternalMappersDto>,
    catalogMemo: Map<string, TocResult[] | null>,
    pushCandidates: TipPushCandidate[],
  ): Promise<number> {
    let skipped = 0;
    for (const [handle, byYear] of this.groupByHandle(rows)) {
      try {
        skipped += await this.syncHandle(
          handle,
          byYear,
          batchExtra,
          catalogMemo,
          pushCandidates,
        );
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown error';
        this.logger.error(`Error saving TIP handle ${handle}: ${message}`);
        if (batchExtra.counters) {
          batchExtra.counters.errorRecords += 1;
        }
      }
    }
    return skipped;
  }

  private warnRowsNotPicked(
    handle: string,
    resolution: TipHandleResolution,
  ): void {
    if (resolution.otherLive.length > 0) {
      const ids = resolution.otherLive.map((row) => row.result_id).join(', ');
      this.logger.warn(
        `TIP handle ${handle}: extra live rows not picked: ${ids}`,
      );
    }
    if (resolution.otherVersions.length > 0) {
      const ids = resolution.otherVersions
        .map((row) => row.result_id)
        .join(', ');
      this.logger.warn(
        `TIP handle ${handle}: extra version rows not picked: ${ids}`,
      );
    }
  }

  /**
   * Live code, else the highest existing version's code, else one new TIP code.
   * Minted once per handle so the version and the live row share it.
   */
  private async officialCodeFor(
    resolution: TipHandleResolution,
  ): Promise<number> {
    if (resolution.live?.result_official_code != null) {
      return resolution.live.result_official_code;
    }
    const versionRows = Object.values(resolution.versions);
    if (versionRows.length > 0) {
      const highest = versionRows.reduce((best, row) =>
        row.report_year_id > best.report_year_id ? row : best,
      );
      if (highest.result_official_code != null) {
        return highest.result_official_code;
      }
    }
    return this.resultsService.newOfficialCode(ReportingPlatformEnum.TIP);
  }

  private async syncHandle(
    handle: string,
    byYear: Map<number, TipMappedResult>,
    batchExtra: ExtraData<ExternalMappersDto>,
    catalogMemo: Map<string, TocResult[] | null>,
    pushCandidates?: TipPushCandidate[],
  ): Promise<number> {
    const resolution = await this.tipHandleRepository.resolve(handle);
    this.warnRowsNotPicked(handle, resolution);
    const officialCode = await this.officialCodeFor(resolution);
    const years = [...byYear.keys()].sort((left, right) => left - right);
    const savedYears: number[] = [];
    const outcomeByYear = new Map<number, SaveAllSectionsResult['outcome']>();
    const pendingImports: TipPoolImport[] = [];
    let skipped = 0;

    try {
      for (const year of years) {
        const source = byYear.get(year)!;
        const versionId = resolution.versions[year]?.result_id;
        const saved = await this.saveResultService.saveAllSections(
          this.payloadForSave(source),
          {
            ...batchExtra,
            target: {
              ...(versionId != null ? { resultId: versionId } : {}),
              officialCode,
              isSnapshot: true,
            },
          },
        );
        outcomeByYear.set(year, saved.outcome);
        skipped += this.collectSaved(
          saved,
          year,
          source,
          pendingImports,
          savedYears,
          pushCandidates,
        );
      }

      const existingYears = Object.keys(resolution.versions).map((year) =>
        Number(year),
      );
      const candidates = [...savedYears, ...existingYears];
      if (candidates.length > 0) {
        const liveYear = Math.max(...candidates);
        const cameFromThisRun = savedYears.includes(liveYear);
        const notBelowLive =
          resolution.live == null || liveYear >= resolution.live.report_year_id;
        if (cameFromThisRun && notBelowLive) {
          const source = byYear.get(liveYear)!;
          const liveId = resolution.live?.result_id;
          const saved = await this.saveResultService.saveAllSections(
            this.payloadForSave(source),
            {
              ...batchExtra,
              target: {
                ...(liveId != null ? { resultId: liveId } : {}),
                officialCode,
                isSnapshot: false,
                compensateRowOnly: true,
              },
            },
          );
          skipped += this.collectSaved(saved, liveYear, source, pendingImports);
        }
      }

      if (years.length > 0) {
        const highestRunYear = Math.max(...years);
        if (outcomeByYear.get(highestRunYear) === 'skipped') {
          this.logger.warn(
            `TIP handle ${handle}: highest year ${highestRunYear} skipped as a duplicate`,
          );
        }
      }
    } finally {
      await this.importPoolFunding(pendingImports, catalogMemo);
    }
    return skipped;
  }

  /**
   * saveAllSections writes stored lever rows back onto the payload object.
   * Each call gets its own copy so a version save cannot move those rows
   * onto the live save. structuredClone keeps Dates. The payload is a
   * property bag: setSystemUser only reads sec_user_id, email and roles.
   */
  private payloadForSave(payload: TipMappedResult): TipMappedResult {
    return structuredClone(payload);
  }

  /**
   * Only created and updated rows are saved. A skipped or error outcome
   * must not become the live year and must not receive Pool Funding.
   * A push candidate is recorded only when the caller passes the list,
   * which the version save does and the live save does not.
   */
  private collectSaved(
    saved: SaveAllSectionsResult,
    year: number,
    payload: TipMappedResult,
    pendingImports: TipPoolImport[],
    savedYears?: number[],
    pushCandidates?: TipPushCandidate[],
  ): number {
    if (saved.outcome === 'skipped') return 1;
    if (
      (saved.outcome === 'created' || saved.outcome === 'updated') &&
      saved.resultId != null
    ) {
      savedYears?.push(year);
      pushCandidates?.push({
        resultId: saved.resultId,
        year,
        tocMapping: payload.poolFunding ?? null,
        userData: payload.userData ?? null,
      });
      if (payload.poolFunding != null) {
        pendingImports.push({
          resultId: saved.resultId,
          year,
          mapping: payload.poolFunding,
          payload,
        });
      }
    }
    return 0;
  }

  private async importPoolFunding(
    rows: TipPoolImport[],
    catalogMemo: Map<string, TocResult[] | null>,
  ): Promise<void> {
    for (const row of rows) {
      try {
        await this.bilateralService.importAlignmentFromTip(
          row.resultId,
          row.mapping,
          row.year,
          row.payload.userData?.sec_user_id ?? null,
          catalogMemo,
        );
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown error';
        const tipId = row.payload.knowledgeProduct?.tip_id;
        this.logger.error(
          `Error importing TIP pool funding for TIP ${tipId} ${row.payload.public_link} (${row.year}): ${message}`,
        );
      }
    }
  }

  /**
   * One PRMS call at a time, after every handle is saved. A failure here
   * is logged and swallowed so the TIP run still reaches endSync.
   * PrmsSyncPersistedRefusalException extends UnprocessableEntityException,
   * so it is classified before any other HttpException.
   */
  private async pushToPrms(raw: TipPushCandidate[]): Promise<void> {
    const started = Date.now();
    try {
      const reportingYear = await this.reportingYearResolver.resolve();
      const seen = new Set<number>();
      const candidates: TipPushCandidate[] = [];
      for (const candidate of raw) {
        if (candidate.year !== reportingYear || seen.has(candidate.resultId)) {
          continue;
        }
        seen.add(candidate.resultId);
        candidates.push(candidate);
      }
      if (candidates.length === 0) {
        this.logger.log('PRMS push: candidates=0');
        return;
      }

      const outcomes = zeroPushOutcomes();
      let skipped = 0;
      let notEligible = 0;
      const pending: TipPushReady[] = [];
      for (const candidate of candidates) {
        if (candidate.tocMapping == null) {
          notEligible += 1;
        } else {
          pending.push({ ...candidate, tocMapping: candidate.tocMapping });
        }
      }

      const codedIds =
        pending.length === 0
          ? []
          : await this.tipHandleRepository.idsWithPrmsCode(
              pending.map((candidate) => candidate.resultId),
            );
      const coded = new Set(codedIds);
      const toSend: TipPushReady[] = [];
      for (const candidate of pending) {
        if (coded.has(candidate.resultId)) {
          skipped += 1;
        } else {
          toSend.push(candidate);
        }
      }

      let notSent = 0;
      let errors = 0;
      for (const candidate of toSend) {
        try {
          this._currentUser.setSystemUser(candidate.userData as SecUser, true);
          const synced = await this.resultPrmsSyncService.sync(
            candidate.resultId,
            {
              origin: 'TIP_SYNC',
              tocMapping: candidate.tocMapping,
              author: authorForPush(candidate.userData),
            },
          );
          bumpPushOutcome(outcomes, synced.outcome);
        } catch (error) {
          if (error instanceof PrmsSyncPersistedRefusalException) {
            outcomes[PrmsSyncOutcome.REFUSED_BY_STAR] += 1;
          } else if (error instanceof HttpException) {
            notSent += 1;
            this.logger.warn(
              `PRMS push NOT_SENT result ${candidate.resultId} status=${error.getStatus()} message=${error.message}`,
            );
          } else {
            errors += 1;
            const message =
              error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(
              `PRMS push ERROR result ${candidate.resultId}: ${message}`,
            );
          }
        } finally {
          this._currentUser.clearSystemUser();
        }
      }

      this.logger.log(
        formatPrmsPushSummary(
          candidates.length,
          skipped,
          notEligible,
          outcomes,
          notSent,
          errors,
          Date.now() - started,
        ),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`PRMS push phase failed: ${message}`);
    }
  }
}

type TipPoolImport = {
  resultId: number;
  year: number;
  mapping: NonNullable<TipMappedResult['poolFunding']>;
  payload: TipMappedResult;
};

type TipPushCandidate = {
  resultId: number;
  year: number;
  tocMapping: TipTocMappingDto | null;
  userData: SecUser | null;
};

type TipPushReady = TipPushCandidate & { tocMapping: TipTocMappingDto };

const PUSH_OUTCOME_KEYS = [
  PrmsSyncOutcome.ACCEPTED,
  PrmsSyncOutcome.REJECTED_BY_PRMS,
  PrmsSyncOutcome.REFUSED_BY_STAR,
  PrmsSyncOutcome.RETRYABLE,
  PrmsSyncOutcome.AUTH_FAILED,
  PrmsSyncOutcome.TRANSPORT_FAILED,
  PrmsSyncOutcome.UNKNOWN,
] as const;

type PushOutcomeKey = (typeof PUSH_OUTCOME_KEYS)[number];
type PushOutcomeCounts = Record<PushOutcomeKey, number>;

function zeroPushOutcomes(): PushOutcomeCounts {
  return {
    [PrmsSyncOutcome.ACCEPTED]: 0,
    [PrmsSyncOutcome.REJECTED_BY_PRMS]: 0,
    [PrmsSyncOutcome.REFUSED_BY_STAR]: 0,
    [PrmsSyncOutcome.RETRYABLE]: 0,
    [PrmsSyncOutcome.AUTH_FAILED]: 0,
    [PrmsSyncOutcome.TRANSPORT_FAILED]: 0,
    [PrmsSyncOutcome.UNKNOWN]: 0,
  };
}

function bumpPushOutcome(
  outcomes: PushOutcomeCounts,
  outcome: PrmsSyncOutcome,
): void {
  if (Object.prototype.hasOwnProperty.call(outcomes, outcome)) {
    outcomes[outcome as PushOutcomeKey] += 1;
  }
}

function authorForPush(user: SecUser | null): {
  email: string;
  first_name: string;
  last_name: string;
} | null {
  if (user == null) {
    return null;
  }
  return {
    email: user.email,
    first_name: user.first_name ?? '',
    last_name: user.last_name ?? '',
  };
}

function formatPrmsPushSummary(
  candidates: number,
  skipped: number,
  notEligible: number,
  outcomes: PushOutcomeCounts,
  notSent: number,
  errors: number,
  durationMs: number,
): string {
  const outcomeText = PUSH_OUTCOME_KEYS.map(
    (key) => `${key}=${outcomes[key]}`,
  ).join(' ');
  return (
    `PRMS push: candidates=${candidates} skipped=${skipped} ` +
    `not_eligible=${notEligible} ${outcomeText} NOT_SENT=${notSent} ` +
    `ERROR=${errors} duration_ms=${durationMs}`
  );
}
