import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { LoggerUtil } from '../../shared/utils/logger.util';

/**
 * Pool-funding diff persisted on a correlated PRMS decision.
 *
 * BEFORE is the most recent ACCEPTED `result_prms_sync_log` the decision
 * could have been answering. AFTER is `result_prms_sync_history.raw_body`.
 * Only fields that differ are written. `{}` means the diff ran and found
 * nothing; `null` is left only when this service never wrote.
 */

const SCIENCE_PROGRAM = 'Science Program';
const TOC_RESULT = 'Theory of Change result';
const TOC_RESULT_ID = 'Theory of Change result ID';
const CONTRIBUTING_PROGRAMS = 'Contributing Science Programs';

const HISTORY_ROW_SQL = `
SELECT result_official_code, decided_at, occurred_at, raw_body
FROM result_prms_sync_history
WHERE id = ?
`;

/**
 * Pairs a decision with the push PRMS had actually accepted by then.
 * `created_at <= ?` is the cutoff (decided_at, else occurred_at). Without
 * it the newest ACCEPTED push wins, including one PRMS never saw.
 */
const ACCEPTED_PUSH_SQL = `
SELECT request_payload
FROM result_prms_sync_log
WHERE external_reference = ?
  AND result_year = ?
  AND outcome = 'ACCEPTED'
  AND created_at <= ?
ORDER BY created_at DESC, id DESC
LIMIT 1
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
  /** Reporting year `finish()` just resolved. The log is keyed by it. */
  resultYear: number;
}

interface HistorySnapshot {
  result_official_code: unknown;
  decided_at: unknown;
  occurred_at: unknown;
  raw_body: unknown;
}

interface SentMapping {
  scienceProgramId: string | null;
  resultTitle: string | null;
  tocResultId: string | null;
  contributingProgramIds: string[];
}

interface ReceivedMapping {
  scienceProgramId: string | null;
  titles: string[];
  tocResultIds: string[];
  contributingProgramIds: string[];
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

const asDate = (value: unknown): Date | null => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
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

const readContributingIds = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  const ids: string[] = [];
  for (const item of value) {
    const record = asRecord(item);
    const id = scalar(record?.science_program_id);
    if (id !== null) {
      ids.push(id);
    }
  }
  return ids;
};

const readSent = (payload: unknown): SentMapping => {
  const root = asRecord(payload);
  const results = root?.results;
  const first = Array.isArray(results) ? asRecord(results[0]) : null;
  const data = asRecord(first?.data);
  // result_indicator_description is sent on toc_mapping, but the callback
  // has no comparable field. It is omitted from the diff; we cannot observe it.
  const toc = asRecord(data?.toc_mapping);
  return {
    scienceProgramId: scalar(toc?.science_program_id),
    resultTitle: scalar(toc?.result_title),
    tocResultId: scalar(toc?.toc_result_id),
    contributingProgramIds: readContributingIds(data?.contributing_programs),
  };
};

const readReceived = (rawBody: unknown): ReceivedMapping => {
  const root = asRecord(rawBody);
  const data = asRecord(root?.data);
  const entries = Array.isArray(data?.obj_results_toc_result)
    ? data.obj_results_toc_result.flatMap((item) => {
        const record = asRecord(item);
        return record ? [record] : [];
      })
    : [];
  const primary = entries.find((entry) => isPrimaryRole(entry));
  const mappings = dedupeTocMappings(
    Array.isArray(primary?.toc_mappings) ? primary.toc_mappings : [],
  );
  const titles: string[] = [];
  const tocResultIds: string[] = [];
  for (const mapping of mappings) {
    const title = scalar(mapping.title);
    const id = scalar(mapping.toc_result_id);
    if (title !== null) {
      titles.push(title);
    }
    if (id !== null) {
      tocResultIds.push(id);
    }
  }
  const contributingProgramIds = entries
    .filter((entry) => entry !== primary)
    .map((entry) => scalar(entry.official_code))
    .filter((code): code is string => code !== null);
  return {
    scienceProgramId: primary ? scalar(primary.official_code) : null,
    titles,
    tocResultIds,
    contributingProgramIds,
  };
};

/** One distinct value stays a scalar. Two or more stay a list, duplicates included. */
const collapse = (values: string[]): PoolFundingChangeValue => {
  if (values.length === 0) {
    return null;
  }
  if (values.length === 1) {
    return values[0];
  }
  return values;
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

const buildChanges = (
  sent: SentMapping,
  received: ReceivedMapping,
): PoolFundingChanges => {
  const changes: PoolFundingChanges = {};
  assignChange(
    changes,
    SCIENCE_PROGRAM,
    sent.scienceProgramId,
    received.scienceProgramId,
  );
  assignChange(
    changes,
    TOC_RESULT,
    sent.resultTitle,
    collapse(received.titles),
  );
  assignChange(
    changes,
    TOC_RESULT_ID,
    sent.tocResultId,
    collapse(received.tocResultIds),
  );
  assignChange(
    changes,
    CONTRIBUTING_PROGRAMS,
    programValue(sent.contributingProgramIds),
    programValue(received.contributingProgramIds),
  );
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
    if (officialCode === null) {
      this.logger._warn(
        `Pool-funding diff has no result_official_code on history id=${input.historyId}; writing empty changes`,
      );
      await this.writeChanges(input.historyId, {});
      return;
    }

    const cutoff = asDate(row.decided_at) ?? asDate(row.occurred_at);
    if (cutoff === null) {
      this.logger._warn(
        `Pool-funding diff has no decided_at or occurred_at on history id=${input.historyId}; writing empty changes`,
      );
      await this.writeChanges(input.historyId, {});
      return;
    }

    const pushes: Array<{ request_payload: unknown }> =
      await this.dataSource.query(ACCEPTED_PUSH_SQL, [
        officialCode,
        input.resultYear,
        cutoff,
      ]);
    const push = pushes[0];
    if (!push) {
      this.logger._warn(
        `No ACCEPTED result_prms_sync_log for external_reference=${officialCode} result_year=${input.resultYear} at or before ${cutoff.toISOString()}; writing empty changes`,
      );
      await this.writeChanges(input.historyId, {});
      return;
    }

    const changes = buildChanges(
      readSent(push.request_payload),
      readReceived(row.raw_body),
    );
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
