import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { effectivePoolFundingContributorSql } from '../../../shared/utils/pool-funding.util';
import { PfmRawRow } from '../derivation/pfm-derivation';
import { PfmScopeEnum } from '../enum/pfm-scope.enum';

// @akili-spec docs/specs/bilateral/prms-sync/pooled-funding-monitor — T-02

/**
 * Who the base query is scoped to. `mine` carries the AUTHENTICATED user's
 * `sec_user_id` only (NFR-PFM-001): the carnet is resolved inside the SQL, so
 * no caller can pass someone else's carnet or a free-text project list.
 */
export type PfmRepositoryScope =
  | { scope: PfmScopeEnum.ALL }
  | { scope: PfmScopeEnum.MINE; userId: number };

export interface PfmSpRef {
  code: string;
  name: string;
  color: string | null;
  category: string | null;
}

/**
 * One monitored result. Structurally a `PfmRawRow` (T-01 input), plus the
 * identity / grouping / filter fields the service and the three endpoints need.
 * All dates are real `Date` instants built from UTC strings (see `UTC_ISO_SQL`).
 */
export interface PfmMonitoredRow extends PfmRawRow {
  result_id: number;
  result_official_code: number;
  report_year: number;
  platform_code: string;
  title: string | null;
  indicator_id: number;
  indicator_name: string | null;
  project_code: string;
  project_name: string | null;
  donor: string | null;
  lead_pi: string | null;
  /** Active snapshot years of the same official code, newest first. */
  snapshot_years: number[];
  has_alignment: boolean;
  has_contribution: boolean | null;
  mapping_complete: boolean | null;
  is_synced_to_prms: boolean;
  primary_sp: PfmSpRef | null;
  /** Every active SP of the alignment except the primary one. */
  contributing_sps: PfmSpRef[];
}

export interface PfmMonthlySync {
  /** 'YYYY-MM', UTC calendar month. Months without syncs are absent (T-03 zero-fills). */
  month: string;
  /** Distinct monitored results with an ACCEPTED sync attempt in that month. */
  synced: number;
}

export interface PfmFilterOptions {
  projects: { code: string; name: string }[];
  science_programs: {
    category: string;
    items: { code: string; name: string }[];
  }[];
  types: { id: number; name: string }[];
}

/** The five PRMS result types (OICR = 5 is excluded, R-PFM-003). */
export const PFM_MONITORED_INDICATOR_IDS = [1, 2, 3, 4, 6] as const;
export const PFM_PLATFORM_CODE = 'STAR';
/** Status the approval date is read from (D-4). */
const APPROVED_STATUS_ID = 6;

/** Filter-option SP groups, in display order; anything else is "Other projects". */
export const PFM_SP_CATEGORIES = [
  'Science programs',
  'Scaling programs',
  'Accelerators',
] as const;
export const PFM_SP_OTHER_CATEGORY = 'Other projects';

/**
 * TIMESTAMP -> ISO-8601 UTC string, independent of the MySQL session time zone
 * AND of the Node process time zone (reviewer advisory on T-01).
 *
 * Why: mysql2 turns a DATETIME/TIMESTAMP into a JS `Date` using the process-local
 * zone (`orm.config` sets no `timezone`), while T-01 formats with `getUTC*` - so a
 * result stamped late in the evening could print the next/previous day whenever
 * the process zone is not UTC. Here the instant is computed from
 * `UNIX_TIMESTAMP()` (session-zone independent for TIMESTAMP columns - every
 * column read below is one) and re-expanded by plain date arithmetic on the epoch,
 * then returned as a STRING that mysql2 does not touch. `toDate()` parses it back
 * to the exact same instant. Epoch literal has no `:` on purpose.
 */
const utcIso = (column: string): string =>
  `DATE_FORMAT(DATE_ADD(CAST('1970-01-01' AS DATETIME), INTERVAL FLOOR(UNIX_TIMESTAMP(${column})) SECOND), '%Y-%m-%dT%H:%i:%sZ')`;

