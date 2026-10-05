import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { LoggerUtil } from '../../shared/utils/logger.util';
import { DeliveryCorrelationOutcome } from './enum/delivery-correlation-outcome.enum';
import {
  CONTRIBUTING_PROGRAMS,
  PoolFundingChange,
  PoolFundingChangeValue,
  PoolFundingChanges,
  SCIENCE_PROGRAM,
  TOC_RESULT,
  TOC_RESULT_ID,
  applicableChanges,
  readCallbackPrimary,
  resolveActiveSnapshot,
  tocLevelCode,
} from './pool-funding-mapping-diff.service';
import { TocIntegrationService } from '../../tools/toc-integration/toc-integration.service';
import {
  TocIndicator,
  TocResult,
} from '../../tools/toc-integration/dto/toc-integration.types';
import { MAPPABLE_LIVE_VERSION } from '../bilateral/utils/toc-level-rules.util';

/**
 * Applies an approved pool-funding diff onto the version's own rows.
 *
 * The version is the active snapshot for (result_official_code, result_year)
 * on the history row — the same row the diff compared. A changed value is
 * never updated in place: the active row is deactivated and a new row is
 * inserted. Runs after the diff, post-acknowledgement, and must not throw —
 * the 2xx is already gone, and correlation_outcome plus processing_state
 * stay as the correlator left them.
 */

const HISTORY_SQL = `
SELECT decision, changes, correlation_outcome, raw_body,
       result_official_code, result_year
FROM result_prms_sync_history
WHERE id = ?
`;

const ACTIVE_ALIGNMENT_SQL = `
SELECT id
FROM result_pool_funding_alignment
WHERE result_id = ?
  AND is_active = TRUE
ORDER BY id ASC
`;

const ACTIVE_SP_SQL = `
SELECT id, alignment_id, sp_code, sp_role
FROM result_pool_funding_alignment_sp
WHERE alignment_id = ?
  AND is_active = TRUE
`;

const ACTIVE_TOC_SQL = `
SELECT id, sp_code, aligns_with_toc, level, toc_result_id, indicator_id,
       quantitative_contribution, toc_result_title, indicator_description,
       unit_messurament, target_value, target_year
FROM result_pool_funding_toc_alignment
WHERE result_id = ?
  AND is_active = TRUE
`;

const DEACTIVATE_SP_SQL = `
UPDATE result_pool_funding_alignment_sp
SET is_active = FALSE
WHERE id = ?
  AND is_active = TRUE
`;

// created_by is NULL: PRMS reviewers have no sec_users identity.
// The same convention is used for created_by on result_prms_sync_history inserts.
const INSERT_SP_SQL = `
INSERT INTO result_pool_funding_alignment_sp
  (alignment_id, sp_code, sp_role, created_by, is_active)
VALUES (?, ?, ?, NULL, TRUE)
`;

const DEACTIVATE_TOC_SQL = `
UPDATE result_pool_funding_toc_alignment
SET is_active = FALSE
WHERE id = ?
  AND is_active = TRUE
`;

// The ToC result did not move, only the indicator under it. Deactivate+insert
// would version a row for a change that fits in place.
const UPDATE_TOC_INDICATOR_SQL = `
UPDATE result_pool_funding_toc_alignment
SET indicator_id = ?,
    indicator_description = ?,
    quantitative_contribution = ?,
    unit_messurament = ?,
    target_value = ?,
    target_year = ?
WHERE id = ?
  AND is_active = TRUE
`;

// created_by is NULL: PRMS reviewers have no sec_users identity.
// The same convention is used for created_by on result_prms_sync_history inserts.
const INSERT_TOC_SQL = `
INSERT INTO result_pool_funding_toc_alignment
  (result_id, sp_code, aligns_with_toc, level, toc_result_id, indicator_id,
   quantitative_contribution, toc_result_title, indicator_description,
   unit_messurament, target_value, target_year, created_by, is_active)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, TRUE)
`;

