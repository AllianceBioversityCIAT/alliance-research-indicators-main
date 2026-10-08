import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { LoggerUtil } from '../../shared/utils/logger.util';
import {
  applyPfmChip,
  applyPfmFilters,
  buildPfmQueue,
  buildPfmSummary,
  deriveMonitoredRows,
  PfmDerivedMonitoredRow,
  PfmQueueAggregate,
  PfmQueueFilters,
  PfmSummary,
  rankPfmRows,
} from './derivation/pfm-aggregation';
import { PfmScopeEnum } from './enum/pfm-scope.enum';
import {
  PfmFilterOptions,
  PfmRepositoryScope,
  PfmSpRef,
  PooledFundingMonitorRepository,
} from './repositories/pooled-funding-monitor.repository';
import { PfmQueueQueryDto } from './dto/pfm-query.dto';

// @akili-spec docs/specs/bilateral/prms-sync/pooled-funding-monitor — T-05

export type PfmQueueResponse = PfmQueueAggregate & {
  filter_options: PfmFilterOptions;
};

export interface PfmResultRow {
  result_code: string;
  platform_code: string;
  official_code: number;
  report_year: number;
  snapshot_years: number[];
  title: string | null;
  type: string | null;
  star_label: string;
  star_status_id: number;
  pi_line: string;
  mapping_state: string;
  mapping_note: string;
  sp_line: string;
  primary_sp: { code: string; name: string; color: string | null } | null;
  contributing: { code: string; name: string; color: string | null }[];
  prms_status: string;
  prms_hint: string;
  /** Server-formatted "dd Mon, HH:mm" (UTC); "—" when `results.updated_at` is NULL. */
  updated_at: string;
}

const spRef = (sp: PfmSpRef) => ({
  code: sp.code,
  name: sp.name,
  color: sp.color,
});

/**
 * Pooled Funding Contribution Monitor: read-only orchestration (design §5).
 * One request = one scope resolution + one base query + one derivation, so every
 * number of a response comes from the same dataset (R-PFM-002, NFR-PFM-006).
 * Nothing is written; no transactions, audit, socket or queue side effects.
 */
@Injectable()
export class PooledFundingMonitorService {
  constructor(private readonly repository: PooledFundingMonitorRepository) {}

  async getSummary(
    userId: number,
    scope: PfmScopeEnum = PfmScopeEnum.MINE,
    now: Date = new Date(),
  ): Promise<PfmSummary> {
    const startedAt = performance.now();
    const repoScope = this.resolveScope(userId, scope);
    const [monitored, projectsTotal, monthlySyncs, syncedThisYear, isPiOfAny] =
      await Promise.all([
        this.repository.findMonitoredResults(repoScope),
        this.repository.countContributingProjects(),
        this.repository.findMonthlySyncs(repoScope, now),
        this.repository.countSyncedThisYear(repoScope, now),
        this.repository.isPiOfAnyContributingProject(userId),
      ]);
    const rows = deriveMonitoredRows(monitored);
    const summary = buildPfmSummary({
      scope,
      rows,
      projectsTotal,
      monthlySyncs,
      syncedThisYear,
      isPiOfAny,
      now,
    });
    this.logRequest('summary', userId, scope, [], rows.length, startedAt);
    return summary;
  }

  async getQueue(
    userId: number,
    query: PfmQueueQueryDto,
  ): Promise<PfmQueueResponse> {
    const startedAt = performance.now();
    const scope = query.scope ?? PfmScopeEnum.MINE;
    const repoScope = this.resolveScope(userId, scope);
    const [monitored, filterOptions] = await Promise.all([
      this.repository.findMonitoredResults(repoScope),
      this.repository.findFilterOptions(repoScope),
    ]);
    const rows = deriveMonitoredRows(monitored);
    const filters = this.toFilters(query);
    const aggregate = buildPfmQueue(rows, filters);
    this.logRequest(
      'queue',
      userId,
      scope,
      Object.keys(filters),
      rows.length,
      startedAt,
    );
    return { filter_options: filterOptions, ...aggregate };
  }

  /**
   * Rows of one project group, filtered + chipped like the queue and ranked.
   * 404 when the project is not among the viewer's scope rows, whether it does
   * not exist or belongs to someone else: the answer must not reveal which.
   */
  async getProjectResults(
    userId: number,
    projectCode: string,
    query: PfmQueueQueryDto,
  ): Promise<PfmResultRow[]> {
    const startedAt = performance.now();
    const scope = query.scope ?? PfmScopeEnum.MINE;
    const repoScope = this.resolveScope(userId, scope);
    const rows = deriveMonitoredRows(
      await this.repository.findMonitoredResults(repoScope),
    );
    if (!rows.some(({ row }) => row.project_code === projectCode)) {
      throw new NotFoundException('Project not found');
    }
    const filters = this.toFilters(query);
    const shown = rankPfmRows(
      applyPfmChip(applyPfmFilters(rows, filters), filters.chip).filter(
        ({ row }) => row.project_code === projectCode,
      ),
    );
    this.logRequest(
      'project-results',
      userId,
      scope,
      Object.keys(filters),
      shown.length,
      startedAt,
    );
    return shown.map(this.toResultRow);
  }

  private toResultRow = ({ row, d }: PfmDerivedMonitoredRow): PfmResultRow => ({
    result_code: `${row.platform_code}-${row.result_official_code}`,
    platform_code: row.platform_code,
    official_code: row.result_official_code,
    report_year: row.report_year,
    snapshot_years: row.snapshot_years,
    title: row.title,
    type: row.indicator_name,
    star_label: d.starLabel,
    star_status_id: row.result_status_id,
    pi_line: d.piLine,
    mapping_state: d.mappingState,
    mapping_note: d.mappingNote,
    sp_line: d.spLine,
    primary_sp: row.primary_sp ? spRef(row.primary_sp) : null,
    contributing: row.contributing_sps.map(spRef),
    prms_status: d.prmsStatus,
    prms_hint: d.prmsHint,
    updated_at: d.updatedLabel,
  });

  /**
   * `mine` always carries the AUTHENTICATED user's id. The repository throws a
   * raw Error when it is missing; that must never surface on the HTTP path, and
   * must never fall through to the portfolio (R-PFM-002).
   */
  private resolveScope(
    userId: number,
    scope: PfmScopeEnum,
  ): PfmRepositoryScope {
    if (!Number.isInteger(userId)) {
      throw new ForbiddenException(
        'Pooled Funding Monitor requires an authenticated user',
      );
    }
    return scope === PfmScopeEnum.ALL
      ? { scope: PfmScopeEnum.ALL }
      : { scope: PfmScopeEnum.MINE, userId };
  }

  private toFilters(query: PfmQueueQueryDto): PfmQueueFilters {
    const filters: PfmQueueFilters = {};
    if (query.project) filters.project = query.project;
    if (query.sp) filters.sp = query.sp;
    if (query.status) filters.status = query.status;
    if (query.type != null) filters.type = query.type;
    if (query.chip) filters.chip = query.chip;
    return filters;
  }

  private logRequest(
    endpoint: string,
    userId: number,
    scope: PfmScopeEnum,
    filterKeys: string[],
    rowCount: number,
    startedAt: number,
  ): void {
    new LoggerUtil({
      custom: { class: PooledFundingMonitorService.name, function: endpoint },
    })._debug(
      `scope=${scope} filters=[${filterKeys.join(',')}] rows=${rowCount} duration_ms=${Math.round(performance.now() - startedAt)}`,
      { userId: String(userId) },
    );
  }
}
