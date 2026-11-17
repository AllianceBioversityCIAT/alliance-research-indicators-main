import { Injectable } from '@nestjs/common';
import { DataSource, In, IsNull, Not } from 'typeorm';
import { SecUser } from '../../../complementary-entities/secondary/user/dto/sec-user.dto';
import { Result } from '../../../entities/results/entities/result.entity';
import { ReportingPlatformEnum } from '../../../entities/results/enum/reporting-platform.enum';
import { SecUserEntity } from '../../../entities/users/entities/sec-user.entity';

export interface TipHandleRow {
  result_id: number;
  result_official_code: number;
  report_year_id: number;
  is_snapshot: boolean;
  is_active: boolean;
}

export interface TipHandleResolution {
  live: TipHandleRow | null;
  otherLive: TipHandleRow[];
  versions: Record<number, TipHandleRow>;
  otherVersions: TipHandleRow[];
}

interface TipHandleInternalRow extends TipHandleRow {
  is_linked: boolean;
}

/**
 * DD-9 / P-15: the results predicate has no `r.is_active` filter.
 * `lr.is_active` is only the §3.2 survivor link (active `link_results.other_result_id`).
 * The TIP platform filter stays on `results`.
 */
const TIP_HANDLE_ROWS_SQL = `
SELECT
  r.result_id,
  r.result_official_code,
  r.report_year_id,
  r.is_snapshot,
  r.is_active,
  EXISTS (
    SELECT 1
    FROM link_results lr
    WHERE lr.other_result_id = r.result_id
      AND lr.is_active = 1
  ) AS is_linked
FROM results r
WHERE r.platform_code = 'TIP'
  AND r.public_link = ?
`;

@Injectable()
export class TipHandleRepository {
  constructor(private readonly dataSource: DataSource) {}

  async resolve(handle: string): Promise<TipHandleResolution> {
    const rows: unknown[] = await this.dataSource.query(TIP_HANDLE_ROWS_SQL, [
      handle,
    ]);
    const mapped = rows.map((row) => mapRow(row as RawTipHandleRow));
    const liveRows = mapped.filter((row) => !row.is_snapshot);
    const versionRows = mapped.filter((row) => row.is_snapshot);
    const livePick = pickLive(liveRows);
    const versionPick = pickVersions(versionRows);
    return {
      live: livePick.chosen ? toPublic(livePick.chosen) : null,
      otherLive: livePick.others.map(toPublic),
      versions: versionPick.versions,
      otherVersions: versionPick.otherVersions,
    };
  }

  /**
   * Result ids in the given list that already store a PRMS code.
   * An empty list returns immediately and issues no query.
   */
  async idsWithPrmsCode(ids: number[]): Promise<number[]> {
    if (ids.length === 0) {
      return [];
    }
    const rows = await this.dataSource.getRepository(Result).find({
      select: { result_id: true },
      where: {
        result_id: In(ids),
        prms_result_code: Not(IsNull()),
      },
    });
    return rows.map((row) => Number(row.result_id));
  }

  /**
   * STAR user stored as created_by on the active TIP live row that shares
   * this row's official code. Several live rows resolve to the highest
   * result_id. A missing version row, official code, live row, created_by
   * or user resolves to null. created_by is select-false on the entity,
   * so the live lookup names it in select.
   */
  async liveAuthorFor(resultId: number): Promise<SecUser | null> {
    const results = this.dataSource.getRepository(Result);
    const version = await results.findOne({
      select: { result_id: true, result_official_code: true },
      where: { result_id: resultId },
    });
    if (version?.result_official_code == null) {
      return null;
    }

    const live = await results.findOne({
      select: { result_id: true, created_by: true },
      where: {
        platform_code: ReportingPlatformEnum.TIP,
        is_snapshot: false,
        is_active: true,
        result_official_code: version.result_official_code,
      },
      order: { result_id: 'DESC' },
    });
    if (live?.created_by == null) {
      return null;
    }

    const user = await this.dataSource.getRepository(SecUserEntity).findOne({
      where: { sec_user_id: Number(live.created_by) },
    });
    if (user == null) {
      return null;
    }

    const author = new SecUser();
    author.sec_user_id = Number(user.sec_user_id);
    author.email = user.email;
    author.first_name = user.first_name ?? undefined;
    author.last_name = user.last_name ?? undefined;
    return author;
  }
}

interface RawTipHandleRow {
  result_id: unknown;
  result_official_code: unknown;
  report_year_id: unknown;
  is_snapshot: unknown;
  is_active: unknown;
  is_linked: unknown;
}

function mapRow(row: RawTipHandleRow): TipHandleInternalRow {
  return {
    result_id: Number(row.result_id),
    result_official_code: Number(row.result_official_code),
    report_year_id: Number(row.report_year_id),
    is_snapshot: asFlag(row.is_snapshot),
    is_active: asFlag(row.is_active),
    is_linked: asFlag(row.is_linked),
  };
}

function toPublic(row: TipHandleInternalRow): TipHandleRow {
  return {
    result_id: row.result_id,
    result_official_code: row.result_official_code,
    report_year_id: row.report_year_id,
    is_snapshot: row.is_snapshot,
    is_active: row.is_active,
  };
}

function asFlag(value: unknown): boolean {
  return value === true || value === 1 || value === '1';
}

/**
 * Active rows first. Among that pool, exactly one row referenced by an
 * active link is the survivor; none or more than one falls through to the
 * highest report_year_id, then the highest result_id (§3.2).
 */
function pickLive(rows: TipHandleInternalRow[]): {
  chosen: TipHandleInternalRow | null;
  others: TipHandleInternalRow[];
} {
  if (rows.length === 0) {
    return { chosen: null, others: [] };
  }
  const active = rows.filter((row) => row.is_active);
  const pool = active.length > 0 ? active : rows;
  const linked = pool.filter((row) => row.is_linked);
  const candidates = linked.length === 1 ? linked : pool;
  const chosen = candidates.reduce((best, row) =>
    compareSurvivor(row, best) > 0 ? row : best,
  );
  return {
    chosen,
    others: rows.filter((row) => row !== chosen),
  };
}

function compareSurvivor(
  row: TipHandleInternalRow,
  best: TipHandleInternalRow,
): number {
  if (row.report_year_id !== best.report_year_id) {
    return row.report_year_id - best.report_year_id;
  }
  return row.result_id - best.result_id;
}

/**
 * Several version rows for one year should not happen. When they do:
 * active first, then the highest result_id. Extras are returned for the caller.
 */
function pickVersions(rows: TipHandleInternalRow[]): {
  versions: Record<number, TipHandleRow>;
  otherVersions: TipHandleRow[];
} {
  const byYear = new Map<number, TipHandleInternalRow[]>();
  for (const row of rows) {
    const list = byYear.get(row.report_year_id) ?? [];
    list.push(row);
    byYear.set(row.report_year_id, list);
  }

  const versions: Record<number, TipHandleRow> = {};
  const otherVersions: TipHandleRow[] = [];
  for (const [year, list] of byYear) {
    const active = list.filter((row) => row.is_active);
    const pool = active.length > 0 ? active : list;
    const chosen = pool.reduce((best, row) =>
      row.result_id > best.result_id ? row : best,
    );
    versions[year] = toPublic(chosen);
    for (const row of list) {
      if (row !== chosen) {
        otherVersions.push(toPublic(row));
      }
    }
  }
  return { versions, otherVersions };
}