export interface PoolFundingApplyInput {
  /** `result_prms_sync_history.id` of the decision row. */
  historyId: number;
  /**
   * Live `results.result_id` from DeliveryCorrelatorService. The write
   * target is the active snapshot resolved from the history row.
   */
  resultId: number;
}

interface SpRow {
  id: number;
  alignment_id: number;
  sp_code: string;
  sp_role: string | null;
}

interface TocRow {
  id: number;
  sp_code: string;
  aligns_with_toc: unknown;
  level: unknown;
  toc_result_id: unknown;
  indicator_id: unknown;
  quantitative_contribution: unknown;
  toc_result_title: unknown;
  indicator_description: unknown;
  unit_messurament: unknown;
  target_value: unknown;
  target_year: unknown;
}

interface InheritedToc {
  aligns_with_toc: unknown;
  level: unknown;
  indicator_id: unknown;
  quantitative_contribution: unknown;
  indicator_description: unknown;
  unit_messurament: unknown;
  target_value: unknown;
  target_year: unknown;
}

interface PlannedWrite {
  sql: string;
  params: unknown[];
}

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

const integerId = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isSafeInteger(value)) {
    return value;
  }
  if (typeof value === 'string' && /^-?\d+$/.test(value)) {
    const parsed = Number(value);
    return Number.isSafeInteger(parsed) ? parsed : null;
  }
  return null;
};

const cell = (value: unknown): unknown => (value === undefined ? null : value);

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

/**
 * INHERITED FROM THE PREVIOUS ROW AND NOT CONFIRMED BY PRMS.
 * The callback does not carry these eight columns. They are copied from the
 * row being deactivated and must not be defaulted, blanked, or recomputed.
 */
/**
 * The callback's indicator, once the lambda-toc catalog has bridged PRMS's
 * `toc_results_indicator_id` (a UUID) to our numeric `indicator_id`. Without
 * that bridge the client cannot render the value at all: its dropdown binds
 * the numeric id and looks it up inside the SELECTED ToC result.
 */
interface ResolvedIndicator {
  indicatorId: number;
  description: string | null;
  unitMeasurement: string | null;
  targetValue: string | null;
  targetYear: number;
  quantitativeContribution: string | null;
}

/**
 * The reviewer's indicator replaces the inherited one. Owner's rule,
 * 2026-09-29: a reporter cannot edit this field after the push, so a value
 * PRMS sent must win over one carried across from the previous ToC result --
 * which, after a ToC-result move, no longer exists under the new result.
 * `quantitative_contribution` only yields when PRMS actually sent one.
 */
const withResolvedIndicator = (
  inherited: InheritedToc,
  resolved: ResolvedIndicator | null,
): InheritedToc =>
  resolved === null
    ? inherited
    : {
        ...inherited,
        indicator_id: resolved.indicatorId,
        indicator_description: resolved.description,
        quantitative_contribution:
          resolved.quantitativeContribution ??
          inherited.quantitative_contribution,
        unit_messurament: resolved.unitMeasurement,
        target_value: resolved.targetValue,
        target_year: resolved.targetYear,
      };

/**
 * Mirrors `BilateralService.resolveLiveTargetValue` (R-BIL-090 AC.3): the
 * `targets[]` entry for the live version wins, else null. Written here rather
 * than shared so the webhook path does not pull in the bilateral service.
 */
const liveTargetValue = (indicator: TocIndicator): string | null =>
  (indicator.targets ?? []).find(
    (target) => target.target_date === String(MAPPABLE_LIVE_VERSION),
  )?.target_value ?? null;

const inheritedFrom = (row: TocRow): InheritedToc => ({
  aligns_with_toc: cell(row.aligns_with_toc),
  level: cell(row.level),
  indicator_id: cell(row.indicator_id),
  quantitative_contribution: cell(row.quantitative_contribution),
  indicator_description: cell(row.indicator_description),
  unit_messurament: cell(row.unit_messurament),
  target_value: cell(row.target_value),
  target_year: cell(row.target_year),
});

const sameCell = (left: unknown, right: unknown): boolean =>
  cell(left) === cell(right);

