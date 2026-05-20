import { getMetadataArgsStorage } from 'typeorm';
import { ResultReviewHistory } from './result-review-history.entity';

describe('ResultReviewHistory entity metadata', () => {
  it('maps review audit fields to TypeORM metadata', () => {
    const columns = getMetadataArgsStorage().columns.filter(
      (metadata) => metadata.target === ResultReviewHistory,
    );

    expect(
      columns.find((metadata) => metadata.propertyName === 'event_type')
        ?.options,
    ).toMatchObject({
      type: 'varchar',
      name: 'event_type',
      length: 50,
      nullable: false,
    });
    expect(
      columns.find((metadata) => metadata.propertyName === 'payload_before')
        ?.options,
    ).toMatchObject({
      type: 'json',
      name: 'payload_before',
      nullable: true,
    });
    expect(
      columns.find((metadata) => metadata.propertyName === 'payload_after')
        ?.options,
    ).toMatchObject({
      type: 'json',
      name: 'payload_after',
      nullable: true,
    });
  });

  it('indexes result history lookup and event type lookup', () => {
    const indices = getMetadataArgsStorage().indices.filter(
      (metadata) => metadata.target === ResultReviewHistory,
    );

    expect(indices).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'idx_result_review_history_result_created',
          columns: ['result_id', 'created_at'],
        }),
        expect.objectContaining({
          name: 'idx_result_review_history_event_type',
          columns: ['event_type'],
        }),
      ]),
    );
  });
});
