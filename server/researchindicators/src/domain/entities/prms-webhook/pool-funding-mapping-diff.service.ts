import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { LoggerUtil } from '../../shared/utils/logger.util';

/**
 * Pool-funding diff persisted on a correlated PRMS decision.
 *
 * BEFORE is the active snapshot for (result_official_code, result_year):
 * its result_pool_funding_toc_alignment rows and the alignment_sp rows
 * joined through result_pool_funding_alignment. AFTER is
 * result_prms_sync_history.raw_body.
 *
 * The pair identifies one snapshot. Zero or several active snapshots are
 * skipped. When we already hold a value and PRMS's callback gives us
 * nothing determinate for it, the entry is recorded as
 * after = "Not provided by PRMS". That entry is informational.
 * `applicableChanges` drops any entry whose `after` is that sentinel, and
 * apply never writes one.
 *
 * Indicator and Quantitative contribution are resolved from
 * `toc_mappings[].indicators[]`, added to the callback 2026-09-29 — until
 * then every mapping had no `indicators` key at all (2026-09-24/28
 * deliveries), which is why the "Not provided by PRMS" branch exists.
 * PRMS's own array can still be empty or hold more than one entry on any
 * given delivery; that is NOT the same as never sending the field, and it
 * is not treated as "not provided" either — per the owner (2026-09-29),
 * an ambiguous count means the field is skipped for THIS delivery only
 * (no key at all in `changes`), logged, and never guessed at. A field
 * whose callback value never resolves to a determinate one across every
 * mapping AND was never sent at all falls back to "Not provided by PRMS".
 *
 * A real difference is `{ before, after }` with PRMS's value. `{}` means
 * the diff ran and found no real difference and no stored value on an
 * unprovided field. `null` is left only when this service never wrote.
 */

export const SCIENCE_PROGRAM = 'Science Program';
export const CONTRIBUTING_PROGRAMS = 'Contributing Science Programs';
export const TOC_LEVEL = 'Theory of Change level';
export const TOC_RESULT = 'Theory of Change result';
export const TOC_RESULT_ID = 'Theory of Change result ID';
export const INDICATOR = 'Indicator';
export const QUANTITATIVE_CONTRIBUTION = 'Quantitative contribution';

/** Rendered as-is in the history modal's after cell. */
export const NOT_PROVIDED_BY_PRMS = 'Not provided by PRMS';

const HISTORY_ROW_SQL = `
SELECT result_official_code, result_year, raw_body
FROM result_prms_sync_history
WHERE id = ?
`;

/**
 * One active snapshot for the decision's (official code, reporting year).
 * The live row (is_snapshot false) is never the baseline.
 */
export const ACTIVE_SNAPSHOT_SQL = `
SELECT result_id
FROM results
WHERE result_official_code = ?
  AND report_year_id = ?
  AND is_snapshot = TRUE
  AND is_active = TRUE
`;

const TOC_SQL = `
SELECT sp_code, level, toc_result_id, toc_result_title, indicator_description,
       quantitative_contribution
FROM result_pool_funding_toc_alignment
WHERE result_id = ?
  AND is_active = TRUE
`;

const SP_SQL = `
SELECT sp.sp_code, sp.sp_role
FROM result_pool_funding_alignment_sp sp
INNER JOIN result_pool_funding_alignment a ON a.id = sp.alignment_id
WHERE a.result_id = ?
  AND a.is_active = TRUE
  AND sp.is_active = TRUE
`;

const WRITE_CHANGES_SQL = `
UPDATE result_prms_sync_history
SET changes = ?
WHERE id = ?
`;

export type PoolFundingChangeValue = string | string[] | null;

export interface PoolFundingChange {
  before: PoolFundingChangeValue;
  after: PoolFundingChangeValue;
}

export type PoolFundingChanges = Record<string, PoolFundingChange>;

export interface PoolFundingDiffInput {
  /** `result_prms_sync_history.id` of the decision row. */
  historyId: number;
  /**
   * Reporting year the correlator already resolved. The snapshot is keyed
   * by result_prms_sync_history.result_year, which is the year stored with
   * the decision.
   */
  resultYear: number;
}

export type SnapshotLookup =
  | { ok: true; resultId: number }
  | { ok: false; reason: string };

interface HistorySnapshot {
  result_official_code: unknown;
  result_year: unknown;
  raw_body: unknown;
}

interface TocValues {
  level: string | null;
  title: string | null;
  tocResultId: string | null;
  indicator: string | null;
  quantitative: string | null;
}