const sameTocId = (current: unknown, desired: unknown): boolean => {
  if (desired === null || desired === undefined) {
    return current === null || current === undefined;
  }
  if (typeof desired === 'number') {
    return integerId(current) === desired;
  }
  return current === desired;
};

const sameInherited = (row: TocRow, inherited: InheritedToc): boolean =>
  sameCell(row.aligns_with_toc, inherited.aligns_with_toc) &&
  sameCell(row.level, inherited.level) &&
  sameCell(row.indicator_id, inherited.indicator_id) &&
  sameCell(
    row.quantitative_contribution,
    inherited.quantitative_contribution,
  ) &&
  sameCell(row.indicator_description, inherited.indicator_description) &&
  sameCell(row.unit_messurament, inherited.unit_messurament) &&
  sameCell(row.target_value, inherited.target_value) &&
  sameCell(row.target_year, inherited.target_year);

const parseChanges = (value: unknown): PoolFundingChanges | null => {
  const record = asRecord(value);
  return record ? (record as PoolFundingChanges) : null;
};

const readChange = (
  changes: PoolFundingChanges,
  label: string,
): PoolFundingChange | null => {
  if (!Object.prototype.hasOwnProperty.call(changes, label)) {
    return null;
  }
  const value = changes[label];
  if (
    value === null ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    !('after' in value)
  ) {
    return null;
  }
  return value;
};

type ParsedCode =
  | { kind: 'code'; code: string }
  | { kind: 'blank' }
  | { kind: 'list' };

const parseCode = (value: PoolFundingChangeValue): ParsedCode => {
  if (Array.isArray(value)) {
    return { kind: 'list' };
  }
  if (typeof value !== 'string') {
    return { kind: 'blank' };
  }
  const trimmed = value.trim();
  return trimmed === '' ? { kind: 'blank' } : { kind: 'code', code: trimmed };
};

/** null is the empty set. A list that is not all strings is unusable. */
const parseCodeSet = (value: PoolFundingChangeValue): Set<string> | null => {
  if (value === null) {
    return new Set();
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return new Set(trimmed === '' ? [] : [trimmed]);
  }
  if (!Array.isArray(value)) {
    return null;
  }
  const codes = new Set<string>();
  for (const item of value) {
    if (typeof item !== 'string') {
      return null;
    }
    const trimmed = item.trim();
    if (trimmed !== '') {
      codes.add(trimmed);
    }
  }
  return codes;
};

type ParsedTitle = { kind: 'value'; value: string | null } | { kind: 'skip' };

const parseTitle = (value: PoolFundingChangeValue): ParsedTitle => {
  if (value === null) {
    return { kind: 'value', value: null };
  }
  if (typeof value === 'string') {
    return { kind: 'value', value };
  }
  return { kind: 'skip' };
};

type ParsedId = { kind: 'value'; value: number | null } | { kind: 'skip' };

const parseTocId = (value: PoolFundingChangeValue): ParsedId => {
  if (value === null) {
    return { kind: 'value', value: null };
  }
  const parsed = integerId(value);
  return parsed === null ? { kind: 'skip' } : { kind: 'value', value: parsed };
};

const parseCallbackTocId = (
  value: string | null,
): number | null | undefined => {
  if (value === null) {
    return null;
  }
  return integerId(value) ?? undefined;
};

const tocInsertParams = (
  resultId: number,
  spCode: string,
  tocResultId: unknown,
  tocResultTitle: unknown,
  inherited: InheritedToc,
): unknown[] => [
  resultId,
  spCode,
  inherited.aligns_with_toc,
  inherited.level,
  tocResultId,
  inherited.indicator_id,
  inherited.quantitative_contribution,
  tocResultTitle,
  inherited.indicator_description,
  inherited.unit_messurament,
  inherited.target_value,
  inherited.target_year,
];

const toSpRow = (raw: Record<string, unknown>): SpRow | null => {
  const id = integerId(raw.id);
  const alignmentId = integerId(raw.alignment_id);
  if (id === null || alignmentId === null || typeof raw.sp_code !== 'string') {
    return null;
  }
  return {
    id,
    alignment_id: alignmentId,
    sp_code: raw.sp_code,
    sp_role: typeof raw.sp_role === 'string' ? raw.sp_role : null,
  };
};

