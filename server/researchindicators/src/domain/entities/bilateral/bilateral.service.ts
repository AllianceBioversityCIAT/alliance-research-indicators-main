import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  NotImplementedException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { User } from '../../complementary-entities/secondary/user/user.entity';
import { ResultRepository } from '../results/repositories/result.repository';
import {
  AlignmentResponse,
  SelectedScienceProgramResponse,
  UpdatePoolFundingAlignmentDto,
} from './dto/update-pool-funding-alignment.dto';
import { ClarisaScienceProgramsService } from '../../tools/clarisa/entities/clarisa-science-programs/clarisa-science-programs.service';
import { ClarisaProjectsService } from '../../tools/clarisa/projects/clarisa-projects.service';
import { PrmsTocService } from '../../tools/prms-toc/prms-toc.service';
import { BilateralProjectMappingService } from '../bilateral-project-mapping/bilateral-project-mapping.service';
import {
  BilateralScienceProgramItem,
  BilateralScienceProgramsResponse,
} from './dto/bilateral-science-programs.response.dto';
import {
  BilateralHlosIndicatorsResponse,
  BilateralHlosPair,
} from './dto/bilateral-hlos-indicators.response.dto';
import { ENV } from '../../shared/utils/env.utils';
import {
  IndicatorGroupResponse,
  IndicatorPanelIndicatorResponse,
  ListIndicatorsQueryDto,
} from './dto/list-indicators-query.dto';
import {
  ContributionDto,
  MappingResponse,
} from './dto/upsert-indicator-mapping.dto';
import { ReviewDecisionDto } from './dto/review-decision.dto';
import {
  PoolFundingAlignmentDetail,
  ResultPoolFundingAlignmentRepository,
} from './repositories/result-pool-funding-alignment.repository';
import { ResultPoolFundingAlignment } from './entities/result-pool-funding-alignment.entity';
import { ResultPoolFundingAlignmentSp } from './entities/result-pool-funding-alignment-sp.entity';
import { ResultReviewHistory } from '../result-review-history/entities/result-review-history.entity';
import { ServerGateway } from '../../tools/socket/server.gateway';
import {
  PoolFundingIndicatorMappingDetail,
  ResultPoolFundingIndicatorMappingRepository,
} from './repositories/result-pool-funding-indicator-mapping.repository';
import { ResultPoolFundingIndicatorMapping } from './entities/result-pool-funding-indicator-mapping.entity';
import { BilateralIndicatorTypeHandler } from './handlers/bilateral-indicator-type-handler.interface';
import { CapacitySharingBilateralIndicatorTypeHandler } from './handlers/capacity-sharing.handler';
import { InnovationDevelopmentBilateralIndicatorTypeHandler } from './handlers/innovation-development.handler';
import { KnowledgeProductBilateralIndicatorTypeHandler } from './handlers/knowledge-product.handler';
import { NoopBilateralIndicatorTypeHandler } from './handlers/noop.handler';
import { PolicyChangeBilateralIndicatorTypeHandler } from './handlers/policy-change.handler';

const POOL_FUNDING_ALIGNMENT_CHANGED = 'POOL_FUNDING_ALIGNMENT_CHANGED';
const INDICATOR_MAPPING_CHANGED = 'INDICATOR_MAPPING_CHANGED';

/**
 * SINGLETON-SCOPED BY DESIGN — see docs/specs/bilateral-module/design.md §3.4 Constraint A.
 *
 * DO NOT inject CurrentUserUtil, ResultsUtil, or any other REQUEST-scoped provider
 * into this class. Doing so would force BilateralService into REQUEST scope, which
 * cascades through the ResultsService ↔ ResultOicrService forwardRef cycle and
 * produces empty-shell ResultsService instances at request time (breaks v2/results).
 *
 * User info and the per-request resultId are passed as method parameters from
 * BilateralController, which IS allowed to be REQUEST-scoped.
 */