interface DbView {
  primaryCode: string | null;
  primaryAmbiguous: boolean;
  contributing: string[];
  toc: TocValues;
  tocAmbiguous: boolean;
}

interface CallbackView {
  primaryCode: string | null;
  contributingCodes: string[];
  mappings: Record<string, unknown>[];
  indicator: IndicatorFieldResolution;
  quantitativeContribution: IndicatorFieldResolution;
}

/**
 * Pointing callbackPath at a mapping key (for example 'mapping.level') is
 * the whole change that starts comparing a field as a real difference.
 * Unit of measurement and Target are hardcoded in the product and are not
 * diff fields. Indicator and Quantitative contribution are NOT driven by
 * this table at all — their resolution needs the indicators[] cardinality
 * rule, which a single path string cannot express (see
 * `resolveIndicatorField`); `buildChanges` handles the two of them
 * directly.
 */
type CallbackPath = string;

interface FieldSpec {
  label: string;
  callbackPath: CallbackPath;
  needsResolvedToc: boolean;
  before: (db: DbView) => PoolFundingChangeValue;
}

const emptyToc = (): TocValues => ({
  level: null,
  title: null,
  tocResultId: null,
  indicator: null,
  quantitative: null,
});

const POOL_FUNDING_DIFF_FIELDS: FieldSpec[] = [
  {
    label: SCIENCE_PROGRAM,
    callbackPath: 'primary.official_code',
    needsResolvedToc: false,
    before: (db) => db.primaryCode,
  },
  {
    label: CONTRIBUTING_PROGRAMS,
    callbackPath: 'contributing.official_codes',
    needsResolvedToc: false,
    before: (db) => programValue(db.contributing),
  },
  {
    label: TOC_LEVEL,
    callbackPath: 'mapping.level',
    needsResolvedToc: true,
    before: (db) => db.toc.level,
  },
  {
    label: TOC_RESULT,
    callbackPath: 'mapping.title',
    needsResolvedToc: true,
    before: (db) => db.toc.title,
  },
  {
    label: TOC_RESULT_ID,
    callbackPath: 'mapping.toc_result_id',
    needsResolvedToc: true,
    before: (db) => db.toc.tocResultId,
  },
];

const errorText = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (typeof value === 'string') {
    try {
      return asRecord(JSON.parse(value));
    } catch {
      return null;
    }
  }
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
};

const scalar = (value: unknown): string | null => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed === '' ? null : trimmed;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  return null;
};

const integerId = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isSafeInteger(value)) {
    return value;
  }
  if (typeof value === 'string' && /^-?\d+$/.test(value.trim())) {
    const parsed = Number(value.trim());
    return Number.isSafeInteger(parsed) ? parsed : null;
  }
  return null;
};