const toTocRow = (raw: Record<string, unknown>): TocRow | null => {
  const id = integerId(raw.id);
  if (id === null || typeof raw.sp_code !== 'string') {
    return null;
  }
  return {
    id,
    sp_code: raw.sp_code,
    aligns_with_toc: raw.aligns_with_toc,
    level: raw.level,
    toc_result_id: raw.toc_result_id,
    indicator_id: raw.indicator_id,
    quantitative_contribution: raw.quantitative_contribution,
    toc_result_title: raw.toc_result_title,
    indicator_description: raw.indicator_description,
    unit_messurament: raw.unit_messurament,
    target_value: raw.target_value,
    target_year: raw.target_year,
  };
};

@Injectable()
export class PoolFundingMappingApplyService {
  private readonly logger = new LoggerUtil({
    name: PoolFundingMappingApplyService.name,
  });

  constructor(
    private readonly dataSource: DataSource,
    private readonly tocIntegration: TocIntegrationService,
  ) {}

  /**
   * Never throws. A failure here must not rewrite correlation_outcome or
   * processing_state.
   */
  async apply(input: PoolFundingApplyInput): Promise<void> {
    try {
      await this.applyUnsafe(input);
    } catch (error) {
      this.logger._error(
        `Pool-funding apply failed for result_prms_sync_history id=${input.historyId} result_id=${input.resultId}: ${errorText(error)}`,
      );
    }
  }

  private async applyUnsafe(input: PoolFundingApplyInput): Promise<void> {
    const rows: Array<Record<string, unknown>> = await this.dataSource.query(
      HISTORY_SQL,
      [input.historyId],
    );
    const row = rows[0];
    if (!row) {
      this.logger._warn(
        `Pool-funding apply found no result_prms_sync_history row id=${input.historyId}`,
      );
      return;
    }
    if (row.decision !== 'APPROVE') {
      return;
    }
    const stored = parseChanges(row.changes);
    if (!stored) {
      return;
    }
    const changes = applicableChanges(stored);
    if (Object.keys(changes).length === 0) {
      return;
    }
    if (row.correlation_outcome !== DeliveryCorrelationOutcome.CORRELATED) {
      return;
    }

    const officialCode = scalar(row.result_official_code);
    const reportYearId = integerId(row.result_year);
    if (officialCode === null || reportYearId === null) {
      this.logger._warn(
        `Pool-funding apply has no result_official_code or result_year on history id=${input.historyId}; nothing written`,
      );
      return;
    }
    const snapshot = await resolveActiveSnapshot(
      (sql, params) => this.dataSource.query(sql, params),
      officialCode,
      reportYearId,
    );
    if (snapshot.ok === false) {
      this.logger._warn(
        `Pool-funding apply ${snapshot.reason}; nothing written`,
      );
      return;
    }

    // Resolved OUTSIDE the transaction: it reaches lambda-toc over HTTP, and
    // a network round trip does not belong inside an open write transaction.
    const resolvedIndicator = await this.resolveIndicator(
      input.historyId,
      row.raw_body,
    );

    await this.dataSource.transaction(async (manager) => {
      const current = await this.loadActive(manager, snapshot.resultId);
      const writes = this.plan(
        { historyId: input.historyId, resultId: snapshot.resultId },
        changes,
        row.raw_body,
        current,
        resolvedIndicator,
      );
      for (const write of writes) {
        await manager.query(write.sql, write.params);
      }
    });
  }