/** `result_prms_sync_*` store the official code as VARCHAR; `results` as BIGINT. */
const CODE_AS_TEXT_SQL = `(CAST(r.result_official_code AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_520_ci)`;

const toDate = (value: unknown): Date | null => {
  if (value == null || value === '') return null;
  if (value instanceof Date) return value;
  return new Date(String(value));
};

const toBool = (value: unknown): boolean =>
  value === true || value === 1 || value === '1';

const toNullableBool = (value: unknown): boolean | null =>
  value == null ? null : toBool(value);

/** mysql2 parses JSON columns; a string is tolerated for drivers/proxies that do not. */
const toJsonArray = <T>(value: unknown): T[] => {
  if (value == null || value === '') return [];
  if (Array.isArray(value)) return value as T[];
  if (typeof value === 'string') {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  }
  return [];
};

const toJsonObject = <T>(value: unknown): T | null => {
  if (value == null || value === '') return null;
  if (typeof value === 'string') return JSON.parse(value) as T;
  return typeof value === 'object' ? (value as T) : null;
};

interface SpJson {
  code: string;
  role: string | null;
  name: string | null;
  color: string | null;
  category: string | null;
}

/**
 * DD-PFM-7: primary = the PRIMARY row; if none, the only active SP when exactly
 * one exists (34 legacy NULL-role rows locally); else none. Every other active SP
 * is contributing. Pure so the unit spec can pin the rule.
 */
export const splitSciencePrograms = (
  rows: SpJson[],
): { primary: PfmSpRef | null; contributing: PfmSpRef[] } => {
  const toRef = (sp: SpJson): PfmSpRef => ({
    code: sp.code,
    name: sp.name ?? sp.code,
    color: sp.color ?? null,
    category: sp.category ?? null,
  });
  const sorted = [...rows].sort((a, b) => a.code.localeCompare(b.code));
  const primaryRow =
    sorted.find((sp) => sp.role === 'PRIMARY') ??
    (sorted.length === 1 ? sorted[0] : undefined);
  return {
    primary: primaryRow ? toRef(primaryRow) : null,
    contributing: sorted.filter((sp) => sp !== primaryRow).map(toRef),
  };
};

export const mapMonitoredRow = (
  row: Record<string, unknown>,
): PfmMonitoredRow => {
  const { primary, contributing } = splitSciencePrograms(
    toJsonArray<SpJson>(row.sp_rows),
  );
  const latest = toJsonObject<{
    status: string | null;
    justification: string | null;
  }>(row.prms_latest);
  return {
    result_id: Number(row.result_id),
    result_official_code: Number(row.result_official_code),
    report_year: Number(row.report_year),
    platform_code: String(row.platform_code),
    title: (row.title as string | null) ?? null,
    indicator_id: Number(row.indicator_id),
    indicator_name: (row.indicator_name as string | null) ?? null,
    result_status_id: Number(row.result_status_id),
    result_status_name: String(row.result_status_name ?? ''),
    updated_at: toDate(row.updated_at_utc),
    approved_at: toDate(row.approved_at_utc),
    project_code: String(row.project_code),
    project_name: (row.project_name as string | null) ?? null,
    donor: (row.donor as string | null) ?? null,
    lead_pi: (row.lead_pi as string | null) ?? null,
    snapshot_years: toJsonArray<number>(row.snapshot_years)
      .map(Number)
      .sort((a, b) => b - a),
    has_alignment: toBool(row.has_alignment),
    has_contribution: toNullableBool(row.has_contribution),
    mapping_complete: toNullableBool(row.mapping_complete),
    is_synced_to_prms: toBool(row.is_synced_to_prms),
    primary_sp: primary,
    contributing_sps: contributing,
    contributing_sp_names: contributing.map((sp) => sp.name),
    prms_history_status: latest?.status ?? null,
    prms_justification: latest?.justification ?? null,
  } as PfmMonitoredRow;
};