@Injectable()
export class BilateralService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly resultRepository: ResultRepository,
    private readonly alignmentRepository: ResultPoolFundingAlignmentRepository,
    private readonly mappingRepository: ResultPoolFundingIndicatorMappingRepository,
    private readonly serverGateway: ServerGateway,
    private readonly capacitySharingHandler: CapacitySharingBilateralIndicatorTypeHandler,
    private readonly innovationDevelopmentHandler: InnovationDevelopmentBilateralIndicatorTypeHandler,
    private readonly knowledgeProductHandler: KnowledgeProductBilateralIndicatorTypeHandler,
    private readonly noopHandler: NoopBilateralIndicatorTypeHandler,
    private readonly policyChangeHandler: PolicyChangeBilateralIndicatorTypeHandler,
    private readonly clarisaScienceProgramsService: ClarisaScienceProgramsService,
    private readonly clarisaProjectsService: ClarisaProjectsService,
    private readonly bilateralProjectMappingService: BilateralProjectMappingService,
    private readonly prmsTocService: PrmsTocService,
  ) {}

  /**
   * @sdd-spec docs/specs/bilateral-module/pending-items — T-15.11 / R-BIL-076 / R-BIL-078
   *
   * Per-result Science Programs picker source. Chain:
   *   result → result_contracts (primary, active) → agresso_contracts.agreement_id
   *          → bilateral_project_mapping (active) → CLARISA project_mappings_array
   *
   * Filters: only `status === "Confirmed"` AND `portfolio.acronym === activePortfolio`
   * (env-driven, default `P25`). Display fields (color / icon_key) enriched from
   * the local clarisa_science_programs catalog (now a display-only fallback,
   * per D-PI-10).
   *
   * Always returns 200. `mapping_status === "unmapped"` covers both
   * "no AGRESSO contract" and "no active mapping row" — the FE renders the
   * same affordance either way ("Contact admin to link this contract").
   */
  async getScienceProgramsForResult(
    resultId: number,
    resultCode: string,
  ): Promise<BilateralScienceProgramsResponse> {
    const context =
      await this.resultRepository.findPoolFundingAlignmentContext(resultId);

    if (!context) {
      throw new NotFoundException('Result not found');
    }

    const agreementId = context.agresso_agreement_id?.trim();
    const baseResponse = {
      result_code: String(context.result_official_code ?? resultCode),
    };

    if (!agreementId) {
      return {
        ...baseResponse,
        mapping_status: 'unmapped',
        clarisa_project: null,
        science_programs: [],
      };
    }

    const mapping =
      await this.bilateralProjectMappingService.findActiveByAgreementId(
        agreementId,
      );

    if (!mapping) {
      return {
        ...baseResponse,
        mapping_status: 'unmapped',
        clarisa_project: null,
        science_programs: [],
      };
    }

    const project = await this.clarisaProjectsService.findProjectById(
      mapping.clarisa_project_id,
    );

    if (!project) {
      // Mapping points at a project CLARISA no longer exposes — treat as
      // unmapped from the picker's perspective, but surface the snapshot
      // we have so ops can spot the drift.
      return {
        ...baseResponse,
        mapping_status: 'unmapped',
        clarisa_project: {
          id: mapping.clarisa_project_id,
          short_name: mapping.clarisa_project_short_name ?? '',
        },
        science_programs: [],
      };
    }

    const activePortfolio = ENV.BILATERAL_ACTIVE_PORTFOLIO;
    const filteredMappings = (project.project_mappings_array ?? []).filter(
      (m) =>
        m.status === 'Confirmed' &&
        m.global_unit_object?.portfolio_object?.acronym === activePortfolio,
    );

    const catalog = await this.clarisaScienceProgramsService.findAll();
    const catalogByCode = new Map(catalog.map((sp) => [sp.official_code, sp]));

    const science_programs: BilateralScienceProgramItem[] = filteredMappings
      .map((m) => {
        const code = m.global_unit_object.smo_code;
        const fallback = catalogByCode.get(code);
        return {
          code,
          name: (m.global_unit_object.name ?? fallback?.name ?? code).trim(),
          category:
            m.global_unit_object.cgiar_entity_type_object?.name ??
            fallback?.category ??
            null,
          color: fallback?.color ?? null,
          icon_key: fallback?.icon_key ?? null,
          allocation: typeof m.allocation === 'number' ? m.allocation : null,
        };
      })
      // Stable order: by code so the FE picker is deterministic.
      .sort((a, b) => a.code.localeCompare(b.code));

    return {
      ...baseResponse,
      mapping_status: 'mapped',
      clarisa_project: { id: project.id, short_name: project.short_name },
      science_programs,
    };
  }

  /**
   * @sdd-spec docs/specs/bilateral-module/pending-items — T-15.12 / R-BIL-077
   *
   * HLO/indicator panel data source. Walks the same chain as the SP picker
   * (result → AGRESSO → bilateral_project_mapping → CLARISA project), then
   * derives (program, areaOfWork) pairs from the CLARISA project's
   * `project_mappings_array[]`:
   *
   *   - Level-1 SP entries (prefix "SP") are the *programs*.
   *   - Level-2 AOW entries (prefix "AOW", `parent_id` → SP.id) are the
   *     *areaOfWork* values. Each AOW yields one (parent_SP, AOW) pair.
   *
   * For each pair we call `PrmsTocService.getTocResults` (cached per pair),
   * group the response under the pair, and return all of them under a single
   * `pairs[]`. The endpoint always returns 200 — see `aow_status` for the
   * three valid empty-`pairs` states (`unmapped`, `no_aow_mappings`).
   *
   * Why AOW must come from CLARISA: PRMS requires `areaOfWork` (400 without)
   * and exposes no `/aow-by-program` listing endpoint we can probe; CLARISA
   * already carries the AOW mappings on each project — see
   * `./execution.md` T-15.12 entry for the live-probe evidence.
   */
  async getHlosIndicatorsForResult(
    resultId: number,
    resultCode: string,
  ): Promise<BilateralHlosIndicatorsResponse> {
    const context =
      await this.resultRepository.findPoolFundingAlignmentContext(resultId);

    if (!context) {
      throw new NotFoundException('Result not found');
    }

    const baseResponse = {
      result_code: String(context.result_official_code ?? resultCode),
    };
    const agreementId = context.agresso_agreement_id?.trim();

    if (!agreementId) {
      return {
        ...baseResponse,
        mapping_status: 'unmapped',
        aow_status: 'unmapped',
        clarisa_project: null,
        pairs: [],
      };
    }

    const mapping =
      await this.bilateralProjectMappingService.findActiveByAgreementId(
        agreementId,
      );

    if (!mapping) {
      return {
        ...baseResponse,
        mapping_status: 'unmapped',
        aow_status: 'unmapped',
        clarisa_project: null,
        pairs: [],
      };
    }

    const project = await this.clarisaProjectsService.findProjectById(
      mapping.clarisa_project_id,
    );

    if (!project) {
      return {
        ...baseResponse,
        mapping_status: 'unmapped',
        aow_status: 'unmapped',
        clarisa_project: {
          id: mapping.clarisa_project_id,
          short_name: mapping.clarisa_project_short_name ?? '',
        },
        pairs: [],
      };
    }

    const projectRef = { id: project.id, short_name: project.short_name };
    const pairs = this.derivePairsFromProjectMappings(project);

    if (!pairs.length) {
      // Project is mapped, but its CLARISA project_mappings_array carries
      // only SP-level entries (no AOWs) — PRMS cannot answer without an
      // AOW, so we surface this distinct state for the FE.
      return {
        ...baseResponse,
        mapping_status: 'mapped',
        aow_status: 'no_aow_mappings',
        clarisa_project: projectRef,
        pairs: [],
      };
    }

    const payloads = await this.prmsTocService.getTocResultsForPairs(pairs);
    const enrichedPairs: BilateralHlosPair[] = pairs.map((p, i) => {
      const payload = payloads[i];
      const outcomes = payload.tocResultsOutcomes ?? [];
      const outputs = payload.tocResultsOutputs ?? [];
      return {
        program: p.program,
        area_of_work: p.areaOfWork,
        composite_code: payload.compositeCode ?? `${p.program}-${p.areaOfWork}`,
        outcomes,
        outputs,
        metadata: {
          total: outcomes.length + outputs.length,
          outcomes: outcomes.length,
          outputs: outputs.length,
        },
      };
    });

    return {
      ...baseResponse,
      mapping_status: 'mapped',
      aow_status: 'has_aow',
      clarisa_project: projectRef,
      pairs: enrichedPairs,
    };
  }

  /**
   * @sdd-spec docs/specs/bilateral-module/pending-items — T-15.12
   *
   * Walks a CLARISA project's `project_mappings_array[]`, picks Confirmed
   * AOW entries in the active portfolio, and pairs each one with its parent
   * SP via `global_unit_object.parent_id` → SP.id.
   *
   * Drops AOWs whose parent SP we can't resolve from the same mappings —
   * defensive against unexpected CLARISA shapes. Order is stable: by parent
   * SP smo_code, then by AOW smo_code, so cache keys land deterministically.
   */
  private derivePairsFromProjectMappings(project: {
    project_mappings_array?: Array<{
      status?: string;
      global_unit_object?: {
        smo_code?: string;
        level?: number;
        parent_id?: number | null;
        cgiar_entity_type_object?: { prefix?: string | null };
        portfolio_object?: { acronym?: string };
        id?: number;
      };
    }>;
  }): Array<{ program: string; areaOfWork: string }> {
    const activePortfolio = ENV.BILATERAL_ACTIVE_PORTFOLIO;
    const mappings = project.project_mappings_array ?? [];

    const inActivePortfolio = (m: (typeof mappings)[number]) =>
      m.global_unit_object?.portfolio_object?.acronym === activePortfolio;

    // Index SP entries (level 1, prefix SP) by their CLARISA id so we can
    // resolve an AOW's parent_id back to its SP smo_code without a second
    // CLARISA fetch.
    const spById = new Map<number, string>();
    for (const m of mappings) {
      const u = m.global_unit_object;
      if (!u) continue;
      const prefix = u.cgiar_entity_type_object?.prefix?.toUpperCase();
      if (
        m.status === 'Confirmed' &&
        u.level === 1 &&
        prefix === 'SP' &&
        u.smo_code &&
        typeof u.id === 'number' &&
        inActivePortfolio(m)
      ) {
        spById.set(u.id, u.smo_code);
      }
    }

    const pairs: Array<{ program: string; areaOfWork: string }> = [];
    for (const m of mappings) {
      const u = m.global_unit_object;
      if (!u) continue;
      const prefix = u.cgiar_entity_type_object?.prefix?.toUpperCase();
      const isAow =
        m.status === 'Confirmed' &&
        u.level === 2 &&
        prefix === 'AOW' &&
        u.smo_code &&
        typeof u.parent_id === 'number' &&
        inActivePortfolio(m);

      if (!isAow) continue;

      const program = spById.get(u.parent_id as number);
      if (!program) continue; // AOW whose parent SP isn't in the same project — skip.
      pairs.push({ program, areaOfWork: u.smo_code as string });
    }

    return pairs.sort(
      (a, b) =>
        a.program.localeCompare(b.program) ||
        a.areaOfWork.localeCompare(b.areaOfWork),
    );
  }

  async getAlignment(
    resultId: number,
    resultCode: string,
    _user: User,
  ): Promise<AlignmentResponse> {
    const [context, alignment] = await Promise.all([
      this.resultRepository.findPoolFundingAlignmentContext(resultId),
      this.alignmentRepository.findActiveAlignmentByResultId(resultId),
    ]);

    if (!context) {
      throw new NotFoundException('Result not found');
    }

    const eligible = this.toBoolean(context.is_pool_funding_contributor);
    const isSyncedToPrms = this.toBoolean(context.is_synced_to_prms);
    // @sdd-spec docs/specs/bilateral-module/pending-items — T-15.2 / R-BIL-071
    // Source-based gate: any PRMS-sourced result is read-only on bilateral
    // surfaces regardless of sync state. Unions with the existing R-BIL-015
    // synced gate so the FE only needs to read `is_read_only`.
    const isPrmsSourced = this.isPrmsSourced(context.platform_code);
    const visibleAlignment = eligible ? alignment : null;
    const selectedLevers = visibleAlignment?.selected_levers ?? [];
    const selectedSciencePrograms = await this.toSelectedSciencePrograms(
      selectedLevers.map((lever) => lever.lever_code),
    );

    return {
      result_code: String(context.result_official_code ?? resultCode),
      eligible,
      has_pool_funding_alignment_eligible: eligible,
      has_contribution: visibleAlignment?.has_contribution ?? null,
      selected_levers: selectedLevers,
      selected_science_programs: selectedSciencePrograms,
      is_synced_to_prms: isSyncedToPrms,
      is_read_only: isPrmsSourced || isSyncedToPrms,
    };
  }

  private async toSelectedSciencePrograms(
    codes: string[],
  ): Promise<SelectedScienceProgramResponse[]> {
    if (!codes.length) return [];

    const catalog = await this.clarisaScienceProgramsService.findAll();
    const byCode = new Map(catalog.map((sp) => [sp.official_code, sp]));

    return codes.map((code) => {
      const match = byCode.get(code);
      return {
        code,
        name: match?.name ?? code,
        category: match?.category ?? null,
        color: match?.color ?? null,
        icon_key: match?.icon_key ?? null,
      };
    });
  }

  async updateAlignment(
    resultId: number,
    resultCode: string,
    dto: UpdatePoolFundingAlignmentDto,
    user: User,
  ): Promise<AlignmentResponse> {
    const [context, previousAlignment] = await Promise.all([
      this.resultRepository.findPoolFundingAlignmentContext(resultId),
      this.alignmentRepository.findActiveAlignmentByResultId(resultId),
    ]);

    if (!context) {
      throw new NotFoundException('Result not found');
    }

    // R-BIL-071: architectural source gate runs first — PRMS owns the data
    // regardless of contributor status or sync state, so reject before any
    // domain-eligibility check fires (avoids leaking "not a contributor"
    // when the real reason is "we don't own this result").
    this.assertPrmsSourceWritable(context.platform_code);

    if (!this.toBoolean(context.is_pool_funding_contributor)) {
      throw new BadRequestException(
        'Result project is not a Pool Funding Contributor',
      );
    }

    if (this.toBoolean(context.is_synced_to_prms)) {
      throw new ConflictException('Result is already synced to PRMS');
    }

    const leverCodes = await this.normalizeLeverCodes(
      dto,
      resultId,
      resultCode,
    );
    const actorUserId = user.sec_user_id;
    const now = new Date();

    await this.dataSource.transaction(async (manager) => {
      if (previousAlignment) {
        await manager.getRepository(ResultPoolFundingAlignmentSp).update(
          {
            alignment_id: previousAlignment.id,
            is_active: true,
          },
          {
            is_active: false,
            deleted_at: now,
            updated_by: actorUserId,
          },
        );
        await manager.getRepository(ResultPoolFundingAlignment).update(
          {
            id: previousAlignment.id,
            is_active: true,
          },
          {
            is_active: false,
            deleted_at: now,
            updated_by: actorUserId,
          },
        );
      }

      const newAlignment = await manager
        .getRepository(ResultPoolFundingAlignment)
        .save({
          result_id: resultId,
          has_contribution: dto.has_contribution,
          created_by: actorUserId,
          updated_by: actorUserId,
        });

      if (leverCodes.length) {
        await manager.getRepository(ResultPoolFundingAlignmentSp).save(
          leverCodes.map((spCode) => ({
            alignment_id: newAlignment.id,
            // @sdd-spec docs/specs/bilateral-module/pending-items — T-15.3
            // / R-BIL-073 — entity property renamed `lever_code` → `sp_code`.
            sp_code: spCode,
            created_by: actorUserId,
            updated_by: actorUserId,
          })),
        );
      }

      await manager.getRepository(ResultReviewHistory).save({
        result_id: resultId,
        version_id: context.version_id,
        actor_user_id: actorUserId,
        event_type: POOL_FUNDING_ALIGNMENT_CHANGED,
        justification: dto.justification,
        payload_before: this.toHistoryPayload(previousAlignment),
        payload_after: {
          has_contribution: dto.has_contribution,
          lever_codes: leverCodes,
        },
        created_by: actorUserId,
        updated_by: actorUserId,
      });
    });

    const response = await this.getAlignment(resultId, resultCode, user);
    this.serverGateway.emitPoolFundingAlignmentChanged({
      result_code: response.result_code,
      by_user_id: actorUserId,
      at: new Date().toISOString(),
    });

    return response;
  }

  async listIndicators(
    resultId: number,
    resultCode: string,
    query: ListIndicatorsQueryDto,
    user: User,
  ): Promise<IndicatorGroupResponse[]> {
    const alignment = await this.getAlignment(resultId, resultCode, user);

    if (!alignment.has_contribution) {
      return [];
    }

    const staleMappings =
      await this.mappingRepository.findActiveStaleMappingsByResultAndLevers(
        resultId,
        alignment.selected_levers.map((lever) => lever.lever_code),
      );
    const staleIndicatorsByLever = staleMappings.reduce((groups, mapping) => {
      const indicator = this.toStaleIndicatorResponse(mapping);

      if (this.matchesIndicatorQuery(indicator, query)) {
        groups.set(mapping.lever_code, [
          ...(groups.get(mapping.lever_code) ?? []),
          indicator,
        ]);
      }

      return groups;
    }, new Map<string, IndicatorPanelIndicatorResponse[]>());

    return alignment.selected_levers.map((lever) => ({
      lever_code: lever.lever_code,
      lever_name: lever.lever_name,
      indicators: staleIndicatorsByLever.get(lever.lever_code) ?? [],
    }));
  }

  async markIndicatorMappingsStale(
    leverCode: string,
    indicatorCode: string,
    user?: User,
  ): Promise<number> {
    const normalizedLeverCode = leverCode?.trim();
    const normalizedIndicatorCode = indicatorCode?.trim();

    if (!normalizedLeverCode || !normalizedIndicatorCode) {
      throw new BadRequestException(
        'Lever code and indicator code are required to mark mappings stale',
      );
    }

    const actorUserId = user.sec_user_id;

    return this.mappingRepository.markActiveMappingsStaleByLeverIndicator(
      normalizedLeverCode,
      normalizedIndicatorCode,
      actorUserId,
    );
  }

  async upsertContribution(
    resultId: number,
    resultCode: string,
    indicatorCode: string,
    dto: ContributionDto,
    user: User,
    leverCode: string,
  ): Promise<MappingResponse> {
    const context = await this.getEditableContributionContext(resultId);
    const alignment = await this.getActiveAlignmentForLever(
      resultId,
      leverCode,
    );
    const handler = this.getContributionHandler(dto.indicator_type ?? dto.type);
    const previousMapping =
      await this.mappingRepository.findActiveMappingByResultLeverIndicator(
        resultId,
        leverCode,
        indicatorCode,
      );
    const actorUserId = user.sec_user_id;
    const now = new Date();

    let savedMapping: ResultPoolFundingIndicatorMapping;
    await this.dataSource.transaction(async (manager) => {
      if (previousMapping) {
        await manager.getRepository(ResultPoolFundingIndicatorMapping).update(
          { id: previousMapping.id, is_active: true },
          {
            is_active: false,
            deleted_at: now,
            updated_by: actorUserId,
          },
        );
      }

      const handlerResult = await handler.upsert(
        { resultId, resultCode, indicatorCode, manager },
        dto,
      );
      savedMapping = await manager
        .getRepository(ResultPoolFundingIndicatorMapping)
        .save({
          result_id: resultId,
          lever_code: leverCode,
          indicator_code: indicatorCode,
          indicator_type: handler.indicatorType,
          result_capacity_sharing_id:
            handlerResult.fkField === 'result_capacity_sharing_id'
              ? handlerResult.fkId
              : null,
          result_knowledge_product_id:
            handlerResult.fkField === 'result_knowledge_product_id'
              ? handlerResult.fkId
              : null,
          result_policy_change_id:
            handlerResult.fkField === 'result_policy_change_id'
              ? handlerResult.fkId
              : null,
          result_innovation_dev_id:
            handlerResult.fkField === 'result_innovation_dev_id'
              ? handlerResult.fkId
              : null,
          other_contribution_narrative:
            handlerResult.fkField === null ? String(dto.narrative ?? '') : null,
          created_by: actorUserId,
          updated_by: actorUserId,
        });

      await manager.getRepository(ResultReviewHistory).save({
        result_id: resultId,
        version_id: context.version_id,
        actor_user_id: actorUserId,
        event_type: INDICATOR_MAPPING_CHANGED,
        payload_before: this.toMappingHistoryPayload(previousMapping),
        payload_after: this.toMappingHistoryPayload(savedMapping),
        created_by: actorUserId,
        updated_by: actorUserId,
      });
    });

    return this.toMappingResponse(
      resultCode,
      savedMapping,
      alignment.selected_levers.find((lever) => lever.lever_code === leverCode)
        ?.lever_name ?? leverCode,
    );
  }

  async deleteContribution(
    resultId: number,
    resultCode: string,
    indicatorCode: string,
    user: User,
    leverCode: string,
  ): Promise<void> {
    const context = await this.getEditableContributionContext(resultId);
    await this.getActiveAlignmentForLever(resultId, leverCode);
    const previousMapping =
      await this.mappingRepository.findActiveMappingByResultLeverIndicator(
        resultId,
        leverCode,
        indicatorCode,
      );

    if (!previousMapping) {
      throw new NotFoundException('Pool funding indicator mapping not found');
    }

    const handler = this.getContributionHandler(previousMapping.indicator_type);
    const actorUserId = user.sec_user_id;
    const now = new Date();

    await this.dataSource.transaction(async (manager) => {
      await handler.delete({ resultId, resultCode, indicatorCode, manager });
      await manager.getRepository(ResultPoolFundingIndicatorMapping).update(
        { id: previousMapping.id, is_active: true },
        {
          is_active: false,
          deleted_at: now,
          updated_by: actorUserId,
        },
      );
      await manager.getRepository(ResultReviewHistory).save({
        result_id: resultId,
        version_id: context.version_id,
        actor_user_id: actorUserId,
        event_type: INDICATOR_MAPPING_CHANGED,
        payload_before: this.toMappingHistoryPayload(previousMapping),
        payload_after: null,
        created_by: actorUserId,
        updated_by: actorUserId,
      });
    });
  }

  async reviewDecision(
    _resultCode: string,
    _dto: ReviewDecisionDto,
    _user: User,
  ): Promise<void> {
    throw new NotImplementedException(
      'Bilateral review decision is not implemented yet',
    );
  }

  private toBoolean(
    value: boolean | number | string | null | undefined,
  ): boolean {
    return value === true || value === 1 || value === '1' || value === 'true';
  }

  /**
   * @sdd-spec docs/specs/bilateral-module/pending-items — T-15.1 / R-BIL-070
   *
   * Normalizes input `sp_codes` (or legacy `lever_codes`) and validates each
   * one against the per-result SP list returned by R-BIL-076 (delegated to
   * `getScienceProgramsForResult`). Unknown codes — typos, stale FE bundles,
   * wrong-project picks — produce a 400 with `errors.unknown_sp_codes` so the
   * FE can highlight which inputs failed.
   *
   * Validation skipped when `has_contribution === false` (codes are dropped
   * per the existing R-BIL-014 behavior).
   */
  private async normalizeLeverCodes(
    dto: UpdatePoolFundingAlignmentDto,
    resultId: number,
    resultCode: string,
  ): Promise<string[]> {
    if (!dto.has_contribution) {
      return [];
    }

    // Prefer sp_codes (new) over lever_codes (legacy back-compat).
    const sourceCodes = dto.sp_codes?.length ? dto.sp_codes : dto.lever_codes;
    const codes = Array.from(
      new Set((sourceCodes ?? []).map((code) => code?.trim()).filter(Boolean)),
    );

    if (!codes.length) {
      throw new BadRequestException(
        'At least one Science Program code (sp_codes) is required when has_contribution is true',
      );
    }

    const perResult = await this.getScienceProgramsForResult(
      resultId,
      resultCode,
    );
    const validCodes = new Set(perResult.science_programs.map((sp) => sp.code));
    const unknownCodes = codes.filter((code) => !validCodes.has(code));

    if (unknownCodes.length) {
      // GlobalExceptions surfaces `exception.response.message` into the
      // envelope's `errors` field — packing the structured payload as
      // `message` is how the FE receives `errors.unknown_sp_codes`.
      throw new BadRequestException({
        message: {
          description: 'Unknown Science Program codes',
          unknown_sp_codes: unknownCodes,
        },
      });
    }

    return codes;
  }

  private toHistoryPayload(
    alignment: PoolFundingAlignmentDetail | null,
  ): Record<string, unknown> | null {
    if (!alignment) {
      return null;
    }

    return {
      has_contribution: alignment.has_contribution,
      lever_codes: alignment.selected_levers.map((lever) => lever.lever_code),
    };
  }

  private async getEditableContributionContext(resultId: number) {
    const context =
      await this.resultRepository.findPoolFundingAlignmentContext(resultId);

    if (!context) {
      throw new NotFoundException('Result not found');
    }

    // R-BIL-071: same architectural source gate as updateAlignment — runs
    // first so PRMS-sourced results always return the locked 409 wording.
    this.assertPrmsSourceWritable(context.platform_code);

    if (!this.toBoolean(context.is_pool_funding_contributor)) {
      throw new BadRequestException(
        'Result project is not a Pool Funding Contributor',
      );
    }

    if (this.toBoolean(context.is_synced_to_prms)) {
      throw new ConflictException('Result is already synced to PRMS');
    }

    return context;
  }

  // @sdd-spec docs/specs/bilateral-module/pending-items — T-15.2 / R-BIL-071
  //
  // Architectural gate: PRMS-sourced results are read-only on bilateral
  // surfaces no matter what. Runs BEFORE role/owner checks (RolesGuard
  // bypasses SYSTEM_ADMIN, but this rejects it too — PRMS owns the data).
  // Description wording is locked: the FE keys off it.
  private isPrmsSourced(platformCode: string | null | undefined): boolean {
    return platformCode === 'PRMS';
  }

  private assertPrmsSourceWritable(
    platformCode: string | null | undefined,
  ): void {
    if (this.isPrmsSourced(platformCode)) {
      throw new ConflictException(
        'Result is PRMS-sourced; bilateral alignment is read-only in STAR',
      );
    }
  }

  private async getActiveAlignmentForLever(
    resultId: number,
    leverCode: string,
  ): Promise<PoolFundingAlignmentDetail> {
    if (!leverCode?.trim()) {
      throw new BadRequestException('lever-code query parameter is required');
    }

    const alignment =
      await this.alignmentRepository.findActiveAlignmentByResultId(resultId);

    if (!alignment?.has_contribution) {
      throw new NotFoundException('Pool funding alignment not found');
    }

    if (
      !alignment.selected_levers.some((lever) => lever.lever_code === leverCode)
    ) {
      throw new BadRequestException('Lever code is not selected in alignment');
    }

    return alignment;
  }

  private getContributionHandler(
    indicatorType: string,
  ): BilateralIndicatorTypeHandler {
    const handler = this.contributionHandlers.find(
      (candidate) => candidate.indicatorType === indicatorType,
    );

    if (!handler) {
      throw new BadRequestException(
        `Unsupported indicator type: ${indicatorType ?? 'undefined'}`,
      );
    }

    return handler;
  }

  private get contributionHandlers(): BilateralIndicatorTypeHandler[] {
    return [
      this.capacitySharingHandler,
      this.innovationDevelopmentHandler,
      this.knowledgeProductHandler,
      this.noopHandler,
      this.policyChangeHandler,
    ];
  }

  private toMappingResponse(
    resultCode: string,
    mapping: ResultPoolFundingIndicatorMapping,
    leverName: string,
  ): MappingResponse {
    return {
      result_code: resultCode,
      lever_code: mapping.lever_code,
      lever_name: leverName,
      indicator_code: mapping.indicator_code,
      indicator_type: mapping.indicator_type,
      is_stale: this.toBoolean(mapping.is_stale),
    };
  }

  private toStaleIndicatorResponse(
    mapping: PoolFundingIndicatorMappingDetail,
  ): IndicatorPanelIndicatorResponse {
    return {
      indicator_code: mapping.indicator_code,
      indicator_name: mapping.indicator_code,
      indicator_type: mapping.indicator_type,
      target_description: null,
      is_active: false,
      is_mapped: true,
      is_stale: this.toBoolean(mapping.is_stale),
    };
  }

  private matchesIndicatorQuery(
    indicator: IndicatorPanelIndicatorResponse,
    query: ListIndicatorsQueryDto,
  ): boolean {
    if (
      query.indicator_type &&
      indicator.indicator_type !== query.indicator_type
    ) {
      return false;
    }

    if (!query.search?.trim()) {
      return true;
    }

    const search = query.search.trim().toLowerCase();

    return [
      indicator.indicator_code,
      indicator.indicator_name,
      indicator.indicator_type,
    ].some((value) => value.toLowerCase().includes(search));
  }

  private toMappingHistoryPayload(
    mapping: Partial<ResultPoolFundingIndicatorMapping> | null,
  ): Record<string, unknown> | null {
    if (!mapping) {
      return null;
    }

    return {
      lever_code: mapping.lever_code,
      indicator_code: mapping.indicator_code,
      indicator_type: mapping.indicator_type,
      result_capacity_sharing_id: mapping.result_capacity_sharing_id,
      result_knowledge_product_id: mapping.result_knowledge_product_id,
      result_policy_change_id: mapping.result_policy_change_id,
      result_innovation_dev_id: mapping.result_innovation_dev_id,
      other_contribution_narrative: mapping.other_contribution_narrative,
      is_stale: this.toBoolean(mapping.is_stale),
    };
  }
}
