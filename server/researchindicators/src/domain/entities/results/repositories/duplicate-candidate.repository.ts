// @sdd-spec results/cross-platform-duplicate-resolution
import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Result } from '../entities/result.entity';
import { IndicatorsEnum } from '../../indicators/enum/indicators.enum';
import { ReportingPlatformEnum } from '../enum/reporting-platform.enum';
import { DuplicateGroupParticipant } from '../../../shared/utils/duplicate-result-priority.util';
import {
  dedupScopeSql,
  normalizedPublicLinkMatchSql,
  normalizedPublicLinkParams,
  normalizedPublicLinkSql,
} from '../../../shared/utils/public-link-normalizer.util';

/** A candidate row, shaped so it can be handed straight to the group resolver. */
export type DuplicateCandidate = DuplicateGroupParticipant & {
  resultId: number;
  resultOfficialCode: number;
  reportYearId: number;
  rawPublicLink: string;
  normalizedPublicLink: string;
};

/** One cross-platform duplicate group found by the sweep. */
export type DuplicateGroupKey = {
  normalizedPublicLink: string;
  members: number;
  platforms: number;
  reportYears: number;
};

/**
 * All SQL for cross-platform duplicate detection, in one place.
 *
 * Both callers — the sync path in `SaveResultService` and the admin sweep — share
 * this repository so the scope filters and the normalization can never diverge
 * between them.
 *
 * Two properties are structural rather than conventional, and both exist because
 * an earlier revision got them wrong:
 *
 *  - **Normalization is symmetric by construction.** The same expression is
 *    applied to the stored column and to the incoming value. The previous
 *    implementation trimmed only the incoming value and compared it against raw
 *    storage, so trailing whitespace and scheme differences went undetected.
 *  - **Comparisons run under an explicit binary collation.** `public_link` is
 *    `utf8mb3_general_ci`, which folds case and accents, so a plain `=` would
 *    ignore path case and collapse distinct publications — over-matching, whose
 *    consequence here is a hard delete.
 *
 * No index supports these queries and none is wanted: `results` holds ~14.7k
 * rows, of which ~13.4k are in dedup scope, and the normalization cannot be
 * index-satisfied on a `TEXT` column anyway. If the table grows by orders of
 * magnitude this decision needs revisiting — see `design.md` §0.2.
 */
@Injectable()
export class DuplicateCandidateRepository extends Repository<Result> {
  constructor(private readonly dataSource: DataSource) {
    super(Result, dataSource.createEntityManager());
  }

  /** Columns every read projects, so both queries return the same shape. */
  private static readonly SELECT_COLUMNS = `
      r.result_id AS resultId,
      r.result_official_code AS resultOfficialCode,
      r.platform_code AS platformCode,
      r.indicator_id AS indicatorId,
      r.report_year_id AS reportYearId,
      r.public_link AS rawPublicLink,
      ${normalizedPublicLinkSql('r.public_link')} AS normalizedPublicLink`;

  private static toCandidate(row: Record<string, unknown>): DuplicateCandidate {
    return {
      resultId: Number(row.resultId),
      resultOfficialCode: Number(row.resultOfficialCode),
      platformCode: row.platformCode as ReportingPlatformEnum,
      indicatorId: Number(row.indicatorId) as IndicatorsEnum,
      reportYearId: Number(row.reportYearId),
      rawPublicLink: String(row.rawPublicLink),
      normalizedPublicLink: String(row.normalizedPublicLink),
    };
  }

  /**
   * Candidates for one incoming sync row, within the same report year.
   *
   * Note what is NOT filtered out: rows of the incoming platform are returned.
   * The resolver needs them to detect same-system ambiguity, and — critically —
   * `excludeResultId` is deliberately absent from the default path, because
   * excluding the row being updated is what hid the loser's own stored row and
   * let the reported bug survive every sync run.
   *
   * @param params.publicLink Raw incoming link; normalization is applied here.
   * @param params.reportYearId Auto-deletion is confined to a single report year
   *        (R-RES-006); the sweep is what surfaces cross-year duplicates.
   */
  async findCandidatesForIncoming(params: {
    publicLink: string;
    reportYearId: number;
  }): Promise<DuplicateCandidate[]> {
    const sql = `
      SELECT ${DuplicateCandidateRepository.SELECT_COLUMNS}
      FROM results r
      WHERE ${dedupScopeSql('r')}
        AND r.report_year_id = ?
        AND ${normalizedPublicLinkMatchSql('r.public_link')}`;

    const rows: Record<string, unknown>[] = await this.query(sql, [
      params.reportYearId,
      ...normalizedPublicLinkParams(params.publicLink),
    ]);
    return rows.map(DuplicateCandidateRepository.toCandidate);
  }