interface Fragment {
  sql: string;
  params: unknown[];
}

/**
 * Read-only data access for the Pooled Funding Contribution Monitor
 * (design.md §3.2). One base query; filters, chips and grouping are applied by
 * the service on derived rows (DD-PFM-1). Raw SQL on purpose (KZ-017: precedence
 * and generated SQL are what the integration spec asserts, on real rows).
 *
 * SQL safety (design §8): every request-derived value is a bound parameter. The
 * only interpolated text is constants owned by this file and the trusted LITERAL
 * alias handed to `effectivePoolFundingContributorSql`.
 */
@Injectable()
export class PooledFundingMonitorRepository {
  constructor(private readonly dataSource: DataSource) {}

  /** R-PFM-003 + R-PFM-004: one row per monitored result in scope. */
  async findMonitoredResults(
    scope: PfmRepositoryScope,
  ): Promise<PfmMonitoredRow[]> {
    const where = this.monitoredWhere(scope);
    const sql = `
      SELECT
        r.result_id,
        r.result_official_code,
        r.report_year_id AS report_year,
        r.platform_code,
        r.title,
        r.indicator_id,
        i.name AS indicator_name,
        r.result_status_id,
        rs.name AS result_status_name,
        ${utcIso('r.updated_at')} AS updated_at_utc,
        r.is_synced_to_prms,
        ac.agreement_id AS project_code,
        COALESCE(NULLIF(TRIM(ac.short_title), ''), ac.description) AS project_name,
        ac.donor AS donor,
        ac.project_lead_description AS lead_pi,
        (pfa.id IS NOT NULL) AS has_alignment,
        pfa.has_contribution AS has_contribution,
        pool_funding_alignment_validation(r.result_id) AS mapping_complete,
        (
          SELECT JSON_ARRAYAGG(JSON_OBJECT(
            'code', sp.sp_code,
            'role', sp.sp_role,
            'name', csp.name,
            'color', csp.color,
            'category', csp.category
          ))
          FROM result_pool_funding_alignment_sp sp
          LEFT JOIN clarisa_science_programs csp ON csp.official_code = sp.sp_code
          WHERE sp.alignment_id = pfa.id
            AND sp.is_active = 1
        ) AS sp_rows,
        (
          SELECT ${utcIso('MAX(COALESCE(sh.custom_date, sh.created_at))')}
          FROM submission_history sh
          INNER JOIN results rv ON rv.result_id = sh.result_id
          WHERE rv.result_official_code = r.result_official_code
            AND rv.report_year_id = r.report_year_id
            AND rv.platform_code = r.platform_code
            AND sh.to_status_id = ?
            AND sh.is_active = 1
        ) AS approved_at_utc,
        (
          SELECT JSON_ARRAYAGG(s.report_year_id)
          FROM results s
          WHERE s.result_official_code = r.result_official_code
            AND s.platform_code = r.platform_code
            AND s.is_snapshot = 1
            AND s.is_active = 1
        ) AS snapshot_years,
        (
          SELECT JSON_OBJECT('status', h.status, 'justification', h.justification)
          FROM result_prms_sync_history h
          WHERE h.result_official_code = ${CODE_AS_TEXT_SQL}
            AND h.result_year = r.report_year_id
            AND h.correlation_outcome = 'CORRELATED'
            AND h.duplicate_of_id IS NULL
            AND h.is_active = 1
            AND h.status IS NOT NULL
          ORDER BY COALESCE(h.decided_at, h.occurred_at) DESC, h.id DESC
          LIMIT 1
        ) AS prms_latest
      ${this.monitoredFrom()}
      LEFT JOIN indicators i ON i.indicator_id = r.indicator_id
      LEFT JOIN result_status rs ON rs.result_status_id = r.result_status_id
      LEFT JOIN result_pool_funding_alignment pfa
        ON pfa.id = (
          SELECT MAX(a.id)
          FROM result_pool_funding_alignment a
          WHERE a.result_id = r.result_id
            AND a.is_active = 1
        )
      ${where.sql}
      ORDER BY ac.agreement_id ASC, r.result_official_code ASC, r.result_id ASC
    `;
    const rows: Record<string, unknown>[] = await this.dataSource.query(sql, [
      APPROVED_STATUS_ID,
      ...where.params,
    ]);
    return rows.map(mapMonitoredRow);
  }