  private async loadActive(
    manager: EntityManager,
    resultId: number,
  ): Promise<{ alignmentId: number | null; sps: SpRow[]; tocs: TocRow[] }> {
    const alignments: Array<Record<string, unknown>> = await manager.query(
      ACTIVE_ALIGNMENT_SQL,
      [resultId],
    );
    if (alignments.length > 1) {
      this.logger._warn(
        `Pool-funding apply found ${alignments.length} active alignments for result_id=${resultId}; using the lowest id`,
      );
    }
    const alignmentId =
      alignments.length > 0 ? integerId(alignments[0].id) : null;
    const spRaw: Array<Record<string, unknown>> =
      alignmentId === null
        ? []
        : await manager.query(ACTIVE_SP_SQL, [alignmentId]);
    const tocRaw: Array<Record<string, unknown>> = await manager.query(
      ACTIVE_TOC_SQL,
      [resultId],
    );
    return {
      alignmentId,
      sps: spRaw.flatMap((raw) => {
        const parsed = toSpRow(raw);
        return parsed ? [parsed] : [];
      }),
      tocs: tocRaw.flatMap((raw) => {
        const parsed = toTocRow(raw);
        return parsed ? [parsed] : [];
      }),
    };
  }

  /**
   * PRMS names the indicator by `toc_results_indicator_id`, a UUID. Our
   * `indicator_id` is the lambda-toc numeric id, and the client's dropdown
   * binds that number and resolves it INSIDE the selected ToC result -- so a
   * numeric id carried over from a different ToC result renders as an empty
   * field, which is exactly what result 20017 showed. Only the catalog bridges
   * the two spaces, so an unreachable or unmatched catalog means we write
   * nothing rather than a number we cannot vouch for.
   */
  private async resolveIndicator(
    historyId: number,
    rawBody: unknown,
  ): Promise<ResolvedIndicator | null> {
    const callback = readCallbackPrimary(rawBody);
    if (callback.mappings.length !== 1) {
      return null;
    }
    const mapping = callback.mappings[0];
    const indicator = mapping.indicator;
    // No usable entry: the diff already logged why, and the previous value
    // stays. Not a skip -- there is nothing PRMS asked us to write.
    if (indicator === null) {
      return null;
    }
    const sp = callback.spCode;
    const level = tocLevelCode(mapping.level);
    const tocResultId = integerId(mapping.tocResultId);
    if (sp === null || level === null || tocResultId === null) {
      this.logger._warn(
        `Pool-funding apply cannot resolve the callback indicator for history id=${historyId}: sp=${sp ?? 'none'} level=${mapping.level ?? 'none'} toc_result_id=${mapping.tocResultId ?? 'none'}; the stored indicator is left in place`,
      );
      return null;
    }

    let results: TocResult[];
    try {
      results = await this.tocIntegration.getTocResults(sp, level);
    } catch (error) {
      this.logger._warn(
        `Pool-funding apply could not read the ToC catalog for history id=${historyId} (${sp}/${level}): ${errorText(error)}; the stored indicator is left in place`,
      );
      return null;
    }

    const tocResult = results.find(
      (entry) => entry.toc_result_id === tocResultId,
    );
    const match = tocResult
      ? this.matchIndicator(
          tocResult,
          indicator.tocResultIndicatorId,
          indicator.description,
        )
      : undefined;
    if (!match) {
      this.logger._warn(
        `Pool-funding apply found no catalog indicator for history id=${historyId} (${sp}/${level} toc_result_id=${tocResultId} toc_results_indicator_id=${indicator.tocResultIndicatorId ?? 'none'}); the stored indicator is left in place`,
      );
      return null;
    }
    return {
      indicatorId: match.indicator_id,
      description: match.indicator_description ?? indicator.description,
      unitMeasurement: match.unit_messurament ?? null,
      targetValue: liveTargetValue(match),
      targetYear: MAPPABLE_LIVE_VERSION,
      quantitativeContribution: indicator.targetContribution,
    };
  }

  /**
   * The UUID is the identity; the description is a last resort for a catalog
   * that has not caught up with PRMS's id, and it has to be an exact match.
   */
  private matchIndicator(
    tocResult: TocResult,
    uuid: string | null,
    description: string | null,
  ): TocIndicator | undefined {
    const indicators = tocResult.indicators ?? [];
    const byId =
      uuid === null
        ? undefined
        : indicators.find((entry) => entry.toc_result_indicator_id === uuid);
    if (byId) {
      return byId;
    }
    return description === null
      ? undefined
      : indicators.find(
          (entry) => entry.indicator_description?.trim() === description,
        );
  }