const stableKey = (value: unknown): string => {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableKey(item)).join(',')}]`;
  }
  if (value !== null && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableKey(record[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value) ?? 'undefined';
};

/**
 * The 2026-09-24 callback repeats one toc_mappings object. Counting both
 * reports two mappings where there is one.
 */
const dedupeTocMappings = (mappings: unknown[]): Record<string, unknown>[] => {
  const seen = new Set<string>();
  const unique: Record<string, unknown>[] = [];
  for (const mapping of mappings) {
    const record = asRecord(mapping);
    if (!record) {
      continue;
    }
    const key = stableKey(record);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    unique.push(record);
  }
  return unique;
};

const isPrimaryRole = (entry: Record<string, unknown>): boolean => {
  const role = scalar(entry.initiative_role);
  return role !== null && role.startsWith('Primary');
};

export interface CallbackTocMapping {
  title: string | null;
  tocResultId: string | null;
}

/**
 * The callback's primary programme and its toc_mappings, after the same
 * duplicate-object collapse the diff uses. A repeated mapping stays one.
 * Null title or id is kept: absence of a scalar is not absence of a mapping.
 */
export interface CallbackPrimary {
  spCode: string | null;
  mappings: CallbackTocMapping[];
}

const callbackEntries = (rawBody: unknown): Record<string, unknown>[] => {
  const root = asRecord(rawBody);
  const data = asRecord(root?.data);
  if (!Array.isArray(data?.obj_results_toc_result)) {
    return [];
  }
  return data.obj_results_toc_result.flatMap((item) => {
    const record = asRecord(item);
    return record ? [record] : [];
  });
};

export const readCallbackPrimary = (rawBody: unknown): CallbackPrimary => {
  const primary = callbackEntries(rawBody).find((entry) =>
    isPrimaryRole(entry),
  );
  if (!primary) {
    return { spCode: null, mappings: [] };
  }
  const mappings = dedupeTocMappings(
    Array.isArray(primary.toc_mappings) ? primary.toc_mappings : [],
  ).map((mapping) => ({
    title: scalar(mapping.title),
    tocResultId: scalar(mapping.toc_result_id),
  }));
  return {
    spCode: scalar(primary.official_code),
    mappings,
  };
};

export const resolveActiveSnapshot = async (
  run: (
    sql: string,
    params: unknown[],
  ) => Promise<Array<{ result_id: unknown }>>,
  officialCode: string,
  reportYearId: number,
): Promise<SnapshotLookup> => {
  const rows = await run(ACTIVE_SNAPSHOT_SQL, [officialCode, reportYearId]);
  if (rows.length !== 1) {
    return {
      ok: false,
      reason: `found ${rows.length} active snapshots for result_official_code=${officialCode} report_year_id=${reportYearId}`,
    };
  }
  const resultId = integerId(rows[0]?.result_id);
  if (resultId === null) {
    return {
      ok: false,
      reason: `active snapshot result_id is not an integer for result_official_code=${officialCode} report_year_id=${reportYearId}`,
    };
  }
  return { ok: true, resultId };
};

const tocFromRow = (row: Record<string, unknown>): TocValues => ({
  level: scalar(row.level),
  title: scalar(row.toc_result_title),
  tocResultId: scalar(row.toc_result_id),
  indicator: scalar(row.indicator_description),
  quantitative: scalar(row.quantitative_contribution),
});

const readBaseline = (
  spRows: Array<Record<string, unknown>>,
  tocRows: Array<Record<string, unknown>>,
): DbView => {
  const primaries = spRows.flatMap((row) => {
    if (scalar(row.sp_role) !== 'PRIMARY') {
      return [];
    }
    const code = scalar(row.sp_code);
    return code === null ? [] : [code];
  });
  const contributing = spRows.flatMap((row) => {
    if (scalar(row.sp_role) !== 'CONTRIBUTING') {
      return [];
    }
    const code = scalar(row.sp_code);
    return code === null ? [] : [code];
  });
  const primaryAmbiguous = primaries.length > 1;
  const primaryCode = primaries.length === 1 ? primaries[0] : null;

  let tocAmbiguous = false;
  let toc = emptyToc();
  if (primaryCode !== null) {
    const matches = tocRows.filter(
      (row) => scalar(row.sp_code) === primaryCode,
    );
    if (matches.length > 1) {
      tocAmbiguous = true;
    } else if (matches.length === 1) {
      toc = tocFromRow(matches[0]);
    }
  } else if (tocRows.length === 1) {
    toc = tocFromRow(tocRows[0]);
  } else if (tocRows.length > 1) {
    tocAmbiguous = true;
  }

  return {
    primaryCode,
    primaryAmbiguous,
    contributing,
    toc,
    tocAmbiguous,
  };
};

const readCallback = (rawBody: unknown): CallbackView => {
  const entries = callbackEntries(rawBody);
  const primary = entries.find((entry) => isPrimaryRole(entry)) ?? null;
  const mappings =
    primary === null
      ? []
      : dedupeTocMappings(
          Array.isArray(primary.toc_mappings) ? primary.toc_mappings : [],
        );
  const contributingCodes = entries
    .filter((entry) => !isPrimaryRole(entry))
    .map((entry) => scalar(entry.official_code))
    .filter((code): code is string => code !== null);
  return {
    primaryCode: primary === null ? null : scalar(primary.official_code),
    contributingCodes,
    mappings,
    indicator: resolveIndicatorField(mappings, 'indicator_description'),
    quantitativeContribution: resolveIndicatorField(
      mappings,
      'target_contribution',
    ),
  };
};

type IndicatorFieldResolution =
  | { kind: 'value'; value: PoolFundingChangeValue }
  | { kind: 'unprovided' }
  | { kind: 'ambiguous' };

/**
 * `toc_mappings[].indicators[]`, added to the callback 2026-09-29.
 * Owner's rule (2026-09-29): exactly one entry is a determinate value; a
 * mapping whose `indicators` key is present but holds zero or several
 * entries is ambiguous and must not be guessed at — the field is skipped
 * for the whole delivery, never averaged or defaulted to the first one. A
 * mapping with no `indicators` key at all (every callback before
 * 2026-09-29) is the ORIGINAL absence this field's "Not provided by PRMS"
 * branch exists for, and stays distinct from ambiguity: 'ambiguous' wins
 * over 'unprovided' when a delivery mixes both, because an anomaly PRMS
 * actually sent is a stronger signal than a mapping that predates the
 * capability.
 */
const resolveIndicatorField = (
  mappings: Record<string, unknown>[],
  key: 'indicator_description' | 'target_contribution',
): IndicatorFieldResolution => {
  let sawAmbiguous = false;
  let sawAbsent = false;
  const values: string[] = [];
  for (const mapping of mappings) {
    const raw = mapping.indicators;
    if (raw === undefined) {
      sawAbsent = true;
      continue;
    }
    if (!Array.isArray(raw) || raw.length !== 1) {
      sawAmbiguous = true;
      continue;
    }
    const entry = asRecord(raw[0]);
    const value = entry ? scalar(entry[key]) : null;
    if (value !== null) {
      values.push(value);
    }
  }
  if (sawAmbiguous) {
    return { kind: 'ambiguous' };
  }
  if (values.length > 0) {
    return { kind: 'value', value: collapse(values) };
  }
  return sawAbsent ? { kind: 'unprovided' } : { kind: 'value', value: null };
};

/** One value stays a scalar. Two copies stay a list, so a repeated mapping is visible until dedupe. */
const collapse = (values: string[]): PoolFundingChangeValue => {
  if (values.length === 0) {
    return null;
  }
  if (values.length === 1) {
    return values[0];
  }
  return values;
};

const mappingValues = (
  mappings: Record<string, unknown>[],
  key: string,
): PoolFundingChangeValue =>
  collapse(
    mappings.flatMap((mapping) => {
      const value = scalar(mapping[key]);
      return value === null ? [] : [value];
    }),
  );

const readCallbackPath = (
  path: string,
  callback: CallbackView,
): PoolFundingChangeValue => {
  if (path === 'primary.official_code') {
    return callback.primaryCode;
  }
  if (path === 'contributing.official_codes') {
    return programValue(callback.contributingCodes);
  }
  if (path.startsWith('mapping.')) {
    return mappingValues(callback.mappings, path.slice('mapping.'.length));
  }
  return null;
};

const programValue = (ids: string[]): string[] | null => {
  const unique = [...new Set(ids)].sort();
  return unique.length === 0 ? null : unique;
};

const sameValue = (
  before: PoolFundingChangeValue,
  after: PoolFundingChangeValue,
): boolean => {
  if (Array.isArray(before) && Array.isArray(after)) {
    return (
      before.length === after.length &&
      before.every((item, index) => item === after[index])
    );
  }
  return before === after;
};

const assignChange = (
  changes: PoolFundingChanges,
  label: string,
  before: PoolFundingChangeValue,
  after: PoolFundingChangeValue,
): void => {
  if (sameValue(before, after)) {
    return;
  }
  changes[label] = { before, after };
};

/**
 * Real differences only. An unprovided-field marker is not a change: apply
 * must not treat it as something to write. Identified by the sentinel
 * VALUE, not by a field-label lookup — Indicator and Quantitative
 * contribution are not in `POOL_FUNDING_DIFF_FIELDS` at all (their
 * resolution needs the indicators[] cardinality rule), and each can be
 * either a real diff or "Not provided by PRMS" depending on the delivery.
 */
export const applicableChanges = (
  changes: PoolFundingChanges,
): PoolFundingChanges => {
  const applicable: PoolFundingChanges = {};
  for (const [label, value] of Object.entries(changes)) {
    if (value.after !== NOT_PROVIDED_BY_PRMS) {
      applicable[label] = value;
    }
  }
  return applicable;
};

const recordUnprovided = (
  changes: PoolFundingChanges,
  label: string,
  before: PoolFundingChangeValue,
): void => {
  if (before === null) {
    return;
  }
  changes[label] = { before, after: NOT_PROVIDED_BY_PRMS };
};

/**
 * Indicator / Quantitative contribution: 'ambiguous' is dropped silently
 * here (the caller already logged it once, before buildChanges ran, using
 * the same CallbackView); 'unprovided' becomes the sentinel marker;
 * 'value' is compared like any other field.
 */
const applyIndicatorResolution = (
  changes: PoolFundingChanges,
  label: string,
  before: PoolFundingChangeValue,
  resolution: IndicatorFieldResolution,
): void => {
  if (resolution.kind === 'ambiguous') {
    return;
  }
  if (resolution.kind === 'unprovided') {
    recordUnprovided(changes, label, before);
    return;
  }
  assignChange(changes, label, before, resolution.value);
};

const buildChanges = (
  db: DbView,
  callback: CallbackView,
): PoolFundingChanges => {
  const changes: PoolFundingChanges = {};
  for (const field of POOL_FUNDING_DIFF_FIELDS) {
    if (field.needsResolvedToc && db.tocAmbiguous) {
      continue;
    }
    if (field.callbackPath === 'primary.official_code' && db.primaryAmbiguous) {
      continue;
    }
    assignChange(
      changes,
      field.label,
      field.before(db),
      readCallbackPath(field.callbackPath, callback),
    );
  }

  if (!db.tocAmbiguous) {
    applyIndicatorResolution(
      changes,
      INDICATOR,
      db.toc.indicator,
      callback.indicator,
    );
    applyIndicatorResolution(
      changes,
      QUANTITATIVE_CONTRIBUTION,
      db.toc.quantitative,
      callback.quantitativeContribution,
    );
  }
  return changes;
};

@Injectable()
export class PoolFundingMappingDiffService {
  private readonly logger = new LoggerUtil({
    name: PoolFundingMappingDiffService.name,
  });

  constructor(private readonly dataSource: DataSource) {}

  /**
   * Computes the diff and writes `changes`. Never throws: a failure here
   * must not rewrite `correlation_outcome` or `processing_state`.
   */
  async record(input: PoolFundingDiffInput): Promise<void> {
    try {
      await this.recordUnsafe(input);
    } catch (error) {
      this.logger._error(
        `Pool-funding diff failed for result_prms_sync_history id=${input.historyId}: ${errorText(error)}`,
      );
    }
  }

  private async recordUnsafe(input: PoolFundingDiffInput): Promise<void> {
    const rows: HistorySnapshot[] = await this.dataSource.query(
      HISTORY_ROW_SQL,
      [input.historyId],
    );
    const row = rows[0];
    if (!row) {
      this.logger._error(
        `Pool-funding diff found no result_prms_sync_history row id=${input.historyId}`,
      );
      return;
    }

    const officialCode = scalar(row.result_official_code);
    const reportYearId = integerId(row.result_year);
    if (officialCode === null || reportYearId === null) {
      this.logger._warn(
        `Pool-funding diff has no result_official_code or result_year on history id=${input.historyId}; writing empty changes`,
      );
      await this.writeChanges(input.historyId, {});
      return;
    }

    const snapshot = await resolveActiveSnapshot(
      (sql, params) => this.dataSource.query(sql, params),
      officialCode,
      reportYearId,
    );
    if (snapshot.ok === false) {
      this.logger._warn(
        `Pool-funding diff ${snapshot.reason}; writing empty changes`,
      );
      await this.writeChanges(input.historyId, {});
      return;
    }

    const tocRows: Array<Record<string, unknown>> = await this.dataSource.query(
      TOC_SQL,
      [snapshot.resultId],
    );
    if (tocRows.length === 0) {
      this.logger._warn(
        `Pool-funding diff found no active ToC row for result_id=${snapshot.resultId}; writing empty changes`,
      );
      await this.writeChanges(input.historyId, {});
      return;
    }

    const spRows: Array<Record<string, unknown>> = await this.dataSource.query(
      SP_SQL,
      [snapshot.resultId],
    );
    const baseline = readBaseline(spRows, tocRows);
    if (baseline.primaryAmbiguous) {
      this.logger._warn(
        `Pool-funding diff found more than one PRIMARY SP for result_id=${snapshot.resultId}; Science Program left out`,
      );
    }
    if (baseline.tocAmbiguous) {
      this.logger._warn(
        `Pool-funding diff could not choose one ToC row for result_id=${snapshot.resultId}; ToC fields left out`,
      );
    }

    const callback = readCallback(row.raw_body);
    if (
      callback.indicator.kind === 'ambiguous' ||
      callback.quantitativeContribution.kind === 'ambiguous'
    ) {
      this.logger._warn(
        `Pool-funding diff found a toc_mappings entry with zero or several indicators[] for result_id=${snapshot.resultId}; Indicator/Quantitative contribution left out for this delivery`,
      );
    }

    const changes = buildChanges(baseline, callback);
    await this.writeChanges(input.historyId, changes);
  }

  private async writeChanges(
    historyId: number,
    changes: PoolFundingChanges,
  ): Promise<void> {
    await this.dataSource.query(WRITE_CHANGES_SQL, [
      JSON.stringify(changes),
      historyId,
    ]);
  }
}
