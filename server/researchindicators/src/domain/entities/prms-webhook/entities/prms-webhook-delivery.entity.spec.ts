import { DataSource, EntityMetadata } from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';
import { PrmsWebhookDelivery } from './prms-webhook-delivery.entity';

/**
 * Asserts TypeORM's resolved entity metadata (`findColumnWithPropertyName`,
 * `indices`, `foreignKeys`), not the decorator options object. A check
 * against `getMetadataArgsStorage().columns[].options` only proves the
 * decorator was typed (KZ-001).
 */
describe('PrmsWebhookDelivery entity metadata', () => {
  let metadata: EntityMetadata;

  beforeAll(async () => {
    const dataSource = new DataSource({
      type: 'mysql',
      database: 'prms_webhook_metadata',
      entities: [PrmsWebhookDelivery],
    });
    await (
      dataSource as unknown as { buildMetadatas(): Promise<void> }
    ).buildMetadatas();
    metadata = dataSource.getMetadata(PrmsWebhookDelivery);
  });

  const column = (propertyName: string) => {
    const found = metadata.findColumnWithPropertyName(propertyName);
    if (!found) {
      throw new Error(
        `Expected resolved column metadata for "${propertyName}" on PrmsWebhookDelivery`,
      );
    }
    return found;
  };

  it('extends AuditableEntity', () => {
    expect(Object.getPrototypeOf(PrmsWebhookDelivery.prototype)).toBe(
      AuditableEntity.prototype,
    );
  });

  it('maps to result_prms_sync_history', () => {
    expect(metadata.tableName).toBe('result_prms_sync_history');
  });

  it('id is bigint primary key, generated, not nullable', () => {
    const id = column('id');
    expect(id.type).toBe('bigint');
    expect(id.isPrimary).toBe(true);
    expect(id.isGenerated).toBe(true);
    expect(id.generationStrategy).toBe('increment');
    expect(id.isNullable).toBe(false);
  });

  it('delivery_id is varchar(191), nullable, and not unique', () => {
    const deliveryId = column('delivery_id');
    expect(deliveryId.type).toBe('varchar');
    expect(deliveryId.length).toBe('191');
    expect(deliveryId.isNullable).toBe(true);
    const index = metadata.indices.find(
      (candidate) =>
        candidate.name === 'idx_result_prms_sync_history_delivery_id',
    );
    expect(index).toBeDefined();
    expect(index?.isUnique).toBe(false);
    expect(metadata.uniques).toHaveLength(0);
  });

  it('occurred_at is timestamp NOT NULL', () => {
    const occurredAt = column('occurred_at');
    expect(occurredAt.type).toBe('timestamp');
    expect(occurredAt.isNullable).toBe(false);
  });

  it('environment is varchar(20) NOT NULL', () => {
    const environment = column('environment');
    expect(environment.type).toBe('varchar');
    expect(environment.length).toBe('20');
    expect(environment.isNullable).toBe(false);
  });

  it('correlation_outcome is varchar(40) NOT NULL, not a MySQL ENUM', () => {
    const outcome = column('correlation_outcome');
    expect(outcome.type).toBe('varchar');
    expect(outcome.length).toBe('40');
    expect(outcome.isNullable).toBe(false);
    expect(outcome.enum).toBeUndefined();
  });

  it('has NO result_id column at all, and no foreign key or relation to results', () => {
    // The id is deleted when a version is overwritten, which would orphan
    // the history. The durable key is (result_official_code, result_year).
    expect(metadata.columns.map((item) => item.propertyName)).not.toContain(
      'result_id',
    );
    expect(metadata.foreignKeys).toHaveLength(0);
    expect(metadata.relations).toHaveLength(0);
  });

  it('result_official_code is varchar(191) NULL', () => {
    const resultOfficialCode = column('result_official_code');
    expect(resultOfficialCode.type).toBe('varchar');
    expect(resultOfficialCode.length).toBe('191');
    expect(resultOfficialCode.isNullable).toBe(true);
  });

  it('result_year is a resolved year column, nullable, and indexed with result_official_code', () => {
    const resultYear = column('result_year');
    expect(resultYear.type).toBe('year');
    expect(resultYear.isNullable).toBe(true);
    expect(resultYear.relationMetadata).toBeUndefined();
    const index = metadata.indices.find(
      (candidate) =>
        candidate.name === 'idx_result_prms_sync_history_code_year',
    );
    expect(index).toBeDefined();
    expect(index?.isUnique).toBe(false);
    expect(index?.columns.map((indexed) => indexed.propertyName)).toEqual([
      'result_official_code',
      'result_year',
    ]);
  });

  it('prms_result_id and prms_result_code are bigint NULL', () => {
    const prmsResultId = column('prms_result_id');
    expect(prmsResultId.type).toBe('bigint');
    expect(prmsResultId.isNullable).toBe(true);
    const prmsResultCode = column('prms_result_code');
    expect(prmsResultCode.type).toBe('bigint');
    expect(prmsResultCode.isNullable).toBe(true);
  });

  it('decision is varchar(20) NULL, not a MySQL ENUM', () => {
    const decision = column('decision');
    expect(decision.type).toBe('varchar');
    expect(decision.length).toBe('20');
    expect(decision.isNullable).toBe(true);
    expect(decision.enum).toBeUndefined();
  });

  it('justification is text NULL', () => {
    const justification = column('justification');
    expect(justification.type).toBe('text');
    expect(justification.isNullable).toBe(true);
  });

  it('decided_at is timestamp NULL', () => {
    const decidedAt = column('decided_at');
    expect(decidedAt.type).toBe('timestamp');
    expect(decidedAt.isNullable).toBe(true);
  });

  it('raw_body and raw_headers are json NULL', () => {
    const rawBody = column('raw_body');
    expect(rawBody.type).toBe('json');
    expect(rawBody.isNullable).toBe(true);
    const rawHeaders = column('raw_headers');
    expect(rawHeaders.type).toBe('json');
    expect(rawHeaders.isNullable).toBe(true);
  });

  it('processing_state is varchar(20) NOT NULL and processing_error is text NULL', () => {
    const processingState = column('processing_state');
    expect(processingState.type).toBe('varchar');
    expect(processingState.length).toBe('20');
    expect(processingState.isNullable).toBe(false);
    const processingError = column('processing_error');
    expect(processingError.type).toBe('text');
    expect(processingError.isNullable).toBe(true);
  });

  it('duplicate_of_id is bigint NULL and is not a foreign key', () => {
    const duplicateOfId = column('duplicate_of_id');
    expect(duplicateOfId.type).toBe('bigint');
    expect(duplicateOfId.isNullable).toBe(true);
    expect(duplicateOfId.relationMetadata).toBeUndefined();
  });

  it('event_source is varchar(10) NOT NULL — the only NOT NULL addition', () => {
    const eventSource = column('event_source');
    expect(eventSource.type).toBe('varchar');
    expect(eventSource.length).toBe('10');
    expect(eventSource.isNullable).toBe(false);
  });

  it('status is varchar(30) NULL', () => {
    const status = column('status');
    expect(status.type).toBe('varchar');
    expect(status.length).toBe('30');
    expect(status.isNullable).toBe(true);
  });

  it('actor_user_id is bigint NULL and carries no foreign key', () => {
    const actorUserId = column('actor_user_id');
    expect(actorUserId.type).toBe('bigint');
    expect(actorUserId.isNullable).toBe(true);
    expect(actorUserId.relationMetadata).toBeUndefined();
  });

  it('reviewer_name is varchar(255) NULL', () => {
    const reviewerName = column('reviewer_name');
    expect(reviewerName.type).toBe('varchar');
    expect(reviewerName.length).toBe('255');
    expect(reviewerName.isNullable).toBe(true);
  });

  it('reviewer_role is varchar(191) NULL', () => {
    const reviewerRole = column('reviewer_role');
    expect(reviewerRole.type).toBe('varchar');
    expect(reviewerRole.length).toBe('191');
    expect(reviewerRole.isNullable).toBe(true);
  });

  it('science_program_code is varchar(20) NULL', () => {
    const scienceProgramCode = column('science_program_code');
    expect(scienceProgramCode.type).toBe('varchar');
    expect(scienceProgramCode.length).toBe('20');
    expect(scienceProgramCode.isNullable).toBe(true);
  });

  it('changes is json NULL', () => {
    const changes = column('changes');
    expect(changes.type).toBe('json');
    expect(changes.isNullable).toBe(true);
  });

  it('created_by is NULL and is_active defaults TRUE', () => {
    const createdBy = column('created_by');
    expect(createdBy.isNullable).toBe(true);
    const isActive = column('is_active');
    expect(isActive.isNullable).toBe(false);
    expect(isActive.default).toBe(true);
  });

  it('declares exactly the three non-unique indexes', () => {
    const indexes = metadata.indices
      .map((index) => ({
        name: index.name,
        unique: index.isUnique,
        columns: index.columns.map((indexed) => indexed.propertyName),
      }))
      .sort((left, right) => left.name.localeCompare(right.name));
    expect(indexes).toEqual([
      {
        name: 'idx_result_prms_sync_history_code_year',
        unique: false,
        columns: ['result_official_code', 'result_year'],
      },
      {
        name: 'idx_result_prms_sync_history_delivery_id',
        unique: false,
        columns: ['delivery_id'],
      },
      {
        name: 'idx_result_prms_sync_history_occurred_at',
        unique: false,
        columns: ['occurred_at'],
      },
    ]);
  });

  it('owns exactly the design §4 columns (renamed + seven added) plus AuditableEntity', () => {
    const names = metadata.columns.map((item) => item.propertyName).sort();
    expect(names).toEqual(
      [
        'id',
        'delivery_id',
        'occurred_at',
        'environment',
        'correlation_outcome',
        'result_official_code',
        'result_year',
        'prms_result_id',
        'prms_result_code',
        'decision',
        'justification',
        'decided_at',
        'raw_body',
        'raw_headers',
        'processing_state',
        'processing_error',
        'duplicate_of_id',
        'event_source',
        'status',
        'actor_user_id',
        'reviewer_name',
        'reviewer_role',
        'science_program_code',
        'changes',
        'created_at',
        'created_by',
        'updated_at',
        'updated_by',
        'is_active',
        'deleted_at',
      ].sort(),
    );
  });
});