  private plan(
    input: PoolFundingApplyInput,
    changes: PoolFundingChanges,
    rawBody: unknown,
    current: { alignmentId: number | null; sps: SpRow[]; tocs: TocRow[] },
    resolved: ResolvedIndicator | null,
  ): PlannedWrite[] {
    const writes: PlannedWrite[] = [];
    const primary = this.onlyPrimary(input, current.sps);
    const movedPrimary =
      primary === 'ambiguous'
        ? null
        : this.planPrimary(
            input,
            changes,
            current.alignmentId,
            primary,
            writes,
          );
    if (movedPrimary) {
      this.planTocMove(
        input,
        rawBody,
        movedPrimary,
        primary === 'ambiguous' ? null : primary,
        current.tocs,
        writes,
        resolved,
      );
    } else if (primary !== 'ambiguous') {
      this.planTocFields(
        input,
        changes,
        primary,
        current.tocs,
        writes,
        resolved,
      );
      // The row was not rewritten, so an indicator-only edit still needs a
      // home. Guarded on the insert so a rewritten row is never touched twice.
      if (!writes.some((write) => write.sql === INSERT_TOC_SQL)) {
        this.planIndicatorOnly(input, primary, current.tocs, writes, resolved);
      }
    }
    this.planContributing(
      input,
      changes,
      current.alignmentId,
      current.sps,
      writes,
    );
    return writes;
  }

  private onlyPrimary(
    input: PoolFundingApplyInput,
    sps: SpRow[],
  ): SpRow | null | 'ambiguous' {
    const primaries = sps.filter((row) => row.sp_role === 'PRIMARY');
    if (primaries.length > 1) {
      this.logger._warn(
        `Pool-funding apply found ${primaries.length} active PRIMARY rows for result_id=${input.resultId}; skipping the primary replacement`,
      );
      return 'ambiguous';
    }
    return primaries[0] ?? null;
  }

  /**
   * Returns the new primary code when this call is replacing the primary,
   * so the ToC row can be rebuilt from that same callback entry.
   */
  private planPrimary(
    input: PoolFundingApplyInput,
    changes: PoolFundingChanges,
    alignmentId: number | null,
    current: SpRow | null,
    writes: PlannedWrite[],
  ): string | null {
    const change = readChange(changes, SCIENCE_PROGRAM);
    if (!change) {
      if (Object.prototype.hasOwnProperty.call(changes, SCIENCE_PROGRAM)) {
        this.skip(input, 'Science Program change has no after value');
      }
      return null;
    }
    const parsed = parseCode(change.after);
    if (parsed.kind !== 'code') {
      this.skip(input, `Science Program after is ${parsed.kind}; not written`);
      return null;
    }
    if (current?.sp_code === parsed.code) {
      return null;
    }
    if (alignmentId === null) {
      this.skip(
        input,
        'no active pool-funding alignment to attach the primary SP',
      );
      return null;
    }
    if (current) {
      writes.push({ sql: DEACTIVATE_SP_SQL, params: [current.id] });
    }
    writes.push({
      sql: INSERT_SP_SQL,
      params: [alignmentId, parsed.code, 'PRIMARY'],
    });
    return current ? parsed.code : null;
  }

