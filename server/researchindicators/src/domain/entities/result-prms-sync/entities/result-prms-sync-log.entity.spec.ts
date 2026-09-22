import { getMetadataArgsStorage } from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';
import { PrmsSyncOutcome } from '../../../tools/prms-normalizer/enum/prms-sync-outcome.enum';
import { ResultPrmsSyncLog } from './result-prms-sync-log.entity';

/**
 * Column contract transcribed from the already-merged migration
 * `1789479131116-createResultPrmsSyncLogTable.ts` (opened and compared
 * field-by-field: name, SQL type, nullability). Audit columns live on
 * AuditableEntity; this table's own columns are listed below.
 */
describe('ResultPrmsSyncLog entity metadata', () => {
  const storage = getMetadataArgsStorage();
  const columns = storage.columns.filter(
    (column) => column.target === ResultPrmsSyncLog,
  );

  const getColumn = (propertyName: string) => {
    const column = columns.find(
      (candidate) => candidate.propertyName === propertyName,
    );
    if (!column) {
      throw new Error(
        `Expected column metadata for "${propertyName}" on ResultPrmsSyncLog`,
      );
    }
    return column;
  };

  const isGenerated = (propertyName: string) =>
    storage.generations.some(
      (generation) =>
        generation.target === ResultPrmsSyncLog &&
        generation.propertyName === propertyName,
    );

  it('extends AuditableEntity (audit columns come from the base class)', () => {
    expect(Object.getPrototypeOf(ResultPrmsSyncLog.prototype)).toBe(
      AuditableEntity.prototype,
    );
  });

  it('id is bigint PK auto-increment', () => {
    const column = getColumn('id');
    expect(column.options.type).toBe('bigint');
    expect(column.options.primary).toBe(true);
    expect(isGenerated('id')).toBe(true);
  });

  it('carries NO result_id column -- the FK is gone and nothing replaced it', () => {
    // Was `result_id` bigint NOT NULL with an FK to `results`. The log is a
    // permanent record of what STAR sent PRMS, so it must outlive the row it
    // describes: the FK blocked result deletion, and deleting the history to
    // allow it would destroy evidence of a push PRMS had already accepted.
    // Identity is now `external_reference` (which already holds the result
    // official code) plus `result_year`.
    expect(
      columns.find((column) => column.propertyName === 'result_id'),
    ).toBeUndefined();
    expect(
      columns.find((column) => column.propertyName === 'result_official_code'),
    ).toBeUndefined();
  });

  it('result_year is a year column, also nullable', () => {
    const column = getColumn('result_year');
    expect(column.options.type).toBe('year');
    expect(column.options.nullable).toBe(true);
  });

  it('declares NO relation to Result -- the FK is gone on purpose', () => {
    const relation = storage.relations.find(
      (candidate) => candidate.target === ResultPrmsSyncLog,
    );
    expect(relation).toBeUndefined();
    const joinColumn = storage.joinColumns.find(
      (candidate) => candidate.target === ResultPrmsSyncLog,
    );
    expect(joinColumn).toBeUndefined();
  });

  it('attempt_number is int NOT NULL', () => {
    const column = getColumn('attempt_number');
    expect(column.options.type).toBe('int');
    expect(column.options.nullable).toBe(false);
  });

  it('environment is varchar(20) NOT NULL', () => {
    const column = getColumn('environment');
    expect(column.options.type).toBe('varchar');
    expect(column.options.length).toBe(20);
    expect(column.options.nullable).toBe(false);
  });

  it('prms_type is varchar(50) NULL (refused before build / expired UNKNOWN)', () => {
    const column = getColumn('prms_type');
    expect(column.options.type).toBe('varchar');
    expect(column.options.length).toBe(50);
    expect(column.options.nullable).toBe(true);
  });

  it('outcome is varchar(40) NOT NULL, not a MySQL ENUM', () => {
    const column = getColumn('outcome');
    expect(column.options.type).toBe('varchar');
    expect(column.options.length).toBe(40);
    expect(column.options.nullable).toBe(false);
    expect(column.options.enum).toBeUndefined();
  });

  it('http_status is int NULL (transport failure / STAR refusal / UNKNOWN)', () => {
    const column = getColumn('http_status');
    expect(column.options.type).toBe('int');
    expect(column.options.nullable).toBe(true);
  });

  it('request_id is varchar(191) NULL (attempt expired to UNKNOWN)', () => {
    const column = getColumn('request_id');
    expect(column.options.type).toBe('varchar');
    expect(column.options.length).toBe(191);
    expect(column.options.nullable).toBe(true);
  });

  it('external_reference is varchar(191) NULL', () => {
    const column = getColumn('external_reference');
    expect(column.options.type).toBe('varchar');
    expect(column.options.length).toBe(191);
    expect(column.options.nullable).toBe(true);
  });

  it('request_payload is json NULL', () => {
    const column = getColumn('request_payload');
    expect(column.options.type).toBe('json');
    expect(column.options.nullable).toBe(true);
  });

  it('response_body is json NULL', () => {
    const column = getColumn('response_body');
    expect(column.options.type).toBe('json');
    expect(column.options.nullable).toBe(true);
  });

  it('failure_reason is text NULL', () => {
    const column = getColumn('failure_reason');
    expect(column.options.type).toBe('text');
    expect(column.options.nullable).toBe(true);
  });

  it('declares the migration indexes -- keyed on the code/year pair', () => {
    const indexNames = storage.indices
      .filter((index) => index.target === ResultPrmsSyncLog)
      .map((index) => index.name)
      .sort();
    expect(indexNames).toEqual([
      'idx_result_prms_sync_log_code_year',
      'idx_result_prms_sync_log_request_id',
    ]);
  });

  it('own columns match the migration one-for-one (no extras)', () => {
    const ownNames = columns.map((column) => column.propertyName).sort();
    expect(ownNames).toEqual(
      [
        'id',
        'result_year',
        'attempt_number',
        'environment',
        'prms_type',
        'outcome',
        'http_status',
        'request_id',
        'external_reference',
        'request_payload',
        'response_body',
        'failure_reason',
      ].sort(),
    );
  });

  /**
   * Cheap decorator-level regression only — NOT the R-PRMS-012 AC.3
   * extensibility gate (design.md §5.4 / KZ-001). This goes red if the
   * TypeORM column metadata flips to `type: 'enum'`, but stays green if
   * the live MySQL column were ENUM while these static files still said
   * varchar. The behavioural proof (INSERT/SELECT `APPROVED_BY_SP` against
   * the scratch schema) lives in
   * `test/result-prms-sync-log-outcome.integration-spec.ts` and is
   * collected only by `npm run test:integration`. `npm test` never runs it.
   */
  it('decorator metadata types outcome as varchar (not the live-schema extensibility gate)', () => {
    const outcomeColumn = getColumn('outcome');
    expect(outcomeColumn.options.type).toBe('varchar');
    expect(outcomeColumn.options.length).toBe(40);
    expect(outcomeColumn.options.enum).toBeUndefined();
    expect(
      (Object.values(PrmsSyncOutcome) as string[]).includes('APPROVED_BY_SP'),
    ).toBe(false);
  });
});