  /** R-PFM-005 sub-line: every contributing project in the portfolio. */
  async countContributingProjects(): Promise<number> {
    const rows: { total: string | number }[] = await this.dataSource.query(
      `SELECT COUNT(*) AS total
       FROM agresso_contracts ac
       WHERE ac.is_active = 1
         AND ${effectivePoolFundingContributorSql('ac')}`,
    );
    return Number(rows[0]?.total ?? 0);
  }

  /**
   * R-PFM-008: distinct monitored results with an ACCEPTED sync attempt per UTC
   * calendar month, from the first day of the month `monthsBack` months before
   * `now` (default window = 6 calendar months incl. the current one) - widened to
   * 1 January when that is earlier, so the "synced this year" footer can be summed
   * from the same rows. T-03 slices the six months and zero-fills.
   */
  async findMonthlySyncs(
    scope: PfmRepositoryScope,
    now: Date = new Date(),
    monthsBack = 5,
  ): Promise<PfmMonthlySync[]> {
    const sixMonthStart = Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth() - monthsBack,
      1,
    );
    const yearStart = Date.UTC(now.getUTCFullYear(), 0, 1);
    const fromEpoch = Math.floor(Math.min(sixMonthStart, yearStart) / 1000);
    const where = this.monitoredWhere(scope);
    const rows: { month: string; synced: string | number }[] =
      await this.dataSource.query(
        `SELECT
           DATE_FORMAT(DATE_ADD(CAST('1970-01-01' AS DATETIME), INTERVAL FLOOR(UNIX_TIMESTAMP(l.created_at)) SECOND), '%Y-%m') AS month,
           COUNT(DISTINCT r.result_id) AS synced
         ${this.monitoredFrom()}
         INNER JOIN result_prms_sync_log l
           ON l.external_reference = ${CODE_AS_TEXT_SQL}
          AND l.result_year = r.report_year_id
          AND l.outcome = 'ACCEPTED'
          AND l.is_active = 1
          AND UNIX_TIMESTAMP(l.created_at) >= ?
         ${where.sql}
         GROUP BY month
         ORDER BY month ASC`,
        [fromEpoch, ...where.params],
      );
    return rows.map((row) => ({
      month: String(row.month),
      synced: Number(row.synced),
    }));
  }

  /** R-PFM-009: options come from the scope's data, never from a hard-coded list. */
  async findFilterOptions(
    scope: PfmRepositoryScope,
  ): Promise<PfmFilterOptions> {
    const where = this.monitoredWhere(scope);
    const [projects, types, sps]: Record<string, unknown>[][] =
      await Promise.all([
        this.dataSource.query(
          `SELECT DISTINCT
             ac.agreement_id AS code,
             COALESCE(NULLIF(TRIM(ac.short_title), ''), ac.description) AS name
           ${this.monitoredFrom()}
           ${where.sql}`,
          where.params,
        ),
        this.dataSource.query(
          `SELECT DISTINCT r.indicator_id AS id, i.name AS name
           ${this.monitoredFrom()}
           LEFT JOIN indicators i ON i.indicator_id = r.indicator_id
           ${where.sql}`,
          where.params,
        ),
        this.dataSource.query(
          `SELECT DISTINCT sp.sp_code AS code, csp.name AS name, csp.category AS category
           ${this.monitoredFrom()}
           INNER JOIN result_pool_funding_alignment pfa
             ON pfa.result_id = r.result_id
            AND pfa.is_active = 1
            AND pfa.has_contribution = 1
           INNER JOIN result_pool_funding_alignment_sp sp
             ON sp.alignment_id = pfa.id
            AND sp.is_active = 1
           LEFT JOIN clarisa_science_programs csp ON csp.official_code = sp.sp_code
           ${where.sql}`,
          where.params,
        ),
      ]);

    const byCode = (a: { code: string }, b: { code: string }) =>
      a.code.localeCompare(b.code);
    const groups = new Map<string, { code: string; name: string }[]>();
    for (const category of [...PFM_SP_CATEGORIES, PFM_SP_OTHER_CATEGORY]) {
      groups.set(category, []);
    }
    for (const sp of sps) {
      const category = (PFM_SP_CATEGORIES as readonly string[]).includes(
        sp.category as string,
      )
        ? (sp.category as string)
        : PFM_SP_OTHER_CATEGORY;
      groups.get(category).push({
        code: String(sp.code),
        name: String(sp.name ?? sp.code),
      });
    }

    return {
      projects: projects
        .map((p) => ({
          code: String(p.code),
          name: String(p.name ?? p.code),
        }))
        .sort(byCode),
      science_programs: [...groups.entries()]
        .filter(([, items]) => items.length > 0)
        .map(([category, items]) => ({
          category,
          items: items.sort(byCode),
        })),
      types: types
        .map((t) => ({ id: Number(t.id), name: String(t.name ?? t.id) }))
        .sort((a, b) => a.id - b.id),
    };
  }

  /** Shared FROM: result -> primary active contract -> its contract row. */
  private monitoredFrom(): string {
    return `FROM results r
      INNER JOIN result_contracts rc
        ON rc.result_id = r.result_id
       AND rc.is_primary = 1
       AND rc.is_active = 1
      INNER JOIN agresso_contracts ac
        ON ac.agreement_id = rc.contract_id
       AND ac.is_active = 1`;
  }

  /**
   * Shared WHERE (R-PFM-003 + R-PFM-002). Every OR is inside its own parentheses
   * so no AND can bind across it (KZ-017); the integration spec asserts it on rows.
   */
  private monitoredWhere(scope: PfmRepositoryScope): Fragment {
    const params: unknown[] = [PFM_PLATFORM_CODE];
    const clauses = [
      `r.platform_code = ?`,
      `r.is_snapshot = 0`,
      `r.is_active = 1`,
      `r.deleted_at IS NULL`,
      `r.indicator_id IN (${PFM_MONITORED_INDICATOR_IDS.join(', ')})`,
      // One row per result even if a code was ever duplicated among current rows
      // (2 such STAR codes exist locally): keep the newest.
      `r.result_id = (
        SELECT MAX(rl.result_id)
        FROM results rl
        WHERE rl.platform_code = r.platform_code
          AND rl.result_official_code = r.result_official_code
          AND rl.is_snapshot = 0
          AND rl.is_active = 1
      )`,
      effectivePoolFundingContributorSql('ac'),
    ];

    if (scope.scope === PfmScopeEnum.MINE) {
      if (!Number.isInteger(scope.userId)) {
        // Never degrade to the portfolio by accident (R-PFM-002 BUT-clause).
        throw new Error('PI scope requires the authenticated sec_user_id');
      }
      // My Projects predicate (agresso-contract.repository), minus created_by.
      clauses.push(`(
        ac.projectLeadId IN (
          SELECT aus.carnet
          FROM sec_users su
          INNER JOIN alliance_user_staff aus
            ON LOWER(TRIM(aus.email)) = LOWER(TRIM(su.email))
          WHERE su.sec_user_id = ?
            AND aus.carnet IS NOT NULL
        )
        OR EXISTS (
          SELECT 1
          FROM pi_delegates pd
          WHERE pd.project_id = ac.agreement_id
            AND pd.delegate_user_id = ?
            AND pd.is_active = 1
        )
      )`);
      params.push(scope.userId, scope.userId);
    }

    return { sql: `WHERE ${clauses.join('\n        AND ')}`, params };
  }
}