  /**
   * Primary programme changed. The new ToC row's sp_code, toc_result_id and
   * toc_result_title all come from the callback's primary entry. The old
   * toc_result_id is not carried onto the new programme. The eight
   * unobservable columns still come from the deactivated row.
   */
  private planTocMove(
    input: PoolFundingApplyInput,
    rawBody: unknown,
    newSpCode: string,
    previousPrimary: SpRow | null,
    tocs: TocRow[],
    writes: PlannedWrite[],
    resolved: ResolvedIndicator | null,
  ): void {
    if (!previousPrimary) {
      this.skip(input, 'primary changed but there is no previous PRIMARY row');
      return;
    }
    const callback = readCallbackPrimary(rawBody);
    if (callback.spCode !== newSpCode) {
      this.skip(
        input,
        `callback primary sp_code=${callback.spCode ?? 'none'} does not match the approved primary ${newSpCode}; ToC row left in place`,
      );
      return;
    }
    if (callback.mappings.length === 0) {
      this.skip(
        input,
        'primary changed but the callback primary entry has no toc_mappings; existing ToC row left active',
      );
      return;
    }
    if (callback.mappings.length > 1) {
      this.skip(
        input,
        'callback primary toc_mappings is a list; ToC row left in place',
      );
      return;
    }
    const mapping = callback.mappings[0];
    const tocResultId = parseCallbackTocId(mapping.tocResultId);
    if (tocResultId === undefined) {
      this.skip(
        input,
        `callback toc_result_id=${mapping.tocResultId ?? 'none'} is not an integer; ToC row left in place`,
      );
      return;
    }
    const source = this.tocForSp(input, tocs, previousPrimary.sp_code);
    if (!source) {
      this.skip(
        input,
        `no active ToC row for primary ${previousPrimary.sp_code}; nothing to inherit, so no ToC row is inserted`,
      );
      return;
    }
    const inherited = withResolvedIndicator(inheritedFrom(source), resolved);
    const existing = tocs.find((row) => row.sp_code === newSpCode) ?? null;
    const alreadyApplied =
      existing !== null &&
      sameCell(existing.toc_result_title, mapping.title) &&
      sameTocId(existing.toc_result_id, tocResultId) &&
      sameInherited(existing, inherited);
    if (alreadyApplied) {
      if (existing.id !== source.id) {
        writes.push({ sql: DEACTIVATE_TOC_SQL, params: [source.id] });
      }
      return;
    }
    if (existing && existing.id !== source.id) {
      writes.push({ sql: DEACTIVATE_TOC_SQL, params: [existing.id] });
    }
    writes.push({ sql: DEACTIVATE_TOC_SQL, params: [source.id] });
    writes.push({
      sql: INSERT_TOC_SQL,
      params: tocInsertParams(
        input.resultId,
        newSpCode,
        tocResultId,
        mapping.title,
        inherited,
      ),
    });
  }

  /** Primary did not move. Title and id changes stay on the same sp_code. */
  private planTocFields(
    input: PoolFundingApplyInput,
    changes: PoolFundingChanges,
    primary: SpRow | null,
    tocs: TocRow[],
    writes: PlannedWrite[],
    resolved: ResolvedIndicator | null,
  ): void {
    const titleChange = readChange(changes, TOC_RESULT);
    const idChange = readChange(changes, TOC_RESULT_ID);
    if (!titleChange && !idChange) {
      return;
    }
    if (!primary) {
      this.skip(input, 'ToC change has no active PRIMARY row to attach to');
      return;
    }
    const source = this.tocForSp(input, tocs, primary.sp_code);
    if (!source) {
      this.skip(
        input,
        `no active ToC row for primary ${primary.sp_code}; the eight unobservable columns have nothing to be copied from`,
      );
      return;
    }

    let nextTitle: unknown = cell(source.toc_result_title);
    let titleSkipped = false;
    if (titleChange) {
      const parsed = parseTitle(titleChange.after);
      if (parsed.kind === 'skip') {
        titleSkipped = true;
        this.skip(
          input,
          'Theory of Change result after is a list; not written',
        );
      } else {
        nextTitle = parsed.value;
      }
    }

    let nextId: unknown = cell(source.toc_result_id);
    let idSkipped = false;
    if (idChange) {
      const parsed = parseTocId(idChange.after);
      if (parsed.kind === 'skip') {
        idSkipped = true;
        this.skip(
          input,
          'Theory of Change result ID after is not an integer; not written',
        );
      } else {
        nextId = parsed.value;
      }
    }
    if ((titleChange && titleSkipped) || !titleChange) {
      if ((idChange && idSkipped) || !idChange) {
        return;
      }
    }
    if (titleSkipped && idSkipped) {
      return;
    }

    const alreadyApplied =
      sameCell(source.toc_result_title, nextTitle) &&
      sameTocId(source.toc_result_id, nextId);
    if (alreadyApplied) {
      return;
    }

    const inherited = withResolvedIndicator(inheritedFrom(source), resolved);
    writes.push({ sql: DEACTIVATE_TOC_SQL, params: [source.id] });
    writes.push({
      sql: INSERT_TOC_SQL,
      params: tocInsertParams(
        input.resultId,
        source.sp_code,
        nextId,
        nextTitle,
        inherited,
      ),
    });
  }

