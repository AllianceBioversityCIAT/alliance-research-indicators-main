import { getMetadataArgsStorage } from 'typeorm';
import { BulkUploadProcesses } from './bulk-upload-processes.entity';

describe('BulkUploadProcesses entity metadata', () => {
  const columns = getMetadataArgsStorage().columns.filter(
    (column) => column.target === BulkUploadProcesses,
  );

  const getColumn = (propertyName: string) => {
    const column = columns.find(
      (candidate) => candidate.propertyName === propertyName,
    );
    if (!column) {
      throw new Error(
        `Expected column metadata for "${propertyName}" on BulkUploadProcesses`,
      );
    }
    return column;
  };

  const notificationMetricColumns = [
    'total_results',
    'total_capdev_results',
    'total_participants',
    'total_female_participants',
    'activity_start_date',
    'activity_end_date',
    'countries',
    'notification_sent_at',
    'notification_status',
  ];

  it.each(notificationMetricColumns)(
    '%s is registered as nullable with no default',
    (propertyName) => {
      const column = getColumn(propertyName);

      expect(column.options.nullable).toBe(true);
      expect(column.options.default).toBeUndefined();
    },
  );

  it('total_results is a bigint column', () => {
    expect(getColumn('total_results').options.type).toBe('bigint');
  });

  it('total_capdev_results is a bigint column', () => {
    expect(getColumn('total_capdev_results').options.type).toBe('bigint');
  });

  it('total_participants is a bigint column', () => {
    expect(getColumn('total_participants').options.type).toBe('bigint');
  });

  it('total_female_participants is a bigint column', () => {
    expect(getColumn('total_female_participants').options.type).toBe(
      'bigint',
    );
  });

  it('activity_start_date is a timestamp column', () => {
    expect(getColumn('activity_start_date').options.type).toBe('timestamp');
  });

  it('activity_end_date is a timestamp column', () => {
    expect(getColumn('activity_end_date').options.type).toBe('timestamp');
  });

  it('countries is a json column', () => {
    expect(getColumn('countries').options.type).toBe('json');
  });

  it('notification_sent_at is a timestamp column', () => {
    expect(getColumn('notification_sent_at').options.type).toBe('timestamp');
  });

  it('notification_status is a varchar(20) column', () => {
    const column = getColumn('notification_status');
    expect(column.options.type).toBe('varchar');
    expect(column.options.length).toBe(20);
  });
});
