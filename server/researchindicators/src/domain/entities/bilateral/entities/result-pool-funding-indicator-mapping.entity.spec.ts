import 'reflect-metadata';
import { getMetadataArgsStorage } from 'typeorm';
import { OpenSearchMetadataName } from '../../../tools/open-search/decorators/opensearch-property.decorator';
import { ResultPoolFundingIndicatorMapping } from './result-pool-funding-indicator-mapping.entity';

describe('ResultPoolFundingIndicatorMapping entity metadata', () => {
  it('maps the required indicator mapping fields to TypeORM metadata', () => {
    const columns = getMetadataArgsStorage().columns.filter(
      (metadata) => metadata.target === ResultPoolFundingIndicatorMapping,
    );

    expect(
      columns.find((metadata) => metadata.propertyName === 'indicator_code')
        ?.options,
    ).toMatchObject({
      type: 'varchar',
      name: 'indicator_code',
      length: 100,
      nullable: false,
    });
    expect(
      columns.find((metadata) => metadata.propertyName === 'is_stale')?.options,
    ).toMatchObject({
      type: 'boolean',
      name: 'is_stale',
      default: false,
      nullable: false,
    });
  });

  it('enforces one active mapping per result, SP, and indicator', () => {
    const index = getMetadataArgsStorage().indices.find(
      (metadata) =>
        metadata.target === ResultPoolFundingIndicatorMapping &&
        metadata.name === 'uq_rpfim_result_indicator_active',
    );

    expect(index?.columns).toEqual([
      'result_id',
      'lever_code',
      'indicator_code',
      'is_active',
    ]);
    expect(index?.unique).toBe(true);
  });

  it('exposes searchable fields to OpenSearch', () => {
    const openSearchMetadata = Reflect.getMetadata(
      OpenSearchMetadataName,
      ResultPoolFundingIndicatorMapping,
    );

    expect(openSearchMetadata).toEqual(
      expect.arrayContaining([
        {
          propertyKey: 'indicator_code',
          options: { type: 'keyword' },
        },
        {
          propertyKey: 'lever_code',
          options: { type: 'keyword' },
        },
        {
          propertyKey: 'is_stale',
          options: { type: 'boolean' },
        },
      ]),
    );
  });
});