  /**
   * The ToC result stayed put and PRMS named an indicator that differs from
   * ours. Updating in place keeps the row's identity; the deactivate+insert
   * path exists for a ToC result that actually moved.
   */
  private planIndicatorOnly(
    input: PoolFundingApplyInput,
    primary: SpRow | null,
    tocs: TocRow[],
    writes: PlannedWrite[],
    resolved: ResolvedIndicator | null,
  ): void {
    if (resolved === null || !primary) {
      return;
    }
    const source = this.tocForSp(input, tocs, primary.sp_code);
    if (!source) {
      return;
    }
    const next = withResolvedIndicator(inheritedFrom(source), resolved);
    const unchanged =
      sameCell(source.indicator_id, next.indicator_id) &&
      sameCell(source.indicator_description, next.indicator_description) &&
      sameCell(
        source.quantitative_contribution,
        next.quantitative_contribution,
      ) &&
      sameCell(source.unit_messurament, next.unit_messurament) &&
      sameCell(source.target_value, next.target_value) &&
      sameCell(source.target_year, next.target_year);
    if (unchanged) {
      return;
    }
    writes.push({
      sql: UPDATE_TOC_INDICATOR_SQL,
      params: [
        next.indicator_id,
        next.indicator_description,
        next.quantitative_contribution,
        next.unit_messurament,
        next.target_value,
        next.target_year,
        source.id,
      ],
    });
  }

  private planContributing(
    input: PoolFundingApplyInput,
    changes: PoolFundingChanges,
    alignmentId: number | null,
    sps: SpRow[],
    writes: PlannedWrite[],
  ): void {
    if (!Object.prototype.hasOwnProperty.call(changes, CONTRIBUTING_PROGRAMS)) {
      return;
    }
    const change = readChange(changes, CONTRIBUTING_PROGRAMS);
    if (!change) {
      this.skip(
        input,
        'Contributing Science Programs change has no after value',
      );
      return;
    }
    const target = parseCodeSet(change.after);
    if (target === null) {
      this.skip(
        input,
        'Contributing Science Programs after is not a list of codes; not written',
      );
      return;
    }
    if (alignmentId === null) {
      this.skip(
        input,
        'no active pool-funding alignment to attach contributing SPs',
      );
      return;
    }
    const current = sps
      .filter((row) => row.sp_role === 'CONTRIBUTING')
      .sort((left, right) => left.sp_code.localeCompare(right.sp_code));
    const currentCodes = new Set(current.map((row) => row.sp_code));
    for (const row of current) {
      if (!target.has(row.sp_code)) {
        writes.push({ sql: DEACTIVATE_SP_SQL, params: [row.id] });
      }
    }
    for (const code of [...target].sort()) {
      if (!currentCodes.has(code)) {
        writes.push({
          sql: INSERT_SP_SQL,
          params: [alignmentId, code, 'CONTRIBUTING'],
        });
      }
    }
  }

  private tocForSp(
    input: PoolFundingApplyInput,
    tocs: TocRow[],
    spCode: string,
  ): TocRow | null {
    const matches = tocs.filter((row) => row.sp_code === spCode);
    if (matches.length > 1) {
      this.logger._warn(
        `Pool-funding apply found ${matches.length} active ToC rows for result_id=${input.resultId} sp_code=${spCode}; not choosing one`,
      );
      return null;
    }
    return matches[0] ?? null;
  }

  private skip(input: PoolFundingApplyInput, reason: string): void {
    this.logger._warn(
      `Pool-funding apply skipped for result_prms_sync_history id=${input.historyId} result_id=${input.resultId}: ${reason}`,
    );
  }
}