  /**
   * Normalized links that span more than one of PRMS/TIP/AICCRA.
   *
   * Paged rather than streamed so the sweep can process groups in batches and
   * never hold one transaction across the whole run (NFR-RES-002).
   *
   * @returns Group keys with member, platform and report-year counts. A group
   *          whose `reportYears > 1` is classified `CROSS_YEAR_REVIEW` by the
   *          resolver and is never auto-deleted.
   */
  async findCrossPlatformGroupKeys(filters: {
    reportYearId?: number;
    platformCodes?: ReportingPlatformEnum[];
    indicatorIds?: IndicatorsEnum[];
    limit?: number;
    offset?: number;
  }): Promise<DuplicateGroupKey[]> {
    const where: string[] = [dedupScopeSql('r')];
    const params: unknown[] = [];

    if (filters.reportYearId !== undefined) {
      where.push('r.report_year_id = ?');
      params.push(filters.reportYearId);
    }
    if (filters.platformCodes?.length) {
      where.push(
        `r.platform_code IN (${filters.platformCodes.map(() => '?').join(', ')})`,
      );
      params.push(...filters.platformCodes);
    }
    if (filters.indicatorIds?.length) {
      where.push(
        `r.indicator_id IN (${filters.indicatorIds.map(() => '?').join(', ')})`,
      );
      params.push(...filters.indicatorIds);
    }

    // The grouping key is the normalized expression itself; grouping by the
    // alias keeps MySQL from evaluating it twice.
    const sql = `
      SELECT
        ${normalizedPublicLinkSql('r.public_link')} AS normalizedPublicLink,
        COUNT(*) AS members,
        COUNT(DISTINCT r.platform_code) AS platforms,
        COUNT(DISTINCT r.report_year_id) AS reportYears
      FROM results r
      WHERE ${where.join('\n        AND ')}
      GROUP BY normalizedPublicLink
      HAVING COUNT(DISTINCT r.platform_code) > 1
      ORDER BY normalizedPublicLink
      ${filters.limit !== undefined ? 'LIMIT ?' : ''}
      ${filters.limit !== undefined && filters.offset !== undefined ? 'OFFSET ?' : ''}`;

    if (filters.limit !== undefined) params.push(filters.limit);
    if (filters.limit !== undefined && filters.offset !== undefined) {
      params.push(filters.offset);
    }

    const rows: Record<string, unknown>[] = await this.query(sql, params);
    return rows.map((row) => ({
      normalizedPublicLink: String(row.normalizedPublicLink),
      members: Number(row.members),
      platforms: Number(row.platforms),
      reportYears: Number(row.reportYears),
    }));
  }

  /**
   * Every member row of the given normalized links.
   *
   * Takes a batch of keys so the sweep issues one query per batch of groups
   * rather than one per group.
   */
  async findMembersByNormalizedLinks(
    normalizedLinks: string[],
  ): Promise<DuplicateCandidate[]> {
    if (!normalizedLinks.length) return [];

    const placeholders = normalizedLinks.map(() => '?').join(', ');
    const sql = `
      SELECT ${DuplicateCandidateRepository.SELECT_COLUMNS}
      FROM results r
      WHERE ${dedupScopeSql('r')}
        AND ${normalizedPublicLinkSql('r.public_link')} IN (${placeholders})
      ORDER BY normalizedPublicLink, r.result_id`;

    const rows: Record<string, unknown>[] = await this.query(
      sql,
      normalizedLinks,
    );
    return rows.map(DuplicateCandidateRepository.toCandidate);
  }
}
