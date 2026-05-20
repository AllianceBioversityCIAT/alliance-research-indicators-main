import 'reflect-metadata';
import { getMetadataArgsStorage } from 'typeorm';
import { Result } from './result.entity';
import { OpenSearchMetadataName } from '../../../tools/open-search/decorators/opensearch-property.decorator';

describe('Result entity metadata', () => {
  it('maps PRMS sync columns to TypeORM metadata', () => {
    const columns = getMetadataArgsStorage().columns.filter(
      (metadata) => metadata.target === Result,
    );

    expect(
      columns.find((metadata) => metadata.propertyName === 'is_synced_to_prms')
        ?.options,
    ).toMatchObject({
      type: 'boolean',
      name: 'is_synced_to_prms',
      default: false,
      nullable: false,
    });
    expect(
      columns.find((metadata) => metadata.propertyName === 'prms_result_code')
        ?.options,
    ).toMatchObject({
      type: 'bigint',
      name: 'prms_result_code',
      nullable: true,
    });
  });

  it('indexes the PRMS sync flag', () => {
    const index = getMetadataArgsStorage().indices.find(
      (metadata) =>
        metadata.target === Result &&
        metadata.name === 'idx_results_synced_to_prms',
    );

    expect(index?.columns).toEqual(['is_synced_to_prms']);
  });

  it('exposes PRMS sync fields to OpenSearch', () => {
    const openSearchMetadata = Reflect.getMetadata(
      OpenSearchMetadataName,
      Result,
    );

    expect(openSearchMetadata).toEqual(
      expect.arrayContaining([
        {
          propertyKey: 'is_synced_to_prms',
          options: { type: 'boolean' },
        },
        {
          propertyKey: 'prms_result_code',
          options: { type: 'integer' },
        },
      ]),
    );
  });
});
